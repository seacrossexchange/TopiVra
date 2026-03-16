import { useState } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import {
  DashboardOutlined,
  UserOutlined,
  ShoppingOutlined,
  OrderedListOutlined,
  WalletOutlined,
  CustomerServiceOutlined,
  SettingOutlined,
  FileTextOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  LogoutOutlined,
  ReconciliationOutlined,
  AppstoreOutlined,
  BarChartOutlined,
} from '@ant-design/icons';
import { Layout, Menu, Button, Avatar, Dropdown } from 'antd';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '@/store/authStore';
import './AdminLayout.css';

const { Sider, Content, Header } = Layout;

export default function AdminLayout() {
  const { t } = useTranslation();
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();

  const menuItems = [
    {
      key: '/admin',
      icon: <DashboardOutlined />,
      label: t('admin.dashboard'),
    },
    {
      key: '/admin/analytics',
      icon: <BarChartOutlined />,
      label: '流量分析',
    },
    {
      key: '/admin/users',
      icon: <UserOutlined />,
      label: t('admin.users'),
    },
    {
      key: '/admin/categories',
      icon: <AppstoreOutlined />,
      label: t('admin.categories', '分类管理'),
    },
    {
      key: '/admin/sellers',
      icon: <UserOutlined />,
      label: t('admin.sellers'),
    },
    {
      key: '/admin/products',
      icon: <ShoppingOutlined />,
      label: t('admin.products'),
    },
    {
      key: '/admin/orders',
      icon: <OrderedListOutlined />,
      label: t('admin.orders'),
    },
    {
      key: '/admin/finance',
      icon: <WalletOutlined />,
      label: t('admin.finance'),
    },
    {
      key: '/admin/tickets',
      icon: <CustomerServiceOutlined />,
      label: t('admin.tickets'),
    },
    {
      key: '/admin/refunds',
      icon: <ReconciliationOutlined />,
      label: t('admin.refunds', '退款管理'),
    },
    {
      key: '/admin/logs',
      icon: <FileTextOutlined />,
      label: t('admin.logs'),
    },
    {
      key: '/admin/settings',
      icon: <SettingOutlined />,
      label: t('admin.settings'),
    },
    {
      key: '/admin/payment-config',
      icon: <WalletOutlined />,
      label: 'Payment Config',
    },
    {
      key: '/admin/payment-gateways',
      icon: <WalletOutlined />,
      label: t('admin.paymentGateways', '支付通道'),
    },
    {
      key: '/admin/seo-config',
      icon: <FileTextOutlined />,
      label: 'SEO Config',
    },
    {
      key: '/admin/oauth-config',
      icon: <UserOutlined />,
      label: 'OAuth Config',
    },
    {
      key: '/admin/telegram-config',
      icon: <CustomerServiceOutlined />,
      label: 'Telegram Config',
    },
  ];

  const handleMenuClick = ({ key }: { key: string }) => {
    navigate(key);
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const userMenuItems = [
    {
      key: 'profile',
      label: <Link to="/user/profile">{t('user.profile')}</Link>,
    },
    { type: 'divider' as const },
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: t('user.logout'),
      onClick: handleLogout,
    },
  ];

  return (
    <Layout className="admin-layout">
      <Sider
        trigger={null}
        collapsible
        collapsed={collapsed}
        className="admin-layout__sider"
        width={220}
      >
        <div className="admin-layout__logo">
          <Link to="/admin">
            {collapsed ? 'T' : 'TopiVra Admin'}
          </Link>
        </div>
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[location.pathname]}
          items={menuItems}
          onClick={handleMenuClick}
        />
      </Sider>
      <Layout>
        <Header className="admin-layout__header">
          <Button
            type="text"
            icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
            onClick={() => setCollapsed(!collapsed)}
            className="admin-layout__trigger"
          />
          <div className="admin-layout__header-right">
            <Dropdown menu={{ items: userMenuItems }} placement="bottomRight">
              <div className="admin-layout__user">
                <Avatar size="small" src={user?.avatar}>
                  {user?.username?.[0]?.toUpperCase()}
                </Avatar>
                <span className="admin-layout__username">
                  {user?.username || t('admin.admin')}
                </span>
              </div>
            </Dropdown>
          </div>
        </Header>
        <Content className="admin-layout__content">
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
}