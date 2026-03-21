/**
 * 支付通道管理页面
 */
import React, { useState, useEffect } from 'react';
import {
  Card,
  Table,
  Switch,
  Button,
  Modal,
  Form,
  Input,
  InputNumber,
  Select,
  message,
  Space,
  Tag,
  Tooltip,
} from 'antd';
import {
  SettingOutlined,
  CheckCircleOutlined,
  ReloadOutlined,
  PlusOutlined,
} from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import api from '../../services/apiClient';

interface GatewayConfigField {
  key: string;
  label: string;
  type: 'text' | 'password' | 'select' | 'number';
  required: boolean;
  placeholder?: string;
  options?: { label: string; value: string }[];
  default?: any;
}

interface GatewayInfo {
  code: string;
  name: string;
  description: string;
  icon?: string;
  configFields: GatewayConfigField[];
}

interface Gateway {
  id: string;
  code: string;
  name: string;
  enabled: boolean;
  config: Record<string, any>;
  sort: number;
  info?: GatewayInfo;
}

const PaymentGateways: React.FC = () => {
  const { t } = useTranslation();
  const [gateways, setGateways] = useState<Gateway[]>([]);
  const [loading, setLoading] = useState(false);
  const [configModal, setConfigModal] = useState(false);
  const [currentGateway, setCurrentGateway] = useState<Gateway | null>(null);
  const [form] = Form.useForm();

  useEffect(() => {
    fetchGateways();
  }, []);

  const fetchGateways = async () => {
    setLoading(true);
    try {
      const res = await api.get('/payment-gateways');
      setGateways(res.data || []);
    } catch (error: any) {
      message.error(error.response?.data?.message || t('admin.loadPaymentGatewaysFailed', '获取支付通道失败'));
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = async (code: string, enabled: boolean) => {
    try {
      await api.put(`/payment-gateways/${code}`, { enabled });
      message.success(enabled ? t('common.enabled', '已启用') : t('common.disabled', '已禁用'));
      fetchGateways();
    } catch (error: any) {
      message.error(error.response?.data?.message || t('common.operationFailed', '操作失败'));
    }
  };

  const handleConfig = (gateway: Gateway) => {
    setCurrentGateway(gateway);
    form.setFieldsValue(gateway.config);
    setConfigModal(true);
  };

  const handleSaveConfig = async () => {
    try {
      const values = await form.validateFields();
      await api.put(`/payment-gateways/${currentGateway?.code}`, {
        config: values,
      });
      message.success(t('common.saveSuccess', '配置已保存'));
      setConfigModal(false);
      fetchGateways();
    } catch (error: any) {
      message.error(error.response?.data?.message || t('common.saveFailed', '保存失败'));
    }
  };

  const handleTest = async (code: string) => {
    try {
      message.loading({ content: t('common.testing', '测试中...'), key: 'test' });
      const res = await api.post(`/payment-gateways/${code}/test`, {
        amount: 0.01,
      });
      if (res.data.success) {
        message.success({ content: t('common.testSuccess', '测试成功'), key: 'test' });
      } else {
        message.error({ content: res.data.message || t('common.testFailed', '测试失败'), key: 'test' });
      }
    } catch (error: any) {
      message.error({
        content: error.response?.data?.message || t('common.testFailed', '测试失败'),
        key: 'test',
      });
    }
  };

  const handleInit = async () => {
    try {
      const res = await api.post('/payment-gateways/init');
      message.success(res.data.message || t('common.initSuccess', '初始化成功'));
      fetchGateways();
    } catch (error: any) {
      message.error(error.response?.data?.message || t('common.initFailed', '初始化失败'));
    }
  };

  const renderConfigForm = () => {
    if (!currentGateway?.info?.configFields) {
      return (
        <Form form={form} layout="vertical">
          <Form.Item label={t('admin.gatewayConfigJson', '配置 (JSON)')}>
            <Input.TextArea
              rows={6}
              placeholder='{"key": "value"}'
            />
          </Form.Item>
        </Form>
      );
    }

    return (
      <Form form={form} layout="vertical">
        {currentGateway.info.configFields.map((field) => {
          switch (field.type) {
            case 'password':
              return (
                <Form.Item
                  key={field.key}
                  label={field.label}
                  name={field.key}
                  rules={[
                    { required: field.required, message: `请输入${field.label}` },
                  ]}
                >
                  <Input.Password placeholder={field.placeholder} />
                </Form.Item>
              );
            case 'select':
              return (
                <Form.Item
                  key={field.key}
                  label={field.label}
                  name={field.key}
                  rules={[
                    { required: field.required, message: `请选择${field.label}` },
                  ]}
                  initialValue={field.default}
                >
                  <Select placeholder={`请选择${field.label}`}>
                    {field.options?.map((opt) => (
                      <Select.Option key={opt.value} value={opt.value}>
                        {opt.label}
                      </Select.Option>
                    ))}
                  </Select>
                </Form.Item>
              );
            case 'number':
              return (
                <Form.Item
                  key={field.key}
                  label={field.label}
                  name={field.key}
                  rules={[
                    { required: field.required, message: `请输入${field.label}` },
                  ]}
                >
                  <InputNumber style={{ width: '100%' }} />
                </Form.Item>
              );
            default:
              return (
                <Form.Item
                  key={field.key}
                  label={field.label}
                  name={field.key}
                  rules={[
                    { required: field.required, message: `请输入${field.label}` },
                  ]}
                >
                  <Input placeholder={field.placeholder} />
                </Form.Item>
              );
          }
        })}
      </Form>
    );
  };

  const columns = [
    {
      title: '排序',
      dataIndex: 'sort',
      width: 60,
      render: (sort: number) => (
        <Tag color="blue">{sort}</Tag>
      ),
    },
    {
      title: '支付方式',
      dataIndex: 'name',
      render: (name: string, record: Gateway) => (
        <Space>
          <span>{name}</span>
          {record.enabled && <Tag color="green">{t('common.enabled', '已启用')}</Tag>}
        </Space>
      ),
    },
    {
      title: '通道代码',
      dataIndex: 'code',
      render: (code: string) => <Tag>{code}</Tag>,
    },
    {
      title: '描述',
      dataIndex: 'info',
      render: (info: GatewayInfo) => info?.description || '-',
    },
    {
      title: '状态',
      dataIndex: 'enabled',
      width: 100,
      render: (enabled: boolean, record: Gateway) => (
        <Switch
          checked={enabled}
          onChange={(checked) => handleToggle(record.code, checked)}
        />
      ),
    },
    {
      title: '操作',
      width: 200,
      render: (_: any, record: Gateway) => (
        <Space>
          <Tooltip title="配置">
            <Button
              type="primary"
              ghost
              icon={<SettingOutlined />}
              onClick={() => handleConfig(record)}
            />
          </Tooltip>
          <Tooltip title={t('admin.testConnection', '测试连接')}>
            <Button
              icon={<CheckCircleOutlined />}
              onClick={() => handleTest(record.code)}
            />
          </Tooltip>
        </Space>
      ),
    },
  ];

  return (
    <div style={{ padding: 24 }}>
      <Card
        title={t('admin.paymentGatewayManagement', '支付通道管理')}
        extra={
          <Space>
            <Button icon={<ReloadOutlined />} onClick={fetchGateways}>
              {t('common.refresh', '刷新')}
            </Button>
            <Button type="primary" icon={<PlusOutlined />} onClick={handleInit}>
              {t('admin.initGateways', '初始化通道')}
            </Button>
          </Space>
        }
      >
        <Table
          columns={columns}
          dataSource={gateways}
          rowKey="id"
          loading={loading}
          pagination={false}
        />
      </Card>

      <Modal
        title={`${t('common.configure', '配置')} ${currentGateway?.name}`}
        open={configModal}
        onOk={handleSaveConfig}
        onCancel={() => setConfigModal(false)}
        width={600}
        destroyOnHidden
      >
        {renderConfigForm()}
      </Modal>
    </div>
  );
};

export default PaymentGateways;