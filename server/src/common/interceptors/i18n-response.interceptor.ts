import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { I18nService } from 'nestjs-i18n';

/**
 * 国际化响应拦截器
 * 自动翻译响应中的消息字段
 */
@Injectable()
export class I18nResponseInterceptor implements NestInterceptor {
  constructor(private readonly i18n: I18nService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const language = request.language || request.i18nLang || 'zh-CN';

    return next.handle().pipe(
      map(async (data) => {
        // 如果响应包含 message 字段，尝试翻译
        if (data && typeof data === 'object') {
          if (data.message && typeof data.message === 'string') {
            // 检查是否为翻译键
            if (data.message.includes('.')) {
              try {
                data.message = await this.i18n.t(data.message, {
                  lang: language,
                });
              } catch (error) {
                // 翻译失败，保持原文
              }
            }
          }

          // 翻译嵌套的 message 字段
          if (data.data && typeof data.data === 'object') {
            data.data = await this.translateMessages(data.data, language);
          }
        }

        return data;
      }),
    );
  }

  /**
   * 递归翻译对象中的消息
   */
  private async translateMessages(obj: any, language: string): Promise<any> {
    if (Array.isArray(obj)) {
      return Promise.all(
        obj.map((item) => this.translateMessages(item, language)),
      );
    }

    if (obj && typeof obj === 'object') {
      const translated: any = {};

      for (const [key, value] of Object.entries(obj)) {
        if (
          key === 'message' &&
          typeof value === 'string' &&
          value.includes('.')
        ) {
          try {
            translated[key] = await this.i18n.t(value, { lang: language });
          } catch (error) {
            translated[key] = value;
          }
        } else if (typeof value === 'object') {
          translated[key] = await this.translateMessages(value, language);
        } else {
          translated[key] = value;
        }
      }

      return translated;
    }

    return obj;
  }
}


