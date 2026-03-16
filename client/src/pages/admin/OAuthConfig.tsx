import { useState, useEffect } from 'react';
import { Card, Form, Input, Button, message, Switch, Divider, Typography } from 'antd';
import { SaveOutlined, ApiOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import apiClient from '@/services/apiClient';

const { Title } = Typography;

export default function OAuthConfig() {
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
      const { data } = await apiClient.get('/admin/config/oauth');
      form.setFieldsValue(data);
    } catch {
      message.error(t('common.fetchError', '加载 OAuth 配置失败'));
    } finally {
      setFetching(false);
    }
  };

  const handleSave = async (values: any) => {
    setLoading(true);
    try {
      await apiClient.put('/admin/config/oauth', values);
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
        <ApiOutlined style={{ marginRight: 8 }} />
        {t('settings.oauthConfig', 'OAuth 配置')}
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
          {/* Google OAuth */}
          <Title level={5} style={{ color: 'var(--color-text-primary)', marginBottom: 16 }}>
            Google OAuth
          </Title>

          <Form.Item
            name={['google', 'enabled']}
            label={t('settings.enableGoogleOAuth', '启用 Google 登录')}
            valuePropName="checked"
          >
            <Switch />
          </Form.Item>

          <Form.Item
            name={['google', 'clientId']}
            label="Google Client ID"
          >
            <Input
              placeholder="xxxxxxxxx.apps.googleusercontent.com"
              style={{ background: 'var(--color-bg-secondary)' }}
            />
          </Form.Item>

          <Form.Item
            name={['google', 'clientSecret']}
            label="Google Client Secret"
          >
            <Input.Password
              placeholder="GOCSPX-xxxxxxxxxxxxxxxx"
              style={{ background: 'var(--color-bg-secondary)' }}
            />
          </Form.Item>

          <Divider style={{ borderColor: 'var(--color-border)' }} />

          {/* Telegram OAuth */}
          <Title level={5} style={{ color: 'var(--color-text-primary)', marginBottom: 16 }}>
            Telegram OAuth
          </Title>

          <Form.Item
            name={['telegram', 'enabled']}
            label={t('settings.enableTelegramOAuth', '启用 Telegram 登录')}
            valuePropName="checked"
          >
            <Switch />
          </Form.Item>

          <Form.Item
            name={['telegram', 'botToken']}
            label="Telegram Bot Token"
          >
            <Input.Password
              placeholder="123456789:AAxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
              style={{ background: 'var(--color-bg-secondary)' }}
            />
          </Form.Item>

          <Form.Item
            name={['telegram', 'botUsername']}
            label="Telegram Bot Username"
          >
            <Input
              placeholder="topivra_bot"
              addonBefore="@"
              style={{ background: 'var(--color-bg-secondary)' }}
            />
          </Form.Item>

          <Divider style={{ borderColor: 'var(--color-border)' }} />

          <Form.Item>
            <Button
              type="primary"
              htmlType="submit"
              icon={<SaveOutlined />}
              loading={loading}
              size="large"
            >
              {t('common.save', '保存配置')}
            </Button>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
}
