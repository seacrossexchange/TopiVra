import { useState, useLayoutEffect, useCallback, useSyncExternalStore } from 'react';

export type ThemeMode = 'light' | 'dark' | 'system';

const THEME_KEY = 'topivra-theme';

// 订阅系统主题变化
function subscribeToSystemTheme(callback: () => void) {
  const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
  mediaQuery.addEventListener('change', callback);
  return () => mediaQuery.removeEventListener('change', callback);
}

// 获取系统主题快照
function getSystemThemeSnapshot(): boolean {
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

// 服务端渲染时的默认值
function getServerSnapshot(): boolean {
  return false;
}

/**
 * 主题切换 Hook
 * 支持 light / dark / system 三种模式
 * 自动持久化到 localStorage
 */
export function useTheme() {
  // 使用 useSyncExternalStore 订阅系统主题
  const systemIsDark = useSyncExternalStore(
    subscribeToSystemTheme,
    getSystemThemeSnapshot,
    getServerSnapshot
  );

  // 从 localStorage 初始化主题模式
  const [themeMode, setThemeMode] = useState<ThemeMode>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(THEME_KEY) as ThemeMode | null;
      if (stored && ['light', 'dark', 'system'].includes(stored)) {
        return stored;
      }
    }
    return 'system';
  });

  // 计算实际是否为暗色主题
  const isDark = themeMode === 'dark' || (themeMode === 'system' && systemIsDark);

  // 应用主题到 DOM（使用 useLayoutEffect 避免闪烁）
  useLayoutEffect(() => {
    const root = document.documentElement;
    
    if (isDark) {
      // 暗色：移除 data-theme 属性，让 :root 默认暗色变量生效
      root.removeAttribute('data-theme');
    } else {
      // 亮色：设置 data-theme='light'，触发 tokens.css 亮色变量
      root.setAttribute('data-theme', 'light');
    }
    
    // 更新 meta theme-color
    const metaThemeColor = document.querySelector('meta[name="theme-color"]');
    if (metaThemeColor) {
      metaThemeColor.setAttribute('content', isDark ? '#0d0f14' : '#f8fafc');
    }
    
    // 持久化设置
    localStorage.setItem(THEME_KEY, themeMode);
  }, [isDark, themeMode]);

  // 切换主题
  const toggleTheme = useCallback(() => {
    setThemeMode(prev => {
      if (prev === 'light') return 'dark';
      if (prev === 'dark') return 'light';
      // system 模式下，根据当前实际主题切换
      return isDark ? 'light' : 'dark';
    });
  }, [isDark]);

  // 设置具体主题模式
  const setTheme = useCallback((mode: ThemeMode) => {
    setThemeMode(mode);
  }, []);

  return {
    themeMode,
    isDark,
    toggleTheme,
    setTheme,
    // 便捷方法
    setLightTheme: () => setThemeMode('light'),
    setDarkTheme: () => setThemeMode('dark'),
    setSystemTheme: () => setThemeMode('system'),
  };
}

export default useTheme;