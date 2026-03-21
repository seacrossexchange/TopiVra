import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Card, List, Avatar, Rate, Button, Modal, Form, Input, Tag,
  Progress, Space, Typography, Empty, message
} from 'antd';
import {
  StarFilled, UserOutlined, EditOutlined
} from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/services/apiClient';
import { useAuthStore } from '@/store/authStore';
import dayjs from 'dayjs';

const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;

interface Review {
  id: string;
  userId: string;
  user: {
    id: string;
    username: string;
    avatar?: string;
  };
  rating: number;
  content: string;
  isAnonymous: boolean;
  createdAt: string;
  sellerReply?: string;
}

interface ReviewStats {
  average: number;
  total: number;
  distribution: {
    5: number;
    4: number;
    3: number;
    2: number;
    1: number;
  };
}

interface ReviewSectionProps {
  productId: string;
}

export default function ReviewSection({ productId }: ReviewSectionProps) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { isAuthenticated } = useAuthStore();
  const [writeModal, setWriteModal] = useState(false);
  const [form] = Form.useForm();

  // Fetch reviews
  const { data: reviews, isLoading } = useQuery({
    queryKey: ['reviews', productId],
    queryFn: async () => {
      const response = await apiClient.get(`/reviews/product/${productId}`);
      return response.data as Review[];
    },
  });

  // Fetch review stats
  const { data: stats } = useQuery({
    queryKey: ['review-stats', productId],
    queryFn: async () => {
      const response = await apiClient.get(`/reviews/product/${productId}/stats`);
      return response.data as ReviewStats;
    },
  });

  // Create review mutation
  const createMutation = useMutation({
    mutationFn: async (data: { rating: number; content: string; isAnonymous: boolean }) => {
      return apiClient.post('/reviews', {
        productId,
        ...data,
      });
    },
    onSuccess: () => {
      message.success(t('review.submitSuccess'));
      queryClient.invalidateQueries({ queryKey: ['reviews', productId] });
      queryClient.invalidateQueries({ queryKey: ['review-stats', productId] });
      setWriteModal(false);
      form.resetFields();
    },
  });

  // Quick tags
  const quickTags = [
    { label: t('review.tags.good'), content: t('review.tags.goodContent') },
    { label: t('review.tags.fast'), content: t('review.tags.fastContent') },
    { label: t('review.tags.reliable'), content: t('review.tags.reliableContent') },
  ];

  const handleTagClick = (content: string) => {
    const currentContent = form.getFieldValue('content') || '';
    form.setFieldValue('content', currentContent ? `${currentContent} ${content}` : content);
  };

  const renderDistribution = () => {
    if (!stats) return null;

    return (
      <Card style={{ marginBottom: 16 }}>
        <Space align="start" size="large">
          <div style={{ textAlign: 'center' }}>
            <Title level={2} style={{ marginBottom: 0 }}>
              {stats.average.toFixed(1)}
            </Title>
            <Rate disabled value={stats.average} allowHalf />
            <Text type="secondary">{stats.total} {t('review.reviews')}</Text>
          </div>
          <div style={{ flex: 1 }}>
            {[5, 4, 3, 2, 1].map((star) => {
              const count = stats.distribution[star as keyof typeof stats.distribution] || 0;
              const percent = stats.total > 0 ? (count / stats.total) * 100 : 0;
              return (
                <div key={star} style={{ display: 'flex', alignItems: 'center', marginBottom: 4 }}>
                  <Text style={{ width: 20 }}>{star}</Text>
                  <StarFilled style={{ color: 'var(--color-warning)', marginRight: 8 }} />
                  <Progress percent={percent} showInfo={false} style={{ width: 120, marginRight: 8 }} />
                  <Text type="secondary">{count}</Text>
                </div>
              );
            })}
          </div>
        </Space>
      </Card>
    );
  };

  const renderReviewItem = (item: Review) => (
    <List.Item>
      <List.Item.Meta
        avatar={
          item.isAnonymous ? (
            <Avatar icon={<UserOutlined />} />
          ) : (
            <Avatar src={item.user.avatar} icon={<UserOutlined />} />
          )
        }
        title={
          <Space>
            {item.isAnonymous ? t('review.anonymous') : item.user.username}
            <Rate disabled value={item.rating} style={{ fontSize: 12 }} />
          </Space>
        }
        description={
          <div>
            <Paragraph>{item.content}</Paragraph>
            <Text type="secondary">{dayjs(item.createdAt).format('YYYY-MM-DD HH:mm')}</Text>
            {item.sellerReply && (
              <Card size="small" style={{ marginTop: 8, background: 'var(--color-bg-secondary)' }}>
                <Text type="secondary">{t('review.sellerReply')}:</Text>
                <br />
                <Text>{item.sellerReply}</Text>
              </Card>
            )}
          </div>
        }
      />
    </List.Item>
  );

  return (
    <div>
      <Card
        title={
          <Space>
            <Title level={4} style={{ margin: 0 }}>{t('review.title')}</Title>
            <Tag>{stats?.total || 0}</Tag>
          </Space>
        }
        extra={
          isAuthenticated && (
            <Button
              type="primary"
              icon={<EditOutlined />}
              onClick={() => setWriteModal(true)}
            >
              {t('review.write')}
            </Button>
          )
        }
      >
        {stats && renderDistribution()}

        {reviews && reviews.length > 0 ? (
          <List
            loading={isLoading}
            itemLayout="vertical"
            dataSource={reviews}
            renderItem={renderReviewItem}
            pagination={{
              pageSize: 5,
              size: 'small',
            }}
          />
        ) : (
          <Empty description={t('review.noReviews')} />
        )}
      </Card>

      <Modal
        title={t('review.write')}
        open={writeModal}
        onCancel={() => setWriteModal(false)}
        footer={null}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={(values) => {
            createMutation.mutate(values);
          }}
        >
          <Form.Item
            name="rating"
            label={t('review.rating')}
            rules={[{ required: true, message: t('review.ratingRequired') }]}
          >
            <Rate />
          </Form.Item>

          <Form.Item label={t('review.quickTags')}>
            <Space wrap>
              {quickTags.map((tag) => (
                <Tag
                  key={tag.label}
                  style={{ cursor: 'pointer' }}
                  onClick={() => handleTagClick(tag.content)}
                >
                  {tag.label}
                </Tag>
              ))}
            </Space>
          </Form.Item>

          <Form.Item
            name="content"
            label={t('review.content')}
            rules={[
              { required: true, message: t('review.contentRequired') },
              { min: 10, message: t('review.contentMin') },
            ]}
          >
            <TextArea rows={4} placeholder={t('review.contentPlaceholder')} />
          </Form.Item>

          <Form.Item name="isAnonymous" valuePropName="checked">
            <label>
              <input type="checkbox" /> {t('review.anonymousLabel')}
            </label>
          </Form.Item>

          <Space>
            <Button onClick={() => setWriteModal(false)}>{t('common.cancel')}</Button>
            <Button type="primary" htmlType="submit" loading={createMutation.isPending}>
              {t('common.submit')}
            </Button>
          </Space>
        </Form>
      </Modal>
    </div>
  );
}