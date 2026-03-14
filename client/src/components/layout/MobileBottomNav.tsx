import { useNavigate, useLocation } from 'react-router-dom';
import { HomeOutlined, ShoppingOutlined, ShoppingCartOutlined, UserOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import { useCartStore } from '@/store/cartStore';
import './MobileBottomNav.css';

export default function MobileBottomNav() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const { itemCount } = useCartStore();

  const navItems = [
    {
      key: 'home',
      icon: <HomeOutlined />,
      label: t('nav.home', '首页'),
      path: '/',
    },
    {
      key: 'products',
      icon: <ShoppingOutlined />,
      label: t('nav.products', '商品'),
      path: '/products',
    },
    {
      key: 'cart',
      icon: <ShoppingCartOutlined />,
      label: t('nav.cart', '购物车'),
      path: '/cart',
      badge: itemCount,
    },
    {
      key: 'user',
      icon: <UserOutlined />,
      label: t('nav.user', '我的'),
      path: '/user',
    },
  ];

  const isActive = (path: string) => {
    if (path === '/') {
      return location.pathname === '/';
    }
    return location.pathname.startsWith(path);
  };

  return (
    <div className="mobile-bottom-nav">
      <div className="mobile-nav-inner">
        {navItems.map((item) => (
          <div
            key={item.key}
            className={`mobile-nav-item ${isActive(item.path) ? 'active' : ''}`}
            onClick={() => navigate(item.path)}
          >
            <div className="mobile-nav-icon">
              {item.icon}
              {item.badge && item.badge > 0 && (
                <span className="mobile-nav-badge">{item.badge > 99 ? '99+' : item.badge}</span>
              )}
            </div>
            <span className="mobile-nav-label">{item.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

