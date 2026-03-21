/**
 * i18next 懒加载配置
 * 按需加载语言文件，提升首屏性能
 */
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import Backend from 'i18next-http-backend';
import { applyTextDirection } from '@/utils/rtl';

// 从 localStorage 获取保存的语言
const savedLanguage = localStorage.getItem('language') || 'zh-CN';

i18n
  .use(Backend)
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    lng: savedLanguage,
    fallbackLng: 'zh-CN',
    supportedLngs: ['zh-CN', 'en', 'id', 'pt-BR', 'es-MX'],
    
    // 命名空间配置
    ns: ['common', 'products', 'orders', 'user', 'seller', 'admin'],
    defaultNS: 'common',
    fallbackNS: 'common',
    
    // 后端加载配置
    backend: {
      loadPath: '/locales/{{lng}}/{{ns}}.json',
      addPath: '/locales/add/{{lng}}/{{ns}}',
    },
    
    // 插值配置
    interpolation: {
      escapeValue: false,
    },
    
    // 复数规则支持
    pluralSeparator: '_',
    contextSeparator: '_',
    
    // 检测配置
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'],
    },
    
    // 性能优化
    load: 'languageOnly', // 只加载主语言，不加载地区变体
    preload: [savedLanguage], // 预加载当前语言
    
    // 调试
    debug: import.meta.env.DEV,
  });

// 监听语言变化
i18n.on('languageChanged', (lng) => {
  localStorage.setItem('language', lng);
  applyTextDirection(lng);
});

// 初始化时应用文本方向
applyTextDirection(savedLanguage);

export default i18n;





