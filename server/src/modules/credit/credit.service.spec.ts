import { Test, TestingModule } from '@nestjs/testing';
import { CreditService } from './credit.service';
import { PrismaService } from '../../prisma/prisma.service';
import { NotFoundException } from '@nestjs/common';
import { CreditLevel, CreditChangeReason } from '@prisma/client';

describe('CreditService', () => {
  let service: CreditService;
  let prisma: any;

  const mockSellerId = 'seller-1';

  beforeEach(async () => {
    prisma = {
      sellerCredit: {
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        upsert: jest.fn(),
      },
      creditTransaction: {
        findMany: jest.fn(),
        create: jest.fn(),
      },
      sellerProfile: {
        findUnique: jest.fn(),
      },
      orderItem: {
        count: jest.fn(),
      },
      review: {
        aggregate: jest.fn(),
        count: jest.fn(),
      },
      $transaction: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [CreditService, { provide: PrismaService, useValue: prisma }],
    }).compile();

    service = module.get<CreditService>(CreditService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getSellerCredit', () => {
    it('should return existing credit', async () => {
      const mockCredit = {
        sellerId: mockSellerId,
        creditScore: 150,
        creditLevel: CreditLevel.GOOD,
      };
      prisma.sellerCredit.findUnique.mockResolvedValue(mockCredit);
      prisma.creditTransaction.findMany.mockResolvedValue([]);

      const _result = await service.getSellerCredit(mockSellerId);

      expect(_result.creditScore).toBe(150);
    });

    it('should create credit if not exists', async () => {
      prisma.sellerCredit.findUnique.mockResolvedValue(null);
      prisma.sellerCredit.create.mockResolvedValue({
        sellerId: mockSellerId,
        creditScore: 100,
        creditLevel: CreditLevel.NORMAL,
      });
      prisma.creditTransaction.findMany.mockResolvedValue([]);

      const _result = await service.getSellerCredit(mockSellerId);

      expect(prisma.sellerCredit.create).toHaveBeenCalled();
    });
  });

  describe('calculateCredit', () => {
    it('should throw NotFoundException if seller not exists', async () => {
      prisma.sellerProfile.findUnique.mockResolvedValue(null);

      await expect(service.calculateCredit(mockSellerId)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should calculate credit correctly', async () => {
      prisma.sellerProfile.findUnique.mockResolvedValue({
        userId: mockSellerId,
      });
      prisma.orderItem.count
        .mockResolvedValueOnce(50) // totalOrders
        .mockResolvedValueOnce(40) // completedOrders
        .mockResolvedValueOnce(2) // refundedOrders
        .mockResolvedValueOnce(1); // disputedOrders
      prisma.review.aggregate.mockResolvedValue({
        _avg: { rating: 4.5 },
        _count: { id: 20 },
      });
      prisma.review.count.mockResolvedValue(16); // fiveStarCount
      prisma.sellerCredit.findUnique.mockResolvedValue({
        violations: 0,
        warnings: 0,
      });
      prisma.sellerCredit.upsert.mockResolvedValue({
        sellerId: mockSellerId,
        creditScore: 155,
        creditLevel: CreditLevel.GOOD,
      });

      const _result = await service.calculateCredit(mockSellerId);

      expect(prisma.sellerCredit.upsert).toHaveBeenCalled();
    });
  });

  describe('addCreditTransaction', () => {
    it('should create credit if not exists', async () => {
      prisma.sellerCredit.findUnique.mockResolvedValue(null);
      prisma.sellerCredit.create.mockResolvedValue({
        sellerId: mockSellerId,
        creditScore: 100,
      });
      prisma.$transaction.mockResolvedValue([
        { creditScore: 105 },
        { change: 5, reason: CreditChangeReason.ORDER_COMPLETED },
      ]);

      const result = await service.addCreditTransaction(
        mockSellerId,
        5,
        CreditChangeReason.ORDER_COMPLETED,
        'Order completed',
      );

      expect(result.credit.creditScore).toBe(105);
    });

    it('should add positive credit', async () => {
      prisma.sellerCredit.findUnique.mockResolvedValue({
        sellerId: mockSellerId,
        creditScore: 100,
      });
      prisma.$transaction.mockResolvedValue([
        { creditScore: 105 },
        { change: 5, reason: CreditChangeReason.ORDER_COMPLETED },
      ]);

      const result = await service.addCreditTransaction(
        mockSellerId,
        5,
        CreditChangeReason.ORDER_COMPLETED,
        'Order completed',
      );

      expect(result.credit.creditScore).toBe(105);
    });

    it('should subtract credit', async () => {
      prisma.sellerCredit.findUnique.mockResolvedValue({
        sellerId: mockSellerId,
        creditScore: 100,
      });
      prisma.$transaction.mockResolvedValue([
        { creditScore: 95 },
        { change: -5, reason: CreditChangeReason.ORDER_REFUNDED },
      ]);

      const result = await service.addCreditTransaction(
        mockSellerId,
        -5,
        CreditChangeReason.ORDER_REFUNDED,
        'Refund processed',
      );

      expect(result.credit.creditScore).toBe(95);
    });

    it('should limit credit to 0-200 range', async () => {
      prisma.sellerCredit.findUnique.mockResolvedValue({
        sellerId: mockSellerId,
        creditScore: 195,
      });
      prisma.$transaction.mockResolvedValue([
        { creditScore: 200 },
        { change: 50, reason: CreditChangeReason.ORDER_COMPLETED },
      ]);

      const result = await service.addCreditTransaction(
        mockSellerId,
        50,
        CreditChangeReason.ORDER_COMPLETED,
      );

      expect(result.credit.creditScore).toBe(200);
    });
  });
});
