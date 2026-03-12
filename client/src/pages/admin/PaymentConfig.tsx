import { useState, useEffect } from 'react';
import { Card, Form, Input, Button, message, Switch, Tabs, Typography } from 'antd';
import { SaveOutlined, CreditCardOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import apiClient from '@/services/apiClient';

const { Title } = Typography;

export default function PaymentConfig() {
  const { t } = useTranslation();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);

  useEffect(() => {
    fetchConfig();
  }, []);

  const fetchConfig = async () => {
    setFetching(true);
    try {
      const { data } = await apiClient.get('/admin/config/payment');
      form.setFieldsValue(data);
    } catch {
      // 接口可能不存在时使用默认值
    } finally {
      setFetching(false);
    }
  };

  const handleSave = async (values: any) => {
    setLoading(true);
    try {
      await apiClient.put('/admin/config/payment', values);
      message.success(t('common.saveSuccess', '保存成功'));
    } catch {
      message.error(t('common.saveError', '保存失败'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '24px' }}>
      <Title level={4}>
        <CreditCardOutlined style={{ marginRight: 8 }} />
        {t('settings.paymentConfig', '支付配置')}
      </Title>

      <Card
        loading={fetching}
        style={{
          background: 'var(--color-bg-card)',
          border: '1px solid var(--color-border)',
          borderRadius: 14,
        }}
      >
        <Form form={form} layout="vertical" onFinish={handleSave}>
          <Tabs
            items={[
              {
                key: 'paypal',
                label: 'PayPal',
                children: (
                  <>
                    <Form.Item name={['paypal', 'enabled']} label="启用 PayPal" valuePropName="checked">
                      <Switch />
                    </Form.Item>
                    <Form.Item name={['paypal', 'clientId']} label="Client ID">
                      <Input.Password placeholder="PayPal Client ID" style={{ background: 'var(--color-bg-secondary)' }} />
                    </Form.Item>
                    <Form.Item name={['paypal', 'clientSecret']} label="Client Secret">
                      <Input.Password placeholder="PayPal Client Secret" style={{ background: 'var(--color-bg-secondary)' }} />
                    </Form.Item>
                    <Form.Item name={['paypal', 'mode']} label="模式">
                      <Input placeholder="sandbox 或 live" style={{ background: 'var(--color-bg-secondary)' }} />
                    </Form.Item>
                  </>
                ),
              },
              {
                key: 'stripe',
                label: 'Stripe',
                children: (
                  <>
                    <Form.Item name={['stripe', 'enabled']} label="启用 Stripe" valuePropName="checked">
                      <Switch />
                    </Form.Item>
                    <Form.Item name={['stripe', 'publishableKey']} label="Publishable Key">
                      <Input placeholder="pk_test_..." style={{ background: 'var(--color-bg-secondary)' }} />
                    </Form.Item>
                    <Form.Item name={['stripe', 'secretKey']} label="Secret Key">
                      <Input.Password placeholder="sk_test_..." style={{ background: 'var(--color-bg-secondary)' }} />
                    </Form.Item>
                    <Form.Item name={['stripe', 'webhookSecret']} label="Webhook Secret">
                      <Input.Password placeholder="whsec_..." style={{ background: 'var(--color-bg-secondary)' }} />
                    </Form.Item>
                  </>
                ),
              },
              {
                key: 'usdt',
                label: 'USDT',
                children: (
                  <>
                    <Form.Item name={['usdt', 'enabled']} label="启用 USDT" valuePropName="checked">
                      <Switch />
                    </Form.Item>
                    <Form.Item name={['usdt', 'walletAddress']} label="钱包地址">
                      <Input placeholder="TRC20/ERC20 地址" style={{ background: 'var(--color-bg-secondary)' }} />
                    </Form.Item>
                    <Form.Item name={['usdt', 'network']} label="网络类型">
                      <Input placeholder="TRC20, ERC20 等" style={{ background: 'var(--color-bg-secondary)' }} />
                    </Form.Item>
                  </>
                ),
              },
            ]}
          />
          <Form.Item>
            <Button type="primary" htmlType="submit" icon={<SaveOutlined />} loading={loading} size="large">
              {t('common.save', '保存配置')}
            </Button>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
}
