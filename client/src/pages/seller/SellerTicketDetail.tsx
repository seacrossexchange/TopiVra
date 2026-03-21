import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
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
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';

dayjs.extend(relativeTime);

const { TextArea } = Input;

export default function SellerTicketDetail() {
  const { t } = useTranslation();
  const navigate = useNavigate();
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
      message.success(t('ticket.respondSuccess', '响应成功'));
      setShowRespondModal(false);
      setRespondReason('');
      queryClient.invalidateQueries({ queryKey: ['ticket', ticketNo] });
    },
  });

  const getStatusTag = (status: string) => {
    const statusMap: Record<string, { color: string; text: string }> = {
      PENDING: { color: 'default', text: '待处理' },
      SELLER_REVIEWING: { color: 'processing', text: '待您响应' },
      SELLER_AGREED: { color: 'success', text: '您已同意' },
      SELLER_REJECTED: { color: 'error', text: '您已拒绝' },
      ADMIN_REVIEWING: { color: 'warning', text: '平台审核中' },
      ADMIN_APPROVED: { color: 'success', text: '平台已批准' },
      ADMIN_REJECTED: { color: 'error', text: '平台已拒绝' },
      COMPLETED: { color: 'success', text: '已完成' },
      CLOSED: { color: 'default', text: '已关闭' },
    };
    const { color, text } = statusMap[status] || { color: 'default', text: status };
    return <Tag color={color}>{text}</Tag>;
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
        return '买家';
      case 'SELLER':
        return '卖家（我）';
      case 'ADMIN':
        return '平台客服';
      default:
        return '系统';
    }
  };

  const handleRespond = () => {
    respondMutation.mutate({
      action: respondAction,
      rejectReason: respondAction === 'REJECT' ? respondReason : undefined,
    });
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
          onClick={() => navigate('/seller/tickets')}
        >
          返回
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
              {ticket.type === 'REFUND' && <Tag color="red">退款工单</Tag>}
            </Space>
          </div>
          <div className="text-right">
            <div className="text-gray-500 text-sm">
              {dayjs(ticket.created_at).format('YYYY-MM-DD HH:mm')}
            </div>
          </div>
        </div>

        {/* 退款信息 */}
        {ticket.type === 'REFUND' && (
          <div className="mt-6">
            <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
              <div>
                <div className="text-gray-500 text-sm mb-1">退款金额</div>
                <div className="text-2xl font-bold text-red-600">
                  ${Number(ticket.refund_amount).toFixed(2)}
                </div>
              </div>
              <div>
                <div className="text-gray-500 text-sm mb-1">退款原因</div>
                <div className="text-gray-900">{ticket.refund_reason}</div>
              </div>
              {ticket.status === 'SELLER_REVIEWING' && (
                <div>
                  <div className="text-gray-500 text-sm mb-1">响应期限</div>
                  <div className="text-orange-600 font-medium">
                    剩余 {getTimeRemaining()}
                  </div>
                </div>
              )}
            </div>

            {/* 退款证据 */}
            {ticket.refund_evidence && ticket.refund_evidence.length > 0 && (
              <div className="mt-4">
                <div className="text-gray-700 font-medium mb-2">买家提供的证据：</div>
                <div className="flex gap-2">
                  {ticket.refund_evidence.map((url, idx) => (
                    <img
                      key={idx}
                      src={url}
                      alt="evidence"
                      className="w-24 h-24 object-cover rounded cursor-pointer border"
                      onClick={() => window.open(url)}
                    />
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
            message="请尽快响应买家的退款申请"
            description={
              <div>
                <p>您需要在48小时内响应，超时将自动同意退款</p>
                <Button
                  type="primary"
                  size="small"
                  className="mt-2"
                  onClick={() => setShowRespondModal(true)}
                >
                  立即响应
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
            message="您已同意退款"
            description="平台正在审核中，审核通过后将执行退款"
            showIcon
          />
        )}

        {ticket.status === 'ADMIN_REVIEWING' && (
          <Alert
            className="mt-4"
            type="info"
            message="平台正在审核中"
            description="请耐心等待平台审核结果"
            showIcon
          />
        )}

        {ticket.status === 'COMPLETED' && (
          <Alert
            className="mt-4"
            type="success"
            message="退款已完成"
            description="此工单已处理完毕"
            showIcon
          />
        )}
      </Card>

      {/* 消息列表 */}
      <Card title="沟通记录" className="mb-6">
        <div className="space-y-4 max-h-[500px] overflow-y-auto">
          {ticket.messages?.map((msg: TicketMessage) => (
            <div
              key={msg.id}
              className={`flex ${msg.sender_role === 'SELLER' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[70%] ${
                  msg.sender_role === 'SELLER'
                    ? 'bg-green-500 text-white'
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
            placeholder="输入消息内容..."
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
              发送
            </Button>
          </div>
        </Card>
      )}

      {/* 响应退款弹窗 */}
      <Modal
        title="响应退款申请"
        open={showRespondModal}
        onCancel={() => setShowRespondModal(false)}
        footer={[
          <Button key="cancel" onClick={() => setShowRespondModal(false)}>
            取消
          </Button>,
          <Button
            key="submit"
            type="primary"
            loading={respondMutation.isPending}
            onClick={handleRespond}
          >
            确认
          </Button>,
        ]}
      >
        <div className="space-y-4">
          <div>
            <div className="mb-2 font-medium">您的决定：</div>
            <Radio.Group
              value={respondAction}
              onChange={(e) => setRespondAction(e.target.value)}
            >
              <Space direction="vertical">
                <Radio value="AGREE">
                  <span className="text-green-600">同意退款</span>
                </Radio>
                <Radio value="REJECT">
                  <span className="text-red-600">拒绝退款</span>
                </Radio>
              </Space>
            </Radio.Group>
          </div>

          {respondAction === 'REJECT' && (
            <div>
              <div className="mb-2 font-medium">拒绝原因：</div>
              <TextArea
                rows={4}
                placeholder="请说明拒绝退款的原因..."
                value={respondReason}
                onChange={(e) => setRespondReason(e.target.value)}
              />
            </div>
          )}

          <Alert
            type="info"
            message="温馨提示"
            description={
              respondAction === 'AGREE'
                ? '同意退款后，平台将审核并执行退款操作'
                : '拒绝退款后，买家可申请平台介入，由平台仲裁'
            }
            showIcon
          />
        </div>
      </Modal>
    </div>
  );
}






