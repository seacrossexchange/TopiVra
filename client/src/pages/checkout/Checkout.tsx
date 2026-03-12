import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Card,
  Button,
  Typography,
  Space,
  Breadcrumb,
  Result,
  QRCode,
  Input,
  message,
  Row,
  Col,
  Spin,
  Steps,
  Divider,
  Alert,
} from 'antd';
import {
  HomeOutlined,
  ClockCircleOutlined,
  CopyOutlined,
} from '@ant-design/icons';
import { ordersService } from '@/services/orders';
import { useAuthStore } from '@/store/authStore';
import type { Order } from '@/services/orders';

const { Title, Text } = Typography;

interface CartItem {
  id?: string;
  productId: string;
  title: string;
  price: number;
  quantity: number;
  stock?: number;
  platform?: string;
  image?: string;
}

interface CheckoutState {
  items: CartItem[];
  paymentMethod: string;
}

type CheckoutStep = 'confirm' | 'payment' | 'success' | 'failed';

// USDT 钱包地址（从环境变量获取）
const USDT_WALLET_ADDRESS = import.meta.env.VITE_USDT_WALLET || 'TXyz123456789ABCDEFGHIJKLMNOPQRSTUVWxyZ';

export default function Checkout() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated } = useAuthStore();
  
  const [currentStep, setCurrentStep] = useState<CheckoutStep>('confirm');
  const [loading, setLoading] = useState(false);
  const [order, setOrder] = useState<Order | null>(null);
  const [txHash, setTxHash] = useState('');
  const [paymentNo, setPaymentNo] = useState('');
  const [paymentStatus, setPaymentStatus] = useState<'pending' | 'verifying' | 'success' | 'failed'>('pending');
  const [countdown, setCountdown] = useState(30 * 60);
  const [paymentCreatedAt, setPaymentCreatedAt] = useState<number | null>(null);

  const checkoutState = location.state as CheckoutState;

  const totalAmount = useMemo(() => {
    if (!checkoutState?.items) return 0;
    return checkoutState.items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  }, [checkoutState?.items]);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    if (!checkoutState?.items || checkoutState.items.length === 0) {
      navigate('/cart');
      return;
    }
  }, [isAuthenticated, checkoutState, navigate]);

  // 倒计时：从服务端 paymentCreatedAt 动态计算剩余时间
  useEffect(() => {
    if (currentStep !== 'payment') return;
    const PAYMENT_TIMEOUT = 30 * 60; // 30分钟
    const tick = () => {
      const base = paymentCreatedAt || Date.now();
      const elapsed = Math.floor((Date.now() - base) / 1000);
      const remaining = Math.max(0, PAYMENT_TIMEOUT - elapsed);
      setCountdown(remaining);
      if (remaining === 0) setCurrentStep('failed');
    };
    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, [currentStep, paymentCreatedAt]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleCreateOrder = async () => {
    if (!checkoutState?.items) return;
    
    setLoading(true);
    try {
      const orderData = {
        items: checkoutState.items.map((item) => ({
          productId: item.productId,
          quantity: item.quantity,
        })),
        paymentMethod: checkoutState.paymentMethod,
      };
      
      const response = await ordersService.createOrder(orderData);
      setOrder(response.data);
      
      if (checkoutState.paymentMethod === 'usdt') {
        // 创建 USDT 支付
        const paymentResponse = await fetch('/api/payments/create', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${localStorage.getItem('token')}`,
          },
          body: JSON.stringify({
            orderId: response.data.id,
            method: 'USDT',
          }),
        });
        const paymentData = await paymentResponse.json();
        setPaymentNo(paymentData.data?.paymentNo || '');
        setPaymentCreatedAt(paymentData.data?.createdAt ? new Date(paymentData.data.createdAt).getTime() : Date.now());
        setCurrentStep('payment');
      } else if (checkoutState.paymentMethod === 'balance') {
        // 余额支付直接处理
        setCurrentStep('success');
      } else {
        // 其他支付方式
        setPaymentCreatedAt(Date.now());
        setCurrentStep('payment');
      }
    } catch {
      message.error(t('checkout.createOrderFailed'));
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyUsdtPayment = async () => {
    if (!txHash || !paymentNo) {
      message.error(t('checkout.enterTxHash'));
      return;
    }

    setPaymentStatus('verifying');
    try {
      const response = await fetch('/api/payments/usdt/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({
          paymentNo,
          txHash,
        }),
      });
      const data = await response.json();
      
      if (data.success) {
        setPaymentStatus('success');
        setCurrentStep('success');
        message.success(t('checkout.paymentSuccess'));
      } else {
        setPaymentStatus('failed');
        message.error(t('checkout.paymentFailed'));
      }
    } catch {
      setPaymentStatus('failed');
      message.error(t('checkout.paymentFailed'));
    }
  };

  const handleCopyAddress = () => {
    navigator.clipboard.writeText(USDT_WALLET_ADDRESS);
    message.success(t('checkout.addressCopied'));
  };

  const renderConfirmStep = () => (
    <Row gutter={24}>
      <Col xs={24} lg={16}>
        <Card title={t('checkout.orderSummary')} className="mb-6">
          <div className="space-y-4">
            {checkoutState?.items?.map((item, index) => (
              <div key={item.id || item.productId || index} className="flex items-center gap-4 p-4 bg-[var(--color-bg-layout)] rounded-lg">
                {item.image ? (
                  <img
                    src={item.image}
                    alt={item.title}
                    className="w-20 h-20 object-cover rounded"
                  />
                ) : (
                  <div className="w-20 h-20 rounded bg-[var(--color-bg-tertiary)] flex items-center justify-center text-2xl">🛒</div>
                )}
                <div className="flex-1">
                  <Text strong className="block">{item.title}</Text>
                  {item.platform && <Text type="secondary" className="text-sm">{item.platform}</Text>}
                  <div className="flex justify-between mt-2">
                    <Text>${item.price.toFixed(2)} × {item.quantity}</Text>
                    <Text strong>${(item.price * item.quantity).toFixed(2)}</Text>
                  </div>
                </div>
              </div>
            ))}
          </div>
          
          <Divider />
          
          <div className="space-y-2">
            <div className="flex justify-between">
              <Text>{t('checkout.subtotal')}</Text>
              <Text>${totalAmount.toFixed(2)}</Text>
            </div>
            <div className="flex justify-between">
              <Text>{t('checkout.discount')}</Text>
              <Text>$0.00</Text>
            </div>
            <Divider className="my-2" />
            <div className="flex justify-between">
              <Text strong className="text-lg">{t('checkout.total')}</Text>
              <Text strong className="text-xl text-primary">${totalAmount.toFixed(2)}</Text>
            </div>
          </div>
        </Card>
      </Col>

      <Col xs={24} lg={8}>
        <Card title={t('checkout.paymentMethod')} className="sticky top-6">
          <Space direction="vertical" size="large" className="w-full">
            <div className="p-4 bg-[var(--color-bg-layout)] rounded-lg">
              <Text strong className="block mb-2">
                {checkoutState?.paymentMethod === 'usdt' && '🪙 USDT'}
                {checkoutState?.paymentMethod === 'balance' && '💰 ' + t('cart.balance')}
                {checkoutState?.paymentMethod === 'paypal' && '📘 PayPal'}
                {checkoutState?.paymentMethod === 'stripe' && '💳 Stripe'}
              </Text>
              <Text type="secondary" className="text-sm">
                {checkoutState?.paymentMethod === 'usdt' && t('cart.usdtDesc')}
                {checkoutState?.paymentMethod === 'balance' && t('cart.balanceDesc')}
                {checkoutState?.paymentMethod === 'paypal' && t('cart.paypalDesc')}
                {checkoutState?.paymentMethod === 'stripe' && t('cart.stripeDesc')}
              </Text>
            </div>

            <Button
              type="primary"
              size="large"
              block
              loading={loading}
              onClick={handleCreateOrder}
            >
              {t('checkout.confirmOrder')} - ${totalAmount.toFixed(2)}
            </Button>

            <Button block onClick={() => navigate('/cart')}>
              {t('checkout.backToCart')}
            </Button>
          </Space>
        </Card>
      </Col>
    </Row>
  );

  const renderPaymentStep = () => (
    <Row gutter={24}>
      <Col xs={24} lg={16}>
        <Card className="mb-6">
          <div className="text-center">
            <ClockCircleOutlined className="text-4xl text-warning mb-4" />
            <Title level={4}>{t('checkout.usdtPayment')}</Title>
            <Text type="secondary">{t('checkout.usdtPaymentDesc')}</Text>
            
            <div className="mt-6 mb-4">
              <Text type="secondary">{t('checkout.timeRemaining')}</Text>
              <Title level={2} className="text-warning">
                {formatTime(countdown)}
              </Title>
            </div>

            <Divider />

            <div className="mb-6">
              <Text strong className="block mb-2">{t('checkout.amountToPay')}</Text>
              <Title level={3} className="text-primary">${totalAmount.toFixed(2)} USDT</Title>
            </div>

            <div className="mb-6">
              <Text strong className="block mb-2">{t('checkout.walletAddress')}</Text>
              <div className="flex items-center justify-center gap-2 p-3 bg-[var(--color-bg-layout)] rounded-lg max-w-md mx-auto">
                <Text code className="text-sm break-all">{USDT_WALLET_ADDRESS}</Text>
                <Button
                  type="text"
                  icon={<CopyOutlined />}
                  onClick={handleCopyAddress}
                />
              </div>
            </div>

            <div className="mb-6">
              <Text strong className="block mb-4">{t('checkout.scanQr')}</Text>
              <QRCode
                value={`usdt:${USDT_WALLET_ADDRESS}?amount=${totalAmount.toFixed(2)}`}
                size={180}
              />
            </div>

            <Divider />

            <div className="max-w-md mx-auto">
              <Text strong className="block mb-2">{t('checkout.enterTxHash')}</Text>
              <Input
                placeholder={t('checkout.txHashPlaceholder')}
                value={txHash}
                onChange={(e) => setTxHash(e.target.value)}
                className="mb-4"
              />
              <Button
                type="primary"
                size="large"
                block
                loading={paymentStatus === 'verifying'}
                onClick={handleVerifyUsdtPayment}
              >
                {t('checkout.verifyPayment')}
              </Button>
            </div>
          </div>
        </Card>

        <Alert
          type="warning"
          message={t('checkout.paymentNotice')}
          description={t('checkout.paymentNoticeDesc')}
          showIcon
        />
      </Col>

      <Col xs={24} lg={8}>
        <Card title={t('checkout.orderInfo')}>
          {order && (
            <div className="space-y-2">
              <div className="flex justify-between">
                <Text type="secondary">{t('checkout.orderNo')}</Text>
                <Text code>{order.orderNo}</Text>
              </div>
              <div className="flex justify-between">
                <Text type="secondary">{t('checkout.status')}</Text>
                <Text className="text-warning">{t('order.pending')}</Text>
              </div>
            </div>
          )}
        </Card>
      </Col>
    </Row>
  );

  const renderSuccessStep = () => (
    <Result
      status="success"
      title={t('checkout.paymentSuccessTitle')}
      subTitle={t('checkout.paymentSuccessDesc')}
      extra={[
        <Button type="primary" key="orders" onClick={() => navigate('/user/orders')}>
          {t('checkout.viewOrders')}
        </Button>,
        <Button key="home" onClick={() => navigate('/')}>
          {t('checkout.backToHome')}
        </Button>,
      ]}
    />
  );

  const renderFailedStep = () => (
    <Result
      status="error"
      title={t('checkout.paymentFailedTitle')}
      subTitle={t('checkout.paymentFailedDesc')}
      extra={[
        <Button type="primary" key="retry" onClick={() => setCurrentStep('payment')}>
          {t('checkout.retryPayment')}
        </Button>,
        <Button key="cart" onClick={() => navigate('/cart')}>
          {t('checkout.backToCart')}
        </Button>,
      ]}
    />
  );

  if (!checkoutState?.items) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div className="bg-[var(--color-bg-layout)] min-h-screen py-6 px-5">
      <div className="max-w-[1200px] mx-auto">
        <Breadcrumb
          className="mb-6"
          items={[
            { title: <a href="/"><HomeOutlined /></a> },
            { title: t('cart.title') },
            { title: t('checkout.title') },
          ]}
        />

        <Title level={2} className="mb-6">
          {t('checkout.title')}
        </Title>

        <Steps
          current={currentStep === 'confirm' ? 0 : currentStep === 'payment' ? 1 : 2}
          className="mb-8 max-w-2xl"
          items={[
            { title: t('checkout.stepConfirm'), status: currentStep === 'confirm' ? 'process' : 'finish' },
            { title: t('checkout.stepPayment'), status: currentStep === 'payment' ? 'process' : currentStep === 'success' || currentStep === 'failed' ? 'finish' : 'wait' },
            { title: t('checkout.stepComplete'), status: currentStep === 'success' ? 'finish' : currentStep === 'failed' ? 'error' : 'wait' },
          ]}
        />

        {currentStep === 'confirm' && renderConfirmStep()}
        {currentStep === 'payment' && renderPaymentStep()}
        {currentStep === 'success' && renderSuccessStep()}
        {currentStep === 'failed' && renderFailedStep()}
      </div>
    </div>
  );
}