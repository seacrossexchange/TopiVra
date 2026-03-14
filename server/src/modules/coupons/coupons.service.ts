import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateCouponDto, UpdateCouponDto, ValidateCouponDto, CouponType, CouponStatus } from './dto/coupon.dto';

@Injectable()
export class CouponsService {
  constructor(private prisma: PrismaService) {}

  // 创建优惠券
  async create(dto: CreateCouponDto) {
    // 检查优惠券码是否已存在
    const existing = await this.prisma.coupon.findUnique({
      where: { code: dto.code },
    });

    if (existing) {
      throw new BadRequestException('优惠券码已存在');
    }

    return this.prisma.coupon.create({
      data: {
        ...dto,
        status: CouponStatus.ACTIVE,
        usedCount: 0,
      },
    });
  }

  // 更新优惠券
  async update(id: string, dto: UpdateCouponDto) {
    const coupon = await this.prisma.coupon.findUnique({ where: { id } });
    if (!coupon) {
      throw new NotFoundException('优惠券不存在');
    }

    return this.prisma.coupon.update({
      where: { id },
      data: dto,
    });
  }

  // 查询所有优惠券（管理员）
  async findAll(page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const [items, total] = await Promise.all([
      this.prisma.coupon.findMany({
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.coupon.count(),
    ]);

    return { items, total, page, limit };
  }

  // 查询用户可用优惠券
  async findAvailableForUser(userId: string, orderAmount: number) {
    const now = new Date();
    
    const coupons = await this.prisma.coupon.findMany({
      where: {
        status: CouponStatus.ACTIVE,
        OR: [
          { startDate: null },
          { startDate: { lte: now } },
        ],
        AND: [
          {
            OR: [
              { endDate: null },
              { endDate: { gte: now } },
            ],
          },
          {
            OR: [
              { minPurchase: null },
              { minPurchase: { lte: orderAmount } },
            ],
          },
        ],
      },
    });

    // 过滤已达使用上限的优惠券
    const available = [];
    for (const coupon of coupons) {
      // 检查总使用次数
      if (coupon.usageLimit && coupon.usedCount >= coupon.usageLimit) {
        continue;
      }

      // 检查用户使用次数
      if (coupon.userUsageLimit) {
        const userUsageCount = await this.prisma.couponUsage.count({
          where: { couponId: coupon.id, userId },
        });
        if (userUsageCount >= coupon.userUsageLimit) {
          continue;
        }
      }

      available.push(coupon);
    }

    return available;
  }

  // 验证优惠券
  async validate(userId: string, dto: ValidateCouponDto) {
    const coupon = await this.prisma.coupon.findUnique({
      where: { code: dto.code },
    });

    if (!coupon) {
      throw new NotFoundException('优惠券不存在');
    }

    if (coupon.status !== CouponStatus.ACTIVE) {
      throw new BadRequestException('优惠券已失效');
    }

    const now = new Date();
    if (coupon.startDate && coupon.startDate > now) {
      throw new BadRequestException('优惠券尚未生效');
    }

    if (coupon.endDate && coupon.endDate < now) {
      throw new BadRequestException('优惠券已过期');
    }

    if (coupon.minPurchase && dto.orderAmount < Number(coupon.minPurchase)) {
      throw new BadRequestException(`订单金额需满 $${coupon.minPurchase}`);
    }

    if (coupon.usageLimit && coupon.usedCount >= coupon.usageLimit) {
      throw new BadRequestException('优惠券已被领完');
    }

    if (coupon.userUsageLimit) {
      const userUsageCount = await this.prisma.couponUsage.count({
        where: { couponId: coupon.id, userId },
      });
      if (userUsageCount >= coupon.userUsageLimit) {
        throw new BadRequestException('您已达到该优惠券使用次数上限');
      }
    }

    // 检查适用平台
    if (coupon.applicablePlatforms && Array.isArray(coupon.applicablePlatforms) && coupon.applicablePlatforms.length > 0 && dto.platforms) {
      const hasApplicable = dto.platforms.some(p => (coupon.applicablePlatforms as string[]).includes(p));
      if (!hasApplicable) {
        throw new BadRequestException('优惠券不适用于当前商品');
      }
    }

    // 检查适用分类
    if (coupon.applicableCategories && Array.isArray(coupon.applicableCategories) && coupon.applicableCategories.length > 0 && dto.categories) {
      const hasApplicable = dto.categories.some(c => (coupon.applicableCategories as string[]).includes(c));
      if (!hasApplicable) {
        throw new BadRequestException('优惠券不适用于当前商品');
      }
    }

    // 计算折扣金额
    let discountAmount = 0;
    if (coupon.type === CouponType.PERCENTAGE) {
      discountAmount = (dto.orderAmount * Number(coupon.value)) / 100;
      if (coupon.maxDiscount && discountAmount > Number(coupon.maxDiscount)) {
        discountAmount = Number(coupon.maxDiscount);
      }
    } else if (coupon.type === CouponType.FIXED) {
      discountAmount = Math.min(Number(coupon.value), dto.orderAmount);
    }

    return {
      valid: true,
      coupon,
      discountAmount,
      finalAmount: Math.max(0, dto.orderAmount - discountAmount),
    };
  }

  // 使用优惠券（订单创建时调用）
  async useCoupon(userId: string, couponId: string, orderId: string) {
    const coupon = await this.prisma.coupon.findUnique({ where: { id: couponId } });
    if (!coupon) {
      throw new NotFoundException('优惠券不存在');
    }

    // 创建使用记录
    await this.prisma.couponUsage.create({
      data: {
        couponId,
        userId,
        orderId,
      },
    });

    // 增加使用次数
    await this.prisma.coupon.update({
      where: { id: couponId },
      data: { usedCount: { increment: 1 } },
    });

    return { success: true };
  }

  // 删除优惠券
  async remove(id: string) {
    const coupon = await this.prisma.coupon.findUnique({ where: { id } });
    if (!coupon) {
      throw new NotFoundException('优惠券不存在');
    }

    await this.prisma.coupon.delete({ where: { id } });
    return { success: true, message: '优惠券已删除' };
  }
}

