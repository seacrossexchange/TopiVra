import { create } from 'zustand';
import { message } from 'antd';
import { cartService, type CartItem } from '@/services/cart';

interface CartState {
  items: CartItem[];
  itemCount: number;
  isLoading: boolean;
  error: string | null;
  // Actions
  fetchCart: () => Promise<void>;
  addToCart: (productId: string, quantity?: number) => Promise<void>;
  updateQuantity: (itemId: string, quantity: number) => Promise<void>;
  removeItem: (itemId: string) => Promise<void>;
  clearCart: () => Promise<void>;
  setItems: (items: CartItem[]) => void;
}

export const useCartStore = create<CartState>((set, get) => ({
  items: [],
  itemCount: 0,
  isLoading: false,
  error: null,

  fetchCart: async () => {
    set({ isLoading: true, error: null });
    try {
      const response = await cartService.getCart();
      const items = response.data?.items || [];
      const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);
      set({ items, itemCount, isLoading: false });
    } catch {
      set({ items: [], itemCount: 0, isLoading: false, error: 'Failed to fetch cart' });
    }
  },

  addToCart: async (productId: string, quantity: number = 1) => {
    set({ isLoading: true, error: null });
    try {
      await cartService.addToCart(productId, quantity);
      // Refresh cart after adding
      const response = await cartService.getCart();
      const items = response.data?.items || [];
      const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);
      set({ items, itemCount, isLoading: false });
    } catch {
      set({ isLoading: false, error: 'Failed to add to cart' });
      message.error('加入购物车失败，请稍后重试');
      throw new Error('Failed to add to cart');
    }
  },

  updateQuantity: async (itemId: string, quantity: number) => {
    const previousItems = get().items;
    // Optimistic update
    const optimisticItems = previousItems.map((item) =>
      item.id === itemId ? { ...item, quantity } : item
    );
    const optimisticCount = optimisticItems.reduce((sum, item) => sum + item.quantity, 0);
    set({ items: optimisticItems, itemCount: optimisticCount });

    try {
      await cartService.updateCartItem(itemId, quantity);
    } catch {
      // 回滚并显示错误提示
      const prevCount = previousItems.reduce((sum, item) => sum + item.quantity, 0);
      set({ items: previousItems, itemCount: prevCount, error: 'Failed to update quantity' });
      message.error('更新数量失败，已恢复原始数量');
    }
  },

  removeItem: async (itemId: string) => {
    const previousItems = get().items;
    // Optimistic update
    const optimisticItems = previousItems.filter((item) => item.id !== itemId);
    const optimisticCount = optimisticItems.reduce((sum, item) => sum + item.quantity, 0);
    set({ items: optimisticItems, itemCount: optimisticCount });

    try {
      await cartService.removeFromCart(itemId);
    } catch {
      // 回滚并显示错误提示
      const prevCount = previousItems.reduce((sum, item) => sum + item.quantity, 0);
      set({ items: previousItems, itemCount: prevCount, error: 'Failed to remove item' });
      message.error('删除商品失败，请稍后重试');
    }
  },

  clearCart: async () => {
    try {
      await cartService.clearCart();
      set({ items: [], itemCount: 0 });
    } catch {
      set({ error: 'Failed to clear cart' });
      message.error('清空购物车失败，请稍后重试');
    }
  },

  setItems: (items: CartItem[]) => {
    const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);
    set({ items, itemCount });
  },
}));
