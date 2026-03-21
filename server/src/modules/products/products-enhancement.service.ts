import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class ProductsEnhancementService {
  constructor(private prisma: PrismaService) {}

  // 获取热门特惠商品
  async getHotDeals(limit = 8) {
    const now = new Date();
    
    return this.prisma.product.findMany({
      where: {
        status: 'APPROVED',
        promotionEnd: { gte: now },
        promotionStart: { lte: now },
        stock: { gt: 0 },
      },
      take: limit,
      orderBy: [
        { soldCount: 'desc' },
        { viewCount: 'desc' },
      ],
      include: {
        category: { select: { id: true, name: true } },
      },
    });
  }

  // 获取相关商品
  async getRelatedProducts(productId: string, limit = 8) {
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
      select: { categoryId: true, platform: true },
    });

    if (!product) {
      return [];
    }

    return this.prisma.product.findMany({
      where: {
        status: 'APPROVED',
        id: { not: productId },
        OR: [
          { categoryId: product.categoryId },
          { platform: product.platform },
        ],
        stock: { gt: 0 },
      },
      take: limit,
      orderBy: { soldCount: 'desc' },
      include: {
        category: { select: { id: true, name: true } },
      },
    });
  }
}



