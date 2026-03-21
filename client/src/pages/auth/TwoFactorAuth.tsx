import { useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useLocation } from 'react-router-dom';
import { Card, Typography, Input, Button, message, Space, Alert, Divider } from 'antd';
import { CopyOutlined, CheckOutlined, SafetyOutlined } from '@ant-design/icons';
import { QRCodeSVG } from 'qrcode.react';
import { useMutation, useQuery } from '@tanstack/react-query';
import apiClient from '@/services/apiClient';
import { AxiosError } from 'axios';
import { extractApiErrorMessage } from '@/utils/errorHandler';
import type { InputRef } from 'antd';

const { Title, Text, Paragraph } = Typography;

interface TwoFactorSetupResponse {
  secret: string;
  qrCodeUrl: string;
  recoveryCodes: string[];
}

interface TwoFactorVerifyResponse {
  success: boolean;
  message: string;
}

type TwoFactorMode = 'setup' | 'verify' | 'recovery';

export default function TwoFactorAuthPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  // 从路由状态判断初始模式
  const getInitialMode = (): TwoFactorMode => {
    if (location.state?.setup) {
      return 'setup';
    }
    return 'verify';
  };
  
  const [mode, setMode] = useState<TwoFactorMode>(getInitialMode);
  const [code, setCode] = useState('');
  const [recoveryCode, setRecoveryCode] = useState('');
  const [copiedCodes, setCopiedCodes] = useState(false);
  const inputRefs = useRef<(InputRef | null)[]>([]);

  // 获取 2FA 设置信息
  const { data: setupData, isLoading: isLoadingSetup } = useQuery({
    queryKey: ['2fa-setup'],
    queryFn: async (): Promise<TwoFactorSetupResponse> => {
      const response = await apiClient.get('/auth/2fa/setup');
      return response.data;
    },
    enabled: mode === 'setup',
  });

  // 验证 2FA 代码
  const verifyMutation = useMutation({
    mutationFn: async (totpCode: string): Promise<TwoFactorVerifyResponse> => {
      const response = await apiClient.post('/auth/2fa/verify', { code: totpCode });
      return response.data;
    },
    onSuccess: (data) => {
      if (data.success) {
        message.success(t('auth.2faVerified'));
        const from = (location.state as { from?: string })?.from || '/';
        navigate(from, { replace: true });
      }
    },
    onError: (error: AxiosError<{ message: string }>) => {
      message.error(extractApiErrorMessage(error, t('auth.2faInvalid')));
      setCode('');
      inputRefs.current[0]?.focus();
    },
  });

  // 设置 2FA
  const setupMutation = useMutation({
    mutationFn: async (totpCode: string): Promise<TwoFactorVerifyResponse> => {
      const response = await apiClient.post('/auth/2fa/enable', { code: totpCode });
      return response.data;
    },
    onSuccess: (data) => {
      if (data.success) {
        message.success(t('auth.2faEnabled'));
        navigate('/', { replace: true });
      }
    },
    onError: (error: AxiosError<{ message: string }>) => {
      message.error(extractApiErrorMessage(error, t('auth.2faInvalid')));
      setCode('');
    },
  });

  // 使用恢复代码
  const recoveryMutation = useMutation({
    mutationFn: async (code: string): Promise<TwoFactorVerifyResponse> => {
      const response = await apiClient.post('/auth/2fa/recovery', { code });
      return response.data;
    },
    onSuccess: (data) => {
      if (data.success) {
        message.success(t('auth.2faRecoverySuccess'));
        navigate('/', { replace: true });
      }
    },
    onError: (error: AxiosError<{ message: string }>) => {
      message.error(extractApiErrorMessage(error, t('auth.2faRecoveryInvalid')));
      setRecoveryCode('');
    },
  });

  // 处理代码输入
  const handleCodeChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;
    
    const newCode = code.split('');
    newCode[index] = value.slice(-1);
    const updatedCode = newCode.join('');
    setCode(updatedCode);

    // 自动跳转到下一个输入框
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    // 自动提交
    if (updatedCode.length === 6 && /^\d{6}$/.test(updatedCode)) {
      if (mode === 'setup') {
        setupMutation.mutate(updatedCode);
      } else {
        verifyMutation.mutate(updatedCode);
      }
    }
  };

  // 处理粘贴
  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    setCode(pastedData);
    if (pastedData.length === 6) {
      if (mode === 'setup') {
        setupMutation.mutate(pastedData);
      } else {
        verifyMutation.mutate(pastedData);
      }
    }
  };

  // 复制恢复代码
  const copyRecoveryCodes = () => {
    if (setupData?.recoveryCodes) {
      navigator.clipboard.writeText(setupData.recoveryCodes.join('\n'));
      setCopiedCodes(true);
      message.success(t('common.copied'));
    }
  };

  const renderVerifyMode = () => (
    <Space direction="vertical" size="large" style={{ width: '100%' }}>
      <div style={{ textAlign: 'center' }}>
        <SafetyOutlined style={{ fontSize: 48, color: 'var(--color-primary)' }} />
        <Title level={4} style={{ marginTop: 16 }}>{t('auth.2faTitle')}</Title>
        <Text type="secondary">{t('auth.2faDesc')}</Text>
      </div>

      <div style={{ display: 'flex', justifyContent: 'center', gap: 8 }}>
        {[0, 1, 2, 3, 4, 5].map((index) => (
          <Input
            key={index}
            ref={(el) => { inputRefs.current[index] = el; }}
            style={{
              width: 48,
              height: 56,
              textAlign: 'center',
              fontSize: 24,
              fontWeight: 'bold',
            }}
            maxLength={1}
            value={code[index] || ''}
            onChange={(e) => handleCodeChange(index, e.target.value)}
            onPaste={index === 0 ? handlePaste : undefined}
            onKeyDown={(e) => {
              if (e.key === 'Backspace' && !code[index] && index > 0) {
                inputRefs.current[index - 1]?.focus();
              }
            }}
            disabled={verifyMutation.isPending}
          />
        ))}
      </div>

      <Button
        type="primary"
        block
        size="large"
        loading={verifyMutation.isPending}
        onClick={() => verifyMutation.mutate(code)}
        disabled={code.length !== 6}
      >
        {t('auth.verify')}
      </Button>

      <Divider />

      <Button type="link" block onClick={() => setMode('recovery')}>
        {t('auth.useRecoveryCode')}
      </Button>
    </Space>
  );

  const renderSetupMode = () => (
    <Space direction="vertical" size="large" style={{ width: '100%' }}>
      <div style={{ textAlign: 'center' }}>
        <SafetyOutlined style={{ fontSize: 48, color: 'var(--color-success)' }} />
        <Title level={4} style={{ marginTop: 16 }}>{t('auth.2faSetup')}</Title>
        <Text type="secondary">{t('auth.2faSetupDesc')}</Text>
      </div>

      {isLoadingSetup ? (
        <Text>{t('common.loading')}</Text>
      ) : setupData && (
        <>
          <div style={{ textAlign: 'center' }}>
            <QRCodeSVG value={setupData.qrCodeUrl} size={200} level="H" />
            <Paragraph type="secondary" style={{ marginTop: 16, fontSize: 12 }}>
              {t('auth.2faSecret')}: <Text code copyable>{setupData.secret}</Text>
            </Paragraph>
          </div>

          <Alert
            type="warning"
            showIcon
            message={t('auth.2faRecoveryTitle')}
            description={
              <div>
                <Text type="secondary">{t('auth.2faRecoveryDesc')}</Text>
                <div style={{ marginTop: 8 }}>
                  {setupData.recoveryCodes.map((c, i) => (
                    <Text key={i} code style={{ display: 'block', marginBottom: 4 }}>{c}</Text>
                  ))}
                </div>
                <Button
                  size="small"
                  icon={copiedCodes ? <CheckOutlined /> : <CopyOutlined />}
                  onClick={copyRecoveryCodes}
                  style={{ marginTop: 8 }}
                >
                  {copiedCodes ? t('common.copied') : t('common.copy')}
                </Button>
              </div>
            }
          />

          <Divider>{t('auth.2faEnterCode')}</Divider>

          <div style={{ display: 'flex', justifyContent: 'center', gap: 8 }}>
            {[0, 1, 2, 3, 4, 5].map((index) => (
              <Input
                key={index}
                ref={(el) => { inputRefs.current[index] = el; }}
                style={{
                  width: 48,
                  height: 56,
                  textAlign: 'center',
                  fontSize: 24,
                  fontWeight: 'bold',
                }}
                maxLength={1}
                value={code[index] || ''}
                onChange={(e) => handleCodeChange(index, e.target.value)}
                onPaste={index === 0 ? handlePaste : undefined}
                onKeyDown={(e) => {
                  if (e.key === 'Backspace' && !code[index] && index > 0) {
                    inputRefs.current[index - 1]?.focus();
                  }
                }}
                disabled={setupMutation.isPending}
              />
            ))}
          </div>

          <Button
            type="primary"
            block
            size="large"
            loading={setupMutation.isPending}
            onClick={() => setupMutation.mutate(code)}
            disabled={code.length !== 6}
          >
            {t('auth.2faEnable')}
          </Button>
        </>
      )}
    </Space>
  );

  const renderRecoveryMode = () => (
    <Space direction="vertical" size="large" style={{ width: '100%' }}>
      <div style={{ textAlign: 'center' }}>
        <SafetyOutlined style={{ fontSize: 48, color: 'var(--color-warning)' }} />
        <Title level={4} style={{ marginTop: 16 }}>{t('auth.2faRecovery')}</Title>
        <Text type="secondary">{t('auth.2faRecoveryInputDesc')}</Text>
      </div>

      <Input.TextArea
        rows={3}
        placeholder={t('auth.2faRecoveryPlaceholder')}
        value={recoveryCode}
        onChange={(e) => setRecoveryCode(e.target.value.toUpperCase())}
        style={{ fontFamily: 'monospace' }}
        disabled={recoveryMutation.isPending}
      />

      <Button
        type="primary"
        block
        size="large"
        loading={recoveryMutation.isPending}
        onClick={() => recoveryMutation.mutate(recoveryCode)}
        disabled={!recoveryCode.trim()}
      >
        {t('auth.verify')}
      </Button>

      <Button type="link" block onClick={() => setMode('verify')}>
        {t('auth.backTo2fa')}
      </Button>
    </Space>
  );

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'var(--color-bg-primary)',
      padding: 24,
    }}>
      <Card style={{
        width: '100%',
        maxWidth: 400,
        borderRadius: 8,
        background: 'var(--color-bg-elevated)',
        borderColor: 'var(--color-border)',
        boxShadow: 'var(--shadow-md)',
      }}>
        {mode === 'verify' && renderVerifyMode()}
        {mode === 'setup' && renderSetupMode()}
        {mode === 'recovery' && renderRecoveryMode()}
      </Card>
    </div>
  );
}