import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma';
import { CreditChangeReason, CreditLevel } from '@prisma/client';

// 信用分变动规则
const CREDIT_RULES: Record<CreditChangeReason, number> = {
  // 加分项
  ORDER_COMPLETED: 2,
  FIVE_STAR_REVIEW: 5,
  GOOD_REVIEW: 3,
  QUICK_RESPONSE: 1,
  LONG_TERM_SELLER: 10,

  // 减分项
  ORDER_REFUNDED: -3,
  ORDER_DISPUTED: -5,
  BAD_REVIEW: -5,
  SLOW_RESPONSE: -2,
  COMPLAINT: -10,
  VIOLATION: -20,
  FRAUD_DETECTED: -50,
};

// 信用等级阈值
const CREDIT_LEVEL_THRESHOLDS: Record<
  CreditLevel,
  { min: number; max: number }
> = {
  POOR: { min: 0, max: 60 },
  NORMAL: { min: 61, max: 100 },
  GOOD: { min: 101, max: 140 },
  EXCELLENT: { min: 141, max: 180 },
  PREMIUM: { min: 181, max: 200 },
};

@Injectable()
export class CreditService {
  private readonly logger = new Logger(CreditService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * 初始化卖家信用分
   */
  async initializeSellerCredit(sellerId: string) {
    return this.prisma.sellerCredit.create({
      data: {
        sellerId,
        creditScore: 100,
        creditLevel: CreditLevel.NORMAL,
      },
    });
  }

  /**
   * 获取卖家信用分信息
   */
  async getSellerCredit(sellerId: string) {
    let credit = await this.prisma.sellerCredit.findUnique({
      where: { sellerId },
    });

    if (!credit) {
      credit = await this.initializeSellerCredit(sellerId);
    }

    return credit;
  }

  /**
   * 变更卖家信用分
   */
  async changeCredit(
    sellerId: string,
    reason: CreditChangeReason,
    options?: {
      orderId?: string;
      reviewId?: string;
      ticketId?: string;
      description?: string;
    },
  ) {
    const change = CREDIT_RULES[reason];
    if (change === 0) return null;

    // 获取当前信用分
    let credit = await this.getSellerCredit(sellerId);
    const currentScore = credit.creditScore;
    const newScore = Math.max(0, Math.min(200, currentScore + change));

    // 更新信用分
    credit = await this.prisma.sellerCredit.update({
      where: { sellerId },
      data: {
        creditScore: newScore,
        creditLevel: this.calculateCreditLevel(newScore),
        positivePoints:
          change > 0 ? { increment: change } : credit.positivePoints,
        negativePoints:
          change < 0 ? { increment: Math.abs(change) } : credit.negativePoints,
        lastCalculated: new Date(),
      },
    });

    // 记录变动
    await this.prisma.creditTransaction.create({
      data: {
        sellerId,
        change,
        reason,
        description: options?.description,
        orderId: options?.orderId,
        reviewId: options?.reviewId,
        ticketId: options?.ticketId,
        scoreAfter: newScore,
      },
    });

    this.logger.log(
      `卖家 ${sellerId} 信用分变更: ${change} (${reason}), 新分数: ${newScore}`,
    );

    return credit;
  }

  /**
   * 计算信用等级
   */
  private calculateCreditLevel(score: number): CreditLevel {
    for (const [level, range] of Object.entries(CREDIT_LEVEL_THRESHOLDS)) {
      if (score >= range.min && score <= range.max) {
        return level as CreditLevel;
      }
    }
    return CreditLevel.NORMAL;
  }

  /**
   * 订单完成时更新信用分
   */
  async onOrderCompleted(sellerId: string, orderId: string) {
    // 更新统计
    await this.prisma.sellerCredit.update({
      where: { sellerId },
      data: {
        totalOrders: { increment: 1 },
        completedOrders: { increment: 1 },
      },
    });

    return this.changeCredit(sellerId, CreditChangeReason.ORDER_COMPLETED, {
      orderId,
      description: '订单完成',
    });
  }

  /**
   * 订单退款时更新信用分
   */
  async onOrderRefunded(sellerId: string, orderId: string) {
    await this.prisma.sellerCredit.update({
      where: { sellerId },
      data: {
        totalOrders: { increment: 1 },
        refundedOrders: { increment: 1 },
      },
    });

    return this.changeCredit(sellerId, CreditChangeReason.ORDER_REFUNDED, {
      orderId,
      description: '订单退款',
    });
  }

  /**
   * 订单纠纷时更新信用分
   */
  async onOrderDisputed(sellerId: string, orderId: string) {
    await this.prisma.sellerCredit.update({
      where: { sellerId },
      data: {
        disputedOrders: { increment: 1 },
      },
    });

    // Note: 'REFUNDING' is used for disputed orders
    return this.changeCredit(sellerId, CreditChangeReason.ORDER_DISPUTED, {
      orderId,
      description: '订单纠纷',
    });
  }

  /**
   * 收到评价时更新信用分
   */
  async onReviewReceived(sellerId: string, reviewId: string, rating: number) {
    // 更新评分统计
    const credit = await this.getSellerCredit(sellerId);
    const totalReviews = credit.ratingCount + 1;
    const newAvgRating =
      (Number(credit.avgRating) * credit.ratingCount + rating) / totalReviews;
    const fiveStarCount = rating === 5 ? 1 : 0;
    const fiveStarRate = (fiveStarCount / totalReviews) * 100;

    await this.prisma.sellerCredit.update({
      where: { sellerId },
      data: {
        avgRating: newAvgRating,
        ratingCount: { increment: 1 },
        fiveStarRate,
      },
    });

    // 根据评分加减分
    let reason: CreditChangeReason;
    if (rating === 5) {
      reason = CreditChangeReason.FIVE_STAR_REVIEW;
    } else if (rating === 4) {
      reason = CreditChangeReason.GOOD_REVIEW;
    } else if (rating <= 2) {
      reason = CreditChangeReason.BAD_REVIEW;
    } else {
      return null; // 3星不变分
    }

    return this.changeCredit(sellerId, reason, {
      reviewId,
      description: `收到${rating}星评价`,
    });
  }

  /**
   * 获取卖家信用分历史
   */
  async getCreditHistory(sellerId: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;

    const [transactions, total] = await Promise.all([
      this.prisma.creditTransaction.findMany({
        where: { sellerId },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.creditTransaction.count({
        where: { sellerId },
      }),
    ]);

    return {
      transactions,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * 批量重新计算卖家信用分
   */
  async recalculateSellerCredit(sellerId: string) {
    // 获取所有统计数据
    const [completedOrders, refundedOrders, disputedOrders, reviews] =
      await Promise.all([
        this.prisma.orderItem.count({
          where: { sellerId, deliveryConfirmed: true },
        }),
        this.prisma.refundRequest.count({
          where: { sellerId, status: 'COMPLETED' },
        }),
        this.prisma.refundRequest.count({
          where: { sellerId, status: 'DISPUTED' },
        }),
        this.prisma.review.findMany({
          where: { sellerId },
          select: { rating: true },
        }),
      ]);

    // 计算平均评分
    const avgRating =
      reviews.length > 0
        ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
        : 5.0;

    // 计算五星好评率
    const fiveStarCount = reviews.filter((r) => r.rating === 5).length;
    const fiveStarRate =
      reviews.length > 0 ? (fiveStarCount / reviews.length) * 100 : 0;

    // 更新统计
    await this.prisma.sellerCredit.update({
      where: { sellerId },
      data: {
        totalOrders: completedOrders + refundedOrders,
        completedOrders,
        refundedOrders,
        disputedOrders,
        avgRating,
        fiveStarRate,
        ratingCount: reviews.length,
        lastCalculated: new Date(),
      },
    });

    this.logger.log(`重新计算卖家 ${sellerId} 信用统计`);
  }
}
