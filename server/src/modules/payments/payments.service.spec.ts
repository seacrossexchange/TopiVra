import { Test, TestingModule } from '@nestjs/testing';
import { PaymentsService } from './payments.service';
import { PrismaService } from '../../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import { BadRequestException } from '@nestjs/common';
import { WebsocketGateway } from '../websocket/websocket.gateway';
import { MailService } from '../../common/mail/mail.service';
import { OrdersService } from '../orders/orders.service';
import { PaymentStatus, OrderStatus } from '@prisma/client';

describe('PaymentsService', () => {
  let service: PaymentsService;
  let prismaService: any;

  const mockOrder = {
    id: 'order-001',
    orderNo: 'ORD202603120001',
    buyerId: 'user-001',
    totalAmount: 100.0,
    payAmount: 100.0,
    currency: 'USD',
    orderStatus: OrderStatus.CREATED,
    paymentStatus: PaymentStatus.UNPAID,
    orderItems: [{ id: 'item-1', productId: 'p1', sellerId: 'seller-1' }],
  };

  beforeEach(async () => {
    const mockPrisma: any = {
      order: {
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      payment: {
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      gatewayConfig: {
        findFirst: jest.fn(),
      },
    };
    mockPrisma.$transaction = jest.fn((fn: (tx: any) => any) => fn(mockPrisma));

    const mockConfig = {
      get: jest.fn().mockImplementation((key: string) => {
        if (key === 'STRIPE_SECRET_KEY') return 'sk_test_xxx';
        if (key === 'PAYPAL_CLIENT_ID') return 'paypal_id';
        if (key === 'PLATFORM_FEE_RATE') return 0.05;
        if (key === 'USDT_WALLET_ADDRESS') return 'TAddr123';
        if (key === 'PAYMENT_EXPIRATION_MINUTES') return 30;
        return null;
      }),
    };

    const mockWebsocket = { sendToUser: jest.fn() };
    const mockMail = {
      isAvailable: jest.fn().mockReturnValue(false),
      sendOrderNotification: jest.fn(),
    };
    const mockOrdersService = { handlePaymentSuccess: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentsService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: ConfigService, useValue: mockConfig },
        { provide: WebsocketGateway, useValue: mockWebsocket },
        { provide: MailService, useValue: mockMail },
        { provide: OrdersService, useValue: mockOrdersService },
      ],
    }).compile();

    service = module.get<PaymentsService>(PaymentsService);
    prismaService = mockPrisma;
  });

  // -- createPayment ------------------------------------------
  describe('createPayment', () => {
    it('应为有效订单创建支付记录', async () => {
      prismaService.order.findUnique.mockResolvedValue(mockOrder);
      prismaService.payment.create.mockResolvedValue({
        id: 'payment-001',
        orderId: 'order-001',
        paymentNo: 'PAY123',
        method: 'USDT',
        status: 'PENDING',
        amount: 100,
        currency: 'USD',
      });

      const result = await service.createPayment('order-001', 'USDT');

      expect(result).toBeDefined();
      expect(prismaService.payment.create).toHaveBeenCalled();
    });

    it('订单不存在 -> 应抛出 BadRequestException', async () => {
      prismaService.order.findUnique.mockResolvedValue(null);

      await expect(
        service.createPayment('nonexistent', 'USDT'),
      ).rejects.toThrow(BadRequestException);
    });

    it('订单已支付 -> 应抛出 BadRequestException', async () => {
      prismaService.order.findUnique.mockResolvedValue({
        ...mockOrder,
        paymentStatus: 'PAID',
      });

      await expect(service.createPayment('order-001', 'USDT')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  // -- getPaymentStatus ----------------------------------------
  describe('getPaymentStatus', () => {
    it('应返回支付状态', async () => {
      prismaService.payment.findUnique.mockResolvedValue({
        id: 'payment-001',
        paymentNo: 'PAY123',
        status: 'PENDING',
        amount: 100,
      });

      const result = await service.getPaymentStatus('PAY123');

      expect(result).toBeDefined();
    });
  });

  // -- handleGatewayNotify -------------------------------------
  describe('handleGatewayNotify', () => {
    it('方法应存在', () => {
      expect(service.handleGatewayNotify).toBeDefined();
    });
  });

  // -- getAvailablePaymentMethods ------------------------------
  describe('getAvailablePaymentMethods', () => {
    it('方法应存在', () => {
      expect(service.getAvailablePaymentMethods).toBeDefined();
    });
  });
});
