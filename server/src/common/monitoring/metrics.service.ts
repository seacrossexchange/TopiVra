import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

export interface BusinessMetrics {
  totalOrders: number;
  todayOrders: number;
  pendingOrders: number;
  completedOrders: number;
  totalRevenue: number;
  todayRevenue: number;
  monthlyRevenue: number;
  totalUsers: number;
  activeUsers: number;
  newUsersToday: number;
  totalProducts: number;
  activeProducts: number;
  soldOutProducts: number;
  openTickets: number;
  pendingTickets: number;
  timestamp: Date;
}

@Injectable()
export class MetricsService {
  private readonly logger = new Logger(MetricsService.name);

  constructor(private prisma: PrismaService) {}

  async getBusinessMetrics(): Promise<BusinessMetrics> {
    const now = new Date();
    const todayStart = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
    );
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    try {
      const [
        totalOrders,
        todayOrders,
        pendingOrders,
        completedOrders,
        totalRevenue,
        todayRevenue,
        monthlyRevenue,
        totalUsers,
        newUsersToday,
        totalProducts,
        activeProducts,
        soldOutProducts,
        openTickets,
        pendingTickets,
      ] = await Promise.all([
        this.prisma.order.count(),
        this.prisma.order.count({ where: { createdAt: { gte: todayStart } } }),
        this.prisma.order.count({ where: { orderStatus: 'PENDING_PAYMENT' } }),
        this.prisma.order.count({ where: { orderStatus: 'COMPLETED' } }),
        this.prisma.order.aggregate({
          where: { paymentStatus: 'PAID' },
          _sum: { payAmount: true },
        }),
        this.prisma.order.aggregate({
          where: { paymentStatus: 'PAID', paidAt: { gte: todayStart } },
          _sum: { payAmount: true },
        }),
        this.prisma.order.aggregate({
          where: { paymentStatus: 'PAID', paidAt: { gte: monthStart } },
          _sum: { payAmount: true },
        }),
        this.prisma.user.count(),
        this.prisma.user.count({ where: { createdAt: { gte: todayStart } } }),
        this.prisma.product.count(),
        this.prisma.product.count({ where: { status: 'ON_SALE' } }),
        this.prisma.product.count({ where: { status: 'SOLD_OUT' } }),
        this.prisma.ticket.count({ where: { status: 'OPEN' } }),
        this.prisma.ticket.count({
          where: { status: { in: ['OPEN', 'IN_PROGRESS'] } },
        }),
      ]);

      return {
        totalOrders,
        todayOrders,
        pendingOrders,
        completedOrders,
        totalRevenue: Number(totalRevenue._sum.payAmount || 0),
        todayRevenue: Number(todayRevenue._sum.payAmount || 0),
        monthlyRevenue: Number(monthlyRevenue._sum.payAmount || 0),
        totalUsers,
        activeUsers: totalUsers,
        newUsersToday,
        totalProducts,
        activeProducts,
        soldOutProducts,
        openTickets,
        pendingTickets,
        timestamp: now,
      };
    } catch (error) {
      const stack = error instanceof Error ? error.stack : String(error);
      this.logger.error('获取业务指标失败', stack);
      throw error;
    }
  }

  async recordMetric(
    name: string,
    value: number,
    tags?: Record<string, string>,
  ): Promise<void> {
    try {
      this.logger.log(`Metric: ${name} = ${value}`, JSON.stringify(tags));
    } catch (error) {
      const stack = error instanceof Error ? error.stack : String(error);
      this.logger.error(`记录指标失败: ${name}`, stack);
    }
  }

  async getHealthStatus(): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy';
    checks: Record<string, boolean>;
    metrics: BusinessMetrics;
  }> {
    const checks: Record<string, boolean> = {};

    try {
      await this.prisma.$queryRaw`SELECT 1`;
      checks.database = true;
    } catch {
      checks.database = false;
    }

    const metrics = await this.getBusinessMetrics();
    const allChecksPass = Object.values(checks).every((v) => v);
    const status = allChecksPass ? 'healthy' : 'unhealthy';

    return { status, checks, metrics };
  }
}
