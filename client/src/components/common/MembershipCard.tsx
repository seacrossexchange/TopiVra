import { useEffect, useState } from 'react';
import { Card, Progress, Tag, Descriptions } from 'antd';
import { CrownOutlined, GiftOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import apiClient from '../../services/apiClient';
import './MembershipCard.css';

export default function MembershipCard() {
  const { t, i18n } = useTranslation();
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    apiClient.get('/membership/me').then(res => setData(res.data));
  }, []);

  if (!data) return null;

  const tierName = i18n.language === 'en' ? data.currentTier.nameEn : data.currentTier.name;

  return (
    <Card className="membership-card" style={{ borderColor: data.currentTier.color }}>
      <div className="membership-header">
        <CrownOutlined style={{ fontSize: 32, color: data.currentTier.color }} />
        <h2>{tierName}</h2>
        <Tag color={data.currentTier.color}>Lv.{data.currentTier.level}</Tag>
      </div>

      <Descriptions column={2} size="small">
        <Descriptions.Item label={t('membership.totalSpent')}>
          ${data.user.totalSpent}
        </Descriptions.Item>
        <Descriptions.Item label={t('membership.discount')}>
          {data.discount}%
        </Descriptions.Item>
      </Descriptions>

      {data.nextTier && (
        <div className="upgrade-progress">
          <Progress percent={50} status="active" />
          <p>{t('membership.nextLevel')}: {data.nextTier.name}</p>
        </div>
      )}

      <div className="benefits">
        <h4><GiftOutlined /> {t('membership.benefits')}</h4>
        <ul>
          {data.currentTier.benefits.map((b: string, i: number) => (
            <li key={i}>{b}</li>
          ))}
        </ul>
      </div>
    </Card>
  );
}



