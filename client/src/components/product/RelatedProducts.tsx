import { useState, useEffect } from 'react';
import { Card, Row, Col, Typography, Button, Empty, Spin } from 'antd';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import apiClient from '@/services/apiClient';

const { Title, Text } = Typography;

interface RelatedProduct {
  id: string;
  title: string;
  price: number;
  images?: string[];
  soldCount: number;
  stock: number;
}

interface RelatedProductsProps {
  productId: string;
  categoryId?: string;
  platform?: string;
}

export default function RelatedProducts({ productId, categoryId, platform }: RelatedProductsProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [products, setProducts] = useState<RelatedProduct[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRelatedProducts();
  }, [productId]);

  const fetchRelatedProducts = async () => {
    try {
      const response = await apiClient.get(`/products/${productId}/related`);
      setProducts(response.data || []);
    } catch (error) {
      console.error('Failed to fetch related products:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card style={{ marginTop: 24, textAlign: 'center', padding: 40 }}>
        <Spin />
      </Card>
    );
  }

  if (products.length === 0) {
    return null;
  }

  return (
    <Card style={{ marginTop: 24 }}>
      <Title level={4} style={{ marginBottom: 24 }}>
        {t('products.detail.related', '相关推荐')}
      </Title>
      <Row gutter={[16, 16]}>
        {products.map((product) => (
          <Col xs={12} sm={8} md={6} key={product.id}>
            <Card
              hoverable
              onClick={() => navigate(`/products/${product.id}`)}
              cover={
                <div style={{ height: 160, overflow: 'hidden', background: 'var(--color-bg-secondary)' }}>
                  <img
                    src={product.images?.[0] || '/placeholder.svg'}
                    alt={product.title}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                </div>
              }
              bodyStyle={{ padding: 12 }}
            >
              <Title level={5} ellipsis={{ rows: 2 }} style={{ margin: '0 0 8px', fontSize: 14, minHeight: 40 }}>
                {product.title}
              </Title>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text strong style={{ fontSize: 16, color: 'var(--color-primary)' }}>
                  ${product.price}
                </Text>
                <Text type="secondary" style={{ fontSize: 11 }}>
                  {product.soldCount} {t('products.detail.sold', '已售')}
                </Text>
              </div>
            </Card>
          </Col>
        ))}
      </Row>
    </Card>
  );
}



