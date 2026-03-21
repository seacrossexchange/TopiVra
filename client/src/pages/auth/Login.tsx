import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Card, Form, Input, Button, Typography, Space, Checkbox, message, Divider } from 'antd';
import { UserOutlined, LockOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import { extractApiErrorMessage } from '@/utils/errorHandler';
import { useAuthStore } from '@/store/authStore';
import GoogleLoginButton from '@/components/auth/GoogleLoginButton';
import './Login.css';

const { Title, Text, Link } = Typography;

export default function Login() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const [loading, setLoading] = useState(false);
  const login = useAuthStore((state) => state.login);

  const handleLogin = async (values: { email: string; password: string }) => {
    setLoading(true);

    try {
      const result = await login(values.email, values.password);

      if (result && 'requiresTwoFactor' in result && result.requiresTwoFactor && result.tempToken) {
        navigate('/2fa', {
          replace: true,
          state: {
            tempToken: result.tempToken,
            from: (location.state as { from?: { pathname?: string; search?: string; hash?: string } } | undefined)?.from,
          },
        });
        return;
      }

      message.success(t('auth.loginSuccess'));

      const state = location.state as
        | {
            from?: {
              pathname?: string;
              search?: string;
              hash?: string;
            };
          }
        | undefined;

      const from = state?.from;
      const fromPath = from?.pathname
        ? `${from.pathname}${from.search ?? ''}${from.hash ?? ''}`
        : null;

      if (fromPath && from?.pathname && !['/login', '/register', '/auth/login', '/auth/register'].includes(from.pathname)) {
        navigate(fromPath, { replace: true });
        return;
      }

      const currentUser = useAuthStore.getState().user;
      const roles = (currentUser?.roles || []).map((r) => r.toUpperCase());
      const isAdmin = currentUser?.email === 'admin@topivra.com' || roles.includes('ADMIN');
      const isSeller = currentUser?.isSeller || roles.includes('SELLER');

      if (isAdmin) {
        navigate('/admin', { replace: true });
      } else if (isSeller) {
        navigate('/seller', { replace: true });
      } else {
        navigate('/user/profile', { replace: true });
      }
    } catch (error) {
      message.error(extractApiErrorMessage(error, t('auth.loginFailed')));
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
                <Link onClick={() => navigate('/register')}>{t('auth.signUp')}</Link>
              </Text>
            </div>
          </Form>
        </Space>
      </Card>
    </div>
  );
}