import { message } from 'antd';
import type { AxiosError } from 'axios';
import { getFriendlyErrorMessage, getStatusMessage } from './errorMessages';

interface ApiErrorResponse {
  statusCode?: number;
  message?: string | string[];
  error?: string;
  code?: string;
  translationKey?: string;
  details?: Record<string, unknown>;
}

function normalizeBackendMessage(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) {
    return value.find(Boolean);
  }
  return value;
}

export const extractApiErrorMessage = (
  error: unknown,
  defaultMessage = '操作失败'
): string => {
  if (!error) return defaultMessage;

  const axiosError = error as AxiosError<ApiErrorResponse>;

  if (!axiosError.response) {
    if (axiosError.code === 'ECONNABORTED') {
      return '请求超时，请检查网络连接';
    }
    if (axiosError.message === 'Network Error') {
      return '网络错误，请检查网络连接';
    }
    return '网络异常，请稍后重试';
  }

  const backendMessage = normalizeBackendMessage(axiosError.response.data?.message);
  if (backendMessage) {
    return getFriendlyErrorMessage(backendMessage, defaultMessage);
  }

  return getStatusMessage(axiosError.response.status) || defaultMessage;
};

/**
 * 统一处理 API 错误
 * @param error - Axios 错误对象
 */
export const handleApiError = (error: unknown): void => {
  message.error(extractApiErrorMessage(error, '未知错误'));
};

/**
 * 获取错误消息文本（不显示 UI）
 * @param error - 错误对象
 * @param defaultMessage - 默认消息
 * @returns 错误消息字符串
 */
export const getErrorMessage = (
  error: unknown,
  defaultMessage = '操作失败'
): string => {
  return extractApiErrorMessage(error, defaultMessage);
};

