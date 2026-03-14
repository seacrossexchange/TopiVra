import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

/**
 * 国际化中间件
 * 从请求中提取语言信息并设置到请求对象
 */
@Injectable()
export class I18nMiddleware implements NestMiddleware {
  private readonly supportedLanguages = ['zh-CN', 'en', 'id', 'pt-BR', 'es-MX'];
  private readonly defaultLanguage = 'zh-CN';

  use(req: Request, res: Response, next: NextFunction) {
    // 1. 从 URL 路径提取语言（优先级最高）
    const pathLang = this.extractLanguageFromPath(req.path);

    // 2. 从查询参数提取语言
    const queryLang = req.query.lang as string;

    // 3. 从请求头提取语言
    const headerLang = req.headers['accept-language'];

    // 4. 从 Cookie 提取语言
    const cookieLang = req.cookies?.language;

    // 按优先级选择语言
    let language = pathLang || queryLang || cookieLang;

    // 如果都没有，解析 Accept-Language 头
    if (!language && headerLang) {
      language = this.parseAcceptLanguage(headerLang);
    }

    // 验证语言是否支持
    if (!this.supportedLanguages.includes(language)) {
      language = this.defaultLanguage;
    }

    // 设置到请求对象
    (req as any).language = language;
    (req as any).i18nLang = language;

    // 设置响应头
    res.setHeader('Content-Language', language);

    next();
  }

  /**
   * 从 URL 路径提取语言
   * 例如：/zh-CN/products -> zh-CN
   */
  private extractLanguageFromPath(path: string): string | null {
    const match = path.match(/^\/(zh-CN|en|id|pt-BR|es-MX)(\/|$)/);
    return match ? match[1] : null;
  }

  /**
   * 解析 Accept-Language 头
   * 例如：zh-CN,zh;q=0.9,en;q=0.8 -> zh-CN
   */
  private parseAcceptLanguage(header: string): string {
    const languages = header
      .split(',')
      .map((lang) => {
        const [code, qValue] = lang.trim().split(';q=');
        const quality = qValue ? parseFloat(qValue) : 1.0;
        return { code: code.trim(), quality };
      })
      .sort((a, b) => b.quality - a.quality);

    // 查找第一个支持的语言
    for (const { code } of languages) {
      // 精确匹配
      if (this.supportedLanguages.includes(code)) {
        return code;
      }

      // 模糊匹配（如 zh 匹配 zh-CN）
      const fuzzyMatch = this.supportedLanguages.find(
        (lang) => lang.startsWith(code) || code.startsWith(lang.split('-')[0]),
      );

      if (fuzzyMatch) {
        return fuzzyMatch;
      }
    }

    return this.defaultLanguage;
  }
}


