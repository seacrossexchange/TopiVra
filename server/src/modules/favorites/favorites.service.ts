import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class FavoritesService {
  private readonly logger = new Logger(FavoritesService.name);

  constructor(private prisma: PrismaService) {}

  // 切换收藏状态
  async toggle(userId: string, productId: string) {
    const existing = await this.prisma.favorite.findUnique({
      where: {
        userId_productId: { userId, productId },
      },
    });

    if (existing) {
      await this.prisma.favorite.delete({
        where: { id: existing.id },
      });
      this.logger.log(`取消收藏: 用户 ${userId}, 商品 ${productId}`);
      return { isFavorited: false, message: '已取消收藏' };
    }

    await this.prisma.favorite.create({
      data: { userId, productId },
    });
    this.logger.log(`添加收藏: 用户 ${userId}, 商品 ${productId}`);
    return { isFavorited: true, message: '已添加收藏' };
  }

  // 获取用户收藏列表
  async findByUser(userId: string, page: number = 1, limit: number = 10) {
    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      this.prisma.favorite.findMany({
        where: { userId },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          product: {
            include: {
              category: {
                select: { id: true, name: true },
              },
              seller: {
                select: {
                  id: true,
                  sellerProfile: {
                    select: { id: true, shopName: true },
                  },
                },
              },
            },
          },
        },
      }),
      this.prisma.favorite.count({ where: { userId } }),
    ]);

    // 过滤掉已下架或删除的商品
    const validItems = items
      .filter((item) => item.product && item.product.status === 'ON_SALE')
      .map((item) => ({
        ...item,
        product: {
          ...item.product,
          shopName: item.product.seller?.sellerProfile?.shopName || null,
        },
      }));

    return {
      items: validItems,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  // 检查是否已收藏
  async checkFavorite(userId: string, productId: string): Promise<boolean> {
    const favorite = await this.prisma.favorite.findUnique({
      where: {
        userId_productId: { userId, productId },
      },
    });
    return !!favorite;
  }

  // 批量检查收藏状态
  async checkFavorites(
    userId: string,
    productIds: string[],
  ): Promise<Record<string, boolean>> {
    const favorites = await this.prisma.favorite.findMany({
      where: {
        userId,
        productId: { in: productIds },
      },
      select: { productId: true },
    });

    const favoriteSet = new Set(favorites.map((f) => f.productId));
    const result: Record<string, boolean> = {};
    for (const productId of productIds) {
      result[productId] = favoriteSet.has(productId);
    }
    return result;
  }

  // 获取用户收藏数量
  async getCount(userId: string): Promise<number> {
    return this.prisma.favorite.count({ where: { userId } });
  }
}
