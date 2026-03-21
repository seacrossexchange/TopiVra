import { useLocation } from 'react-router-dom';
import { HomeOutlined, AppstoreOutlined, ShoppingCartOutlined, UserOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import { useResponsive } from '@/hooks/useResponsive';
import { useI18nNavigate } from '@/hooks/useI18nNavigate';
import './MobileTabBar.css';

export function MobileTabBar() {
  const { t } = useTranslation();
  const { isMobile } = useResponsive();
  const location = useLocation();
  const { navigate: i18nNavigate } = useI18nNavigate();

  if (!isMobile) return null;

  const tabs = [
    { key: '/', icon: <HomeOutlined />, title: t('nav.home') },
    { key: '/products', icon: <AppstoreOutlined />, title: t('nav.products') },
    { key: '/cart', icon: <ShoppingCartOutlined />, title: t('nav.cart') },
    { key: '/user', icon: <UserOutlined />, title: t('mobile.me') },
  ];

  return (
    <div className="mobile-tab-bar mobile-only">
      {tabs.map((tab) => (
        <div
          key={tab.key}
          className={`tab-item ${location.pathname === tab.key ? 'active' : ''}`}
          onClick={() => i18nNavigate(tab.key)}
        >
          {tab.icon}
          <span>{tab.title}</span>
        </div>
      ))}
    </div>
  );
}