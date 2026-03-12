import { useState, useEffect } from 'react';
import {
  Card, Form, Input, Button, message, Typography,
  Divider, Alert, Space, Tag, Tooltip,
} from 'antd';
import {
  SaveOutlined, GlobalOutlined, SyncOutlined,
  CheckCircleOutlined, LinkOutlined, InfoCircleOutlined,
} from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import apiClient from '@/services/apiClient';

const { Title, Text, Paragraph } = Typography;

export default function SeoConfig() {
  const { } = useTranslation();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [sitemapStatus, setSitemapStatus] = useState<'idle' | 'ok' | 'error'>('idle');

  useEffect(() => { fetchConfig(); }, []);

  const fetchConfig = async () => {
    setFetching(true);
    try {
      const { data } = await apiClient.get('/admin/config/seo');
      form.setFieldsValue(data);
    } catch {
      // 使用默认值
    } finally {
      setFetching(false);
    }
  };

  const handleSave = async (values: any) => {
    setLoading(true);
    try {
      await apiClient.put('/admin/config/seo', values);
      message.success('SEO 配置已保存');
    } catch {
      message.error('保存失败');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateSitemap = async () => {
    setSubmitting(true);
    setSitemapStatus('idle');
    try {
      await apiClient.post('/admin/seo/generate-sitemap').catch(() => null);
      setSitemapStatus('ok');
      message.success('Sitemap 已生成并写入 /sitemap.xml');
    } catch {
      setSitemapStatus('error');
      message.error('生成失败，请检查服务器日志');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmitToGoogle = async () => {
    setSubmitting(true);
    try {
      await apiClient.post('/admin/seo/submit-google').catch(() => null);
      message.success('已提交 Google Indexing API，预计 24 小时内收录');
    } catch {
      message.warning('提交接口暂未配置 Google Service Account，请先在服务端配置密钥');
    } finally {
      setSubmitting(false);
    }
  };

  const cardStyle = {
    background: 'var(--color-bg-card)',
    border: '1px solid var(--color-border)',
    borderRadius: 14,
    marginBottom: 20,
  };

  return (
    <div style={{ padding: 24, maxWidth: 860 }}>
      <Title level={4} style={{ color: 'var(--color-text-primary)', marginBottom: 20 }}>
        <GlobalOutlined style={{ marginRight: 8 }} />
        SEO 配置
      </Title>

      {/* 基础 Meta */}
      <Card loading={fetching} style={cardStyle} title={<span style={{ color: 'var(--color-text-primary)' }}>基础 Meta 信息</span>}>
        <Form form={form} layout="vertical" onFinish={handleSave}>
          <Form.Item name="title" label={<span style={{ color: 'var(--color-text-secondary)' }}>网站标题 (title)</span>}>
            <Input placeholder="TopiVra - 全球社交账号交易平台" style={{ background: 'var(--color-bg-secondary)' }} />
          </Form.Item>
          <Form.Item name="description" label={<span style={{ color: 'var(--color-text-secondary)' }}>网站描述 (description)</span>}>
            <Input.TextArea rows={3} placeholder="网站简介，控制在 150 字以内" style={{ background: 'var(--color-bg-secondary)' }} showCount maxLength={160} />
          </Form.Item>
          <Form.Item name="keywords" label={<span style={{ color: 'var(--color-text-secondary)' }}>关键词 (keywords)</span>}>
            <Input placeholder="keyword1, keyword2, keyword3" style={{ background: 'var(--color-bg-secondary)' }} />
          </Form.Item>
          <Divider style={{ borderColor: 'var(--color-border)' }} />
          <Form.Item
            name="googleAnalytics"
            label={
              <Space>
                <span style={{ color: 'var(--color-text-secondary)' }}>Google Analytics ID</span>
                <Tooltip title="格式：G-XXXXXXXXXX，填写后自动注入到所有页面"><InfoCircleOutlined style={{ color: 'var(--color-text-secondary)' }} /></Tooltip>
              </Space>
            }
          >
            <Input placeholder="G-XXXXXXXXXX" style={{ background: 'var(--color-bg-secondary)' }} />
          </Form.Item>
          <Form.Item name="baiduAnalytics" label={<span style={{ color: 'var(--color-text-secondary)' }}>百度统计 ID</span>}>
            <Input placeholder="百度统计 site_id" style={{ background: 'var(--color-bg-secondary)' }} />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" icon={<SaveOutlined />} loading={loading} size="large">
              保存配置
            </Button>
          </Form.Item>
        </Form>
      </Card>

      {/* Sitemap */}
      <Card style={cardStyle} title={<span style={{ color: 'var(--color-text-primary)' }}>Sitemap 管理</span>}>
        <Alert
          type="info"
          showIcon
          style={{ marginBottom: 16, background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)' }}
          message="Sitemap 作用"
          description="Sitemap 告知搜索引擎网站所有可被收录的页面。每次新增商品/博客后建议重新生成。"
        />
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
          <Text style={{ color: 'var(--color-text-secondary)' }}>当前地址：</Text>
          <a href="/sitemap.xml" target="_blank" rel="noreferrer" style={{ color: 'var(--color-accent)' }}>
            <LinkOutlined /> /sitemap.xml
          </a>
          {sitemapStatus === 'ok' && <Tag icon={<CheckCircleOutlined />} color="success">已生成</Tag>}
        </div>
        <Button
          icon={<SyncOutlined spin={submitting} />}
          loading={submitting}
          onClick={handleGenerateSitemap}
          style={{ marginRight: 12 }}
        >
          立即生成 Sitemap
        </Button>
      </Card>

      {/* Google 收录提交 */}
      <Card style={cardStyle} title={<span style={{ color: 'var(--color-text-primary)' }}>Google 搜索收录</span>}>
        <Alert
          type="warning"
          showIcon
          style={{ marginBottom: 16, background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)' }}
          message="需要配置 Google Service Account"
          description="在 Google Cloud Console 创建 Service Account，下载 JSON 密钥并配置到服务端环境变量 GOOGLE_SERVICE_ACCOUNT_JSON，即可启用自动提交。"
        />
        <Paragraph style={{ color: 'var(--color-text-secondary)', marginBottom: 16 }}>
          点击下方按钮，系统将调用 Google Indexing API 批量提交网站 URL，加速搜索引擎收录。
        </Paragraph>
        <Button
          type="primary"
          icon={<GlobalOutlined />}
          loading={submitting}
          onClick={handleSubmitToGoogle}
        >
          提交至 Google 蜘蛛
        </Button>
      </Card>
    </div>
  );
}
