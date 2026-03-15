/**
 * 时区处理工具
 * 支持用户时区的日期时间格式化
 */
import { formatInTimeZone } from 'date-fns-tz';
import { zhCN, enUS, id as idLocale, ptBR, es } from 'date-fns/locale';

const locales = {
  'zh-CN': zhCN,
  'en': enUS,
  'id': idLocale,
  'pt-BR': ptBR,
  'es-MX': es,
};

/**
 * 获取用户时区
 */
export function getUserTimezone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone;
}

/**
 * 格式化日期时间（带时区）
 */
export function formatDateWithTimezone(
  date: Date | string | number,
  timezone: string,
  formatStr: string = 'PPpp',
  language: string = 'zh-CN',
): string {
  const dateObj = typeof date === 'string' || typeof date === 'number' ? new Date(date) : date;
  const locale = locales[language as keyof typeof locales] || locales['zh-CN'];
  
  return formatInTimeZone(dateObj, timezone, formatStr, { locale });
}

/**
 * 转换日期到用户时区
 */
export function toUserTimezone(
  date: Date | string | number,
  timezone: string = getUserTimezone(),
): Date {
  const dateObj = typeof date === 'string' || typeof date === 'number' ? new Date(date) : date;
  const utcDate = new Date(dateObj.toLocaleString('en-US', { timeZone: 'UTC' }));
  const tzDate = new Date(dateObj.toLocaleString('en-US', { timeZone: timezone }));
  const offset = tzDate.getTime() - utcDate.getTime();
  
  return new Date(dateObj.getTime() + offset);
}

/**
 * 获取时区偏移量（小时）
 */
export function getTimezoneOffset(timezone: string): number {
  const now = new Date();
  const utcDate = new Date(now.toLocaleString('en-US', { timeZone: 'UTC' }));
  const tzDate = new Date(now.toLocaleString('en-US', { timeZone: timezone }));
  
  return (tzDate.getTime() - utcDate.getTime()) / (1000 * 60 * 60);
}

/**
 * 常用时区列表
 */
export const commonTimezones = [
  { value: 'Asia/Shanghai', label: 'China (UTC+8)', offset: 8 },
  { value: 'America/New_York', label: 'New York (UTC-5/-4)', offset: -5 },
  { value: 'America/Los_Angeles', label: 'Los Angeles (UTC-8/-7)', offset: -8 },
  { value: 'Europe/London', label: 'London (UTC+0/+1)', offset: 0 },
  { value: 'Europe/Paris', label: 'Paris (UTC+1/+2)', offset: 1 },
  { value: 'Asia/Tokyo', label: 'Tokyo (UTC+9)', offset: 9 },
  { value: 'Asia/Jakarta', label: 'Jakarta (UTC+7)', offset: 7 },
  { value: 'America/Sao_Paulo', label: 'São Paulo (UTC-3)', offset: -3 },
  { value: 'America/Mexico_City', label: 'Mexico City (UTC-6/-5)', offset: -6 },
  { value: 'Australia/Sydney', label: 'Sydney (UTC+10/+11)', offset: 10 },
  { value: 'Asia/Dubai', label: 'Dubai (UTC+4)', offset: 4 },
  { value: 'Asia/Singapore', label: 'Singapore (UTC+8)', offset: 8 },
];

/**
 * 格式化时区显示
 */
export function formatTimezoneDisplay(timezone: string): string {
  const offset = getTimezoneOffset(timezone);
  const sign = offset >= 0 ? '+' : '';
  return `${timezone} (UTC${sign}${offset})`;
}





