import { useEffect } from 'react';
import { Layout, Button, Dropdown, Space, Badge, Avatar } from 'antd';
import { Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useI18nNavigate, useI18nHref } from '@/hooks/useI18nNavigate';
import { LANGUAGE_OPTIONS } from '@/i18n/config';
import {
  ShoppingCartOutlined,
  UserOutlined,
  LoginOutlined,
  ShopOutlined,
  MessageOutlined,
} from '@ant-design/icons';
import type { MenuProps } from 'antd';
import { useAuthStore } from '@/store/authStore';
import { useCartStore } from '@/store/cartStore';
import { ThemeToggle } from '@/components/common/ThemeToggle';
import NotificationBell from '@/components/common/NotificationBell';
import './Header.css';

const { Header: AntHeader } = Layout;

export default function Header() {
  const { t, i18n } = useTranslation();
  const { navigate, switchLanguage } = useI18nNavigate();
  const { getHref } = useI18nHref();
  const location = useLocation();
  
  const { user, isAuthenticated, logout } = useAuthStore();
  const { itemCount, fetchCart } = useCartStore();
  const isLoggedIn = isAuthenticated;

  // Fetch cart count when user is authenticated
  useEffect(() => {
    if (isLoggedIn) {
      fetchCart();
    }
  }, [isLoggedIn, fetchCart]);

  // 语言选项配置 - 与 i18n locales 保持一致
  const languageOptions = LANGUAGE_OPTIONS;

  const currentLang = languageOptions.find(l => l.key === i18n.language) || languageOptions[0];

  // 语言切换菜单
  const languageMenu: MenuProps = {
    items: languageOptions.map(lang => ({
      key: lang.key,
      label: (
        <span className="header-language-option">
          <span className="header-language-flag">{lang.flag}</span>
          <span>{lang.label}</span>
        </span>
      ),
      onClick: () => { switchLanguage(lang.key); },
    })),
    selectedKeys: [i18n.language],
  };

  // 用户菜单（已登录状态）
  const userMenu: MenuProps['items'] = [
    {
      key: 'profile',
      label: t('user.profile'),
      onClick: () => navigate('/user/profile'),
    },
    {
      key: 'orders',
      label: t('user.myOrders'),
      onClick: () => navigate('/user/orders'),
    },
    {
      key: 'tickets',
      label: t('user.myTickets'),
      onClick: () => navigate('/buyer/tickets'),
    },
    {
      type: 'divider',
    },
    {
      key: 'logout',
      label: t('user.logout'),
      onClick: () => {
        logout();
        navigate('/login');
      },
    },
  ];

  const isSeller = user?.roles?.includes('seller') || false;

  return (
    <AntHeader className="header">
      {/* Logo */}
      <Link to={getHref('/')} className="header-logo">
        <div className="header-logo-mark">
          <svg width="22" height="22" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
            <defs>
              <linearGradient id="hbg" x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stopColor="#FF9A5C"/>
                <stop offset="48%" stopColor="#FF4D8C"/>
                <stop offset="100%" stopColor="#7C3AED"/>
              </linearGradient>
              <linearGradient id="hgl" x1="0" y1="0" x2="0" y2="32" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stopColor="#ffffff" stopOpacity="0.28"/>
                <stop offset="55%" stopColor="#ffffff" stopOpacity="0.06"/>
                <stop offset="100%" stopColor="#ffffff" stopOpacity="0"/>
              </linearGradient>
              <linearGradient id="htg" x1="0" y1="0" x2="10" y2="32" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stopColor="#FFFFFF"/>
                <stop offset="60%" stopColor="#FFF3DC"/>
                <stop offset="100%" stopColor="#FFD98A"/>
              </linearGradient>
              <filter id="hts" x="-50%" y="-50%" width="200%" height="200%">
                <feDropShadow dx="0" dy="1" stdDeviation="0.8" floodColor="#3B0764" floodOpacity="0.55"/>
              </filter>
            </defs>
            <rect x="1" y="1" width="30" height="30" rx="8" ry="8" fill="url(#hbg)"/>
            <rect x="1" y="1" width="30" height="30" rx="8" ry="8" fill="url(#hgl)"/>
            <rect x="1.5" y="1.5" width="29" height="29" rx="7.5" ry="7.5" fill="none" stroke="rgba(255,255,255,0.18)" strokeWidth="0.7"/>
            <path
              d="M6.5 9 L6.5 12.2 Q6.5 13 7.3 13 L13.2 13 L13.2 23.2 Q13.2 24 14 24 L18 24 Q18.8 24 18.8 23.2 L18.8 13 L24.7 13 Q25.5 13 25.5 12.2 L25.5 9 Q25.5 8 24.5 8 L7.5 8 Q6.5 8 6.5 9 Z"
              fill="url(#htg)"
              filter="url(#hts)"
            />
          </svg>
        </div>
        <span className="header-logo-name">TopiVra</span>
      </Link>
      <div className="header-community-stat">
        <span className="header-community-dot" />
        {t('header.communityStats', '已服务')}<span className="header-community-num"> 12{t('header.communityUnit', '万+')} </span>{t('header.communityUsers', '全球用户')}
      </div>

      {/* 导航菜单 */}
      <nav className="header-nav">
        <Link to={getHref('/')} className={`header-nav-item${location.pathname === '/' || location.pathname === `/${i18n.language}` ? ' header-nav-item--active' : ''}`}>{t('header.home', '首页')}</Link>
        <Link to={getHref('/products')} className={`header-nav-item${location.pathname.endsWith('/products') || location.pathname.includes('/products/') ? ' header-nav-item--active' : ''}`}>{t('header.products', '商品')}</Link>
        <Link to={getHref('/blog')} className={`header-nav-item${location.pathname.endsWith('/blog') || location.pathname.includes('/blog/') ? ' header-nav-item--active' : ''}`}>{t('nav.tutorials', '使用教程')}</Link>
        <Link to={getHref('/contact')} className={`header-nav-item${location.pathname.endsWith('/contact') ? ' header-nav-item--active' : ''}`}>{t('header.contact', '联系')}</Link>
      </nav>

      {/* 右侧操作区 */}
      <Space size="middle">
        {/* 申请成为卖家 / 卖家中心 */}
        {isLoggedIn && isSeller ? (
          <Button
            type="link"
            icon={<ShopOutlined />}
            onClick={() => navigate('/seller/products')}
          >
            {t('header.sellerCenter', '卖家中心')}
          </Button>
        ) : (
          <Button
            type="primary"
            ghost
            icon={<ShopOutlined />}
            onClick={() => navigate('/apply-seller')}
          >
            {t('header.applySeller', '申请成为卖家')}
          </Button>
        )}

        {/* 购物车 */}
        <Badge count={itemCount} showZero={false}>
          <Button
            type="text"
            icon={<ShoppingCartOutlined className="header-action-icon" />}
            onClick={() => navigate('/cart')}
          />
        </Badge>

        {/* 消息 */}
        {isLoggedIn && (
          <Button
            type="text"
            icon={<MessageOutlined className="header-action-icon" />}
            onClick={() => navigate(isSeller ? '/seller/messages' : '/user/messages')}
            data-testid="messages-button"
          />
        )}

        {/* 通知铃铛 */}
        <NotificationBell />

        {/* 主题切换 */}
        <ThemeToggle />

        {/* 语言切换 */}
        <Dropdown menu={languageMenu} placement="bottomRight">
          <Button type="text" className="header-language-button">
            {currentLang.flag}
          </Button>
        </Dropdown>

        {/* 用户菜单 */}
        {isLoggedIn ? (
          <Dropdown menu={{ items: userMenu }} placement="bottomRight">
            <Space className="header-user">
              <Avatar
                src={user?.avatar}
                icon={<UserOutlined />}
                className="header-avatar"
              />
              <span>{user?.username || t('user.user', '用户')}</span>
            </Space>
          </Dropdown>
        ) : (
          <Button
            type="primary"
            icon={<LoginOutlined />}
            onClick={() => navigate('/login')}
          >
            {t('header.login', '登录')}
          </Button>
        )}
      </Space>
    </AntHeader>
  );
}