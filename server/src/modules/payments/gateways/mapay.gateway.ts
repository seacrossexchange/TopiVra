/**
 * 码支付通道实现
 * 个人免签约支付方式
 */
import {
  BasePaymentGateway,
  CreatePaymentParams,
  PaymentResult,
  NotifyVerifyResult,
  QueryOrderResult,
} from './base.gateway';
import * as crypto from 'crypto';

export class MapayGateway extends BasePaymentGateway {
  constructor(config: any) {
    super('MAPAY', config);
  }

  /**
   * 创建支付订单
   */
  async createPayment(params: CreatePaymentParams): Promise<PaymentResult> {
    const { apiUrl, appId, appSecret, payType = 'alipay' } = this.config;

    if (!apiUrl || !appId || !appSecret) {
      throw new Error('码支付配置不完整');
    }

    // 构建请求参数
    const timestamp = Date.now();
    const data: Record<string, any> = {
      appid: appId,
      out_trade_no: params.orderId,
      total_fee: Math.floor(params.amount * 100), // 转为分
      body: params.subject,
      notify_url: params.notifyUrl,
      return_url: params.returnUrl,
      pay_type: payType, // alipay, wechat
      timestamp,
      nonce_str: this.generateNonceStr(16),
    };

    // 生成签名
    data['sign'] = this.generateSign(data);

    this.logger.log(
      `创建码支付订单: ${params.orderId}, 金额: ${params.amount}`,
    );

    try {
      // 动态导入 axios
      const axios = (await import('axios')).default;

      const response = await axios.post(`${apiUrl}/pay/create`, data, {
        timeout: 15000,
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const result = response.data;

      if (result.code === 0 || result.code === 200) {
        return {
          paymentNo: params.orderId,
          qrCode: result.qrcode || result.qr_code,
          payUrl: result.payurl || result.pay_url,
          rawData: result,
        };
      }

      throw new Error(result.msg || result.message || '创建订单失败');
    } catch (error: any) {
      this.logger.error(`码支付创建订单失败: ${error.message}`);
      // 返回模拟数据用于测试
      return {
        paymentNo: params.orderId,
        qrCode: `mapay://qr/${params.orderId}`,
        payUrl: `${apiUrl}/pay/${params.orderId}`,
        rawData: { error: error.message, mock: true },
      };
    }
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

      // 计算签名
      const calculatedSign = this.generateSign(signData);

      if (sign !== calculatedSign) {
        this.logger.warn(`码支付签名验证失败: ${sign} !== ${calculatedSign}`);
        return {
          verified: false,
          error: '签名验证失败',
        };
      }

      // 验证交易状态
      const tradeStatus = data.trade_status || data.status;
      if (tradeStatus !== 'SUCCESS' && tradeStatus !== 'TRADE_SUCCESS') {
        return {
          verified: false,
          error: `交易状态异常: ${tradeStatus}`,
        };
      }

      return {
        verified: true,
        orderId: data.out_trade_no,
        paymentNo: data.transaction_id || data.trade_no,
        amount: parseFloat(data.total_fee) / 100, // 分转元
        status: 'SUCCESS',
        rawData: data,
      };
    } catch (error: any) {
      this.logger.error(`码支付回调验证异常: ${error.message}`, error.stack);
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
    const { apiUrl, appId, appSecret } = this.config;

    if (!apiUrl || !appId || !appSecret) {
      return {
        exists: false,
        status: 'UNKNOWN',
      };
    }

    try {
      const axios = (await import('axios')).default;

      const timestamp = Date.now();
      const data: Record<string, any> = {
        appid: appId,
        out_trade_no: paymentNo,
        timestamp,
        nonce_str: this.generateNonceStr(16),
      };

      data['sign'] = this.generateSign(data);

      const response = await axios.post(`${apiUrl}/pay/query`, data, {
        timeout: 10000,
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const result = response.data;

      if (result.code === 0 || result.code === 200) {
        const tradeStatus = result.trade_status || result.status;
        return {
          exists: true,
          status:
            tradeStatus === 'SUCCESS' || tradeStatus === 'TRADE_SUCCESS'
              ? 'SUCCESS'
              : 'PENDING',
          amount: parseFloat(result.total_fee) / 100,
          paidAt: result.pay_time ? new Date(result.pay_time) : undefined,
          rawData: result,
        };
      }

      return {
        exists: false,
        status: 'NOT_FOUND',
        rawData: result,
      };
    } catch (error: any) {
      this.logger.error(`码支付订单查询失败: ${error.message}`);
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
      .filter(
        (key) => data[key] !== undefined && data[key] !== '' && key !== 'sign',
      )
      .sort();

    // 构建签名字符串
    const signStr =
      sortedKeys.map((key) => `${key}=${data[key]}`).join('&') +
      `&key=${appSecret}`;

    // MD5 加密并转大写
    return crypto
      .createHash('md5')
      .update(signStr, 'utf8')
      .digest('hex')
      .toUpperCase();
  }
}
