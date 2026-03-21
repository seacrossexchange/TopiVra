import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, Avatar, Rate, Space, Typography, Tag, Tooltip, Skeleton } from 'antd';
import {
  UserOutlined,
  CheckCircleOutlined,
  StarFilled,
  ClockCircleOutlined,
  ShoppingOutlined,
  SafetyCertificateOutlined,
} from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import sellersService, { type PublicSellerInfo } from '@/services/sellers';
import './SellerInfoCard.css';

const { Text, Paragraph } = Typography;

interface SellerInfoCardProps {
  sellerId?: number | string;
  sellerName?: string;
  showContactButton?: boolean;
  compact?: boolean;
}

// Level badge configuration
const levelConfig = {
  NORMAL: { color: 'default', icon: null, label: 'Normal' },
  VERIFIED: { color: 'blue', icon: <CheckCircleOutlined />, label: 'Verified' },
  PREMIUM: { color: 'gold', icon: <StarFilled />, label: 'Premium' },
};

export function SellerInfoCard({
  sellerId,
  sellerName,
  showContactButton = true,
  compact = false,
}: SellerInfoCardProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [sellerInfo, setSellerInfo] = useState<PublicSellerInfo | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (sellerId) {
      fetchSellerInfo();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sellerId]);

  const fetchSellerInfo = async () => {
    if (!sellerId) return;
    
    setLoading(true);
    try {
      const info = await sellersService.getPublicSellerInfo(sellerId);
      setSellerInfo(info);
    } catch (error) {
      // 获取卖家信息失败，使用降级数据
      if (import.meta.env.DEV) {
        console.error('Failed to fetch seller info:', error);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleContact = () => {
    navigate('/buyer/tickets');
  };

  // Calculate member duration
  const getMemberDuration = (since: string) => {
    const now = new Date();
    const joined = new Date(since);
    const months = Math.floor((now.getTime() - joined.getTime()) / (1000 * 60 * 60 * 24 * 30));
    if (months < 1) return t('seller.credit.lessThanMonth');
    if (months < 12) return t('seller.credit.months', { count: months });
    const years = Math.floor(months / 12);
    return t('seller.credit.years', { count: years });
  };

  // Format delivery time
  const formatDeliveryTime = (hours: number) => {
    if (hours < 1) return t('seller.credit.withinHour');
    if (hours < 24) return t('seller.credit.hours', { count: Math.round(hours) });
    return t('seller.credit.days', { count: Math.round(hours / 24) });
  };

  // Loading state
  if (loading) {
    return (
      <Card size="small" className="seller-info-card">
        <Skeleton avatar={{ size: 48 }} active paragraph={{ rows: 2 }} />
      </Card>
    );
  }

  // Use sellerInfo if available, otherwise fallback to basic display
  const displayName = sellerInfo?.shopName || sellerName || t('products.detail.sellerDefault');
  const level = sellerInfo?.level || 'NORMAL';
  const rating = sellerInfo?.rating || 0;
  const totalSales = sellerInfo?.totalSales || 0;
  const positiveRate = sellerInfo?.positiveRate || 0;
  const avgDeliveryTime = sellerInfo?.avgDeliveryTime || 0;
  const memberSince = sellerInfo?.memberSince;
  const productCount = sellerInfo?.productCount || 0;
  const description = sellerInfo?.description;

  const levelInfo = levelConfig[level];

  // Compact version for sidebar
  if (compact) {
    return (
      <Card size="small" className="seller-info-card seller-info-card--compact">
        <div className="seller-info-compact">
          <Avatar size={40} icon={<UserOutlined />} />
          <div className="seller-info-compact__content">
            <div className="seller-info-compact__header">
              <Text strong className="seller-info-compact__name">
                {displayName}
              </Text>
              {level !== 'NORMAL' && (
                <Tag color={levelInfo.color} className="seller-info-compact__badge">
                  {levelInfo.icon}
                  {t(`seller.level.${level.toLowerCase()}`)}
                </Tag>
              )}
            </div>
            <div className="seller-info-compact__stats">
              <StarFilled className="seller-info-compact__star" />
              <span>{rating.toFixed(1)}</span>
              <span className="seller-info-compact__divider">|</span>
              <ShoppingOutlined />
              <span>{totalSales}</span>
            </div>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card size="small" className="seller-info-card" title={t('products.detail.seller')}>
      <div className="seller-info">
        {/* Header: Avatar + Name + Level */}
        <div className="seller-info__header">
          <Avatar size={56} icon={<UserOutlined />} className="seller-info__avatar" />
          <div className="seller-info__identity">
            <div className="seller-info__name-row">
              <Text strong className="seller-info__name">
                {displayName}
              </Text>
              {level !== 'NORMAL' && (
                <Tooltip title={t(`seller.level.${level.toLowerCase()}Desc`)}>
                  <Tag color={levelInfo.color} className="seller-info__level-badge">
                    {levelInfo.icon}
                    {t(`seller.level.${level.toLowerCase()}`)}
                  </Tag>
                </Tooltip>
              )}
            </div>
            {description && (
              <Paragraph
                type="secondary"
                className="seller-info__description"
                ellipsis={{ rows: 1 }}
              >
                {description}
              </Paragraph>
            )}
          </div>
        </div>

        {/* Stats Grid */}
        <div className="seller-info__stats">
          {/* Rating */}
          <div className="seller-info__stat">
            <div className="seller-info__stat-label">
              <StarFilled className="seller-info__stat-icon" />
              <Text type="secondary">{t('seller.credit.rating')}</Text>
            </div>
            <div className="seller-info__stat-value">
              <Rate disabled defaultValue={rating} allowHalf className="seller-info__rating" />
              <Text strong className="seller-info__rating-num">{rating.toFixed(1)}</Text>
            </div>
          </div>

          {/* Sales */}
          <div className="seller-info__stat">
            <div className="seller-info__stat-label">
              <ShoppingOutlined className="seller-info__stat-icon" />
              <Text type="secondary">{t('seller.credit.sales')}</Text>
            </div>
            <Text strong className="seller-info__stat-value">
              {totalSales.toLocaleString()}
            </Text>
          </div>

          {/* Positive Rate */}
          <div className="seller-info__stat">
            <div className="seller-info__stat-label">
              <SafetyCertificateOutlined className="seller-info__stat-icon" />
              <Text type="secondary">{t('seller.credit.positiveRate')}</Text>
            </div>
            <Text strong className="seller-info__stat-value seller-info__stat-value--success">
              {positiveRate > 0 ? `${positiveRate.toFixed(1)}%` : '-'}
            </Text>
          </div>

          {/* Delivery Time */}
          <div className="seller-info__stat">
            <div className="seller-info__stat-label">
              <ClockCircleOutlined className="seller-info__stat-icon" />
              <Text type="secondary">{t('seller.credit.avgDelivery')}</Text>
            </div>
            <Text className="seller-info__stat-value">
              {avgDeliveryTime > 0 ? formatDeliveryTime(avgDeliveryTime) : '-'}
            </Text>
          </div>

          {/* Member Since */}
          {memberSince && (
            <div className="seller-info__stat">
              <div className="seller-info__stat-label">
                <UserOutlined className="seller-info__stat-icon" />
                <Text type="secondary">{t('seller.credit.memberSince')}</Text>
              </div>
              <Text className="seller-info__stat-value">
                {getMemberDuration(memberSince)}
              </Text>
            </div>
          )}

          {/* Product Count */}
          <div className="seller-info__stat">
            <div className="seller-info__stat-label">
              <ShoppingOutlined className="seller-info__stat-icon" />
              <Text type="secondary">{t('seller.credit.products')}</Text>
            </div>
            <Text className="seller-info__stat-value">
              {productCount}
            </Text>
          </div>
        </div>

        {/* Contact Button */}
        {showContactButton && (
          <div className="seller-info__actions">
            <Space>
              <button className="seller-info__contact-btn" onClick={handleContact}>
                {t('products.detail.contactSeller')}
              </button>
            </Space>
          </div>
        )}
      </div>
    </Card>
  );
}

export default SellerInfoCard;