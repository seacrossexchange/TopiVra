import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { RedisService } from '../../common/redis/redis.service';

// 缓存过期时间配置（秒）
const CACHE_TTL = {
  PRODUCT_SEARCH: 300, // 商品搜索结果缓存 5 分钟
  CATEGORY_SEARCH: 600, // 分类搜索缓存 10 分钟
  SELLER_SEARCH: 300, // 卖家搜索缓存 5 分钟
  HOT_KEYWORDS: 3600, // 热门关键词缓存 1 小时
  SEARCH_SUGGESTIONS: 180, // 搜索建议缓存 3 分钟
};

// Redis key 前缀
const CACHE_PREFIX = {
  PRODUCT_SEARCH: 'search:products:',
  CATEGORY_SEARCH: 'search:categories:',
  SELLER_SEARCH: 'search:sellers:',
  HOT_KEYWORDS: 'search:hot_keywords',
  SEARCH_COUNT: 'search:count:',
  SEARCH_HISTORY: 'search:history:',
};

@Injectable()
export class SearchService {
  private readonly logger = new Logger(SearchService.name);

  constructor(
    private prisma: PrismaService,
    private redisService: RedisService,
  ) {}

  // ==================== 缓存辅助方法 ====================

  private generateCacheKey(prefix: string, ...parts: string[]): string {
    return prefix + parts.map((p) => encodeURIComponent(p)).join(':');
  }

  private async getFromCache<T>(key: string): Promise<T | null> {
    if (!this.redisService.isAvailable()) {
      return null;
    }

    try {
      const cached = await this.redisService.get(key);
      if (cached) {
        this.logger.debug(`Cache hit: ${key}`);
        return JSON.parse(cached);
      }
      return null;
    } catch (error) {
      this.logger.warn(`Cache get error for ${key}: ${error.message}`);
      return null;
    }
  }

  private async setToCache<T>(
    key: string,
    data: T,
    ttl: number,
  ): Promise<void> {
    if (!this.redisService.isAvailable()) {
      return;
    }

    try {
      await this.redisService.set(key, JSON.stringify(data), ttl);
      this.logger.debug(`Cache set: ${key} (TTL: ${ttl}s)`);
    } catch (error) {
      this.logger.warn(`Cache set error for ${key}: ${error.message}`);
    }
  }

  // ==================== 搜索计数 & 热门关键词 ====================

  /**
   * 记录搜索关键词
   */
  private async recordSearchKeyword(keyword: string): Promise<void> {
    if (!this.redisService.isAvailable() || !keyword.trim()) {
      return;
    }

    try {
      const normalizedKeyword = keyword.toLowerCase().trim();
      const countKey = CACHE_PREFIX.SEARCH_COUNT + normalizedKeyword;

      // 增加搜索计数
      await this.redisService.incr(countKey);

      // 设置过期时间为 7 天
      await this.redisService.expire(countKey, 7 * 24 * 60 * 60);
    } catch (error) {
      this.logger.warn(`记录搜索关键词失败: ${error.message}`);
    }
  }

  /**
   * 获取热门搜索关键词
   */
  async getHotKeywords(): Promise<string[]> {
    // 先尝试从缓存获取
    const cached = await this.getFromCache<string[]>(CACHE_PREFIX.HOT_KEYWORDS);
    if (cached) {
      return cached;
    }

    // 从 Redis 搜索计数中获取热门关键词
    const keywords = await this.fetchHotKeywordsFromRedis();

    // 缓存结果
    await this.setToCache(
      CACHE_PREFIX.HOT_KEYWORDS,
      keywords,
      CACHE_TTL.HOT_KEYWORDS,
    );

    return keywords;
  }

  private async fetchHotKeywordsFromRedis(): Promise<string[]> {
    if (!this.redisService.isAvailable()) {
      return this.getDefaultHotKeywords();
    }

    try {
      // 获取所有搜索计数的 key
      const keys = await this.redisService.keys(
        CACHE_PREFIX.SEARCH_COUNT + '*',
      );

      if (keys.length === 0) {
        return this.getDefaultHotKeywords();
      }

      // 获取每个关键词的计数
      const keywordCounts: Array<{ keyword: string; count: number }> = [];

      for (const key of keys) {
        const keyword = decodeURIComponent(
          key.replace(CACHE_PREFIX.SEARCH_COUNT, ''),
        );
        const countStr = await this.redisService.get(key);
        const count = parseInt(countStr || '0', 10);
        keywordCounts.push({ keyword, count });
      }

      // 按计数排序并返回前 10 个
      keywordCounts.sort((a, b) => b.count - a.count);
      return keywordCounts.slice(0, 10).map((item) => item.keyword);
    } catch (error) {
      this.logger.warn(`获取热门关键词失败: ${error.message}`);
      return this.getDefaultHotKeywords();
    }
  }

  private getDefaultHotKeywords(): string[] {
    return ['Facebook账号', 'Telegram', 'Instagram', 'Twitter', 'Google Voice'];
  }

  // ==================== 全局搜索 ====================

  async globalSearch(keyword: string, _userId?: string) {
    // 记录搜索关键词
    await this.recordSearchKeyword(keyword);

    const [products, categories, sellers] = await Promise.all([
      this.searchProducts(keyword, 1, 5),
      this.searchCategories(keyword),
      this.searchSellers(keyword, 1, 5),
    ]);

    return {
      products: products.items,
      categories,
      sellers: sellers.items,
    };
  }

  // ==================== 商品搜索 ====================

  async searchProducts(keyword: string, page: number = 1, limit: number = 10) {
    // 生成缓存 key
    const cacheKey = this.generateCacheKey(
      CACHE_PREFIX.PRODUCT_SEARCH,
      keyword,
      String(page),
      String(limit),
    );

    // 尝试从缓存获取
    const cached = await this.getFromCache<{
      items: any[];
      total: number;
      page: number;
      limit: number;
      totalPages: number;
    }>(cacheKey);

    if (cached) {
      return cached;
    }

    // 记录搜索关键词
    await this.recordSearchKeyword(keyword);

    const skip = (page - 1) * limit;
    const where = {
      status: 'ON_SALE' as const,
      OR: [
        { title: { contains: keyword } },
        { description: { contains: keyword } },
      ],
    };

    const [items, total] = await Promise.all([
      this.prisma.product.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          category: { select: { id: true, name: true } },
          seller: {
            select: {
              id: true,
              sellerProfile: {
                select: { id: true, shopName: true },
              },
            },
          },
        },
      }),
      this.prisma.product.count({ where }),
    ]);

    // 转换数据格式
    const formattedItems = items.map((item) => ({
      ...item,
      shopName: item.seller?.sellerProfile?.shopName || null,
    }));

    const result = {
      items: formattedItems,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };

    // 缓存结果
    await this.setToCache(cacheKey, result, CACHE_TTL.PRODUCT_SEARCH);

    return result;
  }

  // ==================== 分类搜索 ====================

  async searchCategories(keyword: string) {
    // 生成缓存 key
    const cacheKey = this.generateCacheKey(
      CACHE_PREFIX.CATEGORY_SEARCH,
      keyword,
    );

    // 尝试从缓存获取
    const cached = await this.getFromCache<any[]>(cacheKey);
    if (cached) {
      return cached;
    }

    const result = await this.prisma.category.findMany({
      where: { name: { contains: keyword } },
      take: 10,
    });

    // 缓存结果
    await this.setToCache(cacheKey, result, CACHE_TTL.CATEGORY_SEARCH);

    return result;
  }

  // ==================== 卖家搜索 ====================

  async searchSellers(keyword: string, page: number = 1, limit: number = 10) {
    // 生成缓存 key
    const cacheKey = this.generateCacheKey(
      CACHE_PREFIX.SELLER_SEARCH,
      keyword,
      String(page),
      String(limit),
    );

    // 尝试从缓存获取
    const cached = await this.getFromCache<{
      items: any[];
      total: number;
      page: number;
      limit: number;
    }>(cacheKey);

    if (cached) {
      return cached;
    }

    const skip = (page - 1) * limit;
    const where = {
      applicationStatus: 'APPROVED' as const,
      OR: [
        { shopName: { contains: keyword } },
        { shopDescription: { contains: keyword } },
      ],
    };

    const [items, total] = await Promise.all([
      this.prisma.sellerProfile.findMany({
        where,
        skip,
        take: limit,
        select: {
          id: true,
          shopName: true,
          shopAvatar: true,
          rating: true,
        },
      }),
      this.prisma.sellerProfile.count({ where }),
    ]);

    const result = { items, total, page, limit };

    // 缓存结果
    await this.setToCache(cacheKey, result, CACHE_TTL.SELLER_SEARCH);

    return result;
  }

  // ==================== 搜索建议 ====================

  /**
   * 获取搜索建议（自动补全）
   */
  async getSearchSuggestions(keyword: string): Promise<string[]> {
    if (!keyword || keyword.length < 2) {
      return [];
    }

    const cacheKey = this.generateCacheKey('search:suggestions:', keyword);

    // 尝试从缓存获取
    const cached = await this.getFromCache<string[]>(cacheKey);
    if (cached) {
      return cached;
    }

    // 从商品标题中提取建议
    const products = await this.prisma.product.findMany({
      where: {
        status: 'ON_SALE',
        title: { contains: keyword },
      },
      select: { title: true },
      take: 10,
    });

    const suggestions = products
      .map((p) => p.title)
      .filter((title, index, self) => self.indexOf(title) === index)
      .slice(0, 5);

    // 缓存结果
    await this.setToCache(cacheKey, suggestions, CACHE_TTL.SEARCH_SUGGESTIONS);

    return suggestions;
  }

  // ==================== 搜索历史 ====================

  /**
   * 获取用户搜索历史
   */
  async getSearchHistory(
    userId: string,
    limit: number = 10,
  ): Promise<string[]> {
    if (!this.redisService.isAvailable()) {
      return [];
    }

    try {
      const historyKey = CACHE_PREFIX.SEARCH_HISTORY + userId;
      const history = await this.redisService.lrange(historyKey, 0, limit - 1);
      return history.map((h) => decodeURIComponent(h));
    } catch (error) {
      this.logger.warn(`获取搜索历史失败: ${error.message}`);
      return [];
    }
  }

  /**
   * 添加搜索历史
   */
  async addSearchHistory(userId: string, keyword: string): Promise<void> {
    if (!this.redisService.isAvailable() || !keyword.trim()) {
      return;
    }

    try {
      const historyKey = CACHE_PREFIX.SEARCH_HISTORY + userId;
      const encodedKeyword = encodeURIComponent(keyword.trim());

      // 先移除旧记录（避免重复）
      await this.redisService.srem(historyKey, encodedKeyword);

      // 添加到列表头部
      await this.redisService.lpush(historyKey, encodedKeyword);

      // 只保留最近 20 条
      const client = this.redisService.getClient();
      if (client) {
        await client.ltrim(historyKey, 0, 19);

        // 设置过期时间为 30 天
        await this.redisService.expire(historyKey, 30 * 24 * 60 * 60);
      }
    } catch (error) {
      this.logger.warn(`添加搜索历史失败: ${error.message}`);
    }
  }

  /**
   * 清除搜索历史
   */
  async clearSearchHistory(userId: string): Promise<void> {
    if (!this.redisService.isAvailable()) {
      return;
    }

    try {
      const historyKey = CACHE_PREFIX.SEARCH_HISTORY + userId;
      await this.redisService.del(historyKey);
    } catch (error) {
      this.logger.warn(`清除搜索历史失败: ${error.message}`);
    }
  }

  // ==================== 缓存管理 ====================

  /**
   * 清除所有搜索缓存
   */
  async clearAllSearchCache(): Promise<void> {
    if (!this.redisService.isAvailable()) {
      return;
    }

    try {
      const patterns = [
        CACHE_PREFIX.PRODUCT_SEARCH + '*',
        CACHE_PREFIX.CATEGORY_SEARCH + '*',
        CACHE_PREFIX.SELLER_SEARCH + '*',
        CACHE_PREFIX.HOT_KEYWORDS,
        'search:suggestions:*',
      ];

      for (const pattern of patterns) {
        const keys = await this.redisService.keys(pattern);
        for (const key of keys) {
          await this.redisService.del(key);
        }
      }

      this.logger.log('已清除所有搜索缓存');
    } catch (error) {
      this.logger.warn(`清除搜索缓存失败: ${error.message}`);
    }
  }
}
