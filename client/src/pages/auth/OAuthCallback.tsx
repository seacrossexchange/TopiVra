import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Spin, message } from 'antd';
import { useAuthStore } from '../../store/authStore';

function getRedirectPath() {
  const currentUser = useAuthStore.getState().user;
  const roles = (currentUser?.roles || []).map((role) => role.toUpperCase());
  const isAdmin = currentUser?.email === 'admin@topivra.com' || roles.includes('ADMIN');
  const isSeller = currentUser?.isSeller || roles.includes('SELLER');

  if (isAdmin) {
    return '/admin';
  }

  if (isSeller) {
    return '/seller';
  }

  return '/user/profile';
}

export default function OAuthCallback() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { setTokens, fetchUser, logout } = useAuthStore();

  useEffect(() => {
    const token = searchParams.get('token');
    const refreshToken = searchParams.get('refreshToken');
    const error = searchParams.get('error');

    if (error) {
      message.error('登录失败: ' + error);
      navigate('/login', { replace: true });
      return;
    }

    if (!token || !refreshToken) {
      message.error('登录失败，缺少必要参数');
      navigate('/login', { replace: true });
      return;
    }

    setTokens({ accessToken: token, refreshToken });

    void fetchUser()
      .then(() => {
        const currentUser = useAuthStore.getState().user;
        if (!currentUser?.id) {
          throw new Error('获取用户信息失败');
        }

        message.success('登录成功');
        navigate(getRedirectPath(), { replace: true });
      })
      .catch((err) => {
        if (import.meta.env.DEV) {
          console.error('获取用户信息失败:', err);
        }
        void logout();
        message.error('登录失败，请重试');
        navigate('/login', { replace: true });
      });
  }, [searchParams, navigate, setTokens, fetchUser, logout]);

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
      <Spin size="large" tip="正在登录..." />
    </div>
  );
}



