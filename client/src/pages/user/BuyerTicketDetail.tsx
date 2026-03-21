import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Card,
  Button,
  Input,
  message,
  Steps,
  Tag,
  Upload,
  Space,
  Alert,
} from 'antd';
import {
  ArrowLeftOutlined,
  ClockCircleOutlined,
  CheckCircleOutlined,
  PaperClipOutlined,
  SendOutlined,
  UserOutlined,
  ShopOutlined,
  CustomerServiceOutlined,
} from '@ant-design/icons';
import { ticketsService, type Ticket, type TicketMessage } from '@/services/tickets';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import 'dayjs/locale/zh-cn';

dayjs.extend(relativeTime);
dayjs.locale('zh-cn');

const { TextArea } = Input;

export default function BuyerTicketDetail() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { ticketNo } = useParams<{ ticketNo: string }>();
  const queryClient = useQueryClient();
  const [messageContent, setMessageContent] = useState('');
  const [escalateReason, setEscalateReason] = useState('');
  const [showEscalateModal, setShowEscalateModal] = useState(false);

  // 获取工单详情
  const { data: ticket, isLoading } = useQuery<Ticket>({
    queryKey: ['ticket', ticketNo],
    queryFn: () => ticketsService.getTicket(ticketNo!),
    enabled: !!ticketNo,
    refetchInterval: 5000, // 5秒轮询
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

  // 申请平台介入
  const escalateMutation = useMutation({
    mutationFn: (reason: string) =>
      ticketsService.escalateTicket(ticketNo!, { reason }),
    onSuccess: () => {
      message.success(t('ticket.escalateSuccess', '已申请平台介入'));
      setShowEscalateModal(false);
      queryClient.invalidateQueries({ queryKey: ['ticket', ticketNo] });
    },
  });

  // 关闭工单
  const closeMutation = useMutation({
    mutationFn: () => ticketsService.closeTicket(ticketNo!),
    onSuccess: () => {
      message.success(t('ticket.closeSuccess', '工单已关闭'));
      queryClient.invalidateQueries({ queryKey: ['ticket', ticketNo] });
    },
  });

  const getStatusTag = (status: string) => {
    const statusMap: Record<string, { color: string; text: string }> = {
      PENDING: { color: 'default', text: t('ticket.status.pending', '待处理') },
      SELLER_REVIEWING: { color: 'processing', text: t('ticket.status.sellerReviewing', '卖家审核中') },
      SELLER_AGREED: { color: 'success', text: t('ticket.status.sellerAgreed', '卖家已同意') },
      SELLER_REJECTED: { color: 'error', text: t('ticket.status.sellerRejected', '卖家已拒绝') },
      ADMIN_REVIEWING: { color: 'warning', text: t('ticket.status.adminReviewing', '平台审核中') },
      ADMIN_APPROVED: { color: 'success', text: t('ticket.status.adminApproved', '平台已批准') },
      ADMIN_REJECTED: { color: 'error', text: t('ticket.status.adminRejected', '平台已拒绝') },
      COMPLETED: { color: 'success', text: t('ticket.status.completed', '已完成') },
      CLOSED: { color: 'default', text: t('ticket.status.closed', '已关闭') },
      CANCELLED: { color: 'default', text: t('ticket.status.cancelled', '已取消') },
    };
    const { color, text } = statusMap[status] || { color: 'default', text: status };
    return <Tag color={color}>{text}</Tag>;
  };

  const getCurrentStep = () => {
    if (!ticket) return 0;
    switch (ticket.status) {
      case 'PENDING':
      case 'SELLER_REVIEWING':
        return 0;
      case 'SELLER_AGREED':
      case 'ADMIN_REVIEWING':
        return 1;
      case 'ADMIN_APPROVED':
      case 'COMPLETED':
        return 2;
      default:
        return 0;
    }
  };

  const getTimeRemaining = () => {
    if (!ticket?.seller_respond_deadline) return null;
    const deadline = dayjs(ticket.seller_respond_deadline);
    const now = dayjs();
    const diff = deadline.diff(now, 'second');
    if (diff <= 0) return '已超时';
    const hours = Math.floor(diff / 3600);
    const minutes = Math.floor((diff % 3600) / 60);
    return `${hours}小时${minutes}分`;
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
        return t('ticket.buyer', '买家（我）');
      case 'SELLER':
        return t('ticket.seller', '卖家');
      case 'ADMIN':
        return t('ticket.admin', '平台客服');
      default:
        return t('ticket.system', '系统');
    }
  };

  if (isLoading) {
    return <div className="flex items-center justify-center min-h-screen">加载中...</div>;
  }

  if (!ticket) {
    return <div className="flex items-center justify-center min-h-screen">工单不存在</div>;
  }

  return (
    <div className="max-w-5xl mx-auto p-6">
      {/* 头部 */}
      <div className="mb-6">
        <Button
          type="text"
          icon={<ArrowLeftOutlined />}
          onClick={() => navigate('/buyer/tickets')}
        >
          {t('common.back', '返回')}
        </Button>
      </div>

      {/* 工单信息卡片 */}
      <Card className="mb-6">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h2 className="text-2xl font-bold mb-2">
              {ticket.subject}
            </h2>
            <Space>
              <span className="text-gray-500">#{ticket.ticket_no}</span>
              {getStatusTag(ticket.status)}
              {ticket.type === 'REFUND' && (
                <Tag color="red">退款工单</Tag>
              )}
            </Space>
          </div>
          <div className="text-right">
            <div className="text-gray-500 text-sm">
              {dayjs(ticket.created_at).format('YYYY-MM-DD HH:mm')}
            </div>
          </div>
        </div>

        {/* 退款进度 */}
        {ticket.type === 'REFUND' && ticket.status !== 'CLOSED' && ticket.status !== 'CANCELLED' && (
          <div className="mt-6">
            <Steps
              current={getCurrentStep()}
              items={[
                {
                  title: t('ticket.step.sellerReview', '卖家审核'),
                  icon: ticket.status === 'SELLER_REVIEWING' ? <ClockCircleOutlined /> : <CheckCircleOutlined />,
                  description: ticket.status === 'SELLER_REVIEWING' && getTimeRemaining() ? `剩余 ${getTimeRemaining()}` : undefined,
                },
                {
                  title: t('ticket.step.platformReview', '平台审核'),
                  icon: ticket.status === 'ADMIN_REVIEWING' ? <ClockCircleOutlined /> : undefined,
                },
                {
                  title: t('ticket.step.completed', '退款完成'),
                  icon: ticket.status === 'COMPLETED' ? <CheckCircleOutlined /> : undefined,
                },
              ]}
            />

            {/* 退款金额 */}
            {ticket.refund_amount && (
              <div className="mt-6 p-4 bg-blue-50 rounded-lg">
                <div className="flex justify-between items-center">
                  <span className="text-gray-700">退款金额</span>
                  <span className="text-2xl font-bold text-blue-600">
                    ${Number(ticket.refund_amount).toFixed(2)}
                  </span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* 操作提示 */}
        {ticket.status === 'SELLER_REVIEWING' && (
          <Alert
            className="mt-4"
            type="info"
            message="卖家正在审核您的退款申请"
            description="卖家需在48小时内响应，超时将自动同意退款"
            showIcon
          />
        )}

        {ticket.status === 'SELLER_REJECTED' && (
          <Alert
            className="mt-4"
            type="warning"
            message="卖家已拒绝您的退款申请"
            description={
              <div>
                <p>如您对此结果有异议，可申请平台介入</p>
                <Button
                  type="primary"
                  size="small"
                  className="mt-2"
                  onClick={() => setShowEscalateModal(true)}
                >
                  申请平台介入
                </Button>
              </div>
            }
            showIcon
          />
        )}

        {ticket.status === 'ADMIN_REVIEWING' && (
          <Alert
            className="mt-4"
            type="info"
            message="平台正在审核中"
            description="我们将尽快处理您的申请，请耐心等待"
            showIcon
          />
        )}

        {ticket.status === 'COMPLETED' && (
          <Alert
            className="mt-4"
            type="success"
            message="退款已完成"
            description={`$${Number(ticket.refund_amount).toFixed(2)} 已退回至您的账户余额`}
            showIcon
          />
        )}
      </Card>

      {/* 消息列表 */}
      <Card title={t('ticket.messages', '沟通记录')} className="mb-6">
        <div className="space-y-4 max-h-[500px] overflow-y-auto">
          {ticket.messages?.map((msg: TicketMessage) => (
            <div
              key={msg.id}
              className={`flex ${msg.sender_role === 'BUYER' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[70%] ${
                  msg.sender_role === 'BUYER'
                    ? 'bg-blue-500 text-white'
                    : msg.sender_role === 'SYSTEM'
                    ? 'bg-gray-100 text-gray-700'
                    : 'bg-white border'
                } rounded-lg p-4`}
              >
                <div className="flex items-center gap-2 mb-2">
                  {getSenderIcon(msg.sender_role)}
                  <span className="font-medium text-sm">
                    {getSenderName(msg.sender_role)}
                  </span>
                  <span className="text-xs opacity-70">
                    {dayjs(msg.created_at).fromNow()}
                  </span>
                </div>
                <div className="whitespace-pre-wrap">{msg.content}</div>
                {msg.attachments && msg.attachments.length > 0 && (
                  <div className="mt-2 flex gap-2">
                    {msg.attachments.map((url, idx) => (
                      <img
                        key={idx}
                        src={url}
                        alt="attachment"
                        className="w-20 h-20 object-cover rounded cursor-pointer"
                        onClick={() => window.open(url)}
                      />
                    ))}
                  </div>
                )}
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
            placeholder={t('ticket.messagePlaceholder', '输入消息内容...')}
            value={messageContent}
            onChange={(e) => setMessageContent(e.target.value)}
            className="mb-4"
          />
          <div className="flex justify-between">
            <Upload>
              <Button icon={<PaperClipOutlined />}>
                {t('ticket.attachment', '添加附件')}
              </Button>
            </Upload>
            <Space>
              {ticket.status !== 'CLOSED' && (
                <Button onClick={() => closeMutation.mutate()}>
                  {t('ticket.close', '关闭工单')}
                </Button>
              )}
              <Button
                type="primary"
                icon={<SendOutlined />}
                loading={sendMessageMutation.isPending}
                disabled={!messageContent.trim()}
                onClick={() => sendMessageMutation.mutate(messageContent)}
              >
                {t('ticket.send', '发送')}
              </Button>
            </Space>
          </div>
        </Card>
      )}

      {/* 申请平台介入弹窗 */}
      {showEscalateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card title="申请平台介入" className="w-[500px]">
            <TextArea
              rows={4}
              placeholder="请说明您申请平台介入的原因..."
              value={escalateReason}
              onChange={(e) => setEscalateReason(e.target.value)}
              className="mb-4"
            />
            <div className="flex justify-end gap-2">
              <Button onClick={() => setShowEscalateModal(false)}>
                取消
              </Button>
              <Button
                type="primary"
                loading={escalateMutation.isPending}
                disabled={!escalateReason.trim()}
                onClick={() => escalateMutation.mutate(escalateReason)}
              >
                提交
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}



