import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { PrismaService } from '../../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import { WebsocketGateway } from '../websocket/websocket.gateway';
import { MailService } from '../../common/mail/mail.service';
import { OrdersService } from '../orders/orders.service';

describe('PaymentsService - auto delivery integration', () => {
  let service: PaymentsService;
  let prisma: any;
  let ordersService: { handlePaymentSuccess: jest.Mock };
  let websocketGateway: { sendToUser: jest.Mock };
  let mailService: { isAvailable: jest.Mock; sendOrderNotification: jest.Mock };

  const mockOrder = {
    id: 'order-1',
    orderNo: 'ORD123',
    buyerId: 'buyer-1',
    currency: 'USD',
    orderItems: [
      {
        id: 'item-1',
        product: { id: 'product-1', sellerId: 'seller-1' },
        unitPrice: 100,
        quantity: 1,
      },
    ],
    buyer: {
      id: 'buyer-1',
      username: 'test-buyer',
      email: 'buyer@test.com',
    },
  };

  const mockPayment = {
    id: 'payment-1',
    paymentNo: 'PAY123',
    orderId: mockOrder.id,
    method: 'USDT',
    status: 'PENDING',
    amount: 100,
    currency: 'USD',
    order: mockOrder,
  };

  beforeEach(async () => {
    prisma = {
      payment: {
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      order: {
        update: jest.fn(),
      },
      sellerProfile: {
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      sellerTransaction: {
        create: jest.fn(),
      },
      $transaction: jest.fn((fn: any) => fn(prisma)),
    };

    const configService = {
      get: jest.fn().mockImplementation((key: string) => {
        if (key === 'PLATFORM_FEE_RATE') return 0.05;
        return null;
      }),
    };

    ordersService = {
      handlePaymentSuccess: jest.fn(),
    };

    websocketGateway = {
      sendToUser: jest.fn(),
    };

    mailService = {
      isAvailable: jest.fn().mockReturnValue(true),
      sendOrderNotification: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentsService,
        { provide: PrismaService, useValue: prisma },
        { provide: ConfigService, useValue: configService },
        { provide: WebsocketGateway, useValue: websocketGateway },
        { provide: MailService, useValue: mailService },
        { provide: OrdersService, useValue: ordersService },
      ],
    }).compile();

    service = module.get<PaymentsService>(PaymentsService);
  });

  it('should throw BadRequestException when payment not found', async () => {
    prisma.payment.findUnique.mockResolvedValue(null);

    await expect(
      service.completePayment('NOT_EXISTS', 'provider-1'),
    ).rejects.toThrow(BadRequestException);
  });

  it('should short-circuit when payment already SUCCESS', async () => {
    prisma.payment.findUnique.mockResolvedValue({
      ...mockPayment,
      status: 'SUCCESS',
    });

    const result = await service.completePayment(mockPayment.paymentNo, 'prov-1');

    expect(result.status).toBe('SUCCESS');
    expect(ordersService.handlePaymentSuccess).not.toHaveBeenCalled();
  });

  it('should complete payment and trigger auto delivery and notifications', async () => {
    prisma.payment.findUnique.mockResolvedValue(mockPayment);
    prisma.payment.update.mockResolvedValue({
      ...mockPayment,
      status: 'SUCCESS',
    });
    prisma.order.update.mockResolvedValue({
      ...mockOrder,
      orderStatus: 'PAID',
      paymentStatus: 'PAID',
    });
    prisma.sellerProfile.findUnique.mockResolvedValue({
      userId: 'seller-1',
      balance: 0,
      totalEarnings: 0,
    });

    ordersService.handlePaymentSuccess.mockResolvedValue({
      orderId: mockOrder.id,
      success: true,
    });

    const result = await service.completePayment(mockPayment.paymentNo, 'prov-1');

    // 基本支付状态更新
    expect(prisma.payment.update).toHaveBeenCalled();
    expect(prisma.order.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: mockPayment.orderId },
      }),
    );

    // 自动发货链路
    expect(ordersService.handlePaymentSuccess).toHaveBeenCalledWith(
      mockPayment.orderId,
    );

    // WebSocket 通知买家
    expect(websocketGateway.sendToUser).toHaveBeenCalledWith(
      mockOrder.buyerId,
      'payment:completed',
      expect.objectContaining({
        orderId: mockOrder.id,
        orderNo: mockOrder.orderNo,
        autoDelivery: true,
      }),
    );

    // 邮件通知
    expect(mailService.isAvailable).toHaveBeenCalled();
    expect(mailService.sendOrderNotification).toHaveBeenCalled();

    expect(result).toBeDefined();
    expect(result.status).toBe('SUCCESS');
  });
});


