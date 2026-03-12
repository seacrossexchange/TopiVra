import apiClient from './apiClient';

export interface Product {
  id: string;
  title: string;
  description: string;
  price: number;
  stock: number;
  images: string[];
  thumbnailUrl?: string;
  platform?: string;
  categoryId: string;
  category?: {
    id: string;
    name: string;
  };
  sellerId: string;
  seller?: {
    id: string;
    username: string;
  };
  status: 'DRAFT' | 'PENDING' | 'APPROVED' | 'REJECTED' | 'ON_SALE' | 'OFF_SALE';
  sales: number;
  rating: number;
  createdAt: string;
  updatedAt: string;
}

export interface ProductListResponse {
  items: Product[];
  total: number;
  page: number;
  limit: number;
}

export interface ProductFilters {
  categoryId?: string;
  platform?: string;
  region?: string;
  minPrice?: number;
  maxPrice?: number;
  search?: string;
  sortBy?: 'price' | 'soldCount' | 'createdAt' | 'viewCount';
  sortOrder?: 'asc' | 'desc';
  page?: number;
  limit?: number;
  sellerId?: string;
}

export const productsService = {
  // 获取商品列表
  getProducts: async (filters?: ProductFilters, signal?: AbortSignal) => {
    const params = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== '') {
          params.append(key, String(value));
        }
      });
    }
    const response = await apiClient.get<ProductListResponse>(
      `/products?${params.toString()}`,
      { signal }
    );
    return response;
  },

  // 获取商品详情
  getProductById: async (id: string, signal?: AbortSignal) => {
    const response = await apiClient.get<Product>(`/products/${id}`, { signal });
    return response;
  },

  // 获取商品分类
  getCategories: async (signal?: AbortSignal) => {
    const response = await apiClient.get<{ id: string; name: string; count: number }[]>(
      '/categories',
      { signal }
    );
    return response;
  },

  // 搜索商品
  searchProducts: async (
    keyword: string,
    page: number = 1,
    pageSize: number = 20,
    signal?: AbortSignal
  ) => {
    const response = await apiClient.get<ProductListResponse>(
      `/search?q=${encodeURIComponent(keyword)}&page=${page}&pageSize=${pageSize}`,
      { signal }
    );
    return response;
  },

  // 获取推荐商品
  getRecommendedProducts: async (limit: number = 10, signal?: AbortSignal) => {
    const response = await apiClient.get<Product[]>(
      `/products/recommended?limit=${limit}`,
      { signal }
    );
    return response;
  },

  // 获取热门商品
  getHotProducts: async (limit: number = 10, signal?: AbortSignal) => {
    const response = await apiClient.get<Product[]>(
      `/products/hot?limit=${limit}`,
      { signal }
    );
    return response;
  },
};

export default productsService;
