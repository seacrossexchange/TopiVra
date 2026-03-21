import { describe, it, expect, beforeEach, vi } from 'vitest';
import { handleApiError, getErrorMessage } from './errorHandler';
import { message } from 'antd';

vi.mock('antd', () => ({
  message: {
    error: vi.fn(),
  },
}));

describe('errorHandler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('handleApiError', () => {
    it('网络错误 - 超时', () => {
      const error = {
        code: 'ECONNABORTED',
        message: 'Request timeout',
      };

      handleApiError(error);

      expect(message.error).toHaveBeenCalledWith('请求超时，请检查网络连接');
    });

    it('网络错误 - 无响应', () => {
      const error = {
        message: 'Network Error',
      };

      handleApiError(error);

      expect(message.error).toHaveBeenCalledWith('网络错误，请检查网络连接');
    });

    it('网络错误 - 其他', () => {
      const error = {
        message: 'Unknown error',
      };

      handleApiError(error);

      expect(message.error).toHaveBeenCalledWith('网络异常，请稍后重试');
    });

    it('后端返回错误消息', () => {
      const error = {
        response: {
          status: 400,
          data: {
            message: 'Invalid email format',
          },
        },
      };

      handleApiError(error);

      expect(message.error).toHaveBeenCalled();
    });

    it('状态码 401 未授权', () => {
      const error = {
        response: {
          status: 401,
          data: {},
        },
      };

      handleApiError(error);

      expect(message.error).toHaveBeenCalled();
    });

    it('状态码 403 禁止访问', () => {
      const error = {
        response: {
          status: 403,
          data: {},
        },
      };

      handleApiError(error);

      expect(message.error).toHaveBeenCalled();
    });

    it('状态码 404 未找到', () => {
      const error = {
        response: {
          status: 404,
          data: {},
        },
      };

      handleApiError(error);

      expect(message.error).toHaveBeenCalled();
    });

    it('状态码 500 服务器错误', () => {
      const error = {
        response: {
          status: 500,
          data: {},
        },
      };

      handleApiError(error);

      expect(message.error).toHaveBeenCalled();
    });

    it('null 错误', () => {
      handleApiError(null);

      expect(message.error).toHaveBeenCalledWith('未知错误');
    });
  });

  describe('getErrorMessage', () => {
    it('返回后端错误消息', () => {
      const error = {
        response: {
          data: {
            message: 'User already exists',
          },
        },
      };

      const result = getErrorMessage(error);

      expect(result).toBeTruthy();
    });

    it('返回 axios 错误消息', () => {
      const error = {
        message: 'Network timeout',
      };

      const result = getErrorMessage(error);

      expect(result).toBeTruthy();
    });

    it('返回默认消息', () => {
      const error = {};

      const result = getErrorMessage(error, '自定义默认消息');

      expect(result).toBe('自定义默认消息');
    });

    it('null 错误返回默认消息', () => {
      const result = getErrorMessage(null, '默认消息');

      expect(result).toBe('默认消息');
    });
  });
});















