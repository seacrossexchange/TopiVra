import { useState, useEffect } from 'react';
import { Card, Typography, Input, Button, Tag, Space, message, Divider, Empty } from 'antd';
import { GiftOutlined, CheckCircleOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import apiClient from '@/services/apiClient';
import { extractApiErrorMessage } from '@/utils/errorHandler';

const { Text } = Typography;

export interface Coupon {
  id: string;
  code: string;
  name: string;
  description?: string;
  type: 'PERCENTAGE' | 'FIXED';
  value: number;
  minPurchase?: number;
  maxDiscount?: number;
  endDate?: string;
  usedCount: number;
  usageLimit?: number;
}

interface CouponSelectorProps {
  readonly orderAmount: number;
  readonly onSelect: (coupon: Coupon | null) => void;
  readonly selectedCoupon?: Coupon | null;
}

export default function CouponSelector({ orderAmount, onSelect, selectedCoupon }: CouponSelectorProps) {
  const { t } = useTranslation();
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [inputCode, setInputCode] = useState('');
  const [validating, setValidating] = useState(false);

  useEffect(() => {
    fetchAvailableCoupons();
  }, [orderAmount]);

  const fetchAvailableCoupons = async () => {
    try {
      const response = await apiClient.get(`/coupons/available?amount=${orderAmount}`);
      setCoupons(response.data || []);
    } catch (error) {
      console.error('Failed to fetch coupons:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleApplyCoupon = async () => {
    if (!inputCode.trim()) {
      message.warning(t('coupon.enterCode'));
      return;
    }

    setValidating(true);
    try {
      const response = await apiClient.post('/coupons/validate', {
        code: inputCode.trim(),
        orderAmount,
      });

      if (response.data?.valid) {
        onSelect(response.data.coupon);
        message.success(t('coupon.applied'));
        setInputCode('');
      }
    } catch (error: any) {
      message.error(extractApiErrorMessage(error, t('coupon.invalid')));
    } finally {
      setValidating(false);
    }
  };

  const calculateDiscount = (coupon: Coupon) => {
    if (coupon.type === 'PERCENTAGE') {
      let discount = (orderAmount * coupon.value) / 100;
      if (coupon.maxDiscount && discount > coupon.maxDiscount) {
        discount = coupon.maxDiscount;
      }
      return discount;
    } else {
      return Math.min(coupon.value, orderAmount);
    }
  };

  const formatCouponValue = (coupon: Coupon) => {
    if (coupon.type === 'PERCENTAGE') {
      return `${coupon.value}%`;
    } else {
      return `$${coupon.value}`;
    }
  };

  return (
    <Card title={<Space><GiftOutlined />{t('coupon.title')}</Space>}>
      {/* 输入优惠券码 */}
      <div style={{ marginBottom: 16 }}>
        <Space.Compact style={{ width: '100%' }}>
          <Input
            placeholder={t('coupon.enterCode')}
            value={inputCode}
            onChange={(e) => setInputCode(e.target.value.toUpperCase())}
            onPressEnter={handleApplyCoupon}
          />
          <Button type="primary" onClick={handleApplyCoupon} loading={validating}>
            {t('coupon.apply')}
          </Button>
        </Space.Compact>
      </div>

      <Divider style={{ margin: '16px 0' }} />

      {/* 可用优惠券列表 */}
      <div>
        <Text strong style={{ display: 'block', marginBottom: 12 }}>
          {t('coupon.available')} ({coupons.length})
        </Text>
        
        {loading ? (
          <div style={{ textAlign: 'center', padding: 20 }}>
            <Text type="secondary">{t('common.loading')}</Text>
          </div>
        ) : coupons.length === 0 ? (
          <Empty description={t('coupon.noAvailable')} image={Empty.PRESENTED_IMAGE_SIMPLE} />
        ) : (
          <Space direction="vertical" size="small" style={{ width: '100%' }}>
            {coupons.map((coupon) => {
              const discount = calculateDiscount(coupon);
              const isSelected = selectedCoupon?.id === coupon.id;
              const canUse = !coupon.minPurchase || orderAmount >= coupon.minPurchase;

              return (
                <button
                  key={coupon.id}
                  type="button"
                  disabled={!canUse}
                  style={{
                    width: '100%',
                    padding: 12,
                    border: `2px solid ${isSelected ? 'var(--color-primary)' : 'var(--color-border)'}`,
                    borderRadius: 8,
                    background: isSelected ? 'var(--color-primary-light)' : 'var(--color-bg-card)',
                    cursor: canUse ? 'pointer' : 'not-allowed',
                    opacity: canUse ? 1 : 0.5,
                    transition: 'all 0.2s ease',
                    textAlign: 'left',
                  }}
                  onClick={() => onSelect(isSelected ? null : coupon)}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div style={{ flex: 1 }}>
                      <Space>
                        <Tag color="red" style={{ fontSize: 16, padding: '2px 8px', fontWeight: 600 }}>
                          {formatCouponValue(coupon)}
                        </Tag>
                        <Text strong>{coupon.name}</Text>
                      </Space>
                      {coupon.description && (
                        <Text type="secondary" style={{ display: 'block', fontSize: 12, marginTop: 4 }}>
                          {coupon.description}
                        </Text>
                      )}
                      {coupon.minPurchase && (
                        <Text type="secondary" style={{ display: 'block', fontSize: 11, marginTop: 4 }}>
                          {t('coupon.minPurchase')} ${coupon.minPurchase} {t('coupon.available')}
                        </Text>
                      )}
                      {coupon.endDate && (
                        <Text type="secondary" style={{ display: 'block', fontSize: 11, marginTop: 2 }}>
                          {t('coupon.validUntil')} {new Date(coupon.endDate).toLocaleDateString()}
                        </Text>
                      )}
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      {isSelected ? (
                        <CheckCircleOutlined style={{ fontSize: 24, color: 'var(--color-primary)' }} />
                      ) : (
                        <div>
                          <Text strong style={{ fontSize: 16, color: 'var(--color-error)' }}>
                            -${discount.toFixed(2)}
                          </Text>
                        </div>
                      )}
                    </div>
                  </div>
                </button>
              );
            })}
          </Space>
        )}
      </div>

      {/* 已选择的优惠券 */}
      {selectedCoupon && (
        <div style={{ marginTop: 16, padding: 12, background: 'var(--color-success-light)', borderRadius: 8, border: '1px solid var(--color-success)' }}>
          <Space>
            <CheckCircleOutlined style={{ color: 'var(--color-success)' }} />
            <Text strong style={{ color: 'var(--color-success)' }}>
              {t('coupon.applied')} {selectedCoupon.code}
            </Text>
          </Space>
          <Text style={{ display: 'block', marginTop: 4, fontSize: 12 }}>
            {t('coupon.saved')} ${calculateDiscount(selectedCoupon).toFixed(2)}
          </Text>
        </div>
      )}
    </Card>
  );
}






