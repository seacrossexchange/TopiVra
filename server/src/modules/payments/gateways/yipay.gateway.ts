/**
 * 易支付通道实现
 * 支持聚合多种支付方式（支付宝、微信等）
 */
import {
  BasePaymentGateway,
  CreatePaymentParams,
  PaymentResult,
  NotifyVerifyResult,
  QueryOrderResult,
} from './base.gateway';
import * as crypto from 'crypto';

export class YipayGateway extends BasePaymentGateway {
  constructor(config: any) {
    super('YIPAY', config);
  }

  /**
   * 创建支付订单
   */
  async createPayment(params: CreatePaymentParams): Promise<PaymentResult> {
    const { apiUrl, mchId, apiKey, payType = 'alipay' } = this.config;

    if (!apiUrl || !mchId || !apiKey) {
      throw new Error('易支付配置不完整');
    }

    // 构建请求参数
    const data: Record<string, any> = {
      pid: mchId,
      type: payType, // alipay, wxpay, qqpay 等
      out_trade_no: params.orderId,
      notify_url: params.notifyUrl,
      return_url: params.returnUrl,
      name: params.subject,
      money: this.formatAmount(params.amount),
      sign_type: 'MD5',
    };

    // 生成签名
    data['sign'] = this.generateSign(data);

    // 构建跳转URL
    const queryString = Object.keys(data)
      .map((key) => `${key}=${encodeURIComponent(data[key])}`)
      .join('&');

    const payUrl = `${apiUrl}/submit.php?${queryString}`;

    this.logger.log(
      `创建易支付订单: ${params.orderId}, 金额: ${params.amount}`,
    );

    return {
      paymentNo: params.orderId,
      payUrl,
      rawData: data,
    };
  }

  /**
   * 验证回调签名
   */
  async verifyNotify(data: any): Promise<NotifyVerifyResult> {
    try {
      const sign = data.sign;

      if (!sign) {
        return {
          verified: false,
          error: '缺少签名',
        };
      }

      // 复制数据并移除签名字段
      const signData = { ...data };
      delete signData.sign;
      delete signData.sign_type;

      // 计算签名
      const calculatedSign = this.generateSign(signData);

      if (sign !== calculatedSign) {
        this.logger.warn(`易支付签名验证失败: ${sign} !== ${calculatedSign}`);
        return {
          verified: false,
          error: '签名验证失败',
        };
      }

      // 验证交易状态
      const tradeStatus = data.trade_status;
      if (tradeStatus !== 'TRADE_SUCCESS') {
        return {
          verified: false,
          error: `交易状态异常: ${tradeStatus}`,
        };
      }

      return {
        verified: true,
        orderId: data.out_trade_no,
        paymentNo: data.trade_no,
        amount: parseFloat(data.money),
        status: 'SUCCESS',
        rawData: data,
      };
    } catch (error: any) {
      this.logger.error(`易支付回调验证异常: ${error.message}`, error.stack);
      return {
        verified: false,
        error: error.message,
      };
    }
  }

  /**
   * 查询订单状态
   */
  async queryOrder(paymentNo: string): Promise<QueryOrderResult> {
    const { apiUrl, mchId, apiKey } = this.config;

    if (!apiUrl || !mchId || !apiKey) {
      return {
        exists: false,
        status: 'UNKNOWN',
      };
    }

    try {
      // 动态导入 axios
      const axios = (await import('axios')).default;

      const data: Record<string, any> = {
        pid: mchId,
        out_trade_no: paymentNo,
        sign_type: 'MD5',
      };

      data['sign'] = this.generateSign(data);

      const response = await axios.post(`${apiUrl}/api.php`, data, {
        timeout: 10000,
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      });

      const result = response.data;

      if (result.code === 1 && result.trade) {
        return {
          exists: true,
          status:
            result.trade.trade_status === 'TRADE_SUCCESS'
              ? 'SUCCESS'
              : 'PENDING',
          amount: parseFloat(result.trade.money),
          paidAt: result.trade.endtime
            ? new Date(result.trade.endtime)
            : undefined,
          rawData: result,
        };
      }

      return {
        exists: false,
        status: 'NOT_FOUND',
        rawData: result,
      };
    } catch (error: any) {
      this.logger.error(`易支付订单查询失败: ${error.message}`);
      return {
        exists: false,
        status: 'ERROR',
        rawData: { error: error.message },
      };
    }
  }

  /**
   * 生成签名
   */
  protected generateSign(data: any): string {
    const { apiKey } = this.config;

    // 按键名排序
    const sortedKeys = Object.keys(data)
      .filter(
        (key) =>
          data[key] !== undefined &&
          data[key] !== '' &&
          key !== 'sign' &&
          key !== 'sign_type',
      )
      .sort();

    // 构建签名字符串
    const signStr =
      sortedKeys.map((key) => `${key}=${data[key]}`).join('&') + apiKey;

    // MD5 加密
    return crypto.createHash('md5').update(signStr, 'utf8').digest('hex');
  }
}
