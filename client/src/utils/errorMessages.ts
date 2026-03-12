/**
 * 友好的错误消息映射
 * 将技术错误转换为用户友好的提示
 */

export const ERROR_MESSAGES: Record<string, string> = {
  // ==================== 网络错误 ====================
  'Network Error': '网络连接失败，请检查网络设置',
  'timeout': '请求超时，请稍后重试',
  'ECONNABORTED': '请求超时，请检查网络连接',
  'ERR_NETWORK': '网络异常，请检查网络连接',

  // ==================== 认证错误 ====================
  'Unauthorized': '请先登录',
  'Token expired': '登录已过期，请重新登录',
  'Invalid token': '登录信息无效，请重新登录',
  'No token provided': '请先登录',
  '账户已被禁用或封禁': '您的账户已被禁用，请联系客服',
  '登录失败次数过多，账号已锁定': '登录失败次数过多，请稍后再试',

  // ==================== 权限错误 ====================
  'Forbidden': '没有权限执行此操作',
  '无权访问此资源': '您没有权限访问此资源',
  '没有权限': '您没有权限执行此操作',

  // ==================== 业务错误 ====================
  'Insufficient balance': '余额不足，请先充值',
  'Product not found': '商品不存在或已下架',
  'Order not found': '订单不存在',
  'Payment failed': '支付失败，请重试或更换支付方式',
  '商品库存不足': '商品库存不足，请减少购买数量',
  '订单已支付或正在支付中': '订单已支付，请勿重复支付',
  '邮箱已被注册': '该邮箱已被注册，请使用其他邮箱',
  '验证码错误': '验证码错误，请重新输入',
  '验证码无效或已过期': '验证码已过期，请重新获取',

  // ==================== 文件上传错误 ====================
  '不支持的文件类型': '不支持的文件格式，请上传图片文件',
  '不支持的图片格式': '仅支持 JPG、PNG、GIF、WEBP 格式',
  '文件过大': '文件大小超过限制，请压缩后上传',

  // ==================== 支付错误 ====================
  '支付金额不一致': '支付金额异常，请联系客服',
  '支付订单不存在': '支付订单不存在',
  '交易验证失败': '交易验证失败，请重试',

  // ==================== 服务器错误 ====================
  'Internal Server Error': '服务器错误，请稍后重试',
  'Service Unavailable': '服务暂时不可用，请稍后重试',
  'Bad Gateway': '网关错误，请稍后重试',
  'Gateway Timeout': '网关超时，请稍后重试',

  // ==================== 默认错误 ====================
  'default': '操作失败，请稍后重试',
};

/**
 * 获取友好的错误消息
 * @param error - 错误对象或错误消息
 * @param defaultMessage - 默认消息
 * @returns 友好的错误消息
 */
export const getFriendlyErrorMessage = (
  error: unknown,
  defaultMessage = '操作失败'
): string => {
  if (!error) return defaultMessage;

  // 如果是字符串，直接查找映射
  if (typeof error === 'string') {
    return ERROR_MESSAGES[error] || error || defaultMessage;
  }

  // 如果是 Error 对象
  if (error instanceof Error) {
    const message = error.message;
    return ERROR_MESSAGES[message] || message || defaultMessage;
  }

  // 如果是 Axios 错误
  if (typeof error === 'object' && error !== null && 'response' in error) {
    const axiosError = error as any;
    const message = axiosError.response?.data?.message || axiosError.message;
    return ERROR_MESSAGES[message] || message || defaultMessage;
  }

  return defaultMessage;
};

/**
 * 根据 HTTP 状态码获取友好消息
 */
export const getStatusMessage = (status: number): string => {
  const statusMessages: Record<number, string> = {
    400: '请求参数错误',
    401: '请先登录',
    403: '没有权限执行此操作',
    404: '请求的资源不存在',
    409: '数据冲突，请刷新后重试',
    422: '数据验证失败',
    429: '请求过于频繁，请稍后再试',
    500: '服务器错误，请稍后重试',
    502: '网关错误，请稍后重试',
    503: '服务暂时不可用，请稍后重试',
    504: '网关超时，请稍后重试',
  };

  return statusMessages[status] || '操作失败，请稍后重试';
};

/**
 * 错误类型枚举
 */
export const ErrorType = {
  NETWORK: 'network',
  AUTH: 'auth',
  PERMISSION: 'permission',
  BUSINESS: 'business',
  SERVER: 'server',
  UNKNOWN: 'unknown',
} as const;

export type ErrorType = typeof ErrorType[keyof typeof ErrorType];

/**
 * 根据错误获取错误类型
 */
export const getErrorType = (error: unknown): ErrorType => {
  if (!error) return ErrorType.UNKNOWN;

  const errorStr = typeof error === 'string' ? error : (error as any).message || '';

  if (errorStr.includes('Network') || errorStr.includes('timeout')) {
    return ErrorType.NETWORK;
  }

  if (errorStr.includes('Unauthorized') || errorStr.includes('Token') || errorStr.includes('登录')) {
    return ErrorType.AUTH;
  }

  if (errorStr.includes('Forbidden') || errorStr.includes('权限')) {
    return ErrorType.PERMISSION;
  }

  if (errorStr.includes('Server Error') || errorStr.includes('服务器')) {
    return ErrorType.SERVER;
  }

  return ErrorType.BUSINESS;
};

