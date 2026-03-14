import { useEffect, useRef, useState } from 'react';
import { useAuthStore } from '@/store/authStore';

export type DeliveryEventType =
  | 'STARTED'
  | 'ITEM_PROCESSING'
  | 'ITEM_SUCCESS'
  | 'ITEM_FAILED'
  | 'COMPLETED'
  | 'PARTIAL_FAILED'
  | 'ERROR';

export interface DeliveryEvent {
  orderId: string;
  type: DeliveryEventType;
  itemIndex?: number;
  totalItems?: number;
  productTitle?: string;
  accountCount?: number;
  error?: string;
  success?: boolean;
  timestamp: number;
}

export type StreamStatus = 'idle' | 'connecting' | 'streaming' | 'completed' | 'error';

export interface UseDeliveryStreamResult {
  events: DeliveryEvent[];
  status: StreamStatus;
  /** 最新进度百分比 0-100 */
  progress: number;
  /** 是否全部成功 */
  allSuccess: boolean | null;
  /** 开始监听（在触发支付完成后调用） */
  start: () => void;
  /** 手动停止监听 */
  stop: () => void;
}

const API_BASE = import.meta.env.VITE_API_URL ?? '/api';

export function useDeliveryStream(orderId: string | undefined): UseDeliveryStreamResult {
  const [events, setEvents] = useState<DeliveryEvent[]>([]);
  const [status, setStatus] = useState<StreamStatus>('idle');
  const [progress, setProgress] = useState(0);
  const [allSuccess, setAllSuccess] = useState<boolean | null>(null);
  const esRef = useRef<EventSource | null>(null);
  const accessToken = useAuthStore((s) => s.accessToken);

  const stop = () => {
    esRef.current?.close();
    esRef.current = null;
  };

  const start = () => {
    if (!orderId) return;
    stop();

    setEvents([]);
    setProgress(0);
    setAllSuccess(null);
    setStatus('connecting');

    const url = `${API_BASE}/orders/${orderId}/delivery-stream${accessToken ? `?token=${encodeURIComponent(accessToken)}` : ''}`;
    const es = new EventSource(url);
    esRef.current = es;

    es.onopen = () => setStatus('streaming');

    es.onmessage = (e: MessageEvent) => {
      try {
        const event: DeliveryEvent = JSON.parse(e.data as string);
        setEvents((prev) => [...prev, event]);

        if (event.type === 'ITEM_SUCCESS' || event.type === 'ITEM_FAILED') {
          if (event.itemIndex != null && event.totalItems) {
            setProgress(Math.round((event.itemIndex / event.totalItems) * 100));
          }
        }

        if (event.type === 'COMPLETED') {
          setProgress(100);
          setAllSuccess(true);
          setStatus('completed');
          stop();
        } else if (event.type === 'PARTIAL_FAILED' || event.type === 'ERROR') {
          setAllSuccess(false);
          setStatus('completed');
          stop();
        }
      } catch {
        // ignore malformed frames
      }
    };

    es.onerror = () => {
      setStatus('error');
      stop();
    };
  };

  // 组件卸载时关闭连接
  useEffect(() => () => stop(), []);

  return { events, status, progress, allSuccess, start, stop };
}

