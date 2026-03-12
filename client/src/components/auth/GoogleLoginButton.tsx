import { Button } from 'antd';
import { GoogleOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';

interface GoogleLoginButtonProps {
  text?: string;
  block?: boolean;
}

export default function GoogleLoginButton({ 
  text,
  block = true 
}: GoogleLoginButtonProps) {
  const { t } = useTranslation();
  const handleGoogleLogin = () => {
    const apiUrl = import.meta.env.VITE_API_BASE_URL || '/api/v1';
    window.location.href = `${apiUrl}/auth/google`;
  };

  return (
    <Button
      block={block}
      size="large"
      icon={<GoogleOutlined />}
      onClick={handleGoogleLogin}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {text || t('auth.signInWithGoogle', '使用 Google 登录')}
    </Button>
  );
}



