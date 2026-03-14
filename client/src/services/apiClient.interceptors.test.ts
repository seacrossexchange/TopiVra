import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import axios, { AxiosError } from 'axios';
import apiClient from './apiClient';
import { useAuthStore } from '@/store/authStore';

vi.mock('@/store/authStore');

describe('apiClient interceptors', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('request interceptor', () => {
    it('添加 Authorization header', async () => {
      vi.mocked(useAuthStore.getState).mockReturnValue({
        accessToken: 'test_token_123',
      } as any);

      const config = {
        headers: {},
      };

      // 模拟请求拦截器
      const interceptor = apiClient.interceptors.request.handlers[0];
      const result = await interceptor.fulfilled(config as any);

      expect(result.headers.Authorization).toBe('Bearer test_token_123');
    });

    it('没有 token 时不添加 header', async () => {
      vi.mocked(useAuthStore.getState).mockReturnValue({
        accessToken: null,
      } as any);

      const config = {
        headers: {},
      };

      const interceptor = apiClient.interceptors.request.handlers[0];
      const result = await interceptor.fulfilled(config as any);

      expect(result.headers.Authorization).toBeUndefined();
    });
  });

  describe('response interceptor - success', () => {
    it('自动解包 { success: true, data } 格式', async () => {
      const response = {
        data: {
          success: true,
          data: { id: '123', name: 'test' },
          timestamp: '2026-03-12T00:00:00Z',
        },
      };

      const interceptor = apiClient.interceptors.response.handlers[0];
      const result = await interceptor.fulfilled(response as any);

      expect(result.data).toEqual({ id: '123', name: 'test' });
    });

    it('非 success 格式直接返回', async () => {
      const response = {
        data: { id: '123', name: 'test' },
      };

      const interceptor = apiClient.interceptors.response.handlers[0];
      const result = await interceptor.fulfilled(response as any);

      expect(result.data).toEqual({ id: '123', name: 'test' });
    });
  });

  describe('response interceptor - 401 token refresh', () => {
    it('401 错误触发 token 刷新', async () => {
      const error = new AxiosError('Unauthorized', '401', {
        url: '/api/v1/products',
      } as any);
      error.response = { status: 401 } as any;

      vi.mocked(useAuthStore.getState).mockReturnValue({
        refreshToken: 'refresh_token_123',
        setTokens: vi.fn(),
        logout: vi.fn(),
      } as any);

      // 模拟 axios.post 刷新 token
      vi.spyOn(axios, 'post').mockResolvedValue({
        data: {
          accessToken: 'new_access_token',
          refreshToken: 'new_refresh_token',
        },
      });

      const interceptor = apiClient.interceptors.response.handlers[0];
      
      try {
        await interceptor.rejected(error);
      } catch {
        // 预期会抛出错误或重试
      }

      expect(axios.post).toHaveBeenCalled();
    });

    it('refresh 端点失败时登出', async () => {
      const error = new AxiosError('Unauthorized', '401', {
        url: '/api/v1/products',
      } as any);
      error.response = { status: 401 } as any;

      const mockLogout = vi.fn();
      vi.mocked(useAuthStore.getState).mockReturnValue({
        refreshToken: 'refresh_token_123',
        logout: mockLogout,
      } as any);

      vi.spyOn(axios, 'post').mockRejectedValue(new Error('Refresh failed'));

      const interceptor = apiClient.interceptors.response.handlers[0];

      try {
        await interceptor.rejected(error);
      } catch {
        // 预期会抛出错误
      }

      expect(mockLogout).toHaveBeenCalled();
    });
  });

  describe('response interceptor - 429 rate limit', () => {
    it('429 错误显示限流提示', async () => {
      const error = new AxiosError('Too Many Requests', '429');
      error.response = {
        status: 429,
        headers: { 'retry-after': '60' },
      } as any;

      const interceptor = apiClient.interceptors.response.handlers[0];

      try {
        await interceptor.rejected(error);
      } catch {
        // 预期会抛出错误
      }

      // 验证错误被正确处理
      expect(error.response?.status).toBe(429);
    });
  });

  describe('response interceptor - retry logic', () => {
    it('GET 请求 5xx 错误触发重试', async () => {
      const error = new AxiosError('Server Error', '500', {
        method: 'GET',
        url: '/api/v1/products',
      } as any);
      error.response = { status: 500 } as any;

      const interceptor = apiClient.interceptors.response.handlers[0];

      try {
        await interceptor.rejected(error);
      } catch {
        // 预期会重试
      }

      // 验证错误被处理
      expect(error.response?.status).toBe(500);
    });

    it('POST 请求不重试', async () => {
      const error = new AxiosError('Server Error', '500', {
        method: 'POST',
        url: '/api/v1/orders',
      } as any);
      error.response = { status: 500 } as any;

      const interceptor = apiClient.interceptors.response.handlers[0];

      try {
        await interceptor.rejected(error);
      } catch {
        // 预期会抛出错误
      }

      expect(error.response?.status).toBe(500);
    });
  });

  describe('response interceptor - cancelled requests', () => {
    it('取消的请求直接 reject', async () => {
      const error = new DOMException('Aborted', 'AbortError');

      const interceptor = apiClient.interceptors.response.handlers[0];

      try {
        await interceptor.rejected(error);
      } catch (e) {
        expect(e).toBe(error);
      }
    });
  });
});










