import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { RedisService } from '../../common/redis/redis.service';
import { CreateCategoryDto, UpdateCategoryDto } from './dto/category.dto';

// Cache keys and TTL
const CACHE_KEYS = {
  CATEGORY_LIST: 'categories:list',
  CATEGORY_TREE: 'categories:tree',
  CATEGORY_DETAIL: 'categories:detail',
};

const CACHE_TTL = {
  LIST: 300, // 5 minutes
  TREE: 300, // 5 minutes
  DETAIL: 600, // 10 minutes
};

@Injectable()
export class CategoriesService {
  private readonly logger = new Logger(CategoriesService.name);

  constructor(
    private prisma: PrismaService,
    private redis: RedisService,
  ) {}

  // ==================== 私有方法：清除缓存 ====================

  private async invalidateCache() {
    if (this.redis.isAvailable()) {
      try {
        await Promise.all([
          this.redis.del(CACHE_KEYS.CATEGORY_LIST),
          this.redis.del(CACHE_KEYS.CATEGORY_TREE),
        ]);
        this.logger.debug('Category cache invalidated');
      } catch (error) {
        this.logger.warn(`Cache invalidation error: ${error.message}`);
      }
    }
  }

  // ==================== 创建分类 ====================

  async create(dto: CreateCategoryDto) {
    // 如果有父分类，验证父分类存在
    if (dto.parentId) {
      const parent = await this.prisma.category.findUnique({
        where: { id: dto.parentId },
      });
      if (!parent) {
        throw new NotFoundException('父分类不存在');
      }
    }

    const result = await this.prisma.category.create({
      data: {
        parentId: dto.parentId,
        name: dto.name,
        slug: dto.slug,
        icon: dto.icon,
        color: dto.color,
        description: dto.description,
        sortOrder: dto.sortOrder ?? 0,
        isActive: dto.isActive ?? true,
      },
      include: {
        parent: true,
        children: true,
      },
    });

    await this.invalidateCache();
    return result;
  }

  // ==================== 查询分类列表 ====================

  async findAll(includeInactive = false) {
    const where = includeInactive ? {} : { isActive: true };

    const categories = await this.prisma.category.findMany({
      where,
      include: {
        parent: true,
        children: true,
        _count: {
          select: { products: true },
        },
      },
      orderBy: [{ sortOrder: 'desc' }, { createdAt: 'asc' }],
    });

    return categories.map((cat) => ({
      ...cat,
      productCount: cat._count.products,
    }));
  }

  // ==================== 获取分类树 ====================

  async getCategoryTree() {
    // Try cache first
    if (this.redis.isAvailable()) {
      try {
        const cached = await this.redis.get(CACHE_KEYS.CATEGORY_TREE);
        if (cached) {
          this.logger.debug('Cache hit for category tree');
          return JSON.parse(cached);
        }
      } catch (error) {
        this.logger.warn(`Cache read error: ${error.message}`);
      }
    }

    const categories = await this.prisma.category.findMany({
      where: { parentId: null, isActive: true },
      include: {
        children: {
          where: { isActive: true },
          include: {
            _count: { select: { products: true } },
          },
        },
        _count: { select: { products: true } },
      },
      orderBy: [{ sortOrder: 'desc' }, { createdAt: 'asc' }],
    });

    const result = categories.map((cat) => ({
      ...cat,
      productCount: cat._count.products,
      children: cat.children.map((child) => ({
        ...child,
        productCount: child._count.products,
      })),
    }));

    // Cache the result
    if (this.redis.isAvailable()) {
      try {
        await this.redis.set(
          CACHE_KEYS.CATEGORY_TREE,
          JSON.stringify(result),
          CACHE_TTL.TREE,
        );
      } catch (error) {
        this.logger.warn(`Cache write error: ${error.message}`);
      }
    }

    return result;
  }

  // ==================== 查询单个分类 ====================

  async findOne(id: string) {
    const category = await this.prisma.category.findUnique({
      where: { id },
      include: {
        parent: true,
        children: true,
        _count: { select: { products: true } },
      },
    });

    if (!category) {
      throw new NotFoundException('分类不存在');
    }

    return {
      ...category,
      productCount: category._count.products,
    };
  }

  // ==================== 根据 slug 查询 ====================

  async findBySlug(slug: string) {
    const category = await this.prisma.category.findUnique({
      where: { slug },
      include: {
        parent: true,
        children: true,
        _count: { select: { products: true } },
      },
    });

    if (!category) {
      throw new NotFoundException('分类不存在');
    }

    return {
      ...category,
      productCount: category._count.products,
    };
  }

  // ==================== 更新分类 ====================

  async update(id: string, dto: UpdateCategoryDto) {
    await this.findOne(id); // 验证存在

    // 如果更新父分类，验证父分类存在且不是自己
    if (dto.parentId) {
      if (dto.parentId === id) {
        throw new BadRequestException('不能将分类设为自己的子分类');
      }
      const parent = await this.prisma.category.findUnique({
        where: { id: dto.parentId },
      });
      if (!parent) {
        throw new NotFoundException('父分类不存在');
      }
    }

    const result = await this.prisma.category.update({
      where: { id },
      data: {
        parentId: dto.parentId,
        name: dto.name,
        slug: dto.slug,
        icon: dto.icon,
        color: dto.color,
        description: dto.description,
        sortOrder: dto.sortOrder,
        isActive: dto.isActive,
      },
      include: {
        parent: true,
        children: true,
      },
    });

    await this.invalidateCache();
    return result;
  }

  // ==================== 删除分类 ====================

  async remove(id: string) {
    const category = await this.findOne(id);

    // 检查是否有子分类
    if (category.children && category.children.length > 0) {
      throw new BadRequestException('该分类下有子分类，无法删除');
    }

    // 检查是否有关联商品
    if (category.productCount > 0) {
      throw new BadRequestException('该分类下有商品，无法删除');
    }

    await this.prisma.category.delete({ where: { id } });
    await this.invalidateCache();
    return { success: true, message: '分类已删除' };
  }

  // ==================== 更新排序 ====================

  async updateSort(id: string, sortOrder: number) {
    await this.findOne(id); // 验证存在

    const result = await this.prisma.category.update({
      where: { id },
      data: { sortOrder },
    });

    await this.invalidateCache();
    return result;
  }

  // ==================== 切换激活状态 ====================

  async toggleActive(id: string) {
    const category = await this.findOne(id);

    const result = await this.prisma.category.update({
      where: { id },
      data: { isActive: !category.isActive },
    });

    await this.invalidateCache();
    return result;
  }
}
