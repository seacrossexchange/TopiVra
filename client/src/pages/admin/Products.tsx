import { useState, useEffect, useCallback } from 'react';
import {
  Table, Card, Input, Select, Button, Tag, Image, Space, Modal,
  Typography, Breadcrumb, Skeleton, message, Tabs, Row, Col, Switch, Tooltip
} from 'antd';
import {
  HomeOutlined, SearchOutlined, EyeOutlined, CheckCircleOutlined,
  CloseCircleOutlined, DeleteOutlined, StarOutlined
} from '@ant-design/icons';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import type { ColumnsType } from 'antd/es/table';
import {
  getProducts, auditProduct, getAdSlots, updateAdSlots,
  type Product, type AdminQueryParams, type AdSlot
} from '@/services/admin';

const { Title, Text } = Typography;

const STATUS_COLORS: Record<string, string> = {
  PENDING: 'blue',
  APPROVED: 'green',
  REJECTED: 'red',
  ON_SALE: 'geekblue',
};

const PLATFORMS = ['全部', 'Facebook', 'Instagram', 'TikTok', 'Telegram', 'Twitter', 'Gmail', 'Outlook'];
const AD_PLATFORMS = ['TikTok', 'Instagram', 'Facebook', 'Telegram', 'Twitter', 'Gmail', 'Discord', 'YouTube'];
const TAG_OPTIONS = ['', 'HOT', 'NEW', 'SALE', 'TOP'];

// ==================== 广告位管理 ====================
function AdSlotsManager() {
  const [slots, setSlots] = useState<AdSlot[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const fetchSlots = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getAdSlots();
      const filled = [...data];
      while (filled.length < 5) {
        filled.push({ platform: '', label: '零售', price: '', tag: '', enabled: true });
      }
      setSlots(filled.slice(0, 5));
    } catch {
      message.error('获取广告位配置失败');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchSlots(); }, [fetchSlots]);

  const handleSlotChange = (index: number, field: keyof AdSlot, value: string | boolean) => {
    setSlots(prev => prev.map((s, i) => i === index ? { ...s, [field]: value } : s));
  };

  const handleReset = (index: number) => {
    setSlots(prev => prev.map((s, i) =>
      i === index ? { platform: '', label: '零售', price: '', tag: '', enabled: true } : s
    ));
  };

  const handleSave = async () => {
    const validSlots = slots.filter(s => s.platform && s.price);
    if (validSlots.length === 0) {
      message.warning('请至少填写一个完整的广告位（平台 + 价格）');
      return;
    }
    setSaving(true);
    try {
      await updateAdSlots(slots);
      message.success('广告位配置已保存，首页悬浮窗实时更新');
    } catch {
      message.error('保存失败，请重试');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ maxWidth: 860, margin: '0 auto' }}>
      <Card
        style={{
          background: 'var(--color-primary-light)',
          border: '1px solid rgba(var(--color-primary-rgb),0.2)',
          borderRadius: 10, marginBottom: 20,
        }}
        bodyStyle={{ padding: '14px 20px' }}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
          <StarOutlined style={{ color: 'var(--color-primary)', fontSize: 18, marginTop: 2 }} />
          <div>
            <Text strong style={{ color: 'var(--color-primary)', display: 'block', marginBottom: 4 }}>广告位说明</Text>
            <Text style={{ color: 'var(--color-text-secondary)', fontSize: 13 }}>
              首页右侧悬浮窗展示最多 <strong>5 个</strong>广告位商品。
              设置平台、类型、起售价格和标签后点击「保存」即可实时更新。
              已禁用的槽位不在首页显示。
            </Text>
          </div>
        </div>
      </Card>

      {loading ? <Skeleton active paragraph={{ rows: 8 }} /> : (
        <>
          {slots.map((slot, index) => (
            <Card
              key={index}
              style={{
                background: 'var(--color-bg-card)',
                border: `1px solid ${
                  slot.enabled && slot.platform
                    ? 'rgba(var(--color-primary-rgb),0.35)'
                    : 'var(--color-border)'
                }`,
                borderRadius: 10,
                marginBottom: 12,
                opacity: slot.enabled ? 1 : 0.55,
                transition: 'all 0.2s',
              }}
              bodyStyle={{ padding: '14px 18px' }}
            >
              <Row gutter={10} align="middle">
                {/* 序号 */}
                <Col flex="36px">
                  <div style={{
                    width: 30, height: 30, borderRadius: 8,
                    background: slot.enabled && slot.platform ? 'var(--color-primary)' : 'var(--color-bg-hover)',
                    color: slot.enabled && slot.platform ? '#fff' : 'var(--color-text-tertiary)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontWeight: 700, fontSize: 13,
                  }}>
                    {index + 1}
                  </div>
                </Col>

                {/* 平台 */}
                <Col flex="150px">
                  <div style={{ fontSize: 11, color: 'var(--color-text-tertiary)', marginBottom: 3 }}>平台</div>
                  <Select
                    value={slot.platform || undefined}
                    placeholder="选择平台"
                    style={{ width: '100%' }}
                    onChange={v => handleSlotChange(index, 'platform', v)}
                    options={AD_PLATFORMS.map(p => ({ value: p, label: p }))}
                  />
                </Col>

                {/* 类型 */}
                <Col flex="110px">
                  <div style={{ fontSize: 11, color: 'var(--color-text-tertiary)', marginBottom: 3 }}>类型</div>
                  <Select
                    value={slot.label}
                    style={{ width: '100%' }}
                    onChange={v => handleSlotChange(index, 'label', v)}
                    options={[
                      { value: '零售', label: '零售' },
                      { value: '批发', label: '批发' },
                    ]}
                  />
                </Col>

                {/* 价格 */}
                <Col flex="110px">
                  <div style={{ fontSize: 11, color: 'var(--color-text-tertiary)', marginBottom: 3 }}>起售价格</div>
                  <Input
                    value={slot.price}
                    placeholder="如 $12"
                    onChange={e => handleSlotChange(index, 'price', e.target.value)}
                    style={{ background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)', color: 'var(--color-text-primary)' }}
                  />
                </Col>

                {/* 标签 */}
                <Col flex="100px">
                  <div style={{ fontSize: 11, color: 'var(--color-text-tertiary)', marginBottom: 3 }}>标签</div>
                  <Select
                    value={slot.tag}
                    style={{ width: '100%' }}
                    onChange={v => handleSlotChange(index, 'tag', v)}
                    options={TAG_OPTIONS.map(t => ({ value: t, label: t || '无标签' }))}
                  />
                </Col>

                {/* 启用 */}
                <Col flex="72px" style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 11, color: 'var(--color-text-tertiary)', marginBottom: 6 }}>启用</div>
                  <Switch
                    checked={slot.enabled}
                    onChange={v => handleSlotChange(index, 'enabled', v)}
                    size="small"
                  />
                </Col>

                {/* 清除 */}
                <Col flex="36px">
                  <Tooltip title="清除此槽位">
                    <Button
                      type="text" danger
                      icon={<DeleteOutlined />}
                      onClick={() => handleReset(index)}
                      style={{ marginTop: 18 }}
                    />
                  </Tooltip>
                </Col>
              </Row>

              {/* 实时预览 */}
              {slot.platform && slot.price && (
                <div style={{
                  marginTop: 10, padding: '7px 12px',
                  background: 'var(--color-bg-secondary)',
                  borderRadius: 6, display: 'flex',
                  alignItems: 'center', justifyContent: 'space-between', fontSize: 12,
                }}>
                  <span style={{ color: 'var(--color-text-tertiary)' }}>首页预览效果：</span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--color-primary)', display: 'inline-block' }} />
                    <span style={{ fontWeight: 600, color: 'var(--color-text-primary)' }}>{slot.platform}</span>
                    {slot.tag && <Tag style={{ fontSize: 10, margin: 0, padding: '0 5px' }} color="red">{slot.tag}</Tag>}
                  </span>
                  <span style={{ color: 'var(--color-text-tertiary)', background: 'var(--color-bg-hover)', padding: '1px 7px', borderRadius: 4 }}>{slot.label}</span>
                  <span style={{ fontWeight: 700, color: 'var(--color-primary)', fontSize: 14 }}>{slot.price}</span>
                </div>
              )}
            </Card>
          ))}

          <div style={{ marginTop: 24, display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
            <Button onClick={fetchSlots}>重置</Button>
            <Button type="primary" loading={saving} onClick={handleSave}>
              保存广告位配置
            </Button>
          </div>
        </>
      )}
    </div>
  );
}

// ==================== 主页面 ====================
export default function Products() {
  const { t } = useTranslation();
  const [searchText, setSearchText] = useState('');
  const [platformFilter, setPlatformFilter] = useState('全部');
  const [statusFilter, setStatusFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [rejectModalVisible, setRejectModalVisible] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [total, setTotal] = useState(0);
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [batchLoading, setBatchLoading] = useState(false);
  const pageSize = 20;

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    try {
      const params: AdminQueryParams = {
        search: searchText || undefined,
        platform: platformFilter !== '全部' ? platformFilter : undefined,
        status: statusFilter !== 'all' ? statusFilter : undefined,
        page: currentPage,
        pageSize,
      };
      const response = await getProducts(params);
      setProducts(response.items || []);
      setTotal(response.total || 0);
    } catch {
      message.error(t('common.fetchError', '获取数据失败'));
    } finally {
      setLoading(false);
    }
  }, [searchText, platformFilter, statusFilter, currentPage, t]);

  useEffect(() => { fetchProducts(); }, [fetchProducts]);

  const handleApprove = (product: Product) => {
    Modal.confirm({
      title: t('admin.confirmApprove'),
      content: t('admin.confirmApproveContent', `确定要通过商品「${product.title}」的审核吗？`),
      okText: t('common.confirm'),
      cancelText: t('common.cancel'),
      onOk: async () => {
        try {
          await auditProduct(product.id, true);
          message.success(t('common.success', '操作成功'));
          fetchProducts();
        } catch {
          message.error(t('common.error', '操作失败'));
        }
      },
    });
  };

  const handleReject = (product: Product) => {
    setSelectedProduct(product);
    setRejectModalVisible(true);
    setRejectReason('');
  };

  const confirmReject = async () => {
    if (!selectedProduct) return;
    try {
      await auditProduct(selectedProduct.id, false, rejectReason);
      message.success(t('common.success', '操作成功'));
      setRejectModalVisible(false);
      setSelectedProduct(null);
      setRejectReason('');
      fetchProducts();
    } catch {
      message.error(t('common.error', '操作失败'));
    }
  };

  // 批量审核
  const handleBatchAudit = async (approved: boolean) => {
    if (selectedRowKeys.length === 0) {
      message.warning('请先选择要审核的商品');
      return;
    }

    const pendingProducts = products.filter(
      p => selectedRowKeys.includes(p.id) && p.status === 'PENDING'
    );

    if (pendingProducts.length === 0) {
      message.warning('所选商品中没有待审核的商品');
      return;
    }

    Modal.confirm({
      title: approved ? '批量通过审核' : '批量拒绝审核',
      content: `确定要${approved ? '通过' : '拒绝'} ${pendingProducts.length} 个商品的审核吗？`,
      okText: '确定',
      cancelText: '取消',
      onOk: async () => {
        setBatchLoading(true);
        try {
          const response = await fetch('/api/products/admin/batch-audit', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${localStorage.getItem('token')}`,
            },
            body: JSON.stringify({
              ids: pendingProducts.map(p => p.id),
              status: approved ? 'APPROVED' : 'REJECTED',
              rejectReason: approved ? undefined : '批量拒绝',
            }),
          });

          if (!response.ok) throw new Error('批量审核失败');

          message.success(`成功${approved ? '通过' : '拒绝'} ${pendingProducts.length} 个商品`);
          setSelectedRowKeys([]);
          fetchProducts();
        } catch {
          message.error('批量审核失败，请重试');
        } finally {
          setBatchLoading(false);
        }
      },
    });
  };

  const columns: ColumnsType<Product> = [
    {
      title: t('admin.productImage'),
      dataIndex: 'image',
      key: 'image',
      width: 80,
      render: (src: string) => (
        <Image
          src={src} width={50} height={50}
          style={{ borderRadius: 8, objectFit: 'cover' }}
          fallback="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="
        />
      ),
    },
    {
      title: t('admin.productTitle'),
      dataIndex: 'title',
      key: 'title',
      render: (text: string) => <span style={{ color: 'var(--color-text-primary)' }}>{text}</span>,
    },
    {
      title: t('admin.platform'),
      dataIndex: 'platform',
      key: 'platform',
      render: (platform: string) => <Tag>{platform}</Tag>,
    },
    {
      title: t('admin.seller'),
      dataIndex: 'seller',
      key: 'seller',
      render: (text: string) => <span style={{ color: 'var(--color-text-secondary)' }}>{text}</span>,
    },
    {
      title: t('admin.price'),
      dataIndex: 'price',
      key: 'price',
      render: (price: number) => (
        <span style={{ color: 'var(--color-accent)', fontWeight: 600 }}>${price.toFixed(2)}</span>
      ),
    },
    {
      title: t('admin.status'),
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => (
        <Tag color={STATUS_COLORS[status]}>{t(`admin.productStatus${status}`, status)}</Tag>
      ),
    },
    {
      title: t('admin.submittedAt'),
      dataIndex: 'submittedAt',
      key: 'submittedAt',
      render: (text: string) => <span style={{ color: 'var(--color-text-secondary)' }}>{text}</span>,
    },
    {
      title: t('admin.actions'),
      key: 'actions',
      render: (_: unknown, record: Product) => (
        <Space>
          <Button type="link" size="small" icon={<EyeOutlined />}>
            {t('admin.viewDetails')}
          </Button>
          {record.status === 'PENDING' && (
            <>
              <Button
                type="link" size="small"
                style={{ color: 'var(--color-success)' }}
                icon={<CheckCircleOutlined />}
                onClick={() => handleApprove(record)}
              >
                {t('admin.approve')}
              </Button>
              <Button
                type="link" size="small" danger
                icon={<CloseCircleOutlined />}
                onClick={() => handleReject(record)}
              >
                {t('admin.reject')}
              </Button>
            </>
          )}
        </Space>
      ),
    },
  ];

  const rowSelection = {
    selectedRowKeys,
    onChange: (selectedKeys: React.Key[]) => {
      setSelectedRowKeys(selectedKeys);
    },
    getCheckboxProps: (record: Product) => ({
      disabled: record.status !== 'PENDING',
    }),
  };

  const productAuditTab = (
    <Card style={{ background: 'var(--color-bg-card)', border: '1px solid var(--color-border)', borderRadius: 14 }}>
      <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
        <Select
          value={platformFilter}
          onChange={(value) => { setPlatformFilter(value); setCurrentPage(1); }}
          style={{ width: 120 }}
          options={PLATFORMS.map(p => ({ value: p, label: p }))}
        />
        <Select
          value={statusFilter}
          onChange={(value) => { setStatusFilter(value); setCurrentPage(1); }}
          style={{ width: 120 }}
          options={[
            { value: 'all', label: t('admin.allStatus') },
            { value: 'PENDING', label: t('admin.productStatusPENDING') },
            { value: 'APPROVED', label: t('admin.productStatusAPPROVED') },
            { value: 'REJECTED', label: t('admin.productStatusREJECTED') },
            { value: 'ON_SALE', label: t('admin.productStatusON_SALE') },
          ]}
        />
        <Input
          placeholder={t('admin.searchProducts')}
          prefix={<SearchOutlined />}
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          onPressEnter={() => setCurrentPage(1)}
          style={{ width: 250, background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)' }}
        />
        <Button type="primary" icon={<SearchOutlined />} onClick={() => fetchProducts()}>
          {t('common.search')}
        </Button>
      </div>

      {/* 批量操作栏 */}
      {selectedRowKeys.length > 0 && (
        <div style={{
          marginBottom: 16,
          padding: '12px 16px',
          background: 'var(--color-primary-light)',
          border: '1px solid rgba(var(--color-primary-rgb), 0.3)',
          borderRadius: 8,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <span style={{ color: 'var(--color-text-primary)' }}>
            已选择 <strong style={{ color: 'var(--color-primary)' }}>{selectedRowKeys.length}</strong> 个商品
          </span>
          <Space>
            <Button
              type="primary"
              icon={<CheckCircleOutlined />}
              loading={batchLoading}
              onClick={() => handleBatchAudit(true)}
            >
              批量通过
            </Button>
            <Button
              danger
              icon={<CloseCircleOutlined />}
              loading={batchLoading}
              onClick={() => handleBatchAudit(false)}
            >
              批量拒绝
            </Button>
            <Button onClick={() => setSelectedRowKeys([])}>
              取消选择
            </Button>
          </Space>
        </div>
      )}

      <Table
        columns={columns}
        dataSource={products}
        rowKey="id"
        loading={loading}
        rowSelection={rowSelection}
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
  );

  if (loading && products.length === 0) {
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
          { title: t('admin.productsManagement') },
        ]}
      />
      <Title level={3} style={{ color: 'var(--color-text-primary)', marginBottom: 24 }}>
        {t('admin.productsManagement')}
      </Title>

      <Tabs
        defaultActiveKey="audit"
        style={{ marginBottom: 0 }}
        items={[
          {
            key: 'audit',
            label: '商品审核',
            children: productAuditTab,
          },
          {
            key: 'adslots',
            label: '🎯 广告位管理',
            children: (
              <Card style={{ background: 'var(--color-bg-card)', border: '1px solid var(--color-border)', borderRadius: 14, padding: '8px 0' }}>
                <AdSlotsManager />
              </Card>
            ),
          },
        ]}
      />

      {/* 拒绝原因弹窗 */}
      <Modal
        title={t('admin.rejectReason')}
        open={rejectModalVisible}
        onOk={confirmReject}
        onCancel={() => setRejectModalVisible(false)}
        okText={t('common.confirm')}
        cancelText={t('common.cancel')}
      >
        <div style={{ marginBottom: 12 }}>
          <span style={{ color: 'var(--color-text-secondary)' }}>{t('admin.rejectProduct')}：</span>
          <span style={{ color: 'var(--color-text-primary)' }}>{selectedProduct?.title}</span>
        </div>
        <Input.TextArea
          rows={4}
          value={rejectReason}
          onChange={(e) => setRejectReason(e.target.value)}
          placeholder={t('admin.rejectReasonPlaceholder')}
          style={{ background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)', color: 'var(--color-text-primary)' }}
        />
      </Modal>
    </div>
  );
}