import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  CreateCouponDto,
  UpdateCouponDto,
  ValidateCouponDto,
  CouponType,
  CouponStatus,
} from './dto/coupon.dto';

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
      throw new BadRequestException({
        code: 'COUPON_CODE_EXISTS',
        translationKey: 'errors.COUPON_CODE_EXISTS',
        message: 'Coupon code already exists',
      });
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
      throw new NotFoundException({
        code: 'COUPON_NOT_FOUND',
        translationKey: 'errors.COUPON_NOT_FOUND',
        message: 'Coupon not found',
      });
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
        OR: [{ startDate: null }, { startDate: { lte: now } }],
        AND: [
          {
            OR: [{ endDate: null }, { endDate: { gte: now } }],
          },
          {
            OR: [{ minPurchase: null }, { minPurchase: { lte: orderAmount } }],
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
      throw new NotFoundException({
        code: 'COUPON_NOT_FOUND',
        translationKey: 'errors.COUPON_NOT_FOUND',
        message: 'Coupon not found',
      });
    }

    if (coupon.status !== CouponStatus.ACTIVE) {
      throw new BadRequestException({
        code: 'COUPON_INACTIVE',
        translationKey: 'errors.COUPON_INACTIVE',
        message: 'Coupon is inactive',
      });
    }

    const now = new Date();
    if (coupon.startDate && coupon.startDate > now) {
      throw new BadRequestException({
        code: 'COUPON_NOT_STARTED',
        translationKey: 'errors.COUPON_NOT_STARTED',
        message: 'Coupon is not active yet',
      });
    }

    if (coupon.endDate && coupon.endDate < now) {
      throw new BadRequestException({
        code: 'COUPON_EXPIRED',
        translationKey: 'errors.COUPON_EXPIRED',
        message: 'Coupon has expired',
      });
    }

    if (coupon.minPurchase && dto.orderAmount < Number(coupon.minPurchase)) {
      throw new BadRequestException({
        code: 'COUPON_MIN_PURCHASE_NOT_MET',
        translationKey: 'errors.COUPON_MIN_PURCHASE_NOT_MET',
        message: 'Order amount does not meet the minimum purchase requirement',
        details: { minPurchase: Number(coupon.minPurchase) },
      });
    }

    if (coupon.usageLimit && coupon.usedCount >= coupon.usageLimit) {
      throw new BadRequestException({
        code: 'COUPON_USAGE_LIMIT_REACHED',
        translationKey: 'errors.COUPON_USAGE_LIMIT_REACHED',
        message: 'Coupon usage limit reached',
      });
    }

    if (coupon.userUsageLimit) {
      const userUsageCount = await this.prisma.couponUsage.count({
        where: { couponId: coupon.id, userId },
      });
      if (userUsageCount >= coupon.userUsageLimit) {
        throw new BadRequestException({
          code: 'COUPON_USER_USAGE_LIMIT_REACHED',
          translationKey: 'errors.COUPON_USER_USAGE_LIMIT_REACHED',
          message: 'You have reached the usage limit for this coupon',
        });
      }
    }

    // 检查适用平台
    if (
      coupon.applicablePlatforms &&
      Array.isArray(coupon.applicablePlatforms) &&
      coupon.applicablePlatforms.length > 0 &&
      dto.platforms
    ) {
      const hasApplicable = dto.platforms.some((p) =>
        (coupon.applicablePlatforms as string[]).includes(p),
      );
      if (!hasApplicable) {
        throw new BadRequestException({
          code: 'COUPON_NOT_APPLICABLE',
          translationKey: 'errors.COUPON_NOT_APPLICABLE',
          message: 'Coupon is not applicable to the current product',
        });
      }
    }

    // 检查适用分类
    if (
      coupon.applicableCategories &&
      Array.isArray(coupon.applicableCategories) &&
      coupon.applicableCategories.length > 0 &&
      dto.categories
    ) {
      const hasApplicable = dto.categories.some((c) =>
        (coupon.applicableCategories as string[]).includes(c),
      );
      if (!hasApplicable) {
        throw new BadRequestException({
          code: 'COUPON_NOT_APPLICABLE',
          translationKey: 'errors.COUPON_NOT_APPLICABLE',
          message: 'Coupon is not applicable to the current product',
        });
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
    const coupon = await this.prisma.coupon.findUnique({
      where: { id: couponId },
    });
    if (!coupon) {
      throw new NotFoundException({
        code: 'COUPON_NOT_FOUND',
        translationKey: 'errors.COUPON_NOT_FOUND',
        message: 'Coupon not found',
      });
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
      throw new NotFoundException({
        code: 'COUPON_NOT_FOUND',
        translationKey: 'errors.COUPON_NOT_FOUND',
        message: 'Coupon not found',
      });
    }

    await this.prisma.coupon.delete({ where: { id } });
    return {
      success: true,
      message: 'Coupon deleted successfully',
      translationKey: 'coupon.deleteSuccess',
    };
  }
}
