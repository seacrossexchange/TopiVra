/**
 * 国际化导航 Hook
 * 提供带语言前缀的导航功能
 */
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { LANGUAGE_PREFIX_PATTERN } from '@/i18n/config';
import { addLanguagePrefix, removeLanguagePrefix } from '@/utils/i18nRouter';


export function useI18nNavigate() {
  const navigate = useNavigate();
  const { lang } = useParams<{ lang?: string }>();
  const { i18n } = useTranslation();
  
  const currentLang = lang || i18n.language;

  /**
   * 导航到指定路径（自动添加语言前缀）
   */
  const i18nNavigate = (to: string, options?: { replace?: boolean }) => {
    // 如果路径已经包含语言前缀，直接导航
    if (LANGUAGE_PREFIX_PATTERN.exec(to)) {
      navigate(to, options);
      return;
    }

    // 添加当前语言前缀
    const pathWithLang = addLanguagePrefix(to, currentLang);
    navigate(pathWithLang, options);
  };

  /**
   * 切换语言（保持当前路径）
   */
  const switchLanguage = (newLang: string) => {
    const currentPath = globalThis.location.pathname;
    const cleanPath = removeLanguagePrefix(currentPath);
    const newPath = addLanguagePrefix(cleanPath, newLang);

    i18n.changeLanguage(newLang);
    navigate(newPath, { replace: true });
  };

  return {
    navigate: i18nNavigate,
    switchLanguage,
    currentLang,
  };
}

/**
 * 生成国际化链接
 */
export function useI18nHref() {
  const { lang } = useParams<{ lang?: string }>();
  const { i18n } = useTranslation();
  
  const currentLang = lang || i18n.language;

  /**
   * 生成带语言前缀的链接
   */
  const getHref = (path: string): string => {
    // 如果路径已经包含语言前缀，直接返回
    if (LANGUAGE_PREFIX_PATTERN.exec(path)) {
      return path;
    }

    // 添加当前语言前缀
    return addLanguagePrefix(path, currentLang);
  };

  return { getHref, currentLang };
}





