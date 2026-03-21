/**
 * 国际化路由助手
 * 处理带语言前缀的 URL 导航
 */
import { useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

export const SUPPORTED_LANGUAGES = ['zh-CN', 'en', 'id', 'pt-BR', 'es-MX'] as const;
export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number];

export function isSupportedLanguage(lang: string | null | undefined): lang is SupportedLanguage {
  return Boolean(lang) && SUPPORTED_LANGUAGES.includes(lang as SupportedLanguage);
}

/**
 * 获取当前路径的语言前缀
 */
export function getLanguageFromPath(pathname: string): string | null {
  const firstSegment = pathname.split('/').find(Boolean);

  if (firstSegment && isSupportedLanguage(firstSegment)) {
    return firstSegment;
  }

  return null;
}

/**
 * 移除路径中的语言前缀
 */
export function removeLanguagePrefix(pathname: string): string {
  const lang = getLanguageFromPath(pathname);
  if (lang) {
    return pathname.replace(`/${lang}`, '') || '/';
  }
  return pathname;
}

/**
 * 添加语言前缀到路径
 */
export function addLanguagePrefix(pathname: string, lang: string): string {
  const cleanPath = removeLanguagePrefix(pathname);
  if (!isSupportedLanguage(lang)) {
    return cleanPath.startsWith('/') ? cleanPath : `/${cleanPath}`;
  }

  const normalizedPath = cleanPath.startsWith('/') ? cleanPath : `/${cleanPath}`;
  return normalizedPath === '/' ? `/${lang}` : `/${lang}${normalizedPath}`;
}

export function generateLocalizedPath(pathname: string, lang: string): string {
  return addLanguagePrefix(pathname, lang);
}

export function getCurrentLanguage(pathname: string, fallback: string): string {
  return getLanguageFromPath(pathname) || fallback;
}

/**
 * 切换语言并更新 URL
 */
export function useLanguageSwitch() {
  const navigate = useNavigate();
  const location = useLocation();
  const { i18n } = useTranslation();

  const switchLanguage = (newLang: string) => {
    if (!isSupportedLanguage(newLang)) {
      if (import.meta.env.DEV) {
        console.warn(`Unsupported language: ${newLang}`);
      }
      return;
    }

    i18n.changeLanguage(newLang);

    const newPath = addLanguagePrefix(location.pathname, newLang);
    navigate(`${newPath}${location.search}${location.hash}`, { replace: true });
  };

  return { switchLanguage };
}

/**
 * 获取国际化链接
 */
export function useI18nLink() {
  const { i18n } = useTranslation();

  const currentLang = getCurrentLanguage(globalThis.location.pathname, i18n.language);

  const getLink = (path: string): string => {
    if (getLanguageFromPath(path)) {
      return path;
    }

    return addLanguagePrefix(path, currentLang);
  };

  return { getLink, currentLang };
}

/**
 * 生成所有语言的 URL（用于 hreflang）
 */
export function generateAlternateUrls(pathname: string, baseUrl: string): Array<{ lang: string; url: string }> {
  const cleanPath = removeLanguagePrefix(pathname);
  
  return SUPPORTED_LANGUAGES.map(lang => ({
    lang,
    url: `${baseUrl}/${lang}${cleanPath}`,
  }));
}

/**
 * 获取默认语言 URL（x-default）
 */
export function getDefaultLanguageUrl(pathname: string, baseUrl: string): string {
  const cleanPath = removeLanguagePrefix(pathname);
  return `${baseUrl}${cleanPath}`;
}



