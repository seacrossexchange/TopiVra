import { useCallback, useSyncExternalStore } from 'react';

export type ThemeMode = 'light' | 'dark' | 'system';

const THEME_KEY = 'topivra-theme';
const THEME_VALUES: ThemeMode[] = ['light', 'dark', 'system'];

let currentThemeMode: ThemeMode = getInitialThemeMode();
const themeListeners = new Set<() => void>();

function getInitialThemeMode(): ThemeMode {
  if (typeof window === 'undefined') {
    return 'system';
  }

  const stored = localStorage.getItem(THEME_KEY) as ThemeMode | null;
  return stored && THEME_VALUES.includes(stored) ? stored : 'system';
}

function subscribeToTheme(callback: () => void) {
  themeListeners.add(callback);
  return () => themeListeners.delete(callback);
}

function getThemeSnapshot(): ThemeMode {
  return currentThemeMode;
}

function getThemeServerSnapshot(): ThemeMode {
  return 'system';
}

function setThemeMode(mode: ThemeMode) {
  if (currentThemeMode === mode) {
    return;
  }

  currentThemeMode = mode;
  themeListeners.forEach(listener => listener());
}

function subscribeToSystemTheme(callback: () => void) {
  const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
  mediaQuery.addEventListener('change', callback);
  return () => mediaQuery.removeEventListener('change', callback);
}

function getSystemThemeSnapshot(): boolean {
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

function getServerSnapshot(): boolean {
  return false;
}

export function useTheme() {
  const systemIsDark = useSyncExternalStore(
    subscribeToSystemTheme,
    getSystemThemeSnapshot,
    getServerSnapshot
  );
  const themeMode = useSyncExternalStore(
    subscribeToTheme,
    getThemeSnapshot,
    getThemeServerSnapshot
  );

  const isDark = themeMode === 'dark' || (themeMode === 'system' && systemIsDark);

  const toggleTheme = useCallback(() => {
    if (themeMode === 'light') {
      setThemeMode('dark');
      return;
    }

    if (themeMode === 'dark') {
      setThemeMode('light');
      return;
    }

    setThemeMode(isDark ? 'light' : 'dark');
  }, [isDark, themeMode]);

  const setTheme = useCallback((mode: ThemeMode) => {
    setThemeMode(mode);
  }, []);

  return {
    themeMode,
    isDark,
    toggleTheme,
    setTheme,
    setLightTheme: () => setThemeMode('light'),
    setDarkTheme: () => setThemeMode('dark'),
    setSystemTheme: () => setThemeMode('system'),
  };
}

export { THEME_KEY };
export default useTheme;
