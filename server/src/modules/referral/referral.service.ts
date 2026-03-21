import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { customAlphabet } from 'nanoid';

const nanoid = customAlphabet('ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789', 8);

// 推荐奖励配置
export const REFERRAL_CONFIG = {
  REFERRER_REWARD: 10, // 推荐人奖励 $10
  REFEREE_REWARD: 10, // 被推荐人奖励 $10
  MIN_ORDER_AMOUNT: 20, // 被推荐人首单需满 $20 才发放奖励
};

@Injectable()
export class ReferralService {
  constructor(private prisma: PrismaService) {}

  // 获取或创建推荐码
  async getOrCreateReferralCode(userId: string) {
    let user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { referralCode: true },
    });

    if (!user) {
      throw new Error('用户不存在');
    }

    // 如果没有推荐码，生成一个
    if (!user.referralCode) {
      const code = nanoid();
      user = await this.prisma.user.update({
        where: { id: userId },
        data: { referralCode: code },
        select: { referralCode: true },
      });
    }

    const baseUrl = process.env.FRONTEND_URL || 'https://topivra.com';
    return {
      code: user.referralCode,
      link: `${baseUrl}/auth/register?ref=${user.referralCode}`,
    };
  }

  // 获取推荐统计
  async getReferralStats(userId: string) {
    const [totalReferrals, successfulReferrals, totalRewards] = await Promise.all([
      this.prisma.user.count({
        where: { referredBy: userId },
      }),
      this.prisma.user.count({
        where: {
          referredBy: userId,
          referralRewarded: true,
        },
      }),
      this.prisma.transaction.aggregate({
        where: {
          userId,
          type: 'REFERRAL_REWARD',
        },
        _sum: { amount: true },
      }),
    ]);

    return {
      totalReferrals,
      successfulReferrals,
      pendingReferrals: totalReferrals - successfulReferrals,
      totalRewards: totalRewards._sum.amount || 0,
      rewardPerReferral: REFERRAL_CONFIG.REFERRER_REWARD,
    };
  }

  // 获取推荐列表
  async getReferralList(userId: string) {
    const referrals = await this.prisma.user.findMany({
      where: { referredBy: userId },
      select: {
        id: true,
        username: true,
        createdAt: true,
        referralRewarded: true,
        totalSpent: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return referrals.map(r => ({
      id: r.id,
      username: r.username,
      joinedAt: r.createdAt,
      rewarded: r.referralRewarded,
      totalSpent: r.totalSpent || 0,
      status: r.referralRewarded ? 'completed' : Number(r.totalSpent) >= REFERRAL_CONFIG.MIN_ORDER_AMOUNT ? 'pending' : 'waiting',
    }));
  }

  // 处理推荐奖励（订单完成时调用）
  async processReferralReward(userId: string, orderAmount: number) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        referredBy: true,
        referralRewarded: true,
        totalSpent: true,
      },
    });

    // 如果没有推荐人或已发放过奖励，跳过
    if (!user?.referredBy || user.referralRewarded) {
      return null;
    }

    // 检查是否满足奖励条件（首单金额 >= MIN_ORDER_AMOUNT）
    const totalSpent = Number(user.totalSpent || 0) + orderAmount;
    if (totalSpent < REFERRAL_CONFIG.MIN_ORDER_AMOUNT) {
      return null;
    }

    // 发放奖励
    await this.prisma.$transaction(async (tx) => {
      // 给推荐人增加余额
      await tx.user.update({
        where: { id: user.referredBy! },
        data: {
          balance: { increment: REFERRAL_CONFIG.REFERRER_REWARD },
        },
      });

      // 给被推荐人增加余额
      await tx.user.update({
        where: { id: userId },
        data: {
          balance: { increment: REFERRAL_CONFIG.REFEREE_REWARD },
          referralRewarded: true,
        },
      });

      // 记录推荐人的交易记录
      await tx.transaction.create({
        data: {
          userId: user.referredBy!,
          type: 'REFERRAL_REWARD',
          amount: REFERRAL_CONFIG.REFERRER_REWARD,
          description: `推荐奖励 - 用户 ${userId} 完成首单`,
        },
      });

      // 记录被推荐人的交易记录
      await tx.transaction.create({
        data: {
          userId,
          type: 'REFERRAL_REWARD',
          amount: REFERRAL_CONFIG.REFEREE_REWARD,
          description: '新用户奖励 - 完成首单',
        },
      });
    });

    return {
      success: true,
      referrerReward: REFERRAL_CONFIG.REFERRER_REWARD,
      refereeReward: REFERRAL_CONFIG.REFEREE_REWARD,
    };
  }

  // 管理员手动调整用户等级
  async adjustUserLevel(userId: string, level: number) {
    await this.prisma.user.update({
      where: { id: userId },
      data: { membershipLevel: level },
    });

    return { success: true, message: '会员等级已调整' };
  }
}

