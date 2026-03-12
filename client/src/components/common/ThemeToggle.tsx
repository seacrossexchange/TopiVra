/**
 * 主题切换按钮组件
 * 点击太阳/月亮图标直接切换亮色/暗色主题，全局生效
 */
import { Tooltip } from 'antd';
import { useTheme } from '@/hooks/useTheme';
import { useTranslation } from 'react-i18next';

interface ThemeToggleProps {
  style?: React.CSSProperties;
  className?: string;
  /** @deprecated 保留兼容，已忽略 */
  showDropdown?: boolean;
}

export function ThemeToggle({ style, className }: ThemeToggleProps) {
  const { t } = useTranslation();
  const { isDark, toggleTheme } = useTheme();

  return (
    <Tooltip title={isDark ? t('theme.light', '切换浅色') : t('theme.dark', '切换深色')} placement="bottom">
      <button
        onClick={toggleTheme}
        style={style}
        className={`theme-toggle-btn${className ? ' ' + className : ''}`}
        aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      >
        {isDark ? (
          // 太阳图标 - 暗色时显示，点击切换到亮色
          <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
            <path d="M12 17a5 5 0 1 0 0-10 5 5 0 0 0 0 10zm0 2a7 7 0 1 1 0-14 7 7 0 0 1 0 14zM11 1h2v3h-2V1zm0 19h2v3h-2v-3zM3.515 4.929l1.414-1.414L7.05 5.636 5.636 7.05 3.515 4.93zM16.95 18.364l1.414-1.414 2.121 2.121-1.414 1.414-2.121-2.121zm2.121-14.85 1.414 1.415-2.121 2.121-1.414-1.414 2.121-2.121zM5.636 16.95l1.414 1.414-2.121 2.121-1.414-1.414 2.121-2.121zM23 11v2h-3v-2h3zM4 11v2H1v-2h3z"/>
          </svg>
        ) : (
          // 月亮图标 - 亮色时显示，点击切换到暗色
          <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
            <path d="M10 7a7 7 0 0 0 12 4.9v.1c0 5.523-4.477 10-10 10S2 17.523 2 12 6.477 2 12 2h.1A6.979 6.979 0 0 0 10 7zm-6 5a8 8 0 0 0 15.062 3.762A9 9 0 0 1 8.238 4.938 7.999 7.999 0 0 0 4 12z"/>
          </svg>
        )}
      </button>
    </Tooltip>
  );
}

export default ThemeToggle;
