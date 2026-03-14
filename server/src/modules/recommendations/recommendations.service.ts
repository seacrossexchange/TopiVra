import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class RecommendationsService {
  constructor(private prisma: PrismaService) {}

  // 基于协同过滤的商品推荐
  async getRecommendations(userId: string, limit = 10) {
    // 1. 获取用户购买历史
    const userOrders = await this.prisma.order.findMany({
      where: { buyerId: userId, orderStatus: 'COMPLETED' },
      include: { orderItems: { include: { product: true } } },
      take: 50,
    });

    const purchasedProductIds = userOrders.flatMap(o => o.orderItems.map((i: any) => i.productId));
    const purchasedCategories = userOrders.flatMap(o =>
      o.orderItems.map((i: any) => i.product.categoryId).filter(Boolean)
    );

    // 2. 基于分类推荐
    const categoryRecommendations = await this.prisma.product.findMany({
      where: {
        status: 'ON_SALE',
        id: { notIn: purchasedProductIds },
        categoryId: { in: purchasedCategories },
      },
      orderBy: { soldCount: 'desc' },
      take: limit,
    });

    if (categoryRecommendations.length >= limit) {
      return categoryRecommendations;
    }

    // 3. 热门商品补充
    const hotProducts = await this.prisma.product.findMany({
      where: {
        status: 'ON_SALE',
        id: { notIn: [...purchasedProductIds, ...categoryRecommendations.map(p => p.id)] },
      },
      orderBy: { soldCount: 'desc' },
      take: limit - categoryRecommendations.length,
    });

    return [...categoryRecommendations, ...hotProducts];
  }

  // 相关商品推荐
  async getRelatedProducts(productId: string, limit = 6) {
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
      select: { categoryId: true, platform: true },
    });

    if (!product) return [];

    return this.prisma.product.findMany({
      where: {
        status: 'ON_SALE',
        id: { not: productId },
        OR: [
          { categoryId: product.categoryId },
          { platform: product.platform },
        ],
      },
      orderBy: { soldCount: 'desc' },
      take: limit,
    });
  }

  // 热门商品
  async getHotProducts(limit = 10) {
    return this.prisma.product.findMany({
      where: { status: 'ON_SALE' },
      orderBy: { soldCount: 'desc' },
      take: limit,
    });
  }

  // 新品推荐
  async getNewProducts(limit = 10) {
    return this.prisma.product.findMany({
      where: { status: 'ON_SALE' },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }
}
