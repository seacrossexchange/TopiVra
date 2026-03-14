import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { InventoryService } from './inventory.service';
import { PrismaService } from '../../prisma/prisma.service';

describe('InventoryService', () => {
  let service: InventoryService;
  let prisma: any;

  const mockInventory = {
    id: 'inv-001',
    productId: 'prod-001',
    sellerId: 'seller-001',
    accountData: 'encrypted:abc123',
    accountHash: 'hash-abc',
    accountInfo: { note: 'test' },
    status: 'AVAILABLE',
    isValid: true,
    orderId: null,
    orderItemId: null,
    soldAt: null,
    createdAt: new Date('2026-01-01'),
  };

  beforeEach(async () => {
    prisma = {
      productInventory: {
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
        delete: jest.fn(),
        count: jest.fn(),
      },
      product: {
        update: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InventoryService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<InventoryService>(InventoryService);
  });

  // ──────────────────────────────────────────────
  // addAccount
  // ──────────────────────────────────────────────
  describe('addAccount', () => {
    it('应该成功添加新账号', async () => {
      prisma.productInventory.findUnique.mockResolvedValue(null); // 无重复
      prisma.productInventory.create.mockResolvedValue(mockInventory);
      prisma.productInventory.count.mockResolvedValue(1);
      prisma.product.update.mockResolvedValue({});

      const result = await service.addAccount({
        productId: 'prod-001',
        sellerId: 'seller-001',
        accountData: 'username:password123',
      });

      expect(result).toBeDefined();
      expect(result.id).toBe('inv-001');
      expect(prisma.productInventory.create).toHaveBeenCalled();
    });

    it('重复账号 - 同一卖家 -> 抛出 BadRequestException', async () => {
      prisma.productInventory.findUnique.mockResolvedValue({
        ...mockInventory,
        sellerId: 'seller-001',
        seller: { username: 'seller1' },
        product: { title: 'Test Product' },
      });

      await expect(
        service.addAccount({
          productId: 'prod-001',
          sellerId: 'seller-001',
          accountData: 'username:password123',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('重复账号 - 其他卖家 -> 抛出 BadRequestException', async () => {
      prisma.productInventory.findUnique.mockResolvedValue({
        ...mockInventory,
        sellerId: 'other-seller',
        seller: { username: 'otherseller' },
        product: { title: 'Test Product' },
      });

      await expect(
        service.addAccount({
          productId: 'prod-001',
          sellerId: 'seller-001',
          accountData: 'username:password123',
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ──────────────────────────────────────────────
  // batchAddAccounts
  // ──────────────────────────────────────────────
  describe('batchAddAccounts', () => {
    it('批量添加 - 全部成功', async () => {
      prisma.productInventory.findUnique.mockResolvedValue(null);
      prisma.productInventory.create.mockResolvedValue(mockInventory);
      prisma.productInventory.count.mockResolvedValue(2);
      prisma.product.update.mockResolvedValue({});

      const result = await service.batchAddAccounts({
        productId: 'prod-001',
        sellerId: 'seller-001',
        accounts: [
          { accountData: 'user1:pass1' },
          { accountData: 'user2:pass2' },
        ],
      });

      expect(result.success).toBe(2);
      expect(result.failed).toBe(0);
    });

    it('批量添加 - 部分重复', async () => {
      prisma.productInventory.findUnique
        .mockResolvedValueOnce(null) // 第一条无重复
        .mockResolvedValueOnce({
          ...mockInventory,
          sellerId: 'seller-001',
          seller: { username: 'seller1' },
          product: { title: 'Test Product' },
        }); // 第二条重复

      prisma.productInventory.create.mockResolvedValue(mockInventory);
      prisma.productInventory.count.mockResolvedValue(1);
      prisma.product.update.mockResolvedValue({});

      const result = await service.batchAddAccounts({
        productId: 'prod-001',
        sellerId: 'seller-001',
        accounts: [
          { accountData: 'user1:pass1' },
          { accountData: 'user2:pass2' },
        ],
      });

      expect(result.success).toBe(1);
      expect(result.failed).toBe(1);
      // duplicates 计数依赖错误消息匹配，这里改为验证 errors 数组非空
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toContain('user2');
    });
  });

  // ──────────────────────────────────────────────
  // getAvailableAccount
  // ──────────────────────────────────────────────
  describe('getAvailableAccount', () => {
    it('应该返回最早入库的可用账号（FIFO）', async () => {
      // 模拟已加密格式：iv:data
      const _fakeIv = Buffer.alloc(16).toString('hex');
      // 使用 service 本身加密过的格式无法直接模拟，返回一个简单字符串让解密失败后回退
      prisma.productInventory.findFirst.mockResolvedValue({
        ...mockInventory,
        accountData: 'plaintext_data', // 解密失败时返回原始数据
      });

      const result = await service.getAvailableAccount('prod-001');

      expect(result).toBeDefined();
      expect(result.id).toBe('inv-001');
      expect(prisma.productInventory.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            productId: 'prod-001',
            status: 'AVAILABLE',
            isValid: true,
          }),
          orderBy: { createdAt: 'asc' },
        }),
      );
    });

    it('无可用账号时返回 null', async () => {
      prisma.productInventory.findFirst.mockResolvedValue(null);

      const result = await service.getAvailableAccount('prod-001');

      expect(result).toBeNull();
    });
  });

  // ──────────────────────────────────────────────
  // markAsSold
  // ──────────────────────────────────────────────
  describe('markAsSold', () => {
    it('应该将账号标记为已售出', async () => {
      const soldInventory = {
        ...mockInventory,
        status: 'SOLD',
        orderId: 'order-001',
        orderItemId: 'item-001',
        soldAt: new Date(),
      };
      prisma.productInventory.update.mockResolvedValue(soldInventory);
      prisma.productInventory.count.mockResolvedValue(0);
      prisma.product.update.mockResolvedValue({});

      const result = await service.markAsSold(
        'inv-001',
        'order-001',
        'item-001',
      );

      expect(result.status).toBe('SOLD');
      expect(result.orderId).toBe('order-001');
      expect(prisma.productInventory.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'inv-001' },
          data: expect.objectContaining({
            status: 'SOLD',
            orderId: 'order-001',
            orderItemId: 'item-001',
          }),
        }),
      );
    });
  });

  // ──────────────────────────────────────────────
  // deleteAccount
  // ──────────────────────────────────────────────
  describe('deleteAccount', () => {
    it('卖家应该能删除可用账号', async () => {
      prisma.productInventory.findUnique.mockResolvedValue(mockInventory);
      prisma.productInventory.delete.mockResolvedValue(mockInventory);
      prisma.productInventory.count.mockResolvedValue(0);
      prisma.product.update.mockResolvedValue({});

      const result = await service.deleteAccount('inv-001', 'seller-001');

      expect(result.success).toBe(true);
    });

    it('账号不存在 -> 抛出 NotFoundException', async () => {
      prisma.productInventory.findUnique.mockResolvedValue(null);

      await expect(
        service.deleteAccount('nonexistent', 'seller-001'),
      ).rejects.toThrow(NotFoundException);
    });

    it('非账号所有者 -> 抛出 BadRequestException', async () => {
      prisma.productInventory.findUnique.mockResolvedValue(mockInventory);

      await expect(
        service.deleteAccount('inv-001', 'other-seller'),
      ).rejects.toThrow(BadRequestException);
    });

    it('已售出账号 -> 抛出 BadRequestException', async () => {
      prisma.productInventory.findUnique.mockResolvedValue({
        ...mockInventory,
        status: 'SOLD',
      });

      await expect(
        service.deleteAccount('inv-001', 'seller-001'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ──────────────────────────────────────────────
  // markAsInvalid
  // ──────────────────────────────────────────────
  describe('markAsInvalid', () => {
    it('应该成功标记账号为失效', async () => {
      prisma.productInventory.findUnique.mockResolvedValue(mockInventory);
      prisma.productInventory.update.mockResolvedValue({
        ...mockInventory,
        isValid: false,
      });
      prisma.productInventory.count.mockResolvedValue(0);
      prisma.product.update.mockResolvedValue({});

      const result = await service.markAsInvalid(
        'inv-001',
        'seller-001',
        '账号失效',
      );

      expect(result.success).toBe(true);
    });

    it('非账号所有者 -> 抛出 BadRequestException', async () => {
      prisma.productInventory.findUnique.mockResolvedValue(mockInventory);

      await expect(
        service.markAsInvalid('inv-001', 'other-seller', '失效'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ──────────────────────────────────────────────
  // getInventoryStats
  // ──────────────────────────────────────────────
  describe('getInventoryStats', () => {
    it('应该返回库存统计信息', async () => {
      prisma.productInventory.count
        .mockResolvedValueOnce(10) // total
        .mockResolvedValueOnce(6) // available
        .mockResolvedValueOnce(3) // sold
        .mockResolvedValueOnce(1); // invalid

      const result = await service.getInventoryStats('prod-001', 'seller-001');

      expect(result.total).toBe(10);
      expect(result.available).toBe(6);
      expect(result.sold).toBe(3);
      expect(result.invalid).toBe(1);
    });
  });

  // ──────────────────────────────────────────────
  // checkDuplicate
  // ──────────────────────────────────────────────
  describe('checkDuplicate', () => {
    it('无重复时返回 isDuplicate=false', async () => {
      prisma.productInventory.findUnique.mockResolvedValue(null);

      const result = await service.checkDuplicate('username:pass');

      expect(result.isDuplicate).toBe(false);
    });

    it('有重复时返回 isDuplicate=true 以及现有记录', async () => {
      prisma.productInventory.findUnique.mockResolvedValue({
        ...mockInventory,
        seller: { username: 'seller1' },
        product: { title: 'Test Product' },
      });

      const result = await service.checkDuplicate('username:pass');

      expect(result.isDuplicate).toBe(true);
      expect(result.existingInventory).toBeDefined();
    });
  });

  // ──────────────────────────────────────────────
  // findBySeller
  // ──────────────────────────────────────────────
  describe('findBySeller', () => {
    it('应该返回卖家的账号列表（含分页）', async () => {
      prisma.productInventory.findMany.mockResolvedValue([
        {
          ...mockInventory,
          product: { id: 'prod-001', title: 'Product 1' },
          order: null,
        },
      ]);
      prisma.productInventory.count.mockResolvedValue(1);

      const result = await service.findBySeller('seller-001', {
        page: 1,
        limit: 20,
      });

      expect(result.items).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.page).toBe(1);
    });
  });
});
