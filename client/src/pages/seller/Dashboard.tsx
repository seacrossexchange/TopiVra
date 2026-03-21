import { useState, useEffect } from 'react';
import { Card, Row, Col, Statistic, Table, Typography, Tag, Space, Avatar } from 'antd';
import {
  ShoppingCartOutlined,
  DollarOutlined,
  ClockCircleOutlined,
  CheckCircleOutlined,
  ShopOutlined,
  StarOutlined,
  RiseOutlined,
} from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import PageLoading from '@/components/common/PageLoading';
import PageError from '@/components/common/PageError';
import apiClient from '@/services/apiClient';
import { extractApiErrorMessage } from '@/utils/errorHandler';

const { Title, Text } = Typography;

interface SellerStats {
  totalSales: number;
  totalOrders: number;
  pendingOrders: number;
  completedOrders: number;
  rating: number;
  balance: number;
  recentOrders: RecentOrder[];
  salesChart: SalesData[];
}

interface RecentOrder {
  id: string;
  orderId: string;
  productId: string;
  sellerId: string;
  quantity: number;
  unitPrice: number;
  sellerAmount: number;
  createdAt: string;
  order: {
    orderNo: string;
    orderStatus: string;
    payAmount: number;
    currency: string;
    createdAt: string;
  };
  product: {
    title: string;
    thumbnailUrl: string;
  };
}

interface SalesData {
  date: string;
  amount: number;
}

const SellerDashboard: React.FC = () => {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<SellerStats | null>(null);

  useEffect(() => {
    fetchDashboardStats();
  }, []);

  const fetchDashboardStats = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await apiClient.get('/sellers/dashboard/stats');
      setStats(response.data);
    } catch (error: unknown) {
      setError(extractApiErrorMessage(error, 'Failed to load dashboard data'));
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      PENDING: 'gold',
      PAID: 'blue',
      DELIVERED: 'cyan',
      COMPLETED: 'green',
      CANCELLED: 'red',
      REFUNDED: 'orange',
    };
    return colors[status] || 'default';
  };

  const orderColumns = [
    {
      title: t('order.orderNo'),
      dataIndex: ['order', 'orderNo'],
      key: 'orderNo',
      width: 150,
    },
    {
      title: t('products.detail.tabs.description'),
      dataIndex: ['product', 'title'],
      key: 'product',
      ellipsis: true,
      render: (title: string, record: RecentOrder) => (
        <Space>
          <Avatar
            shape="square"
            size={40}
            src={record.product?.thumbnailUrl}
            icon={<ShopOutlined />}
          />
          <Text ellipsis style={{ maxWidth: 200 }}>{title}</Text>
        </Space>
      ),
    },
    {
      title: t('products.detail.quantity'),
      dataIndex: 'quantity',
      key: 'quantity',
      width: 80,
    },
    {
      title: t('products.detail.price'),
      dataIndex: 'sellerAmount',
      key: 'amount',
      width: 100,
      render: (amount: number) => `$${Number(amount).toFixed(2)}`,
    },
    {
      title: t('order.status'),
      dataIndex: ['order', 'orderStatus'],
      key: 'status',
      width: 100,
      render: (status: string) => (
        <Tag color={getStatusColor(status)}>
          {t(`order.${status.toLowerCase()}`)}
        </Tag>
      ),
    },
    {
      title: t('order.createTime'),
      dataIndex: ['order', 'createdAt'],
      key: 'createdAt',
      width: 150,
      render: (date: string) => new Date(date).toLocaleString(),
    },
  ];

  if (loading) return <PageLoading />;
  if (error) return <PageError title={error} onRetry={fetchDashboardStats} />;

  return (
    <div className="p-6">
      <Title level={4} className="mb-6">
        {t('seller.dashboard')}
      </Title>

      {/* 统计卡片 */}
      <Row gutter={[16, 16]} className="mb-6">
        <Col xs={12} sm={12} md={6}>
          <Card className="bg-[var(--color-bg-secondary)] border-[var(--color-border)]">
            <Statistic
              title={t('seller.totalRevenue')}
              value={stats?.totalSales || 0}
              precision={2}
              prefix={<DollarOutlined />}
              suffix="USD"
              valueStyle={{ color: 'var(--color-success)' }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={12} md={6}>
          <Card className="bg-[var(--color-bg-secondary)] border-[var(--color-border)]">
            <Statistic
              title={t('seller.totalOrders')}
              value={stats?.totalOrders || 0}
              prefix={<ShoppingCartOutlined />}
              valueStyle={{ color: 'var(--color-primary)' }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={12} md={6}>
          <Card className="bg-[var(--color-bg-secondary)] border-[var(--color-border)]">
            <Statistic
              title={t('seller.pendingOrders')}
              value={stats?.pendingOrders || 0}
              prefix={<ClockCircleOutlined />}
              valueStyle={{ color: 'var(--color-warning)' }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={12} md={6}>
          <Card className="bg-[var(--color-bg-secondary)] border-[var(--color-border)]">
            <Statistic
              title={t('admin.rating')}
              value={stats?.rating || 0}
              prefix={<StarOutlined />}
              suffix="/ 5"
              precision={1}
              valueStyle={{ color: 'var(--color-gold)' }}
            />
          </Card>
        </Col>
      </Row>

      {/* 第二行统计卡片 */}
      <Row gutter={[16, 16]} className="mb-6">
        <Col xs={24} md={12}>
          <Card 
            className="bg-[var(--color-bg-secondary)] border-[var(--color-border)]"
            title={
              <Space>
                <RiseOutlined />
                <span>{t('seller.availableBalance')}</span>
              </Space>
            }
          >
            <Statistic
              value={stats?.balance || 0}
              precision={2}
              prefix="$"
              suffix="USD"
              valueStyle={{ fontSize: 32, color: 'var(--color-success)' }}
            />
          </Card>
        </Col>
        <Col xs={24} md={12}>
          <Card 
            className="bg-[var(--color-bg-secondary)] border-[var(--color-border)]"
            title={
              <Space>
                <CheckCircleOutlined />
                <span>{t('order.completed')}</span>
              </Space>
            }
          >
            <Statistic
              value={stats?.completedOrders || 0}
              valueStyle={{ fontSize: 32, color: 'var(--color-success)' }}
            />
          </Card>
        </Col>
      </Row>

      {/* 最近订单 */}
      <Card 
        className="bg-[var(--color-bg-secondary)] border-[var(--color-border)]"
        title={t('seller.orderList')}
      >
        <Table
          dataSource={stats?.recentOrders || []}
          columns={orderColumns}
          rowKey="id"
          pagination={false}
          scroll={{ x: 800 }}
          size="middle"
        />
      </Card>
    </div>
  );
};

export default SellerDashboard;