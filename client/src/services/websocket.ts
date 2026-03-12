import { io, Socket } from 'socket.io-client';
import type { 
  OrderStatusEvent, 
  TicketReplyEvent, 
  NewNotificationEvent 
} from '../types/notification';

type EventCallback<T = unknown> = (data: T) => void;

interface WebSocketEvents {
  'order:status_changed': OrderStatusEvent;
  'notification:new': NewNotificationEvent;
  'ticket:reply': TicketReplyEvent;
  'pong': { timestamp: string };
}

class WebSocketService {
  private socket: Socket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private isConnecting = false;
  private eventListeners: Map<string, Set<EventCallback>> = new Map();

  // 获取 WebSocket URL
  private getWebSocketUrl(): string {
    const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
    return baseUrl.replace('/api', '');
  }

  // 连接 WebSocket
  connect(token: string): Promise<boolean> {
    return new Promise((resolve) => {
      if (this.socket?.connected) {
        resolve(true);
        return;
      }

      if (this.isConnecting) {
        resolve(false);
        return;
      }

      this.isConnecting = true;
      const url = this.getWebSocketUrl();

      this.socket = io(url, {
        auth: { token },
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionAttempts: this.maxReconnectAttempts,
        reconnectionDelay: this.reconnectDelay,
      });

      // 连接成功
      this.socket.on('connect', () => {
        console.log('[WebSocket] 连接成功');
        this.reconnectAttempts = 0;
        this.isConnecting = false;
        resolve(true);
      });

      // 连接错误
      this.socket.on('connect_error', (error) => {
        console.error('[WebSocket] 连接错误:', error.message);
        this.isConnecting = false;
        resolve(false);
      });

      // 断开连接
      this.socket.on('disconnect', (reason) => {
        console.log('[WebSocket] 断开连接:', reason);
        this.isConnecting = false;
      });

      // 重连尝试
      this.socket.io.on('reconnect_attempt', (attempt) => {
        console.log(`[WebSocket] 重连尝试 ${attempt}/${this.maxReconnectAttempts}`);
        this.reconnectAttempts = attempt;
      });

      // 注册事件监听
      this.setupEventListeners();
    });
  }

  // 断开连接
  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    this.eventListeners.clear();
  }

  // 设置事件监听
  private setupEventListeners() {
    if (!this.socket) return;

    // 订单状态变更
    this.socket.on('order:status_changed', (data: OrderStatusEvent) => {
      this.emit('order:status_changed', data);
    });

    // 新通知
    this.socket.on('notification:new', (data: NewNotificationEvent) => {
      this.emit('notification:new', data);
    });

    // 工单回复
    this.socket.on('ticket:reply', (data: TicketReplyEvent) => {
      this.emit('ticket:reply', data);
    });
  }

  // 发送心跳
  ping() {
    if (this.socket?.connected) {
      this.socket.emit('ping');
    }
  }

  // 订阅商品
  subscribeProduct(productId: string) {
    if (this.socket?.connected) {
      this.socket.emit('subscribe:product', productId);
    }
  }

  // 取消订阅商品
  unsubscribeProduct(productId: string) {
    if (this.socket?.connected) {
      this.socket.emit('unsubscribe:product', productId);
    }
  }

  // 添加事件监听器
  on<K extends keyof WebSocketEvents>(
    event: K, 
    callback: EventCallback<WebSocketEvents[K]>
  ): () => void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, new Set());
    }
    this.eventListeners.get(event)!.add(callback as EventCallback);

    // 返回取消订阅函数
    return () => {
      this.eventListeners.get(event)?.delete(callback as EventCallback);
    };
  }

  // 移除事件监听器
  off<K extends keyof WebSocketEvents>(
    event: K, 
    callback: EventCallback<WebSocketEvents[K]>
  ) {
    this.eventListeners.get(event)?.delete(callback as EventCallback);
  }

  // 触发事件
  private emit(event: string, data: unknown) {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.forEach((callback) => callback(data));
    }
  }

  // 检查连接状态
  get isConnected(): boolean {
    return this.socket?.connected ?? false;
  }

  // 获取重连次数
  get reconnectCount(): number {
    return this.reconnectAttempts;
  }
}

// 单例导出
export const wsService = new WebSocketService();
export default wsService;