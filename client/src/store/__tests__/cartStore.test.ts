import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { act } from '@testing-library/react';

// ─── Mock 外部依赖 ─────────────────────────────────────────────
vi.mock('@/services/cart', () => ({
  cartService: {
    getCart: vi.fn(),
    addToCart: vi.fn(),
    updateCartItem: vi.fn(),
    removeFromCart: vi.fn(),
    clearCart: vi.fn(),
  },
}));

import { useCartStore } from '../cartStore';
import { cartService } from '@/services/cart';

// ─── 测试数据 ──────────────────────────────────────────────────
const mockItem = (id: string, quantity = 1) => ({
  id,
  productId: `product-${id}`,
  quantity,
  unitPrice: 100,
  product: { id: `product-${id}`, title: `商品${id}`, price: 100 },
});

const mockCartResponse = (items: ReturnType<typeof mockItem>[]) => ({
  data: { items },
});

// ─── 重置 store ────────────────────────────────────────────────
const resetStore = () =>
  useCartStore.setState({ items: [], itemCount: 0, isLoading: false, error: null });

// ──────────────────────────────────────────────────────────────
describe('useCartStore', () => {
  beforeEach(() => {
    resetStore();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  // ── 初始状态 ────────────────────────────────────────────────
  describe('初始状态', () => {
    it('应该具备正确的初始值', () => {
      const state = useCartStore.getState();
      expect(state.items).toEqual([]);
      expect(state.itemCount).toBe(0);
      expect(state.isLoading).toBe(false);
      expect(state.error).toBeNull();
    });
  });

  // ── fetchCart ───────────────────────────────────────────────
  describe('fetchCart', () => {
    it('成功获取购物车 → 应更新 items 和 itemCount', async () => {
      const items = [mockItem('a', 2), mockItem('b', 3)];
      vi.mocked(cartService.getCart).mockResolvedValueOnce(mockCartResponse(items) as any);

      await act(async () => {
        await useCartStore.getState().fetchCart();
      });

      const state = useCartStore.getState();
      expect(state.items).toHaveLength(2);
      expect(state.itemCount).toBe(5); // 2 + 3
      expect(state.isLoading).toBe(false);
      expect(state.error).toBeNull();
    });

    it('API 返回空数组 → items 应为空', async () => {
      vi.mocked(cartService.getCart).mockResolvedValueOnce(mockCartResponse([]) as any);

      await act(async () => {
        await useCartStore.getState().fetchCart();
      });

      expect(useCartStore.getState().items).toEqual([]);
      expect(useCartStore.getState().itemCount).toBe(0);
    });

    it('API 失败 → 应设置 error 并清空 items', async () => {
      vi.mocked(cartService.getCart).mockRejectedValueOnce(new Error('Network Error'));

      await act(async () => {
        await useCartStore.getState().fetchCart();
      });

      const state = useCartStore.getState();
      expect(state.items).toEqual([]);
      expect(state.error).toBeTruthy();
      expect(state.isLoading).toBe(false);
    });
  });

  // ── addToCart ───────────────────────────────────────────────
  describe('addToCart', () => {
    it('成功添加商品 → 应刷新购物车', async () => {
      const items = [mockItem('p1', 1)];
      vi.mocked(cartService.addToCart).mockResolvedValueOnce(undefined as any);
      vi.mocked(cartService.getCart).mockResolvedValueOnce(mockCartResponse(items) as any);

      await act(async () => {
        await useCartStore.getState().addToCart('product-p1', 1);
      });

      expect(useCartStore.getState().items).toHaveLength(1);
      expect(useCartStore.getState().itemCount).toBe(1);
      expect(useCartStore.getState().isLoading).toBe(false);
    });

    it('添加失败 → 应抛出错误并设置 error', async () => {
      vi.mocked(cartService.addToCart).mockRejectedValueOnce(new Error('Out of stock'));

      await expect(
        act(async () => {
          await useCartStore.getState().addToCart('product-x');
        }),
      ).rejects.toThrow();

      expect(useCartStore.getState().error).toBeTruthy();
    });
  });

  // ── updateQuantity（乐观更新）──────────────────────────────
  describe('updateQuantity', () => {
    it('应立即（乐观）更新数量', async () => {
      const items = [mockItem('i1', 2)];
      useCartStore.setState({ items: items as any, itemCount: 2 });
      vi.mocked(cartService.updateCartItem).mockResolvedValueOnce(undefined as any);

      act(() => {
        useCartStore.getState().updateQuantity('i1', 5);
      });

      // 乐观更新应立即生效
      expect(useCartStore.getState().itemCount).toBe(5);
      expect(useCartStore.getState().items[0].quantity).toBe(5);
    });

    it('API 失败 → 应回滚到原始数量', async () => {
      const items = [mockItem('i1', 2)];
      useCartStore.setState({ items: items as any, itemCount: 2 });
      vi.mocked(cartService.updateCartItem).mockRejectedValueOnce(new Error('Failed'));

      await act(async () => {
        await useCartStore.getState().updateQuantity('i1', 10);
      });

      expect(useCartStore.getState().items[0].quantity).toBe(2);
      expect(useCartStore.getState().itemCount).toBe(2);
      expect(useCartStore.getState().error).toBeTruthy();
    });
  });

  // ── removeItem（乐观更新）─────────────────────────────────
  describe('removeItem', () => {
    it('应立即（乐观）移除商品', async () => {
      const items = [mockItem('i1', 1), mockItem('i2', 2)];
      useCartStore.setState({ items: items as any, itemCount: 3 });
      vi.mocked(cartService.removeFromCart).mockResolvedValueOnce(undefined as any);

      act(() => {
        useCartStore.getState().removeItem('i1');
      });

      expect(useCartStore.getState().items).toHaveLength(1);
      expect(useCartStore.getState().itemCount).toBe(2);
    });

    it('API 失败 → 应回滚已删除的商品', async () => {
      const items = [mockItem('i1', 1), mockItem('i2', 2)];
      useCartStore.setState({ items: items as any, itemCount: 3 });
      vi.mocked(cartService.removeFromCart).mockRejectedValueOnce(new Error('Failed'));

      await act(async () => {
        await useCartStore.getState().removeItem('i1');
      });

      expect(useCartStore.getState().items).toHaveLength(2);
      expect(useCartStore.getState().itemCount).toBe(3);
      expect(useCartStore.getState().error).toBeTruthy();
    });
  });

  // ── clearCart ───────────────────────────────────────────────
  describe('clearCart', () => {
    it('成功清空 → items 和 itemCount 应归零', async () => {
      useCartStore.setState({ items: [mockItem('i1', 3)] as any, itemCount: 3 });
      vi.mocked(cartService.clearCart).mockResolvedValueOnce(undefined as any);

      await act(async () => {
        await useCartStore.getState().clearCart();
      });

      expect(useCartStore.getState().items).toEqual([]);
      expect(useCartStore.getState().itemCount).toBe(0);
    });

    it('API 失败 → 应设置 error', async () => {
      vi.mocked(cartService.clearCart).mockRejectedValueOnce(new Error('Failed'));

      await act(async () => {
        await useCartStore.getState().clearCart();
      });

      expect(useCartStore.getState().error).toBeTruthy();
    });
  });

  // ── setItems ────────────────────────────────────────────────
  describe('setItems', () => {
    it('应同步更新 items 并重新计算 itemCount', () => {
      const items = [mockItem('a', 4), mockItem('b', 6)];
      useCartStore.getState().setItems(items as any);

      expect(useCartStore.getState().items).toHaveLength(2);
      expect(useCartStore.getState().itemCount).toBe(10); // 4 + 6
    });

    it('传入空数组 → itemCount 应为 0', () => {
      useCartStore.setState({ items: [mockItem('a', 5)] as any, itemCount: 5 });
      useCartStore.getState().setItems([]);

      expect(useCartStore.getState().itemCount).toBe(0);
    });
  });
});
