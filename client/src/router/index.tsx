import { lazy, Suspense } from 'react';
import { createBrowserRouter } from 'react-router-dom';
import MainLayout from '@/components/layout/MainLayout';
import SellerLayout from '@/components/layout/SellerLayout';
import AdminLayout from '@/components/layout/AdminLayout';
import PageLoading from '@/components/common/PageLoading';
import ProtectedRoute from '@/components/auth/ProtectedRoute';

// 懒加载页面组件
const Home = lazy(() => import('../pages/Home'));
const ProductList = lazy(() => import('../pages/products/ProductList'));
const ProductDetail = lazy(() => import('../pages/products/ProductDetail'));
const Cart = lazy(() => import('../pages/cart/Cart'));
const Checkout = lazy(() => import('../pages/checkout/Checkout'));
const UserProfile = lazy(() => import('../pages/user/Profile'));
const UserOrders = lazy(() => import('../pages/user/Orders'));
const UserOrderDetail = lazy(() => import('../pages/user/OrderDetail'));
const UserFavorites = lazy(() => import('../pages/user/Favorites'));
const UserTickets = lazy(() => import('../pages/user/Tickets'));
const UserMessages = lazy(() => import('../pages/user/Messages'));
const About = lazy(() => import('../pages/static/About'));
const Contact = lazy(() => import('../pages/static/Contact'));
const ApplySeller = lazy(() => import('../pages/static/ApplySeller'));
const Terms = lazy(() => import('../pages/static/Terms'));
const Privacy = lazy(() => import('../pages/static/Privacy'));
const Refund = lazy(() => import('../pages/static/Refund'));

// 认证页面
const Login = lazy(() => import('../pages/auth/Login'));
const Register = lazy(() => import('../pages/auth/Register'));
const TwoFactorAuth = lazy(() => import('../pages/auth/TwoFactorAuth'));
const OAuthCallback = lazy(() => import('../pages/auth/OAuthCallback'));

// 卖家页面
const SellerDashboard = lazy(() => import('../pages/seller/Dashboard'));
const SellerProducts = lazy(() => import('../pages/seller/Products'));
const SellerOrders = lazy(() => import('../pages/seller/Orders'));
const SellerFinance = lazy(() => import('../pages/seller/Finance'));
const SellerTickets = lazy(() => import('../pages/seller/Tickets'));
const SellerSettings = lazy(() => import('../pages/seller/Settings'));
const SellerMessages = lazy(() => import('../pages/seller/Messages'));

// 管理员页面
const AdminDashboard = lazy(() => import('../pages/admin/Dashboard'));
const AdminCategories = lazy(() => import('../pages/admin/Categories'));
const AdminUsers = lazy(() => import('../pages/admin/Users'));
const AdminProducts = lazy(() => import('../pages/admin/Products'));
const AdminOrders = lazy(() => import('../pages/admin/Orders'));
const AdminSellers = lazy(() => import('../pages/admin/Sellers'));
const AdminFinance = lazy(() => import('../pages/admin/Finance'));
const AdminTickets = lazy(() => import('../pages/admin/Tickets'));
const AdminLogs = lazy(() => import('../pages/admin/Logs'));
const AdminSettings = lazy(() => import('../pages/admin/Settings'));
const AdminRefunds = lazy(() => import('../pages/admin/Refunds'));
const PaymentConfig = lazy(() => import('../pages/admin/PaymentConfig'));
const PaymentGateways = lazy(() => import('../pages/admin/PaymentGateways'));
const SeoConfig = lazy(() => import('../pages/admin/SeoConfig'));
const AdminAnalytics = lazy(() => import('../pages/admin/Analytics'));
const OAuthConfig = lazy(() => import('../pages/admin/OAuthConfig'));
const TelegramConfig = lazy(() => import('../pages/admin/TelegramConfig'));
const BlogList = lazy(() => import('../pages/blog/BlogList'));
const BlogDetail = lazy(() => import('../pages/blog/BlogDetail'));
const Tools = lazy(() => import('../pages/tools/Tools'));
const TwoFaGenerator = lazy(() => import('../pages/tools/TwoFaGenerator'));
const NotFound = lazy(() => import('../pages/NotFound'));

// 加载包装器
const LoadingWrapper = ({ children }: { children: React.ReactNode }) => (
  <Suspense fallback={<PageLoading />}>{children}</Suspense>
);

export const router = createBrowserRouter([
  // 主布局路由
  {
    path: '/',
    element: <MainLayout />,
    children: [
      {
        index: true,
        element: (
          <LoadingWrapper>
            <Home />
          </LoadingWrapper>
        ),
      },
      {
        path: 'products',
        element: (
          <LoadingWrapper>
            <ProductList />
          </LoadingWrapper>
        ),
      },
      {
        path: 'products/:id',
        element: (
          <LoadingWrapper>
            <ProductDetail />
          </LoadingWrapper>
        ),
      },
      {
        path: 'cart',
        element: (
          <LoadingWrapper>
            <Cart />
          </LoadingWrapper>
        ),
      },
      {
        path: 'checkout',
        element: (
          <ProtectedRoute>
            <LoadingWrapper>
              <Checkout />
            </LoadingWrapper>
          </ProtectedRoute>
        ),
      },
      {
        path: 'about',
        element: (
          <LoadingWrapper>
            <About />
          </LoadingWrapper>
        ),
      },
      {
        path: 'contact',
        element: (
          <LoadingWrapper>
            <Contact />
          </LoadingWrapper>
        ),
      },
      {
        path: 'tutorials',
        element: (
          <LoadingWrapper>
            <BlogList />
          </LoadingWrapper>
        ),
      },
      {
        path: 'apply-seller',
        element: (
          <LoadingWrapper>
            <ApplySeller />
          </LoadingWrapper>
        ),
      },
      {
        path: 'terms',
        element: (
          <LoadingWrapper>
            <Terms />
          </LoadingWrapper>
        ),
      },
      {
        path: 'privacy',
        element: (
          <LoadingWrapper>
            <Privacy />
          </LoadingWrapper>
        ),
      },
      {
        path: 'refund',
        element: (
          <LoadingWrapper>
            <Refund />
          </LoadingWrapper>
        ),
      },
      {
        path: 'blog',
        element: (
          <LoadingWrapper>
            <BlogList />
          </LoadingWrapper>
        ),
      },
      {
        path: 'blog/:slug',
        element: (
          <LoadingWrapper>
            <BlogDetail />
          </LoadingWrapper>
        ),
      },
      {
        path: 'tools',
        element: (
          <LoadingWrapper>
            <Tools />
          </LoadingWrapper>
        ),
      },
      {
        path: 'tools/2fa-generator',
        element: (
          <LoadingWrapper>
            <TwoFaGenerator />
          </LoadingWrapper>
        ),
      },
      {
        path: 'user/profile',
        element: (
          <ProtectedRoute>
            <LoadingWrapper>
              <UserProfile />
            </LoadingWrapper>
          </ProtectedRoute>
        ),
      },
      {
        path: 'user/orders',
        element: (
          <ProtectedRoute>
            <LoadingWrapper>
              <UserOrders />
            </LoadingWrapper>
          </ProtectedRoute>
        ),
      },
      {
        path: 'user/orders/:id',
        element: (
          <ProtectedRoute>
            <LoadingWrapper>
              <UserOrderDetail />
            </LoadingWrapper>
          </ProtectedRoute>
        ),
      },
      {
        path: 'user/favorites',
        element: (
          <ProtectedRoute>
            <LoadingWrapper>
              <UserFavorites />
            </LoadingWrapper>
          </ProtectedRoute>
        ),
      },
      {
        path: 'user/tickets',
        element: (
          <ProtectedRoute>
            <LoadingWrapper>
              <UserTickets />
            </LoadingWrapper>
          </ProtectedRoute>
        ),
      },
      {
        path: 'user/messages',
        element: (
          <ProtectedRoute>
            <LoadingWrapper>
              <UserMessages />
            </LoadingWrapper>
          </ProtectedRoute>
        ),
      },
      // 404 兜底路由
      {
        path: '*',
        element: (
          <LoadingWrapper>
            <NotFound />
          </LoadingWrapper>
        ),
      },
    ],
  },
  // 认证路由（无布局）
  {
    path: '/auth',
    children: [
      {
        path: 'login',
        element: (
          <LoadingWrapper>
            <Login />
          </LoadingWrapper>
        ),
      },
      {
        path: 'register',
        element: (
          <LoadingWrapper>
            <Register />
          </LoadingWrapper>
        ),
      },
      {
        path: '2fa',
        element: (
          <LoadingWrapper>
            <TwoFactorAuth />
          </LoadingWrapper>
        ),
      },
      {
        path: 'callback',
        element: (
          <LoadingWrapper>
            <OAuthCallback />
          </LoadingWrapper>
        ),
      },
    ],
  },
  // 卖家布局路由
  {
    path: '/seller',
    element: (
      <ProtectedRoute requiredRole="seller">
        <SellerLayout />
      </ProtectedRoute>
    ),
    children: [
      {
        index: true,
        element: (
          <LoadingWrapper>
            <SellerDashboard />
          </LoadingWrapper>
        ),
      },
      {
        path: 'products',
        element: (
          <LoadingWrapper>
            <SellerProducts />
          </LoadingWrapper>
        ),
      },
      {
        path: 'orders',
        element: (
          <LoadingWrapper>
            <SellerOrders />
          </LoadingWrapper>
        ),
      },
      {
        path: 'finance',
        element: (
          <LoadingWrapper>
            <SellerFinance />
          </LoadingWrapper>
        ),
      },
      {
        path: 'tickets',
        element: (
          <LoadingWrapper>
            <SellerTickets />
          </LoadingWrapper>
        ),
      },
      {
        path: 'settings',
        element: (
          <LoadingWrapper>
            <SellerSettings />
          </LoadingWrapper>
        ),
      },
      {
        path: 'messages',
        element: (
          <LoadingWrapper>
            <SellerMessages />
          </LoadingWrapper>
        ),
      },
    ],
  },
  // 管理员布局路由
  {
    path: '/admin',
    element: (
      <ProtectedRoute requiredRole="admin">
        <AdminLayout />
      </ProtectedRoute>
    ),
    children: [
      {
        index: true,
        element: (
          <LoadingWrapper>
            <AdminDashboard />
          </LoadingWrapper>
        ),
      },
      {
        path: 'categories',
        element: (
          <LoadingWrapper>
            <AdminCategories />
          </LoadingWrapper>
        ),
      },
      {
        path: 'users',
        element: (
          <LoadingWrapper>
            <AdminUsers />
          </LoadingWrapper>
        ),
      },
      {
        path: 'products',
        element: (
          <LoadingWrapper>
            <AdminProducts />
          </LoadingWrapper>
        ),
      },
      {
        path: 'orders',
        element: (
          <LoadingWrapper>
            <AdminOrders />
          </LoadingWrapper>
        ),
      },
      {
        path: 'sellers',
        element: (
          <LoadingWrapper>
            <AdminSellers />
          </LoadingWrapper>
        ),
      },
      {
        path: 'finance',
        element: (
          <LoadingWrapper>
            <AdminFinance />
          </LoadingWrapper>
        ),
      },
      {
        path: 'tickets',
        element: (
          <LoadingWrapper>
            <AdminTickets />
          </LoadingWrapper>
        ),
      },
      {
        path: 'logs',
        element: (
          <LoadingWrapper>
            <AdminLogs />
          </LoadingWrapper>
        ),
      },
      {
        path: 'settings',
        element: (
          <LoadingWrapper>
            <AdminSettings />
          </LoadingWrapper>
        ),
      },
      {
        path: 'refunds',
        element: (
          <LoadingWrapper>
            <AdminRefunds />
          </LoadingWrapper>
        ),
      },
      {
        path: 'payment-config',
        element: (
          <LoadingWrapper>
            <PaymentConfig />
          </LoadingWrapper>
        ),
      },
      {
        path: 'payment-gateways',
        element: (
          <LoadingWrapper>
            <PaymentGateways />
          </LoadingWrapper>
        ),
      },
      {
        path: 'seo-config',
        element: (
          <LoadingWrapper>
            <SeoConfig />
          </LoadingWrapper>
        ),
      },
      {
        path: 'oauth-config',
        element: (
          <LoadingWrapper>
            <OAuthConfig />
          </LoadingWrapper>
        ),
      },
      {
        path: 'telegram-config',
        element: (
          <LoadingWrapper>
            <TelegramConfig />
          </LoadingWrapper>
        ),
      },
      {
        path: 'analytics',
        element: (
          <LoadingWrapper>
            <AdminAnalytics />
          </LoadingWrapper>
        ),
      },
    ],
  },
]);
