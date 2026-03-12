import { Test, TestingModule } from '@nestjs/testing';
import { AdminService } from './admin.service';
import { PrismaService } from '../../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { AuditService } from '../../common/audit';
import { NotificationService } from '../../common/notification';

describe('AdminService', () => {
  let service: AdminService;
  let prismaService: any;

  const mockUser = {
    id: 'user-001',
    email: 'user@example.com',
    username: 'testuser',
    status: 'ACTIVE',
    isSeller: false,
    roles: [{ role: 'USER' }],
    createdAt: new Date(),
  };

  const mockSeller = {
    id: 'seller-001',
    userId: 'user-001',
    shopName: '测试店铺',
    isVerified: false,
    commissionRate: 10,
  };

  beforeEach(async () => {
    const mockPrisma = {
      user: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
        update: jest.fn(),
        count: jest.fn(),
      },
      sellerProfile: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
        update: jest.fn(),
        count: jest.fn(),
      },
      product: {
        findMany: jest.fn(),
        update: jest.fn(),
        count: jest.fn(),
      },
      order: {
        findMany: jest.fn(),
        count: jest.fn(),
        aggregate: jest.fn(),
      },
      withdrawal: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
        count: jest.fn(),
      },
      systemConfig: {
        findFirst: jest.fn(),
        upsert: jest.fn(),
      },
      $transaction: jest.fn((fn: any) => fn(mockPrisma)),
    };

    const mockAudit = { log: jest.fn() };
    const mockNotification = { notifyUser: jest.fn() };
    const mockConfig = { get: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: AuditService, useValue: mockAudit },
        { provide: NotificationService, useValue: mockNotification },
        { provide: ConfigService, useValue: mockConfig },
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

    it('应支持关键词搜索', async () => {
      prismaService.user.findMany.mockResolvedValue([mockUser]);
      prismaService.user.count.mockResolvedValue(1);

      await service.getUsers({ keyword: 'test' });

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
        service.updateUserStatus('nonexistent', { status: 'BANNED' } as any, 'admin-001'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // -- verifySeller --------------------------------------------
  describe('verifySeller', () => {
    it('应成功审批卖家申请', async () => {
      prismaService.sellerProfile.findUnique.mockResolvedValue(mockSeller);
      prismaService.sellerProfile.update.mockResolvedValue({
        ...mockSeller,
        isVerified: true,
      });

      const result = await service.verifySeller(
        'seller-001',
        { approved: true } as any,
        'admin-001',
      );

      expect(result.isVerified).toBe(true);
    });

    it('应成功拒绝卖家申请', async () => {
      prismaService.sellerProfile.findUnique.mockResolvedValue(mockSeller);
      prismaService.sellerProfile.update.mockResolvedValue({
        ...mockSeller,
        isVerified: false,
      });

      const result = await service.verifySeller(
        'seller-001',
        { approved: false, reason: '资料不完整' } as any,
        'admin-001',
      );

      expect(result.isVerified).toBe(false);
    });
  });

  // -- approveProduct ------------------------------------------
  describe('approveProduct', () => {
    it('应成功审批商品上架', async () => {
      prismaService.product.update.mockResolvedValue({
        id: 'product-001',
        status: 'APPROVED',
      });

      const result = await service.approveProduct(
        'product-001',
        { approved: true } as any,
        'admin-001',
      );

      expect(result.status).toBe('APPROVED');
    });

    it('应成功拒绝商品上架', async () => {
      prismaService.product.update.mockResolvedValue({
        id: 'product-001',
        status: 'REJECTED',
      });

      const result = await service.approveProduct(
        'product-001',
        { approved: false, reason: '违规内容' } as any,
        'admin-001',
      );

      expect(result.status).toBe('REJECTED');
    });
  });

  // -- processWithdrawal ---------------------------------------
  describe('processWithdrawal', () => {
    it('应成功处理提现申请', async () => {
      prismaService.withdrawal.findUnique.mockResolvedValue({
        id: 'withdrawal-001',
        status: 'PENDING',
        amount: 100,
        sellerId: 'seller-001',
      });
      prismaService.withdrawal.update.mockResolvedValue({
        id: 'withdrawal-001',
        status: 'APPROVED',
      });

      const result = await service.processWithdrawal(
        'withdrawal-001',
        { approved: true } as any,
        'admin-001',
      );

      expect(result).toBeDefined();
    });

    it('提现申请不存在 -> 应抛出 NotFoundException', async () => {
      prismaService.withdrawal.findUnique.mockResolvedValue(null);

      await expect(
        service.processWithdrawal('nonexistent', { approved: true } as any, 'admin-001'),
      ).rejects.toThrow(NotFoundException);
    });

    it('已处理的申请 -> 应抛出 BadRequestException', async () => {
      prismaService.withdrawal.findUnique.mockResolvedValue({
        id: 'withdrawal-001',
        status: 'APPROVED',
      });

      await expect(
        service.processWithdrawal('withdrawal-001', { approved: true } as any, 'admin-001'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // -- getDashboardStats ---------------------------------------
  describe('getDashboardStats', () => {
    it('应返回仪表盘统计数据', async () => {
      prismaService.user.count.mockResolvedValue(100);
      prismaService.order.count.mockResolvedValue(50);
      prismaService.order.aggregate.mockResolvedValue({
        _sum: { totalAmount: 5000 },
      });
      prismaService.product.count.mockResolvedValue(200);
      prismaService.sellerProfile.count.mockResolvedValue(20);

      const result = await service.getDashboardStats();

      expect(result).toBeDefined();
    });
  });
});
