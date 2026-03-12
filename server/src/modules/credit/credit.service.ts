import {
  Injectable,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreditChangeReason, CreditLevel } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

@Injectable()
export class CreditService {
  private readonly logger = new Logger(CreditService.name);

  constructor(private readonly prisma: PrismaService) {}

  // ==================== 获取卖家信用分 ====================

  async getSellerCredit(sellerId: string) {
    let credit = await this.prisma.sellerCredit.findUnique({
      where: { sellerId },
    });

    if (!credit) {
      // 如果不存在则初始化
      credit = await this.prisma.sellerCredit.create({
        data: { sellerId },
      });
    }

    // 获取最近的信用变动记录
    const recentTransactions = await this.prisma.creditTransaction.findMany({
      where: { sellerId },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });

    return {
      ...credit,
      recentTransactions,
    };
  }

  // ==================== 重新计算信用分 ====================

  async calculateCredit(sellerId: string) {
    // 确认卖家存在
    const sellerProfile = await this.prisma.sellerProfile.findUnique({
      where: { userId: sellerId },
    });

    if (!sellerProfile) {
      throw new NotFoundException('卖家不存在');
    }

    // 统计订单数据
    const [totalOrders, completedOrders, refundedOrders, disputedOrders] =
      await Promise.all([
        this.prisma.orderItem.count({ where: { sellerId } }),
        this.prisma.orderItem.count({
          where: {
            sellerId,
            order: { orderStatus: 'COMPLETED' },
          },
        }),
        this.prisma.orderItem.count({
          where: {
            sellerId,
            order: { orderStatus: 'REFUNDED' },
          },
        }),
        this.prisma.orderItem.count({
          where: {
            sellerId,
            order: { orderStatus: 'REFUNDING' },
          },
        }),
      ]);

    // 统计评价数据
    const ratingStats = await this.prisma.review.aggregate({
      where: { sellerId },
      _avg: { rating: true },
      _count: { id: true },
    });

    const fiveStarCount = await this.prisma.review.count({
      where: { sellerId, rating: 5 },
    });

    const ratingCount = ratingStats._count.id || 0;
    const avgRating = ratingStats._avg.rating || 5.0;
    const fiveStarRate =
      ratingCount > 0 ? (fiveStarCount / ratingCount) * 100 : 0;

    // 计算信用分
    // 基础分 100
    let creditScore = 100;

    // 完成订单加分: 每单 +2，上限 +40
    creditScore += Math.min(completedOrders * 2, 40);

    // 好评加分: 平均评分 >= 4.5 加 +20，>= 4.0 加 +10
    if (avgRating >= 4.5) {
      creditScore += 20;
    } else if (avgRating >= 4.0) {
      creditScore += 10;
    }

    // 五星好评率加分: >= 80% 加 +10
    if (fiveStarRate >= 80) {
      creditScore += 10;
    }

    // 退款扣分: 每单 -3
    creditScore -= refundedOrders * 3;

    // 纠纷扣分: 每单 -5
    creditScore -= disputedOrders * 5;

    // 获取违规和警告记录（从现有信用记录中读取）
    const existingCredit = await this.prisma.sellerCredit.findUnique({
      where: { sellerId },
    });
    const violations = existingCredit?.violations ?? 0;
    const warnings = existingCredit?.warnings ?? 0;

    // 违规扣分: 每次 -20
    creditScore -= violations * 20;

    // 警告扣分: 每次 -10
    creditScore -= warnings * 10;

    // 限制分数范围 0-200
    creditScore = Math.max(0, Math.min(200, creditScore));

    // 计算信用等级
    const creditLevel = this.getCreditLevel(creditScore);

    // 计算正面/负面积分
    const positivePoints =
      Math.min(completedOrders * 2, 40) +
      (avgRating >= 4.5 ? 20 : avgRating >= 4.0 ? 10 : 0) +
      (fiveStarRate >= 80 ? 10 : 0);
    const negativePoints =
      refundedOrders * 3 + disputedOrders * 5 + violations * 20 + warnings * 10;

    // 更新或创建信用记录
    const credit = await this.prisma.sellerCredit.upsert({
      where: { sellerId },
      create: {
        sellerId,
        creditScore,
        creditLevel,
        positivePoints,
        negativePoints,
        totalOrders,
        completedOrders,
        refundedOrders,
        disputedOrders,
        avgRating: new Decimal(avgRating.toFixed(1)),
        fiveStarRate: new Decimal(fiveStarRate.toFixed(2)),
        ratingCount,
        violations,
        warnings,
        lastCalculated: new Date(),
      },
      update: {
        creditScore,
        creditLevel,
        positivePoints,
        negativePoints,
        totalOrders,
        completedOrders,
        refundedOrders,
        disputedOrders,
        avgRating: new Decimal(avgRating.toFixed(1)),
        fiveStarRate: new Decimal(fiveStarRate.toFixed(2)),
        ratingCount,
        lastCalculated: new Date(),
      },
    });

    this.logger.log(
      `卖家 ${sellerId} 信用分重新计算完成: ${creditScore} (${creditLevel})`,
    );

    return credit;
  }

  // ==================== 添加信用变动记录 ====================

  async addCreditTransaction(
    sellerId: string,
    change: number,
    reason: CreditChangeReason,
    description?: string,
    relatedIds?: { orderId?: string; reviewId?: string; ticketId?: string },
  ) {
    // 获取或创建信用记录
    let credit = await this.prisma.sellerCredit.findUnique({
      where: { sellerId },
    });

    if (!credit) {
      credit = await this.prisma.sellerCredit.create({
        data: { sellerId },
      });
    }

    // 计算新分数，限制在 0-200
    const newScore = Math.max(0, Math.min(200, credit.creditScore + change));
    const newLevel = this.getCreditLevel(newScore);

    // 使用事务同时更新信用分和创建变动记录
    const [updatedCredit, transaction] = await this.prisma.$transaction([
      this.prisma.sellerCredit.update({
        where: { sellerId },
        data: {
          creditScore: newScore,
          creditLevel: newLevel,
          positivePoints:
            change > 0
              ? { increment: change }
              : undefined,
          negativePoints:
            change < 0
              ? { increment: Math.abs(change) }
              : undefined,
        },
      }),
      this.prisma.creditTransaction.create({
        data: {
          sellerId,
          change,
          reason,
          description,
          orderId: relatedIds?.orderId,
          reviewId: relatedIds?.reviewId,
          ticketId: relatedIds?.ticketId,
          scoreAfter: newScore,
        },
      }),
    ]);

    this.logger.log(
      `卖家 ${sellerId} 信用分变动: ${change > 0 ? '+' : ''}${change} (${reason}), 当前: ${newScore}`,
    );

    return { credit: updatedCredit, transaction };
  }

  // ==================== 工具方法 ====================

  private getCreditLevel(score: number): CreditLevel {
    if (score <= 60) return CreditLevel.POOR;
    if (score <= 100) return CreditLevel.NORMAL;
    if (score <= 140) return CreditLevel.GOOD;
    if (score <= 180) return CreditLevel.EXCELLENT;
    return CreditLevel.PREMIUM;
  }
}
