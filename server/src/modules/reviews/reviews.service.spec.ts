import { Test, TestingModule } from '@nestjs/testing';
import { ReviewsService } from './reviews.service';
import { PrismaService } from '../../prisma/prisma.service';
import { NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { Decimal } from '@prisma/client/runtime/library';

describe('ReviewsService', () => {
  let service: ReviewsService;
  let prisma: any;

  const mockUserId = 'user-1';
  const mockProductId = 'product-1';
  const mockOrderId = 'order-1';
  const mockReview = {
    id: 'review-1',
    userId: mockUserId,
    productId: mockProductId,
    orderId: mockOrderId,
    rating: 5,
    content: 'Great product!',
    images: [],
    isAnonymous: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    prisma = {
      review: {
        create: jest.fn(),
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        count: jest.fn(),
        aggregate: jest.fn(),
      },
      order: {
        findUnique: jest.fn(),
      },
      orderItem: {
        findFirst: jest.fn(),
      },
      product: {
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      reviewReply: {
        create: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      $transaction: jest.fn(),
    };

    const mockNotificationService = {
      notifyUser: jest.fn(),
    };

    const mockAuditService = {
      log: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReviewsService,
        { provide: PrismaService, useValue: prisma },
        { provide: 'NotificationService', useValue: mockNotificationService },
        { provide: 'AuditService', useValue: mockAuditService },
      ],
    }).compile();

    service = module.get<ReviewsService>(ReviewsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    const createDto = {
      productId: mockProductId,
      orderId: mockOrderId,
      rating: 5,
      content: 'Great product!',
      images: [],
      isAnonymous: false,
    };

    it('should throw NotFoundException if order not found', async () => {
      prisma.order.findUnique.mockResolvedValue(null);

      await expect(service.create(mockUserId, createDto)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw ForbiddenException if order does not belong to user', async () => {
      prisma.order.findUnique.mockResolvedValue({
        id: mockOrderId,
        buyerId: 'other-user',
      });

      await expect(service.create(mockUserId, createDto)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should throw BadRequestException if order is not completed', async () => {
      prisma.order.findUnique.mockResolvedValue({
        id: mockOrderId,
        buyerId: mockUserId,
        orderStatus: 'PAID',
      });

      await expect(service.create(mockUserId, createDto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException if product not in order', async () => {
      prisma.order.findUnique.mockResolvedValue({
        id: mockOrderId,
        buyerId: mockUserId,
        orderStatus: 'COMPLETED',
      });
      prisma.orderItem.findFirst.mockResolvedValue(null);

      await expect(service.create(mockUserId, createDto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException if already reviewed', async () => {
      prisma.order.findUnique.mockResolvedValue({
        id: mockOrderId,
        buyerId: mockUserId,
        orderStatus: 'COMPLETED',
      });
      prisma.orderItem.findFirst.mockResolvedValue({ id: 'item-1' });
      prisma.review.findFirst.mockResolvedValue(mockReview);

      await expect(service.create(mockUserId, createDto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should create review and update product rating', async () => {
      prisma.order.findUnique.mockResolvedValue({
        id: mockOrderId,
        buyerId: mockUserId,
        orderStatus: 'COMPLETED',
      });
      prisma.orderItem.findFirst.mockResolvedValue({ 
        id: 'item-1',
        sellerId: 'seller-1',
      });
      prisma.review.findFirst.mockResolvedValue(null);
      prisma.review.create.mockResolvedValue(mockReview);
      prisma.review.aggregate.mockResolvedValue({
        _avg: { rating: 4.5 },
        _count: { id: 10 },
      });
      prisma.product.update.mockResolvedValue({});

      const result = await service.create(mockUserId, createDto);

      expect(result).toEqual(mockReview);
      expect(prisma.review.create).toHaveBeenCalled();
      expect(prisma.product.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            rating: expect.any(Number),
            ratingCount: 10,
          }),
        }),
      );
    });
  });

  describe('findAll', () => {
    it('should return paginated reviews for product', async () => {
      const mockReviews = [mockReview];
      prisma.review.findMany.mockResolvedValue(mockReviews);
      prisma.review.count.mockResolvedValue(1);

      const result = await service.findAll(mockProductId, { page: 1, limit: 10 });

      expect(result.data).toEqual(mockReviews);
      expect(result.meta.total).toBe(1);
    });

    it('should filter by rating', async () => {
      prisma.review.findMany.mockResolvedValue([mockReview]);
      prisma.review.count.mockResolvedValue(1);

      await service.findAll(mockProductId, { 
        page: 1, 
        limit: 10, 
        rating: 5 
      });

      expect(prisma.review.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            rating: 5,
          }),
        }),
      );
    });
  });

  describe('findOne', () => {
    it('should throw NotFoundException if review not found', async () => {
      prisma.review.findUnique.mockResolvedValue(null);

      await expect(service.findOne('review-1')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should return review with user and product info', async () => {
      prisma.review.findUnique.mockResolvedValue({
        ...mockReview,
        user: { id: mockUserId, username: 'testuser' },
        product: { id: mockProductId, title: 'Test Product' },
      });

      const result = await service.findOne('review-1');

      expect(result).toEqual(expect.objectContaining({
        id: 'review-1',
        user: expect.any(Object),
        product: expect.any(Object),
      }));
    });
  });

  describe('update', () => {
    const updateDto = {
      rating: 4,
      content: 'Updated review',
    };

    it('should throw NotFoundException if review not found', async () => {
      prisma.review.findUnique.mockResolvedValue(null);

      await expect(
        service.update(mockUserId, 'review-1', updateDto),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException if user is not owner', async () => {
      prisma.review.findUnique.mockResolvedValue({
        ...mockReview,
        userId: 'other-user',
      });

      await expect(
        service.update(mockUserId, 'review-1', updateDto),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should update review and recalculate product rating', async () => {
      prisma.review.findUnique.mockResolvedValue(mockReview);
      prisma.review.update.mockResolvedValue({
        ...mockReview,
        ...updateDto,
      });
      prisma.review.aggregate.mockResolvedValue({
        _avg: { rating: 4.2 },
        _count: { id: 10 },
      });
      prisma.product.update.mockResolvedValue({});

      const result = await service.update(mockUserId, 'review-1', updateDto);

      expect(result.rating).toBe(4);
      expect(result.content).toBe('Updated review');
      expect(prisma.product.update).toHaveBeenCalled();
    });
  });

  describe('remove', () => {
    it('should throw NotFoundException if review not found', async () => {
      prisma.review.findUnique.mockResolvedValue(null);

      await expect(service.remove(mockUserId, 'review-1')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw ForbiddenException if user is not owner', async () => {
      prisma.review.findUnique.mockResolvedValue({
        ...mockReview,
        userId: 'other-user',
      });

      await expect(service.remove(mockUserId, 'review-1')).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should delete review and update product rating', async () => {
      prisma.review.findUnique.mockResolvedValue(mockReview);
      prisma.review.delete.mockResolvedValue(mockReview);
      prisma.review.aggregate.mockResolvedValue({
        _avg: { rating: 4.5 },
        _count: { id: 9 },
      });
      prisma.product.update.mockResolvedValue({});

      await service.remove(mockUserId, 'review-1');

      expect(prisma.review.delete).toHaveBeenCalledWith({
        where: { id: 'review-1' },
      });
      expect(prisma.product.update).toHaveBeenCalled();
    });
  });

  describe('getMyReviews', () => {
    it('should return user reviews', async () => {
      const mockReviews = [mockReview];
      prisma.review.findMany.mockResolvedValue(mockReviews);
      prisma.review.count.mockResolvedValue(1);

      const result = await service.getMyReviews(mockUserId, { page: 1, limit: 10 });

      expect(result.data).toEqual(mockReviews);
      expect(prisma.review.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: mockUserId },
        }),
      );
    });
  });

  describe('getProductStats', () => {
    it('should return product review statistics', async () => {
      prisma.review.aggregate.mockResolvedValue({
        _avg: { rating: 4.5 },
        _count: { id: 100 },
      });
      prisma.review.count
        .mockResolvedValueOnce(50)  // 5 stars
        .mockResolvedValueOnce(30)  // 4 stars
        .mockResolvedValueOnce(15)  // 3 stars
        .mockResolvedValueOnce(4)   // 2 stars
        .mockResolvedValueOnce(1);  // 1 star

      const result = await service.getProductStats(mockProductId);

      expect(result).toEqual({
        averageRating: 4.5,
        totalReviews: 100,
        ratingDistribution: {
          5: 50,
          4: 30,
          3: 15,
          2: 4,
          1: 1,
        },
      });
    });
  });
});
