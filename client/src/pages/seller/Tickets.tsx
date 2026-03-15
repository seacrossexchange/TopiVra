import { useState, useEffect } from 'react';
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
  Spin,
} from 'antd';
import {
  PlusOutlined,
  MessageOutlined,
  UserOutlined,
  ClockCircleOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { useTranslation } from 'react-i18next';
import { ticketsService, type Ticket, type TicketMessage } from '../../services/tickets';
import { useAuthStore } from '../../store/authStore';

const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;

export default function SellerTickets() {
  const { t } = useTranslation();
  const { user } = useAuthStore();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [messages, setMessages] = useState<TicketMessage[]>([]);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [replyContent, setReplyContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);

  // 加载工单列表
  useEffect(() => {
    loadTickets();
  }, [filterStatus]);

  // 加载工单详情
  useEffect(() => {
    if (selectedTicket) {
      loadTicketDetail(selectedTicket.id);
    }
  }, [selectedTicket?.id]);

  const loadTickets = async () => {
    try {
      setLoading(true);
      const params: any = { page: 1, limit: 50 };
      if (filterStatus !== 'all') {
        params.status = filterStatus;
      }
      const response = await ticketsService.getSellerTickets(params);
      setTickets(response.items);
      if (response.items.length > 0 && !selectedTicket) {
        setSelectedTicket(response.items[0]);
      }
    } catch (error: any) {
      message.error(error.response?.data?.message || '加载工单失败');
    } finally {
      setLoading(false);
    }
  };

  const loadTicketDetail = async (ticketId: string) => {
    try {
      const detail = await ticketsService.getTicket(ticketId);
      setMessages(detail.messages || []);
    } catch (error: any) {
      message.error(error.response?.data?.message || '加载工单详情失败');
    }
  };

  const handleSendReply = async () => {
    if (!replyContent.trim()) {
      message.warning(t('ticket.replyPlaceholder'));
      return;
    }
    if (!selectedTicket) return;

    try {
      setSending(true);
      await ticketsService.sendMessage(selectedTicket.ticket_no, { content: replyContent });
      message.success(t('ticket.replySuccess'));
      setReplyContent('');
      await loadTicketDetail(selectedTicket.id);
    } catch (error: any) {
      message.error(error.response?.data?.message || '发送失败');
    } finally {
      setSending(false);
    }
  };

  const handleQuickReply = (text: string) => {
    setReplyContent(text);
  };

  // 快捷回复
  const quickReplies = [
    t('ticket.quickReplyTemplates.thanks'),
    t('ticket.quickReplyTemplates.processed'),
    t('ticket.quickReplyTemplates.refunded'),
    t('ticket.quickReplyTemplates.moreInfo'),
    t('ticket.quickReplyTemplates.resolved'),
  ];

  const filteredTickets = tickets.filter((ticket) => {
    if (filterStatus === 'all') return true;
    return ticket.status === filterStatus;
  });

  const statusColors = {
    OPEN: 'red',
    IN_PROGRESS: 'blue',
    WAITING: 'orange',
    RESOLVED: 'green',
    CLOSED: 'default',
  };

  const stats = {
    open: tickets.filter((t) => t.status === 'OPEN').length,
    inProgress: tickets.filter((t) => t.status === 'IN_PROGRESS').length,
    closed: tickets.filter((t) => t.status === 'CLOSED').length,
  };

  return (
    <div style={{ height: 'calc(100vh - 120px)' }}>
      <Spin spinning={loading}>
        <Row gutter={0} style={{ height: '100%' }}>
          {/* 左侧：工单列表 */}
          <Col xs={24} md={8} style={{ height: '100%', borderRight: '1px solid #f0f0f0' }}>
            <Card
              title={
                <Space direction="vertical" size="small" style={{ width: '100%' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Title level={5} style={{ margin: 0 }}>
                      {t('ticket.sellerTitle')}
                    </Title>
                    <Button type="primary" size="small" icon={<PlusOutlined />}>
                      {t('ticket.createTicket')}
                    </Button>
                  </div>
                  <Space size="large">
                    <Text type="secondary">
                      {t('ticket.stats.open')}: <Text strong style={{ color: '#ff4d4f' }}>{stats.open}</Text>
                    </Text>
                    <Text type="secondary">
                      {t('ticket.stats.replied')}: <Text strong style={{ color: '#1890ff' }}>{stats.inProgress}</Text>
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
                  <Radio.Button value="IN_PROGRESS">{t('ticket.filter.replied')}</Radio.Button>
                  <Radio.Button value="CLOSED">{t('ticket.filter.closed')}</Radio.Button>
                </Radio.Group>
              </div>

              {/* 工单列表 */}
              {filteredTickets.length === 0 ? (
                <Empty description={t('ticket.noTickets') || '暂无工单'} style={{ marginTop: 40 }} />
              ) : (
                <List
                  dataSource={filteredTickets}
                  renderItem={(ticket) => {
                    const lastMessage = ticket.messages?.[ticket.messages.length - 1];
                    return (
                      <List.Item
                        style={{
                          padding: '12px 16px',
                          cursor: 'pointer',
                          background: selectedTicket?.id === ticket.id ? '#e6f7ff' : 'transparent',
                          borderLeft: selectedTicket?.id === ticket.id ? '3px solid #1890ff' : '3px solid transparent',
                        }}
                        onClick={() => setSelectedTicket(ticket)}
                      >
                        <List.Item.Meta
                          avatar={
                            <Badge count={0} size="small">
                              <Avatar icon={<UserOutlined />} />
                            </Badge>
                          }
                          title={
                            <Space style={{ width: '100%', justifyContent: 'space-between' }}>
                              <Text strong ellipsis style={{ maxWidth: 150 }}>
                                {ticket.ticket_no}
                              </Text>
                              <Tag color={(statusColors as any)[ticket.status]} style={{ margin: 0 }}>
                                {t(`ticket.status.${ticket.status.toLowerCase()}`)}
                              </Tag>
                            </Space>
                          }
                          description={
                            <Space direction="vertical" size={4} style={{ width: '100%' }}>
                              <Text ellipsis style={{ fontSize: 12 }}>
                                {ticket.subject}
                              </Text>
                              <Text type="secondary" style={{ fontSize: 12 }}>
                                {t('ticket.buyer')}: Unknown
                              </Text>
                              <Text type="secondary" style={{ fontSize: 11 }}>
                                <ClockCircleOutlined /> {dayjs(lastMessage?.created_at || ticket.updated_at).format('MM-DD HH:mm')}
                              </Text>
                            </Space>
                          }
                        />
                      </List.Item>
                    );
                  }}
                />
              )}
            </Card>
          </Col>

          {/* 右侧：对话区域 */}
          <Col xs={24} md={16} style={{ height: '100%' }}>
            {selectedTicket ? (
              <Card
                title={
                  <Space direction="vertical" size={0}>
                    <Text strong>{selectedTicket.ticket_no} · {selectedTicket.subject}</Text>
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      {t('ticket.buyer')}: Unknown
                    </Text>
                  </Space>
                }
                bordered={false}
                bodyStyle={{ padding: 0, height: 'calc(100% - 80px)', display: 'flex', flexDirection: 'column' }}
              >
                {/* 消息列表 */}
                <div style={{ flex: 1, padding: 16, overflowY: 'auto', background: '#fafafa' }}>
                  <Space direction="vertical" size="middle" style={{ width: '100%' }}>
                    {messages.map((msg) => {
                      const isSeller = msg.sender_id === user?.id;
                      return (
                        <div
                          key={msg.id}
                          style={{
                            display: 'flex',
                            justifyContent: isSeller ? 'flex-end' : 'flex-start',
                          }}
                        >
                          <Card
                            size="small"
                            style={{
                              maxWidth: '70%',
                              background: isSeller ? '#1890ff' : '#fff',
                              color: isSeller ? '#fff' : '#000',
                              borderRadius: 8,
                            }}
                            bodyStyle={{ padding: '8px 12px' }}
                          >
                            <Space direction="vertical" size={4} style={{ width: '100%' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <Tag
                                  color={isSeller ? 'blue' : 'default'}
                                  style={{ margin: 0, fontSize: 11 }}
                                >
                                  {isSeller ? t('ticket.me') : t('ticket.buyer')}
                                </Tag>
                                <Text
                                  type="secondary"
                                  style={{
                                    fontSize: 11,
                                    color: isSeller ? 'rgba(255,255,255,0.7)' : undefined,
                                  }}
                                >
                                  {dayjs(msg.created_at).format('MM-DD HH:mm')}
                                </Text>
                              </div>
                              <Paragraph
                                style={{
                                  margin: 0,
                                  color: isSeller ? '#fff' : '#000',
                                }}
                              >
                                {msg.content}
                              </Paragraph>
                            </Space>
                          </Card>
                        </div>
                      );
                    })}
                  </Space>
                </div>

                {/* 快捷回复 */}
                {selectedTicket.status !== 'CLOSED' && (
                  <div style={{ padding: '12px 16px', borderTop: '1px solid #f0f0f0', background: '#fff' }}>
                    <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 8 }}>
                      {t('ticket.quickReply')}
                    </Text>
                    <Space wrap>
                      {quickReplies.map((text, index) => (
                        <Button
                          key={index}
                          size="small"
                          onClick={() => handleQuickReply(text)}
                        >
                          {text}
                        </Button>
                      ))}
                    </Space>
                  </div>
                )}

                {/* 回复输入框 */}
                {selectedTicket.status !== 'CLOSED' ? (
                  <div style={{ padding: 16, borderTop: '1px solid #f0f0f0', background: '#fff' }}>
                    <Space.Compact style={{ width: '100%' }}>
                      <TextArea
                        value={replyContent}
                        onChange={(e) => setReplyContent(e.target.value)}
                        placeholder={t('ticket.replyPlaceholder')}
                        autoSize={{ minRows: 2, maxRows: 4 }}
                        style={{ flex: 1 }}
                        disabled={sending}
                      />
                      <Button
                        type="primary"
                        icon={<MessageOutlined />}
                        onClick={handleSendReply}
                        loading={sending}
                        style={{ height: 'auto' }}
                      >
                        {t('ticket.sendMessage')}
                      </Button>
                    </Space.Compact>
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
            )}
          </Col>
        </Row>
      </Spin>
    </div>
  );
}

