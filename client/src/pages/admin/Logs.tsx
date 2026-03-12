import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Card, Table, Input, Select, DatePicker, Space, Tag, Typography
} from 'antd';
import {
  SearchOutlined
} from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import apiClient from '@/services/apiClient';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;

interface LogEntry {
  id: string;
  adminId: string;
  admin: { id: string; username: string };
  action: string;
  targetType: string;
  targetId?: string;
  targetName?: string;
  ip: string;
  userAgent: string;
  createdAt: string;
  details?: string;
}

export default function AdminLogsPage() {
  const { t } = useTranslation();
  const [searchText, setSearchText] = useState('');
  const [actionFilter, setActionFilter] = useState('all');
  const [dateRange, setDateRange] = useState<[dayjs.Dayjs, dayjs.Dayjs] | null>(null);

  // Fetch logs
  const { data: logsData, isLoading } = useQuery({
    queryKey: ['admin-logs', searchText, actionFilter, dateRange],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (searchText) params.append('search', searchText);
      if (actionFilter !== 'all') params.append('action', actionFilter);
      if (dateRange) {
        params.append('startDate', dateRange[0].format('YYYY-MM-DD'));
        params.append('endDate', dateRange[1].format('YYYY-MM-DD'));
      }
      const response = await apiClient.get(`/admin/logs?${params}`);
      // 兼容 { items, total } 和数组两种格式
      return response.data;
    },
  });

  const logs = Array.isArray(logsData) ? logsData : (logsData?.items || []);

  const actionColors: Record<string, string> = {
    USER_BAN: 'red',
    USER_UNBAN: 'green',
    SELLER_APPROVE: 'green',
    SELLER_REJECT: 'red',
    PRODUCT_DELETE: 'red',
    ORDER_REFUND: 'orange',
    SETTINGS_UPDATE: 'blue',
    LOGIN: 'cyan',
    LOGOUT: 'default',
  };

  const actionLabels: Record<string, string> = {
    USER_BAN: t('logs.action.userBan'),
    USER_UNBAN: t('logs.action.userUnban'),
    SELLER_APPROVE: t('logs.action.sellerApprove'),
    SELLER_REJECT: t('logs.action.sellerReject'),
    PRODUCT_DELETE: t('logs.action.productDelete'),
    ORDER_REFUND: t('logs.action.orderRefund'),
    SETTINGS_UPDATE: t('logs.action.settingsUpdate'),
    LOGIN: t('logs.action.login'),
    LOGOUT: t('logs.action.logout'),
  };

  const columns: ColumnsType<LogEntry> = [
    {
      title: t('logs.time'),
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 160,
      render: (date: string) => dayjs(date).format('YYYY-MM-DD HH:mm:ss'),
    },
    {
      title: t('logs.admin'),
      dataIndex: ['admin', 'username'],
      key: 'admin',
      width: 120,
    },
    {
      title: t('logs.action'),
      dataIndex: 'action',
      key: 'action',
      width: 140,
      render: (action: string) => (
        <Tag color={actionColors[action] || 'default'}>
          {actionLabels[action] || action}
        </Tag>
      ),
    },
    {
      title: t('logs.target'),
      key: 'target',
      render: (_, record) => (
        <Space direction="vertical" size={0}>
          <Text>{record.targetType}</Text>
          {record.targetName && (
            <Text type="secondary" style={{ fontSize: 12 }}>
              {record.targetName}
            </Text>
          )}
        </Space>
      ),
    },
    {
      title: t('logs.ip'),
      dataIndex: 'ip',
      key: 'ip',
      width: 140,
    },
    {
      title: t('logs.details'),
      dataIndex: 'details',
      key: 'details',
      ellipsis: true,
      render: (text: string) => text || '-',
    },
  ];

  const actionOptions = [
    { value: 'all', label: t('common.all') },
    { value: 'USER_BAN', label: t('logs.action.userBan') },
    { value: 'USER_UNBAN', label: t('logs.action.userUnban') },
    { value: 'SELLER_APPROVE', label: t('logs.action.sellerApprove') },
    { value: 'SELLER_REJECT', label: t('logs.action.sellerReject') },
    { value: 'PRODUCT_DELETE', label: t('logs.action.productDelete') },
    { value: 'ORDER_REFUND', label: t('logs.action.orderRefund') },
    { value: 'SETTINGS_UPDATE', label: t('logs.action.settingsUpdate') },
  ];

  return (
    <div>
      <Title level={4}>{t('logs.title')}</Title>

      <Card>
        <Space style={{ marginBottom: 16 }} wrap>
          <Input
            placeholder={t('common.search')}
            prefix={<SearchOutlined />}
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            style={{ width: 200 }}
            allowClear
          />
          <Select
            value={actionFilter}
            onChange={setActionFilter}
            style={{ width: 160 }}
            options={actionOptions}
          />
          <RangePicker
            onChange={(dates) => setDateRange(dates as [dayjs.Dayjs, dayjs.Dayjs] | null)}
          />
        </Space>

        <Table
          columns={columns}
          dataSource={logs}
          rowKey="id"
          loading={isLoading}
          pagination={{
            pageSize: 20,
            showSizeChanger: true,
            showTotal: (total) => t('logs.total', { count: total }),
          }}
        />
      </Card>
    </div>
  );
}