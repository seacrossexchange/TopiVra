
import { useEffect, useMemo } from 'react';
import { Layout, Button, Dropdown, Space, Badge, Avatar, Tag, Tooltip } from 'antd';
import { Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  ShoppingCartOutlined,
  UserOutlined,
  LoginOutlined,
  ShopOutlined,
  MessageOutlined,
  CrownOutlined,
  UserSwitchOutlined,
} from '@ant-design/icons';
import type { MenuProps } from 'antd';
import { useAuthStore } from '@/store/authStore';
import { useCartStore } from '@/store/cartStore';
import { ThemeToggle } from '@/components/common/ThemeToggle';
import NotificationBell from '@/components/common/NotificationBell';
import { useI18nHref, useI18nNavigate } from '@/hooks/useI18nNavigate';
import './Header.css';

const { Header: AntHeader } = Layout;

export default function Header() {
  const { t, i18n } = useTranslation();
  const location = useLocation();
  const { navigate: i18nNavigate, switchLanguage } = useI18nNavigate();
  const { getHref } = useI18nHref();
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
  const languageOptions = [
    { key: 'zh-CN', flag: '🇨🇳', label: '简体中文' },
    { key: 'en',    flag: '🇺🇸', label: 'English' },
    { key: 'id',    flag: '🇮🇩', label: 'Bahasa Indonesia' },
    { key: 'pt-BR', flag: '🇧🇷', label: 'Português (Brasil)' },
    { key: 'es-MX', flag: '🇲🇽', label: 'Español (México)' },
  ];

  const currentLang = languageOptions.find(l => l.key === i18n.language) || languageOptions[0];

  // 语言切换菜单
  const languageMenu: MenuProps = {
    items: languageOptions.map(lang => ({
      key: lang.key,
      label: (
        <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 18, lineHeight: 1 }}>{lang.flag}</span>
          <span>{lang.label}</span>
        </span>
      ),
      onClick: () => { switchLanguage(lang.key); },
    })),
    selectedKeys: [i18n.language],
  };

  const roles = (user?.roles || []).map((r) => r.toUpperCase());
  const isSeller = roles.includes('SELLER') || user?.isSeller === true;
  const isAdmin = roles.includes('ADMIN');

  // 检测当前所在的角色后台
  const currentRole = useMemo(() => {
    const path = location.pathname;
    if (path.startsWith('/admin')) return 'admin';
    if (path.startsWith('/seller')) return 'seller';
    return 'buyer';
  }, [location.pathname]);

  // 角色配置
  const roleConfig = useMemo(() => ({
    buyer: {
      icon: <UserSwitchOutlined />,
      color: '#1890ff',
      bgColor: '#e6f4ff',
      label: t('header.roleBuyer', '买家'),
    },
    seller: {
      icon: <ShopOutlined />,
      color: '#52c41a',
      bgColor: '#f6ffed',
      label: t('header.roleSeller', '卖家'),
    },
    admin: {
      icon: <CrownOutlined />,
      color: '#722ed1',
      bgColor: '#f9f0ff',
      label: t('header.roleAdmin', '管理员'),
    },
  }), [t]);

  // 角色后台入口菜单 - 先定义
  const roleMenuItems: MenuProps['items'] = [];
  
  // 买家中心入口（所有登录用户都有）
  roleMenuItems.push({
    key: 'buyer-center',
    label: (
      <Space>
        <UserSwitchOutlined />
        <span>{t('header.buyerCenter', '买家中心')}</span>
      </Space>
    ),
    onClick: () => i18nNavigate('/user/orders'),
  });

  // 卖家后台入口
  if (isSeller) {
    roleMenuItems.push({
      key: 'seller-center',
      label: (
        <Space>
          <ShopOutlined />
          <span>{t('header.sellerCenter', '卖家后台')}</span>
        </Space>
      ),
      onClick: () => i18nNavigate('/seller/products'),
    });
  }

  // 管理后台入口
  if (isAdmin) {
    roleMenuItems.push({
      key: 'admin-center',
      label: (
        <Space>
          <CrownOutlined />
          <span>{t('header.adminCenter', '管理后台')}</span>
        </Space>
      ),
      onClick: () => i18nNavigate('/admin/dashboard'),
    });
  }

  // 用户菜单（已登录状态） - 在 roleMenuItems 之后定义
  const userMenu: MenuProps['items'] = [
    // 角色后台直达入口区域
    ...(roleMenuItems.length > 0 ? [
      {
        type: 'group' as const,
        key: 'role-switch',
        label: <span className="header-menu-group-label">{t('header.roleSwitch', '角色切换')}</span>,
        children: roleMenuItems,
      },
      { type: 'divider' as const, key: 'role-divider' },
    ] : []),
    // 个人中心功能
    {
      key: 'profile',
      icon: <UserOutlined />,
      label: t('user.profile'),
      onClick: () => i18nNavigate('/user/profile'),
    },
    {
      key: 'orders',
      icon: <ShoppingCartOutlined />,
      label: t('user.myOrders'),
      onClick: () => i18nNavigate('/user/orders'),
    },
    {
      key: 'tickets',
      icon: <MessageOutlined />,
      label: t('user.myTickets'),
      onClick: () => i18nNavigate('/buyer/tickets'),
    },
    {
      type: 'divider',
    },
    {
      key: 'logout',
      icon: <LoginOutlined />,
      label: t('user.logout'),
      danger: true,
      onClick: () => {
        logout();
        i18nNavigate('/login');
      },
    },
  ];

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
        <Link to={getHref('/')} className={`header-nav-item${location.pathname === '/' ? ' header-nav-item--active' : ''}`}>{t('header.home', '首页')}</Link>
        <Link to={getHref('/products')} className={`header-nav-item${location.pathname.startsWith('/products') ? ' header-nav-item--active' : ''}`}>{t('header.products', '商品')}</Link>
        <Link to={getHref('/blog')} className={`header-nav-item${location.pathname.startsWith('/blog') ? ' header-nav-item--active' : ''}`}>{t('nav.tutorials', '使用教程')}</Link>
        <Link to={getHref('/contact')} className={`header-nav-item${location.pathname === '/contact' ? ' header-nav-item--active' : ''}`}>{t('header.contact', '联系')}</Link>
      </nav>

      {/* 右侧操作区 */}
      <Space size="middle">
        {/* 申请成为卖家 / 卖家中心 */}
        {isLoggedIn && isSeller ? (
          <Button
            type="link"
            icon={<ShopOutlined />}
            onClick={() => i18nNavigate('/seller/products')}
          >
            {t('header.sellerCenter', '卖家中心')}
          </Button>
        ) : (
          <Button
            type="primary"
            ghost
            icon={<ShopOutlined />}
            onClick={() => i18nNavigate('/apply-seller')}
          >
            {t('header.applySeller', '申请成为卖家')}
          </Button>
        )}

        {/* 购物车 */}
        <Badge count={itemCount} showZero={false}>
          <Button
            type="text"
            icon={<ShoppingCartOutlined style={{ fontSize: 20 }} />}
            onClick={() => i18nNavigate('/cart')}
          />
        </Badge>

        {/* 消息 */}
        {isLoggedIn && (
          <Button
            type="text"
            icon={<MessageOutlined style={{ fontSize: 20 }} />}
            onClick={() => i18nNavigate(isSeller ? '/seller/messages' : '/user/messages')}
            data-testid="messages-button"
          />
        )}

        {/* 通知铃铛 */}
        <NotificationBell />

        {/* 主题切换 */}
        <ThemeToggle />

        {/* 语言切换 */}
        <Dropdown menu={languageMenu} placement="bottomRight">
          <Button type="text" style={{ padding: '0 8px', fontSize: 20, lineHeight: 1 }}>
            {currentLang.flag}
          </Button>
        </Dropdown>

        {/* 用户菜单 */}
        {isLoggedIn ? (
          <Dropdown menu={{ items: userMenu }} placement="bottomRight" trigger={['click']}>
            <Space className="header-user">
              <div className="header-avatar-wrapper">
                <Avatar
                  src={user?.avatar}
                  icon={<UserOutlined />}
                  className="header-avatar"
                />
                {/* 当前角色徽章 */}
                <Tooltip title={t('header.currentRole', '当前身份') + ': ' + roleConfig[currentRole].label}>
                  <span 
                    className="header-role-badge"
                    style={{ 
                      backgroundColor: roleConfig[currentRole].color,
                    }}
                  >
                    {currentRole === 'admin' && <CrownOutlined style={{ fontSize: 10 }} />}
                    {currentRole === 'seller' && <ShopOutlined style={{ fontSize: 10 }} />}
                    {currentRole === 'buyer' && <UserSwitchOutlined style={{ fontSize: 10 }} />}
                  </span>
                </Tooltip>
              </div>
              <div className="header-user-info">
                <span className="header-username">{user?.username || '用户'}</span>
                <Tag 
                  className="header-role-tag"
                  style={{ 
                    color: roleConfig[currentRole].color,
                    backgroundColor: roleConfig[currentRole].bgColor,
                    border: 'none',
                    fontSize: 11,
                    lineHeight: '16px',
                    padding: '0 4px',
                    margin: 0,
                  }}
                >
                  {roleConfig[currentRole].icon} {roleConfig[currentRole].label}
                </Tag>
              </div>
            </Space>
          </Dropdown>
        ) : (
          <Button
            type="primary"
            icon={<LoginOutlined />}
            onClick={() => i18nNavigate('/login')}
          >
            {t('header.login', '登录')}
          </Button>
        )}
      </Space>
    </AntHeader>
  );
}