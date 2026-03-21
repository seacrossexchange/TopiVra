import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, Form, Input, Button, Typography, Space, Checkbox, message, Divider } from 'antd';
import { UserOutlined, LockOutlined, MailOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import { extractApiErrorMessage } from '@/utils/errorHandler';
import apiClient from '@/services/apiClient';
import PasswordStrengthIndicator from '@/components/auth/PasswordStrengthIndicator';
import GoogleLoginButton from '@/components/auth/GoogleLoginButton';
import './Login.css'; // 复用 Login 样式

const { Title, Text, Link } = Typography;

interface RegisterResponse {
  id: string;
  email: string;
  username: string;
}

export default function Register() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [password, setPassword] = useState('');

  const handleRegister = async (values: { username: string; email: string; password: string }) => {
    setLoading(true);
    
    try {
      const response = await apiClient.post<RegisterResponse>('/auth/register', {
        username: values.username,
        email: values.email,
        password: values.password,
      });
      
      // 检查是否需要邮箱验证
      if ((response.data as any).requiresVerification) {
        message.success(t('auth.registerSuccess') + ' ' + t('auth.pleaseVerifyEmail', '请查收验证邮件'));
        navigate('/login');
        return;
      }
      
      message.success(t('auth.registerSuccess'));
      navigate('/login');
    } catch (error) {
      message.error(extractApiErrorMessage(error, t('auth.registerFailed')));
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
            <Text type="secondary" className="login-subtitle">{t('auth.createAccount')}</Text>
          </div>

          <Form
            name="register"
            onFinish={handleRegister}
            autoComplete="off"
            size="large"
          >
            <Form.Item
              name="username"
              rules={[
                { required: true, message: t('auth.usernameRequired') },
                { min: 3, message: t('auth.usernameMinLength') },
              ]}
            >
              <Input prefix={<UserOutlined />} placeholder={t('auth.username')} />
            </Form.Item>

            <Form.Item
              name="email"
              rules={[
                { required: true, message: t('auth.emailRequired') },
                { type: 'email', message: t('auth.emailInvalid') },
              ]}
            >
              <Input prefix={<MailOutlined />} placeholder={t('auth.email')} />
            </Form.Item>

            <Form.Item
              name="password"
              rules={[
                { required: true, message: t('auth.passwordRequired') },
                { min: 8, message: t('auth.passwordMinLength') },
                {
                  validator: (_, value) => {
                    if (!value) return Promise.resolve();
                    const hasLower = /[a-z]/.test(value);
                    const hasUpper = /[A-Z]/.test(value);
                    const hasNumber = /[0-9]/.test(value);
                    const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(value);
                    const metCount = [hasLower, hasUpper, hasNumber, hasSpecial].filter(Boolean).length;
                    if (value.length >= 8 && metCount >= 3) {
                      return Promise.resolve();
                    }
                    return Promise.reject(new Error(t('auth.passwordRequirement.insufficient')));
                  },
                },
              ]}
            >
              <Input.Password 
                prefix={<LockOutlined />} 
                placeholder={t('auth.password')}
                onChange={(e) => setPassword(e.target.value)}
              />
              <PasswordStrengthIndicator password={password} />
            </Form.Item>

            <Form.Item
              name="confirmPassword"
              dependencies={['password']}
              rules={[
                { required: true, message: t('auth.confirmPasswordRequired') },
                ({ getFieldValue }) => ({
                  validator(_, value) {
                    if (!value || getFieldValue('password') === value) {
                      return Promise.resolve();
                    }
                    return Promise.reject(new Error(t('auth.passwordMismatch')));
                  },
                }),
              ]}
            >
              <Input.Password prefix={<LockOutlined />} placeholder={t('auth.confirmPassword')} />
            </Form.Item>

            <Form.Item
              name="agreement"
              valuePropName="checked"
              rules={[
                {
                  validator: (_, value) =>
                    value ? Promise.resolve() : Promise.reject(new Error(t('auth.agreementRequired'))),
                },
              ]}
            >
              <Checkbox>
                {t('auth.agreementPrefix')}{' '}
                <a href="/terms" target="_blank" rel="noopener noreferrer">
                  {t('auth.termsOfService')}
                </a>{' '}
                {t('auth.and')}{' '}
                <a href="/privacy" target="_blank" rel="noopener noreferrer">
                  {t('auth.privacyPolicy')}
                </a>
              </Checkbox>
            </Form.Item>

            <Form.Item>
              <Button type="primary" htmlType="submit" block loading={loading}>
                {t('auth.signUp')}
              </Button>
            </Form.Item>

            <Divider plain>{t('auth.orLoginWith') || '或使用以下方式注册'}</Divider>

            <Form.Item>
              <GoogleLoginButton text={t('auth.signUpWithGoogle')} />
            </Form.Item>

            <div className="login-footer">
              <Text type="secondary">
                {t('auth.hasAccount')}{' '}
                <Link onClick={() => navigate('/login')}>{t('auth.loginNow')}</Link>
              </Text>
            </div>
          </Form>
        </Space>
      </Card>
    </div>
  );
}


