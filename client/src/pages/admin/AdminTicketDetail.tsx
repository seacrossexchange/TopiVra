import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
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
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';

dayjs.extend(relativeTime);

const { TextArea } = Input;

export default function AdminTicketDetail() {
  const navigate = useNavigate();
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
      message.success('处理成功');
      setShowProcessModal(false);
      setAdminResponse('');
      queryClient.invalidateQueries({ queryKey: ['ticket', ticketNo] });
    },
  });

  const getStatusTag = (status: string) => {
    const statusMap: Record<string, { color: string; text: string }> = {
      PENDING: { color: 'default', text: '待处理' },
      SELLER_REVIEWING: { color: 'processing', text: '卖家审核中' },
      SELLER_AGREED: { color: 'success', text: '卖家已同意' },
      SELLER_REJECTED: { color: 'error', text: '卖家已拒绝' },
      ADMIN_REVIEWING: { color: 'warning', text: '待您处理' },
      ADMIN_APPROVED: { color: 'success', text: '已批准' },
      ADMIN_REJECTED: { color: 'error', text: '已拒绝' },
      COMPLETED: { color: 'success', text: '已完成' },
      CLOSED: { color: 'default', text: '已关闭' },
    };
    const { color, text } = statusMap[status] || { color: 'default', text: status };
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
        return '买家';
      case 'SELLER':
        return '卖家';
      case 'ADMIN':
        return '平台客服（我）';
      default:
        return '系统';
    }
  };

  const handleProcess = () => {
    processMutation.mutate({
      action: processAction,
      adminResponse,
      refundAmount: processAction === 'APPROVE' ? refundAmount : undefined,
    });
  };

  if (isLoading) {
    return <div className="flex items-center justify-center min-h-screen">加载中...</div>;
  }

  if (!ticket) {
    return <div className="flex items-center justify-center min-h-screen">工单不存在</div>;
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

        {/* 工单详情 */}
        {ticket.type === 'REFUND' && (
          <div className="mt-6">
            <Descriptions bordered column={2}>
              <Descriptions.Item label="订单ID">{ticket.order_id}</Descriptions.Item>
              <Descriptions.Item label="退款金额">
                <span className="text-red-600 font-bold text-lg">
                  ${Number(ticket.refund_amount).toFixed(2)}
                </span>
              </Descriptions.Item>
              <Descriptions.Item label="买家ID">{ticket.buyer_id}</Descriptions.Item>
              <Descriptions.Item label="卖家ID">{ticket.seller_id}</Descriptions.Item>
              <Descriptions.Item label="退款原因" span={2}>
                {ticket.refund_reason}
              </Descriptions.Item>
              {ticket.seller_responded_at && (
                <Descriptions.Item label="卖家响应时间" span={2}>
                  {dayjs(ticket.seller_responded_at).format('YYYY-MM-DD HH:mm:ss')}
                </Descriptions.Item>
              )}
            </Descriptions>

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
                      className="w-32 h-32 object-cover rounded cursor-pointer border"
                      onClick={() => window.open(url)}
                    />
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
            message="待您处理"
            description={
              <div>
                <p>请仔细审核买卖双方的沟通记录和证据，做出公正的裁决</p>
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
                  立即处理
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
            message="已完成"
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
              className={`flex ${msg.sender_role === 'ADMIN' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[70%] ${
                  msg.sender_role === 'ADMIN'
                    ? 'bg-purple-500 text-white'
                    : msg.sender_role === 'SYSTEM'
                    ? 'bg-gray-100 text-gray-700'
                    : msg.sender_role === 'SELLER'
                    ? 'bg-green-50 border border-green-200'
                    : 'bg-blue-50 border border-blue-200'
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
            placeholder="输入消息内容（买卖双方都能看到）..."
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

      {/* 处理工单弹窗 */}
      <Modal
        title="处理退款工单"
        open={showProcessModal}
        onCancel={() => setShowProcessModal(false)}
        width={600}
        footer={[
          <Button key="cancel" onClick={() => setShowProcessModal(false)}>
            取消
          </Button>,
          <Button
            key="submit"
            type="primary"
            loading={processMutation.isPending}
            onClick={handleProcess}
          >
            确认处理
          </Button>,
        ]}
      >
        <div className="space-y-4">
          <div>
            <div className="mb-2 font-medium">处理决定：</div>
            <Radio.Group
              value={processAction}
              onChange={(e) => setProcessAction(e.target.value)}
            >
              <Space direction="vertical">
                <Radio value="APPROVE">
                  <span className="text-green-600">批准退款</span>
                </Radio>
                <Radio value="REJECT">
                  <span className="text-red-600">拒绝退款</span>
                </Radio>
              </Space>
            </Radio.Group>
          </div>

          {processAction === 'APPROVE' && (
            <div>
              <div className="mb-2 font-medium">退款金额：</div>
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
                原申请金额：${Number(ticket.refund_amount).toFixed(2)}
              </div>
            </div>
          )}

          <div>
            <div className="mb-2 font-medium">处理说明：</div>
            <TextArea
              rows={4}
              placeholder="请说明您的处理理由..."
              value={adminResponse}
              onChange={(e) => setAdminResponse(e.target.value)}
            />
          </div>

          <Alert
            type="warning"
            message="重要提示"
            description={
              processAction === 'APPROVE'
                ? '批准退款后，系统将自动执行退款操作，退款金额将返回至买家账户余额'
                : '拒绝退款后，工单将关闭，买家可重新申请'
            }
            showIcon
          />
        </div>
      </Modal>
    </div>
  );
}



