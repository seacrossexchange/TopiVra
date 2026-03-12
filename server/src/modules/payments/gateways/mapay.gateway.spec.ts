import { MapayGateway } from './mapay.gateway';
import { BadRequestException } from '@nestjs/common';

describe('MapayGateway', () => {
  let gateway: MapayGateway;

  const mockConfig = {
    apiUrl: 'https://test.mapay.com',
    mchId: 'test_mch_456',
    apiKey: 'test_key_def456',
  };

  beforeEach(() => {
    gateway = new MapayGateway(mockConfig);
  });

  describe('createPayment', () => {
    it('应该成功创建支付订单', async () => {
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
      expect(result.paymentNo).toBeDefined();
      expect(result.qrCode).toBeDefined();
    });

    it('应该拒绝负数金额', async () => {
      const paymentData = {
        orderId: 'TEST_MA002',
        amount: -50,
        currency: 'CNY',
        subject: '测试',
        returnUrl: 'http://test.com/return',
        notifyUrl: 'http://test.com/notify',
      };

      await expect(gateway.createPayment(paymentData)).rejects.toThrow(BadRequestException);
    });

    it('应该拒绝超大金额', async () => {
      const paymentData = {
        orderId: 'TEST_MA003',
        amount: 1000000,
        currency: 'CNY',
        subject: '测试',
        returnUrl: 'http://test.com/return',
        notifyUrl: 'http://test.com/notify',
      };

      await expect(gateway.createPayment(paymentData)).rejects.toThrow(BadRequestException);
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
      expect(verified).toBe(true);
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
      expect(verified).toBe(false);
    });
  });

  // queryPayment 方法未实现，跳过测试
  describe.skip('queryPayment', () => {
    it('应该成功查询支付状态', async () => {
      // 待实现
    });
  });
});



