// 通知类型常量
export const NotificationType = {
  ORDER_STATUS: 'order_status',          // 订单状态变更
  NEW_ORDER: 'new_order',                // 新订单（卖家）
  REFUND_REQUEST: 'refund_request',      // 退款申请
  REFUND_PROCESSED: 'refund_processed',  // 退款处理完成
  TICKET_REPLY: 'ticket_reply',          // 工单回复
  SYSTEM: 'system',                      // 系统通知
  WITHDRAWAL: 'withdrawal',              // 提现通知
  PRODUCT_SOLD: 'product_sold',          // 商品售出
  PRICE_DROP: 'price_drop',              // 降价提醒
} as const;

export type NotificationType = typeof NotificationType[keyof typeof NotificationType];

// 通知优先级
export const NotificationPriority = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
} as const;

export type NotificationPriority = typeof NotificationPriority[keyof typeof NotificationPriority];

// 通知状态
export const NotificationStatus = {
  UNREAD: 'unread',
  READ: 'read',
} as const;

export type NotificationStatus = typeof NotificationStatus[keyof typeof NotificationStatus];

// 通知基础接口
export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  content: string;
  priority: NotificationPriority;
  status: NotificationStatus;
  data?: Record<string, unknown>;  // 附加数据
  createdAt: string;
  readAt?: string;
}

// WebSocket 事件类型
export interface OrderStatusEvent {
  orderNo: string;
  status: string;
  timestamp: string;
}

export interface TicketReplyEvent {
  ticketNo: string;
  message: string;
  timestamp: string;
}

export interface NewNotificationEvent {
  id: string;
  type: NotificationType;
  title: string;
  content: string;
  priority?: NotificationPriority;
  data?: Record<string, unknown>;
  createdAt: string;
}

// 通知列表响应
export interface NotificationListResponse {
  items: Notification[];
  total: number;
  unreadCount: number;
  hasMore: boolean;
}