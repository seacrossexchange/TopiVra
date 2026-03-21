import { useState, useEffect } from 'react';
import { Card, Row, Col, Typography, Input, Button, Space, message } from 'antd';
import { GiftOutlined, CopyOutlined, CheckCircleOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import apiClient from '@/services/apiClient';
import './ReferralCard.css';

const { Title, Text } = Typography;

interface ReferralStats {
  totalReferrals: number;
  successfulReferrals: number;
  pendingReferrals: number;
  totalRewards: number;
  rewardPerReferral: number;
}

export default function ReferralCard() {
  const { t } = useTranslation();
  const [referralCode, setReferralCode] = useState('');
  const [referralLink, setReferralLink] = useState('');
  const [stats, setStats] = useState<ReferralStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchReferralData();
  }, []);

  const fetchReferralData = async () => {
    try {
      const [codeRes, statsRes] = await Promise.all([
        apiClient.get('/referral/my-code'),
        apiClient.get('/referral/stats'),
      ]);
      setReferralCode(codeRes.data?.code || '');
      setReferralLink(codeRes.data?.link || '');
      setStats(statsRes.data);
    } catch (error) {
      console.error('Failed to fetch referral data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = (text: string, type: string) => {
    navigator.clipboard.writeText(text);
    message.success(t('referral.copied', `${type}已复制`));
  };

  if (loading || !stats) {
    return null;
  }

  return (
    <Card className="referral-card">
      <div style={{ textAlign: 'center', marginBottom: 24 }}>
        <GiftOutlined style={{ fontSize: 48, color: 'var(--color-error)', marginBottom: 12 }} />
        <Title level={4} style={{ margin: 0 }}>
          {t('referral.title', '邀请好友，双方获得 $10')}
        </Title>
        <Text type="secondary">
          {t('referral.desc', '好友首单满 $20，双方各得 $10 奖励')}
        </Text>
      </div>

      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col span={8}>
          <div style={{ textAlign: 'center', padding: 16, background: 'var(--color-bg-secondary)', borderRadius: 8 }}>
            <Text strong style={{ fontSize: 24, color: 'var(--color-primary)', display: 'block' }}>
              {stats.totalReferrals}
            </Text>
            <Text type="secondary" style={{ fontSize: 12 }}>{t('referral.total', '邀请人数')}</Text>
          </div>
        </Col>
        <Col span={8}>
          <div style={{ textAlign: 'center', padding: 16, background: 'var(--color-bg-secondary)', borderRadius: 8 }}>
            <Text strong style={{ fontSize: 24, color: 'var(--color-success)', display: 'block' }}>
              {stats.successfulReferrals}
            </Text>
            <Text type="secondary" style={{ fontSize: 12 }}>{t('referral.successful', '成功邀请')}</Text>
          </div>
        </Col>
        <Col span={8}>
          <div style={{ textAlign: 'center', padding: 16, background: 'var(--color-bg-secondary)', borderRadius: 8 }}>
            <Text strong style={{ fontSize: 24, color: 'var(--color-warning)', display: 'block' }}>
              ${stats.totalRewards}
            </Text>
            <Text type="secondary" style={{ fontSize: 12 }}>{t('referral.earned', '已赚取')}</Text>
          </div>
        </Col>
      </Row>

      <div style={{ marginBottom: 16 }}>
        <Text strong style={{ display: 'block', marginBottom: 8 }}>
          {t('referral.yourCode', '您的邀请码')}
        </Text>
        <Input
          value={referralCode}
          readOnly
          addonAfter={
            <Button
              type="link"
              icon={<CopyOutlined />}
              onClick={() => handleCopy(referralCode, t('referral.code', '邀请码'))}
              style={{ padding: 0 }}
            />
          }
        />
      </div>

      <div>
        <Text strong style={{ display: 'block', marginBottom: 8 }}>
          {t('referral.yourLink', '邀请链接')}
        </Text>
        <Input
          value={referralLink}
          readOnly
          addonAfter={
            <Button
              type="link"
              icon={<CopyOutlined />}
              onClick={() => handleCopy(referralLink, t('referral.link', '链接'))}
              style={{ padding: 0 }}
            />
          }
        />
      </div>

      <div style={{ marginTop: 16, padding: 12, background: 'var(--color-bg-secondary)', borderRadius: 8 }}>
        <Space direction="vertical" size={4} style={{ width: '100%' }}>
          <Space>
            <CheckCircleOutlined style={{ color: 'var(--color-success)' }} />
            <Text style={{ fontSize: 12 }}>{t('referral.rule1', '好友通过您的链接注册')}</Text>
          </Space>
          <Space>
            <CheckCircleOutlined style={{ color: 'var(--color-success)' }} />
            <Text style={{ fontSize: 12 }}>{t('referral.rule2', '好友首单满 $20')}</Text>
          </Space>
          <Space>
            <CheckCircleOutlined style={{ color: 'var(--color-success)' }} />
            <Text style={{ fontSize: 12 }}>{t('referral.rule3', '双方各得 $10 余额奖励')}</Text>
          </Space>
        </Space>
      </div>
    </Card>
  );
}






