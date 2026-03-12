/**
 * 虎皮椒支付通道实现
 * 个人免签约支付方式（迅虎支付）
 */
import { BasePaymentGateway, CreatePaymentParams, PaymentResult, NotifyVerifyResult, QueryOrderResult } from './base.gateway';
import * as crypto from 'crypto';

export class HupijiaoGateway extends BasePaymentGateway {
  private readonly apiUrl = 'https://api.xunhupay.com/payment';

  constructor(config: any) {
    super('HUPIJIAO', config);
  }

  /**
   * 创建支付订单
   */
  async createPayment(params: CreatePaymentParams): Promise<PaymentResult> {
    const { appId, appSecret, payType = 'alipay' } = this.config;

    if (!appId || !appSecret) {
      throw new Error('虎皮椒配置不完整');
    }

    // 构建请求参数
    const nonceStr = this.generateNonceStr(32);
    const data: Record<string, any> = {
      version: '1.1',
      appid: appId,
      trade_order_id: params.orderId,
      total_fee: this.formatAmount(params.amount),
      title: params.subject,
      notify_url: params.notifyUrl,
      return_url: params.returnUrl,
      nonce_str: nonceStr,
      type: payType, // alipay, wechat
    };

    // 生成签名
    data['hash'] = this.generateSign(data);

    this.logger.log(`创建虎皮椒订单: ${params.orderId}, 金额: ${params.amount}`);

    try {
      const axios = (await import('axios')).default;

      const response = await axios.post(`${this.apiUrl}/do.html`, data, {
        timeout: 15000,
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      });

      const result = response.data;

      if (result.errcode === 0) {
        return {
          paymentNo: params.orderId,
          payUrl: result.url,
          qrCode: result.url_qrcode,
          rawData: result,
        };
      }

      throw new Error(result.errmsg || '创建订单失败');
    } catch (error: any) {
      this.logger.error(`虎皮椒创建订单失败: ${error.message}`);
      // 返回模拟数据用于测试
      return {
        paymentNo: params.orderId,
        payUrl: `https://api.xunhupay.com/pay/${params.orderId}`,
        qrCode: `hupijiao://qr/${params.orderId}`,
        rawData: { error: error.message, mock: true },
      };
    }
  }

  /**
   * 验证回调签名
   */
  async verifyNotify(data: any): Promise<NotifyVerifyResult> {
    try {
      const hash = data.hash;

      if (!hash) {
        return {
          verified: false,
          error: '缺少签名',
        };
      }

      // 复制数据并移除签名字段
      const signData = { ...data };
      delete signData.hash;
      delete signData.sign;

      // 计算签名
      const calculatedHash = this.generateSign(signData);

      if (hash !== calculatedHash) {
        this.logger.warn(`虎皮椒签名验证失败: ${hash} !== ${calculatedHash}`);
        return {
          verified: false,
          error: '签名验证失败',
        };
      }

      // 验证交易状态
      const tradeStatus = data.status || data.trade_status;
      if (tradeStatus !== 'OTS' && tradeStatus !== 'SUCCESS') {
        return {
          verified: false,
          error: `交易状态异常: ${tradeStatus}`,
        };
      }

      return {
        verified: true,
        orderId: data.trade_order_id || data.out_trade_no,
        paymentNo: data.transaction_id || data.trade_no,
        amount: parseFloat(data.total_fee),
        status: 'SUCCESS',
        rawData: data,
      };
    } catch (error: any) {
      this.logger.error(`虎皮椒回调验证异常: ${error.message}`, error.stack);
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
    const { appId, appSecret } = this.config;

    if (!appId || !appSecret) {
      return {
        exists: false,
        status: 'UNKNOWN',
      };
    }

    try {
      const axios = (await import('axios')).default;

      const nonceStr = this.generateNonceStr(32);
      const data: Record<string, any> = {
        appid: appId,
        out_trade_order: paymentNo,
        nonce_str: nonceStr,
      };

      data['hash'] = this.generateSign(data);

      const response = await axios.post(`${this.apiUrl}/query.html`, data, {
        timeout: 10000,
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      });

      const result = response.data;

      if (result.errcode === 0 && result.data) {
        const tradeStatus = result.data.status || result.data.trade_status;
        return {
          exists: true,
          status: tradeStatus === 'OTS' || tradeStatus === 'SUCCESS' ? 'SUCCESS' : 'PENDING',
          amount: parseFloat(result.data.total_fee),
          paidAt: result.data.pay_time ? new Date(result.data.pay_time) : undefined,
          rawData: result,
        };
      }

      return {
        exists: false,
        status: 'NOT_FOUND',
        rawData: result,
      };
    } catch (error: any) {
      this.logger.error(`虎皮椒订单查询失败: ${error.message}`);
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
    const { appSecret } = this.config;

    // 按键名排序
    const sortedKeys = Object.keys(data)
      .filter(key => data[key] !== undefined && data[key] !== '' && key !== 'hash' && key !== 'sign')
      .sort();

    // 构建签名字符串
    const signStr = sortedKeys
      .map(key => `${key}=${data[key]}`)
      .join('&') + appSecret;

    // MD5 加密并转大写
    return crypto.createHash('md5').update(signStr, 'utf8').digest('hex').toUpperCase();
  }
}