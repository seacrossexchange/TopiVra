import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { QRCodeSVG } from 'qrcode.react';
import { Card, Typography, Spin, Button, message, Space, Progress } from 'antd';
import { 
  ReloadOutlined, 
  MessageOutlined,
  QrcodeOutlined 
} from '@ant-design/icons';
import { useMutation, useQuery } from '@tanstack/react-query';
import { apiClient } from '@/services/apiClient';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import { AxiosError } from 'axios';

const { Text, Paragraph } = Typography;

interface QrInitResponse {
  deepLink: string;
  sessionId: string;
  expiresIn: number;
}

interface QrStatusResponse {
  status: 'waiting' | 'scanned' | 'confirmed' | 'expired';
  user?: {
    id: string;
    email: string;
    username: string;
    avatar?: string;
  };
  accessToken?: string;
  refreshToken?: string;
}

export default function TelegramQrLogin() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { setTokens, setUser } = useAuthStore();
  
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [deepLink, setDeepLink] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState<number>(300);
  const [pollingEnabled, setPollingEnabled] = useState(false);

  // 初始化二维码
  const initQrMutation = useMutation({
    mutationFn: async (): Promise<QrInitResponse> => {
      const response = await apiClient.post('/auth/telegram/qr/init');
      return response.data;
    },
    onSuccess: (data) => {
      setSessionId(data.sessionId);
      setDeepLink(data.deepLink);
      setTimeLeft(data.expiresIn || 300);
      setPollingEnabled(true);
    },
    onError: (error: AxiosError<{ message: string }>) => {
      message.error(error?.response?.data?.message || t('error.unknown'));
    },
  });

  // 轮询扫码状态
  const { data: statusData } = useQuery({
    queryKey: ['telegram-qr-status', sessionId],
    queryFn: async (): Promise<QrStatusResponse> => {
      const response = await apiClient.get(`/auth/telegram/qr/status/${sessionId}`);
      return response.data;
    },
    enabled: pollingEnabled && !!sessionId,
    refetchInterval: 2000,
  });

  // 处理状态变化
  useEffect(() => {
    if (!statusData) return;

    if (statusData.status === 'confirmed' && statusData.accessToken && statusData.user) {
      setTokens({
        accessToken: statusData.accessToken,
        refreshToken: statusData.refreshToken || '',
      });
      setUser(statusData.user);
      setPollingEnabled(false);
      message.success(t('auth.loginSuccess'));
      navigate('/');
    } else if (statusData.status === 'expired') {
      setPollingEnabled(false);
      message.warning(t('auth.qrExpired'));
    }
  }, [statusData, setTokens, setUser, navigate, t]);

  // 初始化
  useEffect(() => {
    initQrMutation.mutate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 倒计时
  useEffect(() => {
    if (!pollingEnabled || timeLeft <= 0) return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          setPollingEnabled(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [pollingEnabled, timeLeft]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleRefresh = () => {
    setPollingEnabled(false);
    setSessionId(null);
    setDeepLink(null);
    initQrMutation.mutate();
  };

  if (initQrMutation.isPending && !deepLink) {
    return (
      <Card style={{ textAlign: 'center', padding: 40 }}>
        <Spin size="large" />
        <Paragraph style={{ marginTop: 16 }} type="secondary">
          {t('auth.generatingQr')}
        </Paragraph>
      </Card>
    );
  }

  const isExpired = timeLeft <= 0 || !pollingEnabled;

  return (
    <Card style={{ textAlign: 'center' }}>
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        <div>
          <MessageOutlined style={{ fontSize: 32, color: '#0088cc' }} />
          <Paragraph style={{ marginTop: 8, marginBottom: 0 }} strong>
            {t('auth.telegramScanLogin')}
          </Paragraph>
          <Text type="secondary" style={{ fontSize: 12 }}>
            {t('auth.telegramScanDesc')}
          </Text>
        </div>

        <div
          style={{
            position: 'relative',
            display: 'inline-block',
            padding: 16,
            background: '#fff',
            borderRadius: 8,
          }}
        >
          {isExpired ? (
            <div
              style={{
                width: 200,
                height: 200,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                background: '#f5f5f5',
                borderRadius: 8,
              }}
            >
              <QrcodeOutlined style={{ fontSize: 48, color: '#999' }} />
              <Text type="secondary" style={{ marginTop: 16 }}>
                {t('auth.qrExpired')}
              </Text>
              <Button
                type="primary"
                icon={<ReloadOutlined />}
                onClick={handleRefresh}
                style={{ marginTop: 16 }}
              >
                {t('auth.refreshQr')}
              </Button>
            </div>
          ) : (
            <QRCodeSVG
              value={deepLink || ''}
              size={200}
              level="H"
            />
          )}

          {!isExpired && (
            <div
              style={{
                position: 'absolute',
                top: 8,
                right: 8,
                background: timeLeft < 60 ? '#ff4d4f' : '#1890ff',
                color: '#fff',
                padding: '4px 8px',
                borderRadius: 4,
                fontSize: 12,
              }}
            >
              {formatTime(timeLeft)}
            </div>
          )}
        </div>

        {!isExpired && (
          <Progress
            percent={(timeLeft / 300) * 100}
            showInfo={false}
            strokeColor={{
              '0%': '#108ee9',
              '100%': '#87d068',
            }}
            trailColor="#f0f0f0"
            size="small"
          />
        )}

        <div style={{ textAlign: 'left' }}>
          <Text type="secondary" style={{ fontSize: 12 }}>
            {t('auth.telegramSteps')}
          </Text>
        </div>

        {!isExpired && (
          <Button
            type="link"
            icon={<ReloadOutlined />}
            onClick={handleRefresh}
          >
            {t('auth.refreshQr')}
          </Button>
        )}
      </Space>
    </Card>
  );
}