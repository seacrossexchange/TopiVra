import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import zhCN from './locales/zh-CN.json';
import en from './locales/en.json';
import id from './locales/id.json';
import ptBR from './locales/pt-BR.json';
import esMX from './locales/es-MX.json';
import { DEFAULT_LANGUAGE, isSupportedLanguage } from './config';
import { applyTextDirection } from '@/utils/rtl';

const savedLanguage = localStorage.getItem('language') ?? undefined;
const initialLanguage = isSupportedLanguage(savedLanguage)
  ? savedLanguage
  : undefined;

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      'zh-CN': { translation: zhCN },
      en: { translation: en },
      id: { translation: id },
      'pt-BR': { translation: ptBR },
      'es-MX': { translation: esMX },
    },
    lng: initialLanguage,
    fallbackLng: DEFAULT_LANGUAGE,
    interpolation: {
      escapeValue: false,
    },
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'],
      lookupLocalStorage: 'language',
    },
    // 复数规则支持
    pluralSeparator: '_',
    contextSeparator: '_',
  });

// 监听语言变化，保存到 localStorage 并应用 RTL
i18n.on('languageChanged', (lng) => {
  localStorage.setItem('language', lng);
  applyTextDirection(lng);
});

// 初始化时应用文本方向
applyTextDirection(initialLanguage || i18n.language || DEFAULT_LANGUAGE);

export default i18n;