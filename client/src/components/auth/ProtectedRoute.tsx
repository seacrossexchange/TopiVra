import { Navigate, useLocation, Outlet } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import PageLoading from '@/components/common/PageLoading';

interface ProtectedRouteProps {
  children?: React.ReactNode;
  requiredRole?: 'admin' | 'seller' | 'user';
}

export default function ProtectedRoute({ children, requiredRole }: Readonly<ProtectedRouteProps>) {
  const location = useLocation();
  const { isAuthenticated, user, isLoading, accessToken, hasHydrated, isBootstrapping } = useAuthStore();

  // Wait for persisted auth state and bootstrap before guarding routes
  if (!hasHydrated || isLoading || isBootstrapping) {
    return <PageLoading />;
  }

  // Not authenticated - redirect to login
  if (!isAuthenticated || !user || !accessToken) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Check role-based access
  if (requiredRole) {
    // 从用户对象获取角色列表
    const userRoles = user.roles || [];
    const isSeller = user.isSeller || false;

    // 检查是否有 ADMIN 角色
    const isAdmin = userRoles.includes('ADMIN');

    // Admin has access to everything
    if (isAdmin) {
      return <>{children || <Outlet />}</>;
    }

    // Check specific role requirements
    if (requiredRole === 'admin' && !isAdmin) {
      return <Navigate to="/" replace />;
    }

    // 检查卖家权限：需要有 SELLER 角色或 isSeller 为 true
    if (requiredRole === 'seller') {
      const hasSellerAccess = userRoles.includes('SELLER') || isSeller;
      if (!hasSellerAccess) {
        return <Navigate to="/" replace />;
      }
    }

    // 普通用户权限（所有登录用户都有）
    if (requiredRole === 'user') {
      // 已登录即可访问
      return <>{children || <Outlet />}</>;
    }
  }

  return <>{children || <Outlet />}</>;
}
