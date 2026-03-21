import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationService } from '../../common/notification';
import {
  CreateRefundTicketDto,
  CreateDMTicketDto,
  SendTicketMessageDto,
  SellerRespondDto,
  EscalateTicketDto,
  AdminProcessTicketDto,
  TicketQueryDto,
  TicketStatus,
  TicketType,
  SenderRole,
} from './dto/ticket.dto';

@Injectable()
export class TicketsService {
  private readonly logger = new Logger(TicketsService.name);

  constructor(
    private prisma: PrismaService,
    private notificationService: NotificationService,
  ) {}

  /**
   * 生成工单号
   */
  private generateTicketNo(): string {
    return `TKT${Date.now()}${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
  }

  /**
   * 创建退款工单
   */
  async createRefundTicket(buyerId: string, dto: CreateRefundTicketDto) {
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

    if (!['PAID', 'DELIVERED'].includes(order.orderStatus)) {
      throw new BadRequestException('当前订单状态无法申请退款');
    }

    // 检查是否已有进行中的退款工单
    const existingTicket = await this.prisma.$queryRaw`
      SELECT * FROM c2c_tickets 
      WHERE order_id = ${dto.orderId} 
      AND type = 'REFUND'
      AND status IN ('PENDING', 'SELLER_REVIEWING', 'SELLER_AGREED', 'ADMIN_REVIEWING')
      LIMIT 1
    `;

    if (existingTicket && (existingTicket as any[]).length > 0) {
      throw new BadRequestException('该订单已有进行中的退款工单');
    }

    // 获取卖家ID
    const sellerId = order.orderItems[0]?.sellerId;
    if (!sellerId) {
      throw new BadRequestException('订单无卖家信息');
    }

    const ticketNo = this.generateTicketNo();
    const refundAmount = dto.refundAmount || Number(order.payAmount);

    // 创建工单
    const ticket = await this.prisma.$queryRaw`
      INSERT INTO c2c_tickets (
        id, ticket_no, type, status, order_id, buyer_id, seller_id,
        subject, refund_amount, refund_reason, refund_evidence,
        seller_respond_deadline, unread_seller, created_at, updated_at
      ) VALUES (
        UUID(), ${ticketNo}, 'REFUND', 'SELLER_REVIEWING', ${dto.orderId},
        ${buyerId}, ${sellerId}, 
        CONCAT('退款申请 - 订单 #', ${order.orderNo}),
        ${refundAmount}, ${dto.refundReason}, ${JSON.stringify(dto.refundEvidence || [])},
        DATE_ADD(NOW(), INTERVAL 48 HOUR), 1, NOW(), NOW()
      )
    `;

    // 创建系统消息
    await this.createSystemMessage(
      ticketNo,
      `买家申请退款，金额：$${refundAmount.toFixed(2)}，原因：${dto.refundReason}`,
    );

    // 通知卖家
    await this.notificationService.notifyUser(sellerId, {
      type: 'TICKET_CREATED' as any,
      title: '收到退款申请',
      content: `订单 ${order.orderNo} 买家申请退款，请在48小时内响应`,
      orderId: order.id,
    });

    return { ticketNo, message: '退款申请已提交' };
  }

  /**
   * 创建私信工单
   */
  async createDMTicket(buyerId: string, dto: CreateDMTicketDto) {
    const ticketNo = this.generateTicketNo();

    await this.prisma.$executeRaw`
      INSERT INTO c2c_tickets (
        id, ticket_no, type, status, buyer_id, seller_id, order_id,
        subject, unread_seller, created_at, updated_at
      ) VALUES (
        UUID(), ${ticketNo}, 'DM', 'PENDING', ${buyerId}, ${dto.sellerId},
        ${dto.orderId || null}, ${dto.subject}, 1, NOW(), NOW()
      )
    `;

    // 发送第一条消息
    await this.sendMessage(ticketNo, buyerId, {
      content: dto.content,
    });

    // 通知卖家
    await this.notificationService.notifyUser(dto.sellerId, {
      type: 'TICKET_CREATED' as any,
      title: '收到新私信',
      content: dto.subject,
    });

    return { ticketNo, message: '私信已发送' };
  }

  /**
   * 发送消息
   */
  async sendMessage(ticketNo: string, senderId: string, dto: SendTicketMessageDto) {
    // 获取工单信息
    const tickets = await this.prisma.$queryRaw<any[]>`
      SELECT * FROM c2c_tickets WHERE ticket_no = ${ticketNo} LIMIT 1
    `;

    if (!tickets || tickets.length === 0) {
      throw new NotFoundException('工单不存在');
    }

    const ticket = tickets[0];

    // 验证权限
    const isBuyer = ticket.buyer_id === senderId;
    const isSeller = ticket.seller_id === senderId;
    const isAdmin = await this.isAdmin(senderId);

    if (!isBuyer && !isSeller && !isAdmin) {
      throw new ForbiddenException('无权操作此工单');
    }

    // 确定发送者角色
    let senderRole: SenderRole;
    if (isBuyer) senderRole = SenderRole.BUYER;
    else if (isSeller) senderRole = SenderRole.SELLER;
    else senderRole = SenderRole.ADMIN;

    // 创建消息
    await this.prisma.$executeRaw`
      INSERT INTO c2c_ticket_messages (
        id, ticket_id, sender_id, sender_role, content, attachments, is_internal, created_at
      ) VALUES (
        UUID(), ${ticket.id}, ${senderId}, ${senderRole}, ${dto.content},
        ${JSON.stringify(dto.attachments || [])}, ${dto.isInternal || false}, NOW()
      )
    `;

    // 更新未读计数
    if (isBuyer) {
      await this.prisma.$executeRaw`
        UPDATE c2c_tickets 
        SET unread_seller = unread_seller + 1, unread_admin = unread_admin + 1, updated_at = NOW()
        WHERE id = ${ticket.id}
      `;
      // 通知卖家和管理员
      if (ticket.seller_id) {
        await this.notificationService.notifyUser(ticket.seller_id, {
          type: 'TICKET_MESSAGE' as any,
          title: '工单新消息',
          content: dto.content.substring(0, 50),
        });
      }
    } else if (isSeller) {
      await this.prisma.$executeRaw`
        UPDATE c2c_tickets 
        SET unread_buyer = unread_buyer + 1, unread_admin = unread_admin + 1, updated_at = NOW()
        WHERE id = ${ticket.id}
      `;
      // 通知买家
      await this.notificationService.notifyUser(ticket.buyer_id, {
        type: 'TICKET_MESSAGE' as any,
        title: '工单新消息',
        content: dto.content.substring(0, 50),
      });
    } else {
      // 管理员消息通知买卖双方
      await this.prisma.$executeRaw`
        UPDATE c2c_tickets 
        SET unread_buyer = unread_buyer + 1, unread_seller = unread_seller + 1, updated_at = NOW()
        WHERE id = ${ticket.id}
      `;
    }

    return { success: true };
  }

  /**
   * 卖家响应退款
   */
  async sellerRespond(
    ticketNo: string,
    sellerId: string,
    dto: SellerRespondDto,
  ) {
    const tickets = await this.prisma.$queryRaw<any[]>`
      SELECT * FROM c2c_tickets WHERE ticket_no = ${ticketNo} LIMIT 1
    `;

    if (!tickets || tickets.length === 0) {
      throw new NotFoundException('工单不存在');
    }

    const ticket = tickets[0];

    if (ticket.seller_id !== sellerId) {
      throw new ForbiddenException('无权操作此工单');
    }

    if (ticket.status !== 'SELLER_REVIEWING') {
      throw new BadRequestException('当前状态无法响应');
    }

    const newStatus =
      dto.action === 'AGREE' ? 'SELLER_AGREED' : 'SELLER_REJECTED';

    await this.prisma.$executeRaw`
      UPDATE c2c_tickets 
      SET status = ${newStatus}, seller_responded_at = NOW(), unread_buyer = unread_buyer + 1, updated_at = NOW()
      WHERE id = ${ticket.id}
    `;

    // 创建系统消息
    const message =
      dto.action === 'AGREE'
        ? '卖家已同意退款，等待平台审核'
        : `卖家已拒绝退款${dto.rejectReason ? `，原因：${dto.rejectReason}` : ''}`;

    await this.createSystemMessage(ticketNo, message);

    // 通知买家
    await this.notificationService.notifyUser(ticket.buyer_id, {
      type: 'TICKET_RESPONSE' as any,
      title: dto.action === 'AGREE' ? '卖家已同意退款' : '卖家已拒绝退款',
      content: message,
    });

    // 如果卖家同意，自动提交给管理员审核
    if (dto.action === 'AGREE') {
      await this.prisma.$executeRaw`
        UPDATE c2c_tickets 
        SET status = 'ADMIN_REVIEWING', updated_at = NOW()
        WHERE id = ${ticket.id}
      `;
      await this.createSystemMessage(ticketNo, '已提交平台审核');
    }

    return { success: true, message };
  }

  /**
   * 买家申请平台介入
   */
  async escalateToAdmin(
    ticketNo: string,
    buyerId: string,
    dto: EscalateTicketDto,
  ) {
    const tickets = await this.prisma.$queryRaw<any[]>`
      SELECT * FROM c2c_tickets WHERE ticket_no = ${ticketNo} LIMIT 1
    `;

    if (!tickets || tickets.length === 0) {
      throw new NotFoundException('工单不存在');
    }

    const ticket = tickets[0];

    if (ticket.buyer_id !== buyerId) {
      throw new ForbiddenException('无权操作此工单');
    }

    if (ticket.status !== 'SELLER_REJECTED') {
      throw new BadRequestException('只有卖家拒绝后才能申请平台介入');
    }

    await this.prisma.$executeRaw`
      UPDATE c2c_tickets 
      SET status = 'ADMIN_REVIEWING', updated_at = NOW()
      WHERE id = ${ticket.id}
    `;

    await this.createSystemMessage(
      ticketNo,
      `买家申请平台介入，原因：${dto.reason}`,
    );

    return { success: true, message: '已申请平台介入' };
  }

  /**
   * 管理员处理工单
   */
  async adminProcess(
    ticketNo: string,
    adminId: string,
    dto: AdminProcessTicketDto,
  ) {
    const tickets = await this.prisma.$queryRaw<any[]>`
      SELECT * FROM c2c_tickets WHERE ticket_no = ${ticketNo} LIMIT 1
    `;

    if (!tickets || tickets.length === 0) {
      throw new NotFoundException('工单不存在');
    }

    const ticket = tickets[0];

    if (ticket.status !== 'ADMIN_REVIEWING') {
      throw new BadRequestException('当前状态无法处理');
    }

    const isApproved = dto.action === 'APPROVE';
    const newStatus = isApproved ? 'ADMIN_APPROVED' : 'ADMIN_REJECTED';

    await this.prisma.$executeRaw`
      UPDATE c2c_tickets 
      SET status = ${newStatus}, admin_id = ${adminId}, admin_reviewed_at = NOW(),
          unread_buyer = unread_buyer + 1, unread_seller = unread_seller + 1, updated_at = NOW()
      WHERE id = ${ticket.id}
    `;

    const message = isApproved
      ? `平台已批准退款${dto.adminResponse ? `，${dto.adminResponse}` : ''}`
      : `平台已拒绝退款${dto.adminResponse ? `，原因：${dto.adminResponse}` : ''}`;

    await this.createSystemMessage(ticketNo, message);

    // 记录管理员操作
    await this.logAdminAction(
      ticket.id,
      adminId,
      isApproved ? 'APPROVE' : 'REJECT',
      {
        action: dto.action,
        response: dto.adminResponse,
        refundAmount: dto.refundAmount,
        previousStatus: ticket.status,
        newStatus,
      },
    );

    // 如果批准，执行退款
    if (isApproved && ticket.order_id) {
      await this.processRefund(ticket.order_id, ticket.refund_amount, adminId);

      await this.prisma.$executeRaw`
        UPDATE c2c_tickets 
        SET status = 'COMPLETED', completed_at = NOW(), updated_at = NOW()
        WHERE id = ${ticket.id}
      `;

      await this.createSystemMessage(
        ticketNo,
        `退款已完成，$${Number(ticket.refund_amount).toFixed(2)} 已退回至买家账户余额`,
      );

      // 记录退款完成
      await this.logAdminAction(ticket.id, adminId, 'REFUND_COMPLETED', {
        refundAmount: ticket.refund_amount,
        orderId: ticket.order_id,
      });
    }

    // 通知买卖双方
    await this.notificationService.notifyUser(ticket.buyer_id, {
      type: 'TICKET_RESULT' as any,
      title: '工单处理完成',
      content: message,
    });

    if (ticket.seller_id) {
      await this.notificationService.notifyUser(ticket.seller_id, {
        type: 'TICKET_RESULT' as any,
        title: '工单处理完成',
        content: message,
      });
    }

    return { success: true, message };
  }

  /**
   * 执行退款（调用订单服务的退款逻辑）
   */
  private async processRefund(
    orderId: string,
    refundAmount: number,
    adminId: string,
  ) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { orderItems: true },
    });

    if (!order) return;

    await this.prisma.$transaction(async (tx) => {
      // 更新订单状态
      await tx.order.update({
        where: { id: orderId },
        data: {
          orderStatus: 'REFUNDED',
          paymentStatus: 'REFUNDED',
          refundedAt: new Date(),
        },
      });

      // 增加买家余额
      const buyer = await tx.user.findUnique({ where: { id: order.buyerId } });
      if (buyer) {
        const newBalance = Number(buyer.balance || 0) + refundAmount;
        await tx.user.update({
          where: { id: order.buyerId },
          data: { balance: newBalance },
        });
      }

      // 恢复库存
      for (const item of order.orderItems) {
        await tx.product.update({
          where: { id: item.productId },
          data: { stock: { increment: item.quantity } },
        });
      }
    });
  }

  /**
   * 创建系统消息
   */
  private async createSystemMessage(ticketNo: string, content: string) {
    const tickets = await this.prisma.$queryRaw<any[]>`
      SELECT id FROM c2c_tickets WHERE ticket_no = ${ticketNo} LIMIT 1
    `;

    if (tickets && tickets.length > 0) {
      await this.prisma.$executeRaw`
        INSERT INTO c2c_ticket_messages (
          id, ticket_id, sender_id, sender_role, content, created_at
        ) VALUES (
          UUID(), ${tickets[0].id}, 'SYSTEM', 'SYSTEM', ${content}, NOW()
        )
      `;
    }
  }

  /**
   * 检查是否是管理员
   */
  private async isAdmin(userId: string): Promise<boolean> {
    const roles = await this.prisma.userRole.findMany({
      where: { userId, role: 'ADMIN' },
    });
    return roles.length > 0;
  }

  /**
   * 买家查询工单列表
   */
  async findByBuyer(buyerId: string, query: TicketQueryDto) {
    const { page = 1, limit = 20, type, status, search } = query;
    const offset = (page - 1) * limit;

    let whereClause = `buyer_id = '${buyerId}'`;
    if (type) whereClause += ` AND type = '${type}'`;
    if (status) whereClause += ` AND status = '${status}'`;
    if (search)
      whereClause += ` AND (ticket_no LIKE '%${search}%' OR subject LIKE '%${search}%')`;

    const items = await this.prisma.$queryRawUnsafe<any[]>(`
      SELECT * FROM c2c_tickets 
      WHERE ${whereClause}
      ORDER BY created_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `);

    const totalResult = await this.prisma.$queryRawUnsafe<any[]>(`
      SELECT COUNT(*) as count FROM c2c_tickets WHERE ${whereClause}
    `);
    const total = totalResult[0]?.count || 0;

    return { items, total, page, limit };
  }

  /**
   * 卖家查询工单列表
   */
  async findBySeller(sellerId: string, query: TicketQueryDto) {
    const { page = 1, limit = 20, type, status, search } = query;
    const offset = (page - 1) * limit;

    let whereClause = `seller_id = '${sellerId}'`;
    if (type) whereClause += ` AND type = '${type}'`;
    if (status) whereClause += ` AND status = '${status}'`;
    if (search)
      whereClause += ` AND (ticket_no LIKE '%${search}%' OR subject LIKE '%${search}%')`;

    const items = await this.prisma.$queryRawUnsafe<any[]>(`
      SELECT * FROM c2c_tickets 
      WHERE ${whereClause}
      ORDER BY created_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `);

    const totalResult = await this.prisma.$queryRawUnsafe<any[]>(`
      SELECT COUNT(*) as count FROM c2c_tickets WHERE ${whereClause}
    `);
    const total = totalResult[0]?.count || 0;

    return { items, total, page, limit };
  }

  /**
   * 管理员查询所有工单
   */
  async findAll(query: TicketQueryDto) {
    const {
      page = 1,
      limit = 20,
      type,
      status,
      search,
      startDate,
      endDate,
    } = query;
    const offset = (page - 1) * limit;

    let whereClause = '1=1';
    if (type) whereClause += ` AND type = '${type}'`;
    if (status) whereClause += ` AND status = '${status}'`;
    if (search)
      whereClause += ` AND (ticket_no LIKE '%${search}%' OR subject LIKE '%${search}%')`;
    if (startDate) whereClause += ` AND created_at >= '${startDate}'`;
    if (endDate) whereClause += ` AND created_at <= '${endDate}'`;

    const items = await this.prisma.$queryRawUnsafe<any[]>(`
      SELECT * FROM c2c_tickets 
      WHERE ${whereClause}
      ORDER BY created_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `);

    const totalResult = await this.prisma.$queryRawUnsafe<any[]>(`
      SELECT COUNT(*) as count FROM c2c_tickets WHERE ${whereClause}
    `);
    const total = totalResult[0]?.count || 0;

    return { items, total, page, limit };
  }

  /**
   * 获取工单详情
   */
  async findOne(ticketNo: string, userId: string) {
    const tickets = await this.prisma.$queryRaw<any[]>`
      SELECT * FROM c2c_tickets WHERE ticket_no = ${ticketNo} LIMIT 1
    `;

    if (!tickets || tickets.length === 0) {
      throw new NotFoundException('工单不存在');
    }

    const ticket = tickets[0];

    // 验证权限
    const isBuyer = ticket.buyer_id === userId;
    const isSeller = ticket.seller_id === userId;
    const isAdmin = await this.isAdmin(userId);

    if (!isBuyer && !isSeller && !isAdmin) {
      throw new ForbiddenException('无权查看此工单');
    }

    // 获取消息列表 - 根据角色过滤
    let messages;
    if (isAdmin) {
      // 管理员可以看到所有消息（包括内部消息）
      messages = await this.prisma.$queryRaw<any[]>`
        SELECT * FROM c2c_ticket_messages 
        WHERE ticket_id = ${ticket.id}
        ORDER BY created_at ASC
      `;

      // 记录管理员查看操作
      await this.logAdminAction(ticket.id, userId, 'VIEW', {
        ticketNo,
        timestamp: new Date().toISOString(),
      });
    } else {
      // 买卖双方只能看到非内部消息
      messages = await this.prisma.$queryRaw<any[]>`
        SELECT * FROM c2c_ticket_messages 
        WHERE ticket_id = ${ticket.id} 
        AND (is_internal = FALSE OR is_internal IS NULL)
        ORDER BY created_at ASC
      `;
    }

    // 标记为已读
    if (isBuyer) {
      await this.prisma.$executeRaw`
        UPDATE c2c_tickets SET unread_buyer = 0 WHERE id = ${ticket.id}
      `;
    } else if (isSeller) {
      await this.prisma.$executeRaw`
        UPDATE c2c_tickets SET unread_seller = 0 WHERE id = ${ticket.id}
      `;
    } else if (isAdmin) {
      await this.prisma.$executeRaw`
        UPDATE c2c_tickets SET unread_admin = 0 WHERE id = ${ticket.id}
      `;
    }

    return { ...ticket, messages };
  }

  /**
   * 关闭工单
   */
  async closeTicket(ticketNo: string, userId: string) {
    const tickets = await this.prisma.$queryRaw<any[]>`
      SELECT * FROM c2c_tickets WHERE ticket_no = ${ticketNo} LIMIT 1
    `;

    if (!tickets || tickets.length === 0) {
      throw new NotFoundException('工单不存在');
    }

    const ticket = tickets[0];

    // 只有买家或管理员可以关闭
    const isBuyer = ticket.buyer_id === userId;
    const isAdmin = await this.isAdmin(userId);

    if (!isBuyer && !isAdmin) {
      throw new ForbiddenException('无权关闭此工单');
    }

    await this.prisma.$executeRaw`
      UPDATE c2c_tickets 
      SET status = 'CLOSED', closed_at = NOW(), updated_at = NOW()
      WHERE id = ${ticket.id}
    `;

    await this.createSystemMessage(ticketNo, '工单已关闭');

    // 记录管理员关闭操作
    if (isAdmin) {
      await this.logAdminAction(ticket.id, userId, 'CLOSE', {
        previousStatus: ticket.status,
        closedBy: 'ADMIN',
      });
    }

    return { success: true, message: '工单已关闭' };
  }

  /**
   * 记录管理员操作日志
   */
  private async logAdminAction(
    ticketId: string,
    adminId: string,
    action: string,
    details?: any,
  ) {
    try {
      await this.prisma.$executeRaw`
        INSERT INTO c2c_admin_ticket_logs (
          id, ticket_id, admin_id, action, details, created_at
        ) VALUES (
          UUID(), ${ticketId}, ${adminId}, ${action}, 
          ${JSON.stringify(details || {})}, NOW()
        )
      `;
      this.logger.log(
        `管理员操作记录: ${action} by ${adminId} on ticket ${ticketId}`,
      );
    } catch (error: any) {
      // 日志记录失败不应影响主流程
      this.logger.error(
        `记录管理员操作失败: ${error?.message || 'Unknown error'}`,
      );
    }
  }

  /**
   * 获取买家统计
   */
  async getBuyerStats(buyerId: string) {
    const stats = await this.prisma.$queryRaw<any[]>`
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN status IN ('SELLER_REVIEWING', 'SELLER_OFFERED_REPLACEMENT', 'BUYER_ACCEPTED_REPLACEMENT') THEN 1 ELSE 0 END) as pending,
        SUM(CASE WHEN status = 'CLOSED' THEN 1 ELSE 0 END) as closed,
        AVG(CASE 
          WHEN seller_responded_at IS NOT NULL 
          THEN TIMESTAMPDIFF(HOUR, created_at, seller_responded_at) 
          ELSE NULL 
        END) as avgResponseTime
      FROM c2c_tickets 
      WHERE buyer_id = ${buyerId}
    `;

    const result = stats[0] || {};
    return {
      total: Number(result.total) || 0,
      pending: Number(result.pending) || 0,
      closed: Number(result.closed) || 0,
      avgResponseTime: result.avgResponseTime
        ? `${Math.round(result.avgResponseTime)}小时`
        : '0小时',
    };
  }

  /**
   * 获取卖家统计
   */
  async getSellerStats(sellerId: string) {
    const stats = await this.prisma.$queryRaw<any[]>`
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN status IN ('SELLER_REVIEWING', 'BUYER_ACCEPTED_REPLACEMENT') THEN 1 ELSE 0 END) as pending,
        SUM(CASE WHEN status = 'CLOSED' THEN 1 ELSE 0 END) as closed,
        AVG(CASE 
          WHEN seller_responded_at IS NOT NULL 
          THEN TIMESTAMPDIFF(HOUR, created_at, seller_responded_at) 
          ELSE NULL 
        END) as avgResponseTime
      FROM c2c_tickets 
      WHERE seller_id = ${sellerId}
    `;

    const result = stats[0] || {};
    return {
      total: Number(result.total) || 0,
      pending: Number(result.pending) || 0,
      closed: Number(result.closed) || 0,
      avgResponseTime: result.avgResponseTime
        ? `${Math.round(result.avgResponseTime)}小时${Math.round((result.avgResponseTime % 1) * 60)}分`
        : '0小时',
    };
  }

  /**
   * 获取管理员统计
   */
  async getAdminStats() {
    const stats = await this.prisma.$queryRaw<any[]>`
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN status = 'ADMIN_REVIEWING' THEN 1 ELSE 0 END) as pending,
        SUM(CASE WHEN status = 'CLOSED' THEN 1 ELSE 0 END) as closed,
        AVG(CASE 
          WHEN admin_reviewed_at IS NOT NULL 
          THEN TIMESTAMPDIFF(HOUR, created_at, admin_reviewed_at) 
          ELSE NULL 
        END) as avgResponseTime
      FROM c2c_tickets
    `;

    const result = stats[0] || {};
    return {
      total: Number(result.total) || 0,
      pending: Number(result.pending) || 0,
      closed: Number(result.closed) || 0,
      avgResponseTime: result.avgResponseTime
        ? `${Math.round(result.avgResponseTime)}小时`
        : '0小时',
    };
  }

  /**
   * 买家响应换货
   */
  async buyerRespondReplacement(ticketNo: string, buyerId: string, dto: any) {
    const tickets = await this.prisma.$queryRaw<any[]>`
      SELECT * FROM c2c_tickets WHERE ticket_no = ${ticketNo} LIMIT 1
    `;

    if (!tickets || tickets.length === 0) {
      throw new NotFoundException('工单不存在');
    }

    const ticket = tickets[0];

    if (ticket.buyer_id !== buyerId) {
      throw new ForbiddenException('无权操作');
    }

    if (ticket.status !== 'SELLER_OFFERED_REPLACEMENT') {
      throw new BadRequestException('当前状态无法响应');
    }

    const newStatus =
      dto.action === 'ACCEPT'
        ? 'BUYER_ACCEPTED_REPLACEMENT'
        : 'BUYER_REJECTED_REPLACEMENT';

    await this.prisma.$executeRaw`
      UPDATE c2c_tickets 
      SET status = ${newStatus}, unread_seller = unread_seller + 1, updated_at = NOW()
      WHERE id = ${ticket.id}
    `;

    const message =
      dto.action === 'ACCEPT'
        ? '买家已接受换货，等待卖家发货新账号'
        : `买家已拒绝换货${dto.reason ? `，原因：${dto.reason}` : ''}`;

    await this.createSystemMessage(ticketNo, message);

    return { success: true, message };
  }

  /**
   * 卖家发货换货商品
   */
  async deliverReplacement(ticketNo: string, sellerId: string, dto: any) {
    const tickets = await this.prisma.$queryRaw<any[]>`
      SELECT * FROM c2c_tickets WHERE ticket_no = ${ticketNo} LIMIT 1
    `;

    if (!tickets || tickets.length === 0) {
      throw new NotFoundException('工单不存在');
    }

    const ticket = tickets[0];

    if (ticket.seller_id !== sellerId) {
      throw new ForbiddenException('无权操作');
    }

    if (ticket.status !== 'BUYER_ACCEPTED_REPLACEMENT') {
      throw new BadRequestException('当前状态无法发货');
    }

    await this.prisma.$executeRaw`
      UPDATE c2c_tickets 
      SET status = 'REPLACEMENT_DELIVERED',
          replacement_delivery_info = ${dto.deliveryInfo},
          replacement_delivered_at = NOW(),
          unread_buyer = unread_buyer + 1,
          updated_at = NOW()
      WHERE id = ${ticket.id}
    `;

    const message = `卖家已发货新账号${dto.note ? `，备注：${dto.note}` : ''}`;
    await this.createSystemMessage(ticketNo, message);

    return { success: true, message };
  }

  /**
   * 买家确认换货
   */
  async confirmReplacement(ticketNo: string, buyerId: string) {
    const tickets = await this.prisma.$queryRaw<any[]>`
      SELECT * FROM c2c_tickets WHERE ticket_no = ${ticketNo} LIMIT 1
    `;

    if (!tickets || tickets.length === 0) {
      throw new NotFoundException('工单不存在');
    }

    const ticket = tickets[0];

    if (ticket.buyer_id !== buyerId) {
      throw new ForbiddenException('无权操作');
    }

    if (ticket.status !== 'REPLACEMENT_DELIVERED') {
      throw new BadRequestException('当前状态无法确认');
    }

    await this.prisma.$executeRaw`
      UPDATE c2c_tickets 
      SET status = 'COMPLETED', completed_at = NOW(), updated_at = NOW()
      WHERE id = ${ticket.id}
    `;

    await this.createSystemMessage(ticketNo, '买家已确认收货，换货完成');

    return { success: true, message: '换货已完成' };
  }
}
