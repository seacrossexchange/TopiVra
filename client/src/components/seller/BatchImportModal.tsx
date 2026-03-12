import { useState } from 'react';
import { Modal, Form, Select, Upload, Button, message, Alert, Typography, Space, Progress } from 'antd';
import { InboxOutlined, DownloadOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import apiClient from '@/services/apiClient';

const { Dragger } = Upload;
const { Text, Link } = Typography;

interface Product {
  id: string;
  title: string;
}

interface BatchImportModalProps {
  open: boolean;
  onClose: () => void;
  products: Product[];
  onSuccess: () => void;
}

export default function BatchImportModal({
  open,
  onClose,
  products,
  onSuccess,
}: BatchImportModalProps) {
  const { t } = useTranslation();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [fileList, setFileList] = useState<any[]>([]);
  const [importResult, setImportResult] = useState<any>(null);

  const handleDownloadTemplate = () => {
    const csvContent = 'username,password,email,emailPassword,cookie\nuser1,pass1,email1@test.com,emailpass1,cookie1\nuser2,pass2,email2@test.com,emailpass2,cookie2';
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', 'inventory-template.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleSubmit = async (values: any) => {
    if (fileList.length === 0) {
      message.error(t('inventory.uploadFileRequired'));
      return;
    }

    setLoading(true);
    setImportResult(null);

    try {
      const formData = new FormData();
      formData.append('productId', values.productId);
      formData.append('file', fileList[0].originFileObj);

      const response = await apiClient.post('/inventory/batch-add', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      setImportResult(response.data);
      
      if (response.data.success > 0) {
        message.success(t('inventory.importSuccess', { count: response.data.success }));
        onSuccess();
        
        // 如果全部成功，关闭弹窗
        if (response.data.failed === 0) {
          setTimeout(() => {
            onClose();
            form.resetFields();
            setFileList([]);
            setImportResult(null);
          }, 2000);
        }
      } else {
        message.error(t('inventory.importFailed'));
      }
    } catch (error: any) {
      message.error(error.response?.data?.message || t('common.error'));
    } finally {
      setLoading(false);
    }
  };

  const uploadProps = {
    name: 'file',
    multiple: false,
    fileList,
    accept: '.csv,.txt',
    beforeUpload: (file: any) => {
      const isCSV = file.type === 'text/csv' || file.name.endsWith('.csv') || file.name.endsWith('.txt');
      if (!isCSV) {
        message.error(t('inventory.onlyCSV'));
        return false;
      }
      setFileList([file]);
      return false;
    },
    onRemove: () => {
      setFileList([]);
    },
  };

  return (
    <Modal
      title={t('inventory.batchImport')}
      open={open}
      onCancel={() => {
        onClose();
        form.resetFields();
        setFileList([]);
        setImportResult(null);
      }}
      footer={null}
      width={700}
    >
      <Alert
        message={t('inventory.importTips')}
        description={
          <Space direction="vertical">
            <Text>{t('inventory.importFormat')}</Text>
            <Text code>username,password,email,emailPassword,cookie</Text>
            <Link onClick={handleDownloadTemplate}>
              <DownloadOutlined /> {t('inventory.downloadTemplate')}
            </Link>
          </Space>
        }
        type="info"
        showIcon
        style={{ marginBottom: 16 }}
      />

      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
      >
        <Form.Item
          name="productId"
          label={t('inventory.product')}
          rules={[{ required: true, message: t('inventory.selectProduct') }]}
        >
          <Select
            placeholder={t('inventory.selectProduct')}
            showSearch
            filterOption={(input, option) =>
              (option?.children as string).toLowerCase().includes(input.toLowerCase())
            }
          >
            {products.map((p) => (
              <Select.Option key={p.id} value={p.id}>
                {p.title}
              </Select.Option>
            ))}
          </Select>
        </Form.Item>

        <Form.Item label={t('inventory.uploadFile')}>
          <Dragger {...uploadProps}>
            <p className="ant-upload-drag-icon">
              <InboxOutlined />
            </p>
            <p className="ant-upload-text">{t('inventory.clickOrDrag')}</p>
            <p className="ant-upload-hint">{t('inventory.supportCSV')}</p>
          </Dragger>
        </Form.Item>

        {importResult && (
          <Alert
            message={t('inventory.importResult')}
            description={
              <Space direction="vertical" style={{ width: '100%' }}>
                <div>
                  <Text strong>{t('inventory.total')}: </Text>
                  <Text>{importResult.total}</Text>
                </div>
                <div>
                  <Text strong type="success">{t('inventory.success')}: </Text>
                  <Text type="success">{importResult.success}</Text>
                </div>
                <div>
                  <Text strong type="danger">{t('inventory.failed')}: </Text>
                  <Text type="danger">{importResult.failed}</Text>
                </div>
                {importResult.duplicates > 0 && (
                  <div>
                    <Text strong type="warning">{t('inventory.duplicates')}: </Text>
                    <Text type="warning">{importResult.duplicates}</Text>
                  </div>
                )}
                {importResult.errors && importResult.errors.length > 0 && (
                  <div>
                    <Text strong type="danger">{t('inventory.errors')}:</Text>
                    <ul style={{ marginTop: 8, maxHeight: 150, overflow: 'auto' }}>
                      {importResult.errors.map((err: string, idx: number) => (
                        <li key={idx}>
                          <Text type="danger">{err}</Text>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                <Progress
                  percent={Math.round((importResult.success / importResult.total) * 100)}
                  status={importResult.failed > 0 ? 'exception' : 'success'}
                />
              </Space>
            }
            type={importResult.failed > 0 ? 'warning' : 'success'}
            showIcon
            style={{ marginTop: 16 }}
          />
        )}

        <Form.Item style={{ marginTop: 16 }}>
          <Button type="primary" htmlType="submit" loading={loading} block>
            {t('inventory.startImport')}
          </Button>
        </Form.Item>
      </Form>
    </Modal>
  );
}

