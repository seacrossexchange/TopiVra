import { Test, TestingModule } from '@nestjs/testing';
import { SellersService } from './sellers.service';
import { PrismaService } from '../../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { Decimal } from '@prisma/client/runtime/library';

describe('SellersService', () => {
  let service: SellersService;
  let prisma: any;
  let configService: any;

  const mockUserId = 'user-1';
  const mockSellerProfile = {
    userId: mockUserId,
    shopName: 'Test Shop',
    shopDescription: 'Test Description',
    level: 'NORMAL',
    balance: new Decimal(1000),
    frozenBalance: new Decimal(0),
    productCount: 5,
    orderCount: 10,
    totalSales: new Decimal(5000),
    rating: new Decimal(4.5),
    ratingCount: 20,
  };

  beforeEach(async () => {
    prisma = {
      user: {
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      sellerProfile: {
        create: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      withdrawal: {
        create: jest.fn(),
        findUnique: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
      },
      sellerTransaction: {
        create: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
      },
      orderItem: {
        findMany: jest.fn(),
        count: jest.fn(),
        aggregate: jest.fn(),
      },
      product: {
        findFirst: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
        update: jest.fn(),
      },
      review: {
        aggregate: jest.fn(),
      },
      $transaction: jest.fn(),
    };

    configService = {
      get: jest.fn().mockReturnValue('0.01'),
    };

    const mockWebsocketGateway = {
      sendToUser: jest.fn(),
    };

    const mockMailService = {
      send: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SellersService,
        { provide: PrismaService, useValue: prisma },
        { provide: ConfigService, useValue: configService },
        {
          provide: 'WebsocketGateway',
          useValue: mockWebsocketGateway,
        },
        {
          provide: 'MailService',
          useValue: mockMailService,
        },
      ],
    }).compile();

    service = module.get<SellersService>(SellersService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('applySeller', () => {
    const applyDto = {
      shopName: 'New Shop',
      shopDescription: 'Description',
      contactEmail: 'test@example.com',
    };

    it('should throw NotFoundException if user not found', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(service.applySeller(mockUserId, applyDto)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw BadRequestException if already seller', async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: mockUserId,
        isSeller: true,
        sellerProfile: {},
      });

      await expect(service.applySeller(mockUserId, applyDto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should create seller profile', async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: mockUserId,
        isSeller: false,
        sellerProfile: null,
      });
      prisma.sellerProfile.create.mockResolvedValue(mockSellerProfile);
      prisma.user.update.mockResolvedValue({});

      const result = await service.applySeller(mockUserId, applyDto);

      expect(result).toBeDefined();
      expect(prisma.sellerProfile.create).toHaveBeenCalled();
    });
  });

  describe('getSellerProfile', () => {
    it('should throw NotFoundException if profile not found', async () => {
      prisma.sellerProfile.findUnique.mockResolvedValue(null);

      await expect(service.getSellerProfile(mockUserId)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should return seller profile', async () => {
      prisma.sellerProfile.findUnique.mockResolvedValue(mockSellerProfile);

      const result = await service.getSellerProfile(mockUserId);

      expect(result).toEqual(mockSellerProfile);
    });
  });

  describe('updateSellerProfile', () => {
    const updateDto = { shopName: 'Updated Shop' };

    it('should throw NotFoundException if profile not found', async () => {
      prisma.sellerProfile.findUnique.mockResolvedValue(null);

      await expect(
        service.updateSellerProfile(mockUserId, updateDto),
      ).rejects.toThrow(NotFoundException);
    });

    it('should update seller profile', async () => {
      prisma.sellerProfile.findUnique.mockResolvedValue(mockSellerProfile);
      prisma.sellerProfile.update.mockResolvedValue({
        ...mockSellerProfile,
        ...updateDto,
      });

      const result = await service.updateSellerProfile(mockUserId, updateDto);

      expect(result.shopName).toBe('Updated Shop');
    });
  });

  describe('getSellerDashboardStats', () => {
    it('should throw NotFoundException if profile not found', async () => {
      prisma.sellerProfile.findUnique.mockResolvedValue(null);

      await expect(service.getSellerDashboardStats(mockUserId)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should return dashboard stats', async () => {
      prisma.sellerProfile.findUnique.mockResolvedValue(mockSellerProfile);
      prisma.withdrawal.count.mockResolvedValue(2);
      prisma.orderItem.count.mockResolvedValue(5);
      prisma.orderItem.aggregate.mockResolvedValue({ _sum: { subtotal: 500 } });

      const result = await service.getSellerDashboardStats(mockUserId);

      expect(result.productCount).toBe(5);
      expect(result.orderCount).toBe(10);
    });
  });

  describe('requestWithdrawal', () => {
    const withdrawalDto = {
      amount: 100,
      method: 'ALIPAY' as any,
      account: 'test@alipay.com',
    };

    it('should throw NotFoundException if profile not found', async () => {
      prisma.sellerProfile.findUnique.mockResolvedValue(null);

      await expect(
        service.requestWithdrawal(mockUserId, withdrawalDto),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if balance insufficient', async () => {
      prisma.sellerProfile.findUnique.mockResolvedValue({
        ...mockSellerProfile,
        balance: new Decimal(50),
      });

      await expect(
        service.requestWithdrawal(mockUserId, withdrawalDto),
      ).rejects.toThrow(BadRequestException);
    });

    it('should create withdrawal request', async () => {
      prisma.sellerProfile.findUnique.mockResolvedValue(mockSellerProfile);
      prisma.$transaction.mockResolvedValue({
        id: 'withdrawal-1',
        withdrawalNo: 'W123456',
        amount: new Decimal(100),
      });

      const result = await service.requestWithdrawal(mockUserId, withdrawalDto);

      expect(result).toBeDefined();
    });
  });

  describe('getWithdrawals', () => {
    it('should return paginated withdrawals', async () => {
      const mockWithdrawals = [
        { id: 'w-1', withdrawalNo: 'W001', amount: 100 },
      ];
      prisma.withdrawal.findMany.mockResolvedValue(mockWithdrawals);
      prisma.withdrawal.count.mockResolvedValue(1);

      const result = await service.getWithdrawals(mockUserId, 1, 10);

      expect(result.data).toEqual(mockWithdrawals);
      expect(result.meta.total).toBe(1);
    });
  });

  describe('getWithdrawalDetail', () => {
    it('should throw NotFoundException if withdrawal not found', async () => {
      prisma.withdrawal.findUnique.mockResolvedValue(null);

      await expect(
        service.getWithdrawalDetail(mockUserId, 'W001'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException if withdrawal belongs to another seller', async () => {
      prisma.withdrawal.findUnique.mockResolvedValue({
        withdrawalNo: 'W001',
        sellerId: 'other-seller',
      });

      await expect(
        service.getWithdrawalDetail(mockUserId, 'W001'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should return withdrawal detail', async () => {
      prisma.withdrawal.findUnique.mockResolvedValue({
        withdrawalNo: 'W001',
        sellerId: mockUserId,
        amount: 100,
      });

      const result = await service.getWithdrawalDetail(mockUserId, 'W001');

      expect(result).toBeDefined();
    });
  });

  describe('getTransactions', () => {
    it('should return paginated transactions', async () => {
      const mockTransactions = [{ id: 't-1', type: 'SALE', amount: 100 }];
      prisma.sellerTransaction.findMany.mockResolvedValue(mockTransactions);
      prisma.sellerTransaction.count.mockResolvedValue(1);

      const result = await service.getTransactions(mockUserId, {
        page: 1,
        limit: 10,
      });

      expect(result.data).toEqual(mockTransactions);
    });
  });

  describe('getSellerOrders', () => {
    it('should return paginated orders', async () => {
      const mockOrders = [{ id: 'o-1', order: { orderNo: 'ORD001' } }];
      prisma.orderItem.findMany.mockResolvedValue(mockOrders);
      prisma.orderItem.count.mockResolvedValue(1);

      const result = await service.getSellerOrders(mockUserId, 1, 10);

      expect(result.data).toEqual(mockOrders);
    });
  });

  describe('getSellerProductsStats', () => {
    it('should return product stats', async () => {
      prisma.product.count
        .mockResolvedValueOnce(10) // totalProducts
        .mockResolvedValueOnce(8) // activeProducts
        .mockResolvedValueOnce(1) // pendingProducts
        .mockResolvedValueOnce(1); // soldOutProducts
      prisma.product.findMany.mockResolvedValue([]);

      const result = await service.getSellerProductsStats(mockUserId);

      expect(result.totalProducts).toBe(10);
      expect(result.activeProducts).toBe(8);
    });
  });

  describe('setPromotion', () => {
    const promotionDto = {
      label: 'HOT',
      startDate: '2024-01-01',
      endDate: '2024-12-31',
    };

    it('should throw NotFoundException if product not found', async () => {
      prisma.product.findFirst.mockResolvedValue(null);

      await expect(
        service.setPromotion('product-1', promotionDto, mockUserId),
      ).rejects.toThrow(NotFoundException);
    });

    it('should set promotion', async () => {
      prisma.product.findFirst.mockResolvedValue({ id: 'product-1' });
      prisma.product.update.mockResolvedValue({
        id: 'product-1',
        promotionLabel: 'HOT',
      });

      const result = await service.setPromotion(
        'product-1',
        promotionDto,
        mockUserId,
      );

      expect(result.promotionLabel).toBe('HOT');
    });
  });

  describe('clearPromotion', () => {
    it('should throw NotFoundException if product not found', async () => {
      prisma.product.findFirst.mockResolvedValue(null);

      await expect(
        service.clearPromotion('product-1', mockUserId),
      ).rejects.toThrow(NotFoundException);
    });

    it('should clear promotion', async () => {
      prisma.product.findFirst.mockResolvedValue({ id: 'product-1' });
      prisma.product.update.mockResolvedValue({
        id: 'product-1',
        promotionLabel: null,
      });

      const result = await service.clearPromotion('product-1', mockUserId);

      expect(result.promotionLabel).toBeNull();
    });
  });

  describe('getPublicSellerInfo', () => {
    it('should throw NotFoundException if seller not found', async () => {
      prisma.sellerProfile.findUnique.mockResolvedValue(null);

      await expect(service.getPublicSellerInfo(mockUserId)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should return public seller info', async () => {
      prisma.sellerProfile.findUnique.mockResolvedValue({
        userId: mockUserId,
        shopName: 'Test Shop',
        user: { id: mockUserId, username: 'testuser' },
      });

      const result = await service.getPublicSellerInfo(mockUserId);

      expect(result.shopName).toBe('Test Shop');
    });
  });

  describe('updateSellerStats', () => {
    it('should update seller stats', async () => {
      prisma.product.count.mockResolvedValue(5);
      prisma.orderItem.count.mockResolvedValue(10);
      prisma.orderItem.aggregate.mockResolvedValue({
        _sum: { quantity: 20, subtotal: 1000 },
      });
      prisma.review.aggregate.mockResolvedValue({
        _avg: { rating: 4.5 },
        _count: { id: 10 },
      });
      prisma.sellerProfile.update.mockResolvedValue(mockSellerProfile);

      await service.updateSellerStats(mockUserId);

      expect(prisma.sellerProfile.update).toHaveBeenCalled();
    });
  });
});
