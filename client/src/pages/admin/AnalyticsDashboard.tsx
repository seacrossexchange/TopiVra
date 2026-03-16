import { useEffect, useState } from 'react';
import { Card, Row, Col, Statistic, Table } from 'antd';
import { DollarOutlined, ShoppingOutlined, UserOutlined, AppstoreOutlined } from '@ant-design/icons';
import { Line, Pie } from '@ant-design/charts';
import apiClient from '../../services/apiClient';

export default function AnalyticsDashboard() {
  const [overview, setOverview] = useState<any>(null);
  const [salesTrend, setSalesTrend] = useState([]);
  const [topProducts, setTopProducts] = useState([]);
  const [categorySales, setCategorySales] = useState([]);

  async function loadData() {
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
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadData();
  }, []);


  const productColumns = [
    { title: 'Product', dataIndex: 'title', key: 'title' },
    { title: 'Sales', dataIndex: 'salesCount', key: 'salesCount' },
    { title: 'Price', dataIndex: 'price', key: 'price', render: (v: number) => `$${v}` },
  ];

  return (
    <div style={{ padding: 24 }}>
      <h1>Analytics Dashboard</h1>

      {overview && (
        <Row gutter={16} style={{ marginBottom: 24 }}>
          <Col span={6}>
            <Card>
              <Statistic title="Total Users" value={overview.totalUsers} prefix={<UserOutlined />} />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic title="Total Orders" value={overview.totalOrders} prefix={<ShoppingOutlined />} />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic title="Total Revenue" value={overview.totalRevenue} prefix={<DollarOutlined />} precision={2} />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic title="Total Products" value={overview.totalProducts} prefix={<AppstoreOutlined />} />
            </Card>
          </Col>
        </Row>
      )}

      <Row gutter={16}>
        <Col span={16}>
          <Card title="Sales Trend (30 Days)">
            <Line data={salesTrend} xField="date" yField="revenue" />
          </Card>
        </Col>
        <Col span={8}>
          <Card title="Category Sales">
            <Pie data={categorySales} angleField="totalSales" colorField="name" />
          </Card>
        </Col>
      </Row>

      <Card title="Top Products" style={{ marginTop: 16 }}>
        <Table dataSource={topProducts} columns={productColumns} rowKey="id" />
      </Card>
    </div>
  );
}
