/**
 * 国际化导航 Hook
 * 提供带语言前缀的导航功能
 */
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { addLanguagePrefix, removeLanguagePrefix } from '@/utils/i18nRouter';

export function useI18nNavigate() {
  const navigate = useNavigate();
  const { lang } = useParams<{ lang?: string }>();
  const { i18n } = useTranslation();

  const currentLang = lang || i18n.language;

  const i18nNavigate = (to: string, options?: { replace?: boolean }) => {
    navigate(addLanguagePrefix(to, currentLang), options);
  };

  const switchLanguage = (newLang: string) => {
    const currentPath = globalThis.location.pathname;
    const cleanPath = removeLanguagePrefix(currentPath);
    const newPath = addLanguagePrefix(cleanPath, newLang);

    i18n.changeLanguage(newLang);
    navigate(`${newPath}${globalThis.location.search}${globalThis.location.hash}`, { replace: true });
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

  const getHref = (path: string): string => addLanguagePrefix(path, currentLang);

  return { getHref, currentLang };
}








