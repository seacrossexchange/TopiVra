import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class ReviewsService {
  private readonly logger = new Logger(ReviewsService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * 创建评价
   */
  async createReview(buyerId: string, dto: any) {
    // 验证订单
    const order = await this.prisma.order.findUnique({
      where: { id: dto.orderId },
      include: { orderItems: true },
    });

    if (!order) {
      throw new NotFoundException('订单不存在');
    }

    if (order.buyerId !== buyerId) {
      throw new ForbiddenException('无权评价此订单');
    }

    if (order.orderStatus !== 'COMPLETED') {
      throw new BadRequestException('只有已完成的订单可以评价');
    }

    // 检查是否已评价
    const existing = await this.prisma.$queryRawUnsafe<any[]>(
      `SELECT * FROM reviews WHERE order_id = ? LIMIT 1`,
      dto.orderId,
    );

    if (existing && existing.length > 0) {
      throw new BadRequestException('该订单已评价');
    }

    const item = order.orderItems[0];
    if (!item) {
      throw new BadRequestException('订单无商品信息');
    }

    // 创建评价
    await this.prisma.$executeRawUnsafe(
      `INSERT INTO reviews (
        id, order_id, buyer_id, seller_id, product_id,
        rating, content, images, is_anonymous, created_at
      ) VALUES (UUID(), ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
      dto.orderId,
      buyerId,
      item.sellerId,
      item.productId,
      dto.rating,
      dto.content || null,
      JSON.stringify(dto.images || []),
      dto.isAnonymous || false,
    );

    // 更新卖家评分
    await this.updateSellerRating(item.sellerId);

    // 更新商品评分
    await this.updateProductRating(item.productId);

    return { success: true, message: '评价成功' };
  }

  /**
   * 卖家回复评价
   */
  async replyReview(sellerId: string, reviewId: string, reply: string) {
    const reviews = await this.prisma.$queryRawUnsafe<any[]>(
      `SELECT * FROM reviews WHERE id = ? LIMIT 1`,
      reviewId,
    );

    if (!reviews || reviews.length === 0) {
      throw new NotFoundException('评价不存在');
    }

    const review = reviews[0];

    if (review.seller_id !== sellerId) {
      throw new ForbiddenException('无权回复此评价');
    }

    await this.prisma.$executeRawUnsafe(
      `UPDATE reviews SET seller_reply = ?, seller_replied_at = NOW() WHERE id = ?`,
      reply,
      reviewId,
    );

    return { success: true, message: '回复成功' };
  }

  /**
   * 获取商品评价列表
   */
  async getProductReviews(
    productId: string,
    page: number = 1,
    limit: number = 10,
  ) {
    const offset = (page - 1) * limit;

    const reviews = await this.prisma.$queryRawUnsafe<any[]>(
      `SELECT 
        r.*,
        u.username as buyer_username,
        u.avatar as buyer_avatar
      FROM reviews r
      LEFT JOIN users u ON r.buyer_id = u.id
      WHERE r.product_id = ? AND r.is_visible = TRUE
      ORDER BY r.created_at DESC
      LIMIT ? OFFSET ?`,
      productId,
      limit,
      offset,
    );

    const totalResult = await this.prisma.$queryRawUnsafe<any[]>(
      `SELECT COUNT(*) as count FROM reviews WHERE product_id = ? AND is_visible = TRUE`,
      productId,
    );

    const total = totalResult[0]?.count || 0;

    return {
      items: reviews.map((r) => ({
        ...r,
        images: r.images ? JSON.parse(r.images) : [],
      })),
      total,
      page,
      limit,
    };
  }

  /**
   * 获取卖家评价列表
   */
  async getSellerReviews(
    sellerId: string,
    page: number = 1,
    limit: number = 10,
  ) {
    const offset = (page - 1) * limit;

    const reviews = await this.prisma.$queryRawUnsafe<any[]>(
      `SELECT 
        r.*,
        u.username as buyer_username,
        u.avatar as buyer_avatar,
        p.title as product_title
      FROM reviews r
      LEFT JOIN users u ON r.buyer_id = u.id
      LEFT JOIN products p ON r.product_id = p.id
      WHERE r.seller_id = ? AND r.is_visible = TRUE
      ORDER BY r.created_at DESC
      LIMIT ? OFFSET ?`,
      sellerId,
      limit,
      offset,
    );

    const totalResult = await this.prisma.$queryRawUnsafe<any[]>(
      `SELECT COUNT(*) as count FROM reviews WHERE seller_id = ? AND is_visible = TRUE`,
      sellerId,
    );

    const total = totalResult[0]?.count || 0;

    return {
      items: reviews.map((r) => ({
        ...r,
        images: r.images ? JSON.parse(r.images) : [],
      })),
      total,
      page,
      limit,
    };
  }

  /**
   * 获取卖家信用评分
   */
  async getSellerRating(sellerId: string) {
    const ratings = await this.prisma.$queryRawUnsafe<any[]>(
      `SELECT * FROM seller_ratings WHERE seller_id = ? LIMIT 1`,
      sellerId,
    );

    if (!ratings || ratings.length === 0) {
      // 初始化评分
      await this.prisma.$executeRawUnsafe(
        `INSERT INTO seller_ratings (id, seller_id) VALUES (UUID(), ?)`,
        sellerId,
      );
      return {
        totalReviews: 0,
        averageRating: 0,
        creditLevel: 'BRONZE',
        creditScore: 0,
        ratingDistribution: {
          5: 0,
          4: 0,
          3: 0,
          2: 0,
          1: 0,
        },
      };
    }

    const rating = ratings[0];
    return {
      totalReviews: rating.total_reviews,
      averageRating: Number(rating.average_rating),
      creditLevel: rating.credit_level,
      creditScore: rating.credit_score,
      ratingDistribution: {
        5: rating.rating_5_count,
        4: rating.rating_4_count,
        3: rating.rating_3_count,
        2: rating.rating_2_count,
        1: rating.rating_1_count,
      },
    };
  }

  /**
   * 更新卖家评分
   */
  private async updateSellerRating(sellerId: string) {
    const stats = await this.prisma.$queryRawUnsafe<any[]>(
      `SELECT 
        COUNT(*) as total,
        AVG(rating) as avg_rating,
        SUM(CASE WHEN rating = 5 THEN 1 ELSE 0 END) as rating_5,
        SUM(CASE WHEN rating = 4 THEN 1 ELSE 0 END) as rating_4,
        SUM(CASE WHEN rating = 3 THEN 1 ELSE 0 END) as rating_3,
        SUM(CASE WHEN rating = 2 THEN 1 ELSE 0 END) as rating_2,
        SUM(CASE WHEN rating = 1 THEN 1 ELSE 0 END) as rating_1
      FROM reviews
      WHERE seller_id = ?`,
      sellerId,
    );

    const stat = stats[0];
    const avgRating = Number(stat.avg_rating || 0);
    const total = Number(stat.total || 0);

    // 计算信用等级
    let creditLevel = 'BRONZE';
    let creditScore = Math.round(avgRating * 20); // 基础分

    if (total >= 100 && avgRating >= 4.8) {
      creditLevel = 'DIAMOND';
      creditScore = 100;
    } else if (total >= 50 && avgRating >= 4.5) {
      creditLevel = 'PLATINUM';
      creditScore = 90;
    } else if (total >= 20 && avgRating >= 4.0) {
      creditLevel = 'GOLD';
      creditScore = 80;
    } else if (total >= 10 && avgRating >= 3.5) {
      creditLevel = 'SILVER';
      creditScore = 70;
    }

    await this.prisma.$executeRawUnsafe(
      `INSERT INTO seller_ratings (
        id, seller_id, total_reviews, average_rating,
        rating_5_count, rating_4_count, rating_3_count, rating_2_count, rating_1_count,
        credit_level, credit_score
      ) VALUES (UUID(), ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        total_reviews = ?,
        average_rating = ?,
        rating_5_count = ?,
        rating_4_count = ?,
        rating_3_count = ?,
        rating_2_count = ?,
        rating_1_count = ?,
        credit_level = ?,
        credit_score = ?`,
      sellerId,
      total,
      avgRating,
      stat.rating_5,
      stat.rating_4,
      stat.rating_3,
      stat.rating_2,
      stat.rating_1,
      creditLevel,
      creditScore,
      total,
      avgRating,
      stat.rating_5,
      stat.rating_4,
      stat.rating_3,
      stat.rating_2,
      stat.rating_1,
      creditLevel,
      creditScore,
    );
  }

  /**
   * 更新商品评分
   */
  private async updateProductRating(productId: string) {
    const stats = await this.prisma.$queryRawUnsafe<any[]>(
      `SELECT 
        COUNT(*) as total,
        AVG(rating) as avg_rating
      FROM reviews
      WHERE product_id = ?`,
      productId,
    );

    const stat = stats[0];
    await this.prisma.product.update({
      where: { id: productId },
      data: {
        reviewCount: Number(stat.total || 0),
        rating: Number(stat.avg_rating || 0),
      },
    });
  }

  /**
   * 点赞评价
   */
  async likeReview(userId: string, reviewId: string) {
    try {
      await this.prisma.$executeRawUnsafe(
        `INSERT INTO review_likes (id, review_id, user_id) VALUES (UUID(), ?, ?)`,
        reviewId,
        userId,
      );
      return { success: true, message: '点赞成功' };
    } catch (error: any) {
      if (error?.code === 'ER_DUP_ENTRY') {
        throw new BadRequestException('已点赞');
      }
      throw error;
    }
  }

  /**
   * 取消点赞
   */
  async unlikeReview(userId: string, reviewId: string) {
    await this.prisma.$executeRawUnsafe(
      `DELETE FROM review_likes WHERE review_id = ? AND user_id = ?`,
      reviewId,
      userId,
    );
    return { success: true, message: '取消点赞成功' };
  }
}
