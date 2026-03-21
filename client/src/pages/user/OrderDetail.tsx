import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, Descriptions, Tag, Button, Space, Steps, Timeline, message, Alert, Progress } from 'antd';
import { ArrowLeftOutlined, CopyOutlined, CheckCircleOutlined, ClockCircleOutlined, RollbackOutlined, LoadingOutlined, SyncOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import dayjs from 'dayjs';
import apiClient from '@/services/apiClient';
import PageLoading from '@/components/common/PageLoading';
import PageError from '@/components/common/PageError';
import RefundModal from '@/components/order/RefundModal';
import { useDeliveryStream } from '@/hooks/useDeliveryStream';
import './OrderDetail.css';

interface OrderItem {
  id: string;
  productId: string;
  productTitle: string;
  productCover?: string;
  price: number;
  quantity: number;
  sellerId: string;
  sellerName: string;
  status: string;
  deliveredAt?: string;
  deliveryInfo?: string;
}

interface Order {
  id: string;
  orderNo: string;
  status: string;
  totalAmount: number;
  paymentStatus: string;
  paymentMethod?: string;
  createdAt: string;
  paidAt?: string;
  deliveredAt?: string;
  completedAt?: string;
  cancelledAt?: string;
  refundedAt?: string;
  items: OrderItem[];
  buyerId: string;
  buyerEmail?: string;
  notes?: string;
}

export default function OrderDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [refundModalOpen, setRefundModalOpen] = useState(false);

  // SSE 自动发货实时进度
  const { events: deliveryEvents, status: streamStatus, progress: deliveryProgress, allSuccess: deliveryAllSuccess } = useDeliveryStream(id);

  // 获取订单详情
  const { data: order, isLoading, error } = useQuery<Order>({
    queryKey: ['order', id],
    queryFn: async () => {
      const response = await apiClient.get(`/orders/${id}`);
      return response.data;
    },
    enabled: !!id,
  });

  // 取消订单
  const cancelMutation = useMutation({
    mutationFn: async () => {
      return apiClient.put(`/orders/${id}/cancel`);
    },
    onSuccess: () => {
      message.success(t('order.cancelSuccess'));
      queryClient.invalidateQueries({ queryKey: ['order', id] });
      queryClient.invalidateQueries({ queryKey: ['user-orders'] });
    },
  });

  // 确认收货
  const confirmMutation = useMutation({
    mutationFn: async () => {
      return apiClient.put(`/orders/${id}/confirm`);
    },
    onSuccess: () => {
      message.success(t('order.confirmSuccess'));
      queryClient.invalidateQueries({ queryKey: ['order', id] });
      queryClient.invalidateQueries({ queryKey: ['user-orders'] });
    },
  });

  // 复制交付信息
  const copyDeliveryInfo = (info: string) => {
    navigator.clipboard.writeText(info);
    message.success(t('common.copySuccess'));
  };

  const getStatusTag = (status: string) => {
    const statusMap: Record<string, { color: string; text: string }> = {
      PENDING_PAYMENT: { color: 'warning', text: t('order.pendingPayment') },
      PAID: { color: 'processing', text: t('order.paid') },
      DELIVERED: { color: 'cyan', text: t('order.delivered') },
      COMPLETED: { color: 'success', text: t('order.completed') },
      CANCELLED: { color: 'default', text: t('order.cancelled') },
      REFUNDED: { color: 'magenta', text: t('order.refunded') },
    };
    const { color, text } = statusMap[status] || { color: 'default', text: status };
    return <Tag color={color}>{text}</Tag>;
  };

  const getPaymentStatusTag = (status: string) => {
    const statusMap: Record<string, { color: string; text: string }> = {
      PENDING: { color: 'warning', text: t('order.unpaid') },
      PAID: { color: 'success', text: t('order.paid') },
      REFUNDED: { color: 'default', text: t('order.refunded') },
    };
    const { color, text } = statusMap[status] || { color: 'default', text: status };
    return <Tag color={color}>{text}</Tag>;
  };

  // 获取当前步骤
  const getCurrentStep = () => {
    if (!order) return 0;
    switch (order.status) {
      case 'PENDING_PAYMENT':
        return 0;
      case 'PAID':
        return 1;
      case 'DELIVERED':
        return 2;
      case 'COMPLETED':
        return 3;
      case 'CANCELLED':
      case 'REFUNDED':
        return -1;
      default:
        return 0;
    }
  };

  // 获取时间线
  const getTimeline = () => {
    if (!order) return [];
    const timeline = [
      {
        color: 'green',
        children: (
          <div className="timeline-item">
            <div className="timeline-title">{t('order.timeline.created')}</div>
            <div className="timeline-time">{dayjs(order.createdAt).format('YYYY-MM-DD HH:mm:ss')}</div>
          </div>
        ),
      },
    ];

    if (order.paidAt) {
      timeline.push({
        color: 'green',
        children: (
          <div className="timeline-item">
            <div className="timeline-title">{t('order.timeline.paid')}</div>
            <div className="timeline-time">{dayjs(order.paidAt).format('YYYY-MM-DD HH:mm:ss')}</div>
          </div>
        ),
      });
    }

    if (order.deliveredAt) {
      timeline.push({
        color: 'green',
        children: (
          <div className="timeline-item">
            <div className="timeline-title">{t('order.timeline.delivered')}</div>
            <div className="timeline-time">{dayjs(order.deliveredAt).format('YYYY-MM-DD HH:mm:ss')}</div>
          </div>
        ),
      });
    }

    if (order.completedAt) {
      timeline.push({
        color: 'green',
        children: (
          <div className="timeline-item">
            <div className="timeline-title">{t('order.timeline.completed')}</div>
            <div className="timeline-time">{dayjs(order.completedAt).format('YYYY-MM-DD HH:mm:ss')}</div>
          </div>
        ),
      });
    }

    if (order.cancelledAt) {
      timeline.push({
        color: 'red',
        children: (
          <div className="timeline-item">
            <div className="timeline-title">{t('order.timeline.cancelled')}</div>
            <div className="timeline-time">{dayjs(order.cancelledAt).format('YYYY-MM-DD HH:mm:ss')}</div>
          </div>
        ),
      });
    }

    if (order.refundedAt) {
      timeline.push({
        color: 'magenta',
        children: (
          <div className="timeline-item">
            <div className="timeline-title">{t('order.timeline.refunded')}</div>
            <div className="timeline-time">{dayjs(order.refundedAt).format('YYYY-MM-DD HH:mm:ss')}</div>
          </div>
        ),
      });
    }

    return timeline;
  };

  if (isLoading) {
    return <PageLoading />;
  }

  if (error || !order) {
    return <PageError title={t('order.notFound')} onRetry={() => navigate('/user/orders')} />;
  }

  const currentStep = getCurrentStep();

  return (
    <div className="order-detail-page">
      <div className="order-detail-header">
        <Button
          type="text"
          icon={<ArrowLeftOutlined />}
          onClick={() => navigate('/user/orders')}
        >
          {t('common.back')}
        </Button>
        <h2>{t('order.detail')}</h2>
      </div>

      {/* 状态步骤条 */}
      {currentStep >= 0 && (
        <Card className="order-status-card">
          <Steps
            current={currentStep}
            items={[
              {
                title: t('order.step.pending'),
                icon: <ClockCircleOutlined />,
              },
              {
                title: t('order.step.paid'),
                icon: <CheckCircleOutlined />,
              },
              {
                title: t('order.step.delivered'),
                icon: <CheckCircleOutlined />,
              },
              {
                title: t('order.step.completed'),
                icon: <CheckCircleOutlined />,
              },
            ]}
          />
        </Card>
      )}

      {/* 取消/退款状态 */}
      {(order.status === 'CANCELLED' || order.status === 'REFUNDED') && (
        <Alert
          type={order.status === 'CANCELLED' ? 'warning' : 'info'}
          message={order.status === 'CANCELLED' ? t('order.cancelled') : t('order.refunded')}
          description={order.status === 'REFUNDED' ? t('order.refundDesc') : undefined}
          showIcon
          className="order-alert"
        />
      )}

      {/* 自动发货实时进度（SSE） */}
      {(streamStatus === 'connecting' || streamStatus === 'streaming' || streamStatus === 'completed') && (
        <Card
          className="delivery-stream-card"
          title={
            <Space>
              {streamStatus === 'streaming' ? <SyncOutlined spin /> : streamStatus === 'completed' ? <CheckCircleOutlined style={{ color: deliveryAllSuccess ? 'var(--color-success)' : 'var(--color-warning)' }} /> : <LoadingOutlined />}
              {t('order.autoDelivery.title', '自动发货进度')}
            </Space>
          }
        >
          <Progress
            percent={deliveryProgress}
            status={streamStatus === 'completed' ? (deliveryAllSuccess ? 'success' : 'exception') : 'active'}
            strokeColor={deliveryAllSuccess === false ? 'var(--color-warning)' : undefined}
          />
          <div className="delivery-stream-events">
            {deliveryEvents.map((ev, i) => (
              <div key={i} className={`stream-event stream-event--${ev.type.toLowerCase()}`}>
                {ev.type === 'STARTED' && (
                  <span>{t('order.autoDelivery.started', '开始自动发货...')}</span>
                )}
                {ev.type === 'ITEM_PROCESSING' && (
                  <span>{t('order.autoDelivery.processing', '正在处理')} [{ev.itemIndex}/{ev.totalItems}] {ev.productTitle}</span>
                )}
                {ev.type === 'ITEM_SUCCESS' && (
                  <span style={{ color: 'var(--color-success)' }}>✓ {ev.productTitle} — {t('order.autoDelivery.success', '发货成功')}，{t('order.autoDelivery.accountCount', '分配账号')} {ev.accountCount} {t('order.autoDelivery.units', '个')}</span>
                )}
                {ev.type === 'ITEM_FAILED' && (
                  <span style={{ color: 'var(--color-error)' }}>✗ {ev.productTitle} — {ev.error === 'NOT_AUTO_DELIVER' ? t('order.autoDelivery.notAutoDeliver', '不支持自动发货') : ev.error}</span>
                )}
                {ev.type === 'COMPLETED' && (
                  <span style={{ color: 'var(--color-success)' }}>🎉 {t('order.autoDelivery.completed', '全部发货完成，请查收账号信息')}</span>
                )}
                {ev.type === 'PARTIAL_FAILED' && (
                  <span style={{ color: 'var(--color-warning)' }}>⚠ {t('order.autoDelivery.partialFailed', '部分商品发货失败，请联系卖家处理')}</span>
                )}
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* 订单信息 */}
      <Card title={t('order.orderInfo')} className="order-info-card">
        <Descriptions column={{ xs: 1, sm: 2 }} bordered size="small">
          <Descriptions.Item label={t('order.orderNo')}>
            <span className="order-no">{order.orderNo}</span>
          </Descriptions.Item>
          <Descriptions.Item label={t('order.status')}>
            {getStatusTag(order.status)}
          </Descriptions.Item>
          <Descriptions.Item label={t('order.paymentStatus')}>
            {getPaymentStatusTag(order.paymentStatus)}
          </Descriptions.Item>
          <Descriptions.Item label={t('order.paymentMethod')}>
            {order.paymentMethod || '-'}
          </Descriptions.Item>
          <Descriptions.Item label={t('order.createTime')}>
            {dayjs(order.createdAt).format('YYYY-MM-DD HH:mm:ss')}
          </Descriptions.Item>
          {order.paidAt && (
            <Descriptions.Item label={t('order.paidAt')}>
              {dayjs(order.paidAt).format('YYYY-MM-DD HH:mm:ss')}
            </Descriptions.Item>
          )}
        </Descriptions>
      </Card>

      {/* 商品列表 */}
      <Card title={t('order.productList')} className="order-products-card">
        <div className="product-list">
          {order.items?.map((item, index) => (
            <div key={index} className="product-item">
              <div className="product-image">
                {item.productCover ? (
                  <img src={item.productCover} alt={item.productTitle} />
                ) : (
                  <div className="product-image-placeholder">
                    <span>{item.productTitle?.charAt(0) || 'P'}</span>
                  </div>
                )}
              </div>
              <div className="product-info">
                <div className="product-title">{item.productTitle}</div>
                <div className="product-meta">
                  <span>{t('order.seller')}: {item.sellerName}</span>
                  <span>{t('order.quantity')}: {item.quantity}</span>
                </div>
                <div className="product-price">
                  ${item.price.toFixed(2)}
                </div>
              </div>
            </div>
          ))}
        </div>
        <div className="order-total">
          <span>{t('order.totalAmount')}:</span>
          <span className="total-amount">${order.totalAmount.toFixed(2)}</span>
        </div>
      </Card>

      {/* 交付信息 */}
      {(order.status === 'DELIVERED' || order.status === 'COMPLETED') && order.items?.some(item => item.deliveryInfo) && (
        <Card title={t('order.deliveryInfo')} className="delivery-card">
          <Alert
            type="success"
            message={t('order.deliverySuccess')}
            className="delivery-alert"
          />
          {order.items.map((item, index) => (
            item.deliveryInfo && (
              <div key={index} className="delivery-item">
                <div className="delivery-product">{item.productTitle}</div>
                <div className="delivery-content">
                  <pre>{item.deliveryInfo}</pre>
                  <Button
                    type="primary"
                    size="small"
                    icon={<CopyOutlined />}
                    onClick={() => copyDeliveryInfo(item.deliveryInfo!)}
                  >
                    {t('common.copy')}
                  </Button>
                </div>
              </div>
            )
          ))}
        </Card>
      )}

      {/* 时间线 */}
      <Card title={t('order.timeline.title')} className="timeline-card">
        <Timeline items={getTimeline()} />
      </Card>

      {/* 操作按钮 */}
      <div className="order-actions">
        {order.status === 'PENDING_PAYMENT' && (
          <Space>
            <Button onClick={() => navigate(`/checkout?orderId=${order.id}`)}>
              {t('order.pay')}
            </Button>
            <Button
              danger
              onClick={() => cancelMutation.mutate()}
              loading={cancelMutation.isPending}
            >
              {t('order.cancel')}
            </Button>
          </Space>
        )}
        {order.status === 'DELIVERED' && (
          <Space>
            <Button
              type="primary"
              onClick={() => confirmMutation.mutate()}
              loading={confirmMutation.isPending}
            >
              {t('order.confirm')}
            </Button>
            <Button
              icon={<RollbackOutlined />}
              onClick={() => setRefundModalOpen(true)}
            >
              {t('refund.apply', '申请退款')}
            </Button>
          </Space>
        )}
        {order.status === 'PAID' && (
          <Button
            icon={<RollbackOutlined />}
            onClick={() => setRefundModalOpen(true)}
          >
            {t('refund.apply', '申请退款')}
          </Button>
        )}
        <Button onClick={() => navigate('/user/orders')}>
          {t('order.backToList')}
        </Button>
      </div>

      {/* 退款申请弹窗 */}
      <RefundModal
        open={refundModalOpen}
        orderId={order.id}
        orderNo={order.orderNo}
        orderAmount={order.totalAmount}
        onClose={() => setRefundModalOpen(false)}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ['order', id] });
          queryClient.invalidateQueries({ queryKey: ['user-orders'] });
        }}
      />
    </div>
  );
}
