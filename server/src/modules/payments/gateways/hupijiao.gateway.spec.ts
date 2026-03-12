import { HupijiaoGateway } from './hupijiao.gateway';
import { BadRequestException } from '@nestjs/common';

describe('HupijiaoGateway', () => {
  let gateway: HupijiaoGateway;

  const mockConfig = {
    apiUrl: 'https://test.hupijiao.com',
    appId: 'test_app_789',
    appSecret: 'test_secret_ghi789',
  };

  beforeEach(() => {
    gateway = new HupijiaoGateway(mockConfig);
  });

  describe('createPayment', () => {
    it('应该成功创建支付订单', async () => {
      const paymentData = {
        orderId: 'TEST_HP001',
        amount: 150,
        currency: 'CNY',
        subject: '虎皮椒测试商品',
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
        orderId: 'TEST_HP002',
        amount: -100,
        currency: 'CNY',
        subject: '测试',
        returnUrl: 'http://test.com/return',
        notifyUrl: 'http://test.com/notify',
      };

      await expect(gateway.createPayment(paymentData)).rejects.toThrow(BadRequestException);
    });

    it('应该处理小数金额', async () => {
      const paymentData = {
        orderId: 'TEST_HP003',
        amount: 99.99,
        currency: 'CNY',
        subject: '测试',
        returnUrl: 'http://test.com/return',
        notifyUrl: 'http://test.com/notify',
      };

      const result = await gateway.createPayment(paymentData);
      expect(result).toBeDefined();
    });
  });

  describe('verifyNotify', () => {
    it('应该验证有效签名', async () => {
      const data = {
        out_order_no: 'TEST_HP001',
        order_no: 'HP345678',
        total_fee: '150.00',
        status: 'OD',
        sign: 'valid_sign',
      };

      jest.spyOn(gateway as any, 'generateSign').mockReturnValue('valid_sign');

      const verified = await gateway.verifyNotify(data);
      expect(verified).toBe(true);
    });

    it('应该拒绝无效签名', async () => {
      const data = {
        out_order_no: 'TEST_HP001',
        order_no: 'HP345678',
        total_fee: '150.00',
        status: 'OD',
        sign: 'invalid_sign',
      };

      jest.spyOn(gateway as any, 'generateSign').mockReturnValue('valid_sign');

      const verified = await gateway.verifyNotify(data);
      expect(verified).toBe(false);
    });

    it('应该拒绝未完成的支付', async () => {
      const data = {
        out_order_no: 'TEST_HP001',
        order_no: 'HP345678',
        total_fee: '150.00',
        status: 'WP', // 等待支付
        sign: 'valid_sign',
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



