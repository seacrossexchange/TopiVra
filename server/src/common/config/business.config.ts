/**
 * 业务配置常量
 * 可通过环境变量覆盖默认值
 */

export const BUSINESS_DEFAULTS = {
  // 订单自动取消时间（分钟）
  ORDER_AUTO_CANCEL_MINUTES: 30,

  // 订单自动确认收货时间（天）
  ORDER_AUTO_CONFIRM_DAYS: 7,

  // 默认佣金率（百分比）
  DEFAULT_COMMISSION_RATE: 0.1,

  // 支付过期时间（分钟）
  PAYMENT_EXPIRATION_MINUTES: 30,

  // 最小提现金额
  MIN_WITHDRAWAL_AMOUNT: 10,

  // 提现手续费率
  WITHDRAWAL_FEE_RATE: 0.02,

  // 最大退款申请期限（天）
  MAX_REFUND_DAYS: 7,

  // 平台服务费率
  PLATFORM_FEE_RATE: 0.05,

  // 卖家等级阈值
  SELLER_LEVEL_THRESHOLDS: {
    NORMAL: 0, // 普通卖家
    VERIFIED: 10, // 认证卖家（至少10笔订单）
    PREMIUM: 100, // 高级卖家（至少100笔订单）
  },

  // 风控参数
  RISK_CONTROL: {
    // 登录失败锁定阈值
    LOGIN_FAILURE_THRESHOLD: 5,
    // 登录失败锁定时间（分钟）
    LOGIN_LOCK_DURATION: 15,
    // 异常下单阈值（每分钟）
    ORDER_RATE_LIMIT: 5,
    // 异常下单阈值（每小时，按IP）
    ORDER_IP_RATE_LIMIT: 20,
  },
} as const;

/**
 * 业务配置服务
 * 从环境变量读取配置，支持动态覆盖
 */
export class BusinessConfig {
  /**
   * 获取订单自动取消时间（分钟）
   */
  static getOrderAutoCancelMinutes(): number {
    return (
      Number(process.env.ORDER_AUTO_CANCEL_MINUTES) ||
      BUSINESS_DEFAULTS.ORDER_AUTO_CANCEL_MINUTES
    );
  }

  /**
   * 获取订单自动确认时间（天）
   */
  static getOrderAutoConfirmDays(): number {
    return (
      Number(process.env.ORDER_AUTO_CONFIRM_DAYS) ||
      BUSINESS_DEFAULTS.ORDER_AUTO_CONFIRM_DAYS
    );
  }

  /**
   * 获取默认佣金率
   */
  static getDefaultCommissionRate(): number {
    return (
      Number(process.env.DEFAULT_COMMISSION_RATE) ||
      BUSINESS_DEFAULTS.DEFAULT_COMMISSION_RATE
    );
  }

  /**
   * 获取支付过期时间（分钟）
   */
  static getPaymentExpirationMinutes(): number {
    return (
      Number(process.env.PAYMENT_EXPIRATION_MINUTES) ||
      BUSINESS_DEFAULTS.PAYMENT_EXPIRATION_MINUTES
    );
  }

  /**
   * 获取最小提现金额
   */
  static getMinWithdrawalAmount(): number {
    return (
      Number(process.env.MIN_WITHDRAWAL_AMOUNT) ||
      BUSINESS_DEFAULTS.MIN_WITHDRAWAL_AMOUNT
    );
  }

  /**
   * 获取提现手续费率
   */
  static getWithdrawalFeeRate(): number {
    return (
      Number(process.env.WITHDRAWAL_FEE_RATE) ||
      BUSINESS_DEFAULTS.WITHDRAWAL_FEE_RATE
    );
  }

  /**
   * 获取最大退款申请期限（天）
   */
  static getMaxRefundDays(): number {
    return (
      Number(process.env.MAX_REFUND_DAYS) || BUSINESS_DEFAULTS.MAX_REFUND_DAYS
    );
  }

  /**
   * 获取平台服务费率
   */
  static getPlatformFeeRate(): number {
    return (
      Number(process.env.PLATFORM_FEE_RATE) ||
      BUSINESS_DEFAULTS.PLATFORM_FEE_RATE
    );
  }

  /**
   * 获取登录失败锁定阈值
   */
  static getLoginFailureThreshold(): number {
    return BUSINESS_DEFAULTS.RISK_CONTROL.LOGIN_FAILURE_THRESHOLD;
  }

  /**
   * 获取登录失败锁定时间（分钟）
   */
  static getLoginLockDuration(): number {
    return BUSINESS_DEFAULTS.RISK_CONTROL.LOGIN_LOCK_DURATION;
  }

  /**
   * 获取异常下单阈值（每分钟）
   */
  static getOrderRateLimit(): number {
    return BUSINESS_DEFAULTS.RISK_CONTROL.ORDER_RATE_LIMIT;
  }

  /**
   * 获取异常下单阈值（每小时，按IP）
   */
  static getOrderIpRateLimit(): number {
    return BUSINESS_DEFAULTS.RISK_CONTROL.ORDER_IP_RATE_LIMIT;
  }
}
