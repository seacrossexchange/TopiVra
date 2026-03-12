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
  private maxReconnectAttempts = 10; // 增加重连次数
  private reconnectDelay = 1000;
  private maxReconnectDelay = 30000; // 最大重连延迟 30 秒
  private isConnecting = false;
  private eventListeners: Map<string, Set<EventCallback>> = new Map();
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private heartbeatTimeout: NodeJS.Timeout | null = null;
  private lastPongTime: number = 0;
  private connectionQuality: 'good' | 'poor' | 'disconnected' = 'disconnected';
  private token: string | null = null;

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
      this.token = token;
      const url = this.getWebSocketUrl();

      this.socket = io(url, {
        auth: { token },
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionAttempts: this.maxReconnectAttempts,
        reconnectionDelay: this.reconnectDelay,
        reconnectionDelayMax: this.maxReconnectDelay,
        timeout: 10000, // 连接超时 10 秒
        autoConnect: true,
      });

      // 连接成功
      this.socket.on('connect', () => {
        console.log('[WebSocket] 连接成功');
        this.reconnectAttempts = 0;
        this.isConnecting = false;
        this.connectionQuality = 'good';
        this.startHeartbeat(); // 启动心跳
        resolve(true);
      });

      // 连接错误
      this.socket.on('connect_error', (error) => {
        console.error('[WebSocket] 连接错误:', error.message);
        this.isConnecting = false;
        this.connectionQuality = 'disconnected';
        
        // 指数退避重连
        this.reconnectAttempts++;
        const delay = Math.min(
          this.reconnectDelay * Math.pow(2, this.reconnectAttempts),
          this.maxReconnectDelay
        );
        console.log(`[WebSocket] 将在 ${delay}ms 后重连`);
        
        resolve(false);
      });

      // 断开连接
      this.socket.on('disconnect', (reason) => {
        console.log('[WebSocket] 断开连接:', reason);
        this.isConnecting = false;
        this.connectionQuality = 'disconnected';
        this.stopHeartbeat(); // 停止心跳
        
        // 如果是服务器主动断开，尝试重连
        if (reason === 'io server disconnect') {
          this.socket?.connect();
        }
      });

      // 重连尝试
      this.socket.io.on('reconnect_attempt', (attempt) => {
        console.log(`[WebSocket] 重连尝试 ${attempt}/${this.maxReconnectAttempts}`);
        this.reconnectAttempts = attempt;
        this.connectionQuality = 'poor';
      });

      // 重连成功
      this.socket.io.on('reconnect', (attempt) => {
        console.log(`[WebSocket] 重连成功 (尝试 ${attempt} 次)`);
        this.reconnectAttempts = 0;
        this.connectionQuality = 'good';
      });

      // 重连失败
      this.socket.io.on('reconnect_failed', () => {
        console.error('[WebSocket] 重连失败，已达到最大重连次数');
        this.connectionQuality = 'disconnected';
      });

      // 注册事件监听
      this.setupEventListeners();
    });
  }

  // 启动心跳检测
  private startHeartbeat() {
    this.stopHeartbeat(); // 先停止旧的心跳
    
    // 每 30 秒发送一次心跳
    this.heartbeatInterval = setInterval(() => {
      if (this.socket?.connected) {
        const startTime = Date.now();
        this.socket.emit('ping', { timestamp: startTime });
        
        // 设置心跳超时（5 秒）
        this.heartbeatTimeout = setTimeout(() => {
          console.warn('[WebSocket] 心跳超时，连接质量差');
          this.connectionQuality = 'poor';
          
          // 如果连续 3 次心跳超时，主动重连
          if (Date.now() - this.lastPongTime > 90000) {
            console.warn('[WebSocket] 长时间无响应，主动重连');
            this.socket?.disconnect();
            this.socket?.connect();
          }
        }, 5000);
      }
    }, 30000);
  }

  // 停止心跳检测
  private stopHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
    if (this.heartbeatTimeout) {
      clearTimeout(this.heartbeatTimeout);
      this.heartbeatTimeout = null;
    }
  }

  // 断开连接
  disconnect() {
    this.stopHeartbeat();
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    this.eventListeners.clear();
    this.connectionQuality = 'disconnected';
    this.token = null;
  }

  // 手动重连
  reconnect() {
    if (this.token) {
      this.disconnect();
      return this.connect(this.token);
    }
    return Promise.resolve(false);
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

    // 心跳响应
    this.socket.on('pong', (data: { timestamp: number }) => {
      this.lastPongTime = Date.now();
      const latency = this.lastPongTime - data.timestamp;
      
      // 清除心跳超时
      if (this.heartbeatTimeout) {
        clearTimeout(this.heartbeatTimeout);
        this.heartbeatTimeout = null;
      }
      
      // 根据延迟判断连接质量
      if (latency < 200) {
        this.connectionQuality = 'good';
      } else if (latency < 1000) {
        this.connectionQuality = 'poor';
      }
      
      console.log(`[WebSocket] 心跳延迟: ${latency}ms, 质量: ${this.connectionQuality}`);
      this.emit('pong', { timestamp: data.timestamp.toString() });
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

  // 获取连接质量
  get quality(): 'good' | 'poor' | 'disconnected' {
    return this.connectionQuality;
  }

  // 获取最后心跳时间
  get lastHeartbeat(): number {
    return this.lastPongTime;
  }
}

// 单例导出
export const wsService = new WebSocketService();
export default wsService;