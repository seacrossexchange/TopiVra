import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { ReviewsService } from './reviews.service';
import { PrismaService } from '../../prisma/prisma.service';

// This spec is a lightweight unit smoke test aligned with the current
// ReviewsService implementation (raw SQL helpers), not the legacy Prisma `review` model.

describe('ReviewsService', () => {
  let service: ReviewsService;

  const prisma = {
    order: {
      findUnique: jest.fn(),
    },
    $queryRawUnsafe: jest.fn(),
    $executeRawUnsafe: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [ReviewsService, { provide: PrismaService, useValue: prisma }],
    }).compile();

    service = module.get(ReviewsService);
  });

  describe('createReview', () => {
    it('订单不存在时抛 NotFoundException', async () => {
      prisma.order.findUnique.mockResolvedValueOnce(null);

      await expect(
        service.createReview('buyer-1', { orderId: 'order-1', rating: 5 }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('replyReview', () => {
    it('评价不存在时抛 NotFoundException', async () => {
      prisma.$queryRawUnsafe.mockResolvedValueOnce([]);

      await expect(
        service.replyReview('seller-1', 'review-1', 'thanks'),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
