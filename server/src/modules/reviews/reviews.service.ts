import {
  Injectable,
  BadRequestException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { RedisService } from '../../common/redis/redis.service';
import {
  CreateReviewDto,
  QueryReviewDto,
  SellerReviewStatsDto,
} from './dto/review.dto';

@Injectable()
export class ReviewsService {
  private readonly logger = new Logger(ReviewsService.name);
  private readonly REVIEW_CACHE_TTL = 3600; // 1 hour

  constructor(
    private prisma: PrismaService,
    private redisService: RedisService,
  ) {}

  // 创建评价
  async create(userId: string, dto: CreateReviewDto) {
    // 查找订单
    const order = await this.prisma.order.findUnique({
      where: { id: dto.orderId },
      include: {
        orderItems: {
          include: {
            product: {
              include: {
                seller: true,
              },
            },
          },
        },
      },
    });

    if (!order) {
      throw new NotFoundException('订单不存在');
    }

    // 验证订单所有者
    if (order.buyerId !== userId) {
      throw new BadRequestException('无权评价此订单');
    }

    // 验证订单状态
    if (order.orderStatus !== 'COMPLETED') {
      throw new BadRequestException('只能评价已完成的订单');
    }

    // 检查是否已评价
    const existingReview = await this.prisma.review.findUnique({
      where: { orderId: dto.orderId },
    });

    if (existingReview) {
      throw new BadRequestException('该订单已评价');
    }

    // 检查评价时限（7天内）
    if (!order.completedAt) {
      throw new BadRequestException('订单未完成，无法评价');
    }
    const daysSinceCompletion = Math.floor(
      (Date.now() - order.completedAt.getTime()) / (1000 * 60 * 60 * 24),
    );
    if (daysSinceCompletion > 7) {
      throw new BadRequestException('订单已完成超过7天，无法评价');
    }

    // 获取商品和卖家信息（取第一个商品）
    const orderItem = order.orderItems[0];
    if (!orderItem) {
      throw new BadRequestException('订单无商品信息');
    }

    const review = await this.prisma.review.create({
      data: {
        userId,
        productId: orderItem.productId,
        sellerId: orderItem.product.sellerId,
        orderId: dto.orderId,
        rating: dto.rating,
        content: dto.content || '',
        tags: dto.tags as any,
        isAnonymous: dto.isAnonymous || false,
      },
      include: {
        user: {
          select: { id: true, username: true, avatar: true },
        },
        product: {
          select: { id: true, title: true },
        },
      },
    });

    // 更新卖家评分缓存
    await this.invalidateSellerReviewCache(orderItem.product.sellerId);

    this.logger.log(`评价创建成功: 订单 ${dto.orderId}, 用户 ${userId}`);
    return review;
  }

  // 获取商品评价列表
  async findByProduct(productId: string, query: QueryReviewDto) {
    const { page = 1, limit = 10 } = query;
    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      this.prisma.review.findMany({
        where: { productId },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: { id: true, username: true, avatar: true },
          },
        },
      }),
      this.prisma.review.count({ where: { productId } }),
    ]);

    // 如果是匿名评价，隐藏用户信息
    const sanitizedItems = items.map((item) => ({
      ...item,
      user: item.isAnonymous
        ? { id: null, username: '匿名用户', avatar: null }
        : item.user,
    }));

    return {
      items: sanitizedItems,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  // 获取卖家评价汇总
  async getSellerStats(sellerId: string): Promise<SellerReviewStatsDto> {
    const cacheKey = `seller:reviews:stats:${sellerId}`;
    const cached = await this.redisService.get(cacheKey);

    if (cached) {
      return JSON.parse(cached);
    }

    const reviews = await this.prisma.review.findMany({
      where: { sellerId },
      select: { rating: true },
    });

    const totalReviews = reviews.length;
    const averageRating =
      totalReviews > 0
        ? reviews.reduce((sum, r) => sum + r.rating, 0) / totalReviews
        : 0;

    const ratingDistribution = {
      1: reviews.filter((r) => r.rating === 1).length,
      2: reviews.filter((r) => r.rating === 2).length,
      3: reviews.filter((r) => r.rating === 3).length,
      4: reviews.filter((r) => r.rating === 4).length,
      5: reviews.filter((r) => r.rating === 5).length,
    };

    const stats: SellerReviewStatsDto = {
      averageRating: Math.round(averageRating * 100) / 100,
      totalReviews,
      ratingDistribution,
    };

    await this.redisService.set(
      cacheKey,
      JSON.stringify(stats),
      this.REVIEW_CACHE_TTL,
    );

    return stats;
  }

  // 获取卖家评价列表
  async findBySeller(sellerId: string, query: QueryReviewDto) {
    const { page = 1, limit = 10 } = query;
    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      this.prisma.review.findMany({
        where: { sellerId },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: { id: true, username: true, avatar: true },
          },
          product: {
            select: { id: true, title: true },
          },
        },
      }),
      this.prisma.review.count({ where: { sellerId } }),
    ]);

    const sanitizedItems = items.map((item) => ({
      ...item,
      user: item.isAnonymous
        ? { id: null, username: '匿名用户', avatar: null }
        : item.user,
    }));

    return {
      items: sanitizedItems,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  // 自动好评（定时任务调用）
  async autoReviewExpiredOrders() {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    // 查找已完成超过7天且未评价的订单
    const expiredOrders = await this.prisma.order.findMany({
      where: {
        orderStatus: 'COMPLETED',
        completedAt: { lte: sevenDaysAgo },
        reviews: { none: {} },
      },
      include: {
        orderItems: {
          include: {
            product: true,
          },
        },
      },
    });

    let autoReviewedCount = 0;

    for (const order of expiredOrders) {
      const orderItem = order.orderItems[0];
      if (!orderItem) continue;

      try {
        await this.prisma.review.create({
          data: {
            userId: order.buyerId,
            productId: orderItem.productId,
            sellerId: orderItem.product.sellerId,
            orderId: order.id,
            rating: 5,
            content: '买家已确认收货，系统默认五星好评',
            isAnonymous: false,
          },
        });

        autoReviewedCount++;
      } catch (error) {
        this.logger.error(`自动好评失败: 订单 ${order.id}`, error);
      }
    }

    this.logger.log(`自动好评完成: ${autoReviewedCount} 个订单`);
    return { autoReviewedCount };
  }

  // 使卖家评价缓存失效
  private async invalidateSellerReviewCache(sellerId: string) {
    const cacheKey = `seller:reviews:stats:${sellerId}`;
    await this.redisService.del(cacheKey);
  }
}
