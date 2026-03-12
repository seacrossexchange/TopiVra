import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as authApi from './auth';
import apiClient from './apiClient';

vi.mock('./apiClient');

describe('auth service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('login', () => {
    it('成功登录返回用户和 token', async () => {
      const mockResponse = {
        data: {
          accessToken: 'access_token_123',
          refreshToken: 'refresh_token_456',
          user: { id: 'u1', email: 'test@example.com', username: 'testuser' },
        },
      };

      vi.mocked(apiClient.post).mockResolvedValue(mockResponse);

      const result = await authApi.authApi.login('test@example.com', 'password123');

      expect(result.data.accessToken).toBe('access_token_123');
      expect(result.data.user.email).toBe('test@example.com');
      expect(apiClient.post).toHaveBeenCalledWith('/auth/login', {
        email: 'test@example.com',
        password: 'password123',
      });
    });

    it('登录失败返回错误', async () => {
      vi.mocked(apiClient.post).mockRejectedValue(new Error('Invalid credentials'));

      try {
        await authApi.authApi.login('test@example.com', 'wrong');
      } catch (error) {
        expect((error as Error).message).toBe('Invalid credentials');
      }
    });
  });

  describe('register', () => {
    it('成功注册返回用户信息', async () => {
      const mockResponse = {
        data: {
          id: 'u1',
          email: 'newuser@example.com',
          username: 'newuser',
        },
      };

      vi.mocked(apiClient.post).mockResolvedValue(mockResponse);

      const result = await authApi.authApi.register('newuser@example.com', 'password123', 'newuser');

      expect(result.data.email).toBe('newuser@example.com');
      expect(apiClient.post).toHaveBeenCalledWith('/auth/register', {
        email: 'newuser@example.com',
        password: 'password123',
        username: 'newuser',
      });
    });
  });

  describe('logout', () => {
    it('成功登出', async () => {
      vi.mocked(apiClient.post).mockResolvedValue({ data: {} });

      await authApi.authApi.logout();

      expect(apiClient.post).toHaveBeenCalledWith('/auth/logout');
    });
  });

  describe('getMe', () => {
    it('获取当前用户信息', async () => {
      const mockResponse = {
        data: {
          id: 'u1',
          email: 'test@example.com',
          username: 'testuser',
          role: 'USER',
        },
      };

      vi.mocked(apiClient.get).mockResolvedValue(mockResponse);

      const result = await authApi.authApi.getMe();

      expect(result.data.id).toBe('u1');
      expect(apiClient.get).toHaveBeenCalledWith('/auth/me');
    });
  });

  describe('verifyTwoFactor', () => {
    it('验证 2FA 代码', async () => {
      const mockResponse = {
        data: {
          accessToken: 'access_token_123',
          refreshToken: 'refresh_token_456',
          user: { id: 'u1', email: 'test@example.com' },
        },
      };

      vi.mocked(apiClient.post).mockResolvedValue(mockResponse);

      const result = await authApi.authApi.verifyTwoFactor('temp_token_123', '123456');

      expect(result.data.accessToken).toBe('access_token_123');
      expect(apiClient.post).toHaveBeenCalledWith('/auth/2fa/verify', {
        tempToken: 'temp_token_123',
        code: '123456',
      });
    });
  });

  describe('enableTwoFactor', () => {
    it('启用 2FA', async () => {
      const mockResponse = {
        data: {
          secret: 'JBSWY3DPEBLW64TMMQ======',
          qrCode: 'data:image/png;base64,...',
        },
      };

      vi.mocked(apiClient.post).mockResolvedValue(mockResponse);

      const result = await authApi.authApi.enableTwoFactor();

      expect(result.data.secret).toBeTruthy();
      expect(apiClient.post).toHaveBeenCalledWith('/auth/2fa/enable');
    });
  });

  describe('disableTwoFactor', () => {
    it('禁用 2FA', async () => {
      vi.mocked(apiClient.post).mockResolvedValue({ data: {} });

      await authApi.authApi.disableTwoFactor('password123');

      expect(apiClient.post).toHaveBeenCalledWith('/auth/2fa/disable', {
        code: 'password123',
      });
    });
  });
});

