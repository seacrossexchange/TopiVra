// 错误消息映射 - 将技术错误转换为用户友好的提示
export const ERROR_MESSAGES = {
  // 认证相关
  'Invalid credentials': '邮箱或密码错误，请重试',
  'User not found': '该账号不存在，请检查邮箱地址',
  'Email already exists': '该邮箱已被注册，请使用其他邮箱或直接登录',
  'Invalid token': '登录已过期，请重新登录',
  'Token expired': '登录已过期，请重新登录',
  'Unauthorized': '请先登录后再进行操作',
  'Forbidden': '您没有权限执行此操作',
  'Account locked': '账号已被锁定，请联系客服',
  'Email not verified': '请先验证邮箱后再登录',
  'Invalid verification code': '验证码错误或已过期，请重新获取',
  'Too many login attempts': '登录尝试次数过多，请稍后再试',

  // 商品相关
  'Product not found': '商品不存在或已下架',
  'Product out of stock': '商品库存不足，请选择其他商品',
  'Product already exists': '商品已存在，请勿重复添加',
  'Invalid product data': '商品信息填写不完整，请检查后重试',
  'Product price invalid': '商品价格设置不正确，请输入有效金额',

  // 订单相关
  'Order not found': '订单不存在，请检查订单号',
  'Order already paid': '订单已支付，无需重复支付',
  'Order already cancelled': '订单已取消，无法继续操作',
  'Order cannot be cancelled': '订单当前状态不允许取消',
  'Insufficient stock': '商品库存不足，请减少购买数量',
  'Invalid order status': '订单状态异常，请联系客服',

  // 支付相关
  'Payment failed': '支付失败，请重试或更换支付方式',
  'Payment timeout': '支付超时，请重新发起支付',
  'Payment already processed': '该订单已完成支付',
  'Invalid payment method': '不支持的支付方式',
  'Payment amount mismatch': '支付金额不匹配，请重新下单',
  'Insufficient balance': '余额不足，请充值后再试',

  // 购物车相关
  'Cart is empty': '购物车是空的，快去挑选商品吧',
  'Cart item not found': '购物车中没有该商品',
  'Invalid quantity': '商品数量不正确，请输入有效数字',
  'Quantity exceeds stock': '购买数量超过库存，请减少数量',

  // 卖家相关
  'Seller not found': '卖家不存在',
  'Seller not approved': '您的卖家申请还在审核中，请耐心等待',
  'Already a seller': '您已经是卖家了',
  'Not a seller': '您还不是卖家，请先申请成为卖家',
  'Seller application pending': '您的卖家申请正在审核中',
  'Seller application rejected': '您的卖家申请未通过，请查看原因后重新申请',

  // 文件上传相关
  'File too large': '文件太大，请上传小于 10MB 的文件',
  'Invalid file type': '不支持的文件格式，请上传图片文件',
  'Upload failed': '文件上传失败，请重试',
  'Too many files': '一次最多上传 5 个文件',

  // 网络相关
  'Network error': '网络连接失败，请检查网络后重试',
  'Request timeout': '请求超时，请稍后重试',
  'Server error': '服务器繁忙，请稍后重试',
  'Service unavailable': '服务暂时不可用，请稍后重试',

  // 数据验证相关
  'Validation failed': '输入信息有误，请检查后重试',
  'Invalid email format': '邮箱格式不正确，请输入有效的邮箱地址',
  'Invalid phone format': '手机号格式不正确',
  'Password too weak': '密码强度不够，请使用至少 8 位包含字母和数字的密码',
  'Passwords do not match': '两次输入的密码不一致',
  'Invalid date format': '日期格式不正确',
  'Invalid URL format': 'URL 格式不正确',

  // 权限相关
  'Access denied': '访问被拒绝，您没有权限查看此内容',
  'Admin only': '此功能仅限管理员使用',
  'Seller only': '此功能仅限卖家使用',
  'Owner only': '只有创建者可以执行此操作',

  // 限流相关
  'Too many requests': '操作过于频繁，请稍后再试',
  'Rate limit exceeded': '请求次数超过限制，请稍后再试',

  // 数据库相关
  'Database error': '数据处理失败，请稍后重试',
  'Duplicate entry': '数据已存在，请勿重复提交',
  'Foreign key constraint': '无法删除，该数据正在被使用',

  // 通用错误
  'Bad request': '请求参数错误，请检查后重试',
  'Not found': '请求的资源不存在',
  'Internal server error': '服务器内部错误，我们会尽快修复',
  'Unknown error': '发生未知错误，请联系客服',
};

/**
 * 获取用户友好的错误消息
 */
export function getFriendlyErrorMessage(error: string | Error): string {
  const errorMessage = typeof error === 'string' ? error : error.message;
  
  // 查找匹配的友好消息
  for (const [key, value] of Object.entries(ERROR_MESSAGES)) {
    if (errorMessage.includes(key)) {
      return value;
    }
  }
  
  // 如果没有匹配，返回通用错误消息
  return '操作失败，请稍后重试';
}

/**
 * 根据 HTTP 状态码获取友好消息
 */
export function getFriendlyErrorByStatus(status: number): string {
  const statusMessages: Record<number, string> = {
    400: '请求参数错误，请检查后重试',
    401: '请先登录后再进行操作',
    403: '您没有权限执行此操作',
    404: '请求的资源不存在',
    409: '数据冲突，请刷新后重试',
    422: '输入信息有误，请检查后重试',
    429: '操作过于频繁，请稍后再试',
    500: '服务器繁忙，请稍后重试',
    502: '网关错误，请稍后重试',
    503: '服务暂时不可用，请稍后重试',
    504: '请求超时，请稍后重试',
  };

  return statusMessages[status] || '操作失败，请稍后重试';
}

/**
 * 格式化错误响应
 */
export interface FriendlyErrorResponse {
  message: string;
  suggestion?: string;
  code?: string;
}

export function formatFriendlyError(
  error: string | Error,
  suggestion?: string,
): FriendlyErrorResponse {
  return {
    message: getFriendlyErrorMessage(error),
    suggestion,
    code: typeof error === 'object' && 'code' in error ? String(error.code) : undefined,
  };
}

// 常见错误的建议
export const ERROR_SUGGESTIONS = {
  'Invalid credentials': '请检查邮箱和密码是否正确，或点击"忘记密码"重置',
  'Email already exists': '如果这是您的邮箱，请直接登录',
  'Product out of stock': '您可以收藏该商品，有货时我们会通知您',
  'Payment failed': '请检查支付账户余额，或尝试其他支付方式',
  'Network error': '请检查网络连接，或稍后重试',
  'Too many requests': '为了保护您的账号安全，请稍后再试',
};

/**
 * 获取错误建议
 */
export function getErrorSuggestion(error: string | Error): string | undefined {
  const errorMessage = typeof error === 'string' ? error : error.message;
  
  for (const [key, value] of Object.entries(ERROR_SUGGESTIONS)) {
    if (errorMessage.includes(key)) {
      return value;
    }
  }
  
  return undefined;
}

