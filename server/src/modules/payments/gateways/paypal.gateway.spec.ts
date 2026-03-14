import { PaypalGateway } from './paypal.gateway';
import { BadRequestException } from '@nestjs/common';

describe('PaypalGateway', () => {
  let gateway: PaypalGateway;

  // 不传入 clientId/clientSecret，触发 mock 模式（不发真实网络请求）
  const mockConfig = {
    apiUrl: 'https://api-m.sandbox.paypal.com',
  };

  beforeEach(() => {
    gateway = new PaypalGateway(mockConfig);
  });

  describe('createPayment', () => {
    it('应该成功创建PayPal支付订单', async () => {
      const paymentData = {
        orderId: 'TEST_PP001',
        amount: 50,
        currency: 'USD',
        subject: 'PayPal Test Product',
        returnUrl: 'http://test.com/return',
        notifyUrl: 'http://test.com/notify',
      };

      const result = await gateway.createPayment(paymentData);

      expect(result).toBeDefined();
      expect(result.paymentNo).toBeDefined();
      expect(result.payUrl ?? result.qrCode ?? result.paymentNo).toBeDefined();
    });

    it('应该拒绝无效金额', async () => {
      const paymentData = {
        orderId: 'TEST_PP002',
        amount: -10,
        currency: 'USD',
        subject: 'Test',
        returnUrl: 'http://test.com/return',
        notifyUrl: 'http://test.com/notify',
      };

      await expect(gateway.createPayment(paymentData)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('应该支持多种货币', async () => {
      const currencies = ['USD', 'EUR', 'GBP', 'JPY'];

      for (const currency of currencies) {
        const paymentData = {
          orderId: `TEST_PP_${currency}`,
          amount: 100,
          currency,
          subject: 'Test',
          returnUrl: 'http://test.com/return',
          notifyUrl: 'http://test.com/notify',
        };

        const result = await gateway.createPayment(paymentData);
        expect(result).toBeDefined();
      }
    });

    it('应该拒绝不支持的货币', async () => {
      const paymentData = {
        orderId: 'TEST_PP003',
        amount: 100,
        currency: 'INVALID',
        subject: 'Test',
        returnUrl: 'http://test.com/return',
        notifyUrl: 'http://test.com/notify',
      };

      await expect(gateway.createPayment(paymentData)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('verifyNotify', () => {
    it('应该验证有效的PayPal webhook（COMPLETED 事件）', async () => {
      const data = {
        event_type: 'PAYMENT.CAPTURE.COMPLETED',
        resource: {
          id: 'PP123456',
          status: 'COMPLETED',
          amount: {
            value: '50.00',
            currency_code: 'USD',
          },
          custom_id: 'TEST_PP001',
        },
      };

      // spy verifyWebhookSignature（protected 方法）
      jest
        .spyOn(gateway as any, 'verifyWebhookSignature')
        .mockResolvedValue(true);

      const result = await gateway.verifyNotify(data);
      expect(result.verified).toBe(true);
      expect(result.status).toBe('SUCCESS');
    });

    it('应该拒绝无效的webhook签名', async () => {
      const data = {
        event_type: 'PAYMENT.CAPTURE.COMPLETED',
        resource: {
          id: 'PP123456',
          status: 'COMPLETED',
          custom_id: 'TEST_PP001',
        },
      };

      jest
        .spyOn(gateway as any, 'verifyWebhookSignature')
        .mockResolvedValue(false);

      const result = await gateway.verifyNotify(data);
      expect(result.verified).toBe(false);
    });

    it('应该拒绝未完成的支付（PENDING 状态）', async () => {
      const data = {
        event_type: 'PAYMENT.CAPTURE.COMPLETED',
        resource: {
          id: 'PP123456',
          status: 'PENDING',
          custom_id: 'TEST_PP001',
        },
      };

      jest
        .spyOn(gateway as any, 'verifyWebhookSignature')
        .mockResolvedValue(true);

      const result = await gateway.verifyNotify(data);
      expect(result.verified).toBe(false);
    });

    it('应该拒绝不处理的事件类型', async () => {
      const data = {
        event_type: 'PAYMENT.CAPTURE.PENDING',
        resource: {
          id: 'PP123456',
          status: 'PENDING',
          custom_id: 'TEST_PP001',
        },
      };

      jest
        .spyOn(gateway as any, 'verifyWebhookSignature')
        .mockResolvedValue(true);

      const result = await gateway.verifyNotify(data);
      expect(result.verified).toBe(false);
    });
  });

  // queryPayment 和 capturePayment 方法未实现，跳过测试
  describe.skip('queryPayment', () => {
    it('应该成功查询支付状态', async () => {
      // 待实现
    });
  });

  describe.skip('capturePayment', () => {
    it('应该成功捕获已授权的支付', async () => {
      // 待实现
    });
  });
});
