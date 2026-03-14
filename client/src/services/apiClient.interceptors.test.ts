import { describe, it, expect, beforeEach, vi } from 'vitest';
import axios from 'axios';
import MockAdapter from 'axios-mock-adapter';
import apiClient, { createAbortController, cancelRequest, isRequestCancelled } from '../apiClient';

describe('apiClient', () => {
  let mock: MockAdapter;

  beforeEach(() => {
    mock = new MockAdapter(axios);
    vi.clearAllMocks();
  });

  afterEach(() => {
    mock.restore();
  });

  describe('Request Interceptor', () => {
    it('should add authorization header when token exists', async () => {
      mock.onGet('/test').reply(200, { data: 'success' });

      // Mock auth store
      const mockToken = 'test-token';
      vi.mock('@/store/authStore', () => ({
        useAuthStore: {
          getState: () => ({ accessToken: mockToken }),
        },
      }));

      await apiClient.get('/test');

      expect(mock.history.get[0].headers?.Authorization).toBe(`Bearer ${mockToken}`);
    });
  });

  describe('Response Interceptor', () => {
    it('should unwrap success response', async () => {
      mock.onGet('/test').reply(200, {
        success: true,
        data: { message: 'test' },
        timestamp: new Date().toISOString(),
      });

      const response = await apiClient.get('/test');

      expect(response.data).toEqual({ message: 'test' });
    });

    it('should handle 429 rate limit', async () => {
      mock.onGet('/test').reply(429, {}, { 'retry-after': '60' });

      try {
        await apiClient.get('/test');
      } catch (error: any) {
        expect(error.response.status).toBe(429);
      }
    });

    it('should retry GET requests on 5xx errors', async () => {
      mock
        .onGet('/test')
        .replyOnce(500)
        .onGet('/test')
        .replyOnce(500)
        .onGet('/test')
        .reply(200, { success: true, data: 'success' });

      const response = await apiClient.get('/test');

      expect(response.data).toBe('success');
      expect(mock.history.get.length).toBe(3);
    });

    it('should not retry POST requests', async () => {
      mock.onPost('/test').reply(500);

      try {
        await apiClient.post('/test', {});
      } catch (error: any) {
        expect(error.response.status).toBe(500);
      }

      expect(mock.history.post.length).toBe(1);
    });
  });

  describe('AbortController Management', () => {
    it('should create abort controller', () => {
      const controller = createAbortController('test-key');

      expect(controller).toBeInstanceOf(AbortController);
      expect(controller.signal.aborted).toBe(false);
    });

    it('should cancel request by key', () => {
      const controller = createAbortController('test-key');
      
      cancelRequest('test-key');

      expect(controller.signal.aborted).toBe(true);
    });

    it('should identify cancelled requests', () => {
      const cancelError = new Error('canceled');
      
      expect(isRequestCancelled(cancelError)).toBe(true);
    });
  });
});
