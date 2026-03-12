import { useState, useEffect } from 'react';
import { Card, Row, Col, Statistic, Select, Badge, Table } from 'antd';
import {
  AreaChart, Area, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import { UserOutlined, EyeOutlined, RiseOutlined, GlobalOutlined } from '@ant-design/icons';
import apiClient from '@/services/apiClient';
import WorldMap from './WorldMap';

const { Option } = Select;

export default function Analytics() {
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [dayRange, setDayRange] = useState(30);

  const fetchSummary = async () => {
    try {
      const { data } = await apiClient.get('/admin/analytics/summary');
      setSummary(data);
    } catch {
      // fallback mock
      setSummary(getMockData());
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchSummary(); }, []);
  useEffect(() => {
    const t = setInterval(fetchSummary, 30000);
    return () => clearInterval(t);
  }, []);

  const cardStyle = {
    background: 'var(--color-bg-card)',
    border: '1px solid var(--color-border)',
    borderRadius: 14,
  };
  const labelStyle = { color: 'var(--color-text-secondary)', fontSize: 13 };
  const valueStyle = { color: 'var(--color-text-primary)' };

  if (loading) return <div style={{ padding: 48, textAlign: 'center' }}><div className="ant-spin ant-spin-spinning" /></div>;

  const dailySlice = (summary?.daily || []).slice(-(dayRange));

  return (
    <div style={{ padding: 24 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <h2 style={{ color: 'var(--color-text-primary)', margin: 0, fontSize: 22, fontWeight: 700 }}>
          流量分析
        </h2>
        <Badge status="processing" text={<span style={{ color: 'var(--color-text-secondary)', fontSize: 13 }}>每30秒自动刷新</span>} />
      </div>

      {/* KPI 卡片 */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={12} lg={6}>
          <Card style={cardStyle}>
            <Statistic
              title={<span style={labelStyle}>实时在线</span>}
              value={summary?.realtime?.onlineCount ?? 0}
              prefix={<UserOutlined style={{ color: '#22d3ee' }} />}
              valueStyle={{ ...valueStyle, color: '#22d3ee', fontSize: 28 }}
              suffix="人"
            />
          </Card>
        </Col>
        <Col xs={12} lg={6}>
          <Card style={cardStyle}>
            <Statistic
              title={<span style={labelStyle}>今日访问</span>}
              value={summary?.todayVisits ?? 0}
              prefix={<EyeOutlined style={{ color: '#a78bfa' }} />}
              valueStyle={{ ...valueStyle, color: '#a78bfa', fontSize: 28 }}
            />
          </Card>
        </Col>
        <Col xs={12} lg={6}>
          <Card style={cardStyle}>
            <Statistic
              title={<span style={labelStyle}>较昨日</span>}
              value={Math.abs(summary?.todayVsYesterday ?? 0)}
              prefix={<RiseOutlined style={{ color: (summary?.todayVsYesterday ?? 0) >= 0 ? '#4ade80' : '#f87171' }} />}
              valueStyle={{ ...valueStyle, color: (summary?.todayVsYesterday ?? 0) >= 0 ? '#4ade80' : '#f87171', fontSize: 28 }}
              suffix="%"
            />
          </Card>
        </Col>
        <Col xs={12} lg={6}>
          <Card style={cardStyle}>
            <Statistic
              title={<span style={labelStyle}>覆盖国家</span>}
              value={summary?.geo?.length ?? 0}
              prefix={<GlobalOutlined style={{ color: '#fb923c' }} />}
              valueStyle={{ ...valueStyle, color: '#fb923c', fontSize: 28 }}
              suffix="个"
            />
          </Card>
        </Col>
      </Row>

      {/* 24小时折线图 */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} lg={14}>
          <Card style={cardStyle} title={<span style={{ color: 'var(--color-text-primary)' }}>24小时访问波动</span>}>
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={summary?.hourly || []}>
                <defs>
                  <linearGradient id="hourGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#a78bfa" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#a78bfa" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis dataKey="hour" tick={{ fill: 'var(--color-text-secondary)', fontSize: 11 }} interval={3} />
                <YAxis tick={{ fill: 'var(--color-text-secondary)', fontSize: 11 }} />
                <Tooltip contentStyle={{ background: 'var(--color-bg-card)', border: '1px solid var(--color-border)', borderRadius: 8 }} />
                <Area type="monotone" dataKey="visits" stroke="#a78bfa" strokeWidth={2} fill="url(#hourGrad)" dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </Card>
        </Col>
        <Col xs={24} lg={10}>
          <Card
            style={cardStyle}
            title={<span style={{ color: 'var(--color-text-primary)' }}>地区来源 Top 10</span>}
          >
            <Table
              dataSource={(summary?.geo || []).slice(0, 10)}
              rowKey="country"
              pagination={false}
              size="small"
              style={{ background: 'transparent' }}
              columns={[
                { title: '国家', dataIndex: 'countryName', key: 'countryName', render: (v: string, r: any) => <span style={{ color: 'var(--color-text-primary)' }}>{r.country} {v}</span> },
                { title: '访问量', dataIndex: 'visits', key: 'visits', align: 'right', render: (v: number) => <span style={{ color: '#a78bfa', fontWeight: 600 }}>{v.toLocaleString()}</span> },
              ]}
            />
          </Card>
        </Col>
      </Row>

      {/* 30天趋势 + 世界地图 */}
      <Row gutter={[16, 16]}>
        <Col xs={24} lg={14}>
          <Card
            style={cardStyle}
            title={<span style={{ color: 'var(--color-text-primary)' }}>访问趋势</span>}
            extra={
              <Select value={dayRange} onChange={setDayRange} size="small" style={{ width: 90 }}>
                <Option value={7}>7天</Option>
                <Option value={14}>14天</Option>
                <Option value={30}>30天</Option>
              </Select>
            }
          >
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={dailySlice}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis dataKey="date" tick={{ fill: 'var(--color-text-secondary)', fontSize: 11 }} interval={Math.floor(dailySlice.length / 6)} />
                <YAxis tick={{ fill: 'var(--color-text-secondary)', fontSize: 11 }} />
                <Tooltip contentStyle={{ background: 'var(--color-bg-card)', border: '1px solid var(--color-border)', borderRadius: 8 }} />
                <Line type="monotone" dataKey="visits" stroke="#22d3ee" strokeWidth={2} dot={false} activeDot={{ r: 5, fill: '#22d3ee' }} />
              </LineChart>
            </ResponsiveContainer>
          </Card>
        </Col>
        <Col xs={24} lg={10}>
          <Card style={{ ...cardStyle, minHeight: 280 }} title={<span style={{ color: 'var(--color-text-primary)' }}>世界地图分布</span>}>
            <WorldMap geoData={summary?.geo || []} />
          </Card>
        </Col>
      </Row>
    </div>
  );
}

function getMockData() {
  const now = new Date();
  return {
    realtime: { onlineCount: 42 },
    todayVisits: 1280,
    todayVsYesterday: 12,
    hourly: Array.from({ length: 24 }, (_, i) => ({
      hour: `${String(i).padStart(2, '0')}:00`,
      visits: Math.floor(Math.random() * 180 + 20),
    })),
    daily: Array.from({ length: 30 }, (_, i) => {
      const d = new Date(now); d.setDate(d.getDate() - (29 - i));
      return { date: `${d.getMonth() + 1}-${String(d.getDate()).padStart(2, '0')}`, visits: Math.floor(Math.random() * 2000 + 300) };
    }),
    geo: [
      { country: 'CN', countryName: '中国', visits: 1840 },
      { country: 'US', countryName: '美国', visits: 620 },
      { country: 'SG', countryName: '新加坡', visits: 310 },
      { country: 'JP', countryName: '日本', visits: 205 },
      { country: 'TH', countryName: '泰国', visits: 180 },
      { country: 'MY', countryName: '马来西亚', visits: 160 },
      { country: 'ID', countryName: '印尼', visits: 140 },
      { country: 'GB', countryName: '英国', visits: 120 },
      { country: 'DE', countryName: '德国', visits: 95 },
      { country: 'AU', countryName: '澳大利亚', visits: 88 },
    ],
  };
}
