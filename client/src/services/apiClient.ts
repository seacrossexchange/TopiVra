import axios, { AxiosError } from 'axios';
import type { InternalAxiosRequestConfig } from 'axios';
import { message } from 'antd';
import { useAuthStore } from '@/store/authStore';
import { handleApiError } from '@/utils/errorHandler';

// ─── 重试配置 ──────────────────────────────────────────────────────────────────
const MAX_RETRY_COUNT = 3;
const RETRY_DELAY_BASE = 500; // ms，指数退避基数

/** 判断该请求是否可以重试（仅 GET + 5xx 或网络错误） */
function shouldRetry(error: AxiosError, retryCount: number): boolean {
  if (retryCount >= MAX_RETRY_COUNT) return false;
  const method = error.config?.method?.toUpperCase();
  if (method !== 'GET') return false;
  // 网络错误（无响应）可重试
  if (!error.response) return true;
  // 5xx 服务端错误可重试
  return error.response.status >= 500;
}

/** 指数退避延迟 */
function retryDelay(retryCount: number): Promise<void> {
  const delay = RETRY_DELAY_BASE * Math.pow(2, retryCount);
  return new Promise((resolve) => setTimeout(resolve, delay));
}

// ──────────────────────────────────────────────────────────────────────────────

// Create axios instance with base configuration
const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api/v1',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Flag to prevent multiple refresh attempts
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (value?: unknown) => void;
  reject: (error?: unknown) => void;
}> = [];

// Process the failed queue
const processQueue = (error: AxiosError | null) => {
  failedQueue.forEach((promise) => {
    if (error) {
      promise.reject(error);
    } else {
      promise.resolve();
    }
  });
  failedQueue = [];
};

// ─── AbortController 请求取消管理器 ────────────────────────────────────────────

/**
 * 全局请求注册表：requestKey → AbortController
 * 用于在组件卸载时批量取消属于该组件的请求
 */
const requestRegistry = new Map<string, AbortController>();

/**
 * 为某个请求 key 创建（或复用）AbortController，并返回其 signal。
 * 若该 key 已存在且未被 abort，则先 abort 旧的再创建新的（防重复请求）。
 */
export function createAbortController(key: string): AbortController {
  const existing = requestRegistry.get(key);
  if (existing && !existing.signal.aborted) {
    existing.abort('duplicate');
  }
  const controller = new AbortController();
  requestRegistry.set(key, controller);
  return controller;
}

/**
 * 取消并移除指定 key 的请求
 */
export function cancelRequest(key: string, reason?: string): void {
  const controller = requestRegistry.get(key);
  if (controller && !controller.signal.aborted) {
    controller.abort(reason ?? 'cancelled');
  }
  requestRegistry.delete(key);
}

/**
 * 批量取消一组 key 的请求（组件卸载时调用）
 */
export function cancelRequests(keys: string[]): void {
  keys.forEach((key) => cancelRequest(key, 'component-unmounted'));
}

/**
 * 检查某个错误是否由 AbortController 取消引起（非真实错误，可忽略）
 */
export function isRequestCancelled(error: unknown): boolean {
  if (axios.isCancel(error)) return true;
  if (error instanceof DOMException && error.name === 'AbortError') return true;
  if (error instanceof Error && error.message === 'canceled') return true;
  return false;
}

// ──────────────────────────────────────────────────────────────────────────────

// Request interceptor - add auth token
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const { accessToken } = useAuthStore.getState();

    if (accessToken && config.headers) {
      config.headers.Authorization = `Bearer ${accessToken}`;
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor - handle token refresh, rate limiting, retry and errors
apiClient.interceptors.response.use(
  (response) => {
    // 自动解包后端统一响应格式 { success: true, data: T, timestamp: string }
    const body = response.data;
    if (
      body !== null &&
      typeof body === 'object' &&
      'success' in body &&
      body.success === true &&
      'data' in body
    ) {
      response.data = body.data;
    }
    return response;
  },
  async (error: AxiosError) => {
    // 被取消的请求直接 reject，不走错误处理
    if (isRequestCancelled(error)) {
      return Promise.reject(error);
    }

    const originalRequest = error.config as InternalAxiosRequestConfig & {
      _retry?: boolean;
      _retryCount?: number;
    };

    // ─── 429 限流：显示友好提示 ───────────────────────────────────────────────
    if (error.response?.status === 429) {
      // 尝试从响应头获取重试等待时间
      const retryAfter = error.response.headers['retry-after'];
      if (retryAfter) {
        const seconds = parseInt(retryAfter, 10);
        message.warning(`操作过于频繁，请 ${seconds} 秒后再试`, seconds);
      } else {
        message.warning('操作过于频繁，请稍后再试');
      }
      return Promise.reject(error);
    }

    // ─── GET + 5xx 指数退避重试 ──────────────────────────────────────────────
    const retryCount = originalRequest._retryCount ?? 0;
    if (shouldRetry(error, retryCount)) {
      originalRequest._retryCount = retryCount + 1;
      await retryDelay(retryCount);
      return apiClient(originalRequest);
    }

    // ─── 401 Token 刷新 ──────────────────────────────────────────────────────
    if (error.response?.status !== 401 || originalRequest._retry) {
      handleApiError(error);
      return Promise.reject(error);
    }

    // refresh 请求本身失败，直接登出
    if (originalRequest.url === '/auth/refresh') {
      useAuthStore.getState().logout();
      window.location.href = '/login';
      return Promise.reject(error);
    }

    // 已在刷新中，排队等待
    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        failedQueue.push({ resolve, reject });
      })
        .then(() => apiClient(originalRequest))
        .catch((err) => Promise.reject(err));
    }

    // 发起 token 刷新
    isRefreshing = true;
    originalRequest._retry = true;

    try {
      const { refreshToken } = useAuthStore.getState();

      if (!refreshToken) {
        throw new Error('No refresh token available');
      }

      const response = await axios.post(
        `${import.meta.env.VITE_API_BASE_URL || '/api/v1'}/auth/refresh`,
        { refreshToken }
      );

      // 后端响应可能被包装为 { success, data } 或直接返回 tokens
      const payload = response.data?.accessToken ? response.data : response.data?.data ?? response.data;
      const { accessToken, refreshToken: newRefreshToken } = payload;

      useAuthStore.getState().setTokens({
        accessToken,
        refreshToken: newRefreshToken || refreshToken,
      });

      processQueue(null);

      if (originalRequest.headers) {
        originalRequest.headers.Authorization = `Bearer ${accessToken}`;
      }

      return apiClient(originalRequest);
    } catch (refreshError) {
      processQueue(refreshError as AxiosError);
      useAuthStore.getState().logout();
      window.location.href = '/login';
      return Promise.reject(refreshError);
    } finally {
      isRefreshing = false;
    }
  }
);

export default apiClient;
export { apiClient };
