import { useTranslation } from 'react-i18next';
import {
  Card, Table, Button, Space, Tag, Typography, Image, message, Popconfirm
} from 'antd';
import {
  DeleteOutlined, ShoppingCartOutlined, EyeOutlined
} from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import apiClient from '@/services/apiClient';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';

const { Title, Text } = Typography;

interface FavoriteItem {
  id: string;
  createdAt: string;
  product: {
    id: string;
    title: string;
    price: number;
    originalPrice?: number;
    thumbnailUrl?: string;
    platform: string;
    status: string;
    stock: number;
    soldCount: number;
    isFavorited: boolean;
    category?: { id: string; name: string };
    seller?: {
      id: string;
      username: string;
      sellerProfile?: { shopName: string };
    };
  };
}

export default function FavoritesPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Fetch favorites
  const { data, isLoading } = useQuery({
    queryKey: ['favorites'],
    queryFn: async () => {
      const response = await apiClient.get('/products/favorites/list');
      return response.data as { items: FavoriteItem[]; total: number };
    },
  });

  // Remove favorite mutation
  const removeMutation = useMutation({
    mutationFn: async (productId: string) => {
      return apiClient.delete(`/products/favorites/${productId}`);
    },
    onSuccess: () => {
      message.success(t('favorite.removeSuccess'));
      queryClient.invalidateQueries({ queryKey: ['favorites'] });
    },
  });

  // Add to cart mutation
  const addToCartMutation = useMutation({
    mutationFn: async (productId: string) => {
      return apiClient.post('/cart', { productId, quantity: 1 });
    },
    onSuccess: () => {
      message.success(t('cart.addSuccess'));
    },
  });

  const columns: ColumnsType<FavoriteItem> = [
    {
      title: t('favorite.product'),
      key: 'product',
      render: (_, record) => (
        <Space>
          <Image
            src={record.product.thumbnailUrl || '/placeholder.png'}
            width={60}
            height={60}
            style={{ objectFit: 'cover', borderRadius: 4 }}
            fallback="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAMIAAADDCAYAAADQvc6UAAABRWlDQ1BJQ0MgUHJvZmlsZQAAKJFjYGASSSwoyGFhYGDIzSspCnJ3UoiIjFJgf8LAwSDCIMogwMCcmFxc4BgQ4ANUwgCjUcG3awyMIPqyLsis7PPOq3QdDFcvjV3jOD1boQVTPQrgSkktTgbSf4A4LbmgqISBgTEFyFYuLykAsTuAbJEioKOA7DkgdjqEvQHEToKwj4DVhAQ5A9k3gGyB5IxEoBmML4BsnSQk8XQkNtReEOBxcfXxUQg1Mjc0dyHgXNJBSWpFCYh2zi+oLMpMzyhRcASGUqqCZ16yno6CkYGRAQMDKMwhqj/fAIcloxgRq5P4AIcJKwkIAn克里ML4BsnSQk8XQkNtReEOBxcfXxUQg1Mjc0dyHgXNJBSWpFCYh2zi+oLMpMzyhRcASGUqqCZ16yno6CkYGRAQMDKMwhqj/fAIcloxgRq5P4A="
            alt={record.product.title}
          />
          <div style={{ maxWidth: 200 }}>
            <Text
              strong
              style={{ cursor: 'pointer' }}
              onClick={() => navigate(`/products/${record.product.id}`)}
            >
              {record.product.title}
            </Text>
            <br />
            <Tag>{record.product.platform}</Tag>
          </div>
        </Space>
      ),
    },
    {
      title: t('favorite.seller'),
      key: 'seller',
      render: (_, record) => (
        <Text
          type="secondary"
          style={{ cursor: 'pointer' }}
          onClick={() => navigate(`/seller/${record.product.seller?.id}`)}
        >
          {record.product.seller?.sellerProfile?.shopName || record.product.seller?.username}
        </Text>
      ),
    },
    {
      title: t('favorite.price'),
      dataIndex: ['product', 'price'],
      key: 'price',
      render: (price: number, record) => (
        <Space direction="vertical" size={0}>
          <Text strong style={{ color: 'var(--color-error)' }}>
            ${price.toFixed(2)}
          </Text>
          {record.product.originalPrice && record.product.originalPrice > price && (
            <Text delete type="secondary" style={{ fontSize: 12 }}>
              ${record.product.originalPrice.toFixed(2)}
            </Text>
          )}
        </Space>
      ),
    },
    {
      title: t('favorite.stock'),
      dataIndex: ['product', 'stock'],
      key: 'stock',
      render: (stock: number) => (
        <Tag color={stock > 0 ? 'green' : 'red'}>
          {stock > 0 ? `${stock} ${t('favorite.inStock')}` : t('favorite.outOfStock')}
        </Tag>
      ),
    },
    {
      title: t('favorite.addedAt'),
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (date: string) => dayjs(date).format('YYYY-MM-DD HH:mm'),
    },
    {
      title: t('common.actions'),
      key: 'actions',
      render: (_, record) => (
        <Space>
          <Button
            icon={<EyeOutlined />}
            onClick={() => navigate(`/products/${record.product.id}`)}
            title={t('common.view')}
          />
          <Button
            type="primary"
            icon={<ShoppingCartOutlined />}
            onClick={() => addToCartMutation.mutate(record.product.id)}
            disabled={record.product.stock <= 0}
            loading={addToCartMutation.isPending}
            title={t('cart.addToCart')}
          />
          <Popconfirm
            title={t('favorite.removeConfirm')}
            onConfirm={() => removeMutation.mutate(record.product.id)}
            okText={t('common.confirm')}
            cancelText={t('common.cancel')}
          >
            <Button
              danger
              icon={<DeleteOutlined />}
              loading={removeMutation.isPending}
              title={t('favorite.remove')}
            />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <Title level={4}>{t('favorite.title')}</Title>
      <Card>
        <Table
          columns={columns}
          dataSource={data?.items || []}
          rowKey="id"
          loading={isLoading}
          pagination={{
            pageSize: 10,
            total: data?.total || 0,
            showTotal: (total) => t('favorite.total', { count: total }),
          }}
          locale={{
            emptyText: t('favorite.empty'),
          }}
        />
      </Card>
    </div>
  );
}