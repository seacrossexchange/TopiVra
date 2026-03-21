import apiClient from './apiClient';

// 商品类型
export const ProductType = {
  ACCOUNT: 'ACCOUNT',
  SOFTWARE: 'SOFTWARE',
  DIGITAL: 'DIGITAL',
} as const;
export type ProductType = typeof ProductType[keyof typeof ProductType];

// 交付方式
export const DeliveryType = {
  FILE: 'FILE',
  LINK: 'LINK',
  KEY: 'KEY',
  HYBRID: 'HYBRID',
} as const;
export type DeliveryType = typeof DeliveryType[keyof typeof DeliveryType];

// 国家模式
export const CountryMode = {
  NONE: 'NONE',
  SINGLE: 'SINGLE',
  MULTI: 'MULTI',
} as const;
export type CountryMode = typeof CountryMode[keyof typeof CountryMode];

export interface Product {
  id: string;
  title: string;
  description: string;
  price: number;
  originalPrice?: number;
  stock: number;
  images: string[];
  thumbnailUrl?: string;
  platform?: string;
  accountType?: string;
  region?: string;
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
  
  // 新增商品类型与交付字段
  productType?: ProductType;
  deliveryType?: DeliveryType;
  countryMode?: CountryMode;
  countries?: string[];
  
  // 软件商品专属字段
  supportedSystems?: string[];
  fileType?: string;
  version?: string;
  fileSize?: number;
  downloadUrl?: string;
  installGuide?: string;
  updateNote?: string;
  
  // 账号商品专属字段
  followerRange?: string;
  loginMethod?: string;
  warrantyInfo?: string;
  
  // 标签和属性
  tags?: string[];
  attributes?: Record<string, any>;
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
