import { useState, useEffect } from 'react';
import { Card, Form, Input, Button, message, Typography, Divider } from 'antd';
import { SaveOutlined, SendOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import apiClient from '@/services/apiClient';

const { Title } = Typography;

export default function TelegramConfig() {
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
      const { data } = await apiClient.get('/admin/config/telegram');
      form.setFieldsValue(data);
    } catch {
      // 使用默认值
    } finally {
      setFetching(false);
    }
  };

  const handleSave = async (values: any) => {
    setLoading(true);
    try {
      await apiClient.put('/admin/config/telegram', values);
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
        <SendOutlined style={{ marginRight: 8 }} />
        {t('settings.telegramConfig', 'Telegram 配置')}
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
          <Title level={5} style={{ color: 'var(--color-text-primary)' }}>Telegram Bot</Title>

          <Form.Item name="botToken" label="Bot Token">
            <Input.Password
              placeholder="123456789:AAxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
              style={{ background: 'var(--color-bg-secondary)' }}
            />
          </Form.Item>

          <Form.Item name="botUsername" label="Bot Username">
            <Input
              placeholder="topivra_bot"
              addonBefore="@"
              style={{ background: 'var(--color-bg-secondary)' }}
            />
          </Form.Item>

          <Divider style={{ borderColor: 'var(--color-border)' }} />

          <Title level={5} style={{ color: 'var(--color-text-primary)' }}>通知频道</Title>

          <Form.Item name="channelId" label="频道 ID">
            <Input
              placeholder="-1001234567890"
              style={{ background: 'var(--color-bg-secondary)' }}
            />
          </Form.Item>

          <Form.Item name="channelUsername" label="频道用户名">
            <Input
              placeholder="topivra_channel"
              addonBefore="@"
              style={{ background: 'var(--color-bg-secondary)' }}
            />
          </Form.Item>

          <Divider style={{ borderColor: 'var(--color-border)' }} />

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
