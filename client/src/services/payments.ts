import apiClient from './apiClient';

export interface CreatePaymentDto {
  orderId: string;
  method: 'USDT' | 'STRIPE' | 'PAYPAL' | 'BALANCE';
}

export interface VerifyUsdtPaymentDto {
  paymentNo: string;
  txHash: string;
}

export interface Payment {
  id: string;
  paymentNo: string;
  orderId: string;
  method: string;
  amount: number;
  status: string;
  createdAt: string;
}

class PaymentsService {
  /**
   * 创建支付
   */
  async createPayment(dto: CreatePaymentDto) {
    return apiClient.post<Payment>('/payments/create', dto);
  }

  /**
   * 验证 USDT 支付
   */
  async verifyUsdtPayment(dto: VerifyUsdtPaymentDto) {
    return apiClient.post('/payments/usdt/verify', dto);
  }

  /**
   * 查询支付状态
   */
  async getPaymentStatus(paymentNo: string) {
    return apiClient.get(`/payments/${paymentNo}/status`);
  }
}

export const paymentsService = new PaymentsService();
export default paymentsService;
