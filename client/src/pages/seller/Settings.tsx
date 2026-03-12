import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Card, Input, Button, Upload, Switch, Space, message,
  Divider, Typography, Row, Col, Alert
} from 'antd';
import {
  UploadOutlined, SaveOutlined, ShopOutlined
} from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import apiClient from '@/services/apiClient';
import type { UploadFile } from 'antd/es/upload/interface';

const { Title, Text } = Typography;
const { TextArea } = Input;

const settingsSchema = z.object({
  shopName: z.string().min(2).max(50),
  shopDescription: z.string().max(500).optional(),
  contactEmail: z.string().email().optional().or(z.literal('')),
  contactPhone: z.string().optional(),
  usdtAddress: z.string().optional(),
  alipayQrcode: z.string().optional(),
  wechatQrcode: z.string().optional(),
  notifyNewOrder: z.boolean(),
  notifyRefund: z.boolean(),
  notifyMessage: z.boolean(),
});

type SettingsFormValues = z.infer<typeof settingsSchema>;

interface ShopSettings {
  shopName: string;
  shopDescription?: string;
  logo?: string;
  contactEmail?: string;
  contactPhone?: string;
  usdtAddress?: string;
  alipayQrcode?: string;
  wechatQrcode?: string;
  notifyNewOrder: boolean;
  notifyRefund: boolean;
  notifyMessage: boolean;
}

export default function SellerSettingsPage() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [logoFile, setLogoFile] = useState<UploadFile | null>(null);

  const { register, handleSubmit, control, reset, formState: { errors } } = useForm<SettingsFormValues>({
    resolver: zodResolver(settingsSchema),
    defaultValues: {
      notifyNewOrder: true,
      notifyRefund: true,
      notifyMessage: true,
    },
  });

  // Fetch settings
  const { data: settings, isLoading } = useQuery({
    queryKey: ['seller-settings'],
    queryFn: async () => {
      const response = await apiClient.get('/sellers/settings');
      return response.data as ShopSettings;
    },
  });

  // Reset form when data loads
  useEffect(() => {
    if (settings) {
      reset(settings);
    }
  }, [settings, reset]);

  // Update settings
  const updateMutation = useMutation({
    mutationFn: async (data: SettingsFormValues) => {
      return apiClient.patch('/sellers/settings', data);
    },
    onSuccess: () => {
      message.success(t('common.saveSuccess'));
      queryClient.invalidateQueries({ queryKey: ['seller-settings'] });
    },
  });

  // Upload logo
  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('file', file);
      const response = await apiClient.post('/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return response.data;
    },
    onSuccess: () => {
      message.success(t('settings.logoUploaded'));
    },
  });

  const onSubmit = (data: SettingsFormValues) => {
    updateMutation.mutate(data);
  };

  if (isLoading) {
    return <Card loading />;
  }

  return (
    <div>
      <Title level={4}>
        <ShopOutlined style={{ marginRight: 8 }} />
        {t('settings.title')}
      </Title>

      <form onSubmit={handleSubmit(onSubmit)}>
        <Row gutter={24}>
          <Col xs={24} lg={16}>
            <Card title={t('settings.shopInfo')} style={{ marginBottom: 24 }}>
              <Space direction="vertical" size="middle" style={{ width: '100%' }}>
                <div>
                  <Text strong>{t('settings.shopName')}</Text>
                  <Input {...register('shopName')} style={{ marginTop: 4 }} />
                  {errors.shopName && <Text type="danger">{errors.shopName.message}</Text>}
                </div>

                <div>
                  <Text strong>{t('settings.shopDescription')}</Text>
                  <TextArea {...register('shopDescription')} rows={3} style={{ marginTop: 4 }} />
                </div>

                <div>
                  <Text strong>{t('settings.logo')}</Text>
                  <div style={{ marginTop: 8 }}>
                    <Upload
                      listType="picture"
                      maxCount={1}
                      beforeUpload={(file) => {
                        setLogoFile(file as unknown as UploadFile);
                        uploadMutation.mutate(file);
                        return false;
                      }}
                      fileList={logoFile ? [logoFile] : []}
                    >
                      <Button icon={<UploadOutlined />}>{t('settings.uploadLogo')}</Button>
                    </Upload>
                  </div>
                </div>

                <Row gutter={16}>
                  <Col span={12}>
                    <Text strong>{t('settings.contactEmail')}</Text>
                    <Input {...register('contactEmail')} type="email" style={{ marginTop: 4 }} />
                  </Col>
                  <Col span={12}>
                    <Text strong>{t('settings.contactPhone')}</Text>
                    <Input {...register('contactPhone')} style={{ marginTop: 4 }} />
                  </Col>
                </Row>
              </Space>
            </Card>

            <Card title={t('settings.paymentSettings')} style={{ marginBottom: 24 }}>
              <Alert
                type="info"
                message={t('settings.paymentInfo')}
                style={{ marginBottom: 16 }}
              />
              <Space direction="vertical" size="middle" style={{ width: '100%' }}>
                <div>
                  <Text strong>USDT (TRC-20) {t('settings.walletAddress')}</Text>
                  <Input {...register('usdtAddress')} placeholder="T..." style={{ marginTop: 4 }} />
                </div>
                <Divider />
                <div>
                  <Text strong>{t('settings.alipayQrcode')}</Text>
                  <Input {...register('alipayQrcode')} placeholder={t('settings.qrcodeUrl')} style={{ marginTop: 4 }} />
                </div>
                <div>
                  <Text strong>{t('settings.wechatQrcode')}</Text>
                  <Input {...register('wechatQrcode')} placeholder={t('settings.qrcodeUrl')} style={{ marginTop: 4 }} />
                </div>
              </Space>
            </Card>

            <Card title={t('settings.notifications')}>
              <Space direction="vertical" size="middle" style={{ width: '100%' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <Text strong>{t('settings.notifyNewOrder')}</Text>
                    <br />
                    <Text type="secondary">{t('settings.notifyNewOrderDesc')}</Text>
                  </div>
                  <Controller
                    name="notifyNewOrder"
                    control={control}
                    render={({ field }) => <Switch checked={field.value} onChange={field.onChange} />}
                  />
                </div>
                <Divider />
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <Text strong>{t('settings.notifyRefund')}</Text>
                    <br />
                    <Text type="secondary">{t('settings.notifyRefundDesc')}</Text>
                  </div>
                  <Controller
                    name="notifyRefund"
                    control={control}
                    render={({ field }) => <Switch checked={field.value} onChange={field.onChange} />}
                  />
                </div>
                <Divider />
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <Text strong>{t('settings.notifyMessage')}</Text>
                    <br />
                    <Text type="secondary">{t('settings.notifyMessageDesc')}</Text>
                  </div>
                  <Controller
                    name="notifyMessage"
                    control={control}
                    render={({ field }) => <Switch checked={field.value} onChange={field.onChange} />}
                  />
                </div>
              </Space>
            </Card>
          </Col>

          <Col xs={24} lg={8}>
            <Card>
              <Button
                type="primary"
                htmlType="submit"
                block
                icon={<SaveOutlined />}
                loading={updateMutation.isPending}
              >
                {t('common.save')}
              </Button>
            </Card>
          </Col>
        </Row>
      </form>
    </div>
  );
}