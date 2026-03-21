import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import MockAdapter from 'axios-mock-adapter';
import apiClient, { createAbortController, cancelRequest, isRequestCancelled } from './apiClient';
import { useAuthStore } from '@/store/authStore';

describe('apiClient', () => {
  let mock: MockAdapter;

  beforeEach(() => {
    mock = new MockAdapter(apiClient);
    useAuthStore.setState({
      accessToken: null,
      refreshToken: null,
      user: null,
      isAuthenticated: false,
      isLoading: false,
      isBootstrapping: false,
      hasHydrated: true,
      error: null,
    });
    vi.clearAllMocks();
  });

  afterEach(() => {
    mock.restore();
  });

  describe('Request Interceptor', () => {
    it('should add authorization header when token exists', async () => {
      mock.onGet('/test').reply(200, { data: 'success' });

      const mockToken = 'test-token';
      useAuthStore.setState({ accessToken: mockToken, isAuthenticated: true });

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

      await expect(apiClient.get('/test')).rejects.toMatchObject({
        response: { status: 429 },
      });
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

      await expect(apiClient.post('/test', {})).rejects.toMatchObject({
        response: { status: 500 },
      });

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
