import apiClient from './apiClient';

export interface Order {
  id: string;
  orderNo: string;
  userId: string;
  status: 'pending' | 'paid' | 'processing' | 'completed' | 'cancelled' | 'refunded' | 'refund_pending';
  totalAmount: number;
  items: OrderItem[];
  paymentMethod?: string;
  paymentStatus?: string;
  createdAt: string;
  updatedAt: string;
}

export interface RefundRequest {
  id: string;
  orderId: string;
  orderNo: string;
  amount: number;
  reason: string;
  description?: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
  processedAt?: string;
  adminNote?: string;
}

export interface ApplyRefundDto {
  reason: string;
  description?: string;
}

export interface OrderItem {
  id: string;
  productId: string;
  product: {
    id: string;
    title: string;
    images: string[];
    price: number;
  };
  quantity: number;
  price: number;
}

export interface CreateOrderDto {
  items: { productId: string; quantity: number }[];
  paymentMethod?: string;
}

export interface OrderListResponse {
  items: Order[];
  total: number;
  page: number;
  pageSize: number;
}

export interface OrderFilters {
  status?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  pageSize?: number;
}

export const ordersService = {
  // 获取订单列表
  getOrders: async (filters?: OrderFilters, signal?: AbortSignal) => {
    const params = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== '') {
          params.append(key, String(value));
        }
      });
    }
    const response = await apiClient.get<OrderListResponse>(
      `/orders?${params.toString()}`,
      { signal }
    );
    return response;
  },

  // 获取订单详情
  getOrderById: async (id: string, signal?: AbortSignal) => {
    const response = await apiClient.get<Order>(`/orders/${id}`, { signal });
    return response;
  },

  // 创建订单
  createOrder: async (data: CreateOrderDto) => {
    const response = await apiClient.post<Order>('/orders', data);
    return response;
  },

  // 取消订单
  cancelOrder: async (id: string) => {
    const response = await apiClient.post<Order>(`/orders/${id}/cancel`);
    return response;
  },

  // 确认收货
  confirmOrder: async (id: string) => {
    const response = await apiClient.post<Order>(`/orders/${id}/confirm`);
    return response;
  },

  // 获取订单统计
  getOrderStats: async (signal?: AbortSignal) => {
    const response = await apiClient.get<{
      pending: number;
      processing: number;
      completed: number;
      cancelled: number;
    }>('/orders/stats', { signal });
    return response;
  },

  // 申请退款
  applyRefund: async (orderId: string, data: ApplyRefundDto) => {
    const response = await apiClient.post<RefundRequest>(`/orders/${orderId}/refund`, data);
    return response;
  },

  // 获取退款详情
  getRefundDetail: async (orderId: string, signal?: AbortSignal) => {
    const response = await apiClient.get<RefundRequest>(
      `/orders/${orderId}/refund`,
      { signal }
    );
    return response;
  },

  // 获取退款列表 (Admin)
  getRefundList: async (
    filters?: { status?: string; page?: number; pageSize?: number },
    signal?: AbortSignal
  ) => {
    const params = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== '') {
          params.append(key, String(value));
        }
      });
    }
    const response = await apiClient.get<{ items: RefundRequest[]; total: number }>(
      `/admin/refunds?${params.toString()}`,
      { signal }
    );
    return response;
  },

  // 审核退款 (Admin)
  reviewRefund: async (refundId: string, data: { approved: boolean; adminNote?: string }) => {
    const response = await apiClient.put<RefundRequest>(
      `/admin/refunds/${refundId}/review`,
      data
    );
    return response;
  },
};

export default ordersService;
