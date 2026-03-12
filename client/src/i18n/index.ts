import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import zhCN from './locales/zh-CN.json';
import en from './locales/en.json';
import vi from './locales/vi.json';
import de from './locales/de.json';
import fr from './locales/fr.json';
import pt from './locales/pt.json';

// 从 localStorage 获取保存的语言
const savedLanguage = localStorage.getItem('language') || 'zh-CN';

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      'zh-CN': { translation: zhCN },
      en: { translation: en },
      vi: { translation: vi },
      de: { translation: de },
      fr: { translation: fr },
      pt: { translation: pt },
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
  });

// 监听语言变化，保存到 localStorage
i18n.on('languageChanged', (lng) => {
  localStorage.setItem('language', lng);
});

export default i18n;