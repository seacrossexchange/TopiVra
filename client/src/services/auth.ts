import apiClient from './apiClient';

export interface User {
  id: string;
  email: string;
  username: string;
  avatar?: string;
  nickname?: string;
  roles?: string[];
  phone?: string;
  createdAt?: string;
  isSeller?: boolean;
  twoFactorEnabled?: boolean;
}

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  user: User;
}

export interface TwoFactorRequired {
  requiresTwoFactor: true;
  tempToken: string;
}

export const authApi = {
  login: (email: string, password: string) =>
    apiClient.post<LoginResponse | TwoFactorRequired>('/auth/login', { email, password }),

  register: (email: string, password: string, username: string) =>
    apiClient.post<LoginResponse>('/auth/register', { email, password, username }),

  logout: () =>
    apiClient.post('/auth/logout'),

  refresh: (refreshToken: string) =>
    apiClient.post<{ accessToken: string }>('/auth/refresh', { refreshToken }),

  getMe: () =>
    apiClient.get<User>('/auth/me'),

  verifyTwoFactor: (tempToken: string, code: string) =>
    apiClient.post<LoginResponse>('/auth/2fa/verify', { tempToken, code }),

  enableTwoFactor: () =>
    apiClient.post<{ secret: string; qrCodeUrl: string }>('/auth/2fa/enable'),

  disableTwoFactor: (code: string) =>
    apiClient.post('/auth/2fa/disable', { code }),

  forgotPassword: (email: string) =>
    apiClient.post('/auth/forgot-password', { email }),

  resetPassword: (token: string, password: string) =>
    apiClient.post('/auth/reset-password', { token, password }),

  updateProfile: (data: { username?: string; avatar?: string; phone?: string }) =>
    apiClient.patch<User>('/auth/profile', data),

  changePassword: (oldPassword: string, newPassword: string) =>
    apiClient.post('/auth/change-password', { oldPassword, newPassword }),
};

export type { User as UserType };