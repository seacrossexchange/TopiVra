import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useSearchParams } from 'react-router-dom';
import {
  Card,
  Typography,
  Tag,
  Space,
  Input,
  Row,
  Col,
  Empty,
} from 'antd';
import {
  ClockCircleOutlined,
  EyeOutlined,
  SearchOutlined,
} from '@ant-design/icons';
import PageLoading from '@/components/common/PageLoading';
import { blogService } from '@/services/blog.service';
import type { BlogPost } from '@/services/blog.service';
import './BlogList.css';

const { Title, Text, Paragraph } = Typography;
const { Search } = Input;

interface BlogCategory {
  id: string;
  name: string;
  slug: string;
  postCount: number;
}

export default function BlogList() {
  const { t } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [categories, setCategories] = useState<BlogCategory[]>([]);
  const [selectedCategory, setSelectedCategory] = useState(searchParams.get('category') || 'all');
  const [searchQuery, setSearchQuery] = useState(searchParams.get('search') || '');

  useEffect(() => {
    fetchPosts();
  }, [selectedCategory, searchQuery]);

  const fetchPosts = async () => {
    try {
      setLoading(true);
      const params: any = { page: 1, limit: 100 };
      
      if (searchQuery) {
        params.search = searchQuery;
      }
      
      if (selectedCategory && selectedCategory !== 'all') {
        params.categoryId = selectedCategory;
      }

      const response = await blogService.getPublishedBlogs(params);
      setPosts(response.items || []);

      // 获取分类统计
      const allCategories: BlogCategory[] = [
        { id: 'all', name: t('blog.allCategories', '全部'), slug: 'all', postCount: response.total || 0 }
      ];
      
      // 从文章中提取分类
      const categoryMap = new Map<string, { name: string; count: number }>();
      response.items?.forEach((post) => {
        if (post.category) {
          const existing = categoryMap.get(post.category);
          if (existing) {
            existing.count++;
          } else {
            categoryMap.set(post.category, { name: post.category, count: 1 });
          }
        }
      });

      categoryMap.forEach((value, key) => {
        allCategories.push({
          id: key,
          name: value.name,
          slug: key.toLowerCase(),
          postCount: value.count
        });
      });

      setCategories(allCategories);
    } catch (error) {
      console.error('Failed to fetch blogs:', error);
      setPosts([]);
      setCategories([{ id: 'all', name: t('blog.allCategories', '全部'), slug: 'all', postCount: 0 }]);
    } finally {
      setLoading(false);
    }
  };

  const handleCategoryChange = (categorySlug: string) => {
    setSelectedCategory(categorySlug);
    const params = new URLSearchParams(searchParams);
    if (categorySlug === 'all') {
      params.delete('category');
    } else {
      params.set('category', categorySlug);
    }
    setSearchParams(params);
  };

  const handleSearch = (value: string) => {
    setSearchQuery(value);
    const params = new URLSearchParams(searchParams);
    if (value) {
      params.set('search', value);
    } else {
      params.delete('search');
    }
    setSearchParams(params);
  };

  const filteredPosts = posts;

  if (loading) {
    return <PageLoading />;
  }

  return (
    <div className="blog-list-page bg-[var(--color-bg-layout)] min-h-screen py-6 px-5">
      <div className="max-w-[1200px] mx-auto">

        <div className="blog-header text-center mb-8">
          <Title level={1} className="mb-4">{t('blog.title')}</Title>
          <Text type="secondary" className="text-lg">{t('blog.subtitle')}</Text>
        </div>

        {/* 搜索和筛选 */}
        <div className="blog-filters mb-8">
          <Row gutter={[16, 16]} justify="center">
            <Col xs={24} sm={12} md={8}>
              <Search
                placeholder={t('blog.searchPlaceholder')}
                allowClear
                enterButton={<SearchOutlined />}
                size="large"
                value={searchQuery}
                onSearch={handleSearch}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </Col>
          </Row>
          
          <div className="category-tabs flex justify-center gap-2 mt-6 flex-wrap">
            {categories.map((category) => (
              <Tag
                key={category.id}
                className={`category-tag cursor-pointer ${selectedCategory === category.slug ? 'active' : ''}`}
                onClick={() => handleCategoryChange(category.slug)}
                color={selectedCategory === category.slug ? 'var(--color-primary)' : 'default'}
              >
                {category.name} ({category.postCount})
              </Tag>
            ))}
          </div>
        </div>

        {/* 博客列表 */}
        {filteredPosts.length === 0 ? (
          <Empty description={t('blog.noPosts')} />
        ) : (
          <Row gutter={[24, 24]}>
            {filteredPosts.map((post) => (
              <Col xs={24} sm={12} lg={8} key={post.id}>
                <Link to={`/blog/${post.slug}`}>
                  <Card
                    hoverable
                    className="blog-card h-full"
                    cover={
                      <div className="blog-card-cover">
                        <img alt={post.title} src={post.coverImage} />
                        {post.category && (
                          <Tag className="category-badge" color="var(--color-primary)">
                            {post.category}
                          </Tag>
                        )}
                      </div>
                    }
                  >
                    <Title level={4} className="blog-card-title" ellipsis={{ rows: 2 }}>
                      {post.title}
                    </Title>
                    <Paragraph
                      className="blog-card-excerpt"
                      ellipsis={{ rows: 2 }}
                      type="secondary"
                    >
                      {post.excerpt || ''}
                    </Paragraph>
                    <div className="blog-card-meta">
                      <Space split={<span className="text-gray-400">•</span>}>
                        <span className="flex items-center gap-1">
                          <ClockCircleOutlined />
                          {post.readingTime || 5} {t('blog.minRead')}
                        </span>
                        <span className="flex items-center gap-1">
                          <EyeOutlined />
                          {post.viewCount}
                        </span>
                      </Space>
                      <Text type="secondary" className="text-sm">
                        {post.createdAt ? new Date(post.createdAt).toLocaleDateString() : ''}
                      </Text>
                    </div>
                  </Card>
                </Link>
              </Col>
            ))}
          </Row>
        )}
      </div>
    </div>
  );
}