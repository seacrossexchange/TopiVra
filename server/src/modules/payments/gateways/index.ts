/**
 * 支付通道工厂
 * 根据通道代码创建对应的支付通道实例
 */
import { BasePaymentGateway, PaymentGatewayConfig } from './base.gateway';
import { YipayGateway } from './yipay.gateway';
import { MapayGateway } from './mapay.gateway';
import { HupijiaoGateway } from './hupijiao.gateway';
import { PaypalGateway } from './paypal.gateway';
import { StripeGateway } from './stripe.gateway';

// 支持的支付通道代码
export const SUPPORTED_GATEWAYS = [
  'YIPAY',      // 易支付
  'MAPAY',      // 码支付
  'HUPIJIAO',   // 虎皮椒
  'PAYPAL',     // PayPal
  'STRIPE',     // Stripe
] as const;

export type GatewayCode = typeof SUPPORTED_GATEWAYS[number];

// 通道信息
export interface GatewayInfo {
  code: string;
  name: string;
  description: string;
  icon?: string;
  configFields: GatewayConfigField[];
}

// 配置字段定义
export interface GatewayConfigField {
  key: string;
  label: string;
  type: 'text' | 'password' | 'select' | 'number';
  required: boolean;
  placeholder?: string;
  options?: { label: string; value: string }[];
  default?: any;
}

// 通道信息映射
export const GATEWAY_INFO: Record<string, GatewayInfo> = {
  YIPAY: {
    code: 'YIPAY',
    name: '易支付',
    description: '聚合支付通道，支持支付宝、微信等多种支付方式',
    configFields: [
      { key: 'apiUrl', label: 'API地址', type: 'text', required: true, placeholder: 'https://pay.example.com' },
      { key: 'mchId', label: '商户ID', type: 'text', required: true, placeholder: '1000' },
      { key: 'apiKey', label: 'API密钥', type: 'password', required: true },
      { key: 'payType', label: '支付类型', type: 'select', required: false, default: 'alipay', options: [
        { label: '支付宝', value: 'alipay' },
        { label: '微信支付', value: 'wxpay' },
        { label: 'QQ钱包', value: 'qqpay' },
      ]},
    ],
  },
  MAPAY: {
    code: 'MAPAY',
    name: '码支付',
    description: '个人免签约支付，自动识别收款码',
    configFields: [
      { key: 'apiUrl', label: 'API地址', type: 'text', required: true, placeholder: 'https://api.mapay.com' },
      { key: 'appId', label: 'AppID', type: 'text', required: true },
      { key: 'appSecret', label: 'AppSecret', type: 'password', required: true },
      { key: 'payType', label: '支付类型', type: 'select', required: false, default: 'alipay', options: [
        { label: '支付宝', value: 'alipay' },
        { label: '微信支付', value: 'wechat' },
      ]},
    ],
  },
  HUPIJIAO: {
    code: 'HUPIJIAO',
    name: '虎皮椒',
    description: '个人免签约支付（迅虎支付）',
    configFields: [
      { key: 'appId', label: 'AppID', type: 'text', required: true, placeholder: '2023xxxx' },
      { key: 'appSecret', label: 'AppSecret', type: 'password', required: true },
      { key: 'payType', label: '支付类型', type: 'select', required: false, default: 'alipay', options: [
        { label: '支付宝', value: 'alipay' },
        { label: '微信支付', value: 'wechat' },
      ]},
    ],
  },
  PAYPAL: {
    code: 'PAYPAL',
    name: 'PayPal',
    description: '国际支付平台，支持信用卡支付',
    configFields: [
      { key: 'clientId', label: 'Client ID', type: 'text', required: true },
      { key: 'clientSecret', label: 'Client Secret', type: 'password', required: true },
      { key: 'mode', label: '模式', type: 'select', required: true, default: 'sandbox', options: [
        { label: '沙盒模式', value: 'sandbox' },
        { label: '生产模式', value: 'live' },
      ]},
    ],
  },
  STRIPE: {
    code: 'STRIPE',
    name: 'Stripe',
    description: '国际信用卡支付平台',
    configFields: [
      { key: 'publicKey', label: 'Public Key', type: 'text', required: true, placeholder: 'pk_test_xxx' },
      { key: 'secretKey', label: 'Secret Key', type: 'password', required: true, placeholder: 'sk_test_xxx' },
      { key: 'webhookSecret', label: 'Webhook Secret', type: 'password', required: false },
    ],
  },
};

/**
 * 支付通道工厂类
 */
export class PaymentGatewayFactory {
  /**
   * 创建支付通道实例
   */
  static create(code: string, config: PaymentGatewayConfig): BasePaymentGateway {
    const upperCode = code.toUpperCase();

    switch (upperCode) {
      case 'YIPAY':
        return new YipayGateway(config);
      case 'MAPAY':
        return new MapayGateway(config);
      case 'HUPIJIAO':
        return new HupijiaoGateway(config);
      case 'PAYPAL':
        return new PaypalGateway(config);
      case 'STRIPE':
        return new StripeGateway(config);
      default:
        throw new Error(`不支持的支付通道: ${code}`);
    }
  }

  /**
   * 获取通道信息
   */
  static getGatewayInfo(code: string): GatewayInfo | null {
    return GATEWAY_INFO[code.toUpperCase()] || null;
  }

  /**
   * 获取所有通道信息
   */
  static getAllGatewayInfo(): GatewayInfo[] {
    return Object.values(GATEWAY_INFO);
  }

  /**
   * 检查通道是否支持
   */
  static isSupported(code: string): boolean {
    return SUPPORTED_GATEWAYS.includes(code.toUpperCase() as GatewayCode);
  }

  /**
   * 获取默认配置
   */
  static getDefaultConfig(code: string): Record<string, any> {
    const info = GATEWAY_INFO[code.toUpperCase()];
    if (!info) return {};

    const config: Record<string, any> = {};
    for (const field of info.configFields) {
      if (field.default !== undefined) {
        config[field.key] = field.default;
      }
    }
    return config;
  }
}

// 导出所有网关类
export {
  BasePaymentGateway,
  YipayGateway,
  MapayGateway,
  HupijiaoGateway,
  PaypalGateway,
  StripeGateway,
};