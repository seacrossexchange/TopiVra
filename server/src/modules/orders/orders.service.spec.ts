import { Test, TestingModule } from '@nestjs/testing';
import { OrdersService } from './orders.service';
import { PrismaService } from '../../prisma/prisma.service';
import {
  BadRequestException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OrderStatus, PaymentStatus } from '@prisma/client';
import { RefundType } from './dto/refund.dto';
import { AuditService } from '../../common/audit';
import { NotificationService } from '../../common/notification';
import { AutoDeliveryService } from '../inventory/auto-delivery.service';

describe('OrdersService', () => {
  let service: OrdersService;
  let prismaService: any;
  let _auditService: any;
  let _notificationService: any;
  let autoDeliveryService: any;

  const mockOrder = {
    id: 'order-123',
    orderNo: 'ORD202603080001',
    buyerId: 'user-123',
    totalAmount: 100.0,
    payAmount: 100.0,
    currency: 'USD',
    orderStatus: OrderStatus.CREATED,
    paymentStatus: PaymentStatus.UNPAID,
    createdAt: new Date(),
    orderItems: [
      {
        id: 'item-1',
        productId: 'product-123',
        sellerId: 'seller-123',
        quantity: 1,
        unitPrice: 100.0,
        sellerAmount: 90.0,
        productTitle: 'Test Product',
        product: {
          id: 'product-123',
          title: 'Test Product',
          sellerId: 'seller-123',
          stock: 10,
          price: 100.0,
        },
      },
    ],
  };

  const mockProduct = {
    id: 'product-123',
    title: 'Test Product',
    price: 100.0,
    stock: 10,
    sellerId: 'seller-123',
    status: 'APPROVED',
    seller: {
      id: 'seller-123',
      sellerProfile: { commissionRate: 10 },
    },
  };

  beforeEach(async () => {
    const mockPrisma: any = {
      order: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        count: jest.fn(),
      },
      orderItem: {
        findUnique: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
        create: jest.fn(),
      },
      product: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      user: {
        findUnique: jest.fn(),
      },
      sellerProfile: {
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      sellerTransaction: {
        create: jest.fn(),
      },
      payment: {
        create: jest.fn(),
      },
      refundRequest: {
        findFirst: jest.fn(),
        findUnique: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        count: jest.fn(),
      },
    };
    mockPrisma.$transaction = jest.fn((fn: (tx: any) => any) => fn(mockPrisma));

    const mockAudit = {
      log: jest.fn(),
    };

    const mockNotification = {
      notifyUser: jest.fn(),
      websocketGateway: {
        notifyOrderStatus: jest.fn(),
      },
    };

    const mockAutoDelivery = {
      handlePaymentSuccess: jest.fn(),
    };

    const mockConfig = {
      get: jest.fn().mockImplementation((key: string) => {
        if (key === 'ORDER_AUTO_CANCEL_MINUTES') return 30;
        if (key === 'PLATFORM_FEE_RATE') return 0.05;
        return null;
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrdersService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: AuditService, useValue: mockAudit },
        { provide: NotificationService, useValue: mockNotification },
        { provide: ConfigService, useValue: mockConfig },
        { provide: AutoDeliveryService, useValue: mockAutoDelivery },
      ],
    }).compile();

    service = module.get<OrdersService>(OrdersService);
    prismaService = mockPrisma;
    _auditService = mockAudit;
    _notificationService = mockNotification;
    autoDeliveryService = mockAutoDelivery;
  });

  describe('create', () => {
    it('应该成功创建订单', async () => {
      const createDto = {
        items: [{ productId: 'product-123', quantity: 1 }],
      };

      prismaService.product.findMany.mockResolvedValue([mockProduct]);
      prismaService.order.create.mockResolvedValue(mockOrder);
      prismaService.product.update.mockResolvedValue(mockProduct);

      const result = await service.create('user-123', createDto);

      expect(result).toBeDefined();
      expect(prismaService.order.create).toHaveBeenCalled();
    });

    it('应该拒绝商品不存在或已下架', async () => {
      const createDto = {
        items: [{ productId: 'nonexistent-product', quantity: 1 }],
      };

      prismaService.product.findMany.mockResolvedValue([]);

      await expect(service.create('user-123', createDto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('应该拒绝库存不足的商品', async () => {
      const createDto = {
        items: [{ productId: 'product-123', quantity: 20 }],
      };

      const lowStockProduct = { ...mockProduct, stock: 5 };
      prismaService.product.findMany.mockResolvedValue([lowStockProduct]);

      await expect(service.create('user-123', createDto)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('findOne', () => {
    it('应该返回订单详情（买家）', async () => {
      prismaService.order.findUnique.mockResolvedValue(mockOrder);

      const result = await service.findOne('order-123', 'user-123');

      expect(result).toBeDefined();
      expect(result.id).toBe('order-123');
    });

    it('应该返回订单详情（卖家）', async () => {
      prismaService.order.findUnique.mockResolvedValue(mockOrder);

      const result = await service.findOne('order-123', 'seller-123');

      expect(result).toBeDefined();
    });

    it('应该拒绝不存在的订单', async () => {
      prismaService.order.findUnique.mockResolvedValue(null);

      await expect(
        service.findOne('nonexistent-order', 'user-123'),
      ).rejects.toThrow(NotFoundException);
    });

    it('应该拒绝无权限的用户', async () => {
      prismaService.order.findUnique.mockResolvedValue(mockOrder);

      await expect(service.findOne('order-123', 'other-user')).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('findByBuyer', () => {
    it('应该返回买家的订单列表', async () => {
      prismaService.order.findMany.mockResolvedValue([mockOrder]);
      prismaService.order.count.mockResolvedValue(1);

      const result = await service.findByBuyer('user-123', {});

      expect(result.items).toHaveLength(1);
    });

    it('应该支持分页查询', async () => {
      prismaService.order.findMany.mockResolvedValue([mockOrder]);
      prismaService.order.count.mockResolvedValue(10);

      await service.findByBuyer('user-123', { page: 2, limit: 10 });

      expect(prismaService.order.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 10,
          take: 10,
        }),
      );
    });
  });

  describe('findBySeller', () => {
    it('应该返回卖家的订单列表', async () => {
      prismaService.order.findMany.mockResolvedValue([mockOrder]);
      prismaService.order.count.mockResolvedValue(1);

      const result = await service.findBySeller('seller-123', {});

      expect(result.items).toHaveLength(1);
    });
  });

  describe('cancel', () => {
    it('应该成功取消未支付订单', async () => {
      prismaService.order.findUnique.mockResolvedValue(mockOrder);
      prismaService.order.update.mockResolvedValue({
        ...mockOrder,
        orderStatus: OrderStatus.CANCELLED,
      });
      prismaService.product.update.mockResolvedValue(mockProduct);

      const result = await service.cancel('order-123', 'user-123');

      expect(result.success).toBe(true);
    });

    it('应该拒绝不存在的订单', async () => {
      prismaService.order.findUnique.mockResolvedValue(null);

      await expect(
        service.cancel('nonexistent-order', 'user-123'),
      ).rejects.toThrow(NotFoundException);
    });

    it('应该拒绝非订单所有者取消', async () => {
      prismaService.order.findUnique.mockResolvedValue(mockOrder);

      await expect(service.cancel('order-123', 'other-user')).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('应该拒绝已支付订单取消', async () => {
      const paidOrder = { ...mockOrder, orderStatus: OrderStatus.PAID };
      prismaService.order.findUnique.mockResolvedValue(paidOrder);

      await expect(service.cancel('order-123', 'user-123')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('deliver', () => {
    it('卖家应该能交付商品', async () => {
      const paidOrder = { ...mockOrder, orderStatus: OrderStatus.PAID };
      const orderItem = { ...mockOrder.orderItems[0], order: paidOrder };

      prismaService.orderItem.findUnique.mockResolvedValue(orderItem);
      prismaService.orderItem.update.mockResolvedValue({
        ...orderItem,
        order: {
          ...paidOrder,
          buyerId: 'user-123',
          orderNo: 'ORD202603080001',
        },
      });

      const result = await service.deliver('item-1', 'seller-123', {
        deliveredCredentials: { account: 'test' },
      });

      expect(result).toBeDefined();
    });

    it('应该拒绝非订单卖家交付', async () => {
      const orderItem = { ...mockOrder.orderItems[0], order: mockOrder };
      prismaService.orderItem.findUnique.mockResolvedValue(orderItem);

      await expect(
        service.deliver('item-1', 'other-seller', { deliveredCredentials: {} }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('应该拒绝未支付订单交付', async () => {
      const orderItem = { ...mockOrder.orderItems[0], order: mockOrder };
      prismaService.orderItem.findUnique.mockResolvedValue(orderItem);

      await expect(
        service.deliver('item-1', 'seller-123', { deliveredCredentials: {} }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('confirmDelivery', () => {
    it('买家应该能确认收货', async () => {
      const deliveredOrder = {
        ...mockOrder,
        orderStatus: OrderStatus.DELIVERED,
      };
      prismaService.order.findUnique.mockResolvedValue(deliveredOrder);
      prismaService.orderItem.updateMany.mockResolvedValue({});
      prismaService.order.update.mockResolvedValue({
        ...deliveredOrder,
        orderStatus: OrderStatus.COMPLETED,
      });
      prismaService.sellerProfile.findUnique.mockResolvedValue({
        balance: 0,
        totalSales: 0,
        totalEarnings: 0,
      });
      prismaService.sellerProfile.update.mockResolvedValue({});
      prismaService.sellerTransaction.create.mockResolvedValue({});
      prismaService.orderItem.update.mockResolvedValue({});

      const result = await service.confirmDelivery('order-123', 'user-123');

      expect(result.success).toBe(true);
    });

    it('已结算订单项不应重复结算', async () => {
      const deliveredOrder = {
        ...mockOrder,
        orderStatus: OrderStatus.DELIVERED,
        orderItems: [
          {
            ...mockOrder.orderItems[0],
            settled: true,
          },
        ],
      };
      prismaService.order.findUnique.mockResolvedValue(deliveredOrder);
      prismaService.orderItem.updateMany.mockResolvedValue({});
      prismaService.order.update.mockResolvedValue({
        ...deliveredOrder,
        orderStatus: OrderStatus.COMPLETED,
      });

      const result = await service.confirmDelivery('order-123', 'user-123');

      expect(result.success).toBe(true);
      expect(prismaService.sellerProfile.update).not.toHaveBeenCalled();
      expect(prismaService.sellerTransaction.create).not.toHaveBeenCalled();
      expect(prismaService.orderItem.update).not.toHaveBeenCalled();
    });

    it('应该拒绝未交付订单确认', async () => {
      prismaService.order.findUnique.mockResolvedValue(mockOrder);

      await expect(
        service.confirmDelivery('order-123', 'user-123'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('handlePaymentSuccess (auto delivery integration)', () => {
    it('应该更新订单状态为已支付并调用自动发货服务', async () => {
      prismaService.order.update.mockResolvedValue({
        ...mockOrder,
        orderStatus: OrderStatus.PAID,
        paymentStatus: PaymentStatus.PAID,
      });
      autoDeliveryService.handlePaymentSuccess.mockResolvedValue({
        orderId: mockOrder.id,
        success: true,
      });

      const result = await service.handlePaymentSuccess(mockOrder.id);

      expect(prismaService.order.update).toHaveBeenCalledWith({
        where: { id: mockOrder.id },
        data: {
          orderStatus: OrderStatus.PAID,
          paymentStatus: PaymentStatus.PAID,
        },
      });
      expect(autoDeliveryService.handlePaymentSuccess).toHaveBeenCalledWith(
        mockOrder.id,
      );
      expect(result).toEqual(
        expect.objectContaining({ orderId: mockOrder.id, success: true }),
      );
    });

    it('自动发货失败时应该记录错误并返回失败结果', async () => {
      prismaService.order.update.mockResolvedValue({
        ...mockOrder,
        orderStatus: OrderStatus.PAID,
        paymentStatus: PaymentStatus.PAID,
      });
      autoDeliveryService.handlePaymentSuccess.mockRejectedValue(
        new Error('inventory error'),
      );

      const result = await service.handlePaymentSuccess(mockOrder.id);

      expect(prismaService.order.update).toHaveBeenCalled();
      expect(autoDeliveryService.handlePaymentSuccess).toHaveBeenCalled();
      expect(result).toEqual(
        expect.objectContaining({
          orderId: mockOrder.id,
          success: false,
          error: 'inventory error',
        }),
      );
    });
  });

  describe('退款流程', () => {
    describe('createRefundRequest', () => {
      it('应该成功申请退款', async () => {
        const paidOrder = { ...mockOrder, orderStatus: OrderStatus.PAID };
        prismaService.order.findUnique.mockResolvedValue(paidOrder);
        prismaService.refundRequest.findFirst.mockResolvedValue(null);
        prismaService.refundRequest.create.mockResolvedValue({
          id: 'refund-123',
          orderId: 'order-123',
          userId: 'user-123',
          status: 'PENDING',
        });

        const result = await service.createRefundRequest('user-123', {
          orderId: 'order-123',
          refundType: RefundType.REFUND_ONLY,
          reason: '商品问题',
          refundAmount: 100,
        });

        expect(result).toBeDefined();
      });

      it('应该拒绝非订单所有者申请退款', async () => {
        prismaService.order.findUnique.mockResolvedValue(mockOrder);

        await expect(
          service.createRefundRequest('other-user', {
            orderId: 'order-123',
            refundType: RefundType.REFUND_ONLY,
            reason: 'test',
            refundAmount: 100,
          }),
        ).rejects.toThrow(ForbiddenException);
      });

      it('应该拒绝未支付订单申请退款', async () => {
        prismaService.order.findUnique.mockResolvedValue(mockOrder);

        await expect(
          service.createRefundRequest('user-123', {
            orderId: 'order-123',
            refundType: RefundType.REFUND_ONLY,
            reason: 'test',
            refundAmount: 100,
          }),
        ).rejects.toThrow(BadRequestException);
      });
    });
  });
});
