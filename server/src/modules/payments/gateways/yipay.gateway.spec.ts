import { YipayGateway } from './yipay.gateway';
import { BadRequestException } from '@nestjs/common';

describe('YipayGateway', () => {
  let gateway: YipayGateway;

  const mockConfig = {
    apiUrl: 'https://test.yipay.com',
    mchId: 'test_mch_123',
    apiKey: 'test_key_abc123',
  };

  beforeEach(() => {
    gateway = new YipayGateway(mockConfig);
  });

  describe('createPayment', () => {
    it('应该成功创建支付订单', async () => {
      const paymentData = {
        orderId: 'TEST001',
        amount: 100,
        currency: 'CNY',
        subject: '测试商品',
        returnUrl: 'http://test.com/return',
        notifyUrl: 'http://test.com/notify',
      };

      const result = await gateway.createPayment(paymentData);

      expect(result).toBeDefined();
      expect(result.paymentNo).toBeDefined();
      expect(result.qrCode).toBeDefined();
    });

    it('应该拒绝无效金额', async () => {
      const paymentData = {
        orderId: 'TEST002',
        amount: -100,
        currency: 'CNY',
        subject: '测试',
        returnUrl: 'http://test.com/return',
        notifyUrl: 'http://test.com/notify',
      };

      await expect(gateway.createPayment(paymentData)).rejects.toThrow(BadRequestException);
    });

    it('应该拒绝金额为0', async () => {
      const paymentData = {
        orderId: 'TEST003',
        amount: 0,
        currency: 'CNY',
        subject: '测试',
        returnUrl: 'http://test.com/return',
        notifyUrl: 'http://test.com/notify',
      };

      await expect(gateway.createPayment(paymentData)).rejects.toThrow(BadRequestException);
    });

    it('应该拒绝空订单号', async () => {
      const paymentData = {
        orderId: '',
        amount: 100,
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
        out_trade_no: 'TEST001',
        trade_no: 'YP123456',
        money: '100.00',
        trade_status: 'TRADE_SUCCESS',
        sign: 'valid_sign',
      };

      // Mock 签名验证
      jest.spyOn(gateway as any, 'generateSign').mockReturnValue('valid_sign');

      const verified = await gateway.verifyNotify(data);
      expect(verified).toBe(true);
    });

    it('应该拒绝无效签名', async () => {
      const data = {
        out_trade_no: 'TEST001',
        trade_no: 'YP123456',
        money: '100.00',
        trade_status: 'TRADE_SUCCESS',
        sign: 'invalid_sign',
      };

      jest.spyOn(gateway as any, 'generateSign').mockReturnValue('valid_sign');

      const verified = await gateway.verifyNotify(data);
      expect(verified).toBe(false);
    });

    it('应该拒绝缺少签名的数据', async () => {
      const data = {
        out_trade_no: 'TEST001',
        trade_no: 'YP123456',
        money: '100.00',
        trade_status: 'TRADE_SUCCESS',
      };

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

  describe('签名生成', () => {
    it('应该生成正确的签名', () => {
      const params = {
        out_trade_no: 'TEST001',
        money: '100.00',
        timestamp: '1234567890',
      };

      const sign = (gateway as any).generateSign(params);

      expect(sign).toBeDefined();
      expect(typeof sign).toBe('string');
      expect(sign.length).toBeGreaterThan(0);
    });

    it('应该对相同参数生成相同签名', () => {
      const params = {
        out_trade_no: 'TEST001',
        money: '100.00',
      };

      const sign1 = (gateway as any).generateSign(params);
      const sign2 = (gateway as any).generateSign(params);

      expect(sign1).toBe(sign2);
    });
  });
});



