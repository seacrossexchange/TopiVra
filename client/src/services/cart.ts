import apiClient from './apiClient';

export interface CartItem {
  id: string;
  productId: string;
  quantity: number;
  product?: {
    id: string;
    title: string;
    price: number;
    stock: number;
    images: string[];
    category?: {
      id: string;
      name: string;
    };
  };
}

export interface CartResponse {
  id: string;
  userId: string;
  items: CartItem[];
  createdAt: string;
  updatedAt: string;
}

export const cartService = {
  // 获取购物车
  getCart: async () => {
    const response = await apiClient.get<CartResponse>('/cart');
    return response;
  },

  // 添加商品到购物车
  addToCart: async (productId: string, quantity: number = 1) => {
    const response = await apiClient.post<CartResponse>('/cart/items', {
      productId,
      quantity,
    });
    return response;
  },

  // 更新购物车商品数量
  updateCartItem: async (itemId: string, quantity: number) => {
    const response = await apiClient.put<CartResponse>(`/cart/items/${itemId}`, {
      quantity,
    });
    return response;
  },

  // 移除购物车商品
  removeFromCart: async (itemId: string) => {
    const response = await apiClient.delete(`/cart/items/${itemId}`);
    return response;
  },

  // 清空购物车
  clearCart: async () => {
    const response = await apiClient.delete('/cart/items');
    return response;
  },
};

export default cartService;