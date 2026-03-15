import { createBrowserRouter } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import MainLayout from '@/components/layout/MainLayout';
import AdminLayout from '@/components/layout/AdminLayout';
import SellerLayout from '@/components/layout/SellerLayout';
import PageLoading from '@/components/common/PageLoading';
import ProtectedRoute from '@/components/auth/ProtectedRoute';

// Lazy load pages
const Home = lazy(() => import('@/pages/Home'));
const Login = lazy(() => import('@/pages/auth/Login'));
const Register = lazy(() => import('@/pages/auth/Register'));
const NotFound = lazy(() => import('@/pages/NotFound'));

// Buyer pages
const BuyerTicketList = lazy(() => import('@/pages/buyer/BuyerTicketList'));
const BuyerTicketDetail = lazy(() => import('@/pages/user/BuyerTicketDetail'));

// Seller pages
const SellerTicketList = lazy(() => import('@/pages/seller/SellerTicketList'));
const SellerTicketDetail = lazy(() => import('@/pages/seller/SellerTicketDetail'));

// Admin pages
const AdminDashboard = lazy(() => import('@/pages/admin/Dashboard'));
const AdminTicketList = lazy(() => import('@/pages/admin/AdminTicketList'));
const AdminTicketDetail = lazy(() => import('@/pages/admin/AdminTicketDetail'));

// Wrapper for lazy loaded components
const LazyWrapper = ({ children }: { children: React.ReactNode }) => (
  <Suspense fallback={<PageLoading />}>{children}</Suspense>
);

export const router = createBrowserRouter([
  {
    path: '/',
    element: <MainLayout />,
    children: [
      {
        index: true,
        element: (
          <LazyWrapper>
            <Home />
          </LazyWrapper>
        ),
      },
      {
        path: 'login',
        element: (
          <LazyWrapper>
            <Login />
          </LazyWrapper>
        ),
      },
      {
        path: 'register',
        element: (
          <LazyWrapper>
            <Register />
          </LazyWrapper>
        ),
      },
      // Buyer routes
      {
        path: 'buyer',
        element: <ProtectedRoute />,
        children: [
          {
            path: 'tickets',
            element: (
              <LazyWrapper>
                <BuyerTicketList />
              </LazyWrapper>
            ),
          },
          {
            path: 'tickets/:ticketNo',
            element: (
              <LazyWrapper>
                <BuyerTicketDetail />
              </LazyWrapper>
            ),
          },
        ],
      },
    ],
  },
  // Seller routes
  {
    path: '/seller',
    element: (
      <ProtectedRoute requiredRole="seller">
        <SellerLayout />
      </ProtectedRoute>
    ),
    children: [
      {
        path: 'tickets',
        element: (
          <LazyWrapper>
            <SellerTicketList />
          </LazyWrapper>
        ),
      },
      {
        path: 'tickets/:ticketNo',
        element: (
          <LazyWrapper>
            <SellerTicketDetail />
          </LazyWrapper>
        ),
      },
    ],
  },
  // Admin routes
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
          <LazyWrapper>
            <AdminDashboard />
          </LazyWrapper>
        ),
      },
      {
        path: 'tickets',
        element: (
          <LazyWrapper>
            <AdminTicketList />
          </LazyWrapper>
        ),
      },
      {
        path: 'tickets/:ticketNo',
        element: (
          <LazyWrapper>
            <AdminTicketDetail />
          </LazyWrapper>
        ),
      },
    ],
  },
  // 404
  {
    path: '*',
    element: (
      <LazyWrapper>
        <NotFound />
      </LazyWrapper>
    ),
  },
]);



