import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Row,
  Col,
  Card,
  Button,
  Typography,
  Space,
  Tag,
  Descriptions,
  InputNumber,
  Tabs,
  Rate,
  message,
  Modal,
  Radio,
  Progress,
  Avatar,
  Empty,
  Spin,
} from 'antd';
import {
  ShoppingCartOutlined,
  ThunderboltOutlined,
  SafetyOutlined,
  UserOutlined,
  StarFilled,
  EyeOutlined,
  HeartOutlined,
  CheckCircleOutlined,
  CustomerServiceOutlined,
} from '@ant-design/icons';
import { ShareBar } from '@/components/common/ShareButton';
import RelatedProducts from '@/components/product/RelatedProducts';
import { useTranslation } from 'react-i18next';
import { productsService } from '@/services/products';
import { cartService } from '@/services/cart';
import { useCartStore } from '@/store/cartStore';
import type { Product } from '@/services/products';
import PageLoading from '@/components/common/PageLoading';
import PageError from '@/components/common/PageError';
import { useSeo, useStructuredData, generateProductStructuredData } from '@/hooks/useSeo';
import { SellerInfoCard } from '@/components/common/SellerInfoCard';
import apiClient from '@/services/apiClient';
import dayjs from 'dayjs';
import './ProductDetail.css';

const { Title, Paragraph, Text } = Typography;

export default function ProductDetail() {
  const { t } = useTranslation();
  const { id } = useParams();
  const navigate = useNavigate();
  const { fetchCart } = useCartStore();
  const [quantity, setQuantity] = useState(1);
  const [buyModalVisible, setBuyModalVisible] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('balance');
  const [addingToCart, setAddingToCart] = useState(false);


  // 评论状态
  const [reviews, setReviews] = useState<any[]>([]);
  const [reviewStats, setReviewStats] = useState<any>(null);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [reviewPage, setReviewPage] = useState(1);
  const [reviewTotal, setReviewTotal] = useState(0);
  
  // API state
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // SEO - 动态根据商品数据生成
  useSeo({
    title: product ? `${product.title} - $${product.price} | TopiVra` : undefined,
    description: product
      ? `${product.title} - ${product.category?.name || ''} 账号，价格 $${product.price}，库存 ${product.stock}。${product.description?.slice(0, 80) || 'TopiVra 安全担保交易，自动发货。'}`
      : undefined,
    keywords: product
      ? [product.title, product.category?.name || '', product.platform || '', '账号购买', 'TopiVra']
      : undefined,
    ogType: 'product',
    ogImage: product?.images?.[0] || product?.thumbnailUrl || undefined,
    canonicalUrl: product ? `${typeof window !== 'undefined' ? window.location.origin : ''}/products/${product.id}` : undefined,
  });

  // Schema.org 结构化数据（Google 商品富摘要）
  useStructuredData(product ? generateProductStructuredData({
    id: product.id,
    name: product.title,
    description: product.description || '',
    price: product.price,
    currency: 'USD',
    image: product?.images?.[0] || product?.thumbnailUrl,
    seller: product.seller?.username || 'TopiVra',
    availability: product.stock > 0 ? 'in_stock' : 'out_of_stock',
  }) : null);

  // Fetch product detail
  useEffect(() => {
    const fetchProduct = async () => {
      if (!id) return;
      setLoading(true);
      setError(null);
      try {
        const response = await productsService.getProductById(id);
        setProduct(response.data);
      } catch (err) {
        console.error('Failed to fetch product:', err);
        setError(err instanceof Error ? err.message : t('products.detail.loadError'));
      } finally {
        setLoading(false);
      }
    };
    fetchProduct();
  }, [id, t]);

  // Fetch reviews
  const fetchReviews = async (productId: string, page = 1) => {
    setReviewsLoading(true);
    try {
      const [listRes, statsRes] = await Promise.all([
        apiClient.get(`/reviews/product/${productId}?page=${page}&limit=5`),
        apiClient.get(`/reviews/seller-stats/${productId}`).catch(() => ({ data: null })),
      ]);
      setReviews(listRes.data?.items || []);
      setReviewTotal(listRes.data?.total || 0);
      setReviewStats(statsRes.data);
    } catch {
      setReviews([]);
    } finally {
      setReviewsLoading(false);
    }
  };

  useEffect(() => {
    if (product?.id) fetchReviews(product.id, reviewPage);
  }, [product?.id, reviewPage]);

  const handleAddToCart = async () => {
    if (!product) return;
    setAddingToCart(true);
    try {
      await cartService.addToCart(product.id, quantity);
      await fetchCart();
      message.success(t('products.detail.addedToCart'));
    } catch {
      message.error(t('common.error', '操作失败'));
    } finally {
      setAddingToCart(false);
    }
  };

  const handleBuyNow = () => {
    if (!product) return;
    setBuyModalVisible(true);
  };

  const handleConfirmPurchase = () => {
    if (!product) return;
    setBuyModalVisible(false);
    // 携带商品信息跳转结算页
    navigate('/checkout', {
      state: {
        items: [{ productId: product.id, quantity, price: product.price, title: product.title }],
        paymentMethod,
      },
    });
  };

  // Loading state
  if (loading) {
    return <PageLoading tip={t('common.loading')} />;
  }

  // Error state
  if (error || !product) {
    return (
      <PageError
        title={t('common.error')}
        subTitle={error || t('products.detail.notFound')}
        onRetry={() => window.location.reload()}
      />
    );
  }

  // Default images if none provided
  const PLACEHOLDER_SVG = `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='600' height='400' viewBox='0 0 600 400'%3E%3Crect width='600' height='400' fill='%23f0f0f0'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' font-size='48' fill='%23bbb'%3E%F0%9F%93%A6%3C/text%3E%3C/svg%3E`;
  const productImages = product.images?.length > 0 
    ? product.images 
    : [PLACEHOLDER_SVG];

  return (
    <div className="product-detail-container">
      <div className="product-detail-content">

        <Row gutter={24}>
          {/* Left: Product images */}
          <Col xs={24} md={10}>
            <Card>
              <img
                src={productImages[0]}
                alt={product.title}
                className="product-detail-image"
              />
            </Card>
          </Col>

          {/* Right: Product info */}
          <Col xs={24} md={14}>
            <Card>
              <Space direction="vertical" size="large" className="product-detail-actions">
                {/* Title and tags */}
                <div>
                  <Space className="product-detail-tags">
                    {product.category && (
                      <Tag color="blue">{product.category.name}</Tag>
                    )}
                    <Tag color={product.stock > 0 ? 'green' : 'red'}>
                      {product.stock > 0 ? t('products.detail.inStock') : t('products.detail.outOfStock')}
                    </Tag>
                  </Space>
                  <Title level={3} className="product-detail-title">
                    {product.title}
                  </Title>
                  <Space>
                    <Rate disabled defaultValue={product.rating || 0} className="product-detail-rating" />
                    <Text type="secondary">
                      {product.rating || 0} ({product.sales || 0} {t('products.detail.rating')})
                    </Text>
                  </Space>
                  {/* 社交证明 */}
                  <div className="product-social-proof" style={{ display: 'flex', gap: 16, marginTop: 8, padding: '12px 0', borderTop: '1px solid var(--color-border)', borderBottom: '1px solid var(--color-border)' }}>
                    <Space size={4}>
                      <ShoppingCartOutlined style={{ color: '#52c41a' }} />
                      <Text strong style={{ color: '#52c41a' }}>{product.sales || 0}</Text>
                      <Text type="secondary" style={{ fontSize: 12 }}>{t('products.detail.sold', '已售')}</Text>
                    </Space>
                    <Space size={4}>
                      <EyeOutlined style={{ color: '#1890ff' }} />
                      <Text strong style={{ color: '#1890ff' }}>0</Text>
                      <Text type="secondary" style={{ fontSize: 12 }}>{t('products.detail.views', '浏览')}</Text>
                    </Space>
                    <Space size={4}>
                      <HeartOutlined style={{ color: '#ff4d4f' }} />
                      <Text strong style={{ color: '#ff4d4f' }}>0</Text>
                      <Text type="secondary" style={{ fontSize: 12 }}>{t('products.detail.favorites', '收藏')}</Text>
                    </Space>
                  </div>
                </div>

                {/* Price */}
                <div className="product-detail-price-box">
                  <Text type="secondary" className="product-detail-price-label">{t('products.detail.price')}</Text>
                  <div>
                    <Text strong className="product-detail-price-value">
                      ${product.price}
                    </Text>
                    <Text type="secondary" className="product-detail-stock-info">
                      {t('products.stock')}: {product.stock}
                    </Text>
                  </div>
                </div>

                {/* Seller info */}
                <SellerInfoCard
                  sellerId={product.sellerId}
                  sellerName={product.seller?.username}
                  showContactButton={true}
                />

                {/* Quantity selection */}
                <div>
                  <Text strong className="product-detail-quantity-label">
                    {t('products.detail.quantity')}
                  </Text>
                  <InputNumber
                    min={1}
                    max={product.stock}
                    value={quantity}
                    onChange={(val) => setQuantity(val || 1)}
                    style={{ width: 120 }}
                  />
                </div>

                {/* Action buttons */}
                <Space size="large" className="product-detail-actions">
                  <Button
                    size="large"
                    icon={<ShoppingCartOutlined />}
                    onClick={handleAddToCart}
                    className="product-detail-action-btn"
                    disabled={product.stock === 0}
                    loading={addingToCart}
                  >
                    {t('products.detail.addToCart')}
                  </Button>
                  <Button
                    type="primary"
                    size="large"
                    icon={<ThunderboltOutlined />}
                    onClick={handleBuyNow}
                    className="product-detail-action-btn"
                    disabled={product.stock === 0}
                  >
                    {t('products.detail.buyNow')}
                  </Button>
                </Space>


                {/* Share buttons */}
                <ShareBar
                  title={product?.title}
                  text={product ? `${product.title} - $${product.price} | TopiVra` : undefined}
                  ogImage={product?.images?.[0] || product?.thumbnailUrl}
                />
                {/* Guarantee info */}
                <div className="product-detail-guarantee">
                  <Space>
                    <SafetyOutlined className="product-detail-guarantee-icon" />
                    <Text className="product-detail-guarantee-text">
                      {t('products.detail.guarantee')}
                    </Text>
                  </Space>
                </div>
              </Space>
            </Card>
          </Col>
        </Row>

        {/* 购买保障 */}
        <Card style={{ marginTop: 24 }}>
          <Title level={4}>{t('products.detail.guarantees.title', '购买保障')}</Title>
          <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
            <Col xs={24} sm={12} md={6}>
              <div style={{ textAlign: 'center', padding: 16 }}>
                <CheckCircleOutlined style={{ fontSize: 32, color: '#52c41a', marginBottom: 8 }} />
                <Text strong style={{ display: 'block', marginBottom: 4 }}>{t('products.detail.guarantees.refund', '7天退款')}</Text>
                <Text type="secondary" style={{ fontSize: 12 }}>{t('products.detail.guarantees.refundDesc', '7天内无理由退款')}</Text>
              </div>
            </Col>
            <Col xs={24} sm={12} md={6}>
              <div style={{ textAlign: 'center', padding: 16 }}>
                <SafetyOutlined style={{ fontSize: 32, color: '#1890ff', marginBottom: 8 }} />
                <Text strong style={{ display: 'block', marginBottom: 4 }}>{t('products.detail.guarantees.escrow', '担保交易')}</Text>
                <Text type="secondary" style={{ fontSize: 12 }}>{t('products.detail.guarantees.escrowDesc', '平台担保资金安全')}</Text>
              </div>
            </Col>
            <Col xs={24} sm={12} md={6}>
              <div style={{ textAlign: 'center', padding: 16 }}>
                <ThunderboltOutlined style={{ fontSize: 32, color: '#faad14', marginBottom: 8 }} />
                <Text strong style={{ display: 'block', marginBottom: 4 }}>{t('products.detail.guarantees.instant', '即时发货')}</Text>
                <Text type="secondary" style={{ fontSize: 12 }}>{t('products.detail.guarantees.instantDesc', '支付后立即发货')}</Text>
              </div>
            </Col>
            <Col xs={24} sm={12} md={6}>
              <div style={{ textAlign: 'center', padding: 16 }}>
                <CustomerServiceOutlined style={{ fontSize: 32, color: '#722ed1', marginBottom: 8 }} />
                <Text strong style={{ display: 'block', marginBottom: 4 }}>{t('products.detail.guarantees.support', '24H客服')}</Text>
                <Text type="secondary" style={{ fontSize: 12 }}>{t('products.detail.guarantees.supportDesc', '全天候在线支持')}</Text>
              </div>
            </Col>
          </Row>
        </Card>

        {/* Product detail tabs */}
        <Card className="product-detail-tabs-card">
          <Tabs
            items={[
              {
                key: 'description',
                label: t('products.detail.tabs.description'),
                children: (
                  <div>
                    <Paragraph>{product.description || t('products.detail.noDescription')}</Paragraph>
                    <Descriptions bordered column={2} style={{ marginTop: 24 }}>
                      <Descriptions.Item label={t('products.detail.info.id')}>{product.id}</Descriptions.Item>
                      <Descriptions.Item label={t('products.detail.info.category')}>
                        {product.category?.name || '-'}
                      </Descriptions.Item>
                      <Descriptions.Item label={t('products.detail.info.stock')}>{product.stock}</Descriptions.Item>
                      <Descriptions.Item label={t('products.detail.info.sold')}>{product.sales || 0}</Descriptions.Item>
                      <Descriptions.Item label={t('products.detail.info.rating')}>
                        <Rate disabled defaultValue={product.rating || 0} style={{ fontSize: 12 }} />
                      </Descriptions.Item>
                      <Descriptions.Item label={t('products.detail.info.createdAt')}>
                        {new Date(product.createdAt).toLocaleDateString()}
                      </Descriptions.Item>
                    </Descriptions>
                  </div>
                ),
              },
              {
                key: 'faq',
                label: t('products.detail.tabs.faq', '常见问题'),
                children: (
                  <div style={{ maxWidth: 800 }}>
                    <Space direction="vertical" size="large" style={{ width: '100%' }}>
                      <div>
                        <Title level={5}>{t('products.detail.faq.q1', '如何使用购买的账号？')}</Title>
                        <Text type="secondary">{t('products.detail.faq.a1', '购买后会自动发送账号信息到您的订单详情页面，包括账号、密码等登录信息。请按照提供的教程进行登录。')}</Text>
                      </div>
                      <div>
                        <Title level={5}>{t('products.detail.faq.q2', '账号有质量保证吗？')}</Title>
                        <Text type="secondary">{t('products.detail.faq.a2', '所有账号都经过严格筛选，支持7天质保。如遇到账号无法登录或其他问题，可申请退款或换货。')}</Text>
                      </div>
                      <div>
                        <Title level={5}>{t('products.detail.faq.q3', '支付后多久能收到账号？')}</Title>
                        <Text type="secondary">{t('products.detail.faq.a3', '支持自动发货的商品会在支付成功后立即发货，通常在1分钟内。不支持自动发货的商品会在24小时内由卖家手动发货。')}</Text>
                      </div>
                      <div>
                        <Title level={5}>{t('products.detail.faq.q4', '可以退款吗？')}</Title>
                        <Text type="secondary">{t('products.detail.faq.a4', '支持7天无理由退款。如果账号有质量问题，请在订单详情页申请退款，我们会在24小时内处理。')}</Text>
                      </div>
                      <div>
                        <Title level={5}>{t('products.detail.faq.q5', '账号安全吗？')}</Title>
                        <Text type="secondary">{t('products.detail.faq.a5', '我们采用平台担保交易，资金由平台托管。所有账号信息加密传输，确保交易安全。')}</Text>
                      </div>
                    </Space>
                  </div>
                ),
              },
              {
                key: 'reviews',
                label: `${t('products.detail.tabs.reviews')}${reviewTotal > 0 ? ` (${reviewTotal})` : ''}`,
                children: (
                  <div>
                    {/* 评分统计 */}
                    {reviewStats && reviewTotal > 0 && (
                      <div style={{ display: 'flex', gap: 32, alignItems: 'center', marginBottom: 24, padding: 16, background: 'var(--color-bg-secondary)', borderRadius: 10 }}>
                        <div style={{ textAlign: 'center', minWidth: 80 }}>
                          <div style={{ fontSize: 40, fontWeight: 800, color: 'var(--color-accent)', lineHeight: 1 }}>
                            {(reviewStats.averageRating || 0).toFixed(1)}
                          </div>
                          <Rate disabled allowHalf value={reviewStats.averageRating || 0} style={{ fontSize: 14 }} />
                          <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', marginTop: 4 }}>
                            {reviewTotal} {t('products.detail.reviews', '条评价')}
                          </div>
                        </div>
                        <div style={{ flex: 1 }}>
                          {[5, 4, 3, 2, 1].map((star) => (
                            <div key={star} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                              <span style={{ fontSize: 12, color: 'var(--color-text-secondary)', width: 16 }}>{star}</span>
                              <StarFilled style={{ fontSize: 12, color: '#fadb14' }} />
                              <Progress
                                percent={reviewTotal > 0 ? Math.round(((reviewStats.ratingDistribution?.[star] || 0) / reviewTotal) * 100) : 0}
                                size="small"
                                showInfo={false}
                                strokeColor={star >= 4 ? '#52c41a' : star === 3 ? '#faad14' : '#ff4d4f'}
                                style={{ flex: 1, margin: 0 }}
                              />
                              <span style={{ fontSize: 12, color: 'var(--color-text-secondary)', width: 24 }}>
                                {reviewStats.ratingDistribution?.[star] || 0}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* 评论列表 */}
                    {reviewsLoading ? (
                      <div style={{ textAlign: 'center', padding: 40 }}><Spin /></div>
                    ) : reviews.length === 0 ? (
                      <Empty description={t('products.detail.noReviews')} style={{ padding: '40px 0' }} />
                    ) : (
                      <div>
                        {reviews.map((review: any) => (
                          <div key={review.id} style={{ padding: '16px 0', borderBottom: '1px solid var(--color-border)' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                              <Avatar size={36} src={review.user?.avatar} icon={<UserOutlined />} />
                              <div>
                                <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--color-text-primary)' }}>
                                  {review.user?.username || t('products.detail.anonymous', '匿名用户')}
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                  <Rate disabled value={review.rating} style={{ fontSize: 12 }} />
                                  <span style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>
                                    {dayjs(review.createdAt).format('YYYY-MM-DD')}
                                  </span>
                                </div>
                              </div>
                            </div>
                            {review.content && review.content !== '系统自动好评' && (
                              <p style={{ margin: 0, color: 'var(--color-text-primary)', lineHeight: 1.6 }}>
                                {review.content}
                              </p>
                            )}
                            {review.tags?.length > 0 && (
                              <div style={{ marginTop: 6, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                                {review.tags.map((tag: string) => (
                                  <Tag key={tag} color="blue" style={{ fontSize: 11 }}>{tag}</Tag>
                                ))}
                              </div>
                            )}
                          </div>
                        ))}
                        {reviewTotal > 5 && (
                          <div style={{ textAlign: 'center', marginTop: 16 }}>
                            <Button
                              onClick={() => setReviewPage(p => p + 1)}
                              disabled={reviews.length >= reviewTotal}
                            >
                              {t('common.loadMore', '加载更多')}
                            </Button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ),
              },
            ]}
          />
        </Card>

        {/* 相关商品推荐 */}
        <RelatedProducts productId={product.id} />
      </div>

      {/* Purchase confirmation modal */}
      <Modal
        title={t('products.detail.buyModal.title')}
        open={buyModalVisible}
        onCancel={() => setBuyModalVisible(false)}
        onOk={handleConfirmPurchase}
        okText={t('products.detail.buyModal.confirm')}
        cancelText={t('products.detail.buyModal.cancel')}
        width={600}
      >
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          <Descriptions column={1}>
            <Descriptions.Item label={t('products.detail.buyModal.product')}>{product.title}</Descriptions.Item>
            <Descriptions.Item label={t('products.detail.buyModal.unitPrice')}>${product.price}</Descriptions.Item>
            <Descriptions.Item label={t('products.detail.buyModal.quantity')}>{quantity}</Descriptions.Item>
            <Descriptions.Item label={t('products.detail.buyModal.total')}>
              <Text strong className="product-detail-modal-total">
                ${(product.price * quantity).toFixed(2)}
              </Text>
            </Descriptions.Item>
          </Descriptions>

          <div>
            <Text strong className="product-detail-modal-payment-label">
              {t('products.detail.buyModal.paymentMethod')}
            </Text>
            <Radio.Group value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}>
              <Row gutter={[16, 16]}>
                <Col span={12}>
                  <Card
                    hoverable
                    className={`product-detail-payment-card ${paymentMethod === 'balance' ? 'selected' : ''}`}
                    onClick={() => setPaymentMethod('balance')}
                  >
                    <Radio value="balance">💰 {t('products.detail.buyModal.balance')}</Radio>
                    <Text type="secondary" className="product-detail-payment-desc">
                      {t('products.detail.buyModal.balanceDesc')}
                    </Text>
                  </Card>
                </Col>
                <Col span={12}>
                  <Card
                    hoverable
                    className={`product-detail-payment-card ${paymentMethod === 'usdt' ? 'selected' : ''}`}
                    onClick={() => setPaymentMethod('usdt')}
                  >
                    <Radio value="usdt">{t('products.detail.buyModal.usdt')}</Radio>
                    <Text type="secondary" className="product-detail-payment-desc">
                      {t('products.detail.buyModal.usdtDesc')}
                    </Text>
                  </Card>
                </Col>
                <Col span={12}>
                  <Card
                    hoverable
                    className={`product-detail-payment-card ${paymentMethod === 'paypal' ? 'selected' : ''}`}
                    onClick={() => setPaymentMethod('paypal')}
                  >
                    <Radio value="paypal">{t('products.detail.buyModal.paypal')}</Radio>
                    <Text type="secondary" className="product-detail-payment-desc">
                      {t('products.detail.buyModal.paypalDesc')}
                    </Text>
                  </Card>
                </Col>
                <Col span={12}>
                  <Card
                    hoverable
                    className={`product-detail-payment-card ${paymentMethod === 'stripe' ? 'selected' : ''}`}
                    onClick={() => setPaymentMethod('stripe')}
                  >
                    <Radio value="stripe">💳 {t('products.detail.buyModal.stripe')}</Radio>
                    <Text type="secondary" className="product-detail-payment-desc">
                      {t('products.detail.buyModal.stripeDesc')}
                    </Text>
                  </Card>
                </Col>
              </Row>
            </Radio.Group>
          </div>
        </Space>
      </Modal>
    </div>
  );
}