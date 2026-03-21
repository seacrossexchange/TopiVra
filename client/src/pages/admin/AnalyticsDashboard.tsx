import { useEffect, useState, useCallback } from 'react';
import { Card, Row, Col, Statistic, Table, Typography } from 'antd';
import { DollarOutlined, ShoppingOutlined, UserOutlined, AppstoreOutlined } from '@ant-design/icons';
import { Line, Pie } from '@ant-design/charts';
import { useTranslation } from 'react-i18next';
import apiClient from '../../services/apiClient';

const { Title } = Typography;

export default function AnalyticsDashboard() {
  const { t } = useTranslation();
  const [overview, setOverview] = useState<any>(null);
  const [salesTrend, setSalesTrend] = useState([]);
  const [topProducts, setTopProducts] = useState([]);
  const [categorySales, setCategorySales] = useState([]);

  const loadData = useCallback(async () => {
    try {
      const [overviewRes, trendRes, productsRes, categoryRes] = await Promise.all([
        apiClient.get('/analytics/overview'),
        apiClient.get('/analytics/sales-trend?days=30'),
        apiClient.get('/analytics/top-products?limit=10'),
        apiClient.get('/analytics/category-sales'),
      ]);
      setOverview(overviewRes.data);
      setSalesTrend(trendRes.data);
      setTopProducts(productsRes.data);
      setCategorySales(categoryRes.data);
    } catch (error) {
      console.error('Failed to load analytics:', error);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const productColumns = [
    { title: t('products.product', '商品'), dataIndex: 'title', key: 'title' },
    { title: t('admin.sales', '销量'), dataIndex: 'salesCount', key: 'salesCount' },
    { title: t('products.detail.price', '价格'), dataIndex: 'price', key: 'price', render: (v: number) => `$${v}` },
  ];

  return (
    <div style={{ padding: 24 }}>
      <Title level={3}>{t('admin.analytics', '流量分析')}</Title>

      {overview && (
        <Row gutter={16} style={{ marginBottom: 24 }}>
          <Col span={6}>
            <Card>
              <Statistic title={t('admin.totalUsers', '用户总数')} value={overview.totalUsers} prefix={<UserOutlined />} />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic title={t('admin.totalOrders', '订单总数')} value={overview.totalOrders} prefix={<ShoppingOutlined />} />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic title={t('admin.totalRevenue', '总收入')} value={overview.totalRevenue} prefix={<DollarOutlined />} precision={2} />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic title={t('admin.totalProducts', '商品总数')} value={overview.totalProducts} prefix={<AppstoreOutlined />} />
            </Card>
          </Col>
        </Row>
      )}

      <Row gutter={16}>
        <Col span={16}>
          <Card title={t('admin.salesTrend30Days', '近30天销售趋势')}>
            <Line data={salesTrend} xField="date" yField="revenue" />
          </Card>
        </Col>
        <Col span={8}>
          <Card title={t('admin.categorySales', '分类销售分布')}>
            <Pie data={categorySales} angleField="totalSales" colorField="name" />
          </Card>
        </Col>
      </Row>

      <Card title={t('admin.topProducts', '热销商品')} style={{ marginTop: 16 }}>
        <Table dataSource={topProducts} columns={productColumns} rowKey="id" />
      </Card>
    </div>
  );
}
