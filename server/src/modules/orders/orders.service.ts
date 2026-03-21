import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  CreateOrderDto,
  UpdateOrderStatusDto,
  DeliverOrderDto,
  OrderQueryDto,
} from './dto/order.dto';
import {
  CreateRefundRequestDto,
  UpdateRefundRequestDto,
  AdminProcessRefundDto,
  SellerRespondRefundDto,
  RefundQueryDto,
  AdminRefundQueryDto,
  RefundStatus,
} from './dto/refund.dto';
import { OrderStatus, PaymentStatus } from '@prisma/client';
import { ConfigService } from '@nestjs/config';
import {
  AuditService,
  AuditAction,
  AuditModule,
  OperatorRole,
} from '../../common/audit';
import { NotificationService } from '../../common/notification';
import { AutoDeliveryService } from '../inventory/auto-delivery.service';

@Injectable()
export class OrdersService {
  private readonly logger = new Logger(OrdersService.name);

  constructor(
    private prisma: PrismaService,
    private auditService: AuditService,
    private notificationService: NotificationService,
    private configService: ConfigService,
    private autoDeliveryService: AutoDeliveryService,
  ) {}

  // ==================== 创建订单 ====================

  async create(buyerId: string, dto: CreateOrderDto) {
    // 获取商品信息
    const products = await this.prisma.product.findMany({
      where: {
        id: { in: dto.items.map((item) => item.productId) },
        status: 'APPROVED',
      },
      include: { seller: { include: { sellerProfile: true } } },
    });

    if (products.length !== dto.items.length) {
      throw new BadRequestException('部分商品不存在或已下架');
    }

    // 检查库存
    for (const item of dto.items) {
      const product = products.find((p) => p.id === item.productId);
      if (!product) continue;
      if (product.stock < item.quantity) {
        throw new BadRequestException(`商品 ${product.title} 库存不足`);
      }

      // 如果商品支持自动发货，检查库存池是否有足够的可用账号
      if (product.autoDeliver) {
        const availableCount = await this.prisma.productInventory.count({
          where: {
            productId: item.productId,
            status: 'AVAILABLE',
            isValid: true,
          },
        });

        if (availableCount < item.quantity) {
          throw new BadRequestException(
            `商品 ${product.title} 可用账号不足（需要 ${item.quantity}，可用 ${availableCount}）`,
          );
        }
      }
    }

    // 计算订单金额
    let totalAmount = 0;
    const orderItems = dto.items.map((item) => {
      const product = products.find((p) => p.id === item.productId)!;
      const subtotal = Number(product.price) * item.quantity;
      totalAmount += subtotal;

      return {
        productId: item.productId,
        sellerId: product.sellerId,
        productTitle: product.title,
        productSnapshot: product as any,
        quantity: item.quantity,
        unitPrice: product.price,
        subtotal,
        sellerAmount:
          subtotal *
          (1 -
            Number(product.seller.sellerProfile?.commissionRate || 0.1) / 100),
        commissionAmount:
          (subtotal *
            Number(product.seller.sellerProfile?.commissionRate || 10)) /
          100,
        commissionRate: product.seller.sellerProfile?.commissionRate || 10,
      };
    });

    // 生成订单号
    const orderNo = `ORD${Date.now()}${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

    // 创建订单
    const order = await this.prisma.order.create({
      data: {
        orderNo,
        buyerId,
        totalAmount,
        payAmount: totalAmount,
        currency: 'USD',
        orderStatus: OrderStatus.CREATED,
        paymentStatus: PaymentStatus.UNPAID,
        buyerRemark: dto.buyerRemark,
        autoCancelAt: new Date(
          Date.now() +
            Number(this.configService.get('ORDER_AUTO_CANCEL_MINUTES') || 30) *
              60 *
              1000,
        ),
        orderItems: {
          create: orderItems,
        },
      },
      include: {
        orderItems: {
          include: {
            product: true,
          },
        },
      },
    });

    // 注意：库存在支付成功后由自动发货服务扣减，避免未支付订单占用库存

    // 记录审计日志
    await this.auditService.log({
      operatorId: buyerId,
      operatorRole: OperatorRole.USER,
      module: AuditModule.ORDER,
      action: AuditAction.ORDER_CREATE,
      targetType: 'order',
      targetId: order.id,
      description: `创建订单 ${order.orderNo}，金额 ${totalAmount}`,
      afterData: {
        orderNo: order.orderNo,
        totalAmount,
        itemCount: dto.items.length,
      },
    });

    // 通知卖家有新订单
    const sellerIds = [
      ...new Set(order.orderItems.map((item) => item.sellerId)),
    ];
    for (const sellerId of sellerIds) {
      await this.notificationService.notifyUser(sellerId, {
        type: 'ORDER_CREATED' as any,
        title: '新订单通知',
        content: `您有新订单 ${order.orderNo}，请等待买家付款`,
        orderId: order.id,
        orderNo: order.orderNo,
      });
    }

    return order;
  }

  // ==================== 买家查询订单列表 ====================

  /**
   * 处理支付成功（由支付模块调用）
   */
  async handlePaymentSuccess(orderId: string) {
    this.logger.log(`处理支付成功: ${orderId}`);

    // 更新订单状态为已支付
    await this.prisma.order.update({
      where: { id: orderId },
      data: {
        orderStatus: OrderStatus.PAID,
        paymentStatus: PaymentStatus.PAID,
      },
    });

    // 🔥 触发自动发货
    try {
      const result =
        await this.autoDeliveryService.handlePaymentSuccess(orderId);
      this.logger.log(`自动发货结果: ${JSON.stringify(result)}`);
      return result;
    } catch (error: unknown) {
      this.logger.error(`自动发货失败: ${(error as Error).message}`);
      // 不影响支付流程，记录错误日志
      return {
        orderId,
        success: false,
        error: (error as Error).message,
      };
    }
  }

  // ==================== 买家查询订单列表 ====================

  async findByBuyer(buyerId: string, query: OrderQueryDto) {
    const { page = 1, limit = 10, orderStatus, paymentStatus, search } = query;
    const skip = (page - 1) * limit;

    const where: any = { buyerId };
    if (orderStatus) where.orderStatus = orderStatus;
    if (paymentStatus) where.paymentStatus = paymentStatus;
    if (search) where.orderNo = { contains: search };

    const [items, total] = await Promise.all([
      this.prisma.order.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          orderItems: {
            include: {
              product: {
                select: { id: true, title: true, thumbnailUrl: true },
              },
            },
          },
        },
      }),
      this.prisma.order.count({ where }),
    ]);

    return { items, total, page, limit };
  }

  // ==================== 卖家查询订单列表 ====================

  async findBySeller(sellerId: string, query: OrderQueryDto) {
    const { page = 1, limit = 10, orderStatus, search } = query;
    const skip = (page - 1) * limit;

    const where: any = { orderItems: { some: { sellerId } } };
    if (orderStatus) where.orderStatus = orderStatus;
    if (search) where.orderNo = { contains: search };

    const [items, total] = await Promise.all([
      this.prisma.order.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          buyer: { select: { id: true, username: true, avatar: true } },
          orderItems: {
            where: { sellerId },
            include: {
              product: {
                select: { id: true, title: true, thumbnailUrl: true },
              },
            },
          },
        },
      }),
      this.prisma.order.count({ where }),
    ]);

    return { items, total, page, limit };
  }

  // ==================== 查询订单详情 ====================

  async findOne(id: string, userId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: {
        buyer: { select: { id: true, username: true, avatar: true } },
        orderItems: {
          include: {
            product: true,
            seller: { select: { id: true, username: true } },
          },
        },
        payments: true,
      },
    });

    if (!order) {
      throw new NotFoundException('订单不存在');
    }

    // 验证权限：买家或卖家可查看
    const isBuyer = order.buyerId === userId;
    const isSeller = order.orderItems.some((item) => item.sellerId === userId);
    if (!isBuyer && !isSeller) {
      throw new ForbiddenException('无权查看此订单');
    }

    return order;
  }

  // ==================== 根据订单号查询 ====================

  async findByOrderNo(orderNo: string, userId: string) {
    const order = await this.prisma.order.findUnique({
      where: { orderNo },
      include: {
        buyer: { select: { id: true, username: true, avatar: true } },
        orderItems: {
          include: {
            product: { select: { id: true, title: true, thumbnailUrl: true } },
            seller: { select: { id: true, username: true } },
          },
        },
      },
    });

    if (!order) {
      throw new NotFoundException('订单不存在');
    }

    const isBuyer = order.buyerId === userId;
    const isSeller = order.orderItems.some((item) => item.sellerId === userId);
    if (!isBuyer && !isSeller) {
      throw new ForbiddenException('无权查看此订单');
    }

    return order;
  }

  // ==================== 更新订单状态（管理员） ====================

  async updateStatus(id: string, dto: UpdateOrderStatusDto, adminId: string) {
    const order = await this.prisma.order.findUnique({ where: { id } });
    if (!order) {
      throw new NotFoundException('订单不存在');
    }

    const previousStatus = order.orderStatus;

    const updated = await this.prisma.order.update({
      where: { id },
      data: {
        orderStatus: dto.orderStatus,
        adminRemark: dto.adminRemark,
        ...(dto.orderStatus === OrderStatus.CANCELLED && {
          cancelledAt: new Date(),
        }),
        ...(dto.orderStatus === OrderStatus.COMPLETED && {
          completedAt: new Date(),
        }),
      },
    });

    // 记录审计日志
    await this.auditService.log({
      operatorId: adminId,
      operatorRole: OperatorRole.ADMIN,
      module: AuditModule.ORDER,
      action: AuditAction.ORDER_STATUS_CHANGE,
      targetType: 'order',
      targetId: id,
      description: `管理员更新订单状态：${previousStatus} -> ${dto.orderStatus}`,
      beforeData: { orderStatus: previousStatus },
      afterData: { orderStatus: dto.orderStatus, adminRemark: dto.adminRemark },
    });

    return updated;
  }

  // ==================== 卖家交付 ====================

  async deliver(orderItemId: string, sellerId: string, dto: DeliverOrderDto) {
    const orderItem = await this.prisma.orderItem.findUnique({
      where: { id: orderItemId },
      include: { order: true },
    });

    if (!orderItem) {
      throw new NotFoundException('订单项不存在');
    }

    if (orderItem.sellerId !== sellerId) {
      throw new ForbiddenException('无权操作此订单');
    }

    if (orderItem.order.orderStatus !== OrderStatus.PAID) {
      throw new BadRequestException('订单状态不允许交付');
    }

    const result = await this.prisma.orderItem.update({
      where: { id: orderItemId },
      data: {
        deliveredCredentials: dto.deliveredCredentials,
        deliveredAt: new Date(),
        order: {
          update: {
            data: {
              orderStatus: OrderStatus.DELIVERED,
            },
          },
        },
      },
      include: { order: { include: { buyer: true } } },
    });

    // 发送交付通知给买家
    await this.notificationService.notifyUser(result.order.buyerId, {
      type: 'ORDER_DELIVERED' as any,
      title: '订单已发货',
      content: `您的订单 ${result.order.orderNo} 已发货，请查收账号信息`,
      orderId: result.order.id,
      orderNo: result.order.orderNo,
    });

    // 同时通过 WebSocket 发送订单状态变更
    this.notificationService['websocketGateway'].notifyOrderStatus(
      result.order.buyerId,
      result.order.orderNo,
      'DELIVERED',
    );

    return result;
  }

  // ==================== 买家确认收货 ====================

  async confirmDelivery(orderId: string, buyerId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { orderItems: true },
    });

    if (!order) {
      throw new NotFoundException('订单不存在');
    }

    if (order.buyerId !== buyerId) {
      throw new ForbiddenException('无权操作此订单');
    }

    if (order.orderStatus !== OrderStatus.DELIVERED) {
      throw new BadRequestException('订单状态不允许确认');
    }

    // 更新订单状态并只结算未结算的订单项
    await this.prisma.$transaction(async (tx) => {
      const now = new Date();

      // 更新订单项确认状态
      await tx.orderItem.updateMany({
        where: { orderId },
        data: {
          deliveryConfirmed: true,
          confirmedAt: now,
        },
      });

      // 更新订单状态
      await tx.order.update({
        where: { id: orderId },
        data: {
          orderStatus: OrderStatus.COMPLETED,
          completedAt: now,
        },
      });

      // 结算卖家余额
      for (const item of order.orderItems) {
        if (item.settled) {
          continue;
        }

        const sellerProfile = await tx.sellerProfile.findUnique({
          where: { userId: item.sellerId },
          select: {
            balance: true,
            totalSales: true,
            totalEarnings: true,
          },
        });

        if (!sellerProfile) {
          throw new NotFoundException('卖家资料不存在');
        }

        const balanceAfter =
          Number(sellerProfile.balance) + Number(item.sellerAmount);

        await tx.sellerProfile.update({
          where: { userId: item.sellerId },
          data: {
            balance: { increment: item.sellerAmount },
            totalSales: { increment: item.subtotal },
            totalEarnings: { increment: item.sellerAmount },
          },
        });

        await tx.sellerTransaction.create({
          data: {
            sellerId: item.sellerId,
            type: 'INCOME',
            amount: item.sellerAmount,
            balanceAfter,
            currency: order.currency,
            orderId,
            orderItemId: item.id,
            description: `订单收入 - ${item.productTitle}`,
          },
        });

        await tx.orderItem.update({
          where: { id: item.id },
          data: {
            settled: true,
            settledAt: now,
          },
        });
      }
    });

    // 通知卖家订单已完成
    const sellerIds = [
      ...new Set(order.orderItems.map((item) => item.sellerId)),
    ];
    for (const sellerId of sellerIds) {
      await this.notificationService.notifyUser(sellerId, {
        type: 'ORDER_COMPLETED' as any,
        title: '订单已完成',
        content: `订单 ${order.orderNo} 买家已确认收货，订单完成`,
        orderId: order.id,
        orderNo: order.orderNo,
      });
    }

    return { success: true, message: '已确认收货' };
  }

  // ==================== 取消订单 ====================

  async cancel(orderId: string, userId: string, reason?: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { orderItems: true },
    });

    if (!order) {
      throw new NotFoundException('订单不存在');
    }

    if (order.buyerId !== userId) {
      throw new ForbiddenException('无权操作此订单');
    }

    if (!['CREATED', 'PENDING_PAYMENT'].includes(order.orderStatus as string)) {
      throw new BadRequestException('当前订单状态无法取消');
    }

    await this.prisma.$transaction(async (tx) => {
      // 更新订单状态
      await tx.order.update({
        where: { id: orderId },
        data: {
          orderStatus: OrderStatus.CANCELLED,
          cancelledAt: new Date(),
          refundReason: reason,
        },
      });

      // 恢复库存
      for (const item of order.orderItems) {
        await tx.product.update({
          where: { id: item.productId },
          data: { stock: { increment: item.quantity } },
        });
      }
    });

    // 通知卖家订单已取消
    const sellerIds = [
      ...new Set(order.orderItems.map((item) => item.sellerId)),
    ];
    for (const sellerId of sellerIds) {
      await this.notificationService.notifyUser(sellerId, {
        type: 'ORDER_CANCELLED' as any,
        title: '订单已取消',
        content: `订单 ${order.orderNo} 已被买家取消${reason ? `，原因：${reason}` : ''}`,
        orderId: order.id,
        orderNo: order.orderNo,
      });
    }

    return { success: true, message: '订单已取消' };
  }

  // ==================== 管理员查询所有订单 ====================

  async findAll(query: OrderQueryDto) {
    const {
      page = 1,
      limit = 10,
      orderStatus,
      paymentStatus,
      search,
      startDate,
      endDate,
    } = query;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (orderStatus) where.orderStatus = orderStatus;
    if (paymentStatus) where.paymentStatus = paymentStatus;
    if (search) where.orderNo = { contains: search };
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate);
      if (endDate) where.createdAt.lte = new Date(endDate);
    }

    const [items, total] = await Promise.all([
      this.prisma.order.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          buyer: { select: { id: true, username: true, email: true } },
          orderItems: {
            include: {
              product: { select: { id: true, title: true } },
              seller: { select: { id: true, username: true } },
            },
          },
        },
      }),
      this.prisma.order.count({ where }),
    ]);

    return { items, total, page, limit };
  }

  // ==================== 退款流程 ====================

  /**
   * 买家申请退款
   */
  async createRefundRequest(buyerId: string, dto: CreateRefundRequestDto) {
    // 验证订单
    const order = await this.prisma.order.findUnique({
      where: { id: dto.orderId },
      include: { orderItems: true },
    });

    if (!order) {
      throw new NotFoundException('订单不存在');
    }

    if (order.buyerId !== buyerId) {
      throw new ForbiddenException('无权操作此订单');
    }

    // 只有已支付或已交付的订单可以申请退款
    if (!['PAID', 'DELIVERED'].includes(order.orderStatus as string)) {
      throw new BadRequestException('当前订单状态无法申请退款');
    }

    // 检查是否已有进行中的退款申请
    const existingRefund = await this.prisma.refundRequest.findFirst({
      where: {
        orderId: dto.orderId,
        status: { in: ['PENDING', 'SELLER_AGREED', 'DISPUTED'] },
      },
    });

    if (existingRefund) {
      throw new BadRequestException('该订单已有进行中的退款申请');
    }

    // 获取卖家ID（取第一个订单项的卖家）
    const sellerId = order.orderItems[0]?.sellerId;
    if (!sellerId) {
      throw new BadRequestException('订单无卖家信息');
    }

    // 生成退款单号
    const refundNo = `REF${Date.now()}${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

    // 创建退款申请
    const refundRequest = await this.prisma.refundRequest.create({
      data: {
        refundNo,
        orderId: dto.orderId,
        userId: buyerId,
        sellerId,
        orderItemId: dto.orderItemId,
        refundType: dto.refundType,
        reason: dto.reason,
        description: dto.description,
        evidence: dto.evidence || [],
        refundAmount: dto.refundAmount || order.payAmount,
        status: RefundStatus.PENDING,
      },
      include: {
        order: {
          include: {
            orderItems: {
              include: { seller: { select: { id: true, username: true } } },
            },
          },
        },
      },
    });

    // 通知卖家
    const sellerIds = [
      ...new Set(order.orderItems.map((item) => item.sellerId)),
    ];
    for (const sellerId of sellerIds) {
      await this.notificationService.notifyUser(sellerId, {
        type: 'REFUND_REQUEST' as any,
        title: '收到退款申请',
        content: `订单 ${order.orderNo} 买家申请退款，请及时处理`,
        orderId: order.id,
        orderNo: order.orderNo,
      });
    }

    // 记录审计日志
    await this.auditService.log({
      operatorId: buyerId,
      operatorRole: OperatorRole.USER,
      module: AuditModule.ORDER,
      action: AuditAction.ORDER_STATUS_CHANGE,
      targetType: 'refund_request',
      targetId: refundRequest.id,
      description: `买家申请退款 - 订单 ${order.orderNo}`,
      afterData: {
        refundType: dto.refundType,
        reason: dto.reason,
        refundAmount: refundRequest.refundAmount,
      },
    });

    return refundRequest;
  }

  /**
   * 买家修改退款申请
   */
  async updateRefundRequest(
    refundId: string,
    buyerId: string,
    dto: UpdateRefundRequestDto,
  ) {
    const refund = await this.prisma.refundRequest.findUnique({
      where: { id: refundId },
    });

    if (!refund) {
      throw new NotFoundException('退款申请不存在');
    }

    if (refund.userId !== buyerId) {
      throw new ForbiddenException('无权操作此退款申请');
    }

    if (refund.status !== RefundStatus.PENDING) {
      throw new BadRequestException('当前状态无法修改退款申请');
    }

    const updated = await this.prisma.refundRequest.update({
      where: { id: refundId },
      data: {
        reason: dto.reason,
        description: dto.description,
        evidence: dto.evidence,
      },
    });

    return updated;
  }

  /**
   * 买家撤销退款申请
   */
  async cancelRefundRequest(refundId: string, buyerId: string) {
    const refund = await this.prisma.refundRequest.findUnique({
      where: { id: refundId },
    });

    if (!refund) {
      throw new NotFoundException('退款申请不存在');
    }

    if (refund.userId !== buyerId) {
      throw new ForbiddenException('无权操作此退款申请');
    }

    if (
      ![RefundStatus.PENDING, RefundStatus.DISPUTED].includes(
        refund.status as RefundStatus,
      )
    ) {
      throw new BadRequestException('当前状态无法撤销');
    }

    const updated = await this.prisma.refundRequest.update({
      where: { id: refundId },
      data: {
        status: RefundStatus.CANCELLED,
        cancelledAt: new Date(),
      },
    });

    return updated;
  }

  /**
   * 卖家响应退款申请
   */
  async sellerRespondRefund(
    refundId: string,
    sellerId: string,
    dto: SellerRespondRefundDto,
  ) {
    const refund = await this.prisma.refundRequest.findUnique({
      where: { id: refundId },
      include: { order: { include: { orderItems: true } } },
    });

    if (!refund) {
      throw new NotFoundException('退款申请不存在');
    }

    // 验证卖家身份
    const isSeller = refund.order.orderItems.some(
      (item) => item.sellerId === sellerId,
    );
    if (!isSeller) {
      throw new ForbiddenException('无权操作此退款申请');
    }

    if (refund.status !== RefundStatus.PENDING) {
      throw new BadRequestException('当前状态无法响应');
    }

    let newStatus: RefundStatus;
    if (dto.agreed) {
      newStatus = RefundStatus.SELLER_AGREED;
    } else {
      newStatus = RefundStatus.SELLER_REJECTED;
    }

    const updated = await this.prisma.refundRequest.update({
      where: { id: refundId },
      data: {
        status: newStatus,
        sellerResponse: dto.sellerResponse,
        rejectReason: dto.rejectReason,
        sellerRespondedAt: new Date(),
      },
    });

    // 通知买家
    await this.notificationService.notifyUser(refund.userId, {
      type: 'REFUND_RESPONSE' as any,
      title: '退款申请已响应',
      content: `卖家已${dto.agreed ? '同意' : '拒绝'}您的退款申请`,
      orderId: refund.orderId,
    });

    return updated;
  }
  /**
   * 买家申请平台介入
   */
  async escalateRefund(refundId: string, buyerId: string, reason: string) {
    const refund = await this.prisma.refundRequest.findUnique({
      where: { id: refundId },
    });

    if (!refund) {
      throw new NotFoundException('退款申请不存在');
    }

    if (refund.userId !== buyerId) {
      throw new ForbiddenException('无权操作此退款申请');
    }

    if (refund.status !== RefundStatus.SELLER_REJECTED) {
      throw new BadRequestException('只有卖家拒绝后才能申请平台介入');
    }

    const updated = await this.prisma.refundRequest.update({
      where: { id: refundId },
      data: {
        status: RefundStatus.DISPUTED,
        escalateReason: reason,
        escalatedAt: new Date(),
      },
    });

    return updated;
  }

  /**
   * 管理员处理退款
   */
  async processRefund(
    refundId: string,
    adminId: string,
    dto: AdminProcessRefundDto,
  ) {
    const refund = await this.prisma.refundRequest.findUnique({
      where: { id: refundId },
      include: {
        order: { include: { orderItems: true } },
      },
    });

    if (!refund) {
      throw new NotFoundException('退款申请不存在');
    }

    if (
      ![RefundStatus.SELLER_AGREED, RefundStatus.DISPUTED].includes(
        refund.status as RefundStatus,
      )
    ) {
      throw new BadRequestException('当前状态无法处理退款');
    }

    const isApproved = dto.action === 'APPROVE';

    // 使用事务处理退款
    const result = await this.prisma.$transaction(async (tx) => {
      // 更新退款状态
      const updatedRefund = await tx.refundRequest.update({
        where: { id: refundId },
        data: {
          status: isApproved ? RefundStatus.COMPLETED : RefundStatus.REJECTED,
          adminResponse: dto.adminResponse,
          processedBy: adminId,
          processedAt: new Date(),
          refundCompletedAt: isApproved ? new Date() : null,
        },
      });

      if (isApproved) {
        // 更新订单状态
        await tx.order.update({
          where: { id: refund.orderId },
          data: {
            orderStatus: OrderStatus.REFUNDED,
            paymentStatus: PaymentStatus.REFUNDED,
          },
        });

        // 恢复库存并扣减已结算卖家余额
        for (const item of refund.order.orderItems) {
          await tx.product.update({
            where: { id: item.productId },
            data: { stock: { increment: item.quantity } },
          });

          if (!item.settled) {
            continue;
          }

          const sellerProfile = await tx.sellerProfile.findUnique({
            where: { userId: item.sellerId },
          });
          if (
            sellerProfile &&
            Number(sellerProfile.balance) >= Number(item.sellerAmount)
          ) {
            const newBalance =
              Number(sellerProfile.balance) - Number(item.sellerAmount);
            await tx.sellerProfile.update({
              where: { userId: item.sellerId },
              data: {
                balance: newBalance,
                totalEarnings: { decrement: item.sellerAmount },
              },
            });

            // 记录交易流水
            await tx.sellerTransaction.create({
              data: {
                sellerId: item.sellerId,
                type: 'REFUND',
                amount: -Number(item.sellerAmount),
                balanceAfter: newBalance,
                currency: refund.order.currency || 'USD',
                orderId: refund.orderId,
                orderItemId: item.id,
                description: `订单退款 - ${item.productTitle}`,
              },
            });
          }
        }

        // 退款到买家账户余额
        const buyer = await tx.user.findUnique({
          where: { id: refund.userId },
        });

        if (!buyer) {
          throw new NotFoundException('买家不存在');
        }

        const newBalance =
          Number(buyer.balance || 0) + Number(refund.refundAmount);

        await tx.user.update({
          where: { id: refund.userId },
          data: {
            balance: newBalance,
          },
        });

        // 创建退款支付记录
        await tx.payment.create({
          data: {
            paymentNo: `REF-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
            orderId: refund.orderId,
            userId: refund.userId,
            method: 'REFUND',
            amount: Number(refund.refundAmount),
            currency: refund.order.currency || 'USD',
            status: 'SUCCESS',
            paidAt: new Date(),
          },
        });

        // 记录买家余额变动流水（如果有 UserTransaction 表）
        // await tx.userTransaction.create({
        //   data: {
        //     userId: refund.userId,
        //     type: 'REFUND',
        //     amount: Number(refund.refundAmount),
        //     balanceAfter: newBalance,
        //     orderId: refund.orderId,
        //     description: `订单退款 - ${refund.order.orderNo}`,
        //   },
        // });
      }

      return updatedRefund;
    });

    // 通知买卖双方
    await this.notificationService.notifyUser(refund.userId, {
      type: 'REFUND_RESULT' as any,
      title: '退款处理完成',
      content: isApproved
        ? `您的退款申请已通过，$${Number(refund.refundAmount).toFixed(2)} 已退回至账户余额`
        : '您的退款申请已被拒绝',
      orderId: refund.orderId,
    });

    const sellerIds = [
      ...new Set(refund.order.orderItems.map((item) => item.sellerId)),
    ];
    for (const sellerId of sellerIds) {
      await this.notificationService.notifyUser(sellerId, {
        type: 'REFUND_RESULT' as any,
        title: '退款处理完成',
        content: isApproved ? '订单退款已完成' : '退款申请已被拒绝',
        orderId: refund.orderId,
      });
    }

    // 记录审计日志
    await this.auditService.log({
      operatorId: adminId,
      operatorRole: OperatorRole.ADMIN,
      module: AuditModule.ORDER,
      action: AuditAction.ORDER_STATUS_CHANGE,
      targetType: 'refund_request',
      targetId: refundId,
      description: `管理员处理退款 - ${isApproved ? '通过' : '拒绝'}`,
      beforeData: { status: refund.status },
      afterData: {
        status: result.status,
        adminResponse: dto.adminResponse,
      },
    });

    return result;
  }

  /**
   * 查询买家退款列表
   */
  async findRefundsByBuyer(buyerId: string, query: RefundQueryDto) {
    const { page = 1, limit = 10, status } = query;
    const skip = (page - 1) * limit;

    const where: any = { userId: buyerId };
    if (status) where.status = status;

    const [items, total] = await Promise.all([
      this.prisma.refundRequest.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          order: {
            select: { orderNo: true, totalAmount: true },
          },
        },
      }),
      this.prisma.refundRequest.count({ where }),
    ]);

    return { items, total, page, limit };
  }

  /**
   * 查询卖家相关退款列表
   */
  async findRefundsBySeller(sellerId: string, query: RefundQueryDto) {
    const { page = 1, limit = 10, status } = query;
    const skip = (page - 1) * limit;

    const where: any = { sellerId };
    if (status) where.status = status;

    const [items, total] = await Promise.all([
      this.prisma.refundRequest.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          order: {
            select: { orderNo: true, totalAmount: true },
          },
        },
      }),
      this.prisma.refundRequest.count({ where }),
    ]);

    return { items, total, page, limit };
  }

  /**
   * 管理员查询所有退款申请
   */
  async findAllRefunds(query: AdminRefundQueryDto) {
    const { page = 1, limit = 10, status, search, startDate, endDate } = query;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (status) where.status = status;
    if (search) {
      where.order = { orderNo: { contains: search } };
    }
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate);
      if (endDate) where.createdAt.lte = new Date(endDate);
    }

    const [items, total] = await Promise.all([
      this.prisma.refundRequest.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          order: {
            select: { orderNo: true, totalAmount: true, orderItems: true },
          },
        },
      }),
      this.prisma.refundRequest.count({ where }),
    ]);

    return { items, total, page, limit };
  }

  /**
   * 查询退款详情
   */
  async findRefundDetail(refundId: string, userId: string) {
    const refund = await this.prisma.refundRequest.findUnique({
      where: { id: refundId },
      include: {
        order: {
          include: {
            orderItems: {
              include: {
                product: {
                  select: { id: true, title: true, thumbnailUrl: true },
                },
                seller: { select: { id: true, username: true } },
              },
            },
          },
        },
      },
    });

    if (!refund) {
      throw new NotFoundException('退款申请不存在');
    }

    // 验证权限
    const isBuyer = refund.userId === userId;
    const isSeller = refund.order.orderItems.some(
      (item) => item.sellerId === userId,
    );
    if (!isBuyer && !isSeller) {
      throw new ForbiddenException('无权查看此退款申请');
    }

    return refund;
  }
}
