import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Spin, message } from 'antd';
import { useAuthStore } from '../../store/authStore';

export default function OAuthCallback() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { setTokens, setUser } = useAuthStore();

  useEffect(() => {
    const token = searchParams.get('token');
    const refreshToken = searchParams.get('refreshToken');
    const error = searchParams.get('error');

    if (error) {
      message.error('登录失败: ' + error);
      navigate('/auth/login');
      return;
    }

    if (token && refreshToken) {
      // 保存 token
      setTokens({ accessToken: token, refreshToken });
      
      // 获取用户信息
      fetch(`${import.meta.env.VITE_API_BASE_URL || '/api/v1'}/auth/me`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      })
        .then(res => res.json())
        .then(data => {
          if (data.id) {
            setUser(data);
            message.success('登录成功');
            navigate('/');
          } else {
            throw new Error('获取用户信息失败');
          }
        })
        .catch(err => {
          console.error('获取用户信息失败:', err);
          message.error('登录失败，请重试');
          navigate('/auth/login');
        });
    } else {
      message.error('登录失败，缺少必要参数');
      navigate('/auth/login');
    }
  }, [searchParams, navigate, setTokens, setUser]);

  return (
    <div style={{ 
      display: 'flex', 
      justifyContent: 'center', 
      alignItems: 'center', 
      height: '100vh' 
    }}>
      <Spin size="large" tip="正在登录..." />
    </div>
  );
}



