import { describe, it, expect } from 'vitest';
import axios from 'axios';
import type { AxiosInstance } from 'axios';
import { isRequestCancelled, createAbortController, cancelRequest, apiClient } from '../apiClient';

describe('apiClient utilities', () => {
  describe('isRequestCancelled', () => {
    it('识别 axios cancel 错误', () => {
      const error = new axios.Cancel('Request cancelled');
      expect(isRequestCancelled(error)).toBe(true);
    });

    it('识别 AbortError', () => {
      const error = new DOMException('Aborted', 'AbortError');
      expect(isRequestCancelled(error)).toBe(true);
    });

    it('识别 canceled 消息错误', () => {
      const error = new Error('canceled');
      expect(isRequestCancelled(error)).toBe(true);
    });

    it('非取消错误返回 false', () => {
      const error = new Error('Network error');
      expect(isRequestCancelled(error)).toBe(false);
    });

    it('null 返回 false', () => {
      expect(isRequestCancelled(null)).toBe(false);
    });
  });

  describe('createAbortController', () => {
    it('创建新的 AbortController', () => {
      const controller = createAbortController('test-key');
      expect(controller).toBeInstanceOf(AbortController);
      expect(controller.signal.aborted).toBe(false);
    });

    it('同名 key 会先 abort 旧的再创建新的', () => {
      const controller1 = createAbortController('same-key');
      expect(controller1.signal.aborted).toBe(false);

      const controller2 = createAbortController('same-key');
      expect(controller1.signal.aborted).toBe(true);
      expect(controller2.signal.aborted).toBe(false);
    });
  });

  describe('cancelRequest', () => {
    it('取消指定 key 的请求', () => {
      const controller = createAbortController('cancel-test');
      expect(controller.signal.aborted).toBe(false);

      cancelRequest('cancel-test');
      expect(controller.signal.aborted).toBe(true);
    });

    it('取消不存在的 key 不报错', () => {
      expect(() => {
        cancelRequest('non-existent-key');
      }).not.toThrow();
    });
  });
});

describe('apiClient (smoke)', () => {
  it('should expose axios-like methods', () => {
    const client = apiClient as unknown as AxiosInstance;
    expect(typeof client.get).toBe('function');
    expect(typeof client.post).toBe('function');
    expect(typeof client.put).toBe('function');
    expect(typeof client.delete).toBe('function');
  });
});
