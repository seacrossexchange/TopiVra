import { useState, useEffect, useCallback } from 'react';
import {
  Table, Card, Input, Select, Button, Tag, Avatar, Space, Modal, Typography, Breadcrumb, Skeleton, message
} from 'antd';
import {
  HomeOutlined, SearchOutlined, EyeOutlined, StopOutlined, CheckCircleOutlined, DeleteOutlined, UserOutlined
} from '@ant-design/icons';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import type { ColumnsType } from 'antd/es/table';
import { getUsers, updateUserStatus, deleteUser, type User, type AdminQueryParams } from '@/services/admin';

const { Title } = Typography;

const STATUS_COLORS: Record<string, string> = {
  ACTIVE: 'green',
  SUSPENDED: 'orange',
  BANNED: 'red',
};

const ROLE_COLORS: Record<string, string> = {
  USER: 'default',
  SELLER: 'blue',
  ADMIN: 'gold',
};

export default function Users() {
  const { t } = useTranslation();
  const [searchText, setSearchText] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [total, setTotal] = useState(0);
  const pageSize = 20;

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const params: AdminQueryParams = {
        search: searchText || undefined,
        status: statusFilter !== 'all' ? statusFilter : undefined,
        page: currentPage,
        pageSize,
      };
      const response = await getUsers(params);
      setUsers(response.items || []);
      setTotal(response.total || 0);
    } catch {
      message.error(t('common.fetchError', '获取数据失败'));
    } finally {
      setLoading(false);
    }
  }, [searchText, statusFilter, currentPage, t]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleBanUser = async (user: User) => {
    Modal.confirm({
      title: user.status === 'BANNED' ? t('admin.confirmUnban') : t('admin.confirmBan'),
      content: user.status === 'BANNED' 
        ? t('admin.confirmUnbanContent', `确定要解封用户 ${user.username} 吗？`)
        : t('admin.confirmBanContent', `确定要封禁用户 ${user.username} 吗？`),
      okText: t('common.confirm'),
      cancelText: t('common.cancel'),
      onOk: async () => {
        try {
          const newStatus = user.status === 'BANNED' ? 'ACTIVE' : 'BANNED';
          await updateUserStatus(user.id, newStatus);
          message.success(t('common.success', '操作成功'));
          fetchUsers();
        } catch {
          message.error(t('common.error', '操作失败'));
        }
      },
    });
  };

  const handleDeleteUser = (user: User) => {
    Modal.confirm({
      title: t('admin.confirmDelete'),
      content: t('admin.confirmDeleteContent', `确定要删除用户 ${user.username} 吗？此操作不可恢复。`),
      okText: t('common.confirm'),
      okType: 'danger',
      cancelText: t('common.cancel'),
      onOk: async () => {
        try {
          await deleteUser(user.id);
          message.success(t('common.deleteSuccess', '删除成功'));
          fetchUsers();
        } catch {
          message.error(t('common.error', '操作失败'));
        }
      },
    });
  };

  const columns: ColumnsType<User> = [
    {
      title: t('admin.user'),
      dataIndex: 'username',
      key: 'username',
      render: (text: string, record: User) => (
        <Space>
          <Avatar src={record.avatar} icon={<UserOutlined />} />
          <span style={{ color: 'var(--color-text-primary)' }}>{text}</span>
        </Space>
      ),
    },
    {
      title: t('admin.email'),
      dataIndex: 'email',
      key: 'email',
      render: (text: string) => <span style={{ color: 'var(--color-text-secondary)' }}>{text}</span>,
    },
    {
      title: t('admin.role'),
      dataIndex: 'role',
      key: 'role',
      render: (role: string) => (
        <Tag color={ROLE_COLORS[role]}>{t(`admin.role${role}`, role)}</Tag>
      ),
    },
    {
      title: t('admin.status'),
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => (
        <Tag color={STATUS_COLORS[status]}>{t(`admin.status${status}`, status)}</Tag>
      ),
    },
    {
      title: t('admin.registeredAt'),
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (text: string) => <span style={{ color: 'var(--color-text-secondary)' }}>{text}</span>,
    },
    {
      title: t('admin.actions'),
      key: 'actions',
      render: (_: unknown, record: User) => (
        <Space>
          <Button type="link" size="small" icon={<EyeOutlined />}>
            {t('admin.view')}
          </Button>
          <Button 
            type="link" 
            size="small" 
            icon={record.status === 'BANNED' ? <CheckCircleOutlined /> : <StopOutlined />}
            onClick={() => handleBanUser(record)}
          >
            {record.status === 'BANNED' ? t('admin.unban') : t('admin.ban')}
          </Button>
          <Button 
            type="link" 
            size="small" 
            danger 
            icon={<DeleteOutlined />}
            onClick={() => handleDeleteUser(record)}
          >
            {t('admin.delete')}
          </Button>
        </Space>
      ),
    },
  ];

  if (loading && users.length === 0) {
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
          { title: t('admin.usersManagement') },
        ]}
      />

      <Title level={3} style={{ color: 'var(--color-text-primary)', marginBottom: 24 }}>
        {t('admin.usersManagement')}
      </Title>

      <Card style={{ background: 'var(--color-bg-card)', border: '1px solid var(--color-border)', borderRadius: 14 }}>
        <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
          <Input
            placeholder={t('admin.searchUsers')}
            prefix={<SearchOutlined />}
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            onPressEnter={() => setCurrentPage(1)}
            style={{ width: 250, background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)' }}
          />
          <Select
            value={statusFilter}
            onChange={(value) => { setStatusFilter(value); setCurrentPage(1); }}
            style={{ width: 120 }}
            options={[
              { value: 'all', label: t('admin.allStatus') },
              { value: 'ACTIVE', label: t('admin.statusACTIVE') },
              { value: 'SUSPENDED', label: t('admin.statusSUSPENDED') },
              { value: 'BANNED', label: t('admin.statusBANNED') },
            ]}
          />
          <Button type="primary" icon={<SearchOutlined />} onClick={() => fetchUsers()}>
            {t('common.search')}
          </Button>
        </div>

        <Table
          columns={columns}
          dataSource={users}
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
          style={{ 
            background: 'transparent',
          }}
          scroll={{ x: 800 }}
        />
      </Card>
    </div>
  );
}