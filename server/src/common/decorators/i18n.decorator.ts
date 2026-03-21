import { createParamDecorator, ExecutionContext } from '@nestjs/common';

/**
 * 获取请求语言的装饰器
 *
 * @example
 * async getProducts(@Lang() lang: string) {
 *   // lang = 'zh-CN' | 'en' | 'id' | 'pt-BR' | 'es-MX'
 * }
 */
export const Lang = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): string => {
    const request = ctx.switchToHttp().getRequest();
    return request.language || request.i18nLang || 'zh-CN';
  },
);

/**
 * 获取用户时区的装饰器
 *
 * @example
 * async getOrders(@Timezone() timezone: string) {
 *   // timezone = 'Asia/Shanghai'
 * }
 */
export const Timezone = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): string => {
    const request = ctx.switchToHttp().getRequest();
    return request.headers['x-timezone'] || request.user?.timezone || 'UTC';
  },
);

/**
 * 获取用户货币的装饰器
 *
 * @example
 * async getProducts(@Currency() currency: string) {
 *   // currency = 'USD' | 'CNY' | 'IDR' | 'BRL' | 'MXN'
 * }
 */
export const Currency = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): string => {
    const request = ctx.switchToHttp().getRequest();
    return request.headers['x-currency'] || request.user?.currency || 'USD';
  },
);

/**
 * 获取完整的国际化上下文
 *
 * @example
 * async getProducts(@I18nContext() context: I18nContextData) {
 *   const { language, timezone, currency } = context;
 * }
 */
export interface I18nContextData {
  language: string;
  timezone: string;
  currency: string;
}

export const I18nContext = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): I18nContextData => {
    const request = ctx.switchToHttp().getRequest();

    return {
      language: request.language || request.i18nLang || 'zh-CN',
      timezone:
        request.headers['x-timezone'] || request.user?.timezone || 'UTC',
      currency:
        request.headers['x-currency'] || request.user?.currency || 'USD',
    };
  },
);




