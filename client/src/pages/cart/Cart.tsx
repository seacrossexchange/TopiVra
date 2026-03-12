import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Card,
  Table,
  Button,
  InputNumber,
  Typography,
  Space,
  Breadcrumb,
  Popconfirm,
  message,
  Radio,
  Row,
  Col,
} from 'antd';
import {
  HomeOutlined,
  DeleteOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { cartService } from '@/services/cart';
import { useAuthStore } from '@/store/authStore';
import { EmptyState } from '@/components/common/EmptyState';
import { SkeletonCard } from '@/components/common/SkeletonCard';

const { Title, Text } = Typography;

// API response type for cart item
interface CartItemApiResponse {
  id: string;
  productId: string;
  quantity: number;
  product?: {
    title?: string;
    price?: number;
    stock?: number;
    images?: string[];
    category?: { name?: string };
  };
}

interface CartItem {
  id: string;
  productId: string;
  title: string;
  price: number;
  quantity: number;
  stock: number;
  platform: string;
  image: string;
}

export default function Cart() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuthStore();
  const [paymentMethod, setPaymentMethod] = useState('balance');
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    fetchCart();
  }, [isAuthenticated, navigate]);

  const fetchCart = async () => {
    try {
      setLoading(true);
      const response = await cartService.getCart();
      if (response.data?.items) {
        setCartItems(
          response.data.items.map((item: CartItemApiResponse) => ({
            id: item.id,
            productId: item.productId,
            title: item.product?.title || 'Unknown Product',
            price: item.product?.price || 0,
            quantity: item.quantity,
            stock: item.product?.stock || 99,
            platform: item.product?.category?.name || '',
            image: item.product?.images?.[0] || 'https://via.placeholder.com/80x80?text=Product',
          }))
        );
      }
    } catch {
      // Error is handled by the UI state
    } finally {
      setLoading(false);
    }
  };

  const handleQuantityChange = async (id: string, value: number | null) => {
    if (!value) return;
    try {
      await cartService.updateCartItem(id, value);
      setCartItems(
        cartItems.map((item) =>
          item.id === id ? { ...item, quantity: value } : item
        )
      );
    } catch {
      message.error(t('common.failed'));
    }
  };

  const handleRemove = async (id: string) => {
    try {
      await cartService.removeFromCart(id);
      setCartItems(cartItems.filter((item) => item.id !== id));
      message.success(t('cart.removeSuccess'));
    } catch {
      message.error(t('common.failed'));
    }
  };

  const handleCheckout = () => {
    if (cartItems.length === 0) {
      message.warning(t('cart.checkoutEmpty'));
      return;
    }
    navigate('/checkout', { state: { items: cartItems, paymentMethod } });
  };

  const columns: ColumnsType<CartItem> = [
    {
      title: t('cart.product'),
      dataIndex: 'title',
      key: 'title',
      render: (text, record) => (
        <Space>
          <img
            src={record.image}
            alt={text}
            className="w-20 h-20 object-cover rounded"
          />
          <div>
            <div className="font-medium">{text}</div>
            <Text type="secondary" className="text-xs">
              {record.platform}
            </Text>
          </div>
        </Space>
      ),
    },
    {
      title: t('cart.unitPrice'),
      dataIndex: 'price',
      key: 'price',
      width: 120,
      render: (price) => <Text>${price.toFixed(2)}</Text>,
    },
    {
      title: t('cart.quantity'),
      dataIndex: 'quantity',
      key: 'quantity',
      width: 150,
      render: (quantity, record) => (
        <InputNumber
          min={1}
          max={record.stock}
          value={quantity}
          onChange={(value) => handleQuantityChange(record.id, value)}
        />
      ),
    },
    {
      title: t('cart.subtotal'),
      key: 'subtotal',
      width: 120,
      render: (_, record) => (
        <Text strong className="text-primary">
          ${(record.price * record.quantity).toFixed(2)}
        </Text>
      ),
    },
    {
      title: t('cart.action'),
      key: 'action',
      width: 100,
      render: (_, record) => (
        <Popconfirm
          title={t('cart.removeConfirm')}
          onConfirm={() => handleRemove(record.id)}
          okText={t('common.confirm')}
          cancelText={t('common.cancel')}
        >
          <Button type="link" danger icon={<DeleteOutlined />}>
            {t('cart.remove')}
          </Button>
        </Popconfirm>
      ),
    },
  ];

  const totalAmount = cartItems.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );

  if (loading) {
    return (
      <div className="bg-[var(--color-bg-layout)] min-h-screen py-6 px-5">
        <div className="max-w-[1200px] mx-auto">
          <Breadcrumb
            className="mb-6"
            items={[
              { title: <a href="/"><HomeOutlined /></a> },
              { title: t('cart.title') },
            ]}
          />
          <Title level={2} className="mb-6">
            {t('cart.title')}
          </Title>
          <SkeletonCard type="list" count={3} />
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[var(--color-bg-layout)] min-h-screen py-6 px-5">
      <div className="max-w-[1200px] mx-auto">
        {/* Breadcrumb */}
        <Breadcrumb
          className="mb-6"
          items={[
            { title: <a href="/"><HomeOutlined /></a> },
            { title: t('cart.title') },
          ]}
        />

        <Title level={2} className="mb-6">
          {t('cart.title')}
        </Title>

        {cartItems.length === 0 ? (
          <Card>
            <EmptyState type="cart" />
          </Card>
        ) : (
          <Row gutter={24}>
            <Col xs={24} lg={16}>
              <Card>
                <Table
                  columns={columns}
                  dataSource={cartItems}
                  rowKey="id"
                  pagination={false}
                />
              </Card>
            </Col>

            <Col xs={24} lg={8}>
              <Card title={t('cart.orderSummary')} className="sticky top-6">
                <Space direction="vertical" size="large" className="w-full">
                  <div>
                    <div className="flex justify-between mb-2">
                      <Text>{t('cart.totalAmount')}</Text>
                      <Text>${totalAmount.toFixed(2)}</Text>
                    </div>
                    <div className="flex justify-between mb-2">
                      <Text>{t('cart.discount')}</Text>
                      <Text>-$0.00</Text>
                    </div>
                    <div className="border-t border-[var(--color-border-secondary)] pt-3 mt-3 flex justify-between">
                      <Text strong className="text-base">
                        {t('cart.total')}
                      </Text>
                      <Text strong className="text-xl text-primary">
                        ${totalAmount.toFixed(2)}
                      </Text>
                    </div>
                  </div>

                  {/* Payment Method Selection */}
                  <div>
                    <Text strong className="block mb-3">
                      {t('cart.selectPayment')}
                    </Text>
                    <Radio.Group
                      value={paymentMethod}
                      onChange={(e) => setPaymentMethod(e.target.value)}
                      className="w-full"
                    >
                      <Space direction="vertical" className="w-full">
                        <Card
                          size="small"
                          hoverable
                          className={`cursor-pointer ${paymentMethod === 'balance' ? 'border-2 border-primary' : 'border'}`}
                          onClick={() => setPaymentMethod('balance')}
                        >
                          <Radio value="balance">💰 {t('cart.balance')}</Radio>
                          <Text type="secondary" className="block mt-1 text-xs">
                            {t('cart.balanceDesc')}
                          </Text>
                        </Card>
                        <Card
                          size="small"
                          hoverable
                          className={`cursor-pointer ${paymentMethod === 'usdt' ? 'border-2 border-primary' : 'border'}`}
                          onClick={() => setPaymentMethod('usdt')}
                        >
                          <Radio value="usdt">{t('cart.usdt')}</Radio>
                          <Text type="secondary" className="block mt-1 text-xs">
                            {t('cart.usdtDesc')}
                          </Text>
                        </Card>
                        <Card
                          size="small"
                          hoverable
                          className={`cursor-pointer ${paymentMethod === 'paypal' ? 'border-2 border-primary' : 'border'}`}
                          onClick={() => setPaymentMethod('paypal')}
                        >
                          <Radio value="paypal">{t('cart.paypal')}</Radio>
                          <Text type="secondary" className="block mt-1 text-xs">
                            {t('cart.paypalDesc')}
                          </Text>
                        </Card>
                        <Card
                          size="small"
                          hoverable
                          className={`cursor-pointer ${paymentMethod === 'stripe' ? 'border-2 border-primary' : 'border'}`}
                          onClick={() => setPaymentMethod('stripe')}
                        >
                          <Radio value="stripe">💳 {t('cart.stripe')}</Radio>
                          <Text type="secondary" className="block mt-1 text-xs">
                            {t('cart.stripeDesc')}
                          </Text>
                        </Card>
                      </Space>
                    </Radio.Group>
                  </div>

                  <Button
                    type="primary"
                    size="large"
                    block
                    onClick={handleCheckout}
                  >
                    {t('cart.checkout')} ({t('cart.itemsCount', { count: cartItems.length })})
                  </Button>

                  <Button block onClick={() => navigate('/products')}>
                    {t('cart.continueShopping')}
                  </Button>
                </Space>
              </Card>
            </Col>
          </Row>
        )}
      </div>
    </div>
  );
}











