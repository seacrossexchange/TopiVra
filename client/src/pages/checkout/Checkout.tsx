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
import { paymentsService } from '@/services/payments';
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
        const paymentResponse = await paymentsService.createPayment({
          orderId: response.data.id,
          method: 'USDT',
        });
        setPaymentNo(paymentResponse.data?.paymentNo || '');
        setPaymentCreatedAt(paymentResponse.data?.createdAt ? new Date(paymentResponse.data.createdAt).getTime() : Date.now());
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
      const response = await paymentsService.verifyUsdtPayment({
        paymentNo,
        txHash,
      });

      if (response.data?.success) {
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
    <div className="max-w-2xl mx-auto">
      <Card>
        {/* 商品列表 - 简化显示 */}
        <div className="mb-6">
          <Text strong className="block mb-4 text-base">{t('checkout.orderSummary')}</Text>
          <div className="space-y-3">
            {checkoutState?.items?.map((item, index) => (
              <div key={item.id || item.productId || index} className="flex justify-between items-center py-2">
                <div className="flex-1">
                  <Text className="block">{item.title}</Text>
                  <Text type="secondary" className="text-sm">× {item.quantity}</Text>
                </div>
                <Text strong>${(item.price * item.quantity).toFixed(2)}</Text>
              </div>
            ))}
          </div>
        </div>

        <Divider />

        {/* 支付方式 - 简化显示 */}
        <div className="mb-6">
          <Text strong className="block mb-3 text-base">{t('checkout.paymentMethod')}</Text>
          <div className="p-3 bg-[var(--color-bg-layout)] rounded-lg">
            <Text strong>
              {checkoutState?.paymentMethod === 'usdt' && '🪙 USDT (TRC20)'}
              {checkoutState?.paymentMethod === 'balance' && '💰 ' + t('cart.balance')}
              {checkoutState?.paymentMethod === 'paypal' && '📘 PayPal'}
              {checkoutState?.paymentMethod === 'stripe' && '💳 Stripe'}
            </Text>
          </div>
        </div>

        <Divider />

        {/* 金额汇总 - 简化显示 */}
        <div className="space-y-3 mb-6">
          <div className="flex justify-between text-base">
            <Text>{t('checkout.total')}</Text>
            <Text strong className="text-2xl text-primary">${totalAmount.toFixed(2)}</Text>
          </div>
        </div>

        {/* 操作按钮 */}
        <Space direction="vertical" size="middle" className="w-full">
          <Button
            type="primary"
            size="large"
            block
            loading={loading}
            onClick={handleCreateOrder}
          >
            {t('checkout.confirmOrder')}
          </Button>
          <Button block onClick={() => navigate('/cart')}>
            {t('checkout.backToCart')}
          </Button>
        </Space>
      </Card>
    </div>
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