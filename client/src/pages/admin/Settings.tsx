import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Card, Tabs, Input, Button, InputNumber, Space,
  Typography, message, Divider, Row, Col
} from 'antd';
import {
  SettingOutlined, DollarOutlined, BellOutlined, SaveOutlined,
  LinkOutlined, ClockCircleOutlined
} from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import apiClient from '@/services/apiClient';

const { Title, Text } = Typography;

const settingsSchema = z.object({
  siteName: z.string().min(1),
  siteLogo: z.string().url().optional().or(z.literal('')),
  siteAnnouncement: z.string().optional(),
  commissionRate: z.number().min(0).max(1),
  minWithdraw: z.number().min(1),
  paymentTimeout: z.number().min(5),
  autoConfirmHours: z.number().min(1),
  smtpHost: z.string().optional(),
  smtpPort: z.number().optional(),
  smtpUser: z.string().optional(),
  smtpPass: z.string().optional(),
  telegramBotToken: z.string().optional(),
  telegramChatId: z.string().optional(),
  // 社交链接
  socialGithub: z.string().optional(),
  socialTwitter: z.string().optional(),
  supportEmail: z.string().optional(),
  // 客服时间
  workingHours: z.string().optional(),
});

type SettingsFormValues = z.infer<typeof settingsSchema>;

interface SiteSettings extends SettingsFormValues {
  siteName: string;
  commissionRate: number;
  minWithdraw: number;
  paymentTimeout: number;
  autoConfirmHours: number;
}

export default function AdminSettingsPage() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('site');

  const { register, handleSubmit, control, reset, formState: { errors } } = useForm<SettingsFormValues>({
    resolver: zodResolver(settingsSchema),
  });

  const { data: settings, isLoading } = useQuery({
    queryKey: ['admin-settings'],
    queryFn: async () => {
      const response = await apiClient.get('/admin/settings');
      return response.data as SiteSettings;
    },
  });

  useEffect(() => {
    if (settings) {
      reset(settings);
    }
  }, [settings, reset]);

  const updateMutation = useMutation({
    mutationFn: async (data: SettingsFormValues) => {
      return apiClient.patch('/admin/settings', data);
    },
    onSuccess: () => {
      message.success(t('common.saveSuccess', '保存成功'));
      queryClient.invalidateQueries({ queryKey: ['admin-settings'] });
      queryClient.invalidateQueries({ queryKey: ['site-settings-public'] });
    },
  });

  const onSubmit = (data: SettingsFormValues) => {
    updateMutation.mutate(data);
  };

  if (isLoading) {
    return <Card loading />;
  }

  const tabItems = [
    {
      key: 'site',
      label: (
        <span><SettingOutlined /> {t('settings.site', '基本设置')}</span>
      ),
      children: (
        <Space direction="vertical" size="middle" style={{ width: '100%' }}>
          <div>
            <Text strong>{t('settings.siteName', '站点名称')}</Text>
            <Input {...register('siteName')} style={{ marginTop: 4 }} />
            {errors.siteName && <Text type="danger">{errors.siteName.message}</Text>}
          </div>
          <div>
            <Text strong>{t('settings.siteLogo', 'Logo URL')}</Text>
            <Input {...register('siteLogo')} placeholder="https://" style={{ marginTop: 4 }} />
          </div>
          <div>
            <Text strong>{t('settings.siteAnnouncement', '站点公告')}</Text>
            <Input.TextArea {...register('siteAnnouncement')} rows={3} style={{ marginTop: 4 }} />
          </div>
        </Space>
      ),
    },
    {
      key: 'transaction',
      label: (
        <span><DollarOutlined /> {t('settings.transaction', '交易设置')}</span>
      ),
      children: (
        <Space direction="vertical" size="middle" style={{ width: '100%' }}>
          <Row gutter={16}>
            <Col span={12}>
              <Text strong>{t('settings.commissionRate', '佣金率')}</Text>
              <Controller
                name="commissionRate"
                control={control}
                render={({ field }) => (
                  <InputNumber
                    {...field}
                    style={{ width: '100%', marginTop: 4 }}
                    min={0} max={1} step={0.01}
                    formatter={(v) => `${(Number(v) * 100).toFixed(0)}%`}
                    parser={(v) => Number(v?.replace('%', '')) / 100}
                  />
                )}
              />
            </Col>
            <Col span={12}>
              <Text strong>{t('settings.minWithdraw', '最低提现')}</Text>
              <Controller
                name="minWithdraw"
                control={control}
                render={({ field }) => (
                  <InputNumber {...field} style={{ width: '100%', marginTop: 4 }} min={1} prefix="$" />
                )}
              />
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <Text strong>{t('settings.paymentTimeout', '支付超时（分钟）')}</Text>
              <Controller
                name="paymentTimeout"
                control={control}
                render={({ field }) => (
                  <InputNumber {...field} style={{ width: '100%', marginTop: 4 }} min={5} suffix={t('common.minutes', '分钟')} />
                )}
              />
            </Col>
            <Col span={12}>
              <Text strong>{t('settings.autoConfirmHours', '自动确认（小时）')}</Text>
              <Controller
                name="autoConfirmHours"
                control={control}
                render={({ field }) => (
                  <InputNumber {...field} style={{ width: '100%', marginTop: 4 }} min={1} suffix={t('common.hours', '小时')} />
                )}
              />
            </Col>
          </Row>
        </Space>
      ),
    },
    {
      key: 'social',
      label: (
        <span><LinkOutlined /> {t('settings.socialLinks', '社交链接')}</span>
      ),
      children: (
        <Space direction="vertical" size="middle" style={{ width: '100%' }}>
          <div>
            <Text strong>{t('settings.socialGithub', 'GitHub 链接')}</Text>
            <Input
              {...register('socialGithub')}
              placeholder="https://github.com/yourname"
              style={{ marginTop: 4 }}
              prefix={<span style={{ color: 'var(--color-text-tertiary)' }}>🐙</span>}
            />
          </div>
          <div>
            <Text strong>{t('settings.socialTwitter', 'Twitter / X 链接')}</Text>
            <Input
              {...register('socialTwitter')}
              placeholder="https://twitter.com/yourname"
              style={{ marginTop: 4 }}
              prefix={<span style={{ color: 'var(--color-text-tertiary)' }}>🐦</span>}
            />
          </div>
          <div>
            <Text strong>{t('contact.emailLabel', '客服邮箱')}</Text>
            <Input
              {...register('supportEmail')}
              placeholder="support@topivra.com"
              style={{ marginTop: 4 }}
            />
          </div>
          <Divider />
          <Title level={5}>
            <ClockCircleOutlined style={{ marginRight: 8 }} />
            {t('settings.workingHours', '客服上班时间')}
          </Title>
          <div>
            <Text type="secondary" style={{ fontSize: 13, display: 'block', marginBottom: 8 }}>
              {t('settings.workingHoursDesc', '例：周一至周五 09:00–18:00（UTC+8）')}
            </Text>
            <Input
              {...register('workingHours')}
              placeholder="周一至周五 09:00–18:00（UTC+8）"
              style={{ marginTop: 4 }}
            />
          </div>
        </Space>
      ),
    },
    {
      key: 'notification',
      label: (
        <span><BellOutlined /> {t('settings.notification', '通知设置')}</span>
      ),
      children: (
        <Space direction="vertical" size="middle" style={{ width: '100%' }}>
          <Title level={5}>SMTP {t('settings.emailConfig', '邮件配置')}</Title>
          <Row gutter={16}>
            <Col span={16}>
              <Text strong>{t('settings.smtpHost', 'SMTP Host')}</Text>
              <Input {...register('smtpHost')} style={{ marginTop: 4 }} />
            </Col>
            <Col span={8}>
              <Text strong>{t('settings.smtpPort', 'SMTP Port')}</Text>
              <Controller
                name="smtpPort"
                control={control}
                render={({ field }) => (
                  <InputNumber {...field} style={{ width: '100%', marginTop: 4 }} />
                )}
              />
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <Text strong>{t('settings.smtpUser', 'SMTP 用户名')}</Text>
              <Input {...register('smtpUser')} style={{ marginTop: 4 }} />
            </Col>
            <Col span={12}>
              <Text strong>{t('settings.smtpPass', 'SMTP 密码')}</Text>
              <Input.Password {...register('smtpPass')} style={{ marginTop: 4 }} />
            </Col>
          </Row>
          <Divider />
          <Title level={5}>Telegram Bot</Title>
          <div>
            <Text strong>{t('settings.telegramBotToken', 'Bot Token')}</Text>
            <Input.Password {...register('telegramBotToken')} style={{ marginTop: 4 }} />
          </div>
          <div>
            <Text strong>{t('settings.telegramChatId', 'Chat ID')}</Text>
            <Input {...register('telegramChatId')} style={{ marginTop: 4 }} />
          </div>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <Title level={4}>
        <SettingOutlined style={{ marginRight: 8 }} />
        {t('settings.adminTitle', '系统设置')}
      </Title>

      <form onSubmit={handleSubmit(onSubmit)}>
        <Card>
          <Tabs
            activeKey={activeTab}
            onChange={setActiveTab}
            items={tabItems}
          />
          <Divider />
          <Button
            type="primary"
            htmlType="submit"
            icon={<SaveOutlined />}
            loading={updateMutation.isPending}
            size="large"
          >
            {t('common.save', '保存')}
          </Button>
        </Card>
      </form>
    </div>
  );
}
