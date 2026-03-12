import { useState, useEffect, useCallback } from 'react';
import {
  Table, Card, Input, Select, Button, Tag, Avatar, Space, Modal, Typography, Breadcrumb, Skeleton, Rate, message
} from 'antd';
import {
  HomeOutlined, SearchOutlined, EyeOutlined, ArrowUpOutlined, PauseCircleOutlined, UserOutlined
} from '@ant-design/icons';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import type { ColumnsType } from 'antd/es/table';
import { getSellers, updateSellerLevel, toggleSellerStatus, type Seller, type AdminQueryParams } from '@/services/admin';

const { Title } = Typography;

const LEVEL_COLORS: Record<string, string> = {
  NORMAL: 'default',
  VERIFIED: 'blue',
  PREMIUM: 'gold',
};

export default function Sellers() {
  const { t } = useTranslation();
  const [searchText, setSearchText] = useState('');
  const [levelFilter, setLevelFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [sellers, setSellers] = useState<Seller[]>([]);
  const [total, setTotal] = useState(0);
  const pageSize = 20;

  const fetchSellers = useCallback(async () => {
    setLoading(true);
    try {
      const params: AdminQueryParams = {
        search: searchText || undefined,
        level: levelFilter !== 'all' ? levelFilter : undefined,
        status: statusFilter !== 'all' ? statusFilter : undefined,
        page: currentPage,
        pageSize,
      };
      const response = await getSellers(params);
      setSellers(response.items || []);
      setTotal(response.total || 0);
    } catch {
      message.error(t('common.fetchError', '获取数据失败'));
    } finally {
      setLoading(false);
    }
  }, [searchText, levelFilter, statusFilter, currentPage, t]);

  useEffect(() => {
    fetchSellers();
  }, [fetchSellers]);

  const handleUpgradeLevel = (seller: Seller) => {
    const levels = ['NORMAL', 'VERIFIED', 'PREMIUM'];
    const currentIndex = levels.indexOf(seller.level);
    const nextLevel = levels[currentIndex + 1] as 'VERIFIED' | 'PREMIUM' | undefined;
    
    if (!nextLevel) {
      Modal.info({
        title: t('admin.maxLevelReached'),
        content: t('admin.maxLevelReachedContent', '该卖家已达到最高等级。'),
      });
      return;
    }

    Modal.confirm({
      title: t('admin.confirmUpgrade'),
      content: t('admin.confirmUpgradeContent', `确定要将卖家「${seller.shopName}」升级为 ${nextLevel} 吗？`),
      okText: t('common.confirm'),
      cancelText: t('common.cancel'),
      onOk: async () => {
        try {
          await updateSellerLevel(seller.id, nextLevel);
          message.success(t('common.success', '操作成功'));
          fetchSellers();
        } catch {
          message.error(t('common.error', '操作失败'));
        }
      },
    });
  };

  const handlePauseSeller = (seller: Seller) => {
    Modal.confirm({
      title: seller.status === 'ACTIVE' ? t('admin.confirmPause') : t('admin.confirmResume'),
      content: seller.status === 'ACTIVE' 
        ? t('admin.confirmPauseContent', `确定要暂停卖家「${seller.shopName}」的经营权限吗？`)
        : t('admin.confirmResumeContent', `确定要恢复卖家「${seller.shopName}」的经营权限吗？`),
      okText: t('common.confirm'),
      cancelText: t('common.cancel'),
      onOk: async () => {
        try {
          await toggleSellerStatus(seller.id);
          message.success(t('common.success', '操作成功'));
          fetchSellers();
        } catch {
          message.error(t('common.error', '操作失败'));
        }
      },
    });
  };

  const columns: ColumnsType<Seller> = [
    {
      title: t('admin.shopName'),
      dataIndex: 'shopName',
      key: 'shopName',
      render: (text: string, record: Seller) => (
        <Space>
          <Avatar src={record.avatar} icon={<UserOutlined />} />
          <span style={{ color: 'var(--color-text-primary)' }}>{text}</span>
        </Space>
      ),
    },
    {
      title: t('admin.sellerAccount'),
      dataIndex: 'username',
      key: 'username',
      render: (text: string) => <span style={{ color: 'var(--color-text-secondary)' }}>{text}</span>,
    },
    {
      title: t('admin.level'),
      dataIndex: 'level',
      key: 'level',
      render: (level: string) => (
        <Tag color={LEVEL_COLORS[level]}>{t(`admin.level${level}`, level)}</Tag>
      ),
    },
    {
      title: t('admin.productCount'),
      dataIndex: 'productCount',
      key: 'productCount',
      render: (count: number) => <span style={{ color: 'var(--color-text-primary)' }}>{count}</span>,
    },
    {
      title: t('admin.totalSales'),
      dataIndex: 'totalSales',
      key: 'totalSales',
      render: (sales: number) => <span style={{ color: 'var(--color-accent)', fontWeight: 600 }}>${sales.toFixed(2)}</span>,
    },
    {
      title: t('admin.rating'),
      dataIndex: 'rating',
      key: 'rating',
      render: (rating: number) => <Rate disabled defaultValue={rating} allowHalf style={{ fontSize: 14 }} />,
    },
    {
      title: t('admin.status'),
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => (
        <Tag color={status === 'ACTIVE' ? 'green' : 'orange'}>
          {t(`admin.sellerStatus${status}`, status)}
        </Tag>
      ),
    },
    {
      title: t('admin.actions'),
      key: 'actions',
      render: (_: unknown, record: Seller) => (
        <Space>
          <Button type="link" size="small" icon={<EyeOutlined />}>
            {t('admin.view')}
          </Button>
          {record.level !== 'PREMIUM' && (
            <Button 
              type="link" 
              size="small" 
              style={{ color: 'var(--color-warning)' }}
              icon={<ArrowUpOutlined />}
              onClick={() => handleUpgradeLevel(record)}
            >
              {t('admin.upgrade')}
            </Button>
          )}
          <Button 
            type="link" 
            size="small" 
            danger={record.status === 'ACTIVE'}
            icon={<PauseCircleOutlined />}
            onClick={() => handlePauseSeller(record)}
          >
            {record.status === 'ACTIVE' ? t('admin.pause') : t('admin.resume')}
          </Button>
        </Space>
      ),
    },
  ];

  if (loading && sellers.length === 0) {
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
          { title: t('admin.sellersManagement') },
        ]}
      />

      <Title level={3} style={{ color: 'var(--color-text-primary)', marginBottom: 24 }}>
        {t('admin.sellersManagement')}
      </Title>

      <Card style={{ background: 'var(--color-bg-card)', border: '1px solid var(--color-border)', borderRadius: 14 }}>
        <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
          <Select
            value={levelFilter}
            onChange={(value) => { setLevelFilter(value); setCurrentPage(1); }}
            style={{ width: 120 }}
            options={[
              { value: 'all', label: t('admin.allLevels') },
              { value: 'NORMAL', label: t('admin.levelNORMAL') },
              { value: 'VERIFIED', label: t('admin.levelVERIFIED') },
              { value: 'PREMIUM', label: t('admin.levelPREMIUM') },
            ]}
          />
          <Select
            value={statusFilter}
            onChange={(value) => { setStatusFilter(value); setCurrentPage(1); }}
            style={{ width: 120 }}
            options={[
              { value: 'all', label: t('admin.allStatus') },
              { value: 'ACTIVE', label: t('admin.sellerStatusACTIVE') },
              { value: 'SUSPENDED', label: t('admin.sellerStatusSUSPENDED') },
            ]}
          />
          <Input
            placeholder={t('admin.searchSellers')}
            prefix={<SearchOutlined />}
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            onPressEnter={() => setCurrentPage(1)}
            style={{ width: 250, background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)' }}
          />
          <Button type="primary" icon={<SearchOutlined />} onClick={() => fetchSellers()}>
            {t('common.search')}
          </Button>
        </div>

        <Table
          columns={columns}
          dataSource={sellers}
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
          scroll={{ x: 1000 }}
        />
      </Card>
    </div>
  );
}