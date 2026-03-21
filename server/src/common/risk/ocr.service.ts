import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ContentFilterService } from './content-filter.service';

export interface OcrResult {
  text: string;
  confidence: number;
  language: string;
}

export interface QrCodeResult {
  text: string;
  position: { x: number; y: number; width: number; height: number };
  isExternalLink: boolean;
}

export interface ImageAuditResult {
  ocrResult: OcrResult;
  qrCodes: QrCodeResult[];
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  isClean: boolean;
  detectedIssues: string[];
  contactInfo: {
    phones: string[];
    emails: string[];
    wechats: string[];
    telegrams: string[];
    urls: string[];
  };
}

@Injectable()
export class OcrService implements OnModuleInit {
  private readonly logger = new Logger(OcrService.name);
  private tesseractWorker: any = null;
  private contentFilter: ContentFilterService | null = null;

  async onModuleInit() {
    this.logger.log('OCR Service initialized (lazy loading Tesseract)');
  }

  /**
   * 设置内容过滤服务
   */
  setContentFilter(contentFilter: ContentFilterService): void {
    this.contentFilter = contentFilter;
  }

  /**
   * 初始化 Tesseract Worker
   */
  private async initTesseractWorker(): Promise<void> {
    if (this.tesseractWorker) return;

    try {
      const { createWorker } = await import('tesseract.js');
      this.tesseractWorker = await createWorker('chi_sim+eng', 1, {
        logger: (m: { status: string }) =>
          this.logger.debug(`Tesseract: ${m.status}`),
      });
      this.logger.log('Tesseract worker initialized');
    } catch (error) {
      this.logger.warn(
        'Tesseract.js not available, OCR will return empty results',
      );
      this.logger.debug(
        `Error details: ${error instanceof Error ? error.message : 'Unknown'}`,
      );
    }
  }

  /**
   * 扫描图片中的文本内容
   */
  async scanImage(imageUrl: string): Promise<OcrResult> {
    try {
      await this.initTesseractWorker();

      if (!this.tesseractWorker) {
        this.logger.debug(`OCR skipped (no worker): ${imageUrl}`);
        return { text: '', confidence: 0, language: 'unknown' };
      }

      this.logger.debug(`Scanning image: ${imageUrl}`);

      const result = await this.tesseractWorker.recognize(imageUrl);
      const { text, confidence } = result.data;

      return {
        text: text?.trim() || '',
        confidence: confidence || 0,
        language: 'chi_sim+eng',
      };
    } catch (error) {
      this.logger.error(
        'OCR scan failed',
        error instanceof Error ? error.stack : 'Unknown error',
      );
      return { text: '', confidence: 0, language: 'error' };
    }
  }

  /**
   * 检测图片中的二维码
   */
  async detectQrCodes(imageUrl: string): Promise<QrCodeResult[]> {
    try {
      const jsQR = await import('jsqr');
      const sharp = await import('sharp');

      const image = sharp.default(imageUrl);
      const { data, info } = await image
        .ensureAlpha()
        .raw()
        .toBuffer({ resolveWithObject: true });

      const code = jsQR.default(
        new Uint8ClampedArray(data),
        info.width,
        info.height,
      );

      if (code) {
        const isExternalLink = this.isExternalUrl(code.data);
        return [
          {
            text: code.data,
            position: {
              x: code.location.topLeftCorner.x,
              y: code.location.topLeftCorner.y,
              width:
                code.location.topRightCorner.x -
                code.location.topLeftCorner.x,
              height:
                code.location.bottomLeftCorner.y -
                code.location.topLeftCorner.y,
            },
            isExternalLink,
          },
        ];
      }

      return [];
    } catch (_error) {
      this.logger.debug('QR code detection skipped (libraries not available)');
      return [];
    }
  }

  /**
   * 判断是否为外部链接
   */
  private isExternalUrl(text: string): boolean {
    try {
      const url = new URL(text);
      return url.protocol === 'http:' || url.protocol === 'https:';
    } catch {
      return false;
    }
  }

  /**
   * 审核图片（OCR + 二维码检测 + 联系方式检测）
   */
  async auditImage(imageUrl: string): Promise<ImageAuditResult> {
    const [ocrResult, qrCodes] = await Promise.all([
      this.scanImage(imageUrl),
      this.detectQrCodes(imageUrl),
    ]);

    const detectedIssues: string[] = [];
    const contactInfo = {
      phones: [] as string[],
      emails: [] as string[],
      wechats: [] as string[],
      telegrams: [] as string[],
      urls: [] as string[],
    };

    let riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' = 'LOW';
    let isClean = true;

    // 检查OCR文本中的敏感内容和联系方式
    if (ocrResult.text && ocrResult.confidence > 50) {
      if (this.contentFilter) {
        const filterResult = await this.contentFilter.scanContent(ocrResult.text);

        if (filterResult.riskLevel !== 'LOW') {
          riskLevel = this.upgradeRiskLevel(riskLevel, filterResult.riskLevel);
          isClean = false;
          detectedIssues.push(
            ...filterResult.detectedItems.map(
              (item) => `${item.type}: ${item.matched}`,
            ),
          );
        }

        // 提取联系方式
        contactInfo.phones = this.extractPhones(ocrResult.text);
        contactInfo.emails = this.extractEmails(ocrResult.text);
        contactInfo.wechats = this.extractWechats(ocrResult.text);
        contactInfo.telegrams = this.extractTelegrams(ocrResult.text);
        contactInfo.urls = this.extractUrls(ocrResult.text);

        if (
          contactInfo.phones.length > 0 ||
          contactInfo.emails.length > 0 ||
          contactInfo.wechats.length > 0 ||
          contactInfo.telegrams.length > 0
        ) {
          riskLevel = this.upgradeRiskLevel(riskLevel, 'HIGH');
          isClean = false;
          detectedIssues.push('Detected contact information in image');
        }
      }
    }

    // 检查二维码
    for (const qrCode of qrCodes) {
      if (qrCode.isExternalLink) {
        riskLevel = this.upgradeRiskLevel(riskLevel, 'HIGH');
        isClean = false;
        detectedIssues.push(`External URL in QR code: ${qrCode.text}`);

        // 检查二维码URL是否包含联系方式
        if (this.contentFilter) {
          const qrFilterResult = await this.contentFilter.scanContent(qrCode.text);
          if (qrFilterResult.riskLevel !== 'LOW') {
            riskLevel = this.upgradeRiskLevel(riskLevel, 'CRITICAL');
            detectedIssues.push('QR code contains sensitive content');
          }
        }
      }
    }

    // 多个二维码加高风险
    if (qrCodes.length > 1) {
      riskLevel = this.upgradeRiskLevel(riskLevel, 'HIGH');
      detectedIssues.push('Multiple QR codes detected');
    }

    return {
      ocrResult,
      qrCodes,
      riskLevel,
      isClean,
      detectedIssues,
      contactInfo,
    };
  }

  /**
   * 提取手机号
   */
  private extractPhones(text: string): string[] {
    const phoneRegex = /(?:\+?86)?1[3-9]\d{9}|(?:\+\d{1,3}[- ]?)?\d{10,14}/g;
    return text.match(phoneRegex) || [];
  }

  /**
   * 提取邮箱
   */
  private extractEmails(text: string): string[] {
    const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
    return text.match(emailRegex) || [];
  }

  /**
   * 提取微信号
   */
  private extractWechats(text: string): string[] {
    const wechatPatterns = [
      /微信[：:]\s*([a-zA-Z][\w-]{5,19})/g,
      /VX[：:]\s*([a-zA-Z][\w-]{5,19})/gi,
      /加V[：:]?\s*([a-zA-Z][\w-]{5,19})/gi,
    ];
    const results: string[] = [];
    for (const pattern of wechatPatterns) {
      let match;
      while ((match = pattern.exec(text)) !== null) {
        results.push(match[1]);
      }
    }
    return [...new Set(results)];
  }

  /**
   * 提取Telegram
   */
  private extractTelegrams(text: string): string[] {
    const tgPatterns = [
      /@([a-zA-Z][\w]{4,31})/g,
      /telegram[：:]\s*([a-zA-Z][\w]{4,31})/gi,
      /TG[：:]\s*([a-zA-Z][\w]{4,31})/gi,
    ];
    const results: string[] = [];
    for (const pattern of tgPatterns) {
      let match;
      while ((match = pattern.exec(text)) !== null) {
        results.push(match[1]);
      }
    }
    return [...new Set(results)];
  }

  /**
   * 提取URL
   */
  private extractUrls(text: string): string[] {
    const urlRegex = /https?:\/\/[^\s<>"{}|\\^`\[\]]+/gi;
    return text.match(urlRegex) || [];
  }

  /**
   * 升级风险等级
   */
  private upgradeRiskLevel(
    current: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL',
    newLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL',
  ): 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' {
    const levels = { LOW: 0, MEDIUM: 1, HIGH: 2, CRITICAL: 3 };
    return levels[newLevel] > levels[current] ? newLevel : current;
  }

  /**
   * 批量审核图片
   */
  async auditImages(
    imageUrls: string[],
  ): Promise<Map<string, ImageAuditResult>> {
    const results = new Map<string, ImageAuditResult>();

    for (const url of imageUrls) {
      const result = await this.auditImage(url);
      results.set(url, result);

      // 如果检测到高风险，记录日志
      if (result.riskLevel === 'HIGH' || result.riskLevel === 'CRITICAL') {
        this.logger.warn(`High risk image detected: ${url}`);
        this.logger.warn(`Issues: ${result.detectedIssues.join(', ')}`);
      }
    }

    return results;
  }
}