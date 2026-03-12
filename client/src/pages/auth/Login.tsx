import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, Form, Input, Button, Typography, Space, Checkbox, message, Divider } from 'antd';
import { UserOutlined, LockOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import { AxiosError } from 'axios';
import { useAuthStore } from '@/store/authStore';
import apiClient from '@/services/apiClient';
import GoogleLoginButton from '@/components/auth/GoogleLoginButton';
import './Login.css';

const { Title, Text, Link } = Typography;

interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    email: string;
    username: string;
    avatar?: string;
    roles?: string[];
    isSeller?: boolean;
  };
}

interface ApiResponse<T> {
  success: boolean;
  data: T;
  timestamp: string;
}

export default function Login() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const { setTokens, setUser } = useAuthStore();

  const handleLogin = async (values: { email: string; password: string }) => {
    setLoading(true);
    
    try {
      // 调用真实 API
      const response = await apiClient.post<ApiResponse<LoginResponse> | LoginResponse>('/auth/login', {
        email: values.email,
        password: values.password,
      });
      
      // 兼容两种响应格式
      const responseData = 'data' in response.data ? response.data.data : response.data;
      const { accessToken, refreshToken, user } = responseData;
      
      // 存储 tokens 和用户信息
      setTokens({ accessToken, refreshToken });
      setUser({
        id: user.id,
        email: user.email,
        username: user.username,
        avatar: user.avatar,
        roles: user.roles || [],
      });
      
      message.success(t('auth.loginSuccess'));
      
      // 根据用户角色跳转（后端无 roles 字段，通过 isSeller 和邮箱判断角色）
      if (user.email === 'admin@topivra.com' || (user as any).isAdmin) {
        navigate('/admin');
      } else if (user.isSeller) {
        navigate('/seller');
      } else {
        navigate('/user');
      }
    } catch (error) {
      const axiosError = error as AxiosError<{ message: string }>;
      const errorMsg = axiosError.response?.data?.message || t('auth.loginFailed');
      message.error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <Card className="login-card">
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          <div className="login-header">
            <Title level={2} className="login-title">
              TopiVra
            </Title>
            <Text type="secondary" className="login-subtitle">{t('auth.loginTitle')}</Text>
          </div>

          <Form
            name="login"
            onFinish={handleLogin}
            autoComplete="off"
            size="large"
          >
            <Form.Item
              name="email"
              rules={[
                { required: true, message: t('auth.emailRequired') },
                { type: 'email', message: t('auth.emailInvalid') },
              ]}
            >
              <Input prefix={<UserOutlined />} placeholder={t('auth.email')} />
            </Form.Item>

            <Form.Item
              name="password"
              rules={[{ required: true, message: t('auth.passwordRequired') }]}
            >
              <Input.Password prefix={<LockOutlined />} placeholder={t('auth.password')} />
            </Form.Item>

            <Form.Item>
              <div className="login-form-footer">
                <Checkbox>{t('auth.rememberMe')}</Checkbox>
                <a href="/auth/forgot-password">{t('auth.forgotPassword')}</a>
              </div>
            </Form.Item>

            <Form.Item>
              <Button type="primary" htmlType="submit" block loading={loading}>
                {t('header.login')}
              </Button>
            </Form.Item>

            <Divider plain>{t('auth.orLoginWith') || '或使用以下方式登录'}</Divider>

            <Form.Item>
              <GoogleLoginButton text={t('auth.signInWithGoogle')} />
            </Form.Item>

            <div className="login-footer">
              <Text type="secondary">
                {t('auth.noAccount')}{' '}
                <Link onClick={() => navigate('/auth/register')}>{t('auth.signUp')}</Link>
              </Text>
            </div>
          </Form>
        </Space>
      </Card>
    </div>
  );
}