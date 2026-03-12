import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Card, Table, Button, Space, Tag, Input, Select, Switch,
  InputNumber, Drawer, message, Popconfirm, Typography, Tooltip, Upload
} from 'antd';
import {
  PlusOutlined, SearchOutlined, EditOutlined, DeleteOutlined, TagOutlined, UploadOutlined
} from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import apiClient from '@/services/apiClient';
import { setPromotion } from '@/services/sellers';
import PromotionModal from '@/components/seller/PromotionModal';
import type { ColumnsType } from 'antd/es/table';

const { Text } = Typography;
const { TextArea } = Input;

const productSchema = z.object({
  title: z.string().min(2).max(100),
  categoryId: z.string().min(1),
  price: z.number().min(0.01),
  stock: z.number().int().min(0),
  description: z.string().max(2000).optional(),
  accountData: z.string().min(1),
});

type ProductFormValues = z.infer<typeof productSchema>;

interface Product {
  id: string;
  title: string;
  categoryId: string;
  category?: { id: string; name: string };
  price: number;
  stock: number;
  status: 'ACTIVE' | 'INACTIVE' | 'PENDING' | 'REJECTED';
  sales: number;
  createdAt: string;
  description?: string;
}

interface Category {
  id: string;
  name: string;
}

export default function SellerProductsPage() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  const [searchText, setSearchText] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [pageSize, setPageSize] = useState(10);
  const [promotionProduct, setPromotionProduct] = useState<Product | null>(null);
  const [promotionModalOpen, setPromotionModalOpen] = useState(false);
  const [uploadedImages, setUploadedImages] = useState<string[]>([]);

  const { register, handleSubmit, reset, control, formState: { errors } } = useForm<ProductFormValues>({
    resolver: zodResolver(productSchema),
  });

  useEffect(() => {
    if (editingProduct) {
      reset({
        title: editingProduct.title,
        categoryId: editingProduct.categoryId,
        price: editingProduct.price,
        stock: editingProduct.stock,
        description: editingProduct.description || '',
        accountData: '',
      });
    } else {
      reset({ title: '', categoryId: '', price: 0, stock: 0, description: '', accountData: '' });
    }
  }, [editingProduct, reset]);

  const { data: products, isLoading } = useQuery({
    queryKey: ['seller-products', searchText, statusFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (searchText) params.append('search', searchText);
      if (statusFilter !== 'all') params.append('status', statusFilter);
      const response = await apiClient.get(`/sellers/products?${params}`);
      return response.data as Product[];
    },
    initialData: [],
  });

  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const response = await apiClient.get('/categories');
      return response.data as Category[];
    },
    initialData: [],
  });

  const saveMutation = useMutation({
    mutationFn: async (data: ProductFormValues) => {
      if (editingProduct) {
        return apiClient.patch(`/products/${editingProduct.id}`, data);
      }
      return apiClient.post('/products', data);
    },
    onSuccess: () => {
      message.success(editingProduct ? t('common.updateSuccess') : t('common.createSuccess'));
      queryClient.invalidateQueries({ queryKey: ['seller-products'] });
      setDrawerOpen(false);
      setEditingProduct(null);
      reset();
    },
    onError: () => {
      message.error(t('common.error'));
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiClient.delete(`/products/${id}`);
    },
    onSuccess: () => {
      message.success(t('common.deleteSuccess'));
      queryClient.invalidateQueries({ queryKey: ['seller-products'] });
    },
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }) => {
      return apiClient.patch(`/products/${id}/status`, { status: active ? 'ACTIVE' : 'INACTIVE' });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['seller-products'] });
    },
  });

  const statusColors = {
    ACTIVE: 'green',
    INACTIVE: 'default',
    PENDING: 'orange',
    REJECTED: 'red',
  };

  const columns: ColumnsType<Product> = [
    {
      title: t('product.title'),
      dataIndex: 'title',
      key: 'title',
      ellipsis: true,
    },
    {
      title: t('product.category'),
      dataIndex: ['category', 'name'],
      key: 'category',
    },
    {
      title: t('product.price'),
      dataIndex: 'price',
      key: 'price',
      render: (price: number) => `$${price.toFixed(2)}`,
    },
    {
      title: t('product.stock'),
      dataIndex: 'stock',
      key: 'stock',
    },
    {
      title: t('product.sales'),
      dataIndex: 'sales',
      key: 'sales',
    },
    {
      title: t('product.status'),
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => (
        <Tag color={statusColors[status as keyof typeof statusColors]}>
          {t(`product.status.${status.toLowerCase()}`)}
        </Tag>
      ),
    },
    {
      title: t('product.onOff'),
      key: 'toggle',
      render: (_, record) => (
        <Switch
          checked={record.status === 'ACTIVE'}
          onChange={(checked) => toggleMutation.mutate({ id: record.id, active: checked })}
          disabled={record.status === 'PENDING' || record.status === 'REJECTED'}
        />
      ),
    },
    {
      title: t('common.actions'),
      key: 'actions',
      render: (_, record) => (
        <Space>
          <Tooltip title={t('seller.promotion.title')}>
            <Button
              type="text"
              icon={<TagOutlined />}
              onClick={() => {
                setPromotionProduct(record);
                setPromotionModalOpen(true);
              }}
              disabled={record.status !== 'ACTIVE'}
            />
          </Tooltip>
          <Tooltip title={t('common.edit')}>
            <Button
              type="text"
              icon={<EditOutlined />}
              onClick={() => {
                setEditingProduct(record);
                setUploadedImages((record as any).images || []);
                setDrawerOpen(true);
              }}
            />
          </Tooltip>
          <Popconfirm
            title={t('common.confirmDelete')}
            onConfirm={() => deleteMutation.mutate(record.id)}
          >
            <Button type="text" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const onSubmit = (data: ProductFormValues) => {
    saveMutation.mutate({ ...data, images: uploadedImages } as any);
  };

  return (
    <div>
      <Card>
        <Space style={{ marginBottom: 16, width: '100%', justifyContent: 'space-between' }}>
          <Space>
            <Input
              placeholder={t('common.search')}
              prefix={<SearchOutlined />}
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              style={{ width: 200 }}
              allowClear
            />
            <Select
              value={statusFilter}
              onChange={setStatusFilter}
              style={{ width: 120 }}
              options={[
                { value: 'all', label: t('common.all') },
                { value: 'ACTIVE', label: t('product.status.active') },
                { value: 'INACTIVE', label: t('product.status.inactive') },
                { value: 'PENDING', label: t('product.status.pending') },
              ]}
            />
          </Space>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => {
              setEditingProduct(null);
              reset({});
              setUploadedImages([]);
              setDrawerOpen(true);
            }}
          >
            {t('product.add')}
          </Button>
        </Space>

        <Table
          columns={columns}
          dataSource={products}
          rowKey="id"
          loading={isLoading}
          pagination={{
            pageSize,
            showSizeChanger: true,
            onChange: (_, size) => setPageSize(size),
          }}
        />
      </Card>

      <Drawer
        title={editingProduct ? t('product.edit') : t('product.add')}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        width={500}
      >
        <form onSubmit={handleSubmit(onSubmit)}>
          {/* 商品图片上传 */}
          <div style={{ marginBottom: 16 }}>
            <Text strong>{t('product.images', '商品图片')}</Text>
            <div style={{ marginTop: 8 }}>
              <Upload
                listType="picture-card"
                accept="image/*"
                maxCount={5}
                beforeUpload={async (file) => {
                  const reader = new FileReader();
                  reader.onload = (e) => {
                    const base64 = e.target?.result as string;
                    setUploadedImages((prev) => [...prev, base64]);
                  };
                  reader.readAsDataURL(file);
                  return false;
                }}
                onRemove={(file) => {
                  setUploadedImages((prev) => prev.filter((_, i) => i !== (file as any).index));
                }}
              >
                {uploadedImages.length < 5 && (
                  <div>
                    <UploadOutlined />
                    <div style={{ marginTop: 8 }}>{t('product.uploadImage', '上传图片')}</div>
                  </div>
                )}
              </Upload>
            </div>
          </div>

          {/* 商品标题 */}
          <div style={{ marginBottom: 16 }}>
            <Text strong>{t('product.title')}</Text>
            <Input {...register('title')} style={{ marginTop: 4 }} />
            {errors.title && <Text type="danger">{errors.title.message}</Text>}
          </div>

          <div style={{ marginBottom: 16 }}>
            <Text strong>{t('product.category')}</Text>
            <select {...register('categoryId')} className="ant-input" style={{ marginTop: 4, width: '100%' }}>
              <option value="">{t('common.select')}</option>
              {Array.isArray(categories) && categories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
            {errors.categoryId && <Text type="danger">{errors.categoryId.message}</Text>}
          </div>

          <div style={{ marginBottom: 16 }}>
            <Text strong>{t('product.price')}</Text>
            <Controller
              name="price"
              control={control}
              render={({ field }) => (
                <InputNumber
                  {...field}
                  min={0.01}
                  step={0.01}
                  precision={2}
                  style={{ marginTop: 4, width: '100%' }}
                  prefix="$"
                />
              )}
            />
            {errors.price && <Text type="danger">{errors.price.message}</Text>}
          </div>

          <div style={{ marginBottom: 16 }}>
            <Text strong>{t('product.stock')}</Text>
            <Controller
              name="stock"
              control={control}
              render={({ field }) => (
                <InputNumber
                  {...field}
                  min={0}
                  precision={0}
                  style={{ marginTop: 4, width: '100%' }}
                />
              )}
            />
            {errors.stock && <Text type="danger">{errors.stock.message}</Text>}
          </div>

          <div style={{ marginBottom: 16 }}>
            <Text strong>{t('product.description')}</Text>
            <TextArea {...register('description')} rows={3} style={{ marginTop: 4 }} />
          </div>

          <div style={{ marginBottom: 16 }}>
            <Text strong>{t('product.accountData')}</Text>
            <TextArea
              {...register('accountData')}
              rows={4}
              style={{ marginTop: 4 }}
              placeholder={t('product.accountDataPlaceholder')}
            />
            {errors.accountData && <Text type="danger">{errors.accountData.message}</Text>}
          </div>

          <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
            <Button onClick={() => setDrawerOpen(false)}>{t('common.cancel')}</Button>
            <Button type="primary" htmlType="submit" loading={saveMutation.isPending}>
              {t('common.save')}
            </Button>
          </Space>
        </form>
      </Drawer>

      <PromotionModal
        open={promotionModalOpen}
        onClose={() => {
          setPromotionModalOpen(false);
          setPromotionProduct(null);
        }}
        productTitle={promotionProduct?.title || ''}
        currentPrice={promotionProduct?.price || 0}
        onApply={async (data) => {
          if (!promotionProduct?.id) return;
          await setPromotion(promotionProduct.id, data);
          queryClient.invalidateQueries({ queryKey: ['seller-products'] });
        }}
      />
    </div>
  );
}
