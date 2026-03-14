import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useDeliveryStream, DeliveryEvent } from './useDeliveryStream';

// ---- mock zustand authStore ----
vi.mock('@/store/authStore', () => ({
  useAuthStore: (selector: (s: any) => any) => selector({ accessToken: 'test-token' }),
}));

// ---- mock EventSource ----
class MockEventSource {
  static instances: MockEventSource[] = [];

  url: string;
  onopen: (() => void) | null = null;
  onmessage: ((e: { data: string }) => void) | null = null;
  onerror: (() => void) | null = null;
  closed = false;
  listeners: Record<string, ((e: any) => void)[]> = {};

  constructor(url: string) {
    this.url = url;
    MockEventSource.instances.push(this);
  }

  /** 模拟服务器推送一条消息 */
  pushMessage(data: DeliveryEvent) {
    this.onmessage?.({ data: JSON.stringify(data) });
  }

  /** 模拟连接建立 */
  open() {
    this.onopen?.();
  }

  /** 模拟连接错误 */
  triggerError() {
    this.onerror?.();
  }

  close() {
    this.closed = true;
  }
}

const now = Date.now();

const makeEvent = (overrides: Partial<DeliveryEvent>): DeliveryEvent => ({
  orderId: 'order-1',
  type: 'STARTED',
  timestamp: now,
  ...overrides,
});

describe('useDeliveryStream', () => {
  beforeEach(() => {
    MockEventSource.instances = [];
    vi.stubGlobal('EventSource', MockEventSource);
    vi.stubGlobal('import.meta', { env: { VITE_API_URL: '/api' } });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('初始状态 idle，events 为空', () => {
    const { result } = renderHook(() => useDeliveryStream('order-1'));
    expect(result.current.status).toBe('idle');
    expect(result.current.events).toHaveLength(0);
    expect(result.current.progress).toBe(0);
    expect(result.current.allSuccess).toBeNull();
  });

  it('调用 start 后状态变为 connecting 并创建 EventSource', () => {
    const { result } = renderHook(() => useDeliveryStream('order-1'));

    act(() => { result.current.start(); });

    expect(result.current.status).toBe('connecting');
    expect(MockEventSource.instances).toHaveLength(1);
    expect(MockEventSource.instances[0].url).toContain('/api/orders/order-1/delivery-stream');
    expect(MockEventSource.instances[0].url).toContain('token=test-token');
  });

  it('onopen 触发后状态变为 streaming', async () => {
    const { result } = renderHook(() => useDeliveryStream('order-1'));
    act(() => { result.current.start(); });

    act(() => { MockEventSource.instances[0].open(); });

    await waitFor(() => expect(result.current.status).toBe('streaming'));
  });

  it('接收 ITEM_SUCCESS 事件后更新进度', async () => {
    const { result } = renderHook(() => useDeliveryStream('order-1'));
    act(() => { result.current.start(); });
    act(() => { MockEventSource.instances[0].open(); });

    act(() => {
      MockEventSource.instances[0].pushMessage(
        makeEvent({ type: 'ITEM_SUCCESS', itemIndex: 1, totalItems: 2, accountCount: 1 }),
      );
    });

    await waitFor(() => expect(result.current.progress).toBe(50));
    expect(result.current.events).toHaveLength(1);
  });

  it('接收 COMPLETED 事件后进度 100，状态 completed，allSuccess=true，连接关闭', async () => {
    const { result } = renderHook(() => useDeliveryStream('order-1'));
    act(() => { result.current.start(); });
    act(() => { MockEventSource.instances[0].open(); });

    act(() => {
      MockEventSource.instances[0].pushMessage(
        makeEvent({ type: 'COMPLETED', success: true }),
      );
    });

    await waitFor(() => {
      expect(result.current.status).toBe('completed');
      expect(result.current.progress).toBe(100);
      expect(result.current.allSuccess).toBe(true);
      expect(MockEventSource.instances[0].closed).toBe(true);
    });
  });

  it('接收 PARTIAL_FAILED 后 allSuccess=false，状态 completed', async () => {
    const { result } = renderHook(() => useDeliveryStream('order-1'));
    act(() => { result.current.start(); });
    act(() => { MockEventSource.instances[0].open(); });

    act(() => {
      MockEventSource.instances[0].pushMessage(
        makeEvent({ type: 'PARTIAL_FAILED', success: false }),
      );
    });

    await waitFor(() => {
      expect(result.current.status).toBe('completed');
      expect(result.current.allSuccess).toBe(false);
    });
  });

  it('onerror 触发后状态变为 error，连接关闭', async () => {
    const { result } = renderHook(() => useDeliveryStream('order-1'));
    act(() => { result.current.start(); });

    act(() => { MockEventSource.instances[0].triggerError(); });

    await waitFor(() => {
      expect(result.current.status).toBe('error');
      expect(MockEventSource.instances[0].closed).toBe(true);
    });
  });

  it('orderId 为 undefined 时 start 不创建 EventSource', () => {
    const { result } = renderHook(() => useDeliveryStream(undefined));
    act(() => { result.current.start(); });
    expect(MockEventSource.instances).toHaveLength(0);
    expect(result.current.status).toBe('idle');
  });
});










