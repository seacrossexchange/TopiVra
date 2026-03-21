import React, { useState, useEffect } from 'react';
import {
  Table,
  Card,
  Button,
  Tag,
  Space,
  Modal,
  Input,
  message,
  Tabs,
  Descriptions,
  Image,
  Tooltip,
  Badge,
  Typography,
  Empty,
} from 'antd';
import {
  CheckOutlined,
  CloseOutlined,
  EyeOutlined,
  ClockCircleOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  FileTextOutlined,
} from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import type { ColumnsType } from 'antd/es/table';
import {
  getPendingBlogs,
  getBlogs,
  approveBlog,
  rejectBlog,
  type Blog,
  type BlogListParams,
} from '@/services/blog';

const { TextArea } = Input;
const { Text, Title, Paragraph } = Typography;
const { TabPane } = Tabs;

const Blogs: React.FC = () => {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [blogs, setBlogs] = useState<Blog[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [activeTab, setActiveTab] = useState('pending');
  const [previewVisible, setPreviewVisible] = useState(false);
  const [rejectVisible, setRejectVisible] = useState(false);
  const [currentBlog, setCurrentBlog] = useState<Blog | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  const fetchBlogs = async (params: BlogListParams = {}) => {
    setLoading(true);
    try {
      let response;
      if (activeTab === 'pending') {
        response = await getPendingBlogs({ page, limit, ...params });
      } else {
        response = await getBlogs({ page, limit, status: activeTab, ...params });
      }
      setBlogs(response.data || []);
      setTotal(response.total || 0);
    } catch (error) {
      message.error(t('admin.blogs.fetchError'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBlogs();
  }, [page, limit, activeTab]);

  const handleApprove = async (blog: Blog) => {
    try {
      await approveBlog(blog.id);
      message.success(t('admin.blogs.approveSuccess'));
      fetchBlogs();
    } catch {
      message.error(t('admin.blogs.fetchError'));
    }
  };

  const handleReject = async () => {
    if (!currentBlog) return;
    if (!rejectReason.trim()) {
      message.error(t('admin.blogs.rejectReasonRequired'));
      return;
    }
    try {
      await rejectBlog(currentBlog.id, { reason: rejectReason });
      message.success(t('admin.blogs.rejectSuccess'));
      setRejectVisible(false);
      setRejectReason('');
      setCurrentBlog(null);
      fetchBlogs();
    } catch {
      message.error(t('admin.blogs.fetchError'));
    }
  };

  const openPreview = (blog: Blog) => {
    setCurrentBlog(blog);
    setPreviewVisible(true);
  };

  const openRejectModal = (blog: Blog) => {
    setCurrentBlog(blog);
    setRejectReason('');
    setRejectVisible(true);
  };

  const getStatusTag = (status: string) => {
    const statusConfig: Record<string, { color: string; icon: React.ReactNode }> = {
      DRAFT: { color: 'default', icon: <FileTextOutlined /> },
      PENDING_REVIEW: { color: 'processing', icon: <ClockCircleOutlined /> },
      PUBLISHED: { color: 'success', icon: <CheckCircleOutlined /> },
      REJECTED: { color: 'error', icon: <CloseCircleOutlined /> },
      ARCHIVED: { color: 'warning', icon: <FileTextOutlined /> },
    };
    const config = statusConfig[status] || statusConfig.DRAFT;
    return (
      <Tag color={config.color} icon={config.icon}>
        {t(`blog.status.${status}`)}
      </Tag>
    );
  };

  const columns: ColumnsType<Blog> = [
    {
      title: t('admin.blogs.columns.title'),
      dataIndex: 'title',
      key: 'title',
      width: 300,
      render: (text: string, record: Blog) => (
        <Space direction="vertical" size={0}>
          <Text strong style={{ maxWidth: 280 }} ellipsis={{ tooltip: text }}>
            {text}
          </Text>
          {record.excerpt && (
            <Text type="secondary" style={{ maxWidth: 280 }} ellipsis={{ tooltip: record.excerpt }}>
              {record.excerpt}
            </Text>
          )}
        </Space>
      ),
    },
    {
      title: t('admin.blogs.columns.author'),
      dataIndex: 'author',
      key: 'author',
      width: 150,
      render: (author: Blog['author']) => author?.username || '-',
    },
    {
      title: t('admin.blogs.columns.status'),
      dataIndex: 'status',
      key: 'status',
      width: 120,
      render: (status: string) => getStatusTag(status),
    },
    {
      title: t('admin.blogs.columns.submittedAt'),
      dataIndex: 'submittedAt',
      key: 'submittedAt',
      width: 180,
      render: (date: string) => (date ? new Date(date).toLocaleString() : '-'),
    },
    {
      title: t('admin.blogs.columns.createdAt'),
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 180,
      render: (date: string) => new Date(date).toLocaleString(),
    },
    {
      title: t('admin.blogs.columns.actions'),
      key: 'actions',
      width: 180,
      fixed: 'right',
      render: (_: unknown, record: Blog) => (
        <Space>
          <Tooltip title={t('admin.blogs.actions.preview')}>
            <Button
              type="text"
              icon={<EyeOutlined />}
              onClick={() => openPreview(record)}
            />
          </Tooltip>
          {record.status === 'PENDING_REVIEW' && (
            <>
              <Tooltip title={t('admin.blogs.actions.approve')}>
                <Button
                  type="text"
                  icon={<CheckOutlined />}
                  style={{ color: '#52c41a' }}
                  onClick={() => handleApprove(record)}
                />
              </Tooltip>
              <Tooltip title={t('admin.blogs.actions.reject')}>
                <Button
                  type="text"
                  icon={<CloseOutlined />}
                  danger
                  onClick={() => openRejectModal(record)}
                />
              </Tooltip>
            </>
          )}
        </Space>
      ),
    },
  ];

  return (
    <div className="p-6">
      <Card>
        <div className="mb-4 flex justify-between items-center">
          <Title level={4} style={{ margin: 0 }}>
            <FileTextOutlined className="mr-2" />
            {t('admin.blogs.title')}
          </Title>
        </div>

        <Tabs activeKey={activeTab} onChange={setActiveTab}>
          <TabPane
            tab={
              <Badge count={0} offset={[10, 0]}>
                <span>
                  <ClockCircleOutlined className="mr-1" />
                  {t('admin.blogs.tabs.pending')}
                </span>
              </Badge>
            }
            key="pending"
          />
          <TabPane
            tab={
              <span>
                <CheckCircleOutlined className="mr-1" />
                {t('admin.blogs.tabs.published')}
              </span>
            }
            key="PUBLISHED"
          />
          <TabPane
            tab={
              <span>
                <CloseCircleOutlined className="mr-1" />
                {t('admin.blogs.tabs.rejected')}
              </span>
            }
            key="REJECTED"
          />
          <TabPane
            tab={
              <span>
                <FileTextOutlined className="mr-1" />
                {t('admin.blogs.tabs.all')}
              </span>
            }
            key="all"
          />
        </Tabs>

        <Table
          columns={columns}
          dataSource={blogs}
          rowKey="id"
          loading={loading}
          scroll={{ x: 1200 }}
          pagination={{
            current: page,
            pageSize: limit,
            total,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total) => t('admin.blogs.total', { total }),
            onChange: (page, pageSize) => {
              setPage(page);
              setLimit(pageSize);
            },
          }}
          locale={{
            emptyText: (
              <Empty
                description={t('admin.blogs.empty')}
                image={Empty.PRESENTED_IMAGE_SIMPLE}
              />
            ),
          }}
        />
      </Card>

      {/* 预览弹窗 */}
      <Modal
        title={t('admin.blogs.preview.title')}
        open={previewVisible}
        onCancel={() => {
          setPreviewVisible(false);
          setCurrentBlog(null);
        }}
        footer={null}
        width={800}
      >
        {currentBlog && (
          <div>
            {currentBlog.coverImage && (
              <div className="mb-4">
                <Image
                  src={currentBlog.coverImage}
                  alt={currentBlog.title}
                  style={{ maxHeight: 300, objectFit: 'cover' }}
                />
              </div>
            )}
            <Title level={3}>{currentBlog.title}</Title>
            <Descriptions column={2} className="mb-4">
              <Descriptions.Item label={t('admin.blogs.preview.author')}>
                {currentBlog.author?.username}
              </Descriptions.Item>
              <Descriptions.Item label={t('admin.blogs.preview.status')}>
                {getStatusTag(currentBlog.status)}
              </Descriptions.Item>
              <Descriptions.Item label={t('admin.blogs.preview.createdAt')}>
                {new Date(currentBlog.createdAt).toLocaleString()}
              </Descriptions.Item>
              <Descriptions.Item label={t('admin.blogs.preview.submittedAt')}>
                {currentBlog.submittedAt
                  ? new Date(currentBlog.submittedAt).toLocaleString()
                  : '-'}
              </Descriptions.Item>
            </Descriptions>
            <Paragraph>
              <Text strong>{t('admin.blogs.preview.excerpt')}: </Text>
              {currentBlog.excerpt}
            </Paragraph>
            <div className="mt-4">
              <Text strong>{t('admin.blogs.preview.content')}:</Text>
              <div
                className="mt-2 p-4 bg-gray-50 rounded"
                style={{ maxHeight: 400, overflow: 'auto' }}
                dangerouslySetInnerHTML={{ __html: currentBlog.content }}
              />
            </div>
            {currentBlog.status === 'PENDING_REVIEW' && (
              <div className="mt-6 flex justify-end space-x-2">
                <Button
                  danger
                  icon={<CloseOutlined />}
                  onClick={() => {
                    setPreviewVisible(false);
                    openRejectModal(currentBlog);
                  }}
                >
                  {t('admin.blogs.actions.reject')}
                </Button>
                <Button
                  type="primary"
                  icon={<CheckOutlined />}
                  onClick={() => {
                    handleApprove(currentBlog);
                    setPreviewVisible(false);
                  }}
                >
                  {t('admin.blogs.actions.approve')}
                </Button>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* 驳回弹窗 */}
      <Modal
        title={t('admin.blogs.reject.title')}
        open={rejectVisible}
        onCancel={() => {
          setRejectVisible(false);
          setRejectReason('');
          setCurrentBlog(null);
        }}
        onOk={handleReject}
        okText={t('admin.blogs.reject.confirm')}
        okButtonProps={{ danger: true }}
      >
        <div className="mb-4">
          <Text>{t('admin.blogs.reject.blogTitle')}: </Text>
          <Text strong>{currentBlog?.title}</Text>
        </div>
        <div>
          <Text>
            {t('admin.blogs.reject.reason')} <Text type="danger">*</Text>
          </Text>
          <TextArea
            rows={4}
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            placeholder={t('admin.blogs.reject.reasonPlaceholder')}
            maxLength={500}
            showCount
          />
        </div>
      </Modal>
    </div>
  );
};

export default Blogs;