import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, Table, Tag, Button, Space, Input, Select, message } from 'antd';
import { SearchOutlined, EyeOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import dayjs from 'dayjs';
import apiClient from '@/services/apiClient';
import PageLoading from '@/components/common/PageLoading';
import PageError from '@/components/common/PageError';

interface Order {
  id: string;
  orderNo: string;
  status: string;
  totalAmount: number;
  paymentStatus: string;
  paymentMethod?: string;
  createdAt: string;
  paidAt?: string;
  deliveredAt?: string;
  completedAt?: string;
  cancelledAt?: string;
  items: OrderItem[];
}

interface OrderItem {
  id: string;
  productId: string;
  productTitle: string;
  productCover?: string;
  price: number;
  quantity: number;
  sellerId: string;
  sellerName: string;
  status: string;
  deliveredAt?: string;
  deliveryInfo?: string;
}

export default function Orders() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchText, setSearchText] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // 获取订单列表
  const { data, isLoading, error } = useQuery({
    queryKey: ['user-orders', page, pageSize, statusFilter, searchText],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.append('page', String(page));
      params.append('limit', String(pageSize));
      if (statusFilter !== 'all') {
        params.append('status', statusFilter);
      }
      if (searchText) {
        params.append('search', searchText);
      }
      const response = await apiClient.get(`/orders/my?${params.toString()}`);
      return response.data;
    },
  });

  // 取消订单
  const cancelMutation = useMutation({
    mutationFn: async (orderId: string) => {
      return apiClient.put(`/orders/${orderId}/cancel`);
    },
    onSuccess: () => {
      message.success(t('order.cancelSuccess'));
      queryClient.invalidateQueries({ queryKey: ['user-orders'] });
    },
  });

  // 确认收货
  const confirmMutation = useMutation({
    mutationFn: async (orderId: string) => {
      return apiClient.put(`/orders/${orderId}/confirm`);
    },
    onSuccess: () => {
      message.success(t('order.confirmSuccess'));
      queryClient.invalidateQueries({ queryKey: ['user-orders'] });
    },
  });

  const getStatusTag = (status: string) => {
    const statusMap: Record<string, { color: string; text: string }> = {
      PENDING_PAYMENT: { color: 'warning', text: t('order.pendingPayment') },
      PAID: { color: 'processing', text: t('order.paid') },
      DELIVERED: { color: 'cyan', text: t('order.delivered') },
      COMPLETED: { color: 'success', text: t('order.completed') },
      CANCELLED: { color: 'default', text: t('order.cancelled') },
      REFUND_PENDING: { color: 'orange', text: t('order.refundPending', '退款审核中') },
      REFUNDED: { color: 'magenta', text: t('order.refunded') },
    };
    const { color, text } = statusMap[status] || { color: 'default', text: status };
    return <Tag color={color}>{text}</Tag>;
  };

  const getPaymentStatusTag = (status: string) => {
    const statusMap: Record<string, { color: string; text: string }> = {
      PENDING: { color: 'warning', text: t('order.unpaid') },
      PAID: { color: 'success', text: t('order.paid') },
      REFUNDED: { color: 'default', text: t('order.refunded') },
    };
    const { color, text } = statusMap[status] || { color: 'default', text: status };
    return <Tag color={color}>{text}</Tag>;
  };

  const columns = [
    {
      title: t('order.orderNo'),
      dataIndex: 'orderNo',
      key: 'orderNo',
      width: 160,
    },
    {
      title: t('order.product'),
      dataIndex: 'items',
      key: 'product',
      render: (items: OrderItem[]) => (
        <span>{items?.[0]?.productTitle || '-'}{items?.length > 1 ? ` 等${items.length}件商品` : ''}</span>
      ),
    },
    {
      title: t('order.seller'),
      dataIndex: 'items',
      key: 'seller',
      width: 120,
      render: (items: OrderItem[]) => items?.[0]?.sellerName || '-',
    },
    {
      title: t('order.amount'),
      dataIndex: 'totalAmount',
      key: 'totalAmount',
      width: 100,
      render: (amount: number) => `$${(amount || 0).toFixed(2)}`,
    },
    {
      title: t('order.status'),
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status: string) => getStatusTag(status),
    },
    {
      title: t('order.paymentStatus'),
      dataIndex: 'paymentStatus',
      key: 'paymentStatus',
      width: 100,
      render: (status: string) => getPaymentStatusTag(status),
    },
    {
      title: t('order.createTime'),
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 160,
      render: (date: string) => date ? dayjs(date).format('YYYY-MM-DD HH:mm') : '-',
    },
    {
      title: t('order.action'),
      key: 'action',
      width: 180,
      render: (_: unknown, record: Order) => (
        <Space>
          <Button 
            type="link" 
            size="small" 
            icon={<EyeOutlined />}
            onClick={() => navigate(`/user/orders/${record.id}`)}
          >
            {t('favorite.view')}
          </Button>
          {record.status === 'PENDING_PAYMENT' && (
            <Button 
              type="link" 
              size="small"
              onClick={() => cancelMutation.mutate(record.id)}
              loading={cancelMutation.isPending}
            >
              {t('order.cancel')}
            </Button>
          )}
          {record.status === 'DELIVERED' && (
            <Button 
              type="link" 
              size="small"
              onClick={() => confirmMutation.mutate(record.id)}
              loading={confirmMutation.isPending}
            >
              {t('order.confirm')}
            </Button>
          )}
        </Space>
      ),
    },
  ];

  if (isLoading) {
    return <PageLoading />;
  }

  if (error) {
    return <PageError title={t('common.loadError')} onRetry={() => queryClient.invalidateQueries({ queryKey: ['user-orders'] })} />;
  }

  const orders = data?.items || [];
  const total = data?.total || 0;

  return (
    <div className="orders-page">
      <Card
        title={t('user.myOrders')}
        extra={
          <Space>
            <Input
              placeholder={t('order.search')}
              prefix={<SearchOutlined />}
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              style={{ width: 200 }}
              allowClear
            />
            <Select
              value={statusFilter}
              onChange={setStatusFilter}
              style={{ width: 150 }}
            >
              <Select.Option value="all">{t('order.allStatus')}</Select.Option>
              <Select.Option value="PENDING_PAYMENT">{t('order.pendingPayment')}</Select.Option>
              <Select.Option value="PAID">{t('order.paid')}</Select.Option>
              <Select.Option value="DELIVERED">{t('order.delivered')}</Select.Option>
              <Select.Option value="COMPLETED">{t('order.completed')}</Select.Option>
              <Select.Option value="REFUND_PENDING">{t('order.refundPending', '退款审核中')}</Select.Option>
              <Select.Option value="REFUNDED">{t('order.refunded')}</Select.Option>
            </Select>
          </Space>
        }
      >
        <Table
          columns={columns}
          dataSource={orders}
          rowKey="id"
          pagination={{
            current: page,
            pageSize,
            total,
            showSizeChanger: true,
            showTotal: (total) => t('common.totalItems', { count: total }),
            onChange: (p, ps) => {
              setPage(p);
              setPageSize(ps);
            },
          }}
        />
      </Card>
    </div>
  );
}