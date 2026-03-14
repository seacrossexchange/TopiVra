import { Test, TestingModule } from '@nestjs/testing';
import { AutoDeliveryService } from './auto-delivery.service';
import { PrismaService } from '../../prisma/prisma.service';
import { InventoryService } from './inventory.service';
import { NotificationService } from '../../common/notification/notification.service';
import { DeliveryEventsService } from '../orders/delivery-events.service';

describe('AutoDeliveryService', () => {
  let service: AutoDeliveryService;
  let prisma: any;
  let inventoryService: {
    getAvailableAccount: jest.Mock;
    markAsSold: jest.Mock;
  };
  let notificationService: any;
  let deliveryEventsService: any;

  const mockBuyer = {
    id: 'buyer-001',
    username: 'testbuyer',
    email: 'buyer@test.com',
  };

  const makeOrder = (overrides: Partial<any> = {}) => ({
    id: 'order-001',
    orderNo: 'ORD202603010001',
    buyerId: 'buyer-001',
    buyer: mockBuyer,
    orderItems: [
      {
        id: 'item-001',
        productId: 'prod-001',
        sellerId: 'seller-001',
        quantity: 1,
        product: {
          id: 'prod-001',
          title: 'Test Product',
          autoDeliver: true,
        },
      },
    ],
    ...overrides,
  });

  beforeEach(async () => {
    prisma = {
      order: {
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      orderItem: {
        update: jest.fn(),
      },
      productInventory: {
        updateMany: jest.fn(),
      },
    };

    inventoryService = {
      getAvailableAccount: jest.fn(),
      markAsSold: jest
        .fn()
        .mockResolvedValue({ id: 'inv-001', status: 'SOLD' } as any),
    };

    notificationService = {
      notifyUser: jest.fn(),
      websocketGateway: {
        notifyOrderStatus: jest.fn(),
      },
    };

    deliveryEventsService = {
      emit: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AutoDeliveryService,
        { provide: PrismaService, useValue: prisma },
        { provide: InventoryService, useValue: inventoryService },
        { provide: NotificationService, useValue: notificationService },
        { provide: DeliveryEventsService, useValue: deliveryEventsService },
      ],
    }).compile();

    service = module.get<AutoDeliveryService>(AutoDeliveryService);
  });

  // ──────────────────────────────────────────────
  // handlePaymentSuccess - 正常全部发货成功
  // ──────────────────────────────────────────────
  describe('handlePaymentSuccess', () => {
    it('全部自动发货成功 -> 返回 success=true，更新订单状态为 DELIVERED', async () => {
      const order = makeOrder();
      prisma.order.findUnique.mockResolvedValue(order);
      prisma.order.update.mockResolvedValue({
        ...order,
        orderStatus: 'DELIVERED',
      });
      prisma.orderItem.update.mockResolvedValue({});

      inventoryService.getAvailableAccount.mockResolvedValue({
        id: 'inv-001',
        accountData: 'user:pass',
        productId: 'prod-001',
      });
      inventoryService.markAsSold.mockResolvedValue({
        id: 'inv-001',
        status: 'SOLD',
      } as any);

      const result = await service.handlePaymentSuccess('order-001');

      expect(result.success).toBe(true);
      expect(result.orderId).toBe('order-001');
      expect(result.results).toHaveLength(1);
      expect(result.results[0].success).toBe(true);

      // 订单状态更新为已发货
      expect(prisma.order.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'order-001' },
          data: { orderStatus: 'DELIVERED' },
        }),
      );

      // 发送发货完成事件
      expect(deliveryEventsService.emit).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'COMPLETED', success: true }),
      );

      // 通知买家
      expect(notificationService.notifyUser).toHaveBeenCalledWith(
        'buyer-001',
        expect.objectContaining({ type: 'ORDER_DELIVERED' }),
      );
    });

    it('商品不支持自动发货 -> 该 item 标记失败，整体 success=false', async () => {
      const order = makeOrder({
        orderItems: [
          {
            id: 'item-001',
            productId: 'prod-001',
            sellerId: 'seller-001',
            quantity: 1,
            product: {
              id: 'prod-001',
              title: 'Manual Product',
              autoDeliver: false,
            },
          },
        ],
      });
      prisma.order.findUnique.mockResolvedValue(order);
      prisma.order.update.mockResolvedValue(order);

      const result = await service.handlePaymentSuccess('order-001');

      expect(result.success).toBe(false);
      expect(result.results[0].success).toBe(false);
      expect(result.results[0].reason).toBe('NOT_AUTO_DELIVER');

      // 应触发部分失败事件
      expect(deliveryEventsService.emit).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'PARTIAL_FAILED' }),
      );
    });

    it('库存不足时抛错 -> 该 item 标记失败，通知卖家', async () => {
      const order = makeOrder();
      prisma.order.findUnique.mockResolvedValue(order);
      prisma.order.update.mockResolvedValue(order);

      inventoryService.getAvailableAccount.mockResolvedValue(null); // 无可用账号

      const result = await service.handlePaymentSuccess('order-001');

      expect(result.success).toBe(false);
      expect(result.results[0].success).toBe(false);
      expect(result.results[0].error).toContain('库存不足');

      // 应通知卖家处理
      expect(notificationService.notifyUser).toHaveBeenCalledWith(
        'seller-001',
        expect.objectContaining({ type: 'ORDER_DELIVERY_FAILED' }),
      );
    });

    it('订单不存在时抛出 Error', async () => {
      prisma.order.findUnique.mockResolvedValue(null);

      await expect(
        service.handlePaymentSuccess('nonexistent-order'),
      ).rejects.toThrow('订单不存在');
    });

    it('多 item 订单 - 部分成功部分失败 -> success=false，各自记录结果', async () => {
      const order = makeOrder({
        orderItems: [
          {
            id: 'item-001',
            productId: 'prod-001',
            sellerId: 'seller-001',
            quantity: 1,
            product: { id: 'prod-001', title: 'Product A', autoDeliver: true },
          },
          {
            id: 'item-002',
            productId: 'prod-002',
            sellerId: 'seller-001',
            quantity: 1,
            product: { id: 'prod-002', title: 'Product B', autoDeliver: true },
          },
        ],
      });
      prisma.order.findUnique.mockResolvedValue(order);
      prisma.order.update.mockResolvedValue(order);
      prisma.orderItem.update.mockResolvedValue({});

      inventoryService.getAvailableAccount
        .mockResolvedValueOnce({
          id: 'inv-001',
          accountData: 'user:pass',
          productId: 'prod-001',
        }) // 第一个成功
        .mockResolvedValueOnce(null); // 第二个无库存

      inventoryService.markAsSold.mockResolvedValue({
        id: 'inv-001',
        status: 'SOLD',
      } as any);

      const result = await service.handlePaymentSuccess('order-001');

      expect(result.success).toBe(false);
      expect(result.results).toHaveLength(2);
      expect(result.results[0].success).toBe(true);
      expect(result.results[1].success).toBe(false);
    });

    it('quantity > 1 时应分配多个账号', async () => {
      const order = makeOrder({
        orderItems: [
          {
            id: 'item-001',
            productId: 'prod-001',
            sellerId: 'seller-001',
            quantity: 3,
            product: { id: 'prod-001', title: 'Product A', autoDeliver: true },
          },
        ],
      });
      prisma.order.findUnique.mockResolvedValue(order);
      prisma.order.update.mockResolvedValue({
        ...order,
        orderStatus: 'DELIVERED',
      });
      prisma.orderItem.update.mockResolvedValue({});

      inventoryService.getAvailableAccount.mockResolvedValue({
        id: 'inv-001',
        accountData: 'user:pass',
        productId: 'prod-001',
      });
      inventoryService.markAsSold.mockResolvedValue({
        id: 'inv-001',
        status: 'SOLD',
      } as any);

      const result = await service.handlePaymentSuccess('order-001');

      expect(result.success).toBe(true);
      // getAvailableAccount 应该被调用 3 次（每件商品一次）
      expect(inventoryService.getAvailableAccount).toHaveBeenCalledTimes(3);
      expect(inventoryService.markAsSold).toHaveBeenCalledTimes(3);
      expect(result.results[0].accountCount).toBe(3);
    });

    it('发货流程开始时应发出 STARTED 事件', async () => {
      const order = makeOrder();
      prisma.order.findUnique.mockResolvedValue(order);
      prisma.order.update.mockResolvedValue({
        ...order,
        orderStatus: 'DELIVERED',
      });
      prisma.orderItem.update.mockResolvedValue({});

      inventoryService.getAvailableAccount.mockResolvedValue({
        id: 'inv-001',
        accountData: 'user:pass',
      });
      inventoryService.markAsSold.mockResolvedValue({
        id: 'inv-001',
        status: 'SOLD',
      } as any);

      await service.handlePaymentSuccess('order-001');

      expect(deliveryEventsService.emit).toHaveBeenCalledWith(
        expect.objectContaining({ orderId: 'order-001', type: 'STARTED' }),
      );
    });
  });

  // ──────────────────────────────────────────────
  // checkInventoryAvailability
  // ──────────────────────────────────────────────
  describe('checkInventoryAvailability', () => {
    it('库存充足时返回 available=true', async () => {
      prisma.productInventory = {
        ...prisma.productInventory,
        count: jest.fn().mockResolvedValue(5),
      };

      const result = await service.checkInventoryAvailability('prod-001', 3);

      expect(result.available).toBe(true);
      expect(result.availableCount).toBe(5);
      expect(result.requiredCount).toBe(3);
    });

    it('库存不足时返回 available=false', async () => {
      prisma.productInventory = {
        ...prisma.productInventory,
        count: jest.fn().mockResolvedValue(2),
      };

      const result = await service.checkInventoryAvailability('prod-001', 5);

      expect(result.available).toBe(false);
      expect(result.availableCount).toBe(2);
    });
  });

  // ──────────────────────────────────────────────
  // reserveInventory
  // ──────────────────────────────────────────────
  describe('reserveInventory', () => {
    it('应该成功预留库存', async () => {
      const inventories = [
        { id: 'inv-001', productId: 'prod-001', status: 'AVAILABLE' },
        { id: 'inv-002', productId: 'prod-001', status: 'AVAILABLE' },
      ];
      prisma.productInventory = {
        ...prisma.productInventory,
        findMany: jest.fn().mockResolvedValue(inventories),
        updateMany: jest.fn().mockResolvedValue({ count: 2 }),
      };

      const result = await service.reserveInventory('prod-001', 2, 'order-001');

      expect(result).toHaveLength(2);
      expect(prisma.productInventory.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: 'RESERVED',
            orderId: 'order-001',
          }),
        }),
      );
    });

    it('库存不足时抛出 Error', async () => {
      prisma.productInventory = {
        ...prisma.productInventory,
        findMany: jest.fn().mockResolvedValue([{ id: 'inv-001' }]), // 只有 1 个，需要 3 个
      };

      await expect(
        service.reserveInventory('prod-001', 3, 'order-001'),
      ).rejects.toThrow('库存不足');
    });
  });

  // ──────────────────────────────────────────────
  // releaseReservedInventory
  // ──────────────────────────────────────────────
  describe('releaseReservedInventory', () => {
    it('应该成功释放预留库存', async () => {
      prisma.productInventory = {
        ...prisma.productInventory,
        updateMany: jest.fn().mockResolvedValue({ count: 2 }),
      };

      const result = await service.releaseReservedInventory('order-001');

      expect(result.count).toBe(2);
      expect(prisma.productInventory.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            orderId: 'order-001',
            status: 'RESERVED',
          }),
          data: expect.objectContaining({ status: 'AVAILABLE', orderId: null }),
        }),
      );
    });
  });
});
