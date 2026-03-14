import { format, formatDistanceToNow } from 'date-fns';
import { zhCN, enUS, id, ptBR, es } from 'date-fns/locale';

const locales = {
  'zh-CN': zhCN,
  'en': enUS,
  'id': id,
  'pt-BR': ptBR,
  'es-MX': es,
};

/**
 * 格式化日期
 * @param date 日期对象或字符串
 * @param formatStr 格式字符串，默认 'PPP'
 * @param locale 语言代码，默认 'zh-CN'
 * @returns 格式化后的日期字符串
 */
export function formatDate(
  date: Date | string,
  formatStr: string = 'PPP',
  locale: string = 'zh-CN'
): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  const localeObj = locales[locale] || locales['zh-CN'];
  return format(dateObj, formatStr, { locale: localeObj });
}

/**
 * 格式化相对时间
 * @param date 日期对象或字符串
 * @param locale 语言代码，默认 'zh-CN'
 * @returns 相对时间字符串（如：3分钟前）
 */
export function formatRelativeTime(
  date: Date | string,
  locale: string = 'zh-CN'
): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  const localeObj = locales[locale] || locales['zh-CN'];
  return formatDistanceToNow(dateObj, {
    addSuffix: true,
    locale: localeObj,
  });
}

/**
 * 格式化日期时间（常用格式）
 */
export const formatDateTime = (date: Date | string, locale: string = 'zh-CN') => 
  formatDate(date, 'PPpp', locale);

export const formatShortDate = (date: Date | string, locale: string = 'zh-CN') => 
  formatDate(date, 'PP', locale);

export const formatLongDate = (date: Date | string, locale: string = 'zh-CN') => 
  formatDate(date, 'PPP', locale);

export const formatTime = (date: Date | string, locale: string = 'zh-CN') => 
  formatDate(date, 'p', locale);





