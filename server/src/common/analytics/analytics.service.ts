import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class AnalyticsService {
  private readonly logger = new Logger(AnalyticsService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * 获取销售趋势数据（日/周/月）
   */
  async getSalesTrend(period: 'day' | 'week' | 'month' = 'day', days: number = 30) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    let groupFormat: string;
    switch (period) {
      case 'day':
        groupFormat = '%Y-%m-%d';
        break;
      case 'week':
        groupFormat = '%Y-%u';
        break;
      case 'month':
        groupFormat = '%Y-%m';
        break;
    }

    const result = await this.prisma.$queryRawUnsafe<any[]>(`
      SELECT 
        DATE_FORMAT(paid_at, '${groupFormat}') as date,
        COUNT(*) as orderCount,
        SUM(pay_amount) as totalAmount,
        COUNT(DISTINCT buyer_id) as uniqueBuyers
      FROM orders
      WHERE payment_status = 'PAID'
        AND paid_at >= '${startDate.toISOString()}'
      GROUP BY DATE_FORMAT(paid_at, '${groupFormat}')
      ORDER BY date ASC
    `);

    return result.map(row => ({
      date: row.date,
      orderCount: Number(row.orderCount),
      totalAmount: Number(row.totalAmount),
      uniqueBuyers: Number(row.uniqueBuyers),
    }));
  }

  /**
   * 获取商品销售排行榜
   */
  async getTopProducts(limit: number = 10) {
    const products = await this.prisma.product.findMany({
      where: {
        status: 'APPROVED',
      },
      orderBy: {
        soldCount: 'desc',
      },
      take: limit,
      include: {
        category: { select: { name: true } },
        seller: { select: { username: true } },
      },
    });

    return products.map(p => ({
      id: p.id,
      title: p.title,
      platform: p.platform,
      category: p.category?.name,
      seller: p.seller?.username,
      soldCount: p.soldCount || 0,
      revenue: Number(p.price) * (p.soldCount || 0),
      price: Number(p.price),
    }));
  }

  /**
   * 获取卖家销售排行榜
   */
  async getTopSellers(limit: number = 10) {
    const result = await this.prisma.$queryRawUnsafe<any[]>(`
      SELECT 
        u.id,
        u.username,
        sp.shop_name,
        sp.rating,
        COUNT(DISTINCT o.id) as orderCount,
        SUM(o.pay_amount) as totalRevenue,
        COUNT(DISTINCT p.id) as productCount
      FROM users u
      INNER JOIN seller_profiles sp ON u.id = sp.user_id
      LEFT JOIN products p ON u.id = p.seller_id
      LEFT JOIN order_items oi ON p.id = oi.product_id
      LEFT JOIN orders o ON oi.order_id = o.id AND o.payment_status = 'PAID'
      WHERE u.is_seller = true
      GROUP BY u.id, u.username, sp.shop_name, sp.rating
      ORDER BY totalRevenue DESC
      LIMIT ${limit}
    `);

    return result.map(row => ({
      id: row.id,
      username: row.username,
      shopName: row.shop_name,
      rating: Number(row.rating || 0),
      orderCount: Number(row.orderCount || 0),
      totalRevenue: Number(row.totalRevenue || 0),
      productCount: Number(row.productCount || 0),
    }));
  }

  /**
   * 获取用户增长曲线
   */
  async getUserGrowth(days: number = 30) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const result = await this.prisma.$queryRawUnsafe<any[]>(`
      SELECT 
        DATE_FORMAT(created_at, '%Y-%m-%d') as date,
        COUNT(*) as newUsers,
        SUM(COUNT(*)) OVER (ORDER BY DATE_FORMAT(created_at, '%Y-%m-%d')) as totalUsers
      FROM users
      WHERE created_at >= '${startDate.toISOString()}'
      GROUP BY DATE_FORMAT(created_at, '%Y-%m-%d')
      ORDER BY date ASC
    `);

    return result.map(row => ({
      date: row.date,
      newUsers: Number(row.newUsers),
      totalUsers: Number(row.totalUsers),
    }));
  }

  /**
   * 获取品类销售分布
   */
  async getCategorySalesDistribution() {
    const result = await this.prisma.$queryRawUnsafe<any[]>(`
      SELECT 
        c.name as category,
        COUNT(DISTINCT p.id) as productCount,
        SUM(p.sold_count) as totalSold,
        SUM(p.price * p.sold_count) as revenue
      FROM categories c
      LEFT JOIN products p ON c.id = p.category_id AND p.status = 'APPROVED'
      WHERE c.is_active = true
      GROUP BY c.id, c.name
      ORDER BY revenue DESC
    `);

    return result.map(row => ({
      category: row.category,
      productCount: Number(row.productCount || 0),
      totalSold: Number(row.totalSold || 0),
      revenue: Number(row.revenue || 0),
    }));
  }

  /**
   * 获取平台销售分布
   */
  async getPlatformSalesDistribution() {
    const result = await this.prisma.$queryRawUnsafe<any[]>(`
      SELECT 
        platform,
        COUNT(*) as productCount,
        SUM(sold_count) as totalSold,
        SUM(price * sold_count) as revenue
      FROM products
      WHERE status = 'APPROVED'
      GROUP BY platform
      ORDER BY revenue DESC
    `);

    return result.map(row => ({
      platform: row.platform,
      productCount: Number(row.productCount),
      totalSold: Number(row.totalSold || 0),
      revenue: Number(row.revenue || 0),
    }));
  }

  /**
   * 获取用户地域分布
   */
  async getUserGeographicDistribution() {
    const result = await this.prisma.$queryRawUnsafe<any[]>(`
      SELECT 
        country,
        COUNT(*) as userCount
      FROM users
      WHERE country IS NOT NULL
      GROUP BY country
      ORDER BY userCount DESC
      LIMIT 20
    `);

    return result.map(row => ({
      country: row.country,
      userCount: Number(row.userCount),
    }));
  }

  /**
   * 获取GMV增长曲线
   */
  async getGMVGrowth(days: number = 30) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const result = await this.prisma.$queryRawUnsafe<any[]>(`
      SELECT 
        DATE_FORMAT(paid_at, '%Y-%m-%d') as date,
        SUM(pay_amount) as dailyGMV,
        SUM(SUM(pay_amount)) OVER (ORDER BY DATE_FORMAT(paid_at, '%Y-%m-%d')) as cumulativeGMV
      FROM orders
      WHERE payment_status = 'PAID'
        AND paid_at >= '${startDate.toISOString()}'
      GROUP BY DATE_FORMAT(paid_at, '%Y-%m-%d')
      ORDER BY date ASC
    `);

    return result.map(row => ({
      date: row.date,
      dailyGMV: Number(row.dailyGMV),
      cumulativeGMV: Number(row.cumulativeGMV),
    }));
  }

  /**
   * 获取新增/活跃用户统计
   */
  async getUserActivityStats(days: number = 30) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const result = await this.prisma.$queryRawUnsafe<any[]>(`
      SELECT 
        DATE_FORMAT(date, '%Y-%m-%d') as date,
        COALESCE(new_users, 0) as newUsers,
        COALESCE(active_users, 0) as activeUsers
      FROM (
        SELECT DISTINCT DATE(created_at) as date FROM users WHERE created_at >= '${startDate.toISOString()}'
        UNION
        SELECT DISTINCT DATE(last_login_at) as date FROM users WHERE last_login_at >= '${startDate.toISOString()}'
      ) dates
      LEFT JOIN (
        SELECT DATE(created_at) as date, COUNT(*) as new_users
        FROM users
        WHERE created_at >= '${startDate.toISOString()}'
        GROUP BY DATE(created_at)
      ) new_data ON dates.date = new_data.date
      LEFT JOIN (
        SELECT DATE(last_login_at) as date, COUNT(DISTINCT id) as active_users
        FROM users
        WHERE last_login_at >= '${startDate.toISOString()}'
        GROUP BY DATE(last_login_at)
      ) active_data ON dates.date = active_data.date
      ORDER BY date ASC
    `);

    return result.map(row => ({
      date: row.date,
      newUsers: Number(row.newUsers),
      activeUsers: Number(row.activeUsers),
    }));
  }

  /**
   * 获取综合仪表板数据
   */
  async getDashboardSummary() {
    const [
      totalUsers,
      totalOrders,
      totalRevenue,
      totalProducts,
      pendingOrders,
      pendingProducts,
      todayOrders,
      todayRevenue,
    ] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.order.count({ where: { paymentStatus: 'PAID' } }),
      this.prisma.order.aggregate({
        where: { paymentStatus: 'PAID' },
        _sum: { payAmount: true },
      }),
      this.prisma.product.count({ where: { status: 'APPROVED' } }),
      this.prisma.order.count({ where: { orderStatus: 'PENDING_PAYMENT' } }),
      this.prisma.product.count({ where: { status: 'PENDING' } }),
      this.prisma.order.count({
        where: {
          paymentStatus: 'PAID',
          paidAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) },
        },
      }),
      this.prisma.order.aggregate({
        where: {
          paymentStatus: 'PAID',
          paidAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) },
        },
        _sum: { payAmount: true },
      }),
    ]);

    return {
      totalUsers,
      totalOrders,
      totalRevenue: Number(totalRevenue._sum.payAmount || 0),
      totalProducts,
      pendingOrders,
      pendingProducts,
      todayOrders,
      todayRevenue: Number(todayRevenue._sum.payAmount || 0),
    };
  }
}

