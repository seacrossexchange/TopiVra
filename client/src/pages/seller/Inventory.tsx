import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Card, Table, Button, Space, Tag, Input, Select, Modal, message,
  Statistic, Row, Col, Typography, Tooltip, Popconfirm
} from 'antd';
import {
  PlusOutlined, SearchOutlined, UploadOutlined, DownloadOutlined,
  DeleteOutlined, CheckCircleOutlined, CloseCircleOutlined,
  InboxOutlined, DatabaseOutlined
} from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '@/services/apiClient';
import type { ColumnsType } from 'antd/es/table';
import AddInventoryModal from '@/components/seller/AddInventoryModal';
import BatchImportModal from '@/components/seller/BatchImportModal';

const { Text } = Typography;

interface Product {
  id: string;
  title: string;
}

interface Inventory {
  id: string;
  productId: string;
  product: Product;
  accountData: string;
  status: 'AVAILABLE' | 'RESERVED' | 'SOLD' | 'INVALID';
  orderId?: string;
  soldAt?: string;
  isValid: boolean;
  invalidReason?: string;
  createdAt: string;
}

interface InventoryStats {
  total: number;
  available: number;
  sold: number;
  invalid: number;
}

export default function SellerInventoryPage() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  const [searchText, setSearchText] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [productFilter, setProductFilter] = useState<string>('all');
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [batchModalOpen, setBatchModalOpen] = useState(false);
  const [pageSize, setPageSize] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);

  // 查询库存列表
  const { data: inventoryData, isLoading } = useQuery({
    queryKey: ['seller-inventory', searchText, statusFilter, productFilter, currentPage, pageSize],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (searchText) params.append('search', searchText);
      if (statusFilter !== 'all') params.append('status', statusFilter);
      if (productFilter !== 'all') params.append('productId', productFilter);
      params.append('page', currentPage.toString());
      params.append('limit', pageSize.toString());
      
      const response = await apiClient.get(`/inventory/list?${params}`);
      return response.data;
    },
  });

  // 查询产品列表
  const { data: products } = useQuery({
    queryKey: ['seller-products-simple'],
    queryFn: async () => {
      const response = await apiClient.get('/sellers/products?simple=true');
      return response.data as Product[];
    },
    initialData: [],
  });

  // 查询库存统计
  const { data: stats } = useQuery({
    queryKey: ['inventory-stats', productFilter],
    queryFn: async () => {
      const params = productFilter !== 'all' ? `?productId=${productFilter}` : '';
      const response = await apiClient.get(`/inventory/stats${params}`);
      return response.data as InventoryStats;
    },
  });

  // 删除库存
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiClient.delete(`/inventory/${id}`);
    },
    onSuccess: () => {
      message.success(t('common.deleteSuccess'));
      queryClient.invalidateQueries({ queryKey: ['seller-inventory'] });
      queryClient.invalidateQueries({ queryKey: ['inventory-stats'] });
    },
    onError: () => {
      message.error(t('common.error'));
    },
  });

  // 标记为失效
  const markInvalidMutation = useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason: string }) => {
      return apiClient.post(`/inventory/${id}/mark-invalid`, { reason });
    },
    onSuccess: () => {
      message.success(t('inventory.markInvalidSuccess'));
      queryClient.invalidateQueries({ queryKey: ['seller-inventory'] });
      queryClient.invalidateQueries({ queryKey: ['inventory-stats'] });
    },
  });

  // 导出库存
  const handleExport = async () => {
    try {
      const params = productFilter !== 'all' ? `?productId=${productFilter}` : '';
      const response = await apiClient.get(`/inventory/export${params}`, {
        responseType: 'blob',
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `inventory-${Date.now()}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      
      message.success(t('inventory.exportSuccess'));
    } catch {
      message.error(t('common.error'));
    }
  };

  const statusColors = {
    AVAILABLE: 'green',
    RESERVED: 'orange',
    SOLD: 'blue',
    INVALID: 'red',
  };

  const columns: ColumnsType<Inventory> = [
    {
      title: t('inventory.product'),
      dataIndex: ['product', 'title'],
      key: 'product',
      ellipsis: true,
    },
    {
      title: t('inventory.accountData'),
      dataIndex: 'accountData',
      key: 'accountData',
      ellipsis: true,
      render: (text: string) => (
        <Text copyable={{ text }}>{text.substring(0, 30)}...</Text>
      ),
    },
    {
      title: t('inventory.status'),
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => (
        <Tag color={statusColors[status as keyof typeof statusColors]}>
          {t(`inventory.status.${status.toLowerCase()}`)}
        </Tag>
      ),
    },
    {
      title: t('inventory.soldAt'),
      dataIndex: 'soldAt',
      key: 'soldAt',
      render: (date: string) => date ? new Date(date).toLocaleString() : '-',
    },
    {
      title: t('inventory.createdAt'),
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (date: string) => new Date(date).toLocaleString(),
    },
    {
      title: t('common.actions'),
      key: 'actions',
      render: (_, record) => (
        <Space>
          {record.status === 'AVAILABLE' && (
            <>
              <Tooltip title={t('inventory.markInvalid')}>
                <Button
                  type="text"
                  icon={<CloseCircleOutlined />}
                  onClick={() => {
                    Modal.confirm({
                      title: t('inventory.markInvalid'),
                      content: (
                        <Input.TextArea
                          id="invalidReason"
                          placeholder={t('inventory.invalidReason')}
                          rows={3}
                        />
                      ),
                      onOk: () => {
                        const reason = (document.getElementById('invalidReason') as HTMLTextAreaElement)?.value;
                        if (reason) {
                          markInvalidMutation.mutate({ id: record.id, reason });
                        }
                      },
                    });
                  }}
                />
              </Tooltip>
              <Popconfirm
                title={t('common.confirmDelete')}
                onConfirm={() => deleteMutation.mutate(record.id)}
              >
                <Button type="text" danger icon={<DeleteOutlined />} />
              </Popconfirm>
            </>
          )}
          {record.status === 'SOLD' && (
            <Text type="secondary">{t('inventory.alreadySold')}</Text>
          )}
          {record.status === 'INVALID' && (
            <Tooltip title={record.invalidReason}>
              <Text type="danger">{t('inventory.invalid')}</Text>
            </Tooltip>
          )}
        </Space>
      ),
    },
  ];

  return (
    <div>
      {/* 统计卡片 */}
      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={6}>
          <Card>
            <Statistic
              title={t('inventory.total')}
              value={stats?.total || 0}
              prefix={<DatabaseOutlined />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title={t('inventory.available')}
              value={stats?.available || 0}
              valueStyle={{ color: '#3f8600' }}
              prefix={<CheckCircleOutlined />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title={t('inventory.sold')}
              value={stats?.sold || 0}
              valueStyle={{ color: '#1890ff' }}
              prefix={<InboxOutlined />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title={t('inventory.invalid')}
              value={stats?.invalid || 0}
              valueStyle={{ color: '#cf1322' }}
              prefix={<CloseCircleOutlined />}
            />
          </Card>
        </Col>
      </Row>

      {/* 主表格 */}
      <Card>
        <Space style={{ marginBottom: 16, width: '100%', justifyContent: 'space-between' }}>
          <Space>
            <Select
              value={productFilter}
              onChange={setProductFilter}
              style={{ width: 200 }}
              placeholder={t('inventory.selectProduct')}
            >
              <Select.Option value="all">{t('common.all')}</Select.Option>
              {products.map((p) => (
                <Select.Option key={p.id} value={p.id}>{p.title}</Select.Option>
              ))}
            </Select>
            <Select
              value={statusFilter}
              onChange={setStatusFilter}
              style={{ width: 120 }}
            >
              <Select.Option value="all">{t('common.all')}</Select.Option>
              <Select.Option value="AVAILABLE">{t('inventory.status.available')}</Select.Option>
              <Select.Option value="SOLD">{t('inventory.status.sold')}</Select.Option>
              <Select.Option value="INVALID">{t('inventory.status.invalid')}</Select.Option>
            </Select>
            <Input
              placeholder={t('common.search')}
              prefix={<SearchOutlined />}
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              style={{ width: 200 }}
              allowClear
            />
          </Space>
          <Space>
            <Button
              icon={<DownloadOutlined />}
              onClick={handleExport}
            >
              {t('inventory.export')}
            </Button>
            <Button
              icon={<UploadOutlined />}
              onClick={() => setBatchModalOpen(true)}
            >
              {t('inventory.batchImport')}
            </Button>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => setAddModalOpen(true)}
            >
              {t('inventory.add')}
            </Button>
          </Space>
        </Space>

        <Table
          columns={columns}
          dataSource={inventoryData?.data || []}
          rowKey="id"
          loading={isLoading}
          pagination={{
            current: currentPage,
            pageSize,
            total: inventoryData?.total || 0,
            showSizeChanger: true,
            showTotal: (total) => `${t('common.total')} ${total} ${t('common.items')}`,
            onChange: (page, size) => {
              setCurrentPage(page);
              setPageSize(size);
            },
          }}
        />
      </Card>

      {/* 添加库存弹窗 */}
      <AddInventoryModal
        open={addModalOpen}
        onClose={() => setAddModalOpen(false)}
        products={products}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ['seller-inventory'] });
          queryClient.invalidateQueries({ queryKey: ['inventory-stats'] });
        }}
      />

      {/* 批量导入弹窗 */}
      <BatchImportModal
        open={batchModalOpen}
        onClose={() => setBatchModalOpen(false)}
        products={products}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ['seller-inventory'] });
          queryClient.invalidateQueries({ queryKey: ['inventory-stats'] });
        }}
      />
    </div>
  );
}












