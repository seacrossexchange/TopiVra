import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { RedisService } from '../../common/redis/redis.service';
import { AuditService, OperatorRole } from '../../common/audit/audit.service';
import {
  CreateProductDto,
  UpdateProductDto,
  ProductQueryDto,
  AuditProductDto,
  BatchOperationDto,
} from './dto/product.dto';
import { ProductStatus } from '@prisma/client';

// Cache key prefixes
const CACHE_KEYS = {
  PRODUCT_LIST: 'products:list',
  PRODUCT_DETAIL: 'products:detail',
  POPULAR_PLATFORMS: 'products:platforms:popular',
  RELATED_PRODUCTS: 'products:related',
};

// Cache TTL in seconds
const CACHE_TTL = {
  LIST: 60, // 1 minute for lists
  DETAIL: 300, // 5 minutes for details
  PLATFORMS: 3600, // 1 hour for popular platforms
  RELATED: 300, // 5 minutes for related products
};

@Injectable()
export class ProductsService {
  private readonly logger = new Logger(ProductsService.name);

  constructor(
    private prisma: PrismaService,
    private redis: RedisService,
    private auditService: AuditService,
  ) {}

  // ==================== 创建商品 ====================

  async create(sellerId: string, dto: CreateProductDto) {
    // 验证卖家身份
    const seller = await this.prisma.user.findUnique({
      where: { id: sellerId },
      include: { sellerProfile: true },
    });

    if (!seller?.isSeller || !seller.sellerProfile) {
      throw new ForbiddenException('您不是卖家，无法创建商品');
    }

    // 验证分类
    const category = await this.prisma.category.findUnique({
      where: { id: dto.categoryId },
    });

    if (!category || !category.isActive) {
      throw new BadRequestException('分类不存在或已禁用');
    }

    const product = await this.prisma.product.create({
      data: {
        sellerId,
        categoryId: dto.categoryId,
        title: dto.title,
        description: dto.description,
        platform: dto.platform,
        accountType: dto.accountType,
        region: dto.region,
        price: dto.price,
        originalPrice: dto.originalPrice,
        currency: dto.currency || 'USD',
        stock: dto.stock,
        tags: dto.tags || [],
        attributes: dto.attributes || {},
        images: dto.images || [],
        thumbnailUrl: dto.thumbnailUrl,
        metaTitle: dto.metaTitle,
        metaDescription: dto.metaDescription,
        status: ProductStatus.DRAFT,
      },
      include: {
        category: true,
        seller: {
          select: { id: true, username: true, sellerProfile: true },
        },
      },
    });

    // 更新卖家商品数量
    await this.prisma.sellerProfile.update({
      where: { userId: sellerId },
      data: { productCount: { increment: 1 } },
    });

    // 审计日志
    await this.auditService.log({
      operatorId: sellerId,
      operatorRole: OperatorRole.SELLER,
      module: 'PRODUCTS',
      action: 'CREATE',
      targetType: 'Product',
      targetId: product.id,
      description: `创建商品: ${product.title}`,
      afterData: product,
    });

    return product;
  }

  // ==================== 更新商品 ====================

  async update(id: string, sellerId: string, dto: UpdateProductDto) {
    const product = await this.prisma.product.findUnique({
      where: { id },
    });

    if (!product) {
      throw new NotFoundException('商品不存在');
    }

    if (product.sellerId !== sellerId) {
      throw new ForbiddenException('无权修改此商品');
    }

    // 如果修改了分类，验证新分类
    if (dto.categoryId && dto.categoryId !== product.categoryId) {
      const category = await this.prisma.category.findUnique({
        where: { id: dto.categoryId },
      });
      if (!category || !category.isActive) {
        throw new BadRequestException('分类不存在或已禁用');
      }
    }

    const updated = await this.prisma.product.update({
      where: { id },
      data: {
        ...dto,
        status: ProductStatus.DRAFT, // 修改后重新变为草稿
      },
      include: {
        category: true,
      },
    });

    // 审计日志
    await this.auditService.log({
      operatorId: sellerId,
      operatorRole: OperatorRole.SELLER,
      module: 'PRODUCTS',
      action: 'UPDATE',
      targetType: 'Product',
      targetId: id,
      description: `更新商品: ${product.title}`,
      beforeData: product,
      afterData: updated,
    });

    // 清除缓存
    await this.invalidateProductCache(id);

    return updated;
  }

  // ==================== 提交审核 ====================

  async submitForAudit(id: string, sellerId: string) {
    const product = await this.prisma.product.findUnique({
      where: { id },
    });

    if (!product) {
      throw new NotFoundException('商品不存在');
    }

    if (product.sellerId !== sellerId) {
      throw new ForbiddenException('无权操作此商品');
    }

    if (product.status !== ProductStatus.DRAFT) {
      throw new BadRequestException('只有草稿状态的商品可以提交审核');
    }

    return this.prisma.product.update({
      where: { id },
      data: {
        status: ProductStatus.PENDING,
      },
    });
  }

  // ==================== 卖家查询自己的商品 ====================

  async findBySeller(sellerId: string, query: ProductQueryDto) {
    const {
      page = 1,
      limit = 10,
      status,
      categoryId,
      platform,
      search,
    } = query;
    const skip = (page - 1) * limit;

    const where: any = { sellerId };
    if (status) where.status = status;
    if (categoryId) where.categoryId = categoryId;
    if (platform) where.platform = platform;
    if (search) {
      where.OR = [
        { title: { contains: search } },
        { description: { contains: search } },
      ];
    }

    const [items, total] = await Promise.all([
      this.prisma.product.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          category: { select: { id: true, name: true } },
        },
      }),
      this.prisma.product.count({ where }),
    ]);

    return { items, total, page, limit };
  }

  // ==================== 公开查询商品列表 ====================

  async findPublic(query: ProductQueryDto) {
    const {
      page = 1,
      limit = 10,
      categoryId,
      platform,
      region,
      minPrice,
      maxPrice,
      search,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      sellerId,
    } = query;

    // Build cache key based on query parameters
    const cacheKey = `${CACHE_KEYS.PRODUCT_LIST}:${JSON.stringify({
      page,
      limit,
      categoryId,
      platform,
      region,
      minPrice,
      maxPrice,
      search,
      sortBy,
      sortOrder,
      sellerId,
    })}`;

    // Try to get from cache first
    if (this.redis.isAvailable()) {
      try {
        const cached = await this.redis.get(cacheKey);
        if (cached) {
          this.logger.debug(`Cache hit for product list: ${cacheKey}`);
          return JSON.parse(cached);
        }
      } catch (error) {
        this.logger.warn(`Cache read error: ${(error as Error).message}`);
      }
    }

    const skip = (page - 1) * limit;

    const where: any = { status: ProductStatus.APPROVED };
    if (categoryId) where.categoryId = categoryId;
    if (platform) where.platform = platform;
    if (region) where.region = region;
    if (sellerId) where.sellerId = sellerId;
    if (minPrice !== undefined || maxPrice !== undefined) {
      where.price = {};
      if (minPrice !== undefined) where.price.gte = minPrice;
      if (maxPrice !== undefined) where.price.lte = maxPrice;
    }
    if (search) {
      where.OR = [
        { title: { contains: search } },
        { description: { contains: search } },
      ];
    }

    const orderBy: any = {};
    orderBy[sortBy] = sortOrder;

    const [items, total] = await Promise.all([
      this.prisma.product.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        include: {
          category: { select: { id: true, name: true, slug: true } },
          seller: {
            select: {
              id: true,
              username: true,
              sellerProfile: {
                select: { shopName: true, shopAvatar: true, rating: true },
              },
            },
          },
        },
      }),
      this.prisma.product.count({ where }),
    ]);

    const result = { items, total, page, limit };

    // Cache the result
    if (this.redis.isAvailable()) {
      try {
        await this.redis.set(cacheKey, JSON.stringify(result), CACHE_TTL.LIST);
        this.logger.debug(`Cached product list: ${cacheKey}`);
      } catch (error) {
        this.logger.warn(`Cache write error: ${(error as Error).message}`);
      }
    }

    return result;
  }

  // ==================== 查询商品详情 ====================

  async findOne(id: string) {
    const cacheKey = `${CACHE_KEYS.PRODUCT_DETAIL}:${id}`;

    // Try cache first
    if (this.redis.isAvailable()) {
      try {
        const cached = await this.redis.get(cacheKey);
        if (cached) {
          this.logger.debug(`Cache hit for product detail: ${id}`);
          // 异步增加浏览量，不阻塞响应
          this.prisma.product
            .update({ where: { id }, data: { viewCount: { increment: 1 } } })
            .catch(() => {});
          return JSON.parse(cached);
        }
      } catch (error) {
        this.logger.warn(`Cache read error: ${(error as Error).message}`);
      }
    }

    const product = await this.prisma.product.findUnique({
      where: { id },
      include: {
        category: true,
        seller: {
          select: {
            id: true,
            username: true,
            sellerProfile: {
              select: {
                shopName: true,
                shopAvatar: true,
                shopDescription: true,
                rating: true,
                ratingCount: true,
                productCount: true,
              },
            },
          },
        },
        reviews: {
          take: 10,
          orderBy: { createdAt: 'desc' },
          include: {
            user: {
              select: { id: true, username: true, avatar: true },
            },
          },
        },
      },
    });

    if (!product) {
      throw new NotFoundException('商品不存在');
    }

    // 增加浏览量
    await this.prisma.product.update({
      where: { id },
      data: { viewCount: { increment: 1 } },
    });

    // Cache the result
    if (this.redis.isAvailable()) {
      try {
        await this.redis.set(
          cacheKey,
          JSON.stringify(product),
          CACHE_TTL.DETAIL,
        );
        this.logger.debug(`Cached product detail: ${id}`);
      } catch (error) {
        this.logger.warn(`Cache write error: ${(error as Error).message}`);
      }
    }

    return product;
  }

  /**
   * 清除商品相关缓存
   */
  private async invalidateProductCache(productId: string) {
    if (!this.redis.isAvailable()) return;
    try {
      // 清除详情缓存
      await this.redis.del(`${CACHE_KEYS.PRODUCT_DETAIL}:${productId}`);
      // 清除列表缓存（按 pattern 删除）
      const listKeys = await this.redis.keys(`${CACHE_KEYS.PRODUCT_LIST}:*`);
      for (const key of listKeys) {
        await this.redis.del(key);
      }
      this.logger.debug(`Cache invalidated for product: ${productId}`);
    } catch (error) {
      this.logger.warn(`Cache invalidation error: ${(error as Error).message}`);
    }
  }

  // ==================== 管理员审核商品 ====================

  async audit(id: string, adminId: string, dto: AuditProductDto) {
    const product = await this.prisma.product.findUnique({
      where: { id },
    });

    if (!product) {
      throw new NotFoundException('商品不存在');
    }

    if (product.status !== ProductStatus.PENDING) {
      throw new BadRequestException('只有待审核的商品可以审核');
    }

    const updateData: any = {
      status:
        dto.status === 'APPROVED'
          ? ProductStatus.APPROVED
          : ProductStatus.REJECTED,
      auditedBy: adminId,
      auditedAt: new Date(),
    };

    if (dto.status === 'REJECTED' && dto.rejectReason) {
      updateData.rejectReason = dto.rejectReason;
    }

    if (dto.status === 'APPROVED') {
      updateData.publishedAt = new Date();
    }

    const updated = await this.prisma.product.update({
      where: { id },
      data: updateData,
    });

    // 审计日志
    await this.auditService.log({
      operatorId: adminId,
      operatorRole: OperatorRole.ADMIN,
      module: 'PRODUCTS',
      action: dto.status === 'APPROVED' ? 'APPROVE' : 'REJECT',
      targetType: 'Product',
      targetId: id,
      description: `审核商品: ${product.title} - ${dto.status}${dto.rejectReason ? ` (原因: ${dto.rejectReason})` : ''}`,
      beforeData: { status: product.status },
      afterData: { status: updated.status, rejectReason: dto.rejectReason },
    });

    // 清除缓存（审核状态变化影响公开列表）
    await this.invalidateProductCache(id);

    return updated;
  }

  // ==================== 管理员查询所有商品 ====================

  async findAll(query: ProductQueryDto) {
    const {
      page = 1,
      limit = 10,
      status,
      categoryId,
      platform,
      sellerId,
      search,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = query;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (status) where.status = status;
    if (categoryId) where.categoryId = categoryId;
    if (platform) where.platform = platform;
    if (sellerId) where.sellerId = sellerId;
    if (search) {
      where.OR = [
        { title: { contains: search } },
        { description: { contains: search } },
      ];
    }

    const orderBy: any = {};
    orderBy[sortBy] = sortOrder;

    const [items, total] = await Promise.all([
      this.prisma.product.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        include: {
          category: { select: { id: true, name: true } },
          seller: {
            select: {
              id: true,
              username: true,
              email: true,
              sellerProfile: { select: { shopName: true } },
            },
          },
        },
      }),
      this.prisma.product.count({ where }),
    ]);

    return { items, total, page, limit };
  }

  // ==================== 删除商品 ====================

  async remove(id: string, sellerId: string) {
    const product = await this.prisma.product.findUnique({
      where: { id },
    });

    if (!product) {
      throw new NotFoundException('商品不存在');
    }

    if (product.sellerId !== sellerId) {
      throw new ForbiddenException('无权删除此商品');
    }

    await this.prisma.product.delete({
      where: { id },
    });

    // 更新卖家商品数量
    await this.prisma.sellerProfile.update({
      where: { userId: sellerId },
      data: { productCount: { decrement: 1 } },
    });

    // 审计日志
    await this.auditService.log({
      operatorId: sellerId,
      operatorRole: OperatorRole.SELLER,
      module: 'PRODUCTS',
      action: 'DELETE',
      targetType: 'Product',
      targetId: id,
      description: `删除商品: ${product.title}`,
      beforeData: product,
    });

    // 清除缓存
    await this.invalidateProductCache(id);

    return { success: true, message: '商品已删除' };
  }

  // ==================== 上架/下架商品 ====================

  async toggleStatus(id: string, sellerId: string, online: boolean) {
    const product = await this.prisma.product.findUnique({
      where: { id },
    });

    if (!product) {
      throw new NotFoundException('商品不存在');
    }

    if (product.sellerId !== sellerId) {
      throw new ForbiddenException('无权操作此商品');
    }

    if (product.status !== ProductStatus.APPROVED) {
      throw new BadRequestException('只有已审核的商品可以上架/下架');
    }

    return this.prisma.product.update({
      where: { id },
      data: {
        status: online ? ProductStatus.APPROVED : ProductStatus.OFF_SALE,
      },
    });
  }

  // ==================== 批量操作 ====================

  async batchOperation(sellerId: string, dto: BatchOperationDto) {
    const products = await this.prisma.product.findMany({
      where: {
        id: { in: dto.ids },
        sellerId,
      },
    });

    if (products.length === 0) {
      throw new NotFoundException('未找到可操作的商品');
    }

    switch (dto.action) {
      case 'delete':
        await this.prisma.product.deleteMany({
          where: { id: { in: dto.ids }, sellerId },
        });
        break;
      case 'offline':
        await this.prisma.product.updateMany({
          where: { id: { in: dto.ids }, sellerId },
          data: { status: ProductStatus.OFF_SALE },
        });
        break;
      case 'online':
        await this.prisma.product.updateMany({
          where: {
            id: { in: dto.ids },
            sellerId,
            status: ProductStatus.OFF_SALE,
          },
          data: { status: ProductStatus.APPROVED },
        });
        break;
    }

    return {
      success: true,
      affected: products.length,
      action: dto.action,
    };
  }

  // ==================== 获取热门平台 ====================

  async getPopularPlatforms() {
    const result = await this.prisma.product.groupBy({
      by: ['platform'],
      where: { status: ProductStatus.APPROVED },
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
      take: 10,
    });

    return result.map((item) => ({
      platform: item.platform,
      count: item._count.id,
    }));
  }

  // ==================== 获取相关商品 ====================

  async getRelatedProducts(id: string, limit: number = 8) {
    const product = await this.prisma.product.findUnique({
      where: { id },
    });

    if (!product) {
      return [];
    }

    return this.prisma.product.findMany({
      where: {
        status: ProductStatus.APPROVED,
        id: { not: id },
        OR: [
          { categoryId: product.categoryId },
          { platform: product.platform },
        ],
      },
      take: limit,
      orderBy: { soldCount: 'desc' },
      include: {
        seller: {
          select: {
            id: true,
            username: true,
            sellerProfile: { select: { shopName: true } },
          },
        },
      },
    });
  }

  // ==================== 收藏夹功能 ====================

  async getFavorites(userId: string, page: number = 1, limit: number = 10) {
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
              category: { select: { id: true, name: true } },
              seller: {
                select: {
                  id: true,
                  username: true,
                  sellerProfile: { select: { shopName: true } },
                },
              },
            },
          },
        },
      }),
      this.prisma.favorite.count({ where: { userId } }),
    ]);

    return {
      items: items.map((f) => ({
        ...f,
        product: {
          ...f.product,
          isFavorited: true,
        },
      })),
      total,
      page,
      limit,
    };
  }

  async addFavorite(userId: string, productId: string) {
    // 检查商品是否存在
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
    });

    if (!product) {
      throw new NotFoundException('商品不存在');
    }

    // 检查是否已收藏
    const existing = await this.prisma.favorite.findUnique({
      where: {
        userId_productId: { userId, productId },
      },
    });

    if (existing) {
      throw new BadRequestException('已收藏该商品');
    }

    // 创建收藏记录
    await this.prisma.favorite.create({
      data: { userId, productId },
    });

    // 更新商品收藏数
    await this.prisma.product.update({
      where: { id: productId },
      data: { favoriteCount: { increment: 1 } },
    });

    return { success: true, message: '收藏成功' };
  }

  async removeFavorite(userId: string, productId: string) {
    const favorite = await this.prisma.favorite.findUnique({
      where: {
        userId_productId: { userId, productId },
      },
    });

    if (!favorite) {
      throw new NotFoundException('未收藏该商品');
    }

    // 删除收藏记录
    await this.prisma.favorite.delete({
      where: { id: favorite.id },
    });

    // 更新商品收藏数
    await this.prisma.product.update({
      where: { id: productId },
      data: { favoriteCount: { decrement: 1 } },
    });

    return { success: true, message: '取消收藏成功' };
  }

  async checkFavorite(userId: string, productId: string) {
    const favorite = await this.prisma.favorite.findUnique({
      where: {
        userId_productId: { userId, productId },
      },
    });

    return { isFavorited: !!favorite };
  }
}
