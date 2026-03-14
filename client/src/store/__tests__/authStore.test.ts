import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { act } from '@testing-library/react';

// ─── Mock 外部依赖 ─────────────────────────────────────────────
vi.mock('@/services/auth', () => ({
  authApi: {
    login: vi.fn(),
    logout: vi.fn(),
    register: vi.fn(),
    getMe: vi.fn(),
    verifyTwoFactor: vi.fn(),
  },
}));

import { useAuthStore } from '../authStore';
import { authApi } from '@/services/auth';

// ─── 测试数据 ──────────────────────────────────────────────────
const mockUser = {
  id: 'user-001',
  email: 'test@example.com',
  username: 'testuser',
  isSeller: false,
  roles: ['USER'],
  emailVerified: true,
  status: 'ACTIVE',
  createdAt: '2026-01-01T00:00:00.000Z',
};

const mockTokens = {
  accessToken: 'mock-access-token',
  refreshToken: 'mock-refresh-token',
};

const mockLoginResponse = {
  ...mockTokens,
  user: mockUser,
};

// ─── 重置 store 工具函数 ───────────────────────────────────────
const resetStore = () =>
  useAuthStore.setState({
    user: null,
    accessToken: null,
    refreshToken: null,
    isAuthenticated: false,
    isLoading: false,
    error: null,
  });

// ──────────────────────────────────────────────────────────────
describe('useAuthStore', () => {
  beforeEach(() => {
    resetStore();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  // ── 初始状态 ────────────────────────────────────────────────
  describe('初始状态', () => {
    it('应该具备正确的初始值', () => {
      const state = useAuthStore.getState();
      expect(state.user).toBeNull();
      expect(state.accessToken).toBeNull();
      expect(state.isAuthenticated).toBe(false);
      expect(state.isLoading).toBe(false);
      expect(state.error).toBeNull();
    });
  });

  // ── login ───────────────────────────────────────────────────
  describe('login', () => {
    it('登录成功 → 应更新 tokens、user 和 isAuthenticated', async () => {
      vi.mocked(authApi.login).mockResolvedValueOnce({ data: mockLoginResponse } as any);
      vi.mocked(authApi.getMe).mockResolvedValueOnce({ data: mockUser } as any);

      await act(async () => {
        await useAuthStore.getState().login('test@example.com', 'Password123!');
      });

      const state = useAuthStore.getState();
      expect(state.isAuthenticated).toBe(true);
      expect(state.accessToken).toBe(mockTokens.accessToken);
      expect(state.refreshToken).toBe(mockTokens.refreshToken);
      expect(state.user?.email).toBe(mockUser.email);
      expect(state.isLoading).toBe(false);
    });

    it('登录失败 → 应设置 error 并保持未认证', async () => {
      vi.mocked(authApi.login).mockRejectedValueOnce({
        response: { data: { message: '邮箱或密码错误' } },
      });

      await act(async () => {
        await useAuthStore
          .getState()
          .login('wrong@example.com', 'wrong')
          .catch(() => {});
      });

      const state = useAuthStore.getState();
      expect(state.isAuthenticated).toBe(false);
      expect(state.accessToken).toBeNull();
      expect(state.error).toBeTruthy();
      expect(state.isLoading).toBe(false);
    });

    it('后端要求 2FA → 应返回 requiresTwoFactor 标志', async () => {
      vi.mocked(authApi.login).mockResolvedValueOnce({
        data: { requiresTwoFactor: true, tempToken: 'temp-token-xyz' },
      } as any);

      let result: any;
      await act(async () => {
        result = await useAuthStore.getState().login('test@example.com', 'Password123!');
      });

      expect(result?.requiresTwoFactor).toBe(true);
      expect(result?.tempToken).toBe('temp-token-xyz');
      expect(useAuthStore.getState().isAuthenticated).toBe(false);
    });

    it('登录过程中 isLoading 应为 true', async () => {
      let resolveLogin!: (value: any) => void;
      vi.mocked(authApi.login).mockReturnValueOnce(
        new Promise((res) => {
          resolveLogin = res;
        }),
      );

      act(() => {
        useAuthStore.getState().login('test@example.com', 'Password123!').catch(() => {});
      });

      expect(useAuthStore.getState().isLoading).toBe(true);

      await act(async () => {
        resolveLogin({ data: mockLoginResponse });
        vi.mocked(authApi.getMe).mockResolvedValueOnce({ data: mockUser } as any);
      });
    });
  });

  // ── loginWith2FA ────────────────────────────────────────────
  describe('loginWith2FA', () => {
    it('2FA 验证成功 → 应完成登录流程', async () => {
      vi.mocked(authApi.verifyTwoFactor).mockResolvedValueOnce({
        data: mockLoginResponse,
      } as any);

      await act(async () => {
        await useAuthStore.getState().loginWith2FA('temp-token', '123456');
      });

      const state = useAuthStore.getState();
      expect(state.isAuthenticated).toBe(true);
      expect(state.accessToken).toBe(mockTokens.accessToken);
    });

    it('2FA 验证失败 → 应设置 error', async () => {
      vi.mocked(authApi.verifyTwoFactor).mockRejectedValueOnce({
        response: { data: { message: '验证码错误' } },
      });

      await act(async () => {
        await useAuthStore
          .getState()
          .loginWith2FA('temp-token', 'wrong-code')
          .catch(() => {});
      });

      expect(useAuthStore.getState().isAuthenticated).toBe(false);
      expect(useAuthStore.getState().error).toBeTruthy();
    });
  });

  // ── register ────────────────────────────────────────────────
  describe('register', () => {
    it('注册成功（需要邮箱验证）→ 不应设置 isAuthenticated', async () => {
      vi.mocked(authApi.register).mockResolvedValueOnce({
        data: { requiresVerification: true },
      } as any);

      await act(async () => {
        await useAuthStore.getState().register('new@example.com', 'Password123!', 'newuser');
      });

      expect(useAuthStore.getState().isAuthenticated).toBe(false);
      expect(useAuthStore.getState().isLoading).toBe(false);
    });

    it('邮箱已存在 → 应设置 error', async () => {
      vi.mocked(authApi.register).mockRejectedValueOnce({
        response: { data: { message: '邮箱已被注册' } },
      });

      await act(async () => {
        await useAuthStore
          .getState()
          .register('test@example.com', 'Password123!', 'testuser')
          .catch(() => {});
      });

      expect(useAuthStore.getState().error).toBeTruthy();
      expect(useAuthStore.getState().isLoading).toBe(false);
    });
  });

  // ── logout ──────────────────────────────────────────────────
  describe('logout', () => {
    it('登出后应清除所有认证状态', async () => {
      // 先设置登录状态
      useAuthStore.setState({
        user: mockUser as any,
        accessToken: 'some-token',
        refreshToken: 'some-refresh',
        isAuthenticated: true,
      });

      vi.mocked(authApi.logout).mockResolvedValueOnce(undefined as any);

      await act(async () => {
        await useAuthStore.getState().logout();
      });

      const state = useAuthStore.getState();
      expect(state.user).toBeNull();
      expect(state.accessToken).toBeNull();
      expect(state.refreshToken).toBeNull();
      expect(state.isAuthenticated).toBe(false);
    });

    it('即使 logout API 失败，本地状态仍应清除', async () => {
      useAuthStore.setState({ isAuthenticated: true, accessToken: 'token' });
      vi.mocked(authApi.logout).mockRejectedValueOnce(new Error('Network Error'));

      await act(async () => {
        await useAuthStore.getState().logout();
      });

      expect(useAuthStore.getState().isAuthenticated).toBe(false);
      expect(useAuthStore.getState().accessToken).toBeNull();
    });
  });

  // ── setTokens / setAccessToken ──────────────────────────────
  describe('setTokens & setAccessToken', () => {
    it('setTokens → 应更新 tokens 并标记为已认证', () => {
      useAuthStore.getState().setTokens(mockTokens);
      const state = useAuthStore.getState();
      expect(state.accessToken).toBe(mockTokens.accessToken);
      expect(state.refreshToken).toBe(mockTokens.refreshToken);
      expect(state.isAuthenticated).toBe(true);
    });

    it('setAccessToken → 仅更新 accessToken', () => {
      useAuthStore.getState().setAccessToken('new-access-token');
      expect(useAuthStore.getState().accessToken).toBe('new-access-token');
    });
  });

  // ── fetchUser ───────────────────────────────────────────────
  describe('fetchUser', () => {
    it('有 token 时应拉取并更新用户信息', async () => {
      useAuthStore.setState({ accessToken: 'valid-token' });
      vi.mocked(authApi.getMe).mockResolvedValueOnce({ data: mockUser } as any);

      await act(async () => {
        await useAuthStore.getState().fetchUser();
      });

      expect(useAuthStore.getState().user?.id).toBe(mockUser.id);
      expect(useAuthStore.getState().isAuthenticated).toBe(true);
    });

    it('没有 token 时不应发起请求', async () => {
      await act(async () => {
        await useAuthStore.getState().fetchUser();
      });

      expect(authApi.getMe).not.toHaveBeenCalled();
    });

    it('token 失效时应清除认证状态', async () => {
      useAuthStore.setState({ accessToken: 'expired-token', isAuthenticated: true });
      vi.mocked(authApi.getMe).mockRejectedValueOnce(new Error('Unauthorized'));

      await act(async () => {
        await useAuthStore.getState().fetchUser();
      });

      expect(useAuthStore.getState().isAuthenticated).toBe(false);
      expect(useAuthStore.getState().accessToken).toBeNull();
    });
  });

  // ── clearError ──────────────────────────────────────────────
  describe('clearError', () => {
    it('应清除 error 状态', () => {
      useAuthStore.setState({ error: '某个错误' });
      useAuthStore.getState().clearError();
      expect(useAuthStore.getState().error).toBeNull();
    });
  });
});




















