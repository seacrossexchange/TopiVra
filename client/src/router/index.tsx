/**
 * 国际化路由配置
 * 支持 URL 路径国际化，如：/zh-CN/products, /en/products
 */
import { lazy, Suspense, useEffect } from 'react';
import { createBrowserRouter, useParams, Outlet } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import MainLayout from '@/components/layout/MainLayout';
import SellerLayout from '@/components/layout/SellerLayout';
import AdminLayout from '@/components/layout/AdminLayout';
import PageLoading from '@/components/common/PageLoading';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import { applyTextDirection } from '@/utils/rtl';

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
const SellerInventory = lazy(() => import('../pages/seller/Inventory'));
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

// 支持的语言列表
const SUPPORTED_LANGUAGES = ['zh-CN', 'en', 'id', 'pt-BR', 'es-MX'];

/**
 * 语言路由包装器
 * 从 URL 中提取语言参数并应用到 i18n
 */
function LanguageWrapper() {
  const { lang } = useParams<{ lang?: string }>();
  const { i18n } = useTranslation();

  useEffect(() => {
    if (lang && SUPPORTED_LANGUAGES.includes(lang)) {
      if (i18n.language !== lang) {
        i18n.changeLanguage(lang);
        applyTextDirection(lang);
      }
    }
  }, [lang, i18n]);

  return <Outlet />;
}

// 创建路由配置
const createRoutes = (langPrefix: string = '') => {
  const prefix = langPrefix ? `/${langPrefix}` : '';
  
  return [
    // 主布局路由
    {
      path: prefix || '/',
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
          path: `${prefix}/products`,
          element: (
            <LoadingWrapper>
              <ProductList />
            </LoadingWrapper>
          ),
        },
        {
          path: `${prefix}/products/:id`,
          element: (
            <LoadingWrapper>
              <ProductDetail />
            </LoadingWrapper>
          ),
        },
        {
          path: `${prefix}/cart`,
          element: (
            <LoadingWrapper>
              <Cart />
            </LoadingWrapper>
          ),
        },
        {
          path: `${prefix}/checkout`,
          element: (
            <ProtectedRoute>
              <LoadingWrapper>
                <Checkout />
              </LoadingWrapper>
            </ProtectedRoute>
          ),
        },
        {
          path: `${prefix}/about`,
          element: (
            <LoadingWrapper>
              <About />
            </LoadingWrapper>
          ),
        },
        {
          path: `${prefix}/contact`,
          element: (
            <LoadingWrapper>
              <Contact />
            </LoadingWrapper>
          ),
        },
        {
          path: `${prefix}/tutorials`,
          element: (
            <LoadingWrapper>
              <BlogList />
            </LoadingWrapper>
          ),
        },
        {
          path: `${prefix}/apply-seller`,
          element: (
            <LoadingWrapper>
              <ApplySeller />
            </LoadingWrapper>
          ),
        },
        {
          path: `${prefix}/terms`,
          element: (
            <LoadingWrapper>
              <Terms />
            </LoadingWrapper>
          ),
        },
        {
          path: `${prefix}/privacy`,
          element: (
            <LoadingWrapper>
              <Privacy />
            </LoadingWrapper>
          ),
        },
        {
          path: `${prefix}/refund`,
          element: (
            <LoadingWrapper>
              <Refund />
            </LoadingWrapper>
          ),
        },
        {
          path: `${prefix}/blog`,
          element: (
            <LoadingWrapper>
              <BlogList />
            </LoadingWrapper>
          ),
        },
        {
          path: `${prefix}/blog/:slug`,
          element: (
            <LoadingWrapper>
              <BlogDetail />
            </LoadingWrapper>
          ),
        },
        {
          path: `${prefix}/tools`,
          element: (
            <LoadingWrapper>
              <Tools />
            </LoadingWrapper>
          ),
        },
        {
          path: `${prefix}/tools/2fa-generator`,
          element: (
            <LoadingWrapper>
              <TwoFaGenerator />
            </LoadingWrapper>
          ),
        },
        {
          path: `${prefix}/user/profile`,
          element: (
            <ProtectedRoute>
              <LoadingWrapper>
                <UserProfile />
              </LoadingWrapper>
            </ProtectedRoute>
          ),
        },
        {
          path: `${prefix}/user/orders`,
          element: (
            <ProtectedRoute>
              <LoadingWrapper>
                <UserOrders />
              </LoadingWrapper>
            </ProtectedRoute>
          ),
        },
        {
          path: `${prefix}/user/orders/:id`,
          element: (
            <ProtectedRoute>
              <LoadingWrapper>
                <UserOrderDetail />
              </LoadingWrapper>
            </ProtectedRoute>
          ),
        },
        {
          path: `${prefix}/user/favorites`,
          element: (
            <ProtectedRoute>
              <LoadingWrapper>
                <UserFavorites />
              </LoadingWrapper>
            </ProtectedRoute>
          ),
        },
        {
          path: `${prefix}/user/tickets`,
          element: (
            <ProtectedRoute>
              <LoadingWrapper>
                <UserTickets />
              </LoadingWrapper>
            </ProtectedRoute>
          ),
        },
        {
          path: `${prefix}/user/messages`,
          element: (
            <ProtectedRoute>
              <LoadingWrapper>
                <UserMessages />
              </LoadingWrapper>
            </ProtectedRoute>
          ),
        },
      ],
    },
  ];
};

export const router = createBrowserRouter([
  // 语言前缀路由
  {
    path: '/:lang(zh-CN|en|id|pt-BR|es-MX)',
    element: <LanguageWrapper />,
    children: [
      ...createRoutes(':lang'),
      // 认证路由（无布局）
      {
        path: ':lang/auth',
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
        path: ':lang/seller',
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
            path: 'inventory',
            element: (
              <LoadingWrapper>
                <SellerInventory />
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
        path: ':lang/admin',
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
    ],
  },
  // 无语言前缀的默认路由（向后兼容）
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
    path: `${prefix}/auth`,
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
    path: `${prefix}/seller`,
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
        path: 'inventory',
        element: (
          <LoadingWrapper>
            <SellerInventory />
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
    path: `${prefix}/admin`,
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
];
};

// 默认路由（无语言前缀，向后兼容）
export const router = createBrowserRouter([
  // 带语言前缀的路由
  {
    path: '/:lang(zh-CN|en|id|pt-BR|es-MX)',
    element: <LanguageWrapper />,
    children: createRoutes(':lang').flat(),
  },
  // 无语言前缀的路由（默认）
  ...createRoutes(),
]);
