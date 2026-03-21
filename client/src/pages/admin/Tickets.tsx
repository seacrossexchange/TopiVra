import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Card, Table, Button, Space, Tag, Select, Drawer, List, Typography,
  Input, message, Badge
} from 'antd';
import {
  EyeOutlined, MessageOutlined,
  CloseCircleOutlined
} from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '@/services/apiClient';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';

const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;

interface Ticket {
  id: string;
  ticketNo: string;
  userId: string;
  user: { id: string; username: string; email: string };
  type: 'ORDER' | 'PAYMENT' | 'ACCOUNT' | 'OTHER';
  subject: string;
  status: 'OPEN' | 'IN_PROGRESS' | 'WAITING' | 'CLOSED';
  priority: 'LOW' | 'MEDIUM' | 'HIGH';
  assignedTo?: string;
  createdAt: string;
  updatedAt: string;
  slaDeadline?: string;
}

interface TicketMessage {
  id: string;
  content: string;
  sender: 'USER' | 'ADMIN';
  senderName?: string;
  createdAt: string;
  isInternal?: boolean;
}

export default function AdminTicketsPage() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [detailDrawer, setDetailDrawer] = useState<Ticket | null>(null);
  const [replyContent, setReplyContent] = useState('');
  const [, setInternalNote] = useState(''); // 内部备注状态
  const [statusFilter, setStatusFilter] = useState('all');

  // Fetch tickets
  const { data: tickets, isLoading } = useQuery({
    queryKey: ['admin-tickets', statusFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (statusFilter !== 'all') params.append('status', statusFilter);
      const response = await apiClient.get(`/admin/tickets?${params}`);
      return response.data as Ticket[];
    },
    initialData: [], // 提供默认空数组
  });

  // Fetch ticket messages
  const { data: messages } = useQuery({
    queryKey: ['admin-ticket-messages', detailDrawer?.id],
    queryFn: async () => {
      if (!detailDrawer) return [];
      const response = await apiClient.get(`/admin/tickets/${detailDrawer.id}/messages`);
      return response.data as TicketMessage[];
    },
    enabled: !!detailDrawer,
  });

  // Update status mutation
  const updateStatusMutation = useMutation({
    mutationFn: async (data: { ticketId: string; status: string }) => {
      return apiClient.patch(`/admin/tickets/${data.ticketId}/status`, { status: data.status });
    },
    onSuccess: () => {
      message.success(t('common.updateSuccess'));
      queryClient.invalidateQueries({ queryKey: ['admin-tickets'] });
    },
  });

  // Reply mutation
  const replyMutation = useMutation({
    mutationFn: async (data: { ticketId: string; content: string; isInternal?: boolean }) => {
      return apiClient.post(`/admin/tickets/${data.ticketId}/reply`, {
        content: data.content,
        isInternal: data.isInternal,
      });
    },
    onSuccess: () => {
      message.success(t('ticket.replySuccess'));
      queryClient.invalidateQueries({ queryKey: ['admin-ticket-messages', detailDrawer?.id] });
      setReplyContent('');
      setInternalNote('');
    },
  });

  const statusColors = {
    OPEN: 'green',
    IN_PROGRESS: 'blue',
    WAITING: 'orange',
    CLOSED: 'default',
  };

  const priorityColors = {
    LOW: 'default',
    MEDIUM: 'orange',
    HIGH: 'red',
  };

  const getSlaStatus = (deadline?: string) => {
    if (!deadline) return null;
    const now = dayjs();
    const deadlineTime = dayjs(deadline);
    const diff = deadlineTime.diff(now, 'hour');

    if (diff < 0) {
      return <Badge status="error" text={t('ticket.sla.overdue')} />;
    } else if (diff < 2) {
      return <Badge status="warning" text={t('ticket.sla.critical')} />;
    }
    return <Badge status="success" text={t('ticket.sla.ok')} />;
  };

  const columns: ColumnsType<Ticket> = [
    {
      title: t('ticket.ticketNo'),
      dataIndex: 'ticketNo',
      key: 'ticketNo',
      width: 140,
    },
    {
      title: t('ticket.user'),
      dataIndex: ['user', 'username'],
      key: 'user',
    },
    {
      title: t('ticket.subject'),
      dataIndex: 'subject',
      key: 'subject',
      ellipsis: true,
    },
    {
      title: t('ticket.status'),
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => (
        <Tag color={statusColors[status as keyof typeof statusColors]}>
          {t(`ticket.status.${status.toLowerCase()}`)}
        </Tag>
      ),
    },
    {
      title: t('ticket.priority'),
      dataIndex: 'priority',
      key: 'priority',
      render: (priority: string) => (
        <Tag color={priorityColors[priority as keyof typeof priorityColors]}>
          {t(`ticket.priority.${priority.toLowerCase()}`)}
        </Tag>
      ),
    },
    {
      title: 'SLA',
      dataIndex: 'slaDeadline',
      key: 'sla',
      render: (_, record) => getSlaStatus(record.slaDeadline),
    },
    {
      title: t('ticket.createdAt'),
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (date: string) => dayjs(date).format('YYYY-MM-DD HH:mm'),
    },
    {
      title: t('common.actions'),
      key: 'actions',
      width: 80,
      render: (_, record) => (
        <Button icon={<EyeOutlined />} onClick={() => setDetailDrawer(record)} />
      ),
    },
  ];

  return (
    <div>
      <Card
        title={<Title level={4} style={{ margin: 0 }}>{t('ticket.adminTitle')}</Title>}
        extra={
          <Select
            value={statusFilter}
            onChange={setStatusFilter}
            style={{ width: 140 }}
            options={[
              { value: 'all', label: t('common.all') },
              { value: 'OPEN', label: t('ticket.status.open') },
              { value: 'IN_PROGRESS', label: t('ticket.status.in_progress') },
              { value: 'WAITING', label: t('ticket.status.waiting') },
            ]}
          />
        }
      >
        <Table
          columns={columns}
          dataSource={tickets}
          rowKey="id"
          loading={isLoading}
        />
      </Card>

      <Drawer
        title={t('ticket.detail')}
        open={!!detailDrawer}
        onClose={() => setDetailDrawer(null)}
        width={600}
      >
        {detailDrawer && (
          <>
            <Space direction="vertical" size="middle" style={{ width: '100%', marginBottom: 16 }}>
              <Space wrap>
                <Text strong>{detailDrawer.ticketNo}</Text>
                <Tag color={statusColors[detailDrawer.status as keyof typeof statusColors]}>
                  {t(`ticket.status.${detailDrawer.status.toLowerCase()}`)}
                </Tag>
                <Tag color={priorityColors[detailDrawer.priority as keyof typeof priorityColors]}>
                  {t(`ticket.priority.${detailDrawer.priority.toLowerCase()}`)}
                </Tag>
              </Space>
              <Text>{detailDrawer.subject}</Text>
              <Text type="secondary">
                {t('ticket.user')}: {detailDrawer.user.username} ({detailDrawer.user.email})
              </Text>
            </Space>

            <Space style={{ marginBottom: 16 }}>
              <Select
                placeholder={t('ticket.changeStatus')}
                style={{ width: 150 }}
                onChange={(value) => updateStatusMutation.mutate({ ticketId: detailDrawer.id, status: value })}
                value={detailDrawer.status}
                options={[
                  { value: 'OPEN', label: t('ticket.status.open') },
                  { value: 'IN_PROGRESS', label: t('ticket.status.in_progress') },
                  { value: 'WAITING', label: t('ticket.status.waiting') },
                  { value: 'CLOSED', label: t('ticket.status.closed') },
                ]}
              />
              <Button
                icon={<CloseCircleOutlined />}
                onClick={() => updateStatusMutation.mutate({ ticketId: detailDrawer.id, status: 'CLOSED' })}
              >
                {t('ticket.close')}
              </Button>
            </Space>

            <Title level={5}>{t('ticket.messages')}</Title>
            <List
              dataSource={messages}
              renderItem={(item) => (
                <List.Item style={{ border: 'none', padding: '8px 0' }}>
                  <Card
                    size="small"
                    style={{
                      width: '100%',
                      background: item.isInternal ? '#fffbe6' : item.sender === 'ADMIN' ? '#e6f7ff' : '#f5f5f5',
                    }}
                  >
                    <Space direction="vertical" style={{ width: '100%' }}>
                      <Space style={{ width: '100%' }}>
                        <Tag color={item.isInternal ? 'gold' : item.sender === 'ADMIN' ? 'blue' : 'default'}>
                          {item.isInternal ? t('ticket.internalNote') : item.sender === 'ADMIN' ? t('ticket.admin') : t('ticket.user')}
                        </Tag>
                        <Text type="secondary" style={{ fontSize: 12 }}>
                          {dayjs(item.createdAt).format('YYYY-MM-DD HH:mm')}
                        </Text>
                      </Space>
                      <Paragraph style={{ margin: 0 }}>{item.content}</Paragraph>
                    </Space>
                  </Card>
                </List.Item>
              )}
              style={{ maxHeight: 250, overflow: 'auto', marginBottom: 16 }}
            />

            {detailDrawer.status !== 'CLOSED' && (
              <>
                <TextArea
                  value={replyContent}
                  onChange={(e) => setReplyContent(e.target.value)}
                  placeholder={t('ticket.replyPlaceholder')}
                  rows={3}
                  style={{ marginBottom: 8 }}
                />
                <Space style={{ marginBottom: 16 }}>
                  <Button
                    type="primary"
                    icon={<MessageOutlined />}
                    onClick={() => {
                      if (detailDrawer && replyContent.trim()) {
                        replyMutation.mutate({
                          ticketId: detailDrawer.id,
                          content: replyContent,
                        });
                      }
                    }}
                    loading={replyMutation.isPending}
                  >
                    {t('ticket.reply')}
                  </Button>
                  <Button
                    onClick={() => {
                      if (detailDrawer && replyContent.trim()) {
                        replyMutation.mutate({
                          ticketId: detailDrawer.id,
                          content: replyContent,
                          isInternal: true,
                        });
                      }
                    }}
                  >
                    {t('ticket.addInternalNote')}
                  </Button>
                </Space>
              </>
            )}
          </>
        )}
      </Drawer>
    </div>
  );
}