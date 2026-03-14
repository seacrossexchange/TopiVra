import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import zhCN from './locales/zh-CN.json';
import en from './locales/en.json';
import id from './locales/id.json';
import ptBR from './locales/pt-BR.json';
import esMX from './locales/es-MX.json';
import { applyTextDirection } from '@/utils/rtl';

// 从 localStorage 获取保存的语言
const savedLanguage = localStorage.getItem('language') || 'zh-CN';

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
    lng: savedLanguage, // 使用保存的语言
    fallbackLng: 'zh-CN',
    interpolation: {
      escapeValue: false,
    },
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'],
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
applyTextDirection(savedLanguage);

export default i18n;