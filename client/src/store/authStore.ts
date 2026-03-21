import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { authApi } from '@/services/auth';
import type { User, LoginResponse } from '@/services/auth';
import { extractApiErrorMessage } from '@/utils/errorHandler';

interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isBootstrapping: boolean;
  hasHydrated: boolean;
  error: string | null;
  // Actions
  login: (email: string, password: string) => Promise<{ requiresTwoFactor?: boolean; tempToken?: string } | void>;
  loginWith2FA: (tempToken: string, code: string) => Promise<void>;
  register: (email: string, password: string, username: string) => Promise<void>;
  logout: () => Promise<void>;
  setTokens: (tokens: { accessToken: string; refreshToken: string }) => void;
  setAccessToken: (accessToken: string) => void;
  setUser: (user: User | null) => void;
  fetchUser: () => Promise<void>;
  bootstrapAuth: () => Promise<void>;
  setHasHydrated: (value: boolean) => void;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
      isLoading: false,
      isBootstrapping: false,
      hasHydrated: false,
      error: null,

      login: async (email: string, password: string) => {
        set({ isLoading: true, error: null });
        try {
          const { data } = await authApi.login(email, password);

          // Check if 2FA is required
          if ('requiresTwoFactor' in data && data.requiresTwoFactor) {
            set({ isLoading: false });
            return { requiresTwoFactor: true, tempToken: data.tempToken };
          }

          // Normal login success
          const loginData = data as LoginResponse;
          set({
            accessToken: loginData.accessToken,
            refreshToken: loginData.refreshToken,
            user: loginData.user,
            isAuthenticated: true,
            isLoading: false,
          });
          
          // 登录成功后立即获取完整用户信息（包含角色）
          try {
            const { data: userProfile } = await authApi.getMe();
            set({ user: userProfile });
          } catch (error) {
            // 获取用户信息失败不影响登录流程
            if (import.meta.env.DEV) {
              console.warn('获取用户信息失败:', error);
            }
          }
          
          return {};
        } catch (error: unknown) {
          const errorMessage = extractApiErrorMessage(error, '登录失败，请重试');
          set({ error: errorMessage, isLoading: false });
          throw error;
        }
      },

      loginWith2FA: async (tempToken: string, code: string) => {
        set({ isLoading: true, error: null });
        try {
          const { data } = await authApi.verifyTwoFactor(tempToken, code);
          set({
            accessToken: data.accessToken,
            refreshToken: data.refreshToken,
            user: data.user,
            isAuthenticated: true,
            isLoading: false,
          });
        } catch (error: unknown) {
          const errorMessage = extractApiErrorMessage(error, '两步验证失败');
          set({ error: errorMessage, isLoading: false });
          throw error;
        }
      },

      register: async (email: string, password: string, username: string) => {
        set({ isLoading: true, error: null });
        try {
          const { data } = await authApi.register(email, password, username);
          
          // 注册成功但需要邮箱验证
          if ((data as any).requiresVerification) {
            set({ isLoading: false });
            return; // 由页面层处理跳转到验证页
          }
          
          // 如果直接返回 token（未来可能）
          const loginData = data as LoginResponse;
          set({
            accessToken: loginData.accessToken,
            refreshToken: loginData.refreshToken,
            user: loginData.user,
            isAuthenticated: true,
            isLoading: false,
          });
        } catch (error: unknown) {
          const errorMessage = extractApiErrorMessage(error, '注册失败，请重试');
          set({ error: errorMessage, isLoading: false });
          throw error;
        }
      },

      logout: async () => {
        try {
          const { accessToken } = get();
          if (accessToken) {
            await authApi.logout();
          }
        } catch {
          // Ignore errors, clear local state anyway
        }
        set({
          user: null,
          accessToken: null,
          refreshToken: null,
          isAuthenticated: false,
          error: null,
        });
      },

      setTokens: (tokens) =>
        set({
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken,
          isAuthenticated: true,
        }),

      setAccessToken: (accessToken) => set({ accessToken }),

      setUser: (user) => set({ user }),

      bootstrapAuth: async () => {
        const { hasHydrated, isBootstrapping, accessToken, user, fetchUser } = get();

        if (!hasHydrated || isBootstrapping) {
          return;
        }

        if (!accessToken) {
          set({ isBootstrapping: false, isAuthenticated: false, user: null });
          return;
        }

        if (user?.id) {
          set({ isAuthenticated: true, isBootstrapping: false });
          return;
        }

        set({ isBootstrapping: true });
        try {
          await fetchUser();
        } finally {
          set({ isBootstrapping: false });
        }
      },

      setHasHydrated: (value) => set({ hasHydrated: value }),

      fetchUser: async () => {
        const { accessToken } = get();
        if (!accessToken) return;

        try {
          const { data } = await authApi.getMe();
          // 更新用户信息，包含角色
          if (data && 'id' in data) {
            set({ user: data, isAuthenticated: true });
          }
        } catch {
          // Token might be invalid, logout
          set({
            user: null,
            accessToken: null,
            refreshToken: null,
            isAuthenticated: false,
          });
        }
      },

      clearError: () => set({ error: null }),
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    }
  )
);