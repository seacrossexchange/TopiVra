/**
 * 标准化错误码体系
 * 格式: E + 模块代码(2位) + 错误序号(3位)
 * 
 * 模块代码:
 * 10 - 认证/授权
 * 20 - 用户管理
 * 30 - 商品管理
 * 40 - 订单管理
 * 50 - 支付管理
 * 60 - 工单系统
 * 70 - 评价系统
 * 80 - 卖家中心
 * 90 - 系统/通用
 */

export enum ErrorCode {
  // ==================== 认证/授权 (E10xxx) ====================
  AUTH_INVALID_CREDENTIALS = 'E10001',
  AUTH_TOKEN_EXPIRED = 'E10002',
  AUTH_TOKEN_INVALID = 'E10003',
  AUTH_UNAUTHORIZED = 'E10004',
  AUTH_FORBIDDEN = 'E10005',
  AUTH_EMAIL_NOT_VERIFIED = 'E10006',
  AUTH_ACCOUNT_LOCKED = 'E10007',
  AUTH_ACCOUNT_SUSPENDED = 'E10008',
  AUTH_2FA_REQUIRED = 'E10009',
  AUTH_2FA_INVALID = 'E10010',
  AUTH_REFRESH_TOKEN_INVALID = 'E10011',

  // ==================== 用户管理 (E20xxx) ====================
  USER_NOT_FOUND = 'E20001',
  USER_EMAIL_EXISTS = 'E20002',
  USER_PHONE_EXISTS = 'E20003',
  USER_INVALID_PASSWORD = 'E20004',
  USER_PROFILE_UPDATE_FAILED = 'E20005',
  USER_BALANCE_INSUFFICIENT = 'E20006',

  // ==================== 商品管理 (E30xxx) ====================
  PRODUCT_NOT_FOUND = 'E30001',
  PRODUCT_OUT_OF_STOCK = 'E30002',
  PRODUCT_UNAVAILABLE = 'E30003',
  PRODUCT_PRICE_CHANGED = 'E30004',
  PRODUCT_INVENTORY_INSUFFICIENT = 'E30005',
  PRODUCT_ALREADY_DELETED = 'E30006',
  PRODUCT_INVALID_STATUS = 'E30007',

  // ==================== 订单管理 (E40xxx) ====================
  ORDER_NOT_FOUND = 'E40001',
  ORDER_INVALID_STATUS = 'E40002',
  ORDER_CANNOT_CANCEL = 'E40003',
  ORDER_ALREADY_PAID = 'E40004',
  ORDER_PAYMENT_FAILED = 'E40005',
  ORDER_DELIVERY_FAILED = 'E40006',
  ORDER_REFUND_NOT_ALLOWED = 'E40007',
  ORDER_EXPIRED = 'E40008',

  // ==================== 支付管理 (E50xxx) ====================
  PAYMENT_GATEWAY_ERROR = 'E50001',
  PAYMENT_AMOUNT_MISMATCH = 'E50002',
  PAYMENT_SIGNATURE_INVALID = 'E50003',
  PAYMENT_TIMEOUT = 'E50004',
  PAYMENT_CANCELLED = 'E50005',
  PAYMENT_REFUND_FAILED = 'E50006',

  // ==================== 工单系统 (E60xxx) ====================
  TICKET_NOT_FOUND = 'E60001',
  TICKET_ALREADY_CLOSED = 'E60002',
  TICKET_INVALID_STATUS = 'E60003',
  TICKET_UNAUTHORIZED = 'E60004',

  // ==================== 评价系统 (E70xxx) ====================
  REVIEW_NOT_FOUND = 'E70001',
  REVIEW_ALREADY_EXISTS = 'E70002',
  REVIEW_NOT_ALLOWED = 'E70003',
  REVIEW_INVALID_RATING = 'E70004',

  // ==================== 卖家中心 (E80xxx) ====================
  SELLER_NOT_FOUND = 'E80001',
  SELLER_NOT_APPROVED = 'E80002',
  SELLER_APPLICATION_EXISTS = 'E80003',
  SELLER_WITHDRAWAL_FAILED = 'E80004',
  SELLER_BALANCE_INSUFFICIENT = 'E80005',

  // ==================== 系统/通用 (E90xxx) ====================
  SYSTEM_ERROR = 'E90001',
  VALIDATION_ERROR = 'E90002',
  RATE_LIMIT_EXCEEDED = 'E90003',
  REQUEST_TIMEOUT = 'E90004',
  DATABASE_ERROR = 'E90005',
  EXTERNAL_SERVICE_ERROR = 'E90006',
  FILE_UPLOAD_FAILED = 'E90007',
  INVALID_INPUT = 'E90008',
  RESOURCE_NOT_FOUND = 'E90009',
}

/**
 * 错误码对应的 HTTP 状态码
 */
export const ErrorCodeHttpStatus: Record<ErrorCode, number> = {
  // 认证/授权
  [ErrorCode.AUTH_INVALID_CREDENTIALS]: 401,
  [ErrorCode.AUTH_TOKEN_EXPIRED]: 401,
  [ErrorCode.AUTH_TOKEN_INVALID]: 401,
  [ErrorCode.AUTH_UNAUTHORIZED]: 401,
  [ErrorCode.AUTH_FORBIDDEN]: 403,
  [ErrorCode.AUTH_EMAIL_NOT_VERIFIED]: 403,
  [ErrorCode.AUTH_ACCOUNT_LOCKED]: 403,
  [ErrorCode.AUTH_ACCOUNT_SUSPENDED]: 403,
  [ErrorCode.AUTH_2FA_REQUIRED]: 401,
  [ErrorCode.AUTH_2FA_INVALID]: 401,
  [ErrorCode.AUTH_REFRESH_TOKEN_INVALID]: 401,

  // 用户管理
  [ErrorCode.USER_NOT_FOUND]: 404,
  [ErrorCode.USER_EMAIL_EXISTS]: 409,
  [ErrorCode.USER_PHONE_EXISTS]: 409,
  [ErrorCode.USER_INVALID_PASSWORD]: 400,
  [ErrorCode.USER_PROFILE_UPDATE_FAILED]: 400,
  [ErrorCode.USER_BALANCE_INSUFFICIENT]: 400,

  // 商品管理
  [ErrorCode.PRODUCT_NOT_FOUND]: 404,
  [ErrorCode.PRODUCT_OUT_OF_STOCK]: 400,
  [ErrorCode.PRODUCT_UNAVAILABLE]: 400,
  [ErrorCode.PRODUCT_PRICE_CHANGED]: 409,
  [ErrorCode.PRODUCT_INVENTORY_INSUFFICIENT]: 400,
  [ErrorCode.PRODUCT_ALREADY_DELETED]: 410,
  [ErrorCode.PRODUCT_INVALID_STATUS]: 400,

  // 订单管理
  [ErrorCode.ORDER_NOT_FOUND]: 404,
  [ErrorCode.ORDER_INVALID_STATUS]: 400,
  [ErrorCode.ORDER_CANNOT_CANCEL]: 400,
  [ErrorCode.ORDER_ALREADY_PAID]: 409,
  [ErrorCode.ORDER_PAYMENT_FAILED]: 402,
  [ErrorCode.ORDER_DELIVERY_FAILED]: 500,
  [ErrorCode.ORDER_REFUND_NOT_ALLOWED]: 400,
  [ErrorCode.ORDER_EXPIRED]: 410,

  // 支付管理
  [ErrorCode.PAYMENT_GATEWAY_ERROR]: 502,
  [ErrorCode.PAYMENT_AMOUNT_MISMATCH]: 400,
  [ErrorCode.PAYMENT_SIGNATURE_INVALID]: 400,
  [ErrorCode.PAYMENT_TIMEOUT]: 408,
  [ErrorCode.PAYMENT_CANCELLED]: 400,
  [ErrorCode.PAYMENT_REFUND_FAILED]: 500,

  // 工单系统
  [ErrorCode.TICKET_NOT_FOUND]: 404,
  [ErrorCode.TICKET_ALREADY_CLOSED]: 400,
  [ErrorCode.TICKET_INVALID_STATUS]: 400,
  [ErrorCode.TICKET_UNAUTHORIZED]: 403,

  // 评价系统
  [ErrorCode.REVIEW_NOT_FOUND]: 404,
  [ErrorCode.REVIEW_ALREADY_EXISTS]: 409,
  [ErrorCode.REVIEW_NOT_ALLOWED]: 403,
  [ErrorCode.REVIEW_INVALID_RATING]: 400,

  // 卖家中心
  [ErrorCode.SELLER_NOT_FOUND]: 404,
  [ErrorCode.SELLER_NOT_APPROVED]: 403,
  [ErrorCode.SELLER_APPLICATION_EXISTS]: 409,
  [ErrorCode.SELLER_WITHDRAWAL_FAILED]: 500,
  [ErrorCode.SELLER_BALANCE_INSUFFICIENT]: 400,

  // 系统/通用
  [ErrorCode.SYSTEM_ERROR]: 500,
  [ErrorCode.VALIDATION_ERROR]: 400,
  [ErrorCode.RATE_LIMIT_EXCEEDED]: 429,
  [ErrorCode.REQUEST_TIMEOUT]: 408,
  [ErrorCode.DATABASE_ERROR]: 500,
  [ErrorCode.EXTERNAL_SERVICE_ERROR]: 502,
  [ErrorCode.FILE_UPLOAD_FAILED]: 500,
  [ErrorCode.INVALID_INPUT]: 400,
  [ErrorCode.RESOURCE_NOT_FOUND]: 404,
};

/**
 * 错误码对应的默认消息（中文）
 */
export const ErrorCodeMessage: Record<ErrorCode, string> = {
  // 认证/授权
  [ErrorCode.AUTH_INVALID_CREDENTIALS]: '用户名或密码错误',
  [ErrorCode.AUTH_TOKEN_EXPIRED]: '登录已过期，请重新登录',
  [ErrorCode.AUTH_TOKEN_INVALID]: '无效的认证令牌',
  [ErrorCode.AUTH_UNAUTHORIZED]: '未授权访问',
  [ErrorCode.AUTH_FORBIDDEN]: '无权限访问',
  [ErrorCode.AUTH_EMAIL_NOT_VERIFIED]: '邮箱未验证',
  [ErrorCode.AUTH_ACCOUNT_LOCKED]: '账号已锁定',
  [ErrorCode.AUTH_ACCOUNT_SUSPENDED]: '账号已被封禁',
  [ErrorCode.AUTH_2FA_REQUIRED]: '需要双因素认证',
  [ErrorCode.AUTH_2FA_INVALID]: '双因素认证码错误',
  [ErrorCode.AUTH_REFRESH_TOKEN_INVALID]: '刷新令牌无效',

  // 用户管理
  [ErrorCode.USER_NOT_FOUND]: '用户不存在',
  [ErrorCode.USER_EMAIL_EXISTS]: '邮箱已被注册',
  [ErrorCode.USER_PHONE_EXISTS]: '手机号已被注册',
  [ErrorCode.USER_INVALID_PASSWORD]: '密码格式不正确',
  [ErrorCode.USER_PROFILE_UPDATE_FAILED]: '更新用户资料失败',
  [ErrorCode.USER_BALANCE_INSUFFICIENT]: '余额不足',

  // 商品管理
  [ErrorCode.PRODUCT_NOT_FOUND]: '商品不存在',
  [ErrorCode.PRODUCT_OUT_OF_STOCK]: '商品库存不足',
  [ErrorCode.PRODUCT_UNAVAILABLE]: '商品已下架',
  [ErrorCode.PRODUCT_PRICE_CHANGED]: '商品价格已变动',
  [ErrorCode.PRODUCT_INVENTORY_INSUFFICIENT]: '可用账号不足',
  [ErrorCode.PRODUCT_ALREADY_DELETED]: '商品已被删除',
  [ErrorCode.PRODUCT_INVALID_STATUS]: '商品状态无效',

  // 订单管理
  [ErrorCode.ORDER_NOT_FOUND]: '订单不存在',
  [ErrorCode.ORDER_INVALID_STATUS]: '订单状态无效',
  [ErrorCode.ORDER_CANNOT_CANCEL]: '订单无法取消',
  [ErrorCode.ORDER_ALREADY_PAID]: '订单已支付',
  [ErrorCode.ORDER_PAYMENT_FAILED]: '支付失败',
  [ErrorCode.ORDER_DELIVERY_FAILED]: '发货失败',
  [ErrorCode.ORDER_REFUND_NOT_ALLOWED]: '不允许退款',
  [ErrorCode.ORDER_EXPIRED]: '订单已过期',

  // 支付管理
  [ErrorCode.PAYMENT_GATEWAY_ERROR]: '支付网关错误',
  [ErrorCode.PAYMENT_AMOUNT_MISMATCH]: '支付金额不匹配',
  [ErrorCode.PAYMENT_SIGNATURE_INVALID]: '支付签名无效',
  [ErrorCode.PAYMENT_TIMEOUT]: '支付超时',
  [ErrorCode.PAYMENT_CANCELLED]: '支付已取消',
  [ErrorCode.PAYMENT_REFUND_FAILED]: '退款失败',

  // 工单系统
  [ErrorCode.TICKET_NOT_FOUND]: '工单不存在',
  [ErrorCode.TICKET_ALREADY_CLOSED]: '工单已关闭',
  [ErrorCode.TICKET_INVALID_STATUS]: '工单状态无效',
  [ErrorCode.TICKET_UNAUTHORIZED]: '无权访问此工单',

  // 评价系统
  [ErrorCode.REVIEW_NOT_FOUND]: '评价不存在',
  [ErrorCode.REVIEW_ALREADY_EXISTS]: '已评价过该商品',
  [ErrorCode.REVIEW_NOT_ALLOWED]: '不允许评价',
  [ErrorCode.REVIEW_INVALID_RATING]: '评分无效',

  // 卖家中心
  [ErrorCode.SELLER_NOT_FOUND]: '卖家不存在',
  [ErrorCode.SELLER_NOT_APPROVED]: '卖家未通过审核',
  [ErrorCode.SELLER_APPLICATION_EXISTS]: '已提交卖家申请',
  [ErrorCode.SELLER_WITHDRAWAL_FAILED]: '提现失败',
  [ErrorCode.SELLER_BALANCE_INSUFFICIENT]: '卖家余额不足',

  // 系统/通用
  [ErrorCode.SYSTEM_ERROR]: '系统错误',
  [ErrorCode.VALIDATION_ERROR]: '数据验证失败',
  [ErrorCode.RATE_LIMIT_EXCEEDED]: '请求过于频繁',
  [ErrorCode.REQUEST_TIMEOUT]: '请求超时',
  [ErrorCode.DATABASE_ERROR]: '数据库错误',
  [ErrorCode.EXTERNAL_SERVICE_ERROR]: '外部服务错误',
  [ErrorCode.FILE_UPLOAD_FAILED]: '文件上传失败',
  [ErrorCode.INVALID_INPUT]: '输入参数无效',
  [ErrorCode.RESOURCE_NOT_FOUND]: '资源不存在',
};

/**
 * 业务异常类
 */
export class BusinessException extends Error {
  constructor(
    public readonly code: ErrorCode,
    public readonly message: string = ErrorCodeMessage[code],
    public readonly statusCode: number = ErrorCodeHttpStatus[code],
    public readonly details?: any,
  ) {
    super(message);
    this.name = 'BusinessException';
  }
}



