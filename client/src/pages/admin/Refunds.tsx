import { useState } from 'react';
import { Card, Table, Tag, Button, Space, Select, Modal, Input, message, Descriptions, Alert } from 'antd';
import { CheckCircleOutlined, CloseCircleOutlined, EyeOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import dayjs from 'dayjs';
import apiClient from '@/services/apiClient';
import PageLoading from '@/components/common/PageLoading';
import PageError from '@/components/common/PageError';

interface RefundRequest {
  id: string;
  orderId: string;
  orderNo: string;
  amount: number;
  reason: string;
  description?: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
  processedAt?: string;
  adminNote?: string;
  buyer?: {
    id: string;
    username: string;
    email: string;
  };
  order?: {
    id: string;
    orderNo: string;
    totalAmount: number;
    items: Array<{
      productTitle: string;
      price: number;
      quantity: number;
    }>;
  };
}

export default function Refunds() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [selectedRefund, setSelectedRefund] = useState<RefundRequest | null>(null);
  const [adminNote, setAdminNote] = useState('');

  // 获取退款列表
  const { data, isLoading, error } = useQuery({
    queryKey: ['admin-refunds', page, pageSize, statusFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.append('page', String(page));
      params.append('limit', String(pageSize));
      if (statusFilter !== 'all') {
        params.append('status', statusFilter);
      }
      const response = await apiClient.get(`/admin/refunds?${params.toString()}`);
      return response.data;
    },
  });

  // 审核退款
  const reviewMutation = useMutation({
    mutationFn: async ({ refundId, approved, adminNote }: { refundId: string; approved: boolean; adminNote?: string }) => {
      return apiClient.put(`/admin/refunds/${refundId}/review`, { approved, adminNote });
    },
    onSuccess: () => {
      message.success(t('refund.reviewSuccess', '审核成功'));
      queryClient.invalidateQueries({ queryKey: ['admin-refunds'] });
      setReviewModalOpen(false);
      setSelectedRefund(null);
      setAdminNote('');
    },
    onError: () => {
      message.error(t('refund.reviewError', '审核失败'));
    },
  });

  const getStatusTag = (status: string) => {
    const statusMap: Record<string, { color: string; text: string }> = {
      pending: { color: 'warning', text: t('refund.pending', '待审核') },
      approved: { color: 'success', text: t('refund.approved', '已通过') },
      rejected: { color: 'error', text: t('refund.rejected', '已拒绝') },
    };
    const { color, text } = statusMap[status] || { color: 'default', text: status };
    return <Tag color={color}>{text}</Tag>;
  };

  const showDetail = (refund: RefundRequest) => {
    setSelectedRefund(refund);
    setDetailModalOpen(true);
  };

  const showReview = (refund: RefundRequest) => {
    setSelectedRefund(refund);
    setAdminNote('');
    setReviewModalOpen(true);
  };

  const handleReview = (approved: boolean) => {
    if (selectedRefund) {
      reviewMutation.mutate({
        refundId: selectedRefund.id,
        approved,
        adminNote,
      });
    }
  };

  const columns = [
    {
      title: t('refund.orderNo', '订单号'),
      dataIndex: 'orderNo',
      key: 'orderNo',
      width: 160,
    },
    {
      title: t('refund.buyer', '买家'),
      dataIndex: 'buyer',
      key: 'buyer',
      width: 120,
      render: (buyer: RefundRequest['buyer']) => buyer?.username || '-',
    },
    {
      title: t('refund.amount', '退款金额'),
      dataIndex: 'amount',
      key: 'amount',
      width: 100,
      render: (amount: number) => `$${(amount || 0).toFixed(2)}`,
    },
    {
      title: t('refund.reason', '退款原因'),
      dataIndex: 'reason',
      key: 'reason',
      ellipsis: true,
    },
    {
      title: t('refund.status', '状态'),
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status: string) => getStatusTag(status),
    },
    {
      title: t('refund.createdAt', '申请时间'),
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 160,
      render: (date: string) => date ? dayjs(date).format('YYYY-MM-DD HH:mm') : '-',
    },
    {
      title: t('common.action', '操作'),
      key: 'action',
      width: 180,
      render: (_: unknown, record: RefundRequest) => (
        <Space>
          <Button
            type="link"
            size="small"
            icon={<EyeOutlined />}
            onClick={() => showDetail(record)}
          >
            {t('common.view', '查看')}
          </Button>
          {record.status === 'pending' && (
            <Button
              type="link"
              size="small"
              onClick={() => showReview(record)}
            >
              {t('refund.review', '审核')}
            </Button>
          )}
        </Space>
      ),
    },
  ];

  if (isLoading) {
    return <PageLoading />;
  }

  if (error) {
    return <PageError title={t('common.loadError')} onRetry={() => queryClient.invalidateQueries({ queryKey: ['admin-refunds'] })} />;
  }

  const refunds = data?.items || [];
  const total = data?.total || 0;

  return (
    <div className="admin-refunds-page">
      <Card
        title={t('refund.management', '退款管理')}
        extra={
          <Space>
            <Select
              value={statusFilter}
              onChange={setStatusFilter}
              style={{ width: 120 }}
            >
              <Select.Option value="all">{t('common.all', '全部')}</Select.Option>
              <Select.Option value="pending">{t('refund.pending', '待审核')}</Select.Option>
              <Select.Option value="approved">{t('refund.approved', '已通过')}</Select.Option>
              <Select.Option value="rejected">{t('refund.rejected', '已拒绝')}</Select.Option>
            </Select>
          </Space>
        }
      >
        <Table
          columns={columns}
          dataSource={refunds}
          rowKey="id"
          pagination={{
            current: page,
            pageSize,
            total,
            showSizeChanger: true,
            showTotal: (total) => t('common.totalItems', { count: total }),
            onChange: (p, ps) => {
              setPage(p);
              setPageSize(ps);
            },
          }}
        />
      </Card>

      {/* 详情弹窗 */}
      <Modal
        title={t('refund.detail', '退款详情')}
        open={detailModalOpen}
        onCancel={() => setDetailModalOpen(false)}
        footer={null}
        width={600}
      >
        {selectedRefund && (
          <Descriptions bordered column={1} size="small">
            <Descriptions.Item label={t('refund.orderNo', '订单号')}>
              {selectedRefund.orderNo}
            </Descriptions.Item>
            <Descriptions.Item label={t('refund.buyer', '买家')}>
              {selectedRefund.buyer?.username} ({selectedRefund.buyer?.email})
            </Descriptions.Item>
            <Descriptions.Item label={t('refund.amount', '退款金额')}>
              <span style={{ color: '#f5222d', fontWeight: 'bold' }}>
                ${selectedRefund.amount?.toFixed(2)}
              </span>
            </Descriptions.Item>
            <Descriptions.Item label={t('refund.reason', '退款原因')}>
              {selectedRefund.reason}
            </Descriptions.Item>
            {selectedRefund.description && (
              <Descriptions.Item label={t('refund.description', '详细说明')}>
                {selectedRefund.description}
              </Descriptions.Item>
            )}
            <Descriptions.Item label={t('refund.status', '状态')}>
              {getStatusTag(selectedRefund.status)}
            </Descriptions.Item>
            <Descriptions.Item label={t('refund.createdAt', '申请时间')}>
              {dayjs(selectedRefund.createdAt).format('YYYY-MM-DD HH:mm:ss')}
            </Descriptions.Item>
            {selectedRefund.processedAt && (
              <Descriptions.Item label={t('refund.processedAt', '处理时间')}>
                {dayjs(selectedRefund.processedAt).format('YYYY-MM-DD HH:mm:ss')}
              </Descriptions.Item>
            )}
            {selectedRefund.adminNote && (
              <Descriptions.Item label={t('refund.adminNote', '管理员备注')}>
                {selectedRefund.adminNote}
              </Descriptions.Item>
            )}
          </Descriptions>
        )}
      </Modal>

      {/* 审核弹窗 */}
      <Modal
        title={t('refund.review', '审核退款')}
        open={reviewModalOpen}
        onCancel={() => setReviewModalOpen(false)}
        footer={null}
        width={500}
      >
        {selectedRefund && (
          <div className="refund-review-content">
            <Alert
              type="info"
              message={`${t('refund.orderNo', '订单号')}: ${selectedRefund.orderNo}`}
              description={`${t('refund.amount', '退款金额')}: $${selectedRefund.amount?.toFixed(2)}`}
              showIcon
              style={{ marginBottom: 16 }}
            />
            
            <div className="refund-info" style={{ marginBottom: 16 }}>
              <p><strong>{t('refund.reason', '退款原因')}:</strong> {selectedRefund.reason}</p>
              {selectedRefund.description && (
                <p><strong>{t('refund.description', '详细说明')}:</strong> {selectedRefund.description}</p>
              )}
            </div>

            <Input.TextArea
              placeholder={t('refund.adminNotePlaceholder', '请输入审核备注（可选）')}
              value={adminNote}
              onChange={(e) => setAdminNote(e.target.value)}
              rows={3}
              style={{ marginBottom: 16 }}
            />

            <div className="refund-actions" style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <Button
                danger
                icon={<CloseCircleOutlined />}
                onClick={() => handleReview(false)}
                loading={reviewMutation.isPending}
              >
                {t('refund.reject', '拒绝退款')}
              </Button>
              <Button
                type="primary"
                icon={<CheckCircleOutlined />}
                onClick={() => handleReview(true)}
                loading={reviewMutation.isPending}
              >
                {t('refund.approve', '同意退款')}
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}