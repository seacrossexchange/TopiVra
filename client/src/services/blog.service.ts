import apiClient from './apiClient';

export interface BlogPost {
  id: string;
  slug: string;
  title: string;
  excerpt?: string;
  content: string;
  coverImage?: string;
  category?: string;
  tags?: string[];
  author: {
    id: string;
    username: string;
    avatar?: string;
  };
  viewCount: number;
  status: string;
  publishedAt?: string;
  createdAt: string;
  updatedAt: string;
  readingTime?: number;
}

export interface BlogListResponse {
  items: BlogPost[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface BlogQueryParams {
  page?: number;
  limit?: number;
  search?: string;
  categoryId?: string;
  status?: string;
}

export interface CreateBlogDto {
  title: string;
  slug: string;
  excerpt?: string;
  content: string;
  coverImage?: string;
  categoryId?: string;
  tags?: string;
}

export interface UpdateBlogDto {
  title?: string;
  slug?: string;
  excerpt?: string;
  content?: string;
  coverImage?: string;
  categoryId?: string;
  tags?: string;
  status?: string;
}

class BlogService {
  private readonly baseUrl = '/blog';

  // 获取公开文章列表
  async getPublishedBlogs(params?: BlogQueryParams): Promise<BlogListResponse> {
    const response = await apiClient.get(this.baseUrl, { params });
    return response.data;
  }

  // 获取热门文章
  async getPopularBlogs(limit: number = 5): Promise<BlogPost[]> {
    const response = await apiClient.get(`${this.baseUrl}/popular`, {
      params: { limit },
    });
    return response.data;
  }

  // 通过 slug 获取文章详情
  async getBlogBySlug(slug: string): Promise<BlogPost> {
    const response = await apiClient.get(`${this.baseUrl}/slug/${slug}`);
    return response.data;
  }

  // 获取相关文章
  async getRelatedBlogs(id: string, limit: number = 5): Promise<BlogPost[]> {
    const response = await apiClient.get(`${this.baseUrl}/${id}/related`, {
      params: { limit },
    });
    return response.data;
  }

  // 获取单篇文章（通过ID）
  async getBlogById(id: string): Promise<BlogPost> {
    const response = await apiClient.get(`${this.baseUrl}/${id}`);
    return response.data;
  }

  // ==================== 管理接口（需认证） ====================

  // 创建文章
  async createBlog(data: CreateBlogDto): Promise<BlogPost> {
    const response = await apiClient.post(this.baseUrl, data);
    return response.data;
  }

  // 获取所有文章（管理）
  async getAllBlogs(params?: BlogQueryParams): Promise<BlogListResponse> {
    const response = await apiClient.get(`${this.baseUrl}/admin/all`, { params });
    return response.data;
  }

  // 更新文章
  async updateBlog(id: string, data: UpdateBlogDto): Promise<BlogPost> {
    const response = await apiClient.put(`${this.baseUrl}/${id}`, data);
    return response.data;
  }

  // 删除文章
  async deleteBlog(id: string): Promise<{ success: boolean; message: string }> {
    const response = await apiClient.delete(`${this.baseUrl}/${id}`);
    return response.data;
  }
}

export const blogService = new BlogService();



