import React, { useState, useEffect } from 'react';
import {
  Card,
  Button,
  Table,
  Tag,
  Space,
  Modal,
  Form,
  Input,
  Select,
  message,
  Tabs,
  Statistic,
  Row,
  Col,
  Tooltip,
  Empty,
  Typography,
  Popconfirm,
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  SendOutlined,
  EyeOutlined,
  FileTextOutlined,
  ClockCircleOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  InboxOutlined,
} from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import type { ColumnsType } from 'antd/es/table';
import {
  getMyBlogs,
  createBlog,
  updateBlog,
  deleteBlog,
  submitBlogForReview,
  getBlogStats,
  type Blog,
  type BlogListParams,
} from '@/services/blog';

const { TextArea } = Input;
const { Text, Title } = Typography;
const { TabPane } = Tabs;

const SellerBlog: React.FC = () => {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [blogs, setBlogs] = useState<Blog[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [activeTab, setActiveTab] = useState('all');
  const [editVisible, setEditVisible] = useState(false);
  const [currentBlog, setCurrentBlog] = useState<Blog | null>(null);
  const [form] = Form.useForm();
  const [stats, setStats] = useState({
    total: 0,
    draft: 0,
    pending: 0,
    published: 0,
    rejected: 0,
  });

  const fetchStats = async () => {
    try {
      const data = await getBlogStats();
      setStats(data);
    } catch {
      // ignore
    }
  };

  const fetchBlogs = async (params: BlogListParams = {}) => {
    setLoading(true);
    try {
      const status = activeTab === 'all' ? undefined : activeTab;
      const response = await getMyBlogs({ page, limit, status, ...params });
      setBlogs(response.data || []);
      setTotal(response.total || 0);
    } catch {
      message.error(t('seller.blog.fetchError'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
    fetchBlogs();
  }, [page, limit, activeTab]);

  const handleCreate = () => {
    setCurrentBlog(null);
    form.resetFields();
    setEditVisible(true);
  };

  const handleEdit = (blog: Blog) => {
    setCurrentBlog(blog);
    form.setFieldsValue({
      title: blog.title,
      excerpt: blog.excerpt,
      content: blog.content,
      categoryId: blog.categoryId,
      tags: blog.tags,
    });
    setEditVisible(true);
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteBlog(id);
      message.success(t('seller.blog.deleteSuccess'));
      fetchBlogs();
      fetchStats();
    } catch {
      message.error(t('seller.blog.deleteError'));
    }
  };

  const handleSubmit = async (id: string) => {
    try {
      await submitBlogForReview(id);
      message.success(t('seller.blog.submitSuccess'));
      fetchBlogs();
      fetchStats();
    } catch {
      message.error(t('seller.blog.submitError'));
    }
  };

  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      if (currentBlog) {
        await updateBlog(currentBlog.id, values);
        message.success(t('seller.blog.updateSuccess'));
      } else {
        await createBlog(values);
        message.success(t('seller.blog.createSuccess'));
      }
      setEditVisible(false);
      fetchBlogs();
      fetchStats();
    } catch {
      message.error(t('seller.blog.saveError'));
    }
  };

  const getStatusTag = (status: string) => {
    const statusConfig: Record<string, { color: string; icon: React.ReactNode }> = {
      DRAFT: { color: 'default', icon: <FileTextOutlined /> },
      PENDING_REVIEW: { color: 'processing', icon: <ClockCircleOutlined /> },
      PUBLISHED: { color: 'success', icon: <CheckCircleOutlined /> },
      REJECTED: { color: 'error', icon: <CloseCircleOutlined /> },
      ARCHIVED: { color: 'warning', icon: <InboxOutlined /> },
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
      title: t('seller.blog.columns.title'),
      dataIndex: 'title',
      key: 'title',
      width: 300,
      render: (text: string, record: Blog) => (
        <Space direction="vertical" size={0}>
          <Text strong style={{ maxWidth: 280 }} ellipsis={{ tooltip: text }}>
            {text}
          </Text>
          {record.rejectReason && (
            <Text type="danger" style={{ fontSize: 12 }}>
              {t('seller.blog.rejectReason')}: {record.rejectReason}
            </Text>
          )}
        </Space>
      ),
    },
    {
      title: t('seller.blog.columns.status'),
      dataIndex: 'status',
      key: 'status',
      width: 120,
      render: (status: string) => getStatusTag(status),
    },
    {
      title: t('seller.blog.columns.views'),
      dataIndex: 'viewCount',
      key: 'viewCount',
      width: 100,
      render: (count: number) => count || 0,
    },
    {
      title: t('seller.blog.columns.likes'),
      dataIndex: 'likeCount',
      key: 'likeCount',
      width: 100,
      render: (count: number) => count || 0,
    },
    {
      title: t('seller.blog.columns.createdAt'),
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 180,
      render: (date: string) => new Date(date).toLocaleString(),
    },
    {
      title: t('seller.blog.columns.actions'),
      key: 'actions',
      width: 200,
      fixed: 'right',
      render: (_: unknown, record: Blog) => (
        <Space>
          {record.status === 'DRAFT' && (
            <>
              <Tooltip title={t('seller.blog.actions.edit')}>
                <Button
                  type="text"
                  icon={<EditOutlined />}
                  onClick={() => handleEdit(record)}
                />
              </Tooltip>
              <Tooltip title={t('seller.blog.actions.submit')}>
                <Button
                  type="text"
                  icon={<SendOutlined />}
                  style={{ color: '#1890ff' }}
                  onClick={() => handleSubmit(record.id)}
                />
              </Tooltip>
              <Popconfirm
                title={t('seller.blog.deleteConfirm')}
                onConfirm={() => handleDelete(record.id)}
              >
                <Button type="text" icon={<DeleteOutlined />} danger />
              </Popconfirm>
            </>
          )}
          {record.status === 'REJECTED' && (
            <>
              <Tooltip title={t('seller.blog.actions.edit')}>
                <Button
                  type="text"
                  icon={<EditOutlined />}
                  onClick={() => handleEdit(record)}
                />
              </Tooltip>
              <Tooltip title={t('seller.blog.actions.resubmit')}>
                <Button
                  type="text"
                  icon={<SendOutlined />}
                  style={{ color: '#1890ff' }}
                  onClick={() => handleSubmit(record.id)}
                />
              </Tooltip>
              <Popconfirm
                title={t('seller.blog.deleteConfirm')}
                onConfirm={() => handleDelete(record.id)}
              >
                <Button type="text" icon={<DeleteOutlined />} danger />
              </Popconfirm>
            </>
          )}
          {record.status === 'PUBLISHED' && (
            <Tooltip title={t('seller.blog.actions.view')}>
              <Button
                type="text"
                icon={<EyeOutlined />}
                onClick={() => window.open(`/blog/${record.id}`, '_blank')}
              />
            </Tooltip>
          )}
          {record.status === 'PENDING_REVIEW' && (
            <Tag color="processing">{t('seller.blog.status.pendingReview')}</Tag>
          )}
        </Space>
      ),
    },
  ];

  return (
    <div className="p-6">
      {/* 统计卡片 */}
      <Row gutter={16} className="mb-6">
        <Col span={4}>
          <Card>
            <Statistic
              title={t('seller.blog.stats.total')}
              value={stats.total}
              prefix={<FileTextOutlined />}
            />
          </Card>
        </Col>
        <Col span={4}>
          <Card>
            <Statistic
              title={t('seller.blog.stats.draft')}
              value={stats.draft}
              valueStyle={{ color: '#8c8c8c' }}
            />
          </Card>
        </Col>
        <Col span={4}>
          <Card>
            <Statistic
              title={t('seller.blog.stats.pending')}
              value={stats.pending}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col span={4}>
          <Card>
            <Statistic
              title={t('seller.blog.stats.published')}
              value={stats.published}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col span={4}>
          <Card>
            <Statistic
              title={t('seller.blog.stats.rejected')}
              value={stats.rejected}
              valueStyle={{ color: '#ff4d4f' }}
            />
          </Card>
        </Col>
      </Row>

      {/* 博客列表 */}
      <Card>
        <div className="mb-4 flex justify-between items-center">
          <Title level={4} style={{ margin: 0 }}>
            <FileTextOutlined className="mr-2" />
            {t('seller.blog.title')}
          </Title>
          <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate}>
            {t('seller.blog.create')}
          </Button>
        </div>

        <Tabs activeKey={activeTab} onChange={setActiveTab}>
          <TabPane tab={t('seller.blog.tabs.all')} key="all" />
          <TabPane tab={t('seller.blog.tabs.draft')} key="DRAFT" />
          <TabPane tab={t('seller.blog.tabs.pending')} key="PENDING_REVIEW" />
          <TabPane tab={t('seller.blog.tabs.published')} key="PUBLISHED" />
          <TabPane tab={t('seller.blog.tabs.rejected')} key="REJECTED" />
        </Tabs>

        <Table
          columns={columns}
          dataSource={blogs}
          rowKey="id"
          loading={loading}
          scroll={{ x: 1000 }}
          pagination={{
            current: page,
            pageSize: limit,
            total,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total) => t('seller.blog.total', { total }),
            onChange: (page, pageSize) => {
              setPage(page);
              setLimit(pageSize);
            },
          }}
          locale={{
            emptyText: (
              <Empty
                description={t('seller.blog.empty')}
                image={Empty.PRESENTED_IMAGE_SIMPLE}
              />
            ),
          }}
        />
      </Card>

      {/* 编辑弹窗 */}
      <Modal
        title={currentBlog ? t('seller.blog.edit') : t('seller.blog.create')}
        open={editVisible}
        onCancel={() => setEditVisible(false)}
        onOk={handleSave}
        width={700}
        okText={t('common.save')}
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="title"
            label={t('seller.blog.form.title')}
            rules={[{ required: true, message: t('seller.blog.form.titleRequired') }]}
          >
            <Input maxLength={200} showCount />
          </Form.Item>
          <Form.Item
            name="excerpt"
            label={t('seller.blog.form.excerpt')}
            rules={[{ required: true, message: t('seller.blog.form.excerptRequired') }]}
          >
            <TextArea rows={2} maxLength={500} showCount />
          </Form.Item>
          <Form.Item
            name="content"
            label={t('seller.blog.form.content')}
            rules={[{ required: true, message: t('seller.blog.form.contentRequired') }]}
          >
            <TextArea rows={10} />
          </Form.Item>
          <Form.Item name="tags" label={t('seller.blog.form.tags')}>
            <Select mode="tags" placeholder={t('seller.blog.form.tagsPlaceholder')} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default SellerBlog;