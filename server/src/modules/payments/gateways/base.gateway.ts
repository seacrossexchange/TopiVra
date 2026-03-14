/**
 * 支付通道基础抽象类
 * 所有支付通道都需要实现这个接口
 */
import { Logger } from '@nestjs/common';

// 支付通道配置接口
export interface PaymentGatewayConfig {
  [key: string]: any;
}

// 创建支付参数
export interface CreatePaymentParams {
  orderId: string;
  amount: number;
  currency: string;
  subject: string;
  returnUrl: string;
  notifyUrl: string;
  buyerId?: string;
  extra?: Record<string, any>;
}

// 支付结果
export interface PaymentResult {
  paymentNo: string;
  payUrl?: string;
  qrCode?: string;
  formHtml?: string;
  rawData?: any;
}

// 回调验证结果
export interface NotifyVerifyResult {
  verified: boolean;
  orderId?: string;
  paymentNo?: string;
  amount?: number;
  status?: string;
  rawData?: any;
  error?: string;
}

// 查询订单结果
export interface QueryOrderResult {
  exists: boolean;
  status: string;
  amount?: number;
  paidAt?: Date;
  rawData?: any;
}

// 退款参数
export interface RefundParams {
  paymentNo: string;
  amount: number;
  reason?: string;
}

// 退款结果
export interface RefundResult {
  success: boolean;
  refundNo?: string;
  message?: string;
}

/**
 * 支付通道抽象基类
 */
export abstract class BasePaymentGateway {
  protected config: PaymentGatewayConfig;
  protected logger: Logger;
  protected code: string;

  constructor(code: string, config: PaymentGatewayConfig) {
    this.code = code;
    this.config = config;
    this.logger = new Logger(`${code}Gateway`);
  }

  /**
   * 创建支付订单
   */
  abstract createPayment(params: CreatePaymentParams): Promise<PaymentResult>;

  /**
   * 验证回调签名
   */
  abstract verifyNotify(data: any): Promise<NotifyVerifyResult>;

  /**
   * 查询订单状态
   */
  abstract queryOrder(paymentNo: string): Promise<QueryOrderResult>;

  /**
   * 发起退款
   */
  async refund(_params: RefundParams): Promise<RefundResult> {
    this.logger.warn(`退款功能未实现: ${this.code}`);
    return {
      success: false,
      message: '该支付通道不支持退款',
    };
  }

  /**
   * 生成签名（子类实现）
   */
  protected abstract generateSign(data: any): string;

  /**
   * 获取通道代码
   */
  getCode(): string {
    return this.code;
  }

  /**
   * 获取通道配置
   */
  getConfig(): PaymentGatewayConfig {
    return this.config;
  }

  /**
   * 检查通道是否可用
   */
  isEnabled(): boolean {
    return this.config.enabled === true;
  }

  /**
   * 生成随机字符串
   */
  protected generateNonceStr(length: number = 32): string {
    const chars =
      'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  /**
   * 格式化金额（保留两位小数）
   */
  protected formatAmount(amount: number): string {
    return amount.toFixed(2);
  }
}
