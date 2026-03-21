import { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams, Link } from 'react-router-dom';
import {
  Typography,
  Tag,
  Space,
  Breadcrumb,
  Card,
  Avatar,
  Divider,
  Row,
  Col,
  Button,
  message,
} from 'antd';
import {
  HomeOutlined,
  ClockCircleOutlined,
  EyeOutlined,
  ShareAltOutlined,
  ArrowLeftOutlined,
  LockOutlined,
  CrownOutlined,
  DollarOutlined,
} from '@ant-design/icons';
import PageLoading from '@/components/common/PageLoading';
import PageError from '@/components/common/PageError';
import { useSeo, useStructuredData } from '@/hooks/useSeo';
import { extractApiErrorMessage } from '@/utils/errorHandler';
import { blogService } from '@/services/blog.service';
import type { BlogPost } from '@/services/blog.service';
import { useAuthStore } from '@/store/authStore';
import './BlogDetail.css';

// 权限控制组件
function AccessGate({ 
  post, 
  children 
}: { 
  post: BlogPost; 
  children: React.ReactNode;
}) {
  const { t } = useTranslation();
  const { isAuthenticated, user } = useAuthStore();
  const [unlocked, setUnlocked] = useState(false);
  const [processing, setProcessing] = useState(false);
  
  const accessType = post.accessType || 'PUBLIC';
  const unlockPrice = post.unlockPrice || 0;
  const previewContent = post.previewContent || post.excerpt || '';
  
    // 检查是否已解锁
  const hasAccess = useMemo(() => {
    if (accessType === 'PUBLIC') return true;
    if (!isAuthenticated) return false;
    if (accessType === 'LOGIN_REQUIRED') return true;
    // 检查用户是否是会员（从角色判断）
    const userRoles = user?.roles || [];
    const isMember = userRoles.includes('MEMBER') || userRoles.includes('ADMIN');
    if (accessType === 'MEMBER_ONLY') return isMember || unlocked;
    if (accessType === 'PAID_UNLOCK') return unlocked;
    if (accessType === 'MEMBER_OR_PAID') return isMember || unlocked;
    return false;
  }, [accessType, isAuthenticated, user?.roles, unlocked]);

  const handleUnlock = async () => {
    if (!isAuthenticated) {
      message.warning(t('blog.pleaseLogin', '请先登录'));
      return;
    }
    setProcessing(true);
    try {
      await blogService.unlockBlog(post.id);
      setUnlocked(true);
      message.success(t('blog.unlockSuccess', '解锁成功'));
    } catch {
      message.error(t('blog.unlockFailed', '解锁失败'));
    } finally {
      setProcessing(false);
    }
  };

  // 公开文章直接显示
  if (hasAccess) {
    return <>{children}</>;
  }

  // 未登录且需要登录
  if (!isAuthenticated && accessType !== 'PUBLIC') {
    return (
      <Card className="access-gate-card text-center py-12">
        <LockOutlined className="text-5xl text-[var(--color-primary)] mb-4" />
        <Title level={4}>{t('blog.loginRequired', '登录后阅读全文')}</Title>
        <Text type="secondary" className="block mb-6">
          {t('blog.loginRequiredDesc', '该文章需要登录后才能阅读完整内容')}
        </Text>
        {previewContent && (
          <div 
            className="prose prose-lg max-w-none mb-6 text-left"
            dangerouslySetInnerHTML={{ __html: previewContent }}
          />
        )}
        <Link to="/login">
          <Button type="primary" size="large" icon={<LockOutlined />}>
            {t('common.login', '登录')}
          </Button>
        </Link>
      </Card>
    );
  }

  // 会员内容
  if (accessType === 'MEMBER_ONLY') {
    return (
      <Card className="access-gate-card text-center py-12">
        <CrownOutlined className="text-5xl text-yellow-500 mb-4" />
        <Title level={4}>{t('blog.memberRequired', '会员专属内容')}</Title>
        <Text type="secondary" className="block mb-6">
          {t('blog.memberRequiredDesc', '开通会员后即可阅读此文章')}
        </Text>
        {previewContent && (
          <div 
            className="prose prose-lg max-w-none mb-6 text-left"
            dangerouslySetInnerHTML={{ __html: previewContent }}
          />
        )}
        <Link to="/membership">
          <Button type="primary" size="large" icon={<CrownOutlined />}>
            {t('blog.becomeMember', '开通会员')}
          </Button>
        </Link>
      </Card>
    );
  }

  // 打赏解锁
  if (accessType === 'PAID_UNLOCK' || accessType === 'MEMBER_OR_PAID') {
    return (
      <Card className="access-gate-card text-center py-12">
        <DollarOutlined className="text-5xl text-green-500 mb-4" />
        <Title level={4}>{t('blog.donationRequired', '付费阅读')}</Title>
        <Text type="secondary" className="block mb-2">
          {t('blog.donationRequiredDesc', `支付 ¥${unlockPrice} 后解锁全文`)}
        </Text>
        {accessType === 'MEMBER_OR_PAID' && (
          <Text type="secondary" className="block mb-6">
            {t('blog.orMember', '或开通会员免费阅读')}
          </Text>
        )}
        {previewContent && (
          <div 
            className="prose prose-lg max-w-none mb-6 text-left"
            dangerouslySetInnerHTML={{ __html: previewContent }}
          />
        )}
        <Space>
          <Button 
            type="primary" 
            size="large" 
            icon={<DollarOutlined />}
            loading={processing}
            onClick={handleUnlock}
          >
            {t('blog.payToUnlock', `支付 ¥${unlockPrice} 解锁`)}
          </Button>
          {accessType === 'MEMBER_OR_PAID' && (
            <Link to="/membership">
              <Button size="large" icon={<CrownOutlined />}>
                {t('blog.becomeMember', '开通会员')}
              </Button>
            </Link>
          )}
        </Space>
      </Card>
    );
  }

  return <>{children}</>;
}

const { Title, Text } = Typography;

interface RelatedPost {
  id: string;
  slug: string;
  title: string;
  coverImage?: string;
  category?: string;
}

export default function BlogDetail() {
  const { t } = useTranslation();
  const { slug } = useParams<{ slug: string }>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [post, setPost] = useState<BlogPost | null>(null);
  const [relatedPosts, setRelatedPosts] = useState<RelatedPost[]>([]);

  useEffect(() => {
    const fetchPost = async () => {
      if (!slug) return;
      
      try {
        setLoading(true);
        const data = await blogService.getBlogBySlug(slug);
        setPost(data);
        
        // 获取相关文章
        try {
          const related = await blogService.getRelatedBlogs(data.id, 3);
          setRelatedPosts(related);
        } catch {
          setRelatedPosts([]);
        }
        
        setError(null);
      } catch (err: any) {
        if (import.meta.env.DEV) {
          console.error('Failed to fetch blog:', err);
        }
        setError(extractApiErrorMessage(err, t('blog.loadError')));
      } finally {
        setLoading(false);
      }
    };

    fetchPost();
  }, [slug, t]);

  // SEO - 动态根据文章数据生成
  useSeo({
    title: post ? `${post.title} | TopiVra Blog` : undefined,
    description: post?.excerpt,
    keywords: post?.tags,
    ogImage: post?.coverImage,
    ogType: 'article',
  });

  // Article structured data for SEO
  const articleStructuredData = useMemo(() => {
    if (!post) return null;
    return {
      '@context': 'https://schema.org',
      '@type': 'Article',
      headline: post.title,
      description: post.excerpt,
      image: post.coverImage,
      author: {
        '@type': 'Person',
        name: post.author.username,
      },
      datePublished: post.createdAt,
      dateModified: post.updatedAt,
      publisher: {
        '@type': 'Organization',
        name: 'TopiVra',
        logo: {
          '@type': 'ImageObject',
          url: 'https://topivra.com/logo.png',
        },
      },
    };
  }, [post]);

  useStructuredData(articleStructuredData);

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: post?.title,
          url: window.location.href,
        });
      } catch {
        // 用户取消分享，静默处理
      }
    } else {
      // 复制链接到剪贴板
      try {
        await navigator.clipboard.writeText(window.location.href);
        message.success(t('common.copySuccess', '链接已复制'));
      } catch {
        message.error(t('common.copyFailed', '复制失败'));
      }
    }
  };

  // 计算阅读时间（基于内容长度）
  const calculateReadingTime = (content: string): number => {
    const wordsPerMinute = 200;
    const wordCount = content.length / 2; // 中文按字符数除以2估算
    return Math.ceil(wordCount / wordsPerMinute);
  };

  if (loading) {
    return <PageLoading />;
  }

  if (error || !post) {
    return <PageError title={t('blog.loadError')} subTitle={error || t('blog.notFound')} />;
  }

  return (
    <div className="blog-detail-page bg-[var(--color-bg-layout)] min-h-screen py-6 px-5">
      <div className="max-w-[900px] mx-auto">
        <Breadcrumb
          className="mb-6"
          items={[
            { title: <a href="/"><HomeOutlined /></a> },
            { title: <a href="/blog">{t('blog.title')}</a> },
            { title: post.title },
          ]}
        />

        <article className="blog-article">
          {/* 文章头部 */}
          <header className="blog-article-header mb-8">
            <Link to="/blog" className="back-link inline-flex items-center gap-2 mb-6 text-[var(--color-text-secondary)] hover:text-[var(--color-primary)]">
              <ArrowLeftOutlined />
              {t('blog.backToList')}
            </Link>
            
            <Title level={1} className="blog-article-title">
              {post.title}
            </Title>

            <div className="blog-article-meta flex flex-wrap items-center gap-4 mb-6">
              <div className="author-info flex items-center gap-3">
                <Avatar src={post.author.avatar} size={40}>
                  {post.author.username[0].toUpperCase()}
                </Avatar>
                <div>
                  <Text strong className="block">{post.author.username}</Text>
                  <Text type="secondary" className="text-sm">{t('blog.author')}</Text>
                </div>
              </div>
              
              <Divider type="vertical" className="hidden sm:block" />
              
              <Space split={<span className="text-gray-400">•</span>}>
                <span className="flex items-center gap-1 text-[var(--color-text-secondary)]">
                  <ClockCircleOutlined />
                  {post.readingTime || calculateReadingTime(post.content)} {t('blog.minRead', '分钟阅读')}
                </span>
                <span className="flex items-center gap-1 text-[var(--color-text-secondary)]">
                  <EyeOutlined />
                  {post.viewCount}
                </span>
                <Text type="secondary">{new Date(post.createdAt).toLocaleDateString()}</Text>
              </Space>
            </div>

            {post.tags && post.tags.length > 0 && (
              <div className="blog-article-tags flex flex-wrap gap-2">
                {post.tags.map((tag) => (
                  <Tag key={tag} color="var(--color-primary)">{tag}</Tag>
                ))}
              </div>
            )}
          </header>

          {/* 封面图 */}
          {post.coverImage && (
            <div className="blog-article-cover mb-8 rounded-lg overflow-hidden">
              <img src={post.coverImage} alt={post.title} className="w-full h-auto" />
            </div>
          )}

          {/* 文章内容 - 带权限控制 */}
          <AccessGate post={post}>
            <Card className="blog-article-content mb-8">
              <div 
                className="prose prose-lg max-w-none"
                dangerouslySetInnerHTML={{ 
                  __html: post.content
                    .replace(/\n/g, '<br/>')
                    .replace(/##\s*(.+)/g, '<h2>$1</h2>')
                    .replace(/###\s*(.+)/g, '<h3>$1</h3>')
                    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
                    .replace(/\*(.+?)\*/g, '<em>$1</em>')
                    .replace(/- (.+)/g, '<li>$1</li>')
                }}
              />
            </Card>
          </AccessGate>

          {/* 文章底部操作 */}
          <div className="blog-article-actions flex justify-between items-center py-6 border-t border-b border-[var(--color-border-secondary)] mb-8">
            <div className="flex items-center gap-4">
              <Space>
                <EyeOutlined />
                <Text>{post.viewCount} {t('blog.views', '阅读')}</Text>
              </Space>
            </div>
            <Button icon={<ShareAltOutlined />} onClick={handleShare}>
              {t('blog.share')}
            </Button>
          </div>
        </article>

        {/* 相关文章 */}
        {relatedPosts.length > 0 && (
          <section className="blog-related">
            <Title level={3} className="mb-6">{t('blog.relatedPosts')}</Title>
            <Row gutter={[16, 16]}>
              {relatedPosts.map((relatedPost) => (
                <Col xs={24} sm={8} key={relatedPost.id}>
                  <Link to={`/blog/${relatedPost.slug}`}>
                    <Card
                      hoverable
                      className="related-card"
                      cover={
                        relatedPost.coverImage ? (
                          <div className="related-card-cover">
                            <img alt={relatedPost.title} src={relatedPost.coverImage} />
                            {relatedPost.category && (
                              <Tag className="category-tag" color="var(--color-primary)">
                                {relatedPost.category}
                              </Tag>
                            )}
                          </div>
                        ) : undefined
                      }
                    >
                      <Text className="related-card-title" ellipsis>
                        {relatedPost.title}
                      </Text>
                    </Card>
                  </Link>
                </Col>
              ))}
            </Row>
          </section>
        )}
      </div>
    </div>
  );
}