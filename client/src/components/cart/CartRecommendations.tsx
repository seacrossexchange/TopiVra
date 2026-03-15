import { useState, useEffect } from 'react';
import { Card, Row, Col, Typography, Button, Spin } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import apiClient from '@/services/apiClient';
import { cartService } from '@/services/cart';

const { Title, Text } = Typography;

interface CartItem {
  productId: string;
}

interface RecommendedProduct {
  id: string;
  title: string;
  price: number;
  images?: string[];
  soldCount: number;
  platform?: string;
}

interface CartRecommendationsProps {
  cartItems: CartItem[];
}

export default function CartRecommendations({ cartItems }: CartRecommendationsProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [products, setProducts] = useState<RecommendedProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [addingToCart, setAddingToCart] = useState<Record<string, boolean>>({});

  useEffect(() => {
    fetchRecommendations();
  }, [cartItems]);

  const fetchRecommendations = async () => {
    try {
      const response = await apiClient.get('/products/public?sortBy=soldCount&sortOrder=desc&limit=4');
      setProducts(response.data?.items || []);
    } catch (error) {
      console.error('Failed to fetch recommendations:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddToCart = async (productId: string) => {
    setAddingToCart({ ...addingToCart, [productId]: true });
    try {
      await cartService.addToCart(productId, 1);
      // 刷新页面
      window.location.reload();
    } catch (error) {
      console.error('Failed to add to cart:', error);
    } finally {
      setAddingToCart({ ...addingToCart, [productId]: false });
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
      <Title level={4} style={{ marginBottom: 16 }}>
        💡 {t('cart.recommendations.title', '买过的人还买了')}
      </Title>
      <Row gutter={[12, 12]}>
        {products.map((product) => (
          <Col xs={12} sm={12} md={6} key={product.id}>
            <Card
              hoverable
              bodyStyle={{ padding: 12 }}
              cover={
                <div style={{ height: 140, overflow: 'hidden', background: 'var(--color-bg-secondary)', cursor: 'pointer' }} onClick={() => navigate(`/products/${product.id}`)}>
                  <img
                    src={product.images?.[0] || '/placeholder.svg'}
                    alt={product.title}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                </div>
              }
            >
              <div onClick={() => navigate(`/products/${product.id}`)} style={{ cursor: 'pointer' }}>
                <Title level={5} ellipsis={{ rows: 2 }} style={{ margin: '0 0 8px', fontSize: 13, minHeight: 36 }}>
                  {product.title}
                </Title>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <Text strong style={{ fontSize: 16, color: 'var(--color-primary)' }}>
                    ${product.price}
                  </Text>
                  <Text type="secondary" style={{ fontSize: 11 }}>
                    {product.soldCount} {t('cart.recommendations.sold', '已售')}
                  </Text>
                </div>
              </div>
              <Button
                type="primary"
                size="small"
                block
                icon={<PlusOutlined />}
                onClick={() => handleAddToCart(product.id)}
                loading={addingToCart[product.id]}
              >
                {t('cart.recommendations.add', '加入购物车')}
              </Button>
            </Card>
          </Col>
        ))}
      </Row>
    </Card>
  );
}



