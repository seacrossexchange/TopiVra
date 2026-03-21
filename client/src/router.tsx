import { createBrowserRouter, Navigate, Outlet, useParams } from 'react-router-dom';
import { lazy, Suspense, useEffect } from 'react';
import MainLayout from '@/components/layout/MainLayout';
import AdminLayout from '@/components/layout/AdminLayout';
import SellerLayout from '@/components/layout/SellerLayout';
import PageLoading from '@/components/common/PageLoading';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import i18n from '@/i18n';
import { addLanguagePrefix, isSupportedLanguage } from '@/utils/i18nRouter';

// Public pages
const Home = lazy(() => import('@/pages/Home'));
const Login = lazy(() => import('@/pages/auth/Login'));
const Register = lazy(() => import('@/pages/auth/Register'));
const OAuthCallback = lazy(() => import('@/pages/auth/OAuthCallback'));
const NotFound = lazy(() => import('@/pages/NotFound'));
const ProductList = lazy(() => import('@/pages/products/ProductList'));
const ProductDetail = lazy(() => import('@/pages/products/ProductDetail'));
const Cart = lazy(() => import('@/pages/cart/Cart'));
const Checkout = lazy(() => import('@/pages/checkout/Checkout'));
const Contact = lazy(() => import('@/pages/static/Contact'));
const ApplySeller = lazy(() => import('@/pages/static/ApplySeller'));
const Terms = lazy(() => import('@/pages/static/Terms'));
const Privacy = lazy(() => import('@/pages/static/Privacy'));
const Refund = lazy(() => import('@/pages/static/Refund'));
const BlogList = lazy(() => import('@/pages/blog/BlogList'));
const BlogDetail = lazy(() => import('@/pages/blog/BlogDetail'));

// User pages
const UserProfile = lazy(() => import('@/pages/user/Profile'));
const UserOrders = lazy(() => import('@/pages/user/Orders'));
const UserOrderDetail = lazy(() => import('@/pages/user/OrderDetail'));
const UserMessages = lazy(() => import('@/pages/user/Messages'));
const UserTickets = lazy(() => import('@/pages/user/Tickets'));
const UserFavorites = lazy(() => import('@/pages/user/Favorites'));
const BuyerTicketList = lazy(() => import('@/pages/buyer/BuyerTicketList'));
const BuyerTicketDetail = lazy(() => import('@/pages/user/BuyerTicketDetail'));

// Seller pages
const SellerDashboard = lazy(() => import('@/pages/seller/Dashboard'));
const SellerProducts = lazy(() => import('@/pages/seller/Products'));
const SellerInventory = lazy(() => import('@/pages/seller/Inventory'));
const SellerOrders = lazy(() => import('@/pages/seller/Orders'));
const SellerFinance = lazy(() => import('@/pages/seller/Finance'));
const SellerMessages = lazy(() => import('@/pages/seller/Messages'));
const SellerSettings = lazy(() => import('@/pages/seller/Settings'));
const SellerTicketList = lazy(() => import('@/pages/seller/SellerTicketList'));
const SellerTicketDetail = lazy(() => import('@/pages/seller/SellerTicketDetail'));

// Admin pages
const AdminDashboard = lazy(() => import('@/pages/admin/Dashboard'));
const AdminAnalytics = lazy(() => import('@/pages/admin/Analytics'));
const AdminUsers = lazy(() => import('@/pages/admin/Users'));
const AdminCategories = lazy(() => import('@/pages/admin/Categories'));
const AdminSellers = lazy(() => import('@/pages/admin/Sellers'));
const AdminProducts = lazy(() => import('@/pages/admin/Products'));
const AdminOrders = lazy(() => import('@/pages/admin/Orders'));
const AdminFinance = lazy(() => import('@/pages/admin/Finance'));
const AdminRefunds = lazy(() => import('@/pages/admin/Refunds'));
const AdminTicketList = lazy(() => import('@/pages/admin/AdminTicketList'));
const AdminTicketDetail = lazy(() => import('@/pages/admin/AdminTicketDetail'));
const AdminLogs = lazy(() => import('@/pages/admin/Logs'));
const AdminSettings = lazy(() => import('@/pages/admin/Settings'));
const AdminPaymentConfig = lazy(() => import('@/pages/admin/PaymentConfig'));
const AdminPaymentGateways = lazy(() => import('@/pages/admin/PaymentGateways'));
const AdminSeoConfig = lazy(() => import('@/pages/admin/SeoConfig'));
const AdminOAuthConfig = lazy(() => import('@/pages/admin/OAuthConfig'));
const AdminTelegramConfig = lazy(() => import('@/pages/admin/TelegramConfig'));

const LazyWrapper = ({ children }: { children: React.ReactNode }) => (
  <Suspense fallback={<PageLoading />}>{children}</Suspense>
);

const LocaleBoundary = ({ children }: { children?: React.ReactNode }) => {
  const { lang } = useParams<{ lang?: string }>();

  useEffect(() => {
    if (isSupportedLanguage(lang) && i18n.language !== lang) {
      void i18n.changeLanguage(lang);
    }
  }, [lang]);

  if (lang && !isSupportedLanguage(lang)) {
    return <Navigate to="/" replace />;
  }

  return children ? <>{children}</> : <Outlet />;
};

const LazyRedirect = ({ to }: { to: string }) => {
  const { lang } = useParams<{ lang?: string }>();
  const target = isSupportedLanguage(lang) ? addLanguagePrefix(to, lang) : to;

  return <Navigate to={target} replace />;
};

const publicChildren = [
  {
    index: true,
    element: <LazyWrapper><Home /></LazyWrapper>,
  },
  {
    path: 'login',
    element: <LazyWrapper><Login /></LazyWrapper>,
  },
  {
    path: 'register',
    element: <LazyWrapper><Register /></LazyWrapper>,
  },
  {
    path: 'auth/login',
    element: <LazyRedirect to="/login" />,
  },
  {
    path: 'auth/register',
    element: <LazyRedirect to="/register" />,
  },
  {
    path: 'auth/callback',
    element: <LazyWrapper><OAuthCallback /></LazyWrapper>,
  },
  {
    path: 'products',
    element: <LazyWrapper><ProductList /></LazyWrapper>,
  },
  {
    path: 'products/:id',
    element: <LazyWrapper><ProductDetail /></LazyWrapper>,
  },
  {
    path: 'cart',
    element: <LazyWrapper><Cart /></LazyWrapper>,
  },
  {
    path: 'checkout',
    element: <LazyWrapper><Checkout /></LazyWrapper>,
  },
  {
    path: 'contact',
    element: <LazyWrapper><Contact /></LazyWrapper>,
  },
  {
    path: 'apply-seller',
    element: <LazyWrapper><ApplySeller /></LazyWrapper>,
  },
  {
    path: 'terms',
    element: <LazyWrapper><Terms /></LazyWrapper>,
  },
  {
    path: 'privacy',
    element: <LazyWrapper><Privacy /></LazyWrapper>,
  },
  {
    path: 'refund',
    element: <LazyWrapper><Refund /></LazyWrapper>,
  },
  {
    path: 'blog',
    element: <LazyWrapper><BlogList /></LazyWrapper>,
  },
  {
    path: 'blog/:slug',
    element: <LazyWrapper><BlogDetail /></LazyWrapper>,
  },
  {
    path: 'user',
    element: <ProtectedRoute requiredRole="user" />,
    children: [
      {
        index: true,
        element: <LazyRedirect to="/buyer/tickets" />,
      },
      {
        path: 'profile',
        element: <LazyWrapper><UserProfile /></LazyWrapper>,
      },
      {
        path: 'orders',
        element: <LazyWrapper><UserOrders /></LazyWrapper>,
      },
      {
        path: 'orders/:id',
        element: <LazyWrapper><UserOrderDetail /></LazyWrapper>,
      },
      {
        path: 'messages',
        element: <LazyWrapper><UserMessages /></LazyWrapper>,
      },
      {
        path: 'favorites',
        element: <LazyWrapper><UserFavorites /></LazyWrapper>,
      },
      {
        path: 'tickets',
        element: <LazyRedirect to="/buyer/tickets" />,
      },
      {
        path: 'tickets/:ticketNo',
        element: <LazyWrapper><BuyerTicketDetail /></LazyWrapper>,
      },
      {
        path: 'support',
        element: <LazyWrapper><UserTickets /></LazyWrapper>,
      },
    ],
  },
  {
    path: 'buyer',
    element: <ProtectedRoute requiredRole="user" />,
    children: [
      {
        path: 'tickets',
        element: <LazyWrapper><BuyerTicketList /></LazyWrapper>,
      },
      {
        path: 'tickets/:ticketNo',
        element: <LazyWrapper><BuyerTicketDetail /></LazyWrapper>,
      },
    ],
  },
];

const sellerChildren = [
  {
    index: true,
    element: <LazyWrapper><SellerDashboard /></LazyWrapper>,
  },
  {
    path: 'products',
    element: <LazyWrapper><SellerProducts /></LazyWrapper>,
  },
  {
    path: 'inventory',
    element: <LazyWrapper><SellerInventory /></LazyWrapper>,
  },
  {
    path: 'orders',
    element: <LazyWrapper><SellerOrders /></LazyWrapper>,
  },
  {
    path: 'finance',
    element: <LazyWrapper><SellerFinance /></LazyWrapper>,
  },
  {
    path: 'messages',
    element: <LazyWrapper><SellerMessages /></LazyWrapper>,
  },
  {
    path: 'settings',
    element: <LazyWrapper><SellerSettings /></LazyWrapper>,
  },
  {
    path: 'tickets',
    element: <LazyWrapper><SellerTicketList /></LazyWrapper>,
  },
  {
    path: 'tickets/:ticketNo',
    element: <LazyWrapper><SellerTicketDetail /></LazyWrapper>,
  },
];

const adminChildren = [
  {
    index: true,
    element: <LazyWrapper><AdminDashboard /></LazyWrapper>,
  },
  {
    path: 'dashboard',
    element: <LazyRedirect to="/admin" />,
  },
  {
    path: 'analytics',
    element: <LazyWrapper><AdminAnalytics /></LazyWrapper>,
  },
  {
    path: 'users',
    element: <LazyWrapper><AdminUsers /></LazyWrapper>,
  },
  {
    path: 'categories',
    element: <LazyWrapper><AdminCategories /></LazyWrapper>,
  },
  {
    path: 'sellers',
    element: <LazyWrapper><AdminSellers /></LazyWrapper>,
  },
  {
    path: 'products',
    element: <LazyWrapper><AdminProducts /></LazyWrapper>,
  },
  {
    path: 'orders',
    element: <LazyWrapper><AdminOrders /></LazyWrapper>,
  },
  {
    path: 'finance',
    element: <LazyWrapper><AdminFinance /></LazyWrapper>,
  },
  {
    path: 'refunds',
    element: <LazyWrapper><AdminRefunds /></LazyWrapper>,
  },
  {
    path: 'tickets',
    element: <LazyWrapper><AdminTicketList /></LazyWrapper>,
  },
  {
    path: 'tickets/:ticketNo',
    element: <LazyWrapper><AdminTicketDetail /></LazyWrapper>,
  },
  {
    path: 'logs',
    element: <LazyWrapper><AdminLogs /></LazyWrapper>,
  },
  {
    path: 'settings',
    element: <LazyWrapper><AdminSettings /></LazyWrapper>,
  },
  {
    path: 'payment-config',
    element: <LazyWrapper><AdminPaymentConfig /></LazyWrapper>,
  },
  {
    path: 'payment-gateways',
    element: <LazyWrapper><AdminPaymentGateways /></LazyWrapper>,
  },
  {
    path: 'seo-config',
    element: <LazyWrapper><AdminSeoConfig /></LazyWrapper>,
  },
  {
    path: 'oauth-config',
    element: <LazyWrapper><AdminOAuthConfig /></LazyWrapper>,
  },
  {
    path: 'telegram-config',
    element: <LazyWrapper><AdminTelegramConfig /></LazyWrapper>,
  },
];

export const router = createBrowserRouter([
  {
    path: '/',
    element: <MainLayout />,
    children: publicChildren,
  },
  {
    path: '/:lang',
    element: (
      <LocaleBoundary>
        <MainLayout />
      </LocaleBoundary>
    ),
    children: publicChildren,
  },
  {
    path: '/seller',
    element: (
      <ProtectedRoute requiredRole="seller">
        <SellerLayout />
      </ProtectedRoute>
    ),
    children: sellerChildren,
  },
  {
    path: '/:lang/seller',
    element: (
      <LocaleBoundary>
        <ProtectedRoute requiredRole="seller">
          <SellerLayout />
        </ProtectedRoute>
      </LocaleBoundary>
    ),
    children: sellerChildren,
  },
  {
    path: '/admin',
    element: (
      <ProtectedRoute requiredRole="admin">
        <AdminLayout />
      </ProtectedRoute>
    ),
    children: adminChildren,
  },
  {
    path: '/:lang/admin',
    element: (
      <LocaleBoundary>
        <ProtectedRoute requiredRole="admin">
          <AdminLayout />
        </ProtectedRoute>
      </LocaleBoundary>
    ),
    children: adminChildren,
  },
  {
    path: '*',
    element: <LazyWrapper><NotFound /></LazyWrapper>,
  },
]);
