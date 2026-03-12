import { Grid } from 'antd';

const { useBreakpoint } = Grid;

export function useResponsive() {
  const screens = useBreakpoint();

  const isMobile = !screens.md; // < 768px
  const isTablet = screens.md && !screens.lg; // 768-991px
  const isDesktop = !!screens.lg; // >= 992px

  return { isMobile, isTablet, isDesktop, screens };
}