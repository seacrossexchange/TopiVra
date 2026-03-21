import apiClient from './apiClient';

export interface Blog {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  coverImage?: string;
  status: 'DRAFT' | 'PENDING_REVIEW' | 'PUBLISHED' | 'REJECTED' | 'ARCHIVED';
  authorId: string;
  author?: {
    id: string;
    username: string;
    email: string;
    role: string;
  };
  categoryId?: string;
  category?: {
    id: string;
    name: string;
  };
  tags?: string[];
  viewCount: number;
  likeCount: number;
  publishedAt?: string;
  submittedAt?: string;
  reviewedAt?: string;
  reviewedById?: string;
  reviewedBy?: {
    id: string;
    username: string;
  };
  reviewNotes?: string;
  rejectReason?: string;
  createdAt: string;
  updatedAt: string;
}

export interface BlogListParams {
  page?: number;
  limit?: number;
  status?: string;
  authorId?: string;
  categoryId?: string;
  search?: string;
}

export interface BlogListResponse {
  data: Blog[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface CreateBlogDto {
  title: string;
  excerpt: string;
  content: string;
  coverImage?: string;
  categoryId?: string;
  tags?: string[];
  metaTitle?: string;
  metaDescription?: string;
}

export interface UpdateBlogDto extends Partial<CreateBlogDto> {
  status?: 'DRAFT' | 'PENDING' | 'PUBLISHED' | 'REJECTED' | 'ARCHIVED';
}

export interface ApproveBlogDto {
  reviewNotes?: string;
}

export interface RejectBlogDto {
  reason: string;
}

// 获取博客列表
export const getBlogs = async (params: BlogListParams = {}): Promise<BlogListResponse> => {
  const response = await apiClient.get('/blog', { params });
  return response.data;
};

// 获取单个博客
export const getBlog = async (id: string): Promise<Blog> => {
  const response = await apiClient.get(`/blog/${id}`);
  return response.data;
};

// 创建博客
export const createBlog = async (data: CreateBlogDto): Promise<Blog> => {
  const response = await apiClient.post('/blog', data);
  return response.data;
};

// 更新博客
export const updateBlog = async (id: string, data: UpdateBlogDto): Promise<Blog> => {
  const response = await apiClient.put(`/blog/${id}`, data);
  return response.data;
};

// 删除博客
export const deleteBlog = async (id: string): Promise<void> => {
  await apiClient.delete(`/blog/${id}`);
};

// 提交审核
export const submitBlogForReview = async (id: string): Promise<Blog> => {
  const response = await apiClient.post(`/blog/${id}/submit`);
  return response.data;
};

// === 管理员 API ===

// 获取待审核博客列表
export const getPendingBlogs = async (params: BlogListParams = {}): Promise<BlogListResponse> => {
  const response = await apiClient.get('/blog/admin/pending', { params });
  return response.data;
};

// 通过审核
export const approveBlog = async (id: string, data?: ApproveBlogDto): Promise<Blog> => {
  const response = await apiClient.post(`/blog/${id}/approve`, data);
  return response.data;
};

// 驳回博客
export const rejectBlog = async (id: string, data: RejectBlogDto): Promise<Blog> => {
  const response = await apiClient.post(`/blog/${id}/reject`, data);
  return response.data;
};

// === 卖家 API ===

// 获取卖家自己的博客列表
export const getMyBlogs = async (params: BlogListParams = {}): Promise<BlogListResponse> => {
  const response = await apiClient.get('/blog/seller/my', { params });
  return response.data;
};

// 获取博客统计
export const getBlogStats = async (): Promise<{
  total: number;
  draft: number;
  pending: number;
  published: number;
  rejected: number;
}> => {
  const response = await apiClient.get('/blog/stats');
  return response.data;
};