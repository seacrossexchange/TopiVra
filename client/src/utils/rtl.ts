/**
 * RTL (Right-to-Left) 语言支持工具
 */

// RTL 语言列表
export const RTL_LANGUAGES = ['ar', 'he', 'fa', 'ur'];

/**
 * 检查语言是否为 RTL
 */
export function isRTL(language: string): boolean {
  return RTL_LANGUAGES.some(rtlLang => language.startsWith(rtlLang));
}

/**
 * 获取文本方向
 */
export function getTextDirection(language: string): 'ltr' | 'rtl' {
  return isRTL(language) ? 'rtl' : 'ltr';
}

/**
 * 应用文本方向到 DOM
 */
export function applyTextDirection(language: string): void {
  const dir = getTextDirection(language);
  document.documentElement.setAttribute('dir', dir);
  document.documentElement.setAttribute('lang', language);
}

/**
 * 获取逻辑属性（支持 RTL）
 */
export function getLogicalProperty(property: string, language: string): string {
  if (!isRTL(language)) return property;

  const rtlMap: Record<string, string> = {
    'left': 'right',
    'right': 'left',
    'marginLeft': 'marginRight',
    'marginRight': 'marginLeft',
    'paddingLeft': 'paddingRight',
    'paddingRight': 'paddingLeft',
    'borderLeft': 'borderRight',
    'borderRight': 'borderLeft',
    'float-left': 'float-right',
    'float-right': 'float-left',
    'text-left': 'text-right',
    'text-right': 'text-left',
  };

  return rtlMap[property] || property;
}



