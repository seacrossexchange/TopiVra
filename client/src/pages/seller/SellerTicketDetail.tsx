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
} from 'antd';
import {
  ArrowLeftOutlined,
  CheckCircleOutlined,
  SendOutlined,
  UserOutlined,
  ShopOutlined,
  CustomerServiceOutlined,
} from '@ant-design/icons';
import { ticketsService, type Ticket, type TicketMessage } from '@/services/tickets';

const { TextArea } = Input;

export default function SellerTicketDetail() {
  const { t } = useTranslation();
  const { formatDateTime, formatRelativeTime } = useI18n();
  const { navigate } = useI18nNavigate();
  const { ticketNo } = useParams<{ ticketNo: string }>();
  const queryClient = useQueryClient();
  const [messageContent, setMessageContent] = useState('');
  const [showRespondModal, setShowRespondModal] = useState(false);
  const [respondAction, setRespondAction] = useState<'AGREE' | 'REJECT'>('AGREE');
  const [respondReason, setRespondReason] = useState('');

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

  // 卖家响应
  const respondMutation = useMutation({
    mutationFn: (data: { action: 'AGREE' | 'REJECT'; rejectReason?: string }) =>
      ticketsService.sellerRespond(ticketNo!, data),
    onSuccess: () => {
      message.success(t('ticket.respondSuccess', 'Response submitted successfully'));
      setShowRespondModal(false);
      setRespondReason('');
      queryClient.invalidateQueries({ queryKey: ['ticket', ticketNo] });
    },
  });

  const getStatusTag = (status: string) => {
    const statusMap: Record<string, { color: string; text: string }> = {
      PENDING: { color: 'default', text: t('ticket.pending', 'Pending') },
      SELLER_REVIEWING: { color: 'processing', text: t('ticket.sellerReplyPending', 'Awaiting your response') },
      SELLER_AGREED: { color: 'success', text: t('ticket.sellerAgreedSelf', 'You agreed') },
      SELLER_REJECTED: { color: 'error', text: t('ticket.sellerRejectedSelf', 'You rejected') },
      ADMIN_REVIEWING: { color: 'warning', text: t('ticket.adminReviewing', 'Under platform review') },
      ADMIN_APPROVED: { color: 'success', text: t('ticket.adminApproved', 'Approved by platform') },
      ADMIN_REJECTED: { color: 'error', text: t('ticket.adminRejected', 'Rejected by platform') },
      COMPLETED: { color: 'success', text: t('ticket.completed', 'Completed') },
      CLOSED: { color: 'default', text: t('ticket.closed', 'Closed') },
    };
    const { color, text } = statusMap[status] || { color: 'default', text: status };
    return <Tag color={color}>{text}</Tag>;
  };

  const getTimeRemaining = () => {
    if (!ticket?.seller_respond_deadline) return null;

    const deadline = new Date(ticket.seller_respond_deadline).getTime();
    const now = Date.now();
    const diff = Math.floor((deadline - now) / 1000);

    if (diff <= 0) return t('ticket.overdue', 'Overdue');

    const hours = Math.floor(diff / 3600);
    const minutes = Math.floor((diff % 3600) / 60);

    return t('ticket.timeRemaining', '{{hours}}h {{minutes}}m', { hours, minutes });
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
        return `${t('ticket.seller', 'Seller')}（${t('ticket.me', 'Me')}）`;
      case 'ADMIN':
        return t('ticket.customerService', 'Support');
      default:
        return t('ticket.system', 'System');
    }
  };

  const getMessageBubbleClassName = (role: string) => {
    if (role === 'SELLER') {
      return 'bg-green-500 text-white';
    }

    if (role === 'SYSTEM') {
      return 'bg-gray-100 text-gray-700';
    }

    return 'bg-white border';
  };

  const handleRespond = () => {
    respondMutation.mutate({
      action: respondAction,
      rejectReason: respondAction === 'REJECT' ? respondReason : undefined,
    });
  };

  if (isLoading) {
    return <div className="flex items-center justify-center min-h-screen">{t('common.loading', 'Loading...')}</div>;
  }

  if (!ticket) {
    return <div className="flex items-center justify-center min-h-screen">{t('ticket.notFound', 'Ticket not found')}</div>;
  }

  return (
    <div className="max-w-5xl mx-auto p-6">
      {/* 头部 */}
      <div className="mb-6">
        <Button
          type="text"
          icon={<ArrowLeftOutlined />}
          onClick={() => navigate('/seller/tickets')}
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

        {/* 退款信息 */}
        {ticket.type === 'REFUND' && (
          <div className="mt-6">
            <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
              <div>
                <div className="text-gray-500 text-sm mb-1">{t('ticket.refundAmount', 'Refund amount')}</div>
                <div className="text-2xl font-bold text-red-600">
                  ${Number(ticket.refund_amount).toFixed(2)}
                </div>
              </div>
              <div>
                <div className="text-gray-500 text-sm mb-1">{t('ticket.refundReason', 'Refund reason')}</div>
                <div className="text-gray-900">{ticket.refund_reason}</div>
              </div>
              {ticket.status === 'SELLER_REVIEWING' && (
                <div>
                  <div className="text-gray-500 text-sm mb-1">{t('ticket.responseDeadline', 'Response deadline')}</div>
                  <div className="text-orange-600 font-medium">
                    {t('ticket.remainingLabel', 'Remaining')} {getTimeRemaining()}
                  </div>
                </div>
              )}
            </div>

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
                        className="w-24 h-24 object-cover rounded cursor-pointer border"
                      />
                    </Button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* 操作提示 */}
        {ticket.status === 'SELLER_REVIEWING' && (
          <Alert
            className="mt-4"
            type="warning"
            message={t('ticket.respondRefundPrompt', 'Please respond to the buyer refund request as soon as possible')}
            description={
              <div>
                <p>{t('ticket.respondRefundDeadlineHint', 'You need to respond within 48 hours, otherwise the refund will be automatically approved.')}</p>
                <Button
                  type="primary"
                  size="small"
                  className="mt-2"
                  onClick={() => setShowRespondModal(true)}
                >
                  {t('ticket.respondNow', 'Respond now')}
                </Button>
              </div>
            }
            showIcon
          />
        )}

        {ticket.status === 'SELLER_AGREED' && (
          <Alert
            className="mt-4"
            type="info"
            message={t('ticket.sellerAgreedSelf', 'You agreed')}
            description={t('ticket.sellerAgreedDescription', 'The platform is reviewing this request and will process the refund after approval.')}
            showIcon
          />
        )}

        {ticket.status === 'ADMIN_REVIEWING' && (
          <Alert
            className="mt-4"
            type="info"
            message={t('ticket.adminReviewing', 'Under platform review')}
            description={t('ticket.adminReviewingDescription', 'Please wait for the platform review result.')}
            showIcon
          />
        )}

        {ticket.status === 'COMPLETED' && (
          <Alert
            className="mt-4"
            type="success"
            message={t('ticket.refundCompleted', 'Refund completed')}
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
              className={`flex ${msg.sender_role === 'SELLER' ? 'justify-end' : 'justify-start'}`}
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
            placeholder={t('ticket.inputMessage', 'Enter message...')}
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

      {/* 响应退款弹窗 */}
      <Modal
        title={t('ticket.respondRefundRequest', 'Respond to refund request')}
        open={showRespondModal}
        onCancel={() => setShowRespondModal(false)}
        footer={[
          <Button key="cancel" onClick={() => setShowRespondModal(false)}>
            {t('common.cancel', 'Cancel')}
          </Button>,
          <Button
            key="submit"
            type="primary"
            loading={respondMutation.isPending}
            onClick={handleRespond}
          >
            {t('common.confirm', 'Confirm')}
          </Button>,
        ]}
      >
        <div className="space-y-4">
          <div>
            <div className="mb-2 font-medium">{t('ticket.yourDecision', 'Your decision:')}</div>
            <Radio.Group
              value={respondAction}
              onChange={(e) => setRespondAction(e.target.value)}
            >
              <Space direction="vertical">
                <Radio value="AGREE">
                  <span className="text-green-600">{t('ticket.agreeRefund', 'Agree to refund')}</span>
                </Radio>
                <Radio value="REJECT">
                  <span className="text-red-600">{t('ticket.rejectRefund', 'Reject refund')}</span>
                </Radio>
              </Space>
            </Radio.Group>
          </div>

          {respondAction === 'REJECT' && (
            <div>
              <div className="mb-2 font-medium">{t('ticket.rejectReason', 'Reason for rejection:')}</div>
              <TextArea
                rows={4}
                placeholder={t('ticket.rejectReasonPlaceholder', 'Please explain why you are rejecting the refund...')}
                value={respondReason}
                onChange={(e) => setRespondReason(e.target.value)}
              />
            </div>
          )}

          <Alert
            type="info"
            message={t('ticket.friendlyReminder', 'Friendly reminder')}
            description={
              respondAction === 'AGREE'
                ? t('ticket.agreeRefundNotice', 'After you agree to the refund, the platform will review and process it.')
                : t('ticket.rejectRefundSellerNotice', 'After you reject the refund, the buyer can request platform intervention for arbitration.')
            }
            showIcon
          />
        </div>
      </Modal>
    </div>
  );
}



