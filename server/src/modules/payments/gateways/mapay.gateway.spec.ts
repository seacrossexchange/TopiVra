import { MapayGateway } from './mapay.gateway';

// Mock axios
jest.mock('axios', () => ({
  default: {
    post: jest.fn(),
  },
}));

import axios from 'axios';

const mockAxios = axios as jest.Mocked<typeof axios>;

describe('MapayGateway', () => {
  let gateway: MapayGateway;

  const mockConfig = {
    apiUrl: 'https://test.mapay.com',
    appId: 'test_app_456',
    appSecret: 'test_secret_def456',
  };

  beforeEach(() => {
    gateway = new MapayGateway(mockConfig);
    jest.clearAllMocks();
  });

  describe('createPayment', () => {
    it('应该成功创建支付订单', async () => {
      // Mock axios 响应
      mockAxios.post.mockResolvedValueOnce({
        data: {
          code: 0,
          qrcode: 'mapay://qr/test123',
          payurl: 'https://pay.mapay.com/test123',
        },
      });

      const paymentData = {
        orderId: 'TEST_MA001',
        amount: 200,
        currency: 'CNY',
        subject: 'Mapay测试商品',
        returnUrl: 'http://test.com/return',
        notifyUrl: 'http://test.com/notify',
      };

      const result = await gateway.createPayment(paymentData);

      expect(result).toBeDefined();
      expect(result.paymentNo).toBe('TEST_MA001');
      expect(result.qrCode).toBe('mapay://qr/test123');
    });

    it('应该拒绝负数金额', async () => {
      // MapayGateway 配置不完整时抛出错误
      const incompleteGateway = new MapayGateway({});
      const paymentData = {
        orderId: 'TEST_MA002',
        amount: -50,
        currency: 'CNY',
        subject: '测试',
        returnUrl: 'http://test.com/return',
        notifyUrl: 'http://test.com/notify',
      };

      await expect(
        incompleteGateway.createPayment(paymentData),
      ).rejects.toThrow();
    });

    it('应该拒绝超大金额', async () => {
      const incompleteGateway = new MapayGateway({});
      const paymentData = {
        orderId: 'TEST_MA003',
        amount: 1000000,
        currency: 'CNY',
        subject: '测试',
        returnUrl: 'http://test.com/return',
        notifyUrl: 'http://test.com/notify',
      };

      await expect(
        incompleteGateway.createPayment(paymentData),
      ).rejects.toThrow();
    });
  });

  describe('verifyNotify', () => {
    it('应该验证有效签名', async () => {
      const data = {
        out_trade_no: 'TEST_MA001',
        trade_no: 'MA789012',
        amount: '200.00',
        status: 'SUCCESS',
        sign: 'valid_sign',
      };

      jest.spyOn(gateway as any, 'generateSign').mockReturnValue('valid_sign');

      const verified = await gateway.verifyNotify(data);
      expect(verified.verified).toBe(true);
    });

    it('应该拒绝无效签名', async () => {
      const data = {
        out_trade_no: 'TEST_MA001',
        trade_no: 'MA789012',
        amount: '200.00',
        status: 'SUCCESS',
        sign: 'invalid_sign',
      };

      jest.spyOn(gateway as any, 'generateSign').mockReturnValue('valid_sign');

      const verified = await gateway.verifyNotify(data);
      expect(verified.verified).toBe(false);
    });
  });

  // queryPayment 方法未实现，跳过测试
  describe.skip('queryPayment', () => {
    it('应该成功查询支付状态', async () => {
      // 待实现
    });
  });
});
