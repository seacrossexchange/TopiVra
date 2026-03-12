import { useEffect, useState } from 'react';
import { Card, Row, Col, Statistic, Typography, Skeleton } from 'antd';
import {
  UserOutlined, ShoppingCartOutlined, DollarOutlined,
  EyeOutlined, RiseOutlined, GlobalOutlined, FileTextOutlined,
} from '@ant-design/icons';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import apiClient from '@/services/apiClient';

const { Title } = Typography;

export default function Dashboard() {
  const { t } = useTranslation();
  const [stats, setStats] = useState<any>(null);
  const [analytics, setAnalytics] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [pendingProducts, setPendingProducts] = useState(0);

  useEffect(() => {
    Promise.all([
      apiClient.get('/admin/dashboard/stats').catch(() => ({ data: null })),
      apiClient.get('/admin/analytics/summary').catch(() => ({ data: null })),
      apiClient.get('/admin/products?status=PENDING&pageSize=1').catch(() => ({ data: null })),
    ]).then(([s, a, p]) => {
      setStats(s.data);
      setAnalytics(a.data);
      setPendingProducts(p.data?.total ?? 0);
    }).finally(() => setLoading(false));
  }, []);

  if (loading) return <div style={{ padding: 24 }}><Skeleton active paragraph={{ rows: 10 }} /></div>;

  const card = {
    background: 'var(--color-bg-card)',
    border: '1px solid var(--color-border)',
    borderRadius: 14,
  };
  const lbl = { color: 'var(--color-text-secondary)' };
  const val = { color: 'var(--color-text-primary)' };

  return (
    <div style={{ padding: 24 }}>
      <Title level={3} style={{ color: 'var(--color-text-primary)', marginBottom: 24 }}>
        {t('admin.dashboard')}
      </Title>

      {/* 业务统计 */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={12} lg={6}>
          <Card style={card}>
            <Statistic title={<span style={lbl}>{t('admin.totalUsers')}</span>} value={stats?.userCount ?? 0} prefix={<UserOutlined style={{ color: 'var(--color-accent)' }} />} valueStyle={val} />
          </Card>
        </Col>
        <Col xs={12} lg={6}>
          <Card style={card}>
            <Statistic title={<span style={lbl}>{t('admin.totalOrders')}</span>} value={stats?.orderCount ?? 0} prefix={<ShoppingCartOutlined style={{ color: 'var(--color-warning)' }} />} valueStyle={val} />
          </Card>
        </Col>
        <Col xs={12} lg={6}>
          <Card style={card}>
            <Statistic title={<span style={lbl}>总收入</span>} value={stats?.totalRevenue ?? 0} precision={2} prefix={<DollarOutlined style={{ color: 'var(--color-success)' }} />} valueStyle={val} />
          </Card>
        </Col>
        <Col xs={12} lg={6}>
          <Card style={card}>
            <Statistic title={<span style={lbl}>待处理工单</span>} value={stats?.pendingTickets ?? 0} prefix={<FileTextOutlined style={{ color: 'var(--color-danger)' }} />} valueStyle={val} />
          </Card>
        </Col>
      </Row>

      {/* 流量快照 */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={12} lg={6}>
          <Card style={{ ...card, borderColor: '#22d3ee44' }}>
            <Statistic
              title={<span style={lbl}>实时在线</span>}
              value={analytics?.realtime?.onlineCount ?? 0}
              prefix={<EyeOutlined style={{ color: '#22d3ee' }} />}
              valueStyle={{ ...val, color: '#22d3ee' }}
              suffix="人"
            />
          </Card>
        </Col>
        <Col xs={12} lg={6}>
          <Card style={{ ...card, borderColor: '#a78bfa44' }}>
            <Statistic
              title={<span style={lbl}>今日访问</span>}
              value={analytics?.todayVisits ?? 0}
              prefix={<RiseOutlined style={{ color: '#a78bfa' }} />}
              valueStyle={{ ...val, color: '#a78bfa' }}
            />
          </Card>
        </Col>
        <Col xs={12} lg={6}>
          <Card style={{ ...card, borderColor: '#4ade8044' }}>
            <Statistic
              title={<span style={lbl}>较昨日</span>}
              value={Math.abs(analytics?.todayVsYesterday ?? 0)}
              prefix={<RiseOutlined style={{ color: (analytics?.todayVsYesterday ?? 0) >= 0 ? '#4ade80' : '#f87171' }} />}
              valueStyle={{ ...val, color: (analytics?.todayVsYesterday ?? 0) >= 0 ? '#4ade80' : '#f87171' }}
              suffix="%"
            />
          </Card>
        </Col>
        <Col xs={12} lg={6}>
          <Card style={{ ...card, borderColor: '#fb923c44' }}>
            <Statistic
              title={<span style={lbl}>覆盖国家</span>}
              value={analytics?.geo?.length ?? 0}
              prefix={<GlobalOutlined style={{ color: '#fb923c' }} />}
              valueStyle={{ ...val, color: '#fb923c' }}
              suffix="个"
            />
          </Card>
        </Col>
      </Row>

      {/* 24小时访问图 + 快捷操作 */}
      <Row gutter={[16, 16]}>
        <Col xs={24} lg={14}>
          <Card
            style={card}
            title={<span style={{ color: 'var(--color-text-primary)' }}>24小时访问波动</span>}
            extra={<Link to="/admin/analytics" style={{ color: 'var(--color-accent)', fontSize: 13 }}>查看详细分析 →</Link>}
          >
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={analytics?.hourly || []}>
                <defs>
                  <linearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#a78bfa" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#a78bfa" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis dataKey="hour" tick={{ fill: 'var(--color-text-secondary)', fontSize: 10 }} interval={4} />
                <YAxis tick={{ fill: 'var(--color-text-secondary)', fontSize: 10 }} />
                <Tooltip contentStyle={{ background: 'var(--color-bg-card)', border: '1px solid var(--color-border)', borderRadius: 8 }} />
                <Area type="monotone" dataKey="visits" stroke="#a78bfa" strokeWidth={2} fill="url(#grad)" dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </Card>
        </Col>
        <Col xs={24} lg={10}>
          <Card style={card} title={<span style={{ color: 'var(--color-text-primary)' }}>{t('admin.pendingReview')}</span>}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {[
                { to: '/admin/products', label: t('admin.pendingProducts'), val: pendingProducts, color: 'var(--color-warning)' },
                { to: '/admin/tickets', label: t('admin.pendingTickets'), val: stats?.pendingTickets ?? 0, color: 'var(--color-danger)' },
                { to: '/admin/orders', label: t('admin.disputedOrders'), val: 3, color: 'var(--color-accent)' },
                { to: '/admin/analytics', label: '流量分析', val: '→', color: '#22d3ee' },
              ].map((item) => (
                <Link key={item.to} to={item.to} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', background: 'var(--color-bg-secondary)', borderRadius: 8 }}>
                  <span style={{ color: 'var(--color-text-primary)' }}>{item.label}</span>
                  <span style={{ color: item.color, fontWeight: 600 }}>{item.val}</span>
                </Link>
              ))}
            </div>
          </Card>
        </Col>
      </Row>
    </div>
  );
}
