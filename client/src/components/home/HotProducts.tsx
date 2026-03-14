import { useState, useEffect } from 'react';
import { Card, Row, Col, Typography, Button, Space, Tag, Empty, Spin } from 'antd';
import { FireOutlined, EyeOutlined, ShoppingOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import apiClient from '@/services/apiClient';

const { Title, Text } = Typography;

interface HotProduct {
  id: string;
  title: string;
  price: number;
  soldCount: number;
  viewCount: number;
  images?: string[];
  platform?: string;
  stock: number;
}

export default function HotProducts() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [products, setProducts] = useState<HotProduct[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchHotProducts();
  }, []);

  const fetchHotProducts = async () => {
    try {
      const response = await apiClient.get('/products/public?sortBy=soldCount&sortOrder=desc&limit=8');
      setProducts(response.data?.items || []);
    } catch (error) {
      console.error('Failed to fetch hot products:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <section style={{ padding: '60px 0', textAlign: 'center' }}>
        <Spin size="large" />
      </section>
    );
  }

  if (products.length === 0) {
    return null;
  }

  return (
    <section style={{ padding: '60px 0', background: 'var(--color-bg-layout)' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 }}>
          <Space>
            <FireOutlined style={{ fontSize: 28, color: '#ff4d4f' }} />
            <Title level={2} style={{ margin: 0 }}>
              {t('home.hotProducts.title', '🔥 热门商品')}
            </Title>
          </Space>
          <Button type="link" onClick={() => navigate('/products?sortBy=soldCount')}>
            {t('home.hotProducts.viewAll', '查看全部')} →
          </Button>
        </div>

        <Row gutter={[16, 16]}>
          {products.map((product, index) => (
            <Col xs={24} sm={12} md={8} lg={6} key={product.id}>
              <Card
                hoverable
                onClick={() => navigate(`/products/${product.id}`)}
                cover={
                  <div style={{ position: 'relative', height: 180, overflow: 'hidden', background: 'var(--color-bg-secondary)' }}>
                    {index < 3 && (
                      <Tag color={index === 0 ? 'red' : index === 1 ? 'orange' : 'gold'} style={{ position: 'absolute', top: 8, left: 8, zIndex: 1, fontWeight: 600 }}>
                        TOP {index + 1}
                      </Tag>
                    )}
                    <img
                      src={product.images?.[0] || '/placeholder.svg'}
                      alt={product.title}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  </div>
                }
              >
                <Title level={5} ellipsis={{ rows: 2 }} style={{ margin: '0 0 8px', minHeight: 44 }}>
                  {product.title}
                </Title>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <Text strong style={{ fontSize: 18, color: 'var(--color-primary)' }}>
                    ${product.price}
                  </Text>
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    {t('home.hotProducts.stock', '库存')} {product.stock}
                  </Text>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--color-text-secondary)' }}>
                  <span>
                    <ShoppingOutlined /> {product.soldCount} {t('home.hotProducts.sold', '已售')}
                  </span>
                  <span>
                    <EyeOutlined /> {product.viewCount} {t('home.hotProducts.views', '浏览')}
                  </span>
                </div>
              </Card>
            </Col>
          ))}
        </Row>
      </div>
    </section>
  );
}



