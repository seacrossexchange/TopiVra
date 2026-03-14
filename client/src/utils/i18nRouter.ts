/**
 * 国际化路由助手
 * 处理带语言前缀的 URL 导航
 */
import { useNavigate, useLocation, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

const SUPPORTED_LANGUAGES = ['zh-CN', 'en', 'id', 'pt-BR', 'es-MX'];

/**
 * 获取当前路径的语言前缀
 */
export function getLanguageFromPath(pathname: string): string | null {
  const segments = pathname.split('/').filter(Boolean);
  const firstSegment = segments[0];
  
  if (SUPPORTED_LANGUAGES.includes(firstSegment)) {
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
  return `/${lang}${cleanPath}`;
}

/**
 * 切换语言并更新 URL
 */
export function useLanguageSwitch() {
  const navigate = useNavigate();
  const location = useLocation();
  const { i18n } = useTranslation();

  const switchLanguage = (newLang: string) => {
    if (!SUPPORTED_LANGUAGES.includes(newLang)) {
      if (import.meta.env.DEV) {
        console.warn(`Unsupported language: ${newLang}`);
      }
      return;
    }

    // 更新 i18n 语言
    i18n.changeLanguage(newLang);

    // 更新 URL
    const currentPath = location.pathname;
    const newPath = addLanguagePrefix(currentPath, newLang);
    
    navigate(newPath + location.search + location.hash, { replace: true });
  };

  return { switchLanguage };
}

/**
 * 获取国际化链接
 */
export function useI18nLink() {
  const { lang } = useParams<{ lang?: string }>();
  const { i18n } = useTranslation();
  
  const currentLang = lang || i18n.language;

  const getLink = (path: string): string => {
    // 如果路径已经包含语言前缀，直接返回
    if (getLanguageFromPath(path)) {
      return path;
    }
    
    // 添加当前语言前缀
    if (SUPPORTED_LANGUAGES.includes(currentLang)) {
      return `/${currentLang}${path.startsWith('/') ? path : '/' + path}`;
    }
    
    return path;
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



