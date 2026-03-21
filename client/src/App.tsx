/**
 * 应用主入口组件
 * 配置路由、国际化、主题等全局Provider
 */
import { RouterProvider } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ConfigProvider } from 'antd';
import { HelmetProvider } from 'react-helmet-async';
import zhCN from 'antd/locale/zh_CN';
import enUS from 'antd/locale/en_US';
import idID from 'antd/locale/id_ID';
import ptBR from 'antd/locale/pt_BR';
import esES from 'antd/locale/es_ES';
import { useTranslation } from 'react-i18next';
import React from 'react';
import { router } from './router';
import { getAntdTheme } from './styles/theme';
import { THEME_KEY, useTheme } from './hooks/useTheme';
import { useAuthStore } from './store/authStore';
import ErrorBoundary from './components/common/ErrorBoundary';
import './i18n';

// 创建 React Query 客户端
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 5 * 60 * 1000, // 5分钟
    },
  },
});

/**
 * 主题 Provider 组件
 * 负责管理主题状态并应用 Ant Design 主题配置和国际化
 */
function ThemeProvider({ children }: Readonly<{ children: React.ReactNode }>) {
  const { themeMode, isDark } = useTheme();
  const { i18n } = useTranslation();

  React.useLayoutEffect(() => {
    const root = document.documentElement;
    root.dataset.themeSwitching = 'true';
    root.dataset.theme = isDark ? 'dark' : 'light';
    localStorage.setItem(THEME_KEY, themeMode);

    const metaThemeColor = document.querySelector('meta[name="theme-color"]');
    if (metaThemeColor) {
      metaThemeColor.setAttribute('content', isDark ? '#0d0f14' : '#f8fafc');
    }

    const frame = globalThis.requestAnimationFrame(() => {
      delete root.dataset.themeSwitching;
    });

    return () => {
      globalThis.cancelAnimationFrame(frame);
      delete root.dataset.themeSwitching;
    };
  }, [isDark, themeMode]);

  // 使用 useMemo 确保主题对象在 isDark 变化时重新创建
  const antdTheme = React.useMemo(() => getAntdTheme(isDark), [isDark]);

  // 根据当前语言选择 Ant Design locale - 支持 i18n 语言代码到 Ant Design locale 的映射
  const antdLocale = React.useMemo(() => {
    const localeMap: Record<string, typeof zhCN> = {
      'zh-CN': zhCN,
      'en': enUS,
      'id': idID,
      'pt-BR': ptBR,
      'es-MX': esES, // 使用 esES 作为西班牙语（墨西哥）的本地化
    };
    return localeMap[i18n.language] || enUS;
  }, [i18n.language]);

  return (
    <ConfigProvider 
      theme={antdTheme} 
      locale={antdLocale}
    >
      {children}
    </ConfigProvider>
  );
}

function AppBootstrap() {
  const hasHydrated = useAuthStore((state) => state.hasHydrated);
  const bootstrapAuth = useAuthStore((state) => state.bootstrapAuth);

  React.useEffect(() => {
    if (hasHydrated) {
      void bootstrapAuth();
    }
  }, [hasHydrated, bootstrapAuth]);

  return <RouterProvider router={router} />;
}

function App() {
  return (
    <ErrorBoundary>
      <HelmetProvider>
        <QueryClientProvider client={queryClient}>
          <ThemeProvider>
            <AppBootstrap />
          </ThemeProvider>
        </QueryClientProvider>
      </HelmetProvider>
    </ErrorBoundary>
  );
}

export default App;

export { useTheme } from './hooks/useTheme';
export type { ThemeMode } from './hooks/useTheme';