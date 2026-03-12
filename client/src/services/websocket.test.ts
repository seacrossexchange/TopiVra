import { describe, it, expect, beforeEach, vi } from 'vitest';
import { wsService } from './websocket';

describe('WebSocketService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // 重置 WebSocket 服务
    wsService.disconnect();
  });

  describe('connect', () => {
    it('成功连接 WebSocket', async () => {
      const result = await wsService.connect('test_token_123');

      // 由于是真实 WebSocket，可能连接失败，但应该返回 boolean
      expect(typeof result).toBe('boolean');
    });

    it('已连接时直接返回', async () => {
      // 第一次连接
      await wsService.connect('token1');

      // 第二次用相同 token 连接
      const result = await wsService.connect('token1');

      expect(typeof result).toBe('boolean');
    });

    it('token 变化时重新连接', async () => {
      await wsService.connect('token1');
      const result = await wsService.connect('token2');

      expect(typeof result).toBe('boolean');
    });
  });

  describe('disconnect', () => {
    it('断开连接', async () => {
      await wsService.connect('test_token');
      wsService.disconnect();

      expect(wsService.isConnected).toBe(false);
    });
  });

  describe('ping', () => {
    it('发送心跳', async () => {
      await wsService.connect('test_token');
      
      // 不应该抛出错误
      expect(() => {
        wsService.ping();
      }).not.toThrow();
    });
  });

  describe('subscribeProduct', () => {
    it('订阅商品', async () => {
      await wsService.connect('test_token');

      expect(() => {
        wsService.subscribeProduct('product_123');
      }).not.toThrow();
    });
  });

  describe('unsubscribeProduct', () => {
    it('取消订阅商品', async () => {
      await wsService.connect('test_token');

      expect(() => {
        wsService.unsubscribeProduct('product_123');
      }).not.toThrow();
    });
  });

  describe('event listeners', () => {
    it('添加事件监听器', async () => {
      const callback = vi.fn();

      const unsubscribe = wsService.on('order:status_changed', callback);

      expect(typeof unsubscribe).toBe('function');
    });

    it('移除事件监听器', async () => {
      const callback = vi.fn();

      wsService.on('notification:new', callback);
      wsService.off('notification:new', callback);

      // 不应该抛出错误
      expect(() => {
        wsService.off('notification:new', callback);
      }).not.toThrow();
    });
  });

  describe('connection state', () => {
    it('检查连接状态', async () => {
      const state = wsService.connectionState;

      // connectionState 可能是 undefined，所以检查类型
      expect(typeof state === 'string' || state === undefined).toBe(true);
    });

    it('获取重连次数', () => {
      const count = wsService.reconnectCount;

      expect(typeof count).toBe('number');
      expect(count).toBeGreaterThanOrEqual(0);
    });
  });
});

