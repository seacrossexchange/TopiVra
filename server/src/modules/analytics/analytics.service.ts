import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class AnalyticsService {
  constructor(private prisma: PrismaService) {}

  // 平台总览数据
  async getPlatformOverview() {
    const [totalUsers, totalOrders, totalRevenue, totalProducts] =
      await Promise.all([
        this.prisma.user.count(),
        this.prisma.order.count({ where: { orderStatus: 'COMPLETED' } }),
        this.prisma.order.aggregate({
          where: { orderStatus: 'COMPLETED' },
          _sum: { totalAmount: true },
        }),
        this.prisma.product.count({ where: { status: 'ON_SALE' } }),
      ]);

    return {
      totalUsers,
      totalOrders,
      totalRevenue: totalRevenue._sum.totalAmount || 0,
      totalProducts,
    };
  }

  // 销售趋势（最近30天）
  async getSalesTrend(days = 30) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const orders = await this.prisma.order.findMany({
      where: {
        orderStatus: 'COMPLETED',
        createdAt: { gte: startDate },
      },
      select: { createdAt: true, totalAmount: true },
    });

    const trend: Record<
      string,
      { date: string; revenue: number; count: number }
    > = {};
    orders.forEach((order) => {
      const date = order.createdAt.toISOString().split('T')[0];
      if (!trend[date]) {
        trend[date] = { date, revenue: 0, count: 0 };
      }
      trend[date].revenue += Number(order.totalAmount);
      trend[date].count += 1;
    });

    return Object.values(trend).sort((a, b) => a.date.localeCompare(b.date));
  }

  // 热门商品排行
  async getTopProducts(limit = 10) {
    return this.prisma.product.findMany({
      where: { status: 'ON_SALE' },
      orderBy: { soldCount: 'desc' },
      take: limit,
      select: {
        id: true,
        title: true,
        soldCount: true,
        price: true,
        platform: true,
      },
    });
  }

  // 热门卖家排行
  async getTopSellers(limit = 10) {
    const sellers = await this.prisma.user.findMany({
      where: { isSeller: true },
      select: {
        id: true,
        username: true,
        totalSpent: true,
        products: {
          select: { soldCount: true },
        },
      },
    });

    return sellers
      .map((seller) => ({
        id: seller.id,
        username: seller.username,
        totalSales: seller.products.reduce(
          (sum: number, p: any) => sum + (p.soldCount || 0),
          0,
        ),
      }))
      .sort((a, b) => b.totalSales - a.totalSales)
      .slice(0, limit);
  }

  // 用户增长趋势
  async getUserGrowth(days = 30) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const users = await this.prisma.user.findMany({
      where: { createdAt: { gte: startDate } },
      select: { createdAt: true },
    });

    const growth: Record<string, number> = {};
    users.forEach((user) => {
      const date = user.createdAt.toISOString().split('T')[0];
      growth[date] = (growth[date] || 0) + 1;
    });

    return Object.entries(growth)
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }

  // 分类销售分布
  async getCategorySales() {
    const categories = await this.prisma.category.findMany({
      include: {
        products: {
          where: { status: 'ON_SALE' },
          select: { soldCount: true },
        },
      },
    });

    return categories.map((cat) => ({
      id: cat.id,
      name: cat.name,
      totalSales: cat.products.reduce(
        (sum: number, p: any) => sum + (p.soldCount || 0),
        0,
      ),
    }));
  }
}
