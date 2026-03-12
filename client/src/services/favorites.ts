import apiClient from './apiClient';
import type { Product } from './products';

export interface Favorite {
  id: string;
  productId: string;
  product: Product;
  createdAt: string;
}

export interface FavoriteListResponse {
  items: Favorite[];
  total: number;
  page: number;
  pageSize: number;
}

export const favoritesService = {
  // 获取收藏列表
  getFavorites: async (page: number = 1, pageSize: number = 20) => {
    const response = await apiClient.get<FavoriteListResponse>(`/favorites?page=${page}&pageSize=${pageSize}`);
    return response;
  },

  // 添加收藏
  addFavorite: async (productId: string) => {
    const response = await apiClient.post<Favorite>('/favorites', { productId });
    return response;
  },

  // 取消收藏
  removeFavorite: async (productId: string) => {
    await apiClient.delete(`/favorites/${productId}`);
  },

  // 检查是否已收藏
  checkFavorite: async (productId: string) => {
    const response = await apiClient.get<{ isFavorite: boolean }>(`/favorites/check/${productId}`);
    return response;
  },

  // 批量检查收藏状态
  checkFavorites: async (productIds: string[]) => {
    const response = await apiClient.post<Record<string, boolean>>('/favorites/check', { productIds });
    return response;
  },
};

export default favoritesService;