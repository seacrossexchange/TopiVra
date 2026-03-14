import { Test, TestingModule } from '@nestjs/testing';
import { ReviewsService } from './reviews.service';
import { PrismaService } from '../../prisma/prisma.service';
import { RedisService } from '../../common/redis/redis.service';
import { BadRequestException, NotFoundException } from '@nestjs/common';

describe('ReviewsService', () => {
  let service: ReviewsService;
  let prisma: any;
  let redis: any;

  const mockUserId = 'user-1';
  const mockOrderId = 'order-1';
  const mockProductId = 'product-1';
  const mockSellerId = 'seller-1';

  const mockOrder = {
    id: mockOrderId,
    buyerId: mockUserId,
    orderStatus: 'COMPLETED',
    completedAt: new Date(),
    orderItems: [
      {
        productId: mockProductId,
        product: {
          sellerId: mockSellerId,
          seller: { id: mockSellerId },
        },
      },
    ],
  };

  const mockReview = {
    id: 'review-1',
    userId: mockUserId,
    productId: mockProductId,
    sellerId: mockSellerId,
    orderId: mockOrderId,
    rating: 5,
    content: 'Great product!',
    isAnonymous: false,
    user: { id: mockUserId, username: 'testuser', avatar: null },
    product: { id: mockProductId, title: 'Test Product' },
  };

  beforeEach(async () => {
    prisma = {
      order: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
      },
      review: {
        create: jest.fn(),
        findUnique: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
      },
    };

    redis = {
      get: jest.fn(),
      set: jest.fn(),
      del: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReviewsService,
        { provide: PrismaService, useValue: prisma },
        { provide: RedisService, useValue: redis },
      ],
    }).compile();

    service = module.get<ReviewsService>(ReviewsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    const createDto = {
      orderId: mockOrderId,
      rating: 5,
      content: 'Great product!',
    };

    it('should throw NotFoundException if order does not exist', async () => {
      prisma.order.findUnique.mockResolvedValue(null);

      await expect(service.create(mockUserId, createDto)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw BadRequestException if user is not buyer', async () => {
      prisma.order.findUnique.mockResolvedValue({
        ...mockOrder,
        buyerId: 'other-user',
      });

      await expect(service.create(mockUserId, createDto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException if order not completed', async () => {
      prisma.order.findUnique.mockResolvedValue({
        ...mockOrder,
        orderStatus: 'PENDING',
      });

      await expect(service.create(mockUserId, createDto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException if already reviewed', async () => {
      prisma.order.findUnique.mockResolvedValue(mockOrder);
      prisma.review.findUnique.mockResolvedValue(mockReview);

      await expect(service.create(mockUserId, createDto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should create review successfully', async () => {
      prisma.order.findUnique.mockResolvedValue(mockOrder);
      prisma.review.findUnique.mockResolvedValue(null);
      prisma.review.create.mockResolvedValue(mockReview);

      const result = await service.create(mockUserId, createDto);

      expect(result).toBeDefined();
      expect(result.rating).toBe(5);
    });
  });

  describe('findByProduct', () => {
    it('should return product reviews', async () => {
      prisma.review.findMany.mockResolvedValue([mockReview]);
      prisma.review.count.mockResolvedValue(1);

      const result = await service.findByProduct(mockProductId, {
        page: 1,
        limit: 10,
      });

      expect(result.items).toHaveLength(1);
      expect(result.total).toBe(1);
    });

    it('should hide anonymous user info', async () => {
      prisma.review.findMany.mockResolvedValue([
        { ...mockReview, isAnonymous: true },
      ]);
      prisma.review.count.mockResolvedValue(1);

      const result = await service.findByProduct(mockProductId, {
        page: 1,
        limit: 10,
      });

      expect(result.items[0].user.username).toBe('匿名用户');
    });
  });

  describe('findBySeller', () => {
    it('should return seller reviews', async () => {
      prisma.review.findMany.mockResolvedValue([mockReview]);
      prisma.review.count.mockResolvedValue(1);

      const result = await service.findBySeller(mockSellerId, {
        page: 1,
        limit: 10,
      });

      expect(result.items).toHaveLength(1);
    });
  });

  describe('getSellerStats', () => {
    it('should return cached stats', async () => {
      const cachedStats = {
        averageRating: 4.5,
        totalReviews: 10,
        ratingDistribution: { 1: 0, 2: 1, 3: 1, 4: 3, 5: 5 },
      };
      redis.get.mockResolvedValue(JSON.stringify(cachedStats));

      const result = await service.getSellerStats(mockSellerId);

      expect(result.averageRating).toBe(4.5);
    });

    it('should calculate stats from database', async () => {
      redis.get.mockResolvedValue(null);
      prisma.review.findMany.mockResolvedValue([
        { rating: 5 },
        { rating: 4 },
        { rating: 5 },
      ]);

      const result = await service.getSellerStats(mockSellerId);

      expect(result.totalReviews).toBe(3);
      expect(result.averageRating).toBeCloseTo(4.67, 1);
    });
  });

  describe('autoReviewExpiredOrders', () => {
    it('should auto review expired orders', async () => {
      prisma.order.findMany.mockResolvedValue([mockOrder]);
      prisma.review.create.mockResolvedValue(mockReview);

      const result = await service.autoReviewExpiredOrders();

      expect(result.autoReviewedCount).toBe(1);
    });

    it('should handle orders without items', async () => {
      prisma.order.findMany.mockResolvedValue([
        { ...mockOrder, orderItems: [] },
      ]);

      const result = await service.autoReviewExpiredOrders();

      expect(result.autoReviewedCount).toBe(0);
    });
  });
});
