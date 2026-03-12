import { Test, TestingModule } from '@nestjs/testing';
import { SellersService } from './sellers.service';
import { PrismaService } from '../../prisma/prisma.service';
import { BadRequestException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { AuditService } from '../../common/audit';
import { NotificationService } from '../../common/notification';
import { ConfigService } from '@nestjs/config';

describe('SellersService', () => {
  let service: SellersService;
  let prismaService: any;

  const mockUser = {
    id: 'user-001',
    email: 'seller@example.com',
    username: 'testSeller',
    isSeller: false,
    status: 'ACTIVE',
  };

  const mockSellerProfile = {
    id: 'seller-profile-001',
    userId: 'user-001',
    shopName: '测试店铺',
    description: '店铺描述',
    isVerified: true,
    commissionRate: 10,
    balance: 500.00,
    frozenBalance: 0,
  };

  const mockWithdrawal = {
    id: 'withdrawal-001',
    sellerId: 'user-001',
    amount: 100,
    status: 'PENDING',
    createdAt: new Date(),
  };

  beforeEach(async () => {
    const mockPrisma = {
      user: {
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      sellerProfile: {
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
      },
      sellerTransaction: {
        findMany: jest.fn(),
        count: jest.fn(),
      },
      withdrawal: {
        create: jest.fn(),
        findUnique: jest.fn(),
        findMany: jest.fn(),
        update: jest.fn(),
        count: jest.fn(),
      },
      $transaction: jest.fn((fn: any) => fn(mockPrisma)),
    };

    const mockAudit = { log: jest.fn() };
    const mockNotification = { notifyUser: jest.fn() };
    const mockConfig = {
      get: jest.fn().mockImplementation((key: string) => {
        if (key === 'MIN_WITHDRAWAL_AMOUNT') return 50;
        if (key === 'MAX_WITHDRAWAL_AMOUNT') return 10000;
        return null;
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SellersService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: AuditService, useValue: mockAudit },
        { provide: NotificationService, useValue: mockNotification },
        { provide: ConfigService, useValue: mockConfig },
      ],
    }).compile();

    service = module.get<SellersService>(SellersService);
    prismaService = mockPrisma;
  });

  // ── apply（申请成为卖家）────────────────────────────────────
  describe('apply', () => {
    it('普通用户应能成功申请成为卖家', async () => {
      prismaService.user.findUnique.mockResolvedValue(mockUser);
      prismaService.sellerProfile.findUnique.mockResolvedValue(null);
      prismaService.sellerProfile.create.mockResolvedValue(mockSellerProfile);
      prismaService.user.update.mockResolvedValue({ ...mockUser, isSeller: true });

      const dto = { shopName: '新店铺', description: '店铺描述' };
      const result = await service.apply('user-001', dto as any);

      expect(result).toBeDefined();
    });

    it('已是卖家 → 应抛出 BadRequestException', async () => {
      prismaService.user.findUnique.mockResolvedValue({
        ...mockUser,
        isSeller: true,
      });
      prismaService.sellerProfile.findUnique.mockResolvedValue(mockSellerProfile);

      await expect(
        service.apply('user-001', { shopName: '重复申请' } as any),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ── getProfile ───────────────────────────────────────────────
  describe('getProfile', () => {
    it('应返回卖家资料', async () => {
      prismaService.sellerProfile.findUnique.mockResolvedValue(mockSellerProfile);

      const result = await service.getProfile('user-001');

      expect(result).toBeDefined();
      expect(result.shopName).toBe('测试店铺');
    });

    it('卖家资料不存在 → 应抛出 NotFoundException', async () => {
      prismaService.sellerProfile.findUnique.mockResolvedValue(null);

      await expect(service.getProfile('nonexistent')).rejects.toThrow(NotFoundException);
    });
  });

  // ── updateProfile ────────────────────────────────────────────
  describe('updateProfile', () => {
    it('应成功更新卖家资料', async () => {
      prismaService.sellerProfile.findUnique.mockResolvedValue(mockSellerProfile);
      prismaService.sellerProfile.update.mockResolvedValue({
        ...mockSellerProfile,
        description: '新描述',
      });

      const result = await service.updateProfile('user-001', {
        description: '新描述',
      } as any);

      expect(result.description).toBe('新描述');
    });
  });

  // ── requestWithdrawal ────────────────────────────────────────
  describe('requestWithdrawal', () => {
    it('余额充足 → 应成功申请提现', async () => {
      prismaService.sellerProfile.findUnique.mockResolvedValue(mockSellerProfile);
      prismaService.withdrawal.create.mockResolvedValue(mockWithdrawal);
      prismaService.sellerProfile.update.mockResolvedValue(mockSellerProfile);

      const result = await service.requestWithdrawal('user-001', {
        amount: 100,
        paymentMethod: 'BANK',
        accountInfo: { bankAccount: '****' },
      } as any);

      expect(result).toBeDefined();
    });

    it('余额不足 → 应抛出 BadRequestException', async () => {
      prismaService.sellerProfile.findUnique.mockResolvedValue({
        ...mockSellerProfile,
        balance: 10,
      });

      await expect(
        service.requestWithdrawal('user-001', {
          amount: 500,
          paymentMethod: 'BANK',
          accountInfo: {},
        } as any),
      ).rejects.toThrow(BadRequestException);
    });

    it('低于最低提现金额 → 应抛出 BadRequestException', async () => {
      prismaService.sellerProfile.findUnique.mockResolvedValue(mockSellerProfile);

      await expect(
        service.requestWithdrawal('user-001', {
          amount: 10, // 低于 MIN_WITHDRAWAL_AMOUNT(50)
          paymentMethod: 'BANK',
          accountInfo: {},
        } as any),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ── getTransactions ──────────────────────────────────────────
  describe('getTransactions', () => {
    it('应返回卖家交易记录', async () => {
      prismaService.sellerTransaction.findMany.mockResolvedValue([]);
      prismaService.sellerTransaction.count.mockResolvedValue(0);

      const result = await service.getTransactions('user-001', {});

      expect(result).toHaveProperty('items');
      expect(result).toHaveProperty('total');
    });
  });
});
