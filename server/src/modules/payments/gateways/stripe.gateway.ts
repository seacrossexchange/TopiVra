/**
 * Stripe 支付通道实现
 * 国际信用卡支付
 */
import {
  BasePaymentGateway,
  CreatePaymentParams,
  PaymentResult,
  NotifyVerifyResult,
  QueryOrderResult,
  RefundParams,
  RefundResult,
} from './base.gateway';
import Stripe from 'stripe';

export class StripeGateway extends BasePaymentGateway {
  private stripe: Stripe | null = null;

  constructor(config: any) {
    super('STRIPE', config);
    this.stripe = this.createStripeClient();
  }

  /**
   * 创建 Stripe 客户端
   */
  private createStripeClient(): Stripe | null {
    const { secretKey } = this.config;

    if (!secretKey) {
      this.logger.warn('Stripe 配置不完整，将返回模拟数据');
      return null;
    }

    return new Stripe(secretKey, {
      apiVersion: '2026-02-25.clover' as any,
    });
  }

  /**
   * 创建支付订单
   */
  async createPayment(params: CreatePaymentParams): Promise<PaymentResult> {
    const { secretKey } = this.config;

    if (!secretKey || !this.stripe) {
      this.logger.warn('Stripe 未配置，返回模拟数据');
      return {
        paymentNo: `STRIPE_MOCK_${Date.now()}`,
        payUrl: `https://checkout.stripe.com/pay/${params.orderId}`,
        rawData: { mock: true, orderId: params.orderId },
      };
    }

    try {
      // 创建 Checkout Session
      const session = await this.stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: [
          {
            price_data: {
              currency: (params.currency || 'USD').toLowerCase(),
              product_data: {
                name: params.subject,
                description: `订单: ${params.orderId}`,
              },
              unit_amount: Math.round(params.amount * 100), // 转为分
            },
            quantity: 1,
          },
        ],
        mode: 'payment',
        success_url: `${params.returnUrl}?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: params.returnUrl,
        client_reference_id: params.orderId,
        metadata: {
          order_id: params.orderId,
        },
      });

      this.logger.log(
        `创建 Stripe 订单: ${session.id}, 订单ID: ${params.orderId}`,
      );

      return {
        paymentNo: session.id,
        payUrl: session.url || undefined,
        rawData: session,
      };
    } catch (error: any) {
      this.logger.error(`Stripe 创建订单失败: ${error.message}`);
      throw new Error(`Stripe 创建订单失败: ${error.message}`);
    }
  }

  /**
   * 验证回调签名（Stripe 使用 Webhook）
   */
  async verifyNotify(data: any): Promise<NotifyVerifyResult> {
    try {
      const { secretKey } = this.config;

      if (!secretKey || !this.stripe) {
        // 模拟模式
        if (data.mock) {
          return {
            verified: true,
            orderId: data.client_reference_id || data.orderId,
            paymentNo: data.id || data.paymentNo,
            amount: parseFloat(data.amount || '0'),
            status: 'SUCCESS',
            rawData: data,
          };
        }
        return {
          verified: false,
          error: 'Stripe 未配置',
        };
      }

      // 处理 Stripe Webhook 事件
      const eventType = data.type;

      // 处理支付成功事件
      if (eventType === 'checkout.session.completed') {
        const session = data.data?.object;

        return {
          verified: true,
          orderId: session?.client_reference_id,
          paymentNo: session?.id,
          amount: (session?.amount_total || 0) / 100,
          status: 'SUCCESS',
          rawData: data,
        };
      }

      // 处理支付意图成功事件
      if (eventType === 'payment_intent.succeeded') {
        const paymentIntent = data.data?.object;

        return {
          verified: true,
          orderId: paymentIntent?.metadata?.order_id,
          paymentNo: paymentIntent?.id,
          amount: (paymentIntent?.amount || 0) / 100,
          status: 'SUCCESS',
          rawData: data,
        };
      }

      return {
        verified: false,
        error: `不处理的事件类型: ${eventType}`,
        rawData: data,
      };
    } catch (error: any) {
      this.logger.error(`Stripe 回调验证异常: ${error.message}`, error.stack);
      return {
        verified: false,
        error: error.message,
      };
    }
  }

  /**
   * 验证 Webhook 签名
   */
  verifyWebhookSignature(payload: string | Buffer, signature: string): any {
    const { webhookSecret } = this.config;

    if (!webhookSecret || !this.stripe) {
      this.logger.warn('Stripe Webhook Secret 未配置');
      return null;
    }

    try {
      const event = this.stripe.webhooks.constructEvent(
        payload,
        signature,
        webhookSecret,
      );
      return event;
    } catch (error: any) {
      this.logger.error(`Stripe Webhook 签名验证失败: ${error.message}`);
      return null;
    }
  }

  /**
   * 查询订单状态
   */
  async queryOrder(paymentNo: string): Promise<QueryOrderResult> {
    const { secretKey } = this.config;

    if (!secretKey || !this.stripe) {
      return {
        exists: false,
        status: 'UNKNOWN',
      };
    }

    try {
      const session = await this.stripe.checkout.sessions.retrieve(paymentNo);

      const status = session.payment_status;
      let paymentStatus = 'PENDING';

      if (status === 'paid') {
        paymentStatus = 'SUCCESS';
      } else if (status === 'unpaid') {
        paymentStatus = 'PENDING';
      } else {
        paymentStatus = 'FAILED';
      }

      return {
        exists: true,
        status: paymentStatus,
        amount: (session.amount_total || 0) / 100,
        paidAt: session.payment_status === 'paid' ? new Date() : undefined,
        rawData: session,
      };
    } catch (error: any) {
      this.logger.error(`Stripe 订单查询失败: ${error.message}`);
      return {
        exists: false,
        status: 'ERROR',
        rawData: { error: error.message },
      };
    }
  }

  /**
   * 发起退款
   */
  async refund(params: RefundParams): Promise<RefundResult> {
    const { secretKey } = this.config;

    if (!secretKey || !this.stripe) {
      return {
        success: false,
        message: 'Stripe 未配置',
      };
    }

    try {
      // 先获取 session 信息
      const session = await this.stripe.checkout.sessions.retrieve(
        params.paymentNo,
      );
      const paymentIntentId = session.payment_intent as string;

      if (!paymentIntentId) {
        return {
          success: false,
          message: '无法找到支付意图',
        };
      }

      // 创建退款
      const refund = await this.stripe.refunds.create({
        payment_intent: paymentIntentId,
        amount: Math.round(params.amount * 100), // 转为分
        reason: 'requested_by_customer',
        metadata: {
          reason: params.reason || '用户申请退款',
        },
      });

      return {
        success: true,
        refundNo: refund.id,
        message: '退款成功',
      };
    } catch (error: any) {
      this.logger.error(`Stripe 退款失败: ${error.message}`);
      return {
        success: false,
        message: error.message,
      };
    }
  }

  /**
   * 生成签名（Stripe 不需要手动签名）
   */
  protected generateSign(_data: any): string {
    return '';
  }

  /**
   * 将金额转换为最小货币单位（分）
   * 某些货币（如日元）没有小数位，不需要转换
   */
  convertToCents(amount: number, currency: string): number {
    const noDecimalCurrencies = ['JPY', 'VND', 'KRW'];

    if (noDecimalCurrencies.includes(currency.toUpperCase())) {
      return Math.round(amount);
    }

    return Math.round(amount * 100);
  }
}
