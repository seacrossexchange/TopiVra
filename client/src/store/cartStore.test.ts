import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useCartStore } from './cartStore';
import * as cartService from '@/services/cart';

vi.mock('@/services/cart');

describe('useCartStore', () => {
  beforeEach(() => {
    useCartStore.setState({
      items: [],
      itemCount: 0,
      isLoading: false,
      error: null,
    });
    vi.clearAllMocks();
  });

  it('初始状态正确', () => {
    const state = useCartStore.getState();
    expect(state.items).toEqual([]);
    expect(state.itemCount).toBe(0);
    expect(state.isLoading).toBe(false);
    expect(state.error).toBeNull();
  });

  it('fetchCart 成功加载购物车', async () => {
    const mockItems = [
      { id: '1', productId: 'p1', quantity: 2, price: 100 },
      { id: '2', productId: 'p2', quantity: 1, price: 50 },
    ];
    vi.mocked(cartService.cartService.getCart).mockResolvedValue({
      data: { items: mockItems },
    } as any);

    await useCartStore.getState().fetchCart();

    const state = useCartStore.getState();
    expect(state.items).toEqual(mockItems);
    expect(state.itemCount).toBe(3); // 2 + 1
    expect(state.isLoading).toBe(false);
  });

  it('fetchCart 失败时设置错误', async () => {
    vi.mocked(cartService.cartService.getCart).mockRejectedValue(
      new Error('Network error')
    );

    await useCartStore.getState().fetchCart();

    const state = useCartStore.getState();
    expect(state.items).toEqual([]);
    expect(state.error).toBe('Failed to fetch cart');
    expect(state.isLoading).toBe(false);
  });

  it('updateQuantity 乐观更新成功', async () => {
    useCartStore.setState({
      items: [
        { id: '1', productId: 'p1', quantity: 2, price: 100 },
      ],
      itemCount: 2,
    });

    vi.mocked(cartService.cartService.updateCartItem).mockResolvedValue({} as any);

    await useCartStore.getState().updateQuantity('1', 5);

    const state = useCartStore.getState();
    expect(state.items[0].quantity).toBe(5);
    expect(state.itemCount).toBe(5);
  });

  it('updateQuantity 失败时回滚', async () => {
    const originalItems = [
      { id: '1', productId: 'p1', quantity: 2, price: 100 },
    ];
    useCartStore.setState({
      items: originalItems,
      itemCount: 2,
    });

    vi.mocked(cartService.cartService.updateCartItem).mockRejectedValue(
      new Error('Update failed')
    );

    await useCartStore.getState().updateQuantity('1', 5);

    const state = useCartStore.getState();
    expect(state.items[0].quantity).toBe(2); // 回滚到原值
    expect(state.itemCount).toBe(2);
    expect(state.error).toBe('Failed to update quantity');
  });

  it('removeItem 乐观删除成功', async () => {
    useCartStore.setState({
      items: [
        { id: '1', productId: 'p1', quantity: 2, price: 100 },
        { id: '2', productId: 'p2', quantity: 1, price: 50 },
      ],
      itemCount: 3,
    });

    vi.mocked(cartService.cartService.removeFromCart).mockResolvedValue({} as any);

    await useCartStore.getState().removeItem('1');

    const state = useCartStore.getState();
    expect(state.items).toHaveLength(1);
    expect(state.items[0].id).toBe('2');
    expect(state.itemCount).toBe(1);
  });

  it('clearCart 清空购物车', async () => {
    useCartStore.setState({
      items: [{ id: '1', productId: 'p1', quantity: 2, price: 100 }],
      itemCount: 2,
    });

    vi.mocked(cartService.cartService.clearCart).mockResolvedValue({} as any);

    await useCartStore.getState().clearCart();

    const state = useCartStore.getState();
    expect(state.items).toEqual([]);
    expect(state.itemCount).toBe(0);
  });

  it('setItems 更新项目列表', () => {
    const items = [
      { id: '1', productId: 'p1', quantity: 3, price: 100 },
    ];

    useCartStore.getState().setItems(items);

    const state = useCartStore.getState();
    expect(state.items).toEqual(items);
    expect(state.itemCount).toBe(3);
  });
});












