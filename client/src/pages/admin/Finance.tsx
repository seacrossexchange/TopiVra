import { useState, useEffect, useCallback } from 'react';
import {
  Table, Card, Input, Select, Button, Tag, Typography, Breadcrumb, Skeleton, DatePicker, Statistic, Row, Col, message
} from 'antd';
import {
  HomeOutlined, SearchOutlined, ArrowUpOutlined, ArrowDownOutlined, TransactionOutlined
} from '@ant-design/icons';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import { getTransactions, getFinanceStats, type Transaction, type AdminQueryParams } from '@/services/admin';

const { Title } = Typography;
const { RangePicker } = DatePicker;

const TYPE_COLORS: Record<string, string> = {
  ORDER: 'blue',
  WITHDRAWAL: 'orange',
  REFUND: 'red',
  COMMISSION: 'green',
};

const TYPE_ICONS: Record<string, React.ReactNode> = {
  ORDER: <TransactionOutlined />,
  WITHDRAWAL: <ArrowUpOutlined />,
  REFUND: <ArrowDownOutlined />,
  COMMISSION: <TransactionOutlined />,
};

export default function Finance() {
  const { t } = useTranslation();
  const [searchText, setSearchText] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [dateRange, setDateRange] = useState<[dayjs.Dayjs | null, dayjs.Dayjs | null] | null>(null);
  const [loading, setLoading] = useState(false);
  const [statsLoading, setStatsLoading] = useState(false);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [total, setTotal] = useState(0);
  const [stats, setStats] = useState({
    totalRevenue: 0,
    totalCommission: 0,
    totalWithdrawals: 0,
    totalOrders: 0,
  });
  const pageSize = 20;

  const fetchTransactions = useCallback(async () => {
    setLoading(true);
    try {
      const params: AdminQueryParams = {
        search: searchText || undefined,
        type: typeFilter !== 'all' ? typeFilter : undefined,
        page: currentPage,
        pageSize,
        startDate: dateRange?.[0]?.format('YYYY-MM-DD') || undefined,
        endDate: dateRange?.[1]?.format('YYYY-MM-DD') || undefined,
      };
      const response = await getTransactions(params);
      setTransactions(response.items || []);
      setTotal(response.total || 0);
    } catch {
      // Error handled by user feedback
      message.error(t('common.fetchError', '获取数据失败'));
    } finally {
      setLoading(false);
    }
  }, [searchText, typeFilter, currentPage, dateRange, t]);

  const fetchStats = useCallback(async () => {
    setStatsLoading(true);
    try {
      const response = await getFinanceStats();
      setStats(response);
    } catch {
      // Stats load failure - using defaults
    } finally {
      setStatsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  const columns: ColumnsType<Transaction> = [
    {
      title: t('admin.transactionId'),
      dataIndex: 'id',
      key: 'id',
      width: 100,
      render: (text: string) => <span style={{ color: 'var(--color-text-secondary)', fontSize: 12 }}>{text.slice(0, 8)}...</span>,
    },
    {
      title: t('admin.type'),
      dataIndex: 'type',
      key: 'type',
      render: (type: string) => (
        <Tag color={TYPE_COLORS[type]} icon={TYPE_ICONS[type]}>
          {t(`admin.transactionType${type}`, type)}
        </Tag>
      ),
    },
    {
      title: t('admin.amount'),
      dataIndex: 'amount',
      key: 'amount',
      render: (amount: number, record: Transaction) => (
        <span style={{ 
          color: ['ORDER', 'COMMISSION'].includes(record.type) ? 'var(--color-success)' : 'var(--color-danger)', 
          fontWeight: 600 
        }}>
          {['ORDER', 'COMMISSION'].includes(record.type) ? '+' : '-'}${Math.abs(amount).toFixed(2)}
        </span>
      ),
    },
    {
      title: t('admin.balance'),
      dataIndex: 'balance',
      key: 'balance',
      render: (balance: number) => <span style={{ color: 'var(--color-text-primary)' }}>${balance.toFixed(2)}</span>,
    },
    {
      title: t('admin.user'),
      dataIndex: 'user',
      key: 'user',
      render: (text: string) => <span style={{ color: 'var(--color-text-secondary)' }}>{text}</span>,
    },
    {
      title: t('admin.orderNo'),
      dataIndex: 'orderNo',
      key: 'orderNo',
      render: (text?: string) => text ? (
        <span style={{ color: 'var(--color-accent)' }}>{text}</span>
      ) : (
        <span style={{ color: 'var(--color-text-tertiary)' }}>-</span>
      ),
    },
    {
      title: t('admin.createdAt'),
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (text: string) => <span style={{ color: 'var(--color-text-secondary)' }}>{text}</span>,
    },
  ];

  if (loading && transactions.length === 0 && statsLoading) {
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
          { title: t('admin.financeManagement') },
        ]}
      />

      <Title level={3} style={{ color: 'var(--color-text-primary)', marginBottom: 24 }}>
        {t('admin.financeManagement')}
      </Title>

      {/* 统计卡片 */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12} lg={6}>
          <Card style={{ background: 'var(--color-bg-card)', border: '1px solid var(--color-border)', borderRadius: 14 }}>
            <Statistic
              title={<span style={{ color: 'var(--color-text-secondary)' }}>{t('admin.totalRevenue')}</span>}
              value={stats.totalRevenue}
              precision={2}
              prefix={<span style={{ color: 'var(--color-success)' }}>$</span>}
              valueStyle={{ color: 'var(--color-text-primary)' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card style={{ background: 'var(--color-bg-card)', border: '1px solid var(--color-border)', borderRadius: 14 }}>
            <Statistic
              title={<span style={{ color: 'var(--color-text-secondary)' }}>{t('admin.totalCommission')}</span>}
              value={stats.totalCommission}
              precision={2}
              prefix={<span style={{ color: 'var(--color-success)' }}>$</span>}
              valueStyle={{ color: 'var(--color-text-primary)' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card style={{ background: 'var(--color-bg-card)', border: '1px solid var(--color-border)', borderRadius: 14 }}>
            <Statistic
              title={<span style={{ color: 'var(--color-text-secondary)' }}>{t('admin.totalWithdrawals')}</span>}
              value={stats.totalWithdrawals}
              precision={2}
              prefix={<span style={{ color: 'var(--color-warning)' }}>$</span>}
              valueStyle={{ color: 'var(--color-text-primary)' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card style={{ background: 'var(--color-bg-card)', border: '1px solid var(--color-border)', borderRadius: 14 }}>
            <Statistic
              title={<span style={{ color: 'var(--color-text-secondary)' }}>{t('admin.totalOrders')}</span>}
              value={stats.totalOrders}
              valueStyle={{ color: 'var(--color-text-primary)' }}
            />
          </Card>
        </Col>
      </Row>

      {/* 交易记录 */}
      <Card style={{ background: 'var(--color-bg-card)', border: '1px solid var(--color-border)', borderRadius: 14 }}>
        <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
          <Select
            value={typeFilter}
            onChange={(value) => { setTypeFilter(value); setCurrentPage(1); }}
            style={{ width: 120 }}
            options={[
              { value: 'all', label: t('admin.allTypes') },
              { value: 'ORDER', label: t('admin.transactionTypeORDER') },
              { value: 'WITHDRAWAL', label: t('admin.transactionTypeWITHDRAWAL') },
              { value: 'REFUND', label: t('admin.transactionTypeREFUND') },
              { value: 'COMMISSION', label: t('admin.transactionTypeCOMMISSION') },
            ]}
          />
          <RangePicker
            value={dateRange}
            onChange={(dates) => { setDateRange(dates); setCurrentPage(1); }}
            style={{ background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)' }}
          />
          <Input
            placeholder={t('admin.searchTransactions')}
            prefix={<SearchOutlined />}
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            onPressEnter={() => setCurrentPage(1)}
            style={{ width: 250, background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)' }}
          />
          <Button type="primary" icon={<SearchOutlined />} onClick={() => fetchTransactions()}>
            {t('common.search')}
          </Button>
        </div>

        <Table
          columns={columns}
          dataSource={transactions}
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