import { useState } from 'react';
import {
  Row,
  Col,
  Card,
  List,
  Button,
  Input,
  Tag,
  Space,
  Typography,
  Avatar,
  Badge,
  Radio,
  Empty,
  message,
  Modal,
  Form,
  Select,
  Spin,
} from 'antd';
import {
  PlusOutlined,
  MessageOutlined,
  CustomerServiceOutlined,
  ClockCircleOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '@/services/apiClient';
import PageLoading from '@/components/common/PageLoading';
import PageError from '@/components/common/PageError';

const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;

interface Ticket {
  id: string;
  ticketNo: string;
  subject: string;
  type: 'ORDER' | 'PAYMENT' | 'ACCOUNT' | 'OTHER';
  status: 'OPEN' | 'IN_PROGRESS' | 'CLOSED';
  lastMessage?: string;
  lastMessageTime?: string;
  unread?: number;
  createdAt: string;
  messages?: TicketMessage[];
}

interface TicketMessage {
  id: string;
  sender: 'USER' | 'ADMIN';
  content: string;
  createdAt: string;
}

interface CreateTicketValues {
  type: 'ORDER' | 'PAYMENT' | 'ACCOUNT' | 'OTHER';
  orderId?: string;
  subject: string;
  description: string;
}

export default function UserTickets() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [replyContent, setReplyContent] = useState('');
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [form] = Form.useForm();

  // 获取工单列表
  const { data: ticketsData, isLoading: ticketsLoading, error: ticketsError } = useQuery({
    queryKey: ['user-tickets', filterStatus],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filterStatus !== 'all') {
        params.append('status', filterStatus);
      }
      const response = await apiClient.get(`/tickets?${params.toString()}`);
      return response.data;
    },
  });

  // 获取选中工单详情
  const { data: ticketDetail, isLoading: detailLoading } = useQuery({
    queryKey: ['ticket-detail', selectedTicketId],
    queryFn: async () => {
      if (!selectedTicketId) return null;
      const response = await apiClient.get(`/tickets/${selectedTicketId}`);
      return response.data;
    },
    enabled: !!selectedTicketId,
  });

  // 创建工单
  const createMutation = useMutation({
    mutationFn: async (values: CreateTicketValues) => {
      return apiClient.post('/tickets', values);
    },
    onSuccess: () => {
      message.success(t('ticket.createModal.createSuccess'));
      setCreateModalVisible(false);
      form.resetFields();
      queryClient.invalidateQueries({ queryKey: ['user-tickets'] });
    },
    onError: () => {
      message.error(t('common.operationFailed'));
    },
  });

  // 回复工单
  const replyMutation = useMutation({
    mutationFn: async ({ id, content }: { id: string; content: string }) => {
      return apiClient.post(`/tickets/${id}/reply`, { content });
    },
    onSuccess: () => {
      message.success(t('ticket.replySuccess'));
      setReplyContent('');
      queryClient.invalidateQueries({ queryKey: ['ticket-detail', selectedTicketId] });
      queryClient.invalidateQueries({ queryKey: ['user-tickets'] });
    },
    onError: () => {
      message.error(t('common.operationFailed'));
    },
  });

  // 关闭工单
  const closeMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiClient.patch(`/tickets/${id}/close`);
    },
    onSuccess: () => {
      message.success(t('ticket.closeSuccess'));
      queryClient.invalidateQueries({ queryKey: ['ticket-detail', selectedTicketId] });
      queryClient.invalidateQueries({ queryKey: ['user-tickets'] });
    },
    onError: () => {
      message.error(t('common.operationFailed'));
    },
  });

  const tickets = ticketsData?.items || [];
  const selectedTicket = ticketDetail;

  const stats = {
    open: tickets.filter((t: Ticket) => t.status === 'OPEN').length,
    inProgress: tickets.filter((t: Ticket) => t.status === 'IN_PROGRESS').length,
    closed: tickets.filter((t: Ticket) => t.status === 'CLOSED').length,
  };

  const statusColors: Record<string, string> = {
    OPEN: 'red',
    IN_PROGRESS: 'blue',
    CLOSED: 'default',
  };

  const handleSendReply = () => {
    if (!replyContent.trim()) {
      message.warning(t('ticket.replyPlaceholder'));
      return;
    }
    if (selectedTicketId) {
      replyMutation.mutate({ id: selectedTicketId, content: replyContent });
    }
  };

  const handleCreateTicket = (values: CreateTicketValues) => {
    createMutation.mutate(values);
  };

  const handleCloseTicket = () => {
    if (selectedTicketId) {
      closeMutation.mutate(selectedTicketId);
    }
  };

  if (ticketsLoading) {
    return <PageLoading />;
  }

  if (ticketsError) {
    return <PageError title={t('common.loadError')} onRetry={() => queryClient.invalidateQueries({ queryKey: ['user-tickets'] })} />;
  }

  return (
    <div style={{ height: 'calc(100vh - 120px)' }}>
      <Row gutter={0} style={{ height: '100%' }}>
        {/* 左侧：工单列表 */}
        <Col xs={24} md={8} style={{ height: '100%', borderRight: '1px solid #f0f0f0' }}>
          <Card
            title={
              <Space direction="vertical" size="small" style={{ width: '100%' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Title level={5} style={{ margin: 0 }}>
                    {t('ticket.myTickets')}
                  </Title>
                  <Button
                    type="primary"
                    size="small"
                    icon={<PlusOutlined />}
                    onClick={() => setCreateModalVisible(true)}
                  >
                    {t('ticket.createTicket')}
                  </Button>
                </div>
                <Space size="large">
                  <Text type="secondary">
                    {t('ticket.stats.open')}: <Text strong style={{ color: '#ff4d4f' }}>{stats.open}</Text>
                  </Text>
                  <Text type="secondary">
                    {t('ticket.stats.inProgress')}: <Text strong style={{ color: '#1890ff' }}>{stats.inProgress}</Text>
                  </Text>
                  <Text type="secondary">
                    {t('ticket.stats.closed')}: <Text strong>{stats.closed}</Text>
                  </Text>
                </Space>
              </Space>
            }
            bordered={false}
            bodyStyle={{ padding: 0, height: 'calc(100% - 120px)', overflow: 'auto' }}
          >
            {/* 筛选按钮 */}
            <div style={{ padding: '12px 16px', borderBottom: '1px solid #f0f0f0' }}>
              <Radio.Group
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                buttonStyle="solid"
                size="small"
              >
                <Radio.Button value="all">{t('ticket.filter.all')}</Radio.Button>
                <Radio.Button value="OPEN">{t('ticket.filter.open')}</Radio.Button>
                <Radio.Button value="IN_PROGRESS">{t('ticket.filter.inProgress')}</Radio.Button>
                <Radio.Button value="CLOSED">{t('ticket.filter.closed')}</Radio.Button>
              </Radio.Group>
            </div>

            {/* 工单列表 */}
            {tickets.length === 0 ? (
              <Empty description={t('ticket.noTickets')} style={{ marginTop: 40 }} />
            ) : (
              <List
                dataSource={tickets}
                renderItem={(ticket: Ticket) => (
                  <List.Item
                    style={{
                      padding: '12px 16px',
                      cursor: 'pointer',
                      background: selectedTicketId === ticket.id ? '#e6f7ff' : 'transparent',
                      borderLeft: selectedTicketId === ticket.id ? '3px solid #1890ff' : '3px solid transparent',
                    }}
                    onClick={() => setSelectedTicketId(ticket.id)}
                  >
                    <List.Item.Meta
                      avatar={
                        <Badge count={ticket.unread || 0} size="small">
                          <Avatar icon={<CustomerServiceOutlined />} style={{ background: '#1890ff' }} />
                        </Badge>
                      }
                      title={
                        <Space style={{ width: '100%', justifyContent: 'space-between' }}>
                          <Text strong ellipsis style={{ maxWidth: 150 }}>
                            {ticket.ticketNo}
                          </Text>
                          <Tag color={statusColors[ticket.status]} style={{ margin: 0 }}>
                            {t(`ticket.status.${ticket.status.toLowerCase()}`)}
                          </Tag>
                        </Space>
                      }
                      description={
                        <Space direction="vertical" size={4} style={{ width: '100%' }}>
                          <Tag color="blue" style={{ fontSize: 11 }}>
                            {t(`ticket.typeLabels.${ticket.type.toLowerCase()}`)}
                          </Tag>
                          <Text ellipsis style={{ fontSize: 12 }}>
                            {ticket.subject}
                          </Text>
                          <Text type="secondary" style={{ fontSize: 11 }}>
                            <ClockCircleOutlined /> {ticket.lastMessageTime ? dayjs(ticket.lastMessageTime).format('YYYY-MM-DD HH:mm') : dayjs(ticket.createdAt).format('YYYY-MM-DD HH:mm')}
                          </Text>
                        </Space>
                      }
                    />
                  </List.Item>
                )}
              />
            )}
          </Card>
        </Col>

        {/* 右侧：对话区域 */}
        <Col xs={24} md={16} style={{ height: '100%' }}>
          {selectedTicketId ? (
            detailLoading ? (
              <Card bordered={false} style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Spin size="large" />
              </Card>
            ) : selectedTicket ? (
              <Card
                title={
                  <Space direction="vertical" size={0}>
                    <Text strong>{selectedTicket.ticketNo} · {selectedTicket.subject}</Text>
                    <Space size="small">
                      <Tag color="blue">{t(`ticket.typeLabels.${selectedTicket.type.toLowerCase()}`)}</Tag>
                      <Tag color={statusColors[selectedTicket.status]}>
                        {t(`ticket.status.${selectedTicket.status.toLowerCase()}`)}
                      </Tag>
                    </Space>
                  </Space>
                }
                bordered={false}
                bodyStyle={{ padding: 0, height: 'calc(100% - 80px)', display: 'flex', flexDirection: 'column' }}
              >
                {/* 消息列表 */}
                <div style={{ flex: 1, padding: 16, overflowY: 'auto', background: '#fafafa' }}>
                  <Space direction="vertical" size="middle" style={{ width: '100%' }}>
                    {selectedTicket.messages?.map((msg: TicketMessage) => (
                      <div
                        key={msg.id}
                        style={{
                          display: 'flex',
                          justifyContent: msg.sender === 'USER' ? 'flex-end' : 'flex-start',
                        }}
                      >
                        <Card
                          size="small"
                          style={{
                            maxWidth: '70%',
                            background: msg.sender === 'USER' ? '#1890ff' : '#fff',
                            color: msg.sender === 'USER' ? '#fff' : '#000',
                            borderRadius: 8,
                          }}
                          bodyStyle={{ padding: '8px 12px' }}
                        >
                          <Space direction="vertical" size={4} style={{ width: '100%' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <Tag
                                color={msg.sender === 'USER' ? 'blue' : 'green'}
                                style={{ margin: 0, fontSize: 11 }}
                              >
                                {msg.sender === 'USER' ? t('ticket.me') : t('ticket.customerService')}
                              </Tag>
                              <Text
                                type="secondary"
                                style={{
                                  fontSize: 11,
                                  color: msg.sender === 'USER' ? 'rgba(255,255,255,0.7)' : undefined,
                                }}
                              >
                                {dayjs(msg.createdAt).format('MM-DD HH:mm')}
                              </Text>
                            </div>
                            <Paragraph
                              style={{
                                margin: 0,
                                color: msg.sender === 'USER' ? '#fff' : '#000',
                              }}
                            >
                              {msg.content}
                            </Paragraph>
                          </Space>
                        </Card>
                      </div>
                    ))}
                  </Space>
                </div>

                {/* 回复输入框 */}
                {selectedTicket.status !== 'CLOSED' ? (
                  <div style={{ padding: 16, borderTop: '1px solid #f0f0f0', background: '#fff' }}>
                    <Space.Compact style={{ width: '100%' }}>
                      <TextArea
                        value={replyContent}
                        onChange={(e) => setReplyContent(e.target.value)}
                        placeholder={t('ticket.inputMessage')}
                        autoSize={{ minRows: 2, maxRows: 4 }}
                        style={{ flex: 1 }}
                      />
                      <Button
                        type="primary"
                        icon={<MessageOutlined />}
                        onClick={handleSendReply}
                        loading={replyMutation.isPending}
                        style={{ height: 'auto' }}
                      >
                        {t('ticket.sendMessage')}
                      </Button>
                    </Space.Compact>
                    <Button
                      type="link"
                      onClick={handleCloseTicket}
                      loading={closeMutation.isPending}
                      style={{ marginTop: 8, padding: 0 }}
                    >
                      {t('ticket.closeTicket')}
                    </Button>
                  </div>
                ) : (
                  <div style={{ padding: 16, textAlign: 'center', background: '#fafafa' }}>
                    <Text type="secondary">{t('ticket.ticketClosed')}</Text>
                  </div>
                )}
              </Card>
            ) : (
              <Card bordered={false} style={{ height: '100%' }}>
                <Empty description={t('ticket.selectTicket')} />
              </Card>
            )
          ) : (
            <Card bordered={false} style={{ height: '100%' }}>
              <Empty description={t('ticket.selectTicket')} />
            </Card>
          )}
        </Col>
      </Row>

      {/* 新建工单弹窗 */}
      <Modal
        title={t('ticket.createModal.title')}
        open={createModalVisible}
        onCancel={() => setCreateModalVisible(false)}
        onOk={() => form.submit()}
        okText={t('ticket.createModal.submit')}
        cancelText={t('ticket.createModal.cancel')}
        confirmLoading={createMutation.isPending}
      >
        <Form form={form} layout="vertical" onFinish={handleCreateTicket}>
          <Form.Item
            name="type"
            label={t('ticket.createModal.type')}
            rules={[{ required: true, message: t('ticket.createModal.selectType') }]}
          >
            <Select placeholder={t('ticket.createModal.selectType')}>
              <Select.Option value="ORDER">{t('ticket.typeLabels.order')}</Select.Option>
              <Select.Option value="PAYMENT">{t('ticket.typeLabels.payment')}</Select.Option>
              <Select.Option value="ACCOUNT">{t('ticket.typeLabels.account')}</Select.Option>
              <Select.Option value="OTHER">{t('ticket.typeLabels.other')}</Select.Option>
            </Select>
          </Form.Item>
          <Form.Item
            name="orderId"
            label={t('ticket.createModal.orderId')}
          >
            <Input placeholder={t('ticket.createModal.orderIdPlaceholder')} />
          </Form.Item>
          <Form.Item
            name="subject"
            label={t('ticket.createModal.subject')}
            rules={[{ required: true, message: t('ticket.createModal.subjectPlaceholder') }]}
          >
            <Input placeholder={t('ticket.createModal.subjectPlaceholder')} />
          </Form.Item>
          <Form.Item
            name="description"
            label={t('ticket.createModal.description')}
            rules={[{ required: true, message: t('ticket.createModal.descriptionPlaceholder') }]}
          >
            <TextArea rows={4} placeholder={t('ticket.createModal.descriptionPlaceholder')} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}