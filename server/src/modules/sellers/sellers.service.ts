import {
  Injectable,
  BadRequestException,
  NotFoundException,
  Logger,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { ApplySellerDto } from './dto/apply-seller.dto';
import { RequestWithdrawalDto, WithdrawalMethod } from './dto/withdrawal.dto';
import { TransactionFiltersDto } from './dto/transaction-filters.dto';
import { UpdateSellerProfileDto } from './dto/update-profile.dto';
import { Decimal } from '@prisma/client/runtime/library';
import { WebsocketGateway } from '../websocket/websocket.gateway';
import { MailService } from '../../common/mail/mail.service';

@Injectable()
export class SellersService {
  private readonly logger = new Logger(SellersService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    @Inject(forwardRef(() => WebsocketGateway))
    private websocketGateway: WebsocketGateway,
    @Inject(forwardRef(() => MailService))
    private mailService: MailService,
  ) {}

  // ==================== 卖家申请 ====================

  async applySeller(userId: string, applySellerDto: ApplySellerDto) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { sellerProfile: true },
    });

    if (!user) {
      throw new NotFoundException('User not found.');
    }

    if (user.isSeller || user.sellerProfile) {
      throw new BadRequestException(
        'User is already a seller or has an active seller application.',
      );
    }

    const sellerProfile = await this.prisma.sellerProfile.create({
      data: {
        userId: user.id,
        shopName: applySellerDto.shopName,
        shopDescription: applySellerDto.shopDescription,
        contactTelegram: applySellerDto.contactTelegram,
        contactEmail: applySellerDto.contactEmail,
        level: 'NORMAL',
        applicationStatus: 'PENDING',
      },
    });

    await this.prisma.user.update({
      where: { id: userId },
      data: { isSeller: true },
    });

    return sellerProfile;
  }

  // ==================== 卖家资料 ====================

  async getSellerProfile(userId: string) {
    const sellerProfile = await this.prisma.sellerProfile.findUnique({
      where: { userId },
      include: { user: true },
    });

    if (!sellerProfile) {
      throw new NotFoundException('Seller profile not found.');
    }

    return sellerProfile;
  }

  async updateSellerProfile(userId: string, dto: UpdateSellerProfileDto) {
    const sellerProfile = await this.prisma.sellerProfile.findUnique({
      where: { userId },
    });

    if (!sellerProfile) {
      throw new NotFoundException('Seller profile not found.');
    }

    return this.prisma.sellerProfile.update({
      where: { userId },
      data: {
        shopName: dto.shopName,
        shopDescription: dto.shopDescription,
        contactTelegram: dto.contactTelegram,
        contactEmail: dto.contactEmail,
      },
    });
  }

  // ==================== 卖家仪表盘统计 ====================

  async getSellerDashboardStats(userId: string) {
    const sellerProfile = await this.prisma.sellerProfile.findUnique({
      where: { userId },
      select: {
        id: true,
        productCount: true,
        orderCount: true,
        totalSales: true,
        totalWithdrawn: true,
        balance: true,
        frozenBalance: true,
        totalEarnings: true,
        rating: true,
        ratingCount: true,
      },
    });

    if (!sellerProfile) {
      throw new NotFoundException('Seller profile not found.');
    }

    // 获取待处理提现数量
    const pendingWithdrawalsCount = await this.prisma.withdrawal.count({
      where: { sellerId: userId, status: 'PENDING' },
    });

    // 获取今日订单数
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayOrdersCount = await this.prisma.orderItem.count({
      where: {
        sellerId: userId,
        order: {
          createdAt: { gte: today },
          orderStatus: { in: ['PAID', 'DELIVERED', 'COMPLETED'] },
        },
      },
    });

    // 获取今日销售额
    const todaySales = await this.prisma.orderItem.aggregate({
      where: {
        sellerId: userId,
        order: {
          createdAt: { gte: today },
          orderStatus: { in: ['PAID', 'DELIVERED', 'COMPLETED'] },
        },
      },
      _sum: { subtotal: true },
    });

    // 获取待处理订单数
    const pendingOrdersCount = await this.prisma.orderItem.count({
      where: {
        sellerId: userId,
        order: { orderStatus: 'PAID' },
        deliveredAt: null,
      },
    });

    return {
      productCount: sellerProfile.productCount,
      orderCount: sellerProfile.orderCount,
      totalSales: sellerProfile.totalSales,
      totalWithdrawn: sellerProfile.totalWithdrawn,
      balance: sellerProfile.balance,
      frozenBalance: sellerProfile.frozenBalance,
      totalEarnings: (sellerProfile as any).totalEarnings ?? new Decimal(0),
      rating: sellerProfile.rating,
      ratingCount: sellerProfile.ratingCount,
      pendingWithdrawalsCount,
      todayOrdersCount,
      todaySales: todaySales._sum.subtotal || new Decimal(0),
      pendingOrdersCount,
    };
  }

  // ==================== 提现功能 ====================

  async requestWithdrawal(userId: string, dto: RequestWithdrawalDto) {
    const sellerProfile = await this.prisma.sellerProfile.findUnique({
      where: { userId },
    });

    if (!sellerProfile) {
      throw new NotFoundException('Seller profile not found.');
    }

    const balance =
      sellerProfile.balance instanceof Decimal
        ? sellerProfile.balance.toNumber()
        : Number(sellerProfile.balance);

    if (balance < dto.amount) {
      throw new BadRequestException('余额不足');
    }

    // 计算提现手续费
    const feeRate = Number(
      this.configService.get('WITHDRAWAL_FEE_RATE') || 0.01,
    ); // 1% 手续费
    const minFee = Number(this.configService.get('WITHDRAWAL_MIN_FEE') || 1); // 最低 1 元
    const fee = Math.max(dto.amount * feeRate, minFee);
    const actualAmount = dto.amount - fee;

    // 生成提现单号
    const withdrawalNo = `W${Date.now()}${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

    // 构建账户信息
    const accountInfo = this.buildAccountInfo(dto.method, dto.account);

    const result = await this.prisma.$transaction(async (tx) => {
      // 冻结余额
      await tx.sellerProfile.update({
        where: { userId },
        data: {
          balance: { decrement: dto.amount },
          frozenBalance: { increment: dto.amount },
        },
      });

      // 创建提现记录
      const withdrawal = await tx.withdrawal.create({
        data: {
          withdrawalNo,
          sellerId: userId,
          amount: new Decimal(dto.amount),
          fee: new Decimal(fee),
          actualAmount: new Decimal(actualAmount),
          method: dto.method,
          accountInfo: accountInfo as any,
          status: 'PENDING',
        },
      });

      // 记录资金流水
      await tx.sellerTransaction.create({
        data: {
          sellerId: userId,
          type: 'WITHDRAWAL',
          amount: new Decimal(-dto.amount),
          balanceAfter: new Decimal(balance - dto.amount),
          currency: 'CNY',
          withdrawalId: withdrawal.id,
          description: `提现申请 ${withdrawalNo}`,
        },
      });

      return withdrawal;
    });

    this.logger.log(
      `卖家 ${userId} 申请提现 ${dto.amount}, 提现单号: ${withdrawalNo}`,
    );

    // 发送 WebSocket 通知
    try {
      this.websocketGateway.sendToUser(userId, 'withdrawal:requested', {
        withdrawalNo,
        amount: dto.amount,
        fee,
        actualAmount,
        message: '提现申请已提交，等待审核',
      });
    } catch (error) {
      this.logger.warn(`WebSocket 通知发送失败: ${(error as Error).message}`);
    }

    return result;
  }

  private buildAccountInfo(
    method: WithdrawalMethod,
    account: string,
  ): Record<string, unknown> {
    switch (method) {
      case WithdrawalMethod.BANK:
        // 银行卡格式: 银行名称|卡号|持卡人姓名
        const [bankName, cardNumber, holderName] = account.split('|');
        return { bankName, cardNumber, holderName };
      case WithdrawalMethod.ALIPAY:
        return { alipayAccount: account };
      case WithdrawalMethod.WECHAT:
        return { wechatAccount: account };
      case WithdrawalMethod.USDT:
        return { usdtAddress: account };
      default:
        return { account };
    }
  }

  async getWithdrawals(userId: string, page: number = 1, limit: number = 10) {
    const skip = (page - 1) * limit;

    const [withdrawals, total] = await Promise.all([
      this.prisma.withdrawal.findMany({
        where: { sellerId: userId },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.withdrawal.count({
        where: { sellerId: userId },
      }),
    ]);

    return {
      data: withdrawals,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getWithdrawalDetail(userId: string, withdrawalNo: string) {
    const withdrawal = await this.prisma.withdrawal.findUnique({
      where: { withdrawalNo },
    });

    if (!withdrawal || withdrawal.sellerId !== userId) {
      throw new NotFoundException('提现记录不存在');
    }

    return withdrawal;
  }

  // ==================== 资金流水 ====================

  async getTransactions(userId: string, filters: TransactionFiltersDto) {
    const { page = 1, limit = 10, type, startDate, endDate } = filters;
    const skip = (page - 1) * limit;

    const where: any = { sellerId: userId };

    if (type) {
      where.type = type;
    }

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) {
        where.createdAt.gte = new Date(startDate);
      }
      if (endDate) {
        where.createdAt.lte = new Date(endDate);
      }
    }

    const [transactions, total] = await Promise.all([
      this.prisma.sellerTransaction.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: {
          seller: {
            select: { username: true },
          },
        },
      }),
      this.prisma.sellerTransaction.count({ where }),
    ]);

    return {
      data: transactions,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // ==================== 卖家订单 ====================

  async getSellerOrders(
    userId: string,
    page: number = 1,
    limit: number = 10,
    status?: string,
  ) {
    const skip = (page - 1) * limit;

    const where: any = { sellerId: userId };

    if (status) {
      where.order = { orderStatus: status };
    }

    const [orders, total] = await Promise.all([
      this.prisma.orderItem.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: {
          order: {
            select: {
              orderNo: true,
              orderStatus: true,
              paymentStatus: true,
              createdAt: true,
              buyer: {
                select: { id: true, username: true },
              },
            },
          },
          product: {
            select: { id: true, title: true, thumbnailUrl: true },
          },
        },
      }),
      this.prisma.orderItem.count({ where }),
    ]);

    return {
      data: orders,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // ==================== 卖家商品统计 ====================

  async getSellerProductsStats(userId: string) {
    const [totalProducts, activeProducts, pendingProducts, soldOutProducts] =
      await Promise.all([
        this.prisma.product.count({ where: { sellerId: userId } }),
        this.prisma.product.count({
          where: { sellerId: userId, status: 'ON_SALE' },
        }),
        this.prisma.product.count({
          where: { sellerId: userId, status: 'PENDING' },
        }),
        this.prisma.product.count({
          where: { sellerId: userId, status: 'SOLD_OUT' },
        }),
      ]);

    // 获取销量前5的商品
    const topSellingProducts = await this.prisma.product.findMany({
      where: { sellerId: userId },
      orderBy: { soldCount: 'desc' },
      take: 5,
      select: {
        id: true,
        title: true,
        soldCount: true,
        price: true,
        thumbnailUrl: true,
      },
    });

    return {
      totalProducts,
      activeProducts,
      pendingProducts,
      soldOutProducts,
      topSellingProducts,
    };
  }

  // ==================== 内部方法：更新卖家统计 ====================

  // ==================== 促销管理 ====================

  async setPromotion(
    productId: string,
    dto: { label: string; startDate: string; endDate: string },
    sellerId: string,
  ) {
    const product = await this.prisma.product.findFirst({
      where: { id: productId, sellerId },
    });

    if (!product) {
      throw new NotFoundException('商品不存在或无权操作');
    }

    const updatedProduct = await this.prisma.product.update({
      where: { id: productId },
      data: {
        promotionLabel: dto.label,
        promotionStart: new Date(dto.startDate),
        promotionEnd: new Date(dto.endDate),
      },
    });

    this.logger.log(`Promotion set for product ${productId}: ${dto.label}`);
    return updatedProduct;
  }

  async clearPromotion(productId: string, sellerId: string) {
    const product = await this.prisma.product.findFirst({
      where: { id: productId, sellerId },
    });

    if (!product) {
      throw new NotFoundException('商品不存在或无权操作');
    }

    const updatedProduct = await this.prisma.product.update({
      where: { id: productId },
      data: {
        promotionLabel: null,
        promotionStart: null,
        promotionEnd: null,
      },
    });

    this.logger.log(`Promotion cleared for product ${productId}`);
    return updatedProduct;
  }

  // ==================== 公开卖家信息 ====================

  async getPublicSellerInfo(sellerId: string) {
    const sellerProfile = await this.prisma.sellerProfile.findUnique({
      where: { userId: sellerId },
      select: {
        userId: true,
        shopName: true,
        shopDescription: true,
        level: true,
        rating: true,
        ratingCount: true,
        productCount: true,
        orderCount: true,
        soldCount: true,
        createdAt: true,
        contactTelegram: true,
        user: {
          select: {
            id: true,
            username: true,
            avatar: true,
          },
        },
      },
    });

    if (!sellerProfile) {
      throw new NotFoundException('Seller not found.');
    }

    return sellerProfile;
  }

  async updateSellerStats(sellerId: string) {
    // 获取商品数量
    const productCount = await this.prisma.product.count({
      where: { sellerId, status: { in: ['ON_SALE', 'APPROVED'] } },
    });

    // 获取订单数量
    const orderCount = await this.prisma.orderItem.count({
      where: { sellerId },
    });

    // 获取已售数量
    const soldCount = await this.prisma.orderItem.aggregate({
      where: {
        sellerId,
        order: { orderStatus: { in: ['PAID', 'DELIVERED', 'COMPLETED'] } },
      },
      _sum: { quantity: true },
    });

    // 计算总销售额
    const totalSales = await this.prisma.orderItem.aggregate({
      where: {
        sellerId,
        order: { orderStatus: { in: ['PAID', 'DELIVERED', 'COMPLETED'] } },
      },
      _sum: { subtotal: true },
    });

    // 计算评分
    const ratingStats = await this.prisma.review.aggregate({
      where: { sellerId },
      _avg: { rating: true },
      _count: { id: true },
    });

    await this.prisma.sellerProfile.update({
      where: { userId: sellerId },
      data: {
        productCount,
        orderCount,
        soldCount: soldCount._sum.quantity || 0,
        totalSales: totalSales._sum.subtotal || new Decimal(0),
        rating: ratingStats._avg.rating || new Decimal(5),
        ratingCount: ratingStats._count.id || 0,
      },
    });
  }
}
