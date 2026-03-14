/**
 * Prisma 查询优化工具
 * 提供常用的查询优化模式和最佳实践
 */

/**
 * 分页查询优化
 * 使用 cursor-based pagination 替代 offset-based
 */
export interface CursorPaginationOptions {
  cursor?: string;
  take?: number;
}

export interface CursorPaginationResult<T> {
  items: T[];
  nextCursor: string | null;
  hasMore: boolean;
}

export async function cursorPaginate<T extends { id: string }>(
  query: (options: any) => Promise<T[]>,
  options: CursorPaginationOptions,
): Promise<CursorPaginationResult<T>> {
  const take = options.take || 20;
  const items = await query({
    take: take + 1,
    ...(options.cursor && {
      cursor: { id: options.cursor },
      skip: 1,
    }),
  });

  const hasMore = items.length > take;
  const results = hasMore ? items.slice(0, take) : items;
  const nextCursor = hasMore ? results[results.length - 1].id : null;

  return {
    items: results,
    nextCursor,
    hasMore,
  };
}

/**
 * 批量查询优化
 * 使用 DataLoader 模式避免 N+1 查询
 */
export class BatchLoader<K, V> {
  private queue: Array<{
    key: K;
    resolve: (value: V) => void;
    reject: (error: Error) => void;
  }> = [];
  private batchScheduled = false;

  constructor(
    private batchLoadFn: (keys: K[]) => Promise<V[]>,
    private maxBatchSize = 100,
  ) {}

  load(key: K): Promise<V> {
    return new Promise((resolve, reject) => {
      this.queue.push({ key, resolve, reject });

      if (!this.batchScheduled) {
        this.batchScheduled = true;
        process.nextTick(() => this.dispatch());
      }
    });
  }

  private async dispatch() {
    this.batchScheduled = false;
    const queue = this.queue.splice(0, this.maxBatchSize);

    if (queue.length === 0) return;

    try {
      const keys = queue.map((item) => item.key);
      const values = await this.batchLoadFn(keys);

      queue.forEach((item, index) => {
        item.resolve(values[index]);
      });
    } catch (error) {
      queue.forEach((item) => {
        item.reject(error as Error);
      });
    }
  }
}

/**
 * 查询结果缓存装饰器
 */
export function Cacheable(ttl: number = 60) {
  const cache = new Map<string, { value: any; expiry: number }>();

  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor,
  ) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      const cacheKey = `${propertyKey}:${JSON.stringify(args)}`;
      const cached = cache.get(cacheKey);

      if (cached && cached.expiry > Date.now()) {
        return cached.value;
      }

      const result = await originalMethod.apply(this, args);
      cache.set(cacheKey, {
        value: result,
        expiry: Date.now() + ttl * 1000,
      });

      return result;
    };

    return descriptor;
  };
}

/**
 * 查询优化建议
 */
export const QueryOptimizationTips = {
  // 1. 使用 select 只查询需要的字段
  selectOnlyNeeded: `
    // ❌ 查询所有字段
    const users = await prisma.user.findMany();
    
    // ✅ 只查询需要的字段
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        username: true,
      },
    });
  `,

  // 2. 使用 include 预加载关联数据
  useInclude: `
    // ❌ N+1 查询
    const orders = await prisma.order.findMany();
    for (const order of orders) {
      const items = await prisma.orderItem.findMany({
        where: { orderId: order.id },
      });
    }
    
    // ✅ 使用 include 预加载
    const orders = await prisma.order.findMany({
      include: {
        items: {
          include: {
            product: true,
          },
        },
      },
    });
  `,

  // 3. 使用索引字段进行查询
  useIndexedFields: `
    // ❌ 非索引字段查询
    const user = await prisma.user.findFirst({
      where: { username: 'john' },
    });
    
    // ✅ 使用索引字段（email 有唯一索引）
    const user = await prisma.user.findUnique({
      where: { email: 'john@example.com' },
    });
  `,

  // 4. 批量操作替代循环
  useBatchOperations: `
    // ❌ 循环插入
    for (const item of items) {
      await prisma.product.create({ data: item });
    }
    
    // ✅ 批量插入
    await prisma.product.createMany({
      data: items,
      skipDuplicates: true,
    });
  `,

  // 5. 使用事务处理相关操作
  useTransactions: `
    // ❌ 分开执行
    await prisma.order.update({ ... });
    await prisma.inventory.update({ ... });
    
    // ✅ 使用事务
    await prisma.$transaction([
      prisma.order.update({ ... }),
      prisma.inventory.update({ ... }),
    ]);
  `,

  // 6. 使用 cursor-based pagination
  useCursorPagination: `
    // ❌ Offset-based（大偏移量性能差）
    const products = await prisma.product.findMany({
      skip: 1000,
      take: 20,
    });
    
    // ✅ Cursor-based
    const products = await prisma.product.findMany({
      take: 20,
      cursor: { id: lastProductId },
      skip: 1,
    });
  `,

  // 7. 使用原始查询优化复杂查询
  useRawQueries: `
    // 对于复杂的聚合查询，使用原始 SQL
    const result = await prisma.$queryRaw\`
      SELECT 
        DATE(createdAt) as date,
        COUNT(*) as count,
        SUM(totalAmount) as revenue
      FROM orders
      WHERE createdAt >= DATE_SUB(NOW(), INTERVAL 30 DAY)
      GROUP BY DATE(createdAt)
      ORDER BY date DESC
    \`;
  `,

  // 8. 使用连接池配置
  connectionPooling: `
    // prisma/schema.prisma
    datasource db {
      provider = "mysql"
      url      = env("DATABASE_URL")
      
      // 连接池配置
      // DATABASE_URL="mysql://user:pass@host:3306/db?connection_limit=10&pool_timeout=20"
    }
  `,
};

/**
 * 性能监控装饰器
 */
export function Monitor(threshold: number = 1000) {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor,
  ) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      const start = Date.now();
      try {
        const result = await originalMethod.apply(this, args);
        const duration = Date.now() - start;

        if (duration > threshold) {
          console.warn(
            `Slow query detected: ${propertyKey} took ${duration}ms`,
          );
        }

        return result;
      } catch (error) {
        const duration = Date.now() - start;
        console.error(
          `Query failed: ${propertyKey} after ${duration}ms`,
          error,
        );
        throw error;
      }
    };

    return descriptor;
  };
}

