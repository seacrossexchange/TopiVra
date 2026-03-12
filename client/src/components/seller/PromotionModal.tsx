import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Modal, Form, InputNumber, DatePicker, Select, Divider,
  Typography, Space, Tag, message, Alert
} from 'antd';
import { GiftOutlined, PercentageOutlined, DollarOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';

const { Text } = Typography;
const { RangePicker } = DatePicker;

interface PromotionModalProps {
  open: boolean;
  onClose: () => void;
  productTitle: string;
  currentPrice: number;
  onApply: (data: PromotionData) => Promise<void>;
}

interface PromotionData {
  type: 'PERCENTAGE' | 'FIXED' | 'FLASH_SALE';
  discountValue: number;
  startDate: string;
  endDate: string;
  flashSaleEndTime?: string;
  quantity?: number;
}

export default function PromotionModal({
  open,
  onClose,
  productTitle,
  currentPrice,
  onApply,
}: PromotionModalProps) {
  const { t } = useTranslation();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [promotionType, setPromotionType] = useState<'PERCENTAGE' | 'FIXED' | 'FLASH_SALE'>('PERCENTAGE');
  const [discountValue, setDiscountValue] = useState(10);
  const [previewPrice, setPreviewPrice] = useState(currentPrice);

  useEffect(() => {
    // Calculate preview price
    let newPrice = currentPrice;
    if (promotionType === 'PERCENTAGE') {
      newPrice = currentPrice * (1 - discountValue / 100);
    } else if (promotionType === 'FIXED') {
      newPrice = Math.max(0, currentPrice - discountValue);
    } else if (promotionType === 'FLASH_SALE') {
      newPrice = currentPrice * (1 - discountValue / 100);
    }
    setPreviewPrice(newPrice);
  }, [promotionType, discountValue, currentPrice]);

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      setLoading(true);
      await onApply({
        type: promotionType,
        discountValue: values.discountValue,
        startDate: values.dateRange[0].toISOString(),
        endDate: values.dateRange[1].toISOString(),
        flashSaleEndTime: promotionType === 'FLASH_SALE' ? values.flashSaleEndTime?.toISOString() : undefined,
        quantity: promotionType === 'FLASH_SALE' ? values.quantity : undefined,
      });
      message.success(t('seller.promotion.applied'));
      onClose();
    } catch {
      message.error(t('common.error'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      title={
        <Space>
          <GiftOutlined style={{ color: 'var(--color-primary)' }} />
          {t('seller.promotion.title')} - {productTitle}
        </Space>
      }
      open={open}
      onCancel={onClose}
      onOk={handleSubmit}
      okText={t('seller.promotion.apply')}
      confirmLoading={loading}
      width={520}
      className="promotion-modal"
    >
      <Alert
        message={t('seller.promotion.info')}
        type="info"
        showIcon
        style={{ marginBottom: 16 }}
      />

      <Form form={form} layout="vertical">
        <Form.Item label={t('seller.promotion.type')} required>
          <Select
            value={promotionType}
            onChange={(v) => setPromotionType(v)}
            options={[
              { 
                value: 'PERCENTAGE', 
                label: (
                  <Space>
                    <PercentageOutlined />
                    {t('seller.promotion.types.percentage')}
                  </Space>
                )
              },
              { 
                value: 'FIXED', 
                label: (
                  <Space>
                    <DollarOutlined />
                    {t('seller.promotion.types.fixed')}
                  </Space>
                )
              },
              { 
                value: 'FLASH_SALE', 
                label: (
                  <Space>
                    <GiftOutlined />
                    {t('seller.promotion.types.flashSale')}
                  </Space>
                )
              },
            ]}
          />
        </Form.Item>

        <Form.Item
          name="discountValue"
          label={promotionType === 'PERCENTAGE' 
            ? t('seller.promotion.discountPercent') 
            : t('seller.promotion.discountAmount')}
          rules={[{ required: true }]}
        >
          <InputNumber
            min={promotionType === 'PERCENTAGE' ? 1 : 0.01}
            max={promotionType === 'PERCENTAGE' ? 99 : currentPrice - 0.01}
            step={promotionType === 'PERCENTAGE' ? 1 : 0.1}
            value={discountValue}
            onChange={(v) => setDiscountValue(v || 0)}
            style={{ width: '100%' }}
            addonAfter={promotionType === 'PERCENTAGE' ? '%' : '$'}
          />
        </Form.Item>

        <Form.Item
          name="dateRange"
          label={t('seller.promotion.dateRange')}
          rules={[{ required: true }]}
        >
          <RangePicker
            showTime
            style={{ width: '100%' }}
            disabledDate={(current) => current && current < dayjs().startOf('day')}
          />
        </Form.Item>

        {promotionType === 'FLASH_SALE' && (
          <>
            <Divider>{t('seller.promotion.flashSaleSettings')}</Divider>
            
            <Form.Item
              name="flashSaleEndTime"
              label={t('seller.promotion.flashSaleEndTime')}
              rules={[{ required: true }]}
            >
              <DatePicker
                showTime
                style={{ width: '100%' }}
                format="YYYY-MM-DD HH:mm"
              />
            </Form.Item>

            <Form.Item
              name="quantity"
              label={t('seller.promotion.quantity')}
              rules={[{ required: true }]}
            >
              <InputNumber min={1} style={{ width: '100%' }} />
            </Form.Item>
          </>
        )}

        <Divider>{t('seller.promotion.preview')}</Divider>

        <div className="promotion-preview">
          <Space direction="vertical" style={{ width: '100%' }}>
            <div className="flex justify-between">
              <Text type="secondary">{t('product.originalPrice')}</Text>
              <Text delete>${currentPrice.toFixed(2)}</Text>
            </div>
            <div className="flex justify-between">
              <Text type="secondary">{t('product.salePrice')}</Text>
              <Text strong style={{ color: 'var(--color-primary)', fontSize: 18 }}>
                ${previewPrice.toFixed(2)}
              </Text>
            </div>
            <div className="flex justify-between">
              <Text type="secondary">{t('seller.promotion.youSave')}</Text>
              <Tag color="green">
                ${(currentPrice - previewPrice).toFixed(2)} 
                {promotionType === 'PERCENTAGE' && ` (${discountValue}%)`}
              </Tag>
            </div>
          </Space>
        </div>
      </Form>
    </Modal>
  );
}