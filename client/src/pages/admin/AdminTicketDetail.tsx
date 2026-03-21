import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useI18n } from '@/hooks/useI18n';
import { useI18nNavigate } from '@/hooks/useI18nNavigate';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Card,
  Button,
  Input,
  message,
  Tag,
  Space,
  Alert,
  Modal,
  Radio,
  InputNumber,
  Descriptions,
} from 'antd';
import {
  ArrowLeftOutlined,
  CheckCircleOutlined,
  SendOutlined,
  UserOutlined,
  ShopOutlined,
  CustomerServiceOutlined,
  SafetyOutlined,
} from '@ant-design/icons';
import { ticketsService, type Ticket, type TicketMessage } from '@/services/tickets';
const { TextArea } = Input;

export default function AdminTicketDetail() {
  const { t } = useTranslation();
  const { formatDateTime, formatRelativeTime } = useI18n();
  const { navigate } = useI18nNavigate();
  const { ticketNo } = useParams<{ ticketNo: string }>();
  const queryClient = useQueryClient();
  const [messageContent, setMessageContent] = useState('');
  const [showProcessModal, setShowProcessModal] = useState(false);
  const [processAction, setProcessAction] = useState<'APPROVE' | 'REJECT'>('APPROVE');
  const [adminResponse, setAdminResponse] = useState('');
  const [refundAmount, setRefundAmount] = useState<number>(0);

  // 获取工单详情
  const { data: ticket, isLoading } = useQuery<Ticket>({
    queryKey: ['ticket', ticketNo],
    queryFn: () => ticketsService.getTicket(ticketNo!),
    enabled: !!ticketNo,
    refetchInterval: 5000,
  });

  // 发送消息
  const sendMessageMutation = useMutation({
    mutationFn: (content: string) =>
      ticketsService.sendMessage(ticketNo!, { content }),
    onSuccess: () => {
      setMessageContent('');
      queryClient.invalidateQueries({ queryKey: ['ticket', ticketNo] });
    },
  });

  // 管理员处理
  const processMutation = useMutation({
    mutationFn: (data: {
      action: 'APPROVE' | 'REJECT';
      adminResponse?: string;
      refundAmount?: number;
    }) => ticketsService.adminProcess(ticketNo!, data),
    onSuccess: () => {
      message.success(t('ticket.adminProcessSuccess', 'Processed successfully'));
      setShowProcessModal(false);
      setAdminResponse('');
      queryClient.invalidateQueries({ queryKey: ['ticket', ticketNo] });
    },
  });

  const adminTicketStatuses: Record<string, { color: string; text: string }> = {
    PENDING: { color: 'default', text: t('ticket.pending', '待处理') },
    SELLER_REVIEWING: { color: 'processing', text: t('ticket.sellerReviewing', '卖家审核中') },
    SELLER_AGREED: { color: 'success', text: t('ticket.sellerAgreed', '卖家已同意') },
    SELLER_REJECTED: { color: 'error', text: t('ticket.sellerRejected', '卖家已拒绝') },
    ADMIN_REVIEWING: { color: 'warning', text: t('ticket.adminPendingAction', '待您处理') },
    ADMIN_APPROVED: { color: 'success', text: t('ticket.approved', '已批准') },
    ADMIN_REJECTED: { color: 'error', text: t('ticket.rejected', '已拒绝') },
    COMPLETED: { color: 'success', text: t('ticket.completed', '已完成') },
    CLOSED: { color: 'default', text: t('ticket.closed', '已关闭') },
  };

  const getStatusTag = (status: string) => {
    const { color, text } = adminTicketStatuses[status] || { color: 'default', text: status };
    return <Tag color={color}>{text}</Tag>;
  };

  const getSenderIcon = (role: string) => {
    switch (role) {
      case 'BUYER':
        return <UserOutlined />;
      case 'SELLER':
        return <ShopOutlined />;
      case 'ADMIN':
        return <CustomerServiceOutlined />;
      default:
        return <CheckCircleOutlined />;
    }
  };

  const getSenderName = (role: string) => {
    switch (role) {
      case 'BUYER':
        return t('ticket.buyer', 'Buyer');
      case 'SELLER':
        return t('ticket.seller', 'Seller');
      case 'ADMIN':
        return `${t('ticket.customerService', 'Support')}（${t('ticket.me', 'Me')}）`;
      default:
        return t('ticket.system', 'System');
    }
  };

  const getMessageBubbleClassName = (role: string) => {
    if (role === 'ADMIN') {
      return 'bg-purple-500 text-white';
    }

    if (role === 'SYSTEM') {
      return 'bg-gray-100 text-gray-700';
    }

    if (role === 'SELLER') {
      return 'bg-green-50 border border-green-200';
    }

    return 'bg-blue-50 border border-blue-200';
  };

  const handleProcess = () => {
    processMutation.mutate({
      action: processAction,
      adminResponse,
      refundAmount: processAction === 'APPROVE' ? refundAmount : undefined,
    });
  };

  if (isLoading) {
    return <div className="flex items-center justify-center min-h-screen">{t('common.loading', 'Loading...')}</div>;
  }

  if (!ticket) {
    return <div className="flex items-center justify-center min-h-screen">{t('ticket.notFound', 'Ticket not found')}</div>;
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      {/* 头部 */}
      <div className="mb-6">
        <Button
          type="text"
          icon={<ArrowLeftOutlined />}
          onClick={() => navigate('/admin/tickets')}
        >
          {t('common.back', 'Back')}
        </Button>
      </div>

      {/* 工单信息卡片 */}
      <Card className="mb-6">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h2 className="text-2xl font-bold mb-2">{ticket.subject}</h2>
            <Space>
              <span className="text-gray-500">#{ticket.ticket_no}</span>
              {getStatusTag(ticket.status)}
              {ticket.type === 'REFUND' && <Tag color="red">{t('ticket.refundTicket', 'Refund ticket')}</Tag>}
            </Space>
          </div>
          <div className="text-right">
            <div className="text-gray-500 text-sm">
              {formatDateTime(ticket.created_at)}
            </div>
          </div>
        </div>

        {/* 工单详情 */}
        {ticket.type === 'REFUND' && (
          <div className="mt-6">
            <Descriptions bordered column={2}>
              <Descriptions.Item label={t('ticket.orderId', 'Order ID')}>{ticket.order_id}</Descriptions.Item>
              <Descriptions.Item label={t('ticket.refundAmount', 'Refund amount')}>
                <span className="text-red-600 font-bold text-lg">
                  ${Number(ticket.refund_amount).toFixed(2)}
                </span>
              </Descriptions.Item>
              <Descriptions.Item label={t('ticket.buyerId', 'Buyer ID')}>{ticket.buyer_id}</Descriptions.Item>
              <Descriptions.Item label={t('ticket.sellerId', 'Seller ID')}>{ticket.seller_id}</Descriptions.Item>
              <Descriptions.Item label={t('ticket.refundReason', 'Refund reason')} span={2}>
                {ticket.refund_reason}
              </Descriptions.Item>
              {ticket.seller_responded_at && (
                <Descriptions.Item label={t('ticket.sellerResponseTime', 'Seller response time')} span={2}>
                  {formatDateTime(ticket.seller_responded_at)}
                </Descriptions.Item>
              )}
            </Descriptions>

            {/* 退款证据 */}
            {ticket.refund_evidence && ticket.refund_evidence.length > 0 && (
              <div className="mt-4">
                <div className="text-gray-700 font-medium mb-2">{t('ticket.buyerEvidence', 'Evidence from buyer:')}</div>
                <div className="flex gap-2">
                  {ticket.refund_evidence.map((url) => (
                    <Button
                      key={url}
                      type="text"
                      className="h-auto w-auto p-0 border-0 bg-transparent"
                      onClick={() => window.open(url, '_blank', 'noopener,noreferrer')}
                    >
                      <img
                        src={url}
                        alt={t('ticket.evidenceImage', 'Evidence image')}
                        className="w-32 h-32 object-cover rounded cursor-pointer border"
                      />
                    </Button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* 操作提示 */}
        {ticket.status === 'ADMIN_REVIEWING' && (
          <Alert
            className="mt-4"
            type="warning"
            message={t('ticket.adminPendingAction', 'Pending your action')}
            description={
              <div>
                <p>{t('ticket.adminReviewInstruction', 'Please review the conversation records and evidence from both parties carefully, then make a fair decision.')}</p>
                <Button
                  type="primary"
                  size="small"
                  icon={<SafetyOutlined />}
                  className="mt-2"
                  onClick={() => {
                    setRefundAmount(Number(ticket.refund_amount) || 0);
                    setShowProcessModal(true);
                  }}
                >
                  {t('ticket.processNow', 'Process now')}
                </Button>
              </div>
            }
            showIcon
          />
        )}

        {ticket.status === 'COMPLETED' && (
          <Alert
            className="mt-4"
            type="success"
            message={t('ticket.completed', 'Completed')}
            description={t('ticket.completedDescription', 'This ticket has been fully processed.')}
            showIcon
          />
        )}
      </Card>

      {/* 消息列表 */}
      <Card title={t('ticket.communicationRecord', 'Communication record')} className="mb-6">
        <div className="space-y-4 max-h-[500px] overflow-y-auto">
          {ticket.messages?.map((msg: TicketMessage) => (
            <div
              key={msg.id}
              className={`flex ${msg.sender_role === 'ADMIN' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[70%] ${getMessageBubbleClassName(msg.sender_role)} rounded-lg p-4`}
              >
                <div className="flex items-center gap-2 mb-2">
                  {getSenderIcon(msg.sender_role)}
                  <span className="font-medium text-sm">
                    {getSenderName(msg.sender_role)}
                  </span>
                  <span className="text-xs opacity-70">
                    {formatRelativeTime(msg.created_at)}
                  </span>
                </div>
                <div className="whitespace-pre-wrap">{msg.content}</div>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* 发送消息 */}
      {ticket.status !== 'CLOSED' && ticket.status !== 'COMPLETED' && (
        <Card>
          <TextArea
            rows={4}
            placeholder={t('ticket.adminMessagePlaceholder', 'Enter a message visible to both buyer and seller...')}
            value={messageContent}
            onChange={(e) => setMessageContent(e.target.value)}
            className="mb-4"
          />
          <div className="flex justify-end">
            <Button
              type="primary"
              icon={<SendOutlined />}
              loading={sendMessageMutation.isPending}
              disabled={!messageContent.trim()}
              onClick={() => sendMessageMutation.mutate(messageContent)}
            >
              {t('ticket.sendMessage', 'Send')}
            </Button>
          </div>
        </Card>
      )}

      {/* 处理工单弹窗 */}
      <Modal
        title={t('ticket.processRefundTicket', 'Process refund ticket')}
        open={showProcessModal}
        onCancel={() => setShowProcessModal(false)}
        width={600}
        footer={[
          <Button key="cancel" onClick={() => setShowProcessModal(false)}>
            {t('common.cancel', 'Cancel')}
          </Button>,
          <Button
            key="submit"
            type="primary"
            loading={processMutation.isPending}
            onClick={handleProcess}
          >
            {t('ticket.confirmProcess', 'Confirm processing')}
          </Button>,
        ]}
      >
        <div className="space-y-4">
          <div>
            <div className="mb-2 font-medium">{t('ticket.processDecision', 'Decision:')}</div>
            <Radio.Group
              value={processAction}
              onChange={(e) => setProcessAction(e.target.value)}
            >
              <Space direction="vertical">
                <Radio value="APPROVE">
                  <span className="text-green-600">{t('ticket.approveRefund', 'Approve refund')}</span>
                </Radio>
                <Radio value="REJECT">
                  <span className="text-red-600">{t('ticket.rejectRefund', 'Reject refund')}</span>
                </Radio>
              </Space>
            </Radio.Group>
          </div>

          {processAction === 'APPROVE' && (
            <div>
              <div className="mb-2 font-medium">{t('ticket.refundAmount', 'Refund amount:')}</div>
              <InputNumber
                prefix="$"
                value={refundAmount}
                onChange={(val) => setRefundAmount(val || 0)}
                min={0}
                max={Number(ticket.refund_amount)}
                precision={2}
                style={{ width: '100%' }}
              />
              <div className="text-gray-500 text-sm mt-1">
                {t('ticket.originalRequestedAmount', 'Original requested amount:')} ${Number(ticket.refund_amount).toFixed(2)}
              </div>
            </div>
          )}

          <div>
            <div className="mb-2 font-medium">{t('ticket.processDescription', 'Processing note:')}</div>
            <TextArea
              rows={4}
              placeholder={t('ticket.processDescriptionPlaceholder', 'Please explain your decision...')}
              value={adminResponse}
              onChange={(e) => setAdminResponse(e.target.value)}
            />
          </div>

          <Alert
            type="warning"
            message={t('ticket.importantNotice', 'Important notice')}
            description={
              processAction === 'APPROVE'
                ? t('ticket.approveRefundNotice', 'After approving the refund, the system will automatically process it and return the amount to the buyer balance.')
                : t('ticket.rejectRefundNotice', 'After rejecting the refund, the ticket will be closed and the buyer can submit a new request.')
            }
            showIcon
          />
        </div>
      </Modal>
    </div>
  );
}



