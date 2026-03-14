import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

export enum AuditAction {
  // User actions
  USER_LOGIN = 'USER_LOGIN',
  USER_LOGOUT = 'USER_LOGOUT',
  USER_REGISTER = 'USER_REGISTER',
  USER_PASSWORD_CHANGE = 'USER_PASSWORD_CHANGE',
  USER_PROFILE_UPDATE = 'USER_PROFILE_UPDATE',
  USER_2FA_ENABLE = 'USER_2FA_ENABLE',
  USER_2FA_DISABLE = 'USER_2FA_DISABLE',

  // Admin actions
  ADMIN_USER_BAN = 'ADMIN_USER_BAN',
  ADMIN_USER_UNBAN = 'ADMIN_USER_UNBAN',
  ADMIN_SELLER_APPROVE = 'ADMIN_SELLER_APPROVE',
  ADMIN_SELLER_REJECT = 'ADMIN_SELLER_REJECT',
  ADMIN_SELLER_LEVEL_CHANGE = 'ADMIN_SELLER_LEVEL_CHANGE',
  ADMIN_PRODUCT_APPROVE = 'ADMIN_PRODUCT_APPROVE',
  ADMIN_PRODUCT_REJECT = 'ADMIN_PRODUCT_REJECT',
  ADMIN_ORDER_REFUND = 'ADMIN_ORDER_REFUND',
  ADMIN_SETTINGS_UPDATE = 'ADMIN_SETTINGS_UPDATE',
  ADMIN_IP_BLACKLIST_ADD = 'ADMIN_IP_BLACKLIST_ADD',
  ADMIN_IP_BLACKLIST_REMOVE = 'ADMIN_IP_BLACKLIST_REMOVE',

  // System actions
  SYSTEM_CONFIG_UPDATE = 'SYSTEM_CONFIG_UPDATE',

  // Seller actions
  SELLER_PRODUCT_CREATE = 'SELLER_PRODUCT_CREATE',
  SELLER_PRODUCT_UPDATE = 'SELLER_PRODUCT_UPDATE',
  SELLER_PRODUCT_DELETE = 'SELLER_PRODUCT_DELETE',
  SELLER_WITHDRAWAL_REQUEST = 'SELLER_WITHDRAWAL_REQUEST',

  // Order actions
  ORDER_CREATE = 'ORDER_CREATE',
  ORDER_STATUS_CHANGE = 'ORDER_STATUS_CHANGE',
  ORDER_DELIVER = 'ORDER_DELIVER',
  ORDER_COMPLETE = 'ORDER_COMPLETE',
  ORDER_CANCEL = 'ORDER_CANCEL',
  PAYMENT_SUCCESS = 'PAYMENT_SUCCESS',
  PAYMENT_FAILED = 'PAYMENT_FAILED',

  // Ticket actions
  TICKET_CREATE = 'TICKET_CREATE',
  TICKET_REPLY = 'TICKET_REPLY',
  TICKET_CLOSE = 'TICKET_CLOSE',
}

export enum AuditModule {
  AUTH = 'auth',
  USER = 'user',
  SELLER = 'seller',
  PRODUCT = 'product',
  ORDER = 'order',
  PAYMENT = 'payment',
  TICKET = 'ticket',
  SYSTEM = 'system',
  RISK = 'risk',
}

export enum OperatorRole {
  USER = 'user',
  SELLER = 'seller',
  ADMIN = 'admin',
  SYSTEM = 'system',
}

export interface AuditLogData {
  operatorId: string;
  operatorRole: OperatorRole;
  module: AuditModule | string;
  action: AuditAction | string;
  targetType?: string;
  targetId?: string;
  description?: string;
  beforeData?: Record<string, any>;
  afterData?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
}

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  async log(data: AuditLogData): Promise<void> {
    try {
      await this.prisma.auditLog.create({
        data: {
          operatorId: data.operatorId,
          operatorRole: data.operatorRole,
          module: data.module,
          action: data.action,
          targetType: data.targetType,
          targetId: data.targetId,
          description: data.description,
          beforeData: data.beforeData,
          afterData: data.afterData,
          ipAddress: data.ipAddress,
          userAgent: data.userAgent,
        },
      });
    } catch {
      // Don't throw error on audit log failure - silently handle
      // Audit log failure should not break business logic
    }
  }

  async logBatch(logs: AuditLogData[]): Promise<void> {
    try {
      await this.prisma.auditLog.createMany({
        data: logs.map((log) => ({
          operatorId: log.operatorId,
          operatorRole: log.operatorRole,
          module: log.module,
          action: log.action,
          targetType: log.targetType,
          targetId: log.targetId,
          description: log.description,
          beforeData: log.beforeData,
          afterData: log.afterData,
          ipAddress: log.ipAddress,
          userAgent: log.userAgent,
        })),
      });
    } catch {
      // Don't throw error on audit log failure - silently handle
      // Audit log failure should not break business logic
    }
  }

  async getLogs(options: {
    operatorId?: string;
    module?: string;
    action?: string;
    targetType?: string;
    targetId?: string;
    startDate?: Date;
    endDate?: Date;
    page?: number;
    limit?: number;
  }) {
    const {
      operatorId,
      module,
      action,
      targetType,
      targetId,
      startDate,
      endDate,
      page = 1,
      limit = 50,
    } = options;

    const where: any = {};

    if (operatorId) where.operatorId = operatorId;
    if (module) where.module = module;
    if (action) where.action = action;
    if (targetType) where.targetType = targetType;
    if (targetId) where.targetId = targetId;
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = startDate;
      if (endDate) where.createdAt.lte = endDate;
    }

    const [logs, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    return { data: logs, total, page, limit };
  }

  async getOperatorActivitySummary(operatorId: string): Promise<{
    totalActions: number;
    recentActions: any[];
    actionBreakdown: Record<string, number>;
  }> {
    const [totalActions, recentActions, actionCounts] = await Promise.all([
      this.prisma.auditLog.count({ where: { operatorId } }),
      this.prisma.auditLog.findMany({
        where: { operatorId },
        take: 10,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.auditLog.groupBy({
        by: ['action'],
        where: { operatorId },
        _count: { action: true },
      }),
    ]);

    const actionBreakdown = actionCounts.reduce(
      (acc, item) => {
        acc[item.action] = item._count.action;
        return acc;
      },
      {} as Record<string, number>,
    );

    return {
      totalActions,
      recentActions,
      actionBreakdown,
    };
  }
}
