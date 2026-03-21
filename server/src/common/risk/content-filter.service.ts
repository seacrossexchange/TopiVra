import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma';

export interface ContentFilterResult {
  isClean: boolean;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  detectedItems: DetectedItem[];
  sanitizedContent?: string;
}

export interface DetectedItem {
  type:
    | 'PHONE'
    | 'EMAIL'
    | 'WECHAT'
    | 'TELEGRAM'
    | 'WHATSAPP'
    | 'QQ'
    | 'URL'
    | 'SENSITIVE_WORD'
    | 'SUSPICIOUS_PATTERN';
  matched: string;
  position: { start: number; end: number };
  context?: string;
}

// 敏感词库
const DEFAULT_SENSITIVE_WORDS = [
  // 联系方式诱导
  '加微信',
  '加V',
  '加v',
  '加我微信',
  '私聊微信',
  '微信联系',
  '加Telegram',
  '加TG',
  '加tg',
  '飞机号',
  '电报号',
  '加WhatsApp',
  '加WA',
  'whatsapp联系',
  '加QQ',
  'qq联系',
  'QQ联系',
  '私聊',
  '私下联系',
  '站外联系',
  '站外交易',
  // 诱导词
  '更便宜',
  '更优惠',
  '私下交易',
  '直接转账',
  '绕开平台',
  '绕过平台',
  '避开平台',
  '加好友',
  '联系我',
  '找我',
  // 变体写法
  '薇信',
  '威信',
  'v信',
  'V信',
  ' Telegram',
  'teIegram',
  't e l e g r a m',
];

// 正则模式
const PATTERNS = {
  // 手机号（中国）
  CHINA_PHONE: /1[3-9]\d{9}/g,
  // 国际电话
  INTL_PHONE: /\+?\d{1,4}[\s-]?\d{6,14}/g,
  // 邮箱
  EMAIL: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,
  // 微信号
  WECHAT:
    /(?:微信|WeChat|weixin|薇信|威信|v信|V信)[：:]*\s*[a-zA-Z0-9_-]{6,20}/gi,
  WECHAT_ID: /wx[id][a-zA-Z0-9_-]{7,}/gi,
  // Telegram
  TELEGRAM: /(?:telegram|电报|飞机|TG|tg)[：:]*\s*@?[a-zA-Z0-9_]{5,}/gi,
  TELEGRAM_USERNAME: /@[a-zA-Z0-9_]{5,}/g,
  // WhatsApp
  WHATSAPP: /(?:whatsapp|WhatsApp|WA|wa)[：:]*\s*\+?\d{10,15}/gi,
  // QQ
  QQ: /(?:QQ|qq|腾讯QQ)[：:]*\s*\d{5,12}/g,
  QQ_NUMBER: /(?<![a-zA-Z0-9])\d{5,12}(?![a-zA-Z0-9])/g,
  // URL
  URL: /https?:\/\/[^\s<>"{}|\\^`[\]]+/gi,
  // 网盘链接
  CLOUD_DRIVE:
    /(?:pan\.baidu|drive\.google|dropbox|mega\.nz|mediafire|aliyundrive|123pan|lanzou|天翼云|蓝奏云)/gi,
};

@Injectable()
export class ContentFilterService {
  private readonly logger = new Logger(ContentFilterService.name);

  // 可配置的敏感词库
  private sensitiveWords: Set<string>;
  private whitelistedDomains: Set<string>;

  constructor(private readonly prisma: PrismaService) {
    this.sensitiveWords = new Set(DEFAULT_SENSITIVE_WORDS);
    this.whitelistedDomains = new Set([
      'topivra.com',
      'www.topivra.com',
      'api.topivra.com',
    ]);
  }

  /**
   * 扫描文本内容
   */
  async scanContent(
    content: string,
    context?: { userId?: string; type?: string },
  ): Promise<ContentFilterResult> {
    const detectedItems: DetectedItem[] = [];

    // 1. 检测手机号
    this.detectPatterns(content, PATTERNS.CHINA_PHONE, 'PHONE', detectedItems);
    this.detectPatterns(content, PATTERNS.INTL_PHONE, 'PHONE', detectedItems);

    // 2. 检测邮箱
    this.detectPatterns(content, PATTERNS.EMAIL, 'EMAIL', detectedItems);

    // 3. 检测微信号
    this.detectPatterns(content, PATTERNS.WECHAT, 'WECHAT', detectedItems);
    this.detectPatterns(content, PATTERNS.WECHAT_ID, 'WECHAT', detectedItems);

    // 4. 检测Telegram
    this.detectPatterns(content, PATTERNS.TELEGRAM, 'TELEGRAM', detectedItems);

    // 5. 检测WhatsApp
    this.detectPatterns(content, PATTERNS.WHATSAPP, 'WHATSAPP', detectedItems);

    // 6. 检测QQ
    this.detectPatterns(content, PATTERNS.QQ, 'QQ', detectedItems);

    // 7. 检测URL（排除白名单）
    this.detectUrls(content, detectedItems);

    // 8. 检测敏感词
    this.detectSensitiveWords(content, detectedItems);

    // 去重
    const uniqueItems = this.deduplicateItems(detectedItems);

    // 计算风险等级
    const riskLevel = this.calculateRiskLevel(uniqueItems);

    // 生成净化内容
    const sanitizedContent = this.sanitizeContent(content, uniqueItems);

    // 记录审核日志
    if (context?.userId && uniqueItems.length > 0) {
      await this.logFilterResult(
        context.userId,
        context.type || 'CONTENT',
        uniqueItems,
        riskLevel,
      );
    }

    return {
      isClean: uniqueItems.length === 0,
      riskLevel,
      detectedItems: uniqueItems,
      sanitizedContent,
    };
  }

  /**
   * 检测URL模式
   */
  private detectUrls(content: string, items: DetectedItem[]) {
    const matches = content.matchAll(PATTERNS.URL);
    for (const match of matches) {
      try {
        const url = new URL(match[0]);
        if (!this.whitelistedDomains.has(url.hostname.toLowerCase())) {
          items.push({
            type: 'URL',
            matched: match[0],
            position: {
              start: match.index!,
              end: match.index! + match[0].length,
            },
            context: this.getContext(content, match.index!, match[0].length),
          });
        }
      } catch {
        // 无效URL，跳过
      }
    }

    // 检测网盘关键词
    const cloudMatches = content.matchAll(PATTERNS.CLOUD_DRIVE);
    for (const match of cloudMatches) {
      items.push({
        type: 'URL',
        matched: match[0],
        position: { start: match.index!, end: match.index! + match[0].length },
        context: this.getContext(content, match.index!, match[0].length),
      });
    }
  }

  /**
   * 检测模式
   */
  private detectPatterns(
    content: string,
    pattern: RegExp,
    type: DetectedItem['type'],
    items: DetectedItem[],
  ) {
    const matches = content.matchAll(pattern);
    for (const match of matches) {
      items.push({
        type,
        matched: match[0],
        position: { start: match.index!, end: match.index! + match[0].length },
        context: this.getContext(content, match.index!, match[0].length),
      });
    }
  }

  /**
   * 检测敏感词
   */
  private detectSensitiveWords(content: string, items: DetectedItem[]) {
    const lowerContent = content.toLowerCase();
    for (const word of this.sensitiveWords) {
      const lowerWord = word.toLowerCase();
      let index = lowerContent.indexOf(lowerWord);
      while (index !== -1) {
        items.push({
          type: 'SENSITIVE_WORD',
          matched: content.substring(index, index + word.length),
          position: { start: index, end: index + word.length },
          context: this.getContext(content, index, word.length),
        });
        index = lowerContent.indexOf(lowerWord, index + 1);
      }
    }
  }

  /**
   * 获取上下文
   */
  private getContext(
    content: string,
    index: number,
    length: number,
    padding: number = 20,
  ): string {
    const start = Math.max(0, index - padding);
    const end = Math.min(content.length, index + length + padding);
    return content.substring(start, end);
  }

  /**
   * 去重
   */
  private deduplicateItems(items: DetectedItem[]): DetectedItem[] {
    const seen = new Map<string, DetectedItem>();
    for (const item of items) {
      const key = `${item.type}:${item.position.start}`;
      if (!seen.has(key)) {
        seen.set(key, item);
      }
    }
    return Array.from(seen.values()).sort(
      (a, b) => a.position.start - b.position.start,
    );
  }

  /**
   * 计算风险等级
   */
  private calculateRiskLevel(
    items: DetectedItem[],
  ): 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' {
    if (items.length === 0) return 'LOW';

    // 危险类型
    const dangerousTypes = ['WECHAT', 'TELEGRAM', 'WHATSAPP', 'QQ'];
    const hasDangerous = items.some((item) =>
      dangerousTypes.includes(item.type),
    );
    const hasSensitiveWord = items.some(
      (item) => item.type === 'SENSITIVE_WORD',
    );
    const hasUrl = items.some((item) => item.type === 'URL');

    if (items.length >= 5 || (hasDangerous && hasSensitiveWord)) {
      return 'CRITICAL';
    }

    if (hasDangerous || items.length >= 3 || (hasUrl && hasSensitiveWord)) {
      return 'HIGH';
    }

    if (items.length >= 1) {
      return 'MEDIUM';
    }

    return 'LOW';
  }

  /**
   * 净化内容（替换敏感内容）
   */
  private sanitizeContent(content: string, items: DetectedItem[]): string {
    let result = content;
    // 从后往前替换，避免位置偏移
    const sortedItems = [...items].sort(
      (a, b) => b.position.start - a.position.start,
    );

    for (const item of sortedItems) {
      const mask = '*'.repeat(item.matched.length);
      result =
        result.substring(0, item.position.start) +
        mask +
        result.substring(item.position.end);
    }

    return result;
  }

  /**
   * 记录过滤结果
   */
  private async logFilterResult(
    userId: string,
    type: string,
    items: DetectedItem[],
    riskLevel: string,
  ) {
    try {
      await this.prisma.contentFilterLog
        .create({
          data: {
            userId,
            type,
            detectedItems: items as any,
            riskLevel,
          },
        })
        .catch(() => {
          // 表可能不存在，静默失败
        });
    } catch (error) {
      this.logger.warn('Failed to log filter result', error);
    }
  }

  /**
   * 添加敏感词
   */
  addSensitiveWord(word: string) {
    this.sensitiveWords.add(word);
  }

  /**
   * 移除敏感词
   */
  removeSensitiveWord(word: string) {
    this.sensitiveWords.delete(word);
  }

  /**
   * 添加白名单域名
   */
  addWhitelistedDomain(domain: string) {
    this.whitelistedDomains.add(domain.toLowerCase());
  }

  /**
   * 从数据库加载敏感词库
   */
  async loadSensitiveWordsFromDb() {
    try {
      const words = await this.prisma.sensitiveWord.findMany({
        where: { isActive: true },
        select: { word: true },
      });
      words.forEach((w) => this.sensitiveWords.add(w.word));
      this.logger.log(`Loaded ${words.length} sensitive words from database`);
    } catch (error) {
      this.logger.warn(
        'Failed to load sensitive words from database, using defaults',
      );
    }
  }
}
