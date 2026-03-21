/**
 * 复数规则处理
 * 支持不同语言的复数形式
 */

export type PluralForm = 'zero' | 'one' | 'two' | 'few' | 'many' | 'other';

/**
 * 获取复数形式
 * 基于 Unicode CLDR 规则
 */
export function getPluralForm(count: number, language: string): PluralForm {
  const pluralRules = new Intl.PluralRules(language);
  const rule = pluralRules.select(count);
  
  return rule as PluralForm;
}

/**
 * 格式化复数文本
 * 
 * @example
 * formatPlural(1, 'en', { one: '{{count}} item', other: '{{count}} items' })
 * // => "1 item"
 * 
 * formatPlural(5, 'en', { one: '{{count}} item', other: '{{count}} items' })
 * // => "5 items"
 */
export function formatPlural(
  count: number,
  language: string,
  forms: Partial<Record<PluralForm, string>>,
): string {
  const form = getPluralForm(count, language);
  const template = forms[form] || forms.other || '';
  
  return template.replace('{{count}}', count.toString());
}

/**
 * i18next 复数键生成器
 * 
 * @example
 * getPluralKey('items', 5, 'en') // => 'items_other'
 * getPluralKey('items', 1, 'en') // => 'items_one'
 */
export function getPluralKey(key: string, count: number, language: string): string {
  const form = getPluralForm(count, language);
  return `${key}_${form}`;
}

/**
 * 语言特定的复数规则示例
 */
export const pluralExamples = {
  'zh-CN': {
    // 中文没有复数形式
    rule: 'other',
    example: {
      one: '{{count}} 个商品',
      other: '{{count}} 个商品',
    },
  },
  'en': {
    // 英语：1 用 one，其他用 other
    rule: 'one/other',
    example: {
      one: '{{count}} item',
      other: '{{count}} items',
    },
  },
  'id': {
    // 印尼语：没有复数形式
    rule: 'other',
    example: {
      one: '{{count}} item',
      other: '{{count}} item',
    },
  },
  'pt-BR': {
    // 葡萄牙语：1 用 one，其他用 other
    rule: 'one/other',
    example: {
      one: '{{count}} item',
      other: '{{count}} itens',
    },
  },
  'es-MX': {
    // 西班牙语：1 用 one，其他用 other
    rule: 'one/other',
    example: {
      one: '{{count}} artículo',
      other: '{{count}} artículos',
    },
  },
};

/**
 * 常用复数翻译键
 */
export const commonPluralKeys = {
  items: {
    'zh-CN': { one: '{{count}} 件商品', other: '{{count}} 件商品' },
    'en': { one: '{{count}} item', other: '{{count}} items' },
    'id': { one: '{{count}} item', other: '{{count}} item' },
    'pt-BR': { one: '{{count}} item', other: '{{count}} itens' },
    'es-MX': { one: '{{count}} artículo', other: '{{count}} artículos' },
  },
  products: {
    'zh-CN': { one: '{{count}} 个商品', other: '{{count}} 个商品' },
    'en': { one: '{{count}} product', other: '{{count}} products' },
    'id': { one: '{{count}} produk', other: '{{count}} produk' },
    'pt-BR': { one: '{{count}} produto', other: '{{count}} produtos' },
    'es-MX': { one: '{{count}} producto', other: '{{count}} productos' },
  },
  orders: {
    'zh-CN': { one: '{{count}} 个订单', other: '{{count}} 个订单' },
    'en': { one: '{{count}} order', other: '{{count}} orders' },
    'id': { one: '{{count}} pesanan', other: '{{count}} pesanan' },
    'pt-BR': { one: '{{count}} pedido', other: '{{count}} pedidos' },
    'es-MX': { one: '{{count}} pedido', other: '{{count}} pedidos' },
  },
  reviews: {
    'zh-CN': { one: '{{count}} 条评价', other: '{{count}} 条评价' },
    'en': { one: '{{count}} review', other: '{{count}} reviews' },
    'id': { one: '{{count}} ulasan', other: '{{count}} ulasan' },
    'pt-BR': { one: '{{count}} avaliação', other: '{{count}} avaliações' },
    'es-MX': { one: '{{count}} reseña', other: '{{count}} reseñas' },
  },
  days: {
    'zh-CN': { one: '{{count}} 天', other: '{{count}} 天' },
    'en': { one: '{{count}} day', other: '{{count}} days' },
    'id': { one: '{{count}} hari', other: '{{count}} hari' },
    'pt-BR': { one: '{{count}} dia', other: '{{count}} dias' },
    'es-MX': { one: '{{count}} día', other: '{{count}} días' },
  },
  hours: {
    'zh-CN': { one: '{{count}} 小时', other: '{{count}} 小时' },
    'en': { one: '{{count}} hour', other: '{{count}} hours' },
    'id': { one: '{{count}} jam', other: '{{count}} jam' },
    'pt-BR': { one: '{{count}} hora', other: '{{count}} horas' },
    'es-MX': { one: '{{count}} hora', other: '{{count}} horas' },
  },
  minutes: {
    'zh-CN': { one: '{{count}} 分钟', other: '{{count}} 分钟' },
    'en': { one: '{{count}} minute', other: '{{count}} minutes' },
    'id': { one: '{{count}} menit', other: '{{count}} menit' },
    'pt-BR': { one: '{{count}} minuto', other: '{{count}} minutos' },
    'es-MX': { one: '{{count}} minuto', other: '{{count}} minutos' },
  },
};








