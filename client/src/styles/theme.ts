import type { ThemeConfig } from 'antd';

/**
 * TopiVra 默认主题 - Telegram 风格深色数字交易平台
 * 主色：#5b9cf5 电光蓝，背景：#0d0f14 深夜黑
 */
export const darkTheme: ThemeConfig = {
  token: {
    colorPrimary: '#5b9cf5',
    colorSuccess: '#34c759',
    colorWarning: '#ff9f0a',
    colorError: '#ff453a',
    colorInfo: '#5b9cf5',

    borderRadius: 8,

    fontFamily: "'Noto Sans SC', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",

    fontSize: 14,
    fontSizeHeading1: 38,
    fontSizeHeading2: 30,
    fontSizeHeading3: 22,
    fontSizeHeading4: 18,
    fontSizeHeading5: 15,

    padding: 16,
    paddingLG: 24,
    paddingXL: 32,
    margin: 16,
    marginLG: 24,
    marginXL: 32,

    boxShadow: '0 2px 12px rgba(0, 0, 0, 0.3)',
    boxShadowSecondary: '0 4px 20px rgba(0, 0, 0, 0.45)',

    colorBgContainer: '#1a1f2e',
    colorBgLayout: '#0d0f14',
    colorBgElevated: '#222938',

    colorText: '#e8ecf4',
    colorTextSecondary: '#8b92a5',
    colorTextTertiary: '#5a6275',
    colorTextQuaternary: '#374155',

    colorBorder: '#2d3345',
    colorBorderSecondary: '#222938',
  },
  components: {
    Layout: {
      headerBg: 'rgba(13, 15, 20, 0.92)',
      bodyBg: '#0d0f14',
      footerBg: '#080a10',
    },
    Button: {
      borderRadius: 8,
      controlHeight: 38,
      controlHeightLG: 46,
      controlHeightSM: 30,
      primaryShadow: '0 2px 10px rgba(91, 156, 245, 0.35)',
    },
    Card: {
      borderRadiusLG: 10,
      paddingLG: 20,
      colorBgContainer: '#1a1f2e',
    },
    Table: {
      headerBg: '#141820',
      rowHoverBg: '#222938',
      borderColor: '#2d3345',
      colorBgContainer: '#1a1f2e',
    },
    Input: {
      borderRadius: 8,
      controlHeight: 38,
      colorBgContainer: '#141820',
      colorBorder: '#2d3345',
    },
    Select: {
      borderRadius: 8,
      controlHeight: 38,
      colorBgContainer: '#141820',
      colorBorder: '#2d3345',
    },
    Modal: {
      borderRadiusLG: 10,
      contentBg: '#141820',
      headerBg: '#141820',
    },
    Drawer: {
      paddingLG: 24,
      colorBgElevated: '#141820',
    },
    Menu: {
      itemBorderRadius: 6,
      colorItemBg: 'transparent',
      colorItemBgHover: '#222938',
      colorItemBgSelected: 'rgba(91,156,245,0.12)',
      colorItemText: '#8b92a5',
      colorItemTextHover: '#e8ecf4',
      colorItemTextSelected: '#5b9cf5',
      colorBgContainer: '#141820',
    },
    Tag: { borderRadiusSM: 4 },
    Dropdown: { colorBgElevated: '#1a1f2e' },
    Tooltip: { colorBgSpotlight: '#222938' },
    Popover: { colorBgElevated: '#1a1f2e' },
    Pagination: {
      colorBgContainer: '#1a1f2e',
    },
    Slider: {
      colorBgContainer: '#2d3345',
    },
  },
};

/**
 * TopiVra 亮色主题
 */
export const lightTheme: ThemeConfig = {
  token: {
    colorPrimary: '#2563eb',
    colorSuccess: '#16a34a',
    colorWarning: '#d97706',
    colorError: '#dc2626',
    colorInfo: '#2563eb',

    borderRadius: 8,

    fontFamily: "'Noto Sans SC', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",

    fontSize: 14,
    fontSizeHeading1: 38,
    fontSizeHeading2: 30,
    fontSizeHeading3: 22,
    fontSizeHeading4: 18,
    fontSizeHeading5: 15,

    colorBgContainer: '#ffffff',
    colorBgLayout: '#f0f2f5',
    colorBgElevated: '#ffffff',

    colorText: '#0a0e1a',
    colorTextSecondary: '#3d4a5c',
    colorTextTertiary: '#6b7a8d',
    colorTextQuaternary: '#b0bac9',

    colorBorder: '#dde3ec',
    colorBorderSecondary: '#eef1f6',
  },
  components: {
    Layout: {
      headerBg: '#ffffff',
      bodyBg: '#f0f2f5',
      footerBg: '#0a0e1a',
    },
    Button: {
      borderRadius: 8,
      controlHeight: 38,
      controlHeightLG: 46,
      controlHeightSM: 30,
    },
    Card: {
      borderRadiusLG: 10,
      paddingLG: 20,
    },
    Menu: {
      itemBorderRadius: 6,
      colorItemBg: 'transparent',
      colorItemBgHover: '#eff6ff',
      colorItemBgSelected: '#dbeafe',
      colorItemText: '#3d4a5c',
      colorItemTextHover: '#2563eb',
      colorItemTextSelected: '#2563eb',
      colorBgContainer: '#ffffff',
    },
    Tag: { borderRadiusSM: 4 },
  },
};

export function getAntdTheme(isDark: boolean): ThemeConfig {
  return isDark ? darkTheme : lightTheme;
}

export const theme = darkTheme;
