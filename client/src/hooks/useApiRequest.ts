import { useEffect, useRef, useCallback } from 'react';
import {
  createAbortController,
  cancelRequests,
  isRequestCancelled,
} from '@/services/apiClient';

/**
 * useApiRequest
 *
 * 提供与组件生命周期绑定的请求取消能力：
 * - 组件卸载时自动 abort 所有由该 Hook 发起的请求
 * - 支持手动取消单个或全部请求
 * - 自动过滤「请求被取消」导致的错误，避免 catch 中误报
 *
 * @example
 * ```tsx
 * const { getSignal, cancelAll } = useApiRequest();
 *
 * useEffect(() => {
 *   const signal = getSignal('fetchProducts');
 *   productsService.getProducts({ page: 1 }, signal)
 *     .then(res => setData(res.data))
 *     .catch(err => {
 *       if (!isRequestCancelled(err)) setError(err);
 *     });
 * }, [getSignal]);
 * ```
 */
export function useApiRequest() {
  // 记录本组件注册的所有请求 key
  const registeredKeys = useRef<Set<string>>(new Set());

  /**
   * 为指定 key 创建 AbortController 并返回其 signal。
   * 若同名请求还在进行中，会先取消旧的（防止重复请求）。
   */
  const getSignal = useCallback((key: string): AbortSignal => {
    registeredKeys.current.add(key);
    const controller = createAbortController(key);
    return controller.signal;
  }, []);

  /**
   * 手动取消所有由当前 Hook 实例注册的请求
   */
  const cancelAll = useCallback((): void => {
    cancelRequests(Array.from(registeredKeys.current));
    registeredKeys.current.clear();
  }, []);

  // 组件卸载时自动取消全部请求
  useEffect(() => {
    return () => {
      cancelRequests(Array.from(registeredKeys.current));
    };
  }, []);

  return { getSignal, cancelAll, isRequestCancelled };
}

export { isRequestCancelled };




















