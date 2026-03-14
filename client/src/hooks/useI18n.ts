import { useTranslation } from 'react-i18next';
import { formatDate, formatRelativeTime, formatDateTime } from '@/utils/dateFormatter';
import { formatCurrency, getCurrencySymbol } from '@/utils/currencyFormatter';
import { formatDateWithTimezone, getUserTimezone } from '@/utils/timezone';
import { getCulturalConfig, getCulturalColor } from '@/config/cultural';
import { isRTL, getTextDirection } from '@/utils/rtl';
import { formatPlural } from '@/utils/plurals';

/**
 * 国际化 Hook（增强版）
 * 提供翻译、日期格式化、货币格式化、文化适配等功能
 */
export function useI18n() {
  const { t, i18n } = useTranslation();
  const currentLang = i18n.language;

  return {
    // 翻译函数
    t,
    
    // 当前语言
    language: currentLang,
    
    // 切换语言
    changeLanguage: (lang: string) => i18n.changeLanguage(lang),
    
    // 日期格式化
    formatDate: (date: Date | string, format?: string) => 
      formatDate(date, format, currentLang),
    
    formatDateTime: (date: Date | string) => 
      formatDateTime(date, currentLang),
    
    formatRelativeTime: (date: Date | string) => 
      formatRelativeTime(date, currentLang),
    
    // 带时区的日期格式化
    formatDateWithTimezone: (date: Date | string, timezone?: string, format?: string) =>
      formatDateWithTimezone(date, timezone || getUserTimezone(), format || 'PPpp', currentLang),
    
    // 货币格式化
    formatCurrency: (amount: number) => 
      formatCurrency(amount, currentLang),
    
    getCurrencySymbol: () => 
      getCurrencySymbol(currentLang),
    
    // 复数格式化
    formatPlural: (count: number, forms: any) =>
      formatPlural(count, currentLang, forms),
    
    // 文化配置
    getCulturalConfig: () => getCulturalConfig(currentLang),
    getCulturalColor: (type: string) => getCulturalColor(currentLang, type as any),
    
    // RTL 支持
    isRTL: () => isRTL(currentLang),
    textDirection: getTextDirection(currentLang),
    
    // 时区
    getUserTimezone,
  };
}

