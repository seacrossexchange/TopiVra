import { useState } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import {
  DashboardOutlined,
  ShoppingOutlined,
  OrderedListOutlined,
  WalletOutlined,
  CustomerServiceOutlined,
  SettingOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  LogoutOutlined,
  MessageOutlined,
  DatabaseOutlined,
} from '@ant-design/icons';
import { Layout, Menu, Button, Avatar, Dropdown } from 'antd';
import { useAuthStore } from '@/store/authStore';
import { useTranslation } from 'react-i18next';
import './SellerLayout.css';

const { Sider, Content, Header } = Layout;

export default function SellerLayout() {
  const { t } = useTranslation();
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();

  const menuItems = [
    {
      key: '/seller',
      icon: <DashboardOutlined />,
      label: t('seller.dashboard', '仪表盘'),
    },
    {
      key: '/seller/products',
      icon: <ShoppingOutlined />,
      label: t('seller.products', '商品管理'),
    },
    {
      key: '/seller/inventory',
      icon: <DatabaseOutlined />,
      label: t('seller.inventory', '库存管理'),
    },
    {
      key: '/seller/orders',
      icon: <OrderedListOutlined />,
      label: t('seller.orders', '订单管理'),
    },
    {
      key: '/seller/finance',
      icon: <WalletOutlined />,
      label: t('seller.finance', '财务中心'),
    },
    {
      key: '/seller/messages',
      icon: <MessageOutlined />,
      label: t('seller.messages', '消息中心'),
    },
    {
      key: '/seller/tickets',
      icon: <CustomerServiceOutlined />,
      label: t('seller.tickets', '工单支持'),
    },
    {
      key: '/seller/settings',
      icon: <SettingOutlined />,
      label: t('seller.settings', '店铺设置'),
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
      label: <Link to="/user/profile">{t('user.profile', '个人中心')}</Link>,
    },
    {
      key: 'orders',
      label: <Link to="/user/orders">{t('user.myOrders', '我的订单')}</Link>,
    },
    { type: 'divider' as const },
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: t('user.logout', '退出登录'),
      onClick: handleLogout,
    },
  ];

  return (
    <Layout className="seller-layout">
      <Sider
        trigger={null}
        collapsible
        collapsed={collapsed}
        className="seller-layout__sider"
        width={220}
      >
        <div className="seller-layout__logo">
          <Link to="/seller">
            {collapsed ? 'T' : `TopiVra ${t('seller.seller', '卖家')}`}
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
        <Header className="seller-layout__header">
          <Button
            type="text"
            icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
            onClick={() => setCollapsed(!collapsed)}
            className="seller-layout__trigger"
          />
          <div className="seller-layout__header-right">
            <Dropdown menu={{ items: userMenuItems }} placement="bottomRight">
              <div className="seller-layout__user">
                <Avatar size="small" src={user?.avatar}>
                  {user?.username?.[0]?.toUpperCase()}
                </Avatar>
                <span className="seller-layout__username">
                  {user?.username || t('seller.seller', '卖家')}
                </span>
              </div>
            </Dropdown>
          </div>
        </Header>
        <Content className="seller-layout__content">
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
}