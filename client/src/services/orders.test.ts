import { describe, it, expect, vi, beforeEach } from 'vitest';
import apiClient from './apiClient';
import { ordersService } from './orders';

vi.mock('./apiClient', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
  },
}));

const mockedApiClient = apiClient as unknown as {
  get: ReturnType<typeof vi.fn>;
  post: ReturnType<typeof vi.fn>;
  put: ReturnType<typeof vi.fn>;
};

describe('ordersService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('getOrders 应该拼接查询参数并调用 /orders', async () => {
    mockedApiClient.get.mockResolvedValue({ data: { items: [], total: 0 } } as any);

    await ordersService.getOrders({ status: 'PAID', page: 2, pageSize: 20 });

    expect(mockedApiClient.get).toHaveBeenCalled();
    const [url] = mockedApiClient.get.mock.calls[0];
    expect(url as string).toContain('/orders?');
    expect(url as string).toContain('status=PAID');
    expect(url as string).toContain('page=2');
  });

  it('getOrderById 应该调用 /orders/:id', async () => {
    mockedApiClient.get.mockResolvedValue({ data: { id: 'order-1' } } as any);

    await ordersService.getOrderById('order-1');

    expect(mockedApiClient.get).toHaveBeenCalledWith(
      '/orders/order-1',
      expect.any(Object),
    );
  });

  it('createOrder 应该 POST 到 /orders', async () => {
    const dto = { items: [{ productId: 'p1', quantity: 2 }] };
    mockedApiClient.post.mockResolvedValue({ data: { id: 'order-1' } } as any);

    await ordersService.createOrder(dto);

    expect(mockedApiClient.post).toHaveBeenCalledWith('/orders', dto);
  });

  it('cancelOrder 应该 POST 到 /orders/:id/cancel', async () => {
    mockedApiClient.post.mockResolvedValue({ data: {} } as any);

    await ordersService.cancelOrder('order-1');

    expect(mockedApiClient.post).toHaveBeenCalledWith('/orders/order-1/cancel');
  });

  it('confirmOrder 应该 POST 到 /orders/:id/confirm', async () => {
    mockedApiClient.post.mockResolvedValue({ data: {} } as any);

    await ordersService.confirmOrder('order-1');

    expect(mockedApiClient.post).toHaveBeenCalledWith('/orders/order-1/confirm');
  });
});











