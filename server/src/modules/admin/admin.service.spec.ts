import { Test, TestingModule } from '@nestjs/testing';
import { AdminService } from './admin.service';
import { PrismaService } from '../../prisma/prisma.service';
import { NotFoundException } from '@nestjs/common';
import { AuditService } from '../../common/audit';

describe('AdminService', () => {
  let service: AdminService;
  let prismaService: any;

  const mockUser = {
    id: 'user-001',
    email: 'user@example.com',
    username: 'testuser',
    status: 'ACTIVE',
    isSeller: false,
    createdAt: new Date(),
  };

  const mockSeller = {
    id: 'seller-001',
    userId: 'user-001',
    shopName: '测试店铺',
    applicationStatus: 'PENDING',
  };

  beforeEach(async () => {
    const mockPrisma: any = {
      user: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
        update: jest.fn(),
        count: jest.fn(),
        delete: jest.fn(),
      },
      sellerProfile: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
        update: jest.fn(),
        count: jest.fn(),
      },
      product: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
        update: jest.fn(),
        count: jest.fn(),
      },
      order: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
        count: jest.fn(),
        aggregate: jest.fn().mockResolvedValue({ _sum: { amount: 0 } }),
      },
      payment: {
        aggregate: jest.fn().mockResolvedValue({ _sum: { amount: 0 } }),
      },
      ticket: {
        findMany: jest.fn(),
        count: jest.fn().mockResolvedValue(0),
      },
      systemConfig: {
        findFirst: jest.fn(),
        upsert: jest.fn(),
        findMany: jest.fn(),
      },
      auditLog: {
        findMany: jest.fn(),
        count: jest.fn(),
      },
      refundRequest: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
        count: jest.fn(),
      },
      sellerTransaction: {
        findMany: jest.fn(),
        count: jest.fn(),
        aggregate: jest.fn().mockResolvedValue({ _sum: { amount: 0 } }),
      },
      ticketMessage: {
        create: jest.fn(),
        findMany: jest.fn(),
      },
      adSlot: {
        findMany: jest.fn(),
        upsert: jest.fn(),
      },
      $transaction: jest.fn((fn: (tx: any) => any) => fn(mockPrisma)),
    };

    const mockAudit = { log: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: AuditService, useValue: mockAudit },
      ],
    }).compile();

    service = module.get<AdminService>(AdminService);
    prismaService = mockPrisma;
  });

  // -- getUsers ------------------------------------------------
  describe('getUsers', () => {
    it('应返回用户列表（含分页）', async () => {
      prismaService.user.findMany.mockResolvedValue([mockUser]);
      prismaService.user.count.mockResolvedValue(1);

      const result = await service.getUsers({});

      expect(result.items).toHaveLength(1);
      expect(result.total).toBe(1);
    });

    it('应支持关键词搜索（search 字段）', async () => {
      prismaService.user.findMany.mockResolvedValue([mockUser]);
      prismaService.user.count.mockResolvedValue(1);

      await service.getUsers({ search: 'test' } as any);

      expect(prismaService.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ OR: expect.any(Array) }),
        }),
      );
    });
  });

  // -- updateUserStatus ----------------------------------------
  describe('updateUserStatus', () => {
    it('应成功封禁用户', async () => {
      prismaService.user.findUnique.mockResolvedValue(mockUser);
      prismaService.user.update.mockResolvedValue({
        ...mockUser,
        status: 'BANNED',
      });

      const result = await service.updateUserStatus(
        'user-001',
        { status: 'BANNED' } as any,
        'admin-001',
      );

      expect(result.status).toBe('BANNED');
    });

    it('用户不存在 -> 应抛出 NotFoundException', async () => {
      prismaService.user.findUnique.mockResolvedValue(null);

      await expect(
        service.updateUserStatus(
          'nonexistent',
          { status: 'BANNED' } as any,
          'admin-001',
        ),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // -- auditSeller ---------------------------------------------
  describe('auditSeller', () => {
    it('应成功审批卖家申请', async () => {
      prismaService.sellerProfile.findUnique.mockResolvedValue(mockSeller);
      prismaService.sellerProfile.update.mockResolvedValue({
        ...mockSeller,
        applicationStatus: 'APPROVED',
      });
      prismaService.user.update.mockResolvedValue({
        ...mockUser,
        isSeller: true,
      });

      const result = await service.auditSeller(
        'seller-001',
        { approved: true } as any,
        'admin-001',
      );

      expect(result).toBeDefined();
    });

    it('卖家档案不存在 -> 应抛出 NotFoundException', async () => {
      prismaService.sellerProfile.findUnique.mockResolvedValue(null);

      await expect(
        service.auditSeller(
          'nonexistent',
          { approved: true } as any,
          'admin-001',
        ),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // -- auditProduct --------------------------------------------
  describe('auditProduct', () => {
    it('应成功审批商品上架', async () => {
      prismaService.product.findUnique.mockResolvedValue({
        id: 'product-001',
        status: 'PENDING',
        sellerId: 'seller-001',
      });
      prismaService.product.update.mockResolvedValue({
        id: 'product-001',
        status: 'APPROVED',
      });

      const result = await service.auditProduct(
        'product-001',
        { approved: true } as any,
        'admin-001',
      );

      expect(result).toBeDefined();
    });
  });

  // -- getDashboardStats ---------------------------------------
  describe('getDashboardStats', () => {
    it('应返回仪表盘统计数据', async () => {
      prismaService.user.count.mockResolvedValue(100);
      prismaService.order.count.mockResolvedValue(50);
      prismaService.payment.aggregate.mockResolvedValue({
        _sum: { amount: 5000 },
      });
      prismaService.ticket.count.mockResolvedValue(5);

      const result = await service.getDashboardStats();

      expect(result).toBeDefined();
      expect(result.userCount).toBe(100);
    });
  });
});
