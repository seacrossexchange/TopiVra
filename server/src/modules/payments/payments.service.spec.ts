import { Test, TestingModule } from '@nestjs/testing';
import { PaymentsService } from './payments.service';
import { PrismaService } from '../../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { AuditService } from '../../common/audit';
import { NotificationService } from '../../common/notification';
import { PaymentStatus, OrderStatus } from '@prisma/client';

describe('PaymentsService', () => {
  let service: PaymentsService;
  let prismaService: any;

  const mockOrder = {
    id: 'order-001',
    orderNo: 'ORD202603120001',
    buyerId: 'user-001',
    totalAmount: 100.00,
    payAmount: 100.00,
    currency: 'USD',
    orderStatus: OrderStatus.CREATED,
    paymentStatus: PaymentStatus.UNPAID,
    orderItems: [{ id: 'item-1', productId: 'p1', sellerId: 'seller-1' }],
  };

  const mockPayment = {
    id: 'payment-001',
    orderId: 'order-001',
    amount: 100.00,
    currency: 'USD',
    gateway: 'STRIPE',
    status: PaymentStatus.UNPAID,
    createdAt: new Date(),
  };

  beforeEach(async () => {
    const mockPrisma = {
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
      $transaction: jest.fn((fn: any) => fn(mockPrisma)),
    };

    const mockConfig = {
      get: jest.fn().mockImplementation((key: string) => {
        if (key === 'STRIPE_SECRET_KEY') return 'sk_test_xxx';
        if (key === 'PAYPAL_CLIENT_ID') return 'paypal_id';
        if (key === 'PLATFORM_FEE_RATE') return 0.05;
        return null;
      }),
    };

    const mockAudit = { log: jest.fn() };
    const mockNotification = { notifyUser: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentsService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: ConfigService, useValue: mockConfig },
        { provide: AuditService, useValue: mockAudit },
        { provide: NotificationService, useValue: mockNotification },
      ],
    }).compile();

    service = module.get<PaymentsService>(PaymentsService);
    prismaService = mockPrisma;
  });

  // -- initiatePayment -----------------------------------------
  describe('initiatePayment', () => {
    it('应为有效订单创建支付记录', async () => {
      prismaService.order.findUnique.mockResolvedValue(mockOrder);
      prismaService.payment.findFirst.mockResolvedValue(null);
      prismaService.payment.create.mockResolvedValue(mockPayment);
      prismaService.gatewayConfig.findFirst.mockResolvedValue({
        id: 'gw-1',
        gateway: 'STRIPE',
        isActive: true,
        config: {},
      });

      const result = await service.initiatePayment('user-001', {
        orderId: 'order-001',
        gateway: 'STRIPE',
        returnUrl: 'https://topivra.com/payment/success',
      } as any);

      expect(result).toBeDefined();
    });

    it('订单不存在 -> 应抛出 NotFoundException', async () => {
      prismaService.order.findUnique.mockResolvedValue(null);

      await expect(
        service.initiatePayment('user-001', {
          orderId: 'nonexistent',
          gateway: 'STRIPE',
        } as any),
      ).rejects.toThrow(NotFoundException);
    });

    it('订单已支付 -> 应抛出 BadRequestException', async () => {
      prismaService.order.findUnique.mockResolvedValue({
        ...mockOrder,
        paymentStatus: PaymentStatus.PAID,
      });

      await expect(
        service.initiatePayment('user-001', {
          orderId: 'order-001',
          gateway: 'STRIPE',
        } as any),
      ).rejects.toThrow(BadRequestException);
    });

    it('非订单所有者 -> 应抛出 BadRequestException', async () => {
      prismaService.order.findUnique.mockResolvedValue(mockOrder);

      await expect(
        service.initiatePayment('other-user', {
          orderId: 'order-001',
          gateway: 'STRIPE',
        } as any),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // -- handleCallback ------------------------------------------
  describe('handleCallback（支付回调）', () => {
    it('Stripe 回调成功 -> 应将订单标记为已支付（骨架）', async () => {
      // 完整集成测试需 mock Stripe SDK webhook 验签
      // 此处验证基础结构
      expect(service.handleCallback).toBeDefined();
    });
  });

  // -- getPaymentStatus ----------------------------------------
  describe('getPaymentStatus', () => {
    it('应返回支付状态', async () => {
      prismaService.payment.findUnique.mockResolvedValue(mockPayment);

      const result = await service.getPaymentStatus('payment-001', 'user-001');

      expect(result).toBeDefined();
      expect(result.status).toBe(PaymentStatus.UNPAID);
    });

    it('支付记录不存在 -> 应抛出 NotFoundException', async () => {
      prismaService.payment.findUnique.mockResolvedValue(null);

      await expect(
        service.getPaymentStatus('nonexistent', 'user-001'),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
