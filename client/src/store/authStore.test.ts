import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useAuthStore } from './authStore';
import * as authApi from '@/services/auth';

vi.mock('@/services/auth');

describe('useAuthStore', () => {
  beforeEach(() => {
    useAuthStore.setState({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,
    });
    vi.clearAllMocks();
  });

  it('初始状态正确', () => {
    const state = useAuthStore.getState();
    expect(state.user).toBeNull();
    expect(state.isAuthenticated).toBe(false);
    expect(state.accessToken).toBeNull();
  });

  it('login 成功设置 token 和用户', async () => {
    const mockUser = { id: 'u1', email: 'test@example.com', username: 'testuser' };
    vi.mocked(authApi.authApi.login).mockResolvedValue({
      data: {
        accessToken: 'access_token_123',
        refreshToken: 'refresh_token_456',
        user: mockUser,
      },
    } as any);

    await useAuthStore.getState().login('test@example.com', 'password123');

    const state = useAuthStore.getState();
    expect(state.accessToken).toBe('access_token_123');
    expect(state.refreshToken).toBe('refresh_token_456');
    expect(state.user).toEqual(mockUser);
    expect(state.isAuthenticated).toBe(true);
  });

  it('login 失败时设置错误', async () => {
    vi.mocked(authApi.authApi.login).mockRejectedValue(
      new Error('Invalid credentials')
    );

    try {
      await useAuthStore.getState().login('test@example.com', 'wrong');
    } catch {
      // 预期抛出错误
    }

    const state = useAuthStore.getState();
    expect(state.error).toBeTruthy();
    expect(state.isAuthenticated).toBe(false);
  });

  it('logout 清除所有认证信息', async () => {
    useAuthStore.setState({
      user: { id: 'u1', email: 'test@example.com', username: 'testuser' },
      accessToken: 'token123',
      refreshToken: 'refresh123',
      isAuthenticated: true,
    });

    vi.mocked(authApi.authApi.logout).mockResolvedValue({} as any);

    await useAuthStore.getState().logout();

    const state = useAuthStore.getState();
    expect(state.user).toBeNull();
    expect(state.accessToken).toBeNull();
    expect(state.refreshToken).toBeNull();
    expect(state.isAuthenticated).toBe(false);
  });

  it('setTokens 更新 token', () => {
    useAuthStore.getState().setTokens({
      accessToken: 'new_access',
      refreshToken: 'new_refresh',
    });

    const state = useAuthStore.getState();
    expect(state.accessToken).toBe('new_access');
    expect(state.refreshToken).toBe('new_refresh');
    expect(state.isAuthenticated).toBe(true);
  });

  it('setUser 更新用户信息', () => {
    const user = { id: 'u1', email: 'test@example.com', username: 'testuser' };
    useAuthStore.getState().setUser(user);

    const state = useAuthStore.getState();
    expect(state.user).toEqual(user);
  });

  it('clearError 清除错误', () => {
    useAuthStore.setState({ error: 'Some error' });
    useAuthStore.getState().clearError();

    const state = useAuthStore.getState();
    expect(state.error).toBeNull();
  });
});

