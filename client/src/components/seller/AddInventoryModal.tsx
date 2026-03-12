import { useState } from 'react';
import { Modal, Form, Select, Input, Button, message } from 'antd';
import { useTranslation } from 'react-i18next';
import apiClient from '@/services/apiClient';

const { TextArea } = Input;

interface Product {
  id: string;
  title: string;
}

interface AddInventoryModalProps {
  open: boolean;
  onClose: () => void;
  products: Product[];
  onSuccess: () => void;
}

export default function AddInventoryModal({
  open,
  onClose,
  products,
  onSuccess,
}: AddInventoryModalProps) {
  const { t } = useTranslation();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (values: any) => {
    setLoading(true);
    try {
      await apiClient.post('/inventory/add', {
        productId: values.productId,
        accountData: values.accountData,
        accountInfo: values.accountInfo ? JSON.parse(values.accountInfo) : undefined,
      });
      
      message.success(t('inventory.addSuccess'));
      form.resetFields();
      onSuccess();
      onClose();
    } catch (error: any) {
      message.error(error.response?.data?.message || t('common.error'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      title={t('inventory.add')}
      open={open}
      onCancel={onClose}
      footer={null}
      width={600}
    >
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

        <Form.Item
          name="accountData"
          label={t('inventory.accountData')}
          rules={[{ required: true, message: t('inventory.accountDataRequired') }]}
          extra={t('inventory.accountDataHint')}
        >
          <TextArea
            rows={4}
            placeholder="username:password:email:emailPassword:cookie"
          />
        </Form.Item>

        <Form.Item
          name="accountInfo"
          label={t('inventory.accountInfo')}
          extra={t('inventory.accountInfoHint')}
        >
          <TextArea
            rows={4}
            placeholder='{"username": "user123", "password": "pass123", "email": "user@example.com"}'
          />
        </Form.Item>

        <Form.Item>
          <Button type="primary" htmlType="submit" loading={loading} block>
            {t('common.submit')}
          </Button>
        </Form.Item>
      </Form>
    </Modal>
  );
}

