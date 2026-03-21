import { describe, it, expect } from 'vitest';
import {
  getFriendlyErrorMessage,
  getStatusMessage,
  getErrorType,
  ErrorType,
  ERROR_MESSAGES,
} from '../errorMessages';

describe('errorMessages 工具函数', () => {
  // ── getFriendlyErrorMessage ─────────────────────────────────
  describe('getFriendlyErrorMessage', () => {
    it('null/undefined → 应返回默认消息', () => {
      expect(getFriendlyErrorMessage(null)).toBe('操作失败');
      expect(getFriendlyErrorMessage(undefined)).toBe('操作失败');
    });

    it('自定义默认消息 → 应使用传入的默认值', () => {
      expect(getFriendlyErrorMessage(null, '自定义错误')).toBe('自定义错误');
    });

    it('字符串 → 命中映射表时应返回友好消息', () => {
      expect(getFriendlyErrorMessage('Network Error')).toBe(
        ERROR_MESSAGES['Network Error'],
      );
    });

    it('字符串 → 未命中映射表时应原样返回', () => {
      expect(getFriendlyErrorMessage('未知的自定义错误')).toBe('未知的自定义错误');
    });

    it('Error 对象 → 命中映射表时应返回友好消息', () => {
      const err = new Error('Network Error');
      expect(getFriendlyErrorMessage(err)).toBe(ERROR_MESSAGES['Network Error']);
    });

    it('Error 对象 → 未命中映射表时应返回 message', () => {
      const err = new Error('某个自定义错误');
      expect(getFriendlyErrorMessage(err)).toBe('某个自定义错误');
    });

    it('Axios 错误对象 → 应从 response.data.message 提取', () => {
      const axiosError = {
        response: { data: { message: '邮箱已被注册' } },
        message: 'Request failed',
      };
      expect(getFriendlyErrorMessage(axiosError)).toBe(
        ERROR_MESSAGES['邮箱已被注册'],
      );
    });

    it('Axios 错误对象 → 无 response 时应从 message 提取', () => {
      const axiosError = { response: null, message: 'Network Error' };
      expect(getFriendlyErrorMessage(axiosError)).toBe(
        ERROR_MESSAGES['Network Error'],
      );
    });
  });

  // ── getStatusMessage ────────────────────────────────────────
  describe('getStatusMessage', () => {
    const cases: [number, string][] = [
      [400, '请求参数错误'],
      [401, '请先登录'],
      [403, '没有权限执行此操作'],
      [404, '请求的资源不存在'],
      [409, '数据冲突，请刷新后重试'],
      [422, '数据验证失败'],
      [429, '请求过于频繁，请稍后再试'],
      [500, '服务器错误，请稍后重试'],
      [502, '网关错误，请稍后重试'],
      [503, '服务暂时不可用，请稍后重试'],
      [504, '网关超时，请稍后重试'],
    ];

    cases.forEach(([status, expected]) => {
      it(`HTTP ${status} → 应返回正确的消息`, () => {
        expect(getStatusMessage(status)).toBe(expected);
      });
    });

    it('未知状态码 → 应返回通用错误消息', () => {
      expect(getStatusMessage(999)).toBe('操作失败，请稍后重试');
    });
  });

  // ── getErrorType ────────────────────────────────────────────
  describe('getErrorType', () => {
    it('null/undefined → 应返回 UNKNOWN', () => {
      expect(getErrorType(null)).toBe(ErrorType.UNKNOWN);
      expect(getErrorType(undefined)).toBe(ErrorType.UNKNOWN);
    });

    it('包含 "Network" → 应识别为 NETWORK 类型', () => {
      expect(getErrorType('Network Error')).toBe(ErrorType.NETWORK);
      expect(getErrorType(new Error('Network Error'))).toBe(ErrorType.NETWORK);
    });

    it('包含 "timeout" → 应识别为 NETWORK 类型', () => {
      expect(getErrorType('Request timeout')).toBe(ErrorType.NETWORK);
    });

    it('包含 "Unauthorized" → 应识别为 AUTH 类型', () => {
      expect(getErrorType('Unauthorized')).toBe(ErrorType.AUTH);
    });

    it('包含 "Token" → 应识别为 AUTH 类型', () => {
      expect(getErrorType('Token expired')).toBe(ErrorType.AUTH);
    });

    it('包含 "登录" → 应识别为 AUTH 类型', () => {
      expect(getErrorType('请先登录')).toBe(ErrorType.AUTH);
    });

    it('包含 "Forbidden" → 应识别为 PERMISSION 类型', () => {
      expect(getErrorType('Forbidden')).toBe(ErrorType.PERMISSION);
    });

    it('包含 "权限" → 应识别为 PERMISSION 类型', () => {
      expect(getErrorType('没有权限')).toBe(ErrorType.PERMISSION);
    });

    it('包含 "Server Error" → 应识别为 SERVER 类型', () => {
      expect(getErrorType('Internal Server Error')).toBe(ErrorType.SERVER);
    });

    it('包含 "服务器" → 应识别为 SERVER 类型', () => {
      expect(getErrorType('服务器错误')).toBe(ErrorType.SERVER);
    });

    it('业务错误 → 应识别为 BUSINESS 类型', () => {
      expect(getErrorType('商品库存不足')).toBe(ErrorType.BUSINESS);
    });
  });

  // ── ERROR_MESSAGES 映射表完整性校验 ─────────────────────────
  describe('ERROR_MESSAGES 映射表', () => {
    it('所有值均应为非空字符串', () => {
      Object.entries(ERROR_MESSAGES).forEach(([key, value]) => {
        expect(typeof value).toBe('string');
        expect(value.length).toBeGreaterThan(0);
      });
    });

    it('应包含核心网络错误映射', () => {
      expect(ERROR_MESSAGES['Network Error']).toBeDefined();
      expect(ERROR_MESSAGES['ECONNABORTED']).toBeDefined();
    });

    it('应包含核心认证错误映射', () => {
      expect(ERROR_MESSAGES['Unauthorized']).toBeDefined();
      expect(ERROR_MESSAGES['Token expired']).toBeDefined();
    });

    it('应包含核心服务器错误映射', () => {
      expect(ERROR_MESSAGES['Internal Server Error']).toBeDefined();
    });
  });
});
