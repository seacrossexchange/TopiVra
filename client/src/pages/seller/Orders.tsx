import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Card, Table, Button, Space, Tag, Input, Select, Modal, DatePicker,
  Drawer, message, Descriptions, Form
} from 'antd';
import {
  SearchOutlined, EyeOutlined, SendOutlined
} from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '@/services/apiClient';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';

const { RangePicker } = DatePicker;
const { TextArea } = Input;

interface Order {
  id: string;
  orderNo: string;
  buyer: { id: string; username: string; email: string };
  product: { id: string; title: string };
  totalAmount: number;
  orderStatus: string;
  paymentStatus: string;
  createdAt: string;
  paidAt?: string;
  deliveredAt?: string;
  accountData?: string;
}

export default function SellerOrdersPage() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  
  const [searchText, setSearchText] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateRange, setDateRange] = useState<[dayjs.Dayjs, dayjs.Dayjs] | null>(null);
  const [detailDrawer, setDetailDrawer] = useState<Order | null>(null);
  const [deliverModal, setDeliverModal] = useState<Order | null>(null);
  const [refundModal, setRefundModal] = useState<Order | null>(null);
  const [deliverForm] = Form.useForm();
  const [refundForm] = Form.useForm();

  // Fetch orders
  const { data: orders, isLoading } = useQuery({
    queryKey: ['seller-orders', searchText, statusFilter, dateRange],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (searchText) params.append('search', searchText);
      if (statusFilter !== 'all') params.append('status', statusFilter);
      if (dateRange) {
        params.append('startDate', dateRange[0].format('YYYY-MM-DD'));
        params.append('endDate', dateRange[1].format('YYYY-MM-DD'));
      }
      const response = await apiClient.get(`/orders/seller?${params}`);
      return response.data as Order[];
    },
    initialData: [], // 提供默认空数组
  });

  // Deliver order
  const deliverMutation = useMutation({
    mutationFn: async ({ orderId, accountData }: { orderId: string; accountData: string }) => {
      return apiClient.post(`/orders/${orderId}/deliver`, { accountData });
    },
    onSuccess: () => {
      message.success(t('order.deliverSuccess'));
      queryClient.invalidateQueries({ queryKey: ['seller-orders'] });
      setDeliverModal(null);
      deliverForm.resetFields();
    },
  });

  // Refund order
  const refundMutation = useMutation({
    mutationFn: async ({ orderId, reason, approved }: { orderId: string; reason: string; approved: boolean }) => {
      return apiClient.post(`/orders/${orderId}/refund`, { reason, approved });
    },
    onSuccess: () => {
      message.success(t('order.refundSuccess'));
      queryClient.invalidateQueries({ queryKey: ['seller-orders'] });
      setRefundModal(null);
      refundForm.resetFields();
    },
  });

  const statusColors: Record<string, string> = {
    PENDING: 'orange',
    PAID: 'blue',
    DELIVERED: 'cyan',
    COMPLETED: 'green',
    REFUNDING: 'red',
    REFUNDED: 'default',
    CANCELLED: 'default',
  };

  const paymentColors: Record<string, string> = {
    PENDING: 'orange',
    PAID: 'green',
    FAILED: 'red',
  };

  const columns: ColumnsType<Order> = [
    {
      title: t('order.orderNo'),
      dataIndex: 'orderNo',
      key: 'orderNo',
      width: 180,
    },
    {
      title: t('order.product'),
      dataIndex: ['product', 'title'],
      key: 'product',
      ellipsis: true,
    },
    {
      title: t('order.buyer'),
      dataIndex: ['buyer', 'username'],
      key: 'buyer',
    },
    {
      title: t('order.amount'),
      dataIndex: 'totalAmount',
      key: 'amount',
      render: (amount: number) => `$${amount.toFixed(2)}`,
    },
    {
      title: t('order.status'),
      dataIndex: 'orderStatus',
      key: 'status',
      render: (status: string) => (
        <Tag color={statusColors[status]}>
          {t(`order.status.${status.toLowerCase()}`)}
        </Tag>
      ),
    },
    {
      title: t('order.paymentStatus'),
      dataIndex: 'paymentStatus',
      key: 'paymentStatus',
      render: (status: string) => (
        <Tag color={paymentColors[status]}>
          {t(`order.payment.${status.toLowerCase()}`)}
        </Tag>
      ),
    },
    {
      title: t('order.createdAt'),
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (date: string) => dayjs(date).format('YYYY-MM-DD HH:mm'),
      width: 140,
    },
    {
      title: t('common.actions'),
      key: 'actions',
      width: 180,
      render: (_, record) => (
        <Space>
          <Button
            size="small"
            icon={<EyeOutlined />}
            onClick={() => setDetailDrawer(record)}
          />
          {record.orderStatus === 'PAID' && (
            <Button
              size="small"
              type="primary"
              icon={<SendOutlined />}
              onClick={() => setDeliverModal(record)}
            >
              {t('order.deliver')}
            </Button>
          )}
          {record.orderStatus === 'REFUNDING' && (
            <Button
              size="small"
              danger
              onClick={() => setRefundModal(record)}
            >
              {t('order.refund')}
            </Button>
          )}
        </Space>
      ),
    },
  ];

  return (
    <div>
      <Card>
        <Space style={{ marginBottom: 16, width: '100%', justifyContent: 'space-between' }} wrap>
          <Space wrap>
            <Input
              placeholder={t('common.search')}
              prefix={<SearchOutlined />}
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              style={{ width: 200 }}
              allowClear
            />
            <Select
              value={statusFilter}
              onChange={setStatusFilter}
              style={{ width: 140 }}
              options={[
                { value: 'all', label: t('common.all') },
                { value: 'PAID', label: t('order.status.paid') },
                { value: 'DELIVERED', label: t('order.status.delivered') },
                { value: 'COMPLETED', label: t('order.status.completed') },
                { value: 'REFUNDING', label: t('order.status.refunding') },
              ]}
            />
            <RangePicker
              onChange={(dates) => setDateRange(dates as [dayjs.Dayjs, dayjs.Dayjs] | null)}
            />
          </Space>
        </Space>

        <Table
          columns={columns}
          dataSource={orders}
          rowKey="id"
          loading={isLoading}
        />
      </Card>

      {/* 订单详情抽屉 */}
      <Drawer
        title={t('order.detail')}
        open={!!detailDrawer}
        onClose={() => setDetailDrawer(null)}
        width={500}
      >
        {detailDrawer && (
          <Descriptions column={1} bordered size="small">
            <Descriptions.Item label={t('order.orderNo')}>
              {detailDrawer.orderNo}
            </Descriptions.Item>
            <Descriptions.Item label={t('order.product')}>
              {detailDrawer.product.title}
            </Descriptions.Item>
            <Descriptions.Item label={t('order.buyer')}>
              {detailDrawer.buyer.username} ({detailDrawer.buyer.email})
            </Descriptions.Item>
            <Descriptions.Item label={t('order.amount')}>
              ${detailDrawer.totalAmount.toFixed(2)}
            </Descriptions.Item>
            <Descriptions.Item label={t('order.status')}>
              <Tag color={statusColors[detailDrawer.orderStatus]}>
                {t(`order.status.${detailDrawer.orderStatus.toLowerCase()}`)}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label={t('order.createdAt')}>
              {dayjs(detailDrawer.createdAt).format('YYYY-MM-DD HH:mm:ss')}
            </Descriptions.Item>
            {detailDrawer.paidAt && (
              <Descriptions.Item label={t('order.paidAt')}>
                {dayjs(detailDrawer.paidAt).format('YYYY-MM-DD HH:mm:ss')}
              </Descriptions.Item>
            )}
            {detailDrawer.deliveredAt && (
              <Descriptions.Item label={t('order.deliveredAt')}>
                {dayjs(detailDrawer.deliveredAt).format('YYYY-MM-DD HH:mm:ss')}
              </Descriptions.Item>
            )}
            {detailDrawer.accountData && (
              <Descriptions.Item label={t('order.accountData')}>
                <TextArea
                  value={detailDrawer.accountData}
                  autoSize={{ minRows: 3, maxRows: 10 }}
                  readOnly
                />
              </Descriptions.Item>
            )}
          </Descriptions>
        )}
      </Drawer>

      {/* 发货弹窗 */}
      <Modal
        title={t('order.deliver')}
        open={!!deliverModal}
        onCancel={() => {
          setDeliverModal(null);
          deliverForm.resetFields();
        }}
        onOk={() => deliverForm.submit()}
        confirmLoading={deliverMutation.isPending}
      >
        <Form
          form={deliverForm}
          onFinish={(values) => {
            if (deliverModal) {
              deliverMutation.mutate({
                orderId: deliverModal.id,
                accountData: values.accountData,
              });
            }
          }}
          layout="vertical"
        >
          <Form.Item
            name="accountData"
            label={t('order.accountData')}
            rules={[{ required: true, message: t('common.required') }]}
          >
            <TextArea rows={6} placeholder={t('order.accountDataPlaceholder')} />
          </Form.Item>
        </Form>
      </Modal>

      {/* 退款处理弹窗 */}
      <Modal
        title={t('order.refundProcess')}
        open={!!refundModal}
        onCancel={() => {
          setRefundModal(null);
          refundForm.resetFields();
        }}
        footer={null}
      >
        <Form
          form={refundForm}
          onFinish={(values) => {
            if (refundModal) {
              refundMutation.mutate({
                orderId: refundModal.id,
                reason: values.reason,
                approved: values.approved,
              });
            }
          }}
          layout="vertical"
        >
          <Form.Item
            name="approved"
            label={t('order.refundAction')}
            rules={[{ required: true }]}
          >
            <Select
              options={[
                { value: true, label: t('order.refundApprove') },
                { value: false, label: t('order.refundReject') },
              ]}
            />
          </Form.Item>
          <Form.Item
            name="reason"
            label={t('order.refundReason')}
          >
            <TextArea rows={3} placeholder={t('order.refundReasonPlaceholder')} />
          </Form.Item>
          <Space>
            <Button onClick={() => {
              setRefundModal(null);
              refundForm.resetFields();
            }}>
              {t('common.cancel')}
            </Button>
            <Button type="primary" htmlType="submit" loading={refundMutation.isPending}>
              {t('common.submit')}
            </Button>
          </Space>
        </Form>
      </Modal>
    </div>
  );
}