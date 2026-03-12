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
} from '@ant-design/icons';
import PageLoading from '@/components/common/PageLoading';
import PageError from '@/components/common/PageError';
import { useSeo, useStructuredData } from '@/hooks/useSeo';
import { blogService } from '@/services/blog.service';
import type { BlogPost } from '@/services/blog.service';
import './BlogDetail.css';

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
        console.error('Failed to fetch blog:', err);
        setError(err.response?.data?.message || t('blog.loadError'));
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
        console.log('Share cancelled');
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

          {/* 文章内容 */}
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