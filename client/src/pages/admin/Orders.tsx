import { useState, useEffect, useCallback } from 'react';
import {
  Table, Card, Input, Select, Button, Tag, Space, Modal, Typography, Breadcrumb, Skeleton, DatePicker, message
} from 'antd';
import {
  HomeOutlined, SearchOutlined, EyeOutlined, CheckCircleOutlined, RollbackOutlined
} from '@ant-design/icons';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import { getOrders, refundOrder, forceCompleteOrder, type Order, type AdminQueryParams } from '@/services/admin';

const { Title } = Typography;
const { RangePicker } = DatePicker;

const STATUS_COLORS: Record<string, string> = {
  PENDING: 'default',
  PAID: 'blue',
  COMPLETED: 'green',
  REFUNDED: 'orange',
  DISPUTED: 'red',
};

export default function Orders() {
  const { t } = useTranslation();
  const [searchText, setSearchText] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [dateRange, setDateRange] = useState<[dayjs.Dayjs | null, dayjs.Dayjs | null] | null>(null);
  const [loading, setLoading] = useState(false);
  const [orders, setOrders] = useState<Order[]>([]);
  const [total, setTotal] = useState(0);
  const pageSize = 20;

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      const params: AdminQueryParams = {
        search: searchText || undefined,
        status: statusFilter !== 'all' ? statusFilter : undefined,
        page: currentPage,
        pageSize,
        startDate: dateRange?.[0]?.format('YYYY-MM-DD') || undefined,
        endDate: dateRange?.[1]?.format('YYYY-MM-DD') || undefined,
      };
      const response = await getOrders(params);
      setOrders(response.items || []);
      setTotal(response.total || 0);
    } catch {
      message.error(t('common.fetchError', '获取数据失败'));
    } finally {
      setLoading(false);
    }
  }, [searchText, statusFilter, currentPage, dateRange, t]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const handleForceComplete = (order: Order) => {
    Modal.confirm({
      title: t('admin.confirmForceComplete'),
      content: t('admin.confirmForceCompleteContent', `确定要强制完成订单 ${order.orderNo} 吗？`),
      okText: t('common.confirm'),
      cancelText: t('common.cancel'),
      onOk: async () => {
        try {
          await forceCompleteOrder(order.id);
          message.success(t('common.success', '操作成功'));
          fetchOrders();
        } catch {
          message.error(t('common.error', '操作失败'));
        }
      },
    });
  };

  const handleForceRefund = (order: Order) => {
    Modal.confirm({
      title: t('admin.confirmForceRefund'),
      content: t('admin.confirmForceRefundContent', `确定要强制退款订单 ${order.orderNo} 吗？退款金额将返还给买家。`),
      okText: t('common.confirm'),
      okType: 'danger',
      cancelText: t('common.cancel'),
      onOk: async () => {
        try {
          await refundOrder(order.id);
          message.success(t('common.success', '操作成功'));
          fetchOrders();
        } catch {
          message.error(t('common.error', '操作失败'));
        }
      },
    });
  };

  const columns: ColumnsType<Order> = [
    {
      title: t('admin.orderNo'),
      dataIndex: 'orderNo',
      key: 'orderNo',
      render: (text: string) => <span style={{ color: 'var(--color-accent)' }}>{text}</span>,
    },
    {
      title: t('admin.buyer'),
      dataIndex: 'buyer',
      key: 'buyer',
      render: (text: string) => <span style={{ color: 'var(--color-text-primary)' }}>{text}</span>,
    },
    {
      title: t('admin.seller'),
      dataIndex: 'seller',
      key: 'seller',
      render: (text: string) => <span style={{ color: 'var(--color-text-secondary)' }}>{text}</span>,
    },
    {
      title: t('admin.amount'),
      dataIndex: 'amount',
      key: 'amount',
      render: (amount: number) => <span style={{ color: 'var(--color-accent)', fontWeight: 600 }}>${amount.toFixed(2)}</span>,
    },
    {
      title: t('admin.status'),
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => (
        <Tag color={STATUS_COLORS[status]}>{t(`admin.orderStatus${status}`, status)}</Tag>
      ),
    },
    {
      title: t('admin.createdAt'),
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (text: string) => <span style={{ color: 'var(--color-text-secondary)' }}>{text}</span>,
    },
    {
      title: t('admin.actions'),
      key: 'actions',
      render: (_: unknown, record: Order) => (
        <Space>
          <Button type="link" size="small" icon={<EyeOutlined />}>
            {t('admin.viewDetails')}
          </Button>
          {record.status === 'PAID' && (
            <>
              <Button 
                type="link" 
                size="small" 
                style={{ color: 'var(--color-success)' }}
                icon={<CheckCircleOutlined />}
                onClick={() => handleForceComplete(record)}
              >
                {t('admin.forceComplete')}
              </Button>
              <Button 
                type="link" 
                size="small" 
                danger
                icon={<RollbackOutlined />}
                onClick={() => handleForceRefund(record)}
              >
                {t('admin.forceRefund')}
              </Button>
            </>
          )}
          {record.status === 'DISPUTED' && (
            <>
              <Button 
                type="link" 
                size="small" 
                style={{ color: 'var(--color-success)' }}
                icon={<CheckCircleOutlined />}
                onClick={() => handleForceComplete(record)}
              >
                {t('admin.forceComplete')}
              </Button>
              <Button 
                type="link" 
                size="small" 
                danger
                icon={<RollbackOutlined />}
                onClick={() => handleForceRefund(record)}
              >
                {t('admin.forceRefund')}
              </Button>
            </>
          )}
        </Space>
      ),
    },
  ];

  if (loading && orders.length === 0) {
    return (
      <div style={{ padding: 24 }}>
        <Skeleton active paragraph={{ rows: 10 }} />
      </div>
    );
  }

  return (
    <div style={{ padding: '24px' }}>
      <Breadcrumb
        style={{ marginBottom: 24 }}
        items={[
          { title: <Link to="/"><HomeOutlined /></Link> },
          { title: t('nav.admin') },
          { title: t('admin.ordersManagement') },
        ]}
      />

      <Title level={3} style={{ color: 'var(--color-text-primary)', marginBottom: 24 }}>
        {t('admin.ordersManagement')}
      </Title>

      <Card style={{ background: 'var(--color-bg-card)', border: '1px solid var(--color-border)', borderRadius: 14 }}>
        <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
          <Select
            value={statusFilter}
            onChange={(value) => { setStatusFilter(value); setCurrentPage(1); }}
            style={{ width: 120 }}
            options={[
              { value: 'all', label: t('admin.allStatus') },
              { value: 'PENDING', label: t('admin.orderStatusPENDING') },
              { value: 'PAID', label: t('admin.orderStatusPAID') },
              { value: 'COMPLETED', label: t('admin.orderStatusCOMPLETED') },
              { value: 'REFUNDED', label: t('admin.orderStatusREFUNDED') },
              { value: 'DISPUTED', label: t('admin.orderStatusDISPUTED') },
            ]}
          />
          <RangePicker
            value={dateRange}
            onChange={(dates) => { setDateRange(dates); setCurrentPage(1); }}
            style={{ background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)' }}
          />
          <Input
            placeholder={t('admin.searchOrders')}
            prefix={<SearchOutlined />}
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            onPressEnter={() => setCurrentPage(1)}
            style={{ width: 250, background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)' }}
          />
          <Button type="primary" icon={<SearchOutlined />} onClick={() => fetchOrders()}>
            {t('common.search')}
          </Button>
        </div>

        <Table
          columns={columns}
          dataSource={orders}
          rowKey="id"
          loading={loading}
          pagination={{
            current: currentPage,
            pageSize,
            total,
            onChange: setCurrentPage,
            showSizeChanger: false,
            showTotal: (total) => t('admin.totalItems', { count: total }),
          }}
          style={{ background: 'transparent' }}
          scroll={{ x: 900 }}
        />
      </Card>
    </div>
  );
}