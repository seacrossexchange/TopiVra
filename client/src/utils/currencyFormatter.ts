/**
 * 货币配置
 */
const currencyConfig: Record<string, { currency: string; locale: string; symbol: string }> = {
  'zh-CN': { currency: 'CNY', locale: 'zh-CN', symbol: '¥' },
  'en': { currency: 'USD', locale: 'en-US', symbol: '$' },
  'id': { currency: 'IDR', locale: 'id-ID', symbol: 'Rp' },
  'pt-BR': { currency: 'BRL', locale: 'pt-BR', symbol: 'R$' },
  'es-MX': { currency: 'MXN', locale: 'es-MX', symbol: '$' },
};

/**
 * 格式化货币
 * @param amount 金额
 * @param language 语言代码，默认 'zh-CN'
 * @returns 格式化后的货币字符串
 */
export function formatCurrency(
  amount: number,
  language: string = 'zh-CN'
): string {
  const config = currencyConfig[language] || currencyConfig['zh-CN'];

  return new Intl.NumberFormat(config.locale, {
    style: 'currency',
    currency: config.currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

/**
 * 格式化货币（不带货币符号）
 * @param amount 金额
 * @param language 语言代码
 * @returns 格式化后的数字字符串
 */
export function formatNumber(
  amount: number,
  language: string = 'zh-CN'
): string {
  const config = currencyConfig[language] || currencyConfig['zh-CN'];

  return new Intl.NumberFormat(config.locale, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

/**
 * 获取货币符号
 * @param language 语言代码
 * @returns 货币符号
 */
export function getCurrencySymbol(language: string = 'zh-CN'): string {
  const config = currencyConfig[language] || currencyConfig['zh-CN'];
  return config.symbol;
}

/**
 * 获取货币代码
 * @param language 语言代码
 * @returns 货币代码（如：CNY, USD）
 */
export function getCurrencyCode(language: string = 'zh-CN'): string {
  const config = currencyConfig[language] || currencyConfig['zh-CN'];
  return config.currency;
}








