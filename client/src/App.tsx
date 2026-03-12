/**
 * 应用主入口组件
 * 配置路由、国际化、主题等全局Provider
 */
import { RouterProvider } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ConfigProvider } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import enUS from 'antd/locale/en_US';
import { useTranslation } from 'react-i18next';
import React from 'react';
import { router } from './router';
import { getAntdTheme } from './styles/theme';
import { useTheme } from './hooks/useTheme';
import type { ThemeMode } from './hooks/useTheme';
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
function ThemeProvider({ children }: { children: React.ReactNode }) {
  const { isDark } = useTheme();
  const { i18n } = useTranslation();
  
  // 使用 useMemo 确保主题对象在 isDark 变化时重新创建
  const antdTheme = React.useMemo(() => getAntdTheme(isDark), [isDark]);
  
  // 根据当前语言选择 Ant Design locale
  const antdLocale = React.useMemo(() => 
    i18n.language === 'zh-CN' ? zhCN : enUS,
    [i18n.language]
  );

  return (
    <ConfigProvider 
      theme={antdTheme} 
      locale={antdLocale}
    >
      {children}
    </ConfigProvider>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <RouterProvider router={router} />
        </ThemeProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;

// 导出主题相关类型和 hook 供其他组件使用
export { useTheme };
export type { ThemeMode };