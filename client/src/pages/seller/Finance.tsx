import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Card, Row, Col, Statistic, Table, Button, Tag, Modal, Form,
  InputNumber, Select, Input, message, Tabs, Typography
} from 'antd';
import {
  DollarOutlined, WalletOutlined, LockOutlined, CheckCircleOutlined,
  ExportOutlined
} from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '@/services/apiClient';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';

const { Text } = Typography;

interface FinanceOverview {
  totalIncome: number;
  availableBalance: number;
  frozenAmount: number;
  withdrawnAmount: number;
}

interface Transaction {
  id: string;
  type: 'INCOME' | 'WITHDRAW' | 'REFUND';
  amount: number;
  status: 'PENDING' | 'SUCCESS' | 'FAILED';
  orderId?: string;
  createdAt: string;
  description: string;
}

interface WithdrawRecord {
  id: string;
  amount: number;
  method: string;
  account: string;
  status: 'PENDING' | 'SUCCESS' | 'FAILED';
  createdAt: string;
}

export default function SellerFinancePage() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [withdrawModal, setWithdrawModal] = useState(false);
  const [withdrawForm] = Form.useForm();

  // Fetch finance overview
  const { data: overview } = useQuery({
    queryKey: ['seller-finance-overview'],
    queryFn: async () => {
      const response = await apiClient.get('/sellers/finance/overview');
      return response.data as FinanceOverview;
    },
  });

  // Fetch transactions
  const { data: transactions, isLoading: loadingTransactions } = useQuery({
    queryKey: ['seller-transactions'],
    queryFn: async () => {
      const response = await apiClient.get('/sellers/finance/transactions');
      return response.data as Transaction[];
    },
    initialData: [], // 提供默认空数组
  });

  // Fetch withdraw records
  const { data: withdrawRecords, isLoading: loadingWithdraws } = useQuery({
    queryKey: ['seller-withdraws'],
    queryFn: async () => {
      const response = await apiClient.get('/sellers/withdraws');
      return response.data as WithdrawRecord[];
    },
    initialData: [], // 提供默认空数组
  });

  // Withdraw mutation
  const withdrawMutation = useMutation({
    mutationFn: async (data: { amount: number; method: string; account: string }) => {
      return apiClient.post('/sellers/withdraw', data);
    },
    onSuccess: () => {
      message.success(t('finance.withdrawSuccess'));
      queryClient.invalidateQueries({ queryKey: ['seller-finance'] });
      setWithdrawModal(false);
      withdrawForm.resetFields();
    },
  });

  const transactionColumns: ColumnsType<Transaction> = [
    {
      title: t('finance.type'),
      dataIndex: 'type',
      key: 'type',
      render: (type: string) => (
        <Tag color={type === 'INCOME' ? 'green' : type === 'REFUND' ? 'orange' : 'blue'}>
          {t(`finance.type.${type.toLowerCase()}`)}
        </Tag>
      ),
    },
    {
      title: t('finance.amount'),
      dataIndex: 'amount',
      key: 'amount',
      render: (amount: number, record) => (
        <Text type={record.type === 'INCOME' ? 'success' : 'danger'}>
          {record.type === 'INCOME' ? '+' : '-'}${amount.toFixed(2)}
        </Text>
      ),
    },
    {
      title: t('finance.status'),
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => (
        <Tag color={status === 'SUCCESS' ? 'green' : status === 'PENDING' ? 'orange' : 'red'}>
          {t(`finance.status.${status.toLowerCase()}`)}
        </Tag>
      ),
    },
    {
      title: t('finance.description'),
      dataIndex: 'description',
      key: 'description',
      ellipsis: true,
    },
    {
      title: t('finance.createdAt'),
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (date: string) => dayjs(date).format('YYYY-MM-DD HH:mm'),
    },
  ];

  const withdrawColumns: ColumnsType<WithdrawRecord> = [
    {
      title: t('finance.amount'),
      dataIndex: 'amount',
      key: 'amount',
      render: (amount: number) => `$${amount.toFixed(2)}`,
    },
    {
      title: t('finance.method'),
      dataIndex: 'method',
      key: 'method',
    },
    {
      title: t('finance.account'),
      dataIndex: 'account',
      key: 'account',
      ellipsis: true,
    },
    {
      title: t('finance.status'),
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => (
        <Tag color={status === 'SUCCESS' ? 'green' : status === 'PENDING' ? 'orange' : 'red'}>
          {t(`finance.status.${status.toLowerCase()}`)}
        </Tag>
      ),
    },
    {
      title: t('finance.createdAt'),
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (date: string) => dayjs(date).format('YYYY-MM-DD HH:mm'),
    },
  ];

  const tabItems = [
    {
      key: 'transactions',
      label: t('finance.transactions'),
      children: (
        <Table
          columns={transactionColumns}
          dataSource={transactions}
          rowKey="id"
          loading={loadingTransactions}
        />
      ),
    },
    {
      key: 'withdraws',
      label: t('finance.withdrawRecords'),
      children: (
        <Table
          columns={withdrawColumns}
          dataSource={withdrawRecords}
          rowKey="id"
          loading={loadingWithdraws}
        />
      ),
    },
  ];

  return (
    <div>
      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title={t('finance.totalIncome')}
              value={overview?.totalIncome || 0}
              precision={2}
              prefix={<DollarOutlined />}
              valueStyle={{ color: '#3f8600' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title={t('finance.availableBalance')}
              value={overview?.availableBalance || 0}
              precision={2}
              prefix={<WalletOutlined />}
              valueStyle={{ color: '#1890ff' }}
            />
            <Button
              type="primary"
              icon={<ExportOutlined />}
              style={{ marginTop: 16 }}
              onClick={() => setWithdrawModal(true)}
              disabled={!overview?.availableBalance}
            >
              {t('finance.withdraw')}
            </Button>
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title={t('finance.frozenAmount')}
              value={overview?.frozenAmount || 0}
              precision={2}
              prefix={<LockOutlined />}
              valueStyle={{ color: '#faad14' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title={t('finance.withdrawnAmount')}
              value={overview?.withdrawnAmount || 0}
              precision={2}
              prefix={<CheckCircleOutlined />}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
      </Row>

      <Card>
        <Tabs items={tabItems} />
      </Card>

      <Modal
        title={t('finance.withdraw')}
        open={withdrawModal}
        onCancel={() => {
          setWithdrawModal(false);
          withdrawForm.resetFields();
        }}
        onOk={() => withdrawForm.submit()}
        confirmLoading={withdrawMutation.isPending}
      >
        <Form
          form={withdrawForm}
          onFinish={(values) => withdrawMutation.mutate(values)}
          layout="vertical"
        >
          <Form.Item
            name="amount"
            label={t('finance.amount')}
            rules={[
              { required: true, message: t('common.required') },
              { type: 'number', min: 10, message: t('finance.minWithdraw') },
            ]}
          >
            <InputNumber
              style={{ width: '100%' }}
              min={10}
              precision={2}
              max={overview?.availableBalance}
              prefix="$"
            />
          </Form.Item>
          <Form.Item
            name="method"
            label={t('finance.method')}
            rules={[{ required: true, message: t('common.required') }]}
          >
            <Select
              options={[
                { value: 'usdt_trc20', label: 'USDT (TRC-20)' },
                { value: 'alipay', label: t('finance.method.alipay') },
                { value: 'wechat', label: t('finance.method.wechat') },
              ]}
            />
          </Form.Item>
          <Form.Item
            name="account"
            label={t('finance.account')}
            rules={[{ required: true, message: t('common.required') }]}
            extra={t('finance.accountHint', '请填写对应收款方式的账号/地址')}
          >
            <Input placeholder={t('finance.accountPlaceholder', '收款账号或钱包地址')} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}