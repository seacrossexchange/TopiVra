import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  AuditService,
  AuditAction,
  AuditModule,
  OperatorRole,
} from '../../common/audit/audit.service';
import { AuditSellerDto } from './dto/audit.dto';
import { UpdateUserStatusDto, UserStatus } from './dto/user-status.dto';
import { AdminQueryFiltersDto } from './dto/query-filters.dto';

@Injectable()
export class AdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  // Dashboard Stats
  async getDashboardStats() {
    const [userCount, orderCount, totalRevenue, pendingTickets] =
      await Promise.all([
        this.prisma.user.count(),
        this.prisma.order.count(),
        this.prisma.payment.aggregate({
          where: { status: 'SUCCESS' },
          _sum: { amount: true },
        }),
        this.prisma.ticket.count({
          where: { status: 'OPEN' },
        }),
      ]);

    return {
      userCount,
      orderCount,
      totalRevenue: totalRevenue._sum.amount || 0,
      pendingTickets,
    };
  }

  // User Management
  async getUsers(query: AdminQueryFiltersDto) {
    const { search, status, page = 1 } = query;
    const pageSize = (query as any).pageSize || 20;
    const skip = (page - 1) * pageSize;

    const where: any = {};
    if (search) {
      where.OR = [
        { email: { contains: search } },
        { username: { contains: search } },
      ];
    }
    if (status) {
      where.status = status as UserStatus;
    }

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          email: true,
          username: true,
          avatar: true,
          status: true,
          isSeller: true,
          createdAt: true,
          roles: { select: { role: true } },
          _count: { select: { ordersAsBuyer: true } },
        },
      }),
      this.prisma.user.count({ where }),
    ]);

    const items = users.map((u) => ({
      ...u,
      role: u.roles?.find((r) => r.role === 'ADMIN')
        ? 'ADMIN'
        : u.roles?.find((r) => r.role === 'SELLER')
          ? 'SELLER'
          : 'USER',
      createdAt: u.createdAt.toISOString(),
    }));

    return { items, total, page, pageSize };
  }

  async updateUserStatus(
    id: string,
    dto: UpdateUserStatusDto,
    operatorId: string,
  ) {
    // Get user before update for audit log
    const userBefore = await this.prisma.user.findUnique({
      where: { id },
      select: { id: true, status: true, username: true },
    });

    if (!userBefore) {
      throw new NotFoundException(`用户 ${id} 不存在`);
    }

    const updated = await this.prisma.user.update({
      where: { id },
      data: { status: dto.status },
    });

    // Audit log
    const action =
      dto.status === 'BANNED'
        ? AuditAction.ADMIN_USER_BAN
        : AuditAction.ADMIN_USER_UNBAN;
    await this.auditService.log({
      operatorId,
      operatorRole: OperatorRole.ADMIN,
      module: AuditModule.USER,
      action,
      targetType: 'user',
      targetId: id,
      description: `Admin ${dto.status === 'BANNED' ? 'banned' : 'unbanned'} user ${userBefore?.username}`,
      beforeData: { status: userBefore?.status },
      afterData: { status: dto.status },
    });

    return updated;
  }

  // Product Management
  async getProducts(query: AdminQueryFiltersDto) {
    const { search, status, page = 1 } = query;
    const pageSize = (query as any).pageSize || 10;
    const skip = (page - 1) * pageSize;

    const where: any = {};
    if (search) {
      where.OR = [
        { title: { contains: search } },
        { description: { contains: search } },
      ];
    }
    if (status) {
      where.status = status;
    }

    const [products, total] = await Promise.all([
      this.prisma.product.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
        include: {
          seller: { select: { id: true, username: true } },
          category: { select: { id: true, name: true } },
        },
      }),
      this.prisma.product.count({ where }),
    ]);

    const items = products.map((p) => ({
      id: p.id,
      title: p.title,
      image: (p.images as any)?.[0] || p.thumbnailUrl || '',
      platform: p.platform,
      seller: p.seller?.username || '-',
      price: Number(p.price),
      status: p.status,
      submittedAt: p.createdAt.toISOString(),
    }));

    return { items, total, page, pageSize };
  }

  async auditProduct(id: string, dto: AuditSellerDto, operatorId: string) {
    const productBefore = await this.prisma.product.findUnique({
      where: { id },
      select: { id: true, status: true, title: true },
    });

    const status = dto.action === 'approve' ? 'APPROVED' : 'REJECTED';
    const updated = await this.prisma.product.update({
      where: { id },
      data: { status },
    });

    // Audit log
    const action =
      dto.action === 'approve'
        ? AuditAction.ADMIN_PRODUCT_APPROVE
        : AuditAction.ADMIN_PRODUCT_REJECT;
    await this.auditService.log({
      operatorId,
      operatorRole: OperatorRole.ADMIN,
      module: AuditModule.PRODUCT,
      action,
      targetType: 'product',
      targetId: id,
      description: `Admin ${dto.action === 'approve' ? 'approved' : 'rejected'} product ${productBefore?.title}`,
      beforeData: { status: productBefore?.status },
      afterData: { status },
    });

    return updated;
  }

  // Order Management
  async getOrders(query: AdminQueryFiltersDto) {
    const { search, status, page = 1 } = query;
    const pageSize = (query as any).pageSize || 20;
    const skip = (page - 1) * pageSize;

    const where: any = {};
    if (search) {
      where.OR = [{ orderNo: { contains: search } }];
    }
    if (status) {
      where.orderStatus = status;
    }

    const [orders, total] = await Promise.all([
      this.prisma.order.findMany({
        where,
        skip,
        take: pageSize,
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

    const items = orders.map((o) => ({
      id: o.id,
      orderNo: o.orderNo,
      buyer: o.buyer?.username || '-',
      seller: o.orderItems?.[0]?.seller?.username || '-',
      amount: Number(o.payAmount),
      status: o.orderStatus,
      createdAt: o.createdAt.toISOString(),
    }));

    return { items, total, page, pageSize };
  }

  async refundOrder(id: string, operatorId: string) {
    const orderBefore = await this.prisma.order.findUnique({
      where: { id },
      select: { id: true, orderNo: true, orderStatus: true },
    });

    const updated = await this.prisma.order.update({
      where: { id },
      data: { orderStatus: 'REFUNDED' },
    });

    // Audit log
    await this.auditService.log({
      operatorId,
      operatorRole: OperatorRole.ADMIN,
      module: AuditModule.ORDER,
      action: AuditAction.ADMIN_ORDER_REFUND,
      targetType: 'order',
      targetId: id,
      description: `Admin refunded order ${orderBefore?.orderNo}`,
      beforeData: { orderStatus: orderBefore?.orderStatus },
      afterData: { orderStatus: 'REFUNDED' },
    });

    return updated;
  }

  // Seller Management
  async getSellers(query: AdminQueryFiltersDto) {
    const { search, status, page = 1 } = query;
    const pageSize = (query as any).pageSize || 20;
    const skip = (page - 1) * pageSize;

    const where: any = {};
    if (search) {
      where.OR = [
        { shopName: { contains: search } },
        { contactEmail: { contains: search } },
      ];
    }
    if (status) {
      where.applicationStatus = status;
    }

    const [sellers, total] = await Promise.all([
      this.prisma.sellerProfile.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: {
              id: true,
              username: true,
              email: true,
              avatar: true,
              status: true,
            },
          },
        },
      }),
      this.prisma.sellerProfile.count({ where }),
    ]);

    const items = sellers.map((s) => ({
      id: s.id,
      shopName: s.shopName,
      username: s.user?.username || '-',
      avatar: s.shopAvatar || s.user?.avatar,
      level: s.level,
      productCount: s.productCount,
      totalSales: Number(s.totalSales),
      rating: Number(s.rating),
      status: s.user?.status === 'ACTIVE' ? 'ACTIVE' : 'SUSPENDED',
      applicationStatus: s.applicationStatus,
    }));

    return { items, total, page, pageSize };
  }

  async auditSeller(id: string, dto: AuditSellerDto, operatorId: string) {
    const sellerBefore = await this.prisma.sellerProfile.findUnique({
      where: { id },
      select: { id: true, applicationStatus: true, shopName: true },
    });

    if (!sellerBefore) {
      throw new NotFoundException(`卖家档案 ${id} 不存在`);
    }

    const applicationStatus =
      dto.action === 'approve' ? 'APPROVED' : 'REJECTED';
    const updated = await this.prisma.sellerProfile.update({
      where: { id },
      data: { applicationStatus },
    });

    // Audit log
    const action =
      dto.action === 'approve'
        ? AuditAction.ADMIN_SELLER_APPROVE
        : AuditAction.ADMIN_SELLER_REJECT;
    await this.auditService.log({
      operatorId,
      operatorRole: OperatorRole.ADMIN,
      module: AuditModule.SELLER,
      action,
      targetType: 'sellerProfile',
      targetId: id,
      description: `Admin ${dto.action === 'approve' ? 'approved' : 'rejected'} seller ${sellerBefore?.shopName}`,
      beforeData: { applicationStatus: sellerBefore?.applicationStatus },
      afterData: { applicationStatus },
    });

    return updated;
  }

  async updateSellerLevel(
    id: string,
    level: 'NORMAL' | 'VERIFIED' | 'PREMIUM',
    operatorId: string,
  ) {
    const sellerBefore = await this.prisma.sellerProfile.findUnique({
      where: { id },
      select: { id: true, level: true, shopName: true },
    });

    const updated = await this.prisma.sellerProfile.update({
      where: { id },
      data: { level },
    });

    // Audit log
    await this.auditService.log({
      operatorId,
      operatorRole: OperatorRole.ADMIN,
      module: AuditModule.SELLER,
      action: AuditAction.ADMIN_SELLER_LEVEL_CHANGE,
      targetType: 'sellerProfile',
      targetId: id,
      description: `Admin changed seller ${sellerBefore?.shopName} level from ${sellerBefore?.level} to ${level}`,
      beforeData: { level: sellerBefore?.level },
      afterData: { level },
    });

    return updated;
  }

  async toggleSellerStatus(id: string, operatorId: string) {
    // id here is sellerProfile.id, get userId
    const seller = await this.prisma.sellerProfile.findUnique({
      where: { id },
      include: { user: { select: { id: true, status: true, username: true } } },
    });
    if (!seller) throw new Error('Seller not found');

    const newStatus = seller.user.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE';
    await this.prisma.user.update({
      where: { id: seller.userId },
      data: { status: newStatus as any },
    });

    await this.auditService.log({
      operatorId,
      operatorRole: OperatorRole.ADMIN,
      module: AuditModule.SELLER,
      action:
        newStatus === 'SUSPENDED'
          ? AuditAction.ADMIN_USER_BAN
          : AuditAction.ADMIN_USER_UNBAN,
      targetType: 'sellerProfile',
      targetId: id,
      description: `Admin ${newStatus === 'SUSPENDED' ? 'suspended' : 'resumed'} seller ${seller.shopName}`,
      beforeData: { status: seller.user.status },
      afterData: { status: newStatus },
    });

    return { id, status: newStatus };
  }

  // Ticket Management
  async getTickets(query: AdminQueryFiltersDto) {
    const { search, status, page = 1 } = query;
    const pageSize = (query as any).pageSize || 10;
    const skip = (page - 1) * pageSize;

    const where: any = {};
    if (search) {
      where.OR = [
        { subject: { contains: search } },
        { ticketNo: { contains: search } },
      ];
    }
    if (status) {
      where.status = status;
    }

    const [tickets, total] = await Promise.all([
      this.prisma.ticket.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
        include: {
          user: { select: { id: true, username: true, email: true } },
          _count: { select: { messages: true } },
        },
      }),
      this.prisma.ticket.count({ where }),
    ]);

    const items = tickets.map((tk) => ({
      id: tk.id,
      subject: tk.subject,
      user: tk.user?.username || '-',
      status: tk.status,
      priority: tk.priority,
      messageCount: tk._count.messages,
      createdAt: tk.createdAt.toISOString(),
    }));

    return { items, total, page, pageSize };
  }

  // IP Blacklist Management
  async getBlacklistedIps(page = 1, limit = 10) {
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.prisma.blacklistedIp.findMany({
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.blacklistedIp.count(),
    ]);

    return { data, total, page, limit };
  }

  async addBlacklistedIp(
    ip: string,
    reason: string,
    expiresAt: Date,
    addedBy: string,
  ) {
    const entry = await this.prisma.blacklistedIp.create({
      data: { ip, reason, expiresAt, addedBy },
    });

    await this.auditService.log({
      operatorId: addedBy,
      operatorRole: OperatorRole.ADMIN,
      module: AuditModule.RISK,
      action: AuditAction.ADMIN_IP_BLACKLIST_ADD,
      targetType: 'blacklistedIp',
      targetId: entry.id,
      description: `Admin added IP ${ip} to blacklist: ${reason}`,
      afterData: { ip, reason, expiresAt: expiresAt.toISOString() },
    });

    return entry;
  }

  async removeBlacklistedIp(id: string, operatorId: string) {
    const existing = await this.prisma.blacklistedIp.findUnique({
      where: { id },
    });

    const deleted = await this.prisma.blacklistedIp.delete({
      where: { id },
    });

    await this.auditService.log({
      operatorId,
      operatorRole: OperatorRole.ADMIN,
      module: AuditModule.RISK,
      action: AuditAction.ADMIN_IP_BLACKLIST_REMOVE,
      targetType: 'blacklistedIp',
      targetId: id,
      description: `Admin removed IP ${existing?.ip} from blacklist`,
      beforeData: existing
        ? { ip: existing.ip, reason: existing.reason }
        : undefined,
    });

    return deleted;
  }

  async checkIpBlacklisted(
    ip: string,
  ): Promise<{ blacklisted: boolean; entry?: any }> {
    const entry = await this.prisma.blacklistedIp.findUnique({
      where: { ip },
    });

    if (!entry) {
      return { blacklisted: false };
    }

    // If expired, not considered blacklisted
    if (entry.expiresAt < new Date()) {
      return { blacklisted: false, entry };
    }

    return { blacklisted: true, entry };
  }

  // System Logs
  async getLogs(query: AdminQueryFiltersDto) {
    const { page = 1 } = query;
    const pageSize = (query as any).pageSize || 50;
    const skip = (page - 1) * pageSize;

    const [logs, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        skip,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.auditLog.count(),
    ]);

    const items = logs.map((l) => ({
      id: l.id,
      action: l.action,
      user: l.operatorId,
      ip: l.ipAddress || '-',
      details: l.description || `${l.module}: ${l.action}`,
      createdAt: l.createdAt.toISOString(),
    }));

    return { items, total, page, pageSize };
  }

  // Finance Management
  async getFinanceStats() {
    const [totalRevenue, totalCommission, totalWithdrawals, totalOrders] =
      await Promise.all([
        this.prisma.payment.aggregate({
          where: { status: 'SUCCESS' },
          _sum: { amount: true },
        }),
        this.prisma.orderItem.aggregate({
          _sum: { commissionAmount: true },
        }),
        this.prisma.withdrawal.aggregate({
          where: { status: 'COMPLETED' },
          _sum: { actualAmount: true },
        }),
        this.prisma.order.count({
          where: { paymentStatus: 'PAID' },
        }),
      ]);

    return {
      totalRevenue: Number(totalRevenue._sum.amount || 0),
      totalCommission: Number(totalCommission._sum.commissionAmount || 0),
      totalWithdrawals: Number(totalWithdrawals._sum.actualAmount || 0),
      totalOrders,
    };
  }

  async getFinanceTransactions(query: AdminQueryFiltersDto) {
    const { page = 1, pageSize = 20, type, startDate, endDate } = query as any;
    const limit = pageSize || 20;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (type) {
      where.type = type;
    }
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate);
      if (endDate) where.createdAt.lte = new Date(endDate + 'T23:59:59Z');
    }

    const [items, total] = await Promise.all([
      this.prisma.sellerTransaction.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          seller: { select: { id: true, username: true, email: true } },
        },
      }),
      this.prisma.sellerTransaction.count({ where }),
    ]);

    const mapped = items.map((t) => ({
      id: t.id,
      type: t.type,
      amount: Number(t.amount),
      balance: Number(t.balanceAfter),
      user: t.seller?.username || t.seller?.email || '-',
      orderNo: t.orderId || undefined,
      createdAt: t.createdAt.toISOString(),
    }));

    return { items: mapped, total, page, pageSize: limit };
  }

  // Refund Management
  async getRefunds(query: AdminQueryFiltersDto) {
    const { page = 1, limit = 10, status } = query;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (status && status !== 'all') {
      // Map frontend status to DB status
      const statusMap: Record<string, string[]> = {
        pending: ['PENDING', 'SELLER_AGREED', 'SELLER_REJECTED', 'DISPUTED'],
        approved: ['COMPLETED'],
        rejected: ['REJECTED', 'CANCELLED'],
      };
      const dbStatuses = statusMap[status];
      if (dbStatuses) {
        where.status = { in: dbStatuses };
      }
    }

    const [items, total] = await Promise.all([
      this.prisma.refundRequest.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          buyer: { select: { id: true, username: true, email: true } },
          order: { select: { id: true, orderNo: true, totalAmount: true } },
        },
      }),
      this.prisma.refundRequest.count({ where }),
    ]);

    const mapped = items.map((r) => ({
      id: r.id,
      orderId: r.orderId,
      orderNo: r.order?.orderNo || '-',
      amount: Number(r.refundAmount),
      reason: r.reason,
      description: r.description,
      status: this.mapRefundStatus(r.status),
      createdAt: r.createdAt.toISOString(),
      processedAt: r.processedAt?.toISOString(),
      adminNote: r.adminResponse,
      buyer: r.buyer
        ? { id: r.buyer.id, username: r.buyer.username, email: r.buyer.email }
        : undefined,
      order: r.order
        ? {
            id: r.order.id,
            orderNo: r.order.orderNo,
            totalAmount: Number(r.order.totalAmount),
            items: [],
          }
        : undefined,
    }));

    return { items: mapped, total, page, pageSize: limit };
  }

  private mapRefundStatus(status: string): string {
    const map: Record<string, string> = {
      PENDING: 'pending',
      SELLER_AGREED: 'pending',
      SELLER_REJECTED: 'pending',
      DISPUTED: 'pending',
      PROCESSING: 'pending',
      COMPLETED: 'approved',
      REJECTED: 'rejected',
      CANCELLED: 'rejected',
    };
    return map[status] || 'pending';
  }

  async reviewRefund(
    id: string,
    approved: boolean,
    adminNote: string | undefined,
    operatorId: string,
  ) {
    const refund = await this.prisma.refundRequest.findUnique({
      where: { id },
      include: { order: true },
    });
    if (!refund) throw new Error('Refund request not found');

    const newStatus = approved ? 'COMPLETED' : 'REJECTED';

    const updated = await this.prisma.$transaction(async (tx) => {
      const updatedRefund = await tx.refundRequest.update({
        where: { id },
        data: {
          status: newStatus as any,
          adminResponse: adminNote,
          processedBy: operatorId,
          processedAt: new Date(),
          refundCompletedAt: approved ? new Date() : undefined,
        },
      });

      // If approved, update order status
      if (approved && refund.orderId) {
        await tx.order.update({
          where: { id: refund.orderId },
          data: { orderStatus: 'REFUNDED', paymentStatus: 'REFUNDED' },
        });
      }

      return updatedRefund;
    });

    await this.auditService.log({
      operatorId,
      operatorRole: OperatorRole.ADMIN,
      module: AuditModule.ORDER,
      action: approved
        ? AuditAction.ADMIN_ORDER_REFUND
        : AuditAction.ADMIN_PRODUCT_REJECT,
      targetType: 'refundRequest',
      targetId: id,
      description: `Admin ${approved ? 'approved' : 'rejected'} refund request`,
      afterData: { status: newStatus, adminNote },
    });

    return { ...updated, status: this.mapRefundStatus(newStatus) };
  }

  // Force complete order
  async forceCompleteOrder(id: string, operatorId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id },
      select: { id: true, orderNo: true, orderStatus: true },
    });

    const updated = await this.prisma.order.update({
      where: { id },
      data: { orderStatus: 'COMPLETED', completedAt: new Date() },
    });

    await this.auditService.log({
      operatorId,
      operatorRole: OperatorRole.ADMIN,
      module: AuditModule.ORDER,
      action: AuditAction.ADMIN_ORDER_REFUND,
      targetType: 'order',
      targetId: id,
      description: `Admin force completed order ${order?.orderNo}`,
      beforeData: { orderStatus: order?.orderStatus },
      afterData: { orderStatus: 'COMPLETED' },
    });

    return updated;
  }

  // System Settings
  async getSettings() {
    const configs = await this.prisma.systemConfig.findMany();
    const result: Record<string, any> = {
      siteName: 'TopiVra',
      siteLogo: '',
      siteAnnouncement: '',
      commissionRate: 0.1,
      minWithdraw: 10,
      paymentTimeout: 30,
      autoConfirmHours: 72,
    };
    for (const config of configs) {
      result[config.key] =
        typeof config.value === 'object' && config.value !== null
          ? ((config.value as any).v ?? config.value)
          : config.value;
    }
    return result;
  }

  async updateSettings(data: Record<string, any>, operatorId: string) {
    const entries = Object.entries(data);
    for (const [key, value] of entries) {
      await this.prisma.systemConfig.upsert({
        where: { key },
        create: { key, value: { v: value } },
        update: { value: { v: value } },
      });
    }

    await this.auditService.log({
      operatorId,
      operatorRole: OperatorRole.ADMIN,
      module: AuditModule.SYSTEM,
      action: AuditAction.SYSTEM_CONFIG_UPDATE,
      description: `Admin updated system settings: ${Object.keys(data).join(', ')}`,
      afterData: data,
    });

    return this.getSettings();
  }

  // OAuth Config
  async getOAuthConfig() {
    const configs = await this.prisma.systemConfig.findMany({
      where: { key: { in: ['oauth_google', 'oauth_telegram'] } },
    });
    const result: any = {
      google: { enabled: false, clientId: '', clientSecret: '' },
      telegram: { enabled: false, botToken: '' },
    };
    for (const c of configs) {
      if (c.key === 'oauth_google')
        result.google = (c.value as any).v ?? c.value;
      if (c.key === 'oauth_telegram')
        result.telegram = (c.value as any).v ?? c.value;
    }
    return result;
  }

  async updateOAuthConfig(data: any, operatorId: string) {
    if (data.google !== undefined) {
      await this.prisma.systemConfig.upsert({
        where: { key: 'oauth_google' },
        create: { key: 'oauth_google', value: { v: data.google } },
        update: { value: { v: data.google } },
      });
    }
    if (data.telegram !== undefined) {
      await this.prisma.systemConfig.upsert({
        where: { key: 'oauth_telegram' },
        create: { key: 'oauth_telegram', value: { v: data.telegram } },
        update: { value: { v: data.telegram } },
      });
    }

    await this.auditService.log({
      operatorId,
      operatorRole: OperatorRole.ADMIN,
      module: AuditModule.SYSTEM,
      action: AuditAction.SYSTEM_CONFIG_UPDATE,
      description: 'Admin updated OAuth configuration',
    });

    return this.getOAuthConfig();
  }

  // Payment Config
  async getPaymentConfig() {
    const configs = await this.prisma.systemConfig.findMany({
      where: {
        key: { in: ['payment_paypal', 'payment_stripe', 'payment_usdt'] },
      },
    });
    const result: any = {
      paypal: { enabled: false },
      stripe: { enabled: false },
      usdt: { enabled: false },
    };
    for (const c of configs) {
      if (c.key === 'payment_paypal')
        result.paypal = (c.value as any).v ?? c.value;
      if (c.key === 'payment_stripe')
        result.stripe = (c.value as any).v ?? c.value;
      if (c.key === 'payment_usdt') result.usdt = (c.value as any).v ?? c.value;
    }
    return result;
  }

  async updatePaymentConfig(data: any, operatorId: string) {
    const keyMap: Record<string, string> = {
      paypal: 'payment_paypal',
      stripe: 'payment_stripe',
      usdt: 'payment_usdt',
    };
    for (const [field, key] of Object.entries(keyMap)) {
      if (data[field] !== undefined) {
        await this.prisma.systemConfig.upsert({
          where: { key },
          create: { key, value: { v: data[field] } },
          update: { value: { v: data[field] } },
        });
      }
    }
    await this.auditService.log({
      operatorId,
      operatorRole: OperatorRole.ADMIN,
      module: AuditModule.SYSTEM,
      action: AuditAction.SYSTEM_CONFIG_UPDATE,
      description: 'Admin updated payment configuration',
    });
    return this.getPaymentConfig();
  }

  // SEO Config
  async getSeoConfig() {
    const c = await this.prisma.systemConfig.findUnique({
      where: { key: 'seo_config' },
    });
    return (
      (c?.value as any)?.v ?? {
        title: 'TopiVra',
        description: '',
        keywords: '',
        googleAnalytics: '',
        baiduAnalytics: '',
      }
    );
  }

  async updateSeoConfig(data: any, operatorId: string) {
    await this.prisma.systemConfig.upsert({
      where: { key: 'seo_config' },
      create: { key: 'seo_config', value: { v: data } },
      update: { value: { v: data } },
    });
    await this.auditService.log({
      operatorId,
      operatorRole: OperatorRole.ADMIN,
      module: AuditModule.SYSTEM,
      action: AuditAction.SYSTEM_CONFIG_UPDATE,
      description: 'Admin updated SEO configuration',
    });
    return this.getSeoConfig();
  }

  // Telegram Config
  async getTelegramConfig() {
    const c = await this.prisma.systemConfig.findUnique({
      where: { key: 'telegram_config' },
    });
    return (
      (c?.value as any)?.v ?? {
        botToken: '',
        botUsername: '',
        channelId: '',
        channelUsername: '',
      }
    );
  }

  async updateTelegramConfig(data: any, operatorId: string) {
    await this.prisma.systemConfig.upsert({
      where: { key: 'telegram_config' },
      create: { key: 'telegram_config', value: { v: data } },
      update: { value: { v: data } },
    });
    await this.auditService.log({
      operatorId,
      operatorRole: OperatorRole.ADMIN,
      module: AuditModule.SYSTEM,
      action: AuditAction.SYSTEM_CONFIG_UPDATE,
      description: 'Admin updated Telegram configuration',
    });
    return this.getTelegramConfig();
  }

  // Ticket Messages
  async getTicketMessages(ticketId: string) {
    const messages = await this.prisma.ticketMessage.findMany({
      where: { ticketId },
      orderBy: { createdAt: 'asc' },
      include: {
        sender: {
          select: {
            id: true,
            username: true,
            roles: { select: { role: true } },
          },
        },
      },
    });
    return messages.map((m) => ({
      id: m.id,
      content: m.content,
      sender: m.sender?.roles?.some((r) => r.role === 'ADMIN')
        ? 'ADMIN'
        : 'USER',
      senderName: m.sender?.username,
      isInternal: m.isInternal,
      createdAt: m.createdAt.toISOString(),
    }));
  }

  async replyTicket(
    ticketId: string,
    content: string,
    isInternal: boolean,
    operatorId: string,
  ) {
    const msg = await this.prisma.ticketMessage.create({
      data: {
        ticketId,
        senderId: operatorId,
        content,
        isInternal: isInternal || false,
      },
    });

    // 更新工单状态为处理中
    if (!isInternal) {
      await this.prisma.ticket.update({
        where: { id: ticketId },
        data: { status: 'IN_PROGRESS', updatedAt: new Date() },
      });
    }

    return msg;
  }

  async updateTicketStatus(
    ticketId: string,
    status: string,
    operatorId: string,
  ) {
    const updated = await this.prisma.ticket.update({
      where: { id: ticketId },
      data: {
        status: status as any,
        assignedTo: operatorId,
        resolvedAt: status === 'RESOLVED' ? new Date() : undefined,
        closedAt: status === 'CLOSED' ? new Date() : undefined,
      },
    });
    return updated;
  }

  // ==================== 广告位管理 ====================

  async getAdSlots() {
    const c = await this.prisma.systemConfig.findUnique({
      where: { key: 'ad_slots' },
    });
    const slots = (c?.value as any)?.v ?? [];
    return Array.isArray(slots) ? slots : [];
  }

  async updateAdSlots(slots: any[], operatorId: string) {
    // 最多5个广告位
    const limited = slots.slice(0, 5);
    await this.prisma.systemConfig.upsert({
      where: { key: 'ad_slots' },
      create: {
        key: 'ad_slots',
        value: { v: limited },
        description: '首页悬浮窗广告位配置',
      },
      update: { value: { v: limited } },
    });
    await this.auditService.log({
      operatorId,
      operatorRole: OperatorRole.ADMIN,
      module: AuditModule.SYSTEM,
      action: AuditAction.SYSTEM_CONFIG_UPDATE,
      description: `Admin updated ad slots (${limited.length} items)`,
      afterData: { slots: limited },
    });
    return limited;
  }

  // Delete user
  async deleteUser(id: string, operatorId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: { id: true, username: true, email: true },
    });

    await this.prisma.user.update({
      where: { id },
      data: { status: 'DELETED' as any },
    });

    await this.auditService.log({
      operatorId,
      operatorRole: OperatorRole.ADMIN,
      module: AuditModule.USER,
      action: AuditAction.ADMIN_USER_BAN,
      targetType: 'user',
      targetId: id,
      description: `Admin deleted user ${user?.username} (${user?.email})`,
    });

    return { success: true };
  }
}
