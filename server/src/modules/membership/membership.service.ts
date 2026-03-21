import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

// 会员等级配置
export const MEMBERSHIP_TIERS = [
  {
    level: 0,
    name: '普通会员',
    nameEn: 'Regular',
    minSpent: 0,
    discount: 0,
    benefits: ['基础购买权限', '7天退款保障', '标准客服支持'],
    benefitsEn: [
      'Basic purchase rights',
      '7-day refund guarantee',
      'Standard customer support',
    ],
    color: '#8c8c8c',
  },
  {
    level: 1,
    name: '铜牌会员',
    nameEn: 'Bronze',
    minSpent: 100,
    discount: 2,
    benefits: ['2% 折扣', '优先客服', '专属优惠券'],
    benefitsEn: ['2% discount', 'Priority support', 'Exclusive coupons'],
    color: '#cd7f32',
  },
  {
    level: 2,
    name: '银牌会员',
    nameEn: 'Silver',
    minSpent: 500,
    discount: 5,
    benefits: ['5% 折扣', '优先发货', '生日礼包', '专属客服'],
    benefitsEn: [
      '5% discount',
      'Priority delivery',
      'Birthday gift',
      'Dedicated support',
    ],
    color: '#c0c0c0',
  },
  {
    level: 3,
    name: '金牌会员',
    nameEn: 'Gold',
    minSpent: 2000,
    discount: 8,
    benefits: ['8% 折扣', '免费换货', 'VIP 客服', '每月专属优惠'],
    benefitsEn: [
      '8% discount',
      'Free exchange',
      'VIP support',
      'Monthly exclusive offers',
    ],
    color: '#ffd700',
  },
  {
    level: 4,
    name: '钻石会员',
    nameEn: 'Diamond',
    minSpent: 5000,
    discount: 12,
    benefits: ['12% 折扣', '终身质保', '专属客户经理', '优先新品体验'],
    benefitsEn: [
      '12% discount',
      'Lifetime warranty',
      'Account manager',
      'Early access to new products',
    ],
    color: '#b9f2ff',
  },
];

@Injectable()
export class MembershipService {
  constructor(private prisma: PrismaService) {}

  // 获取用户会员信息
  async getUserMembership(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        username: true,
        membershipLevel: true,
        totalSpent: true,
        createdAt: true,
      },
    });

    if (!user) {
      return null;
    }

    const currentTier =
      MEMBERSHIP_TIERS.find((t) => t.level === (user.membershipLevel || 0)) ||
      MEMBERSHIP_TIERS[0];
    const nextTier = MEMBERSHIP_TIERS.find(
      (t) => t.level === (user.membershipLevel || 0) + 1,
    );

    return {
      user: {
        id: user.id,
        username: user.username,
        membershipLevel: user.membershipLevel || 0,
        totalSpent: user.totalSpent || 0,
        memberSince: user.createdAt,
      },
      currentTier,
      nextTier,
      discount: currentTier.discount,
    };
  }

  // 获取所有会员等级配置
  getTiers() {
    return MEMBERSHIP_TIERS;
  }

  // 计算升级进度
  async getUpgradeProgress(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { membershipLevel: true, totalSpent: true },
    });

    if (!user) {
      return null;
    }

    const currentLevel = user.membershipLevel || 0;
    const totalSpent = user.totalSpent || 0;
    const nextTier = MEMBERSHIP_TIERS.find((t) => t.level === currentLevel + 1);

    if (!nextTier) {
      return {
        isMaxLevel: true,
        currentLevel,
        totalSpent,
      };
    }

    const progress = Math.min(
      100,
      (Number(totalSpent) / nextTier.minSpent) * 100,
    );
    const remaining = Math.max(0, nextTier.minSpent - Number(totalSpent));

    return {
      isMaxLevel: false,
      currentLevel,
      totalSpent,
      nextLevel: nextTier.level,
      nextLevelName: nextTier.name,
      progress,
      remaining,
      nextTierMinSpent: nextTier.minSpent,
    };
  }

  // 更新用户会员等级（订单完成时自动调用）
  async updateUserLevel(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { totalSpent: true, membershipLevel: true },
    });

    if (!user) return;

    const totalSpent = user.totalSpent || 0;
    let newLevel = 0;

    // 根据消费金额确定等级
    for (const tier of MEMBERSHIP_TIERS) {
      if (Number(totalSpent) >= tier.minSpent) {
        newLevel = tier.level;
      }
    }

    // 如果等级有变化，更新
    if (newLevel !== (user.membershipLevel || 0)) {
      await this.prisma.user.update({
        where: { id: userId },
        data: { membershipLevel: newLevel },
      });

      return {
        upgraded: true,
        oldLevel: user.membershipLevel || 0,
        newLevel,
        tier: MEMBERSHIP_TIERS.find((t) => t.level === newLevel),
      };
    }

    return { upgraded: false };
  }

  // 管理员手动调整等级
  async adjustUserLevel(userId: string, level: number) {
    if (level < 0 || level >= MEMBERSHIP_TIERS.length) {
      throw new Error('无效的会员等级');
    }

    await this.prisma.user.update({
      where: { id: userId },
      data: { membershipLevel: level },
    });

    return {
      success: true,
      message: '会员等级已调整',
      newLevel: level,
    };
  }

  // 计算会员折扣
  getMemberDiscount(membershipLevel: number): number {
    const tier = MEMBERSHIP_TIERS.find((t) => t.level === membershipLevel);
    return tier ? tier.discount : 0;
  }
}
