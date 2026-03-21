import { message } from 'antd';
import type { AxiosError } from 'axios';
import { getFriendlyErrorMessage, getStatusMessage } from './errorMessages';

interface ApiErrorResponse {
  statusCode?: number;
  message?: string;
  error?: string;
  details?: Record<string, unknown>;
}

/**
 * 统一处理 API 错误
 * @param error - Axios 错误对象
 */
export const handleApiError = (error: unknown): void => {
  if (!error) {
    message.error('未知错误');
    return;
  }

  const axiosError = error as AxiosError<ApiErrorResponse>;

  // 网络错误
  if (!axiosError.response) {
    if (axiosError.code === 'ECONNABORTED') {
      message.error('请求超时，请检查网络连接');
    } else if (axiosError.message === 'Network Error') {
      message.error('网络错误，请检查网络连接');
    } else {
      message.error('网络异常，请稍后重试');
    }
    return;
  }

  const { status, data } = axiosError.response;
  
  // 优先使用后端返回的错误消息
  const backendMessage = data?.message;
  
  // 如果有后端消息，尝试转换为友好消息
  if (backendMessage) {
    const friendlyMessage = getFriendlyErrorMessage(backendMessage);
    message.error(friendlyMessage);
    return;
  }

  // 否则使用状态码对应的消息
  const statusMessage = getStatusMessage(status);
  message.error(statusMessage);
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
  if (!error) return defaultMessage;

  const axiosError = error as AxiosError<ApiErrorResponse>;

  if (axiosError.response?.data?.message) {
    return getFriendlyErrorMessage(axiosError.response.data.message);
  }

  if (axiosError.message) {
    return getFriendlyErrorMessage(axiosError.message);
  }

  return defaultMessage;
};

