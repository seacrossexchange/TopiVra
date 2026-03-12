import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  HealthCheck,
  HealthCheckService,
  MemoryHealthIndicator,
  DiskHealthIndicator,
} from '@nestjs/terminus';
import { AppService } from './app.service';
import { PrismaService } from './prisma/prisma.service';
import { RedisService } from './common/redis/redis.service';
import { PrismaHealthIndicator } from './modules/health/prisma.health';
import { RedisHealthIndicator } from './modules/health/redis.health';

@ApiTags('default')
@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    private readonly prisma: PrismaService,
    private readonly redisService: RedisService,
    private healthCheckService: HealthCheckService,
    private memory: MemoryHealthIndicator,
    private disk: DiskHealthIndicator,
    private prismaHealth: PrismaHealthIndicator,
    private redisHealth: RedisHealthIndicator,
  ) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Get('health')
  @ApiOperation({ summary: '综合健康检查' })
  @HealthCheck()
  async healthCheck() {
    return this.healthCheckService.check([
      // 数据库检查
      () => this.prismaHealth.isHealthy('database'),
      // Redis 检查（可选）
      () => this.redisHealth.isHealthy('redis'),
      // 内存检查：堆内存不超过 500MB
      () => this.memory.checkHeap('memory_heap', 500 * 1024 * 1024),
      // 内存检查：RSS 不超过 1GB
      () => this.memory.checkRSS('memory_rss', 1024 * 1024 * 1024),
      // 磁盘检查：可用空间不少于 1GB
      () =>
        this.disk.checkStorage('disk', {
          path: '/',
          threshold: 1024 * 1024 * 1024,
        }),
    ]);
  }

  @Get('liveness')
  @ApiOperation({ summary: '存活检查 - K8s liveness probe' })
  async liveness() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    };
  }

  @Get('readiness')
  @ApiOperation({ summary: '就绪检查 - K8s readiness probe' })
  async readiness() {
    const checks = {
      database: false,
      redis: false,
    };

    // 检查数据库连接
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      checks.database = true;
    } catch {
      checks.database = false;
    }

    // 检查 Redis 连接
    checks.redis = this.redisService.isAvailable();

    const allReady = checks.database && checks.redis;

    return {
      status: allReady ? 'ready' : 'not_ready',
      timestamp: new Date().toISOString(),
      checks,
    };
  }

  @Get('metrics')
  @ApiOperation({ summary: '应用指标监控' })
  async metrics() {
    const memoryUsage = process.memoryUsage();
    const dbStatus = await this.getDatabaseMetrics();
    const redisStatus = await this.getRedisMetrics();

    return {
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      nodejs: {
        version: process.version,
        platform: process.platform,
        arch: process.arch,
        pid: process.pid,
      },
      memory: {
        heapTotal: Math.round(memoryUsage.heapTotal / 1024 / 1024) + 'MB',
        heapUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024) + 'MB',
        rss: Math.round(memoryUsage.rss / 1024 / 1024) + 'MB',
        external: Math.round(memoryUsage.external / 1024 / 1024) + 'MB',
        arrayBuffers: Math.round(memoryUsage.arrayBuffers / 1024 / 1024) + 'MB',
      },
      database: dbStatus,
      redis: redisStatus,
    };
  }

  private async getDatabaseMetrics() {
    try {
      // 执行简单查询测试连接
      const start = Date.now();
      await this.prisma.$queryRaw`SELECT 1`;
      const latency = Date.now() - start;

      return {
        status: 'connected',
        latency: latency + 'ms',
        type: 'mysql',
      };
    } catch (error) {
      return {
        status: 'disconnected',
        error: error.message,
      };
    }
  }

  private async getRedisMetrics() {
    if (!this.redisService.isAvailable()) {
      return {
        status: 'unavailable',
        message: 'Redis 未配置或连接失败',
      };
    }

    try {
      const client = this.redisService.getClient();
      if (!client) {
        return { status: 'unavailable' };
      }

      const start = Date.now();
      await client.ping();
      const latency = Date.now() - start;

      const info = await client.info('memory');
      const usedMemory =
        info
          .split('\r\n')
          .find((line) => line.startsWith('used_memory_human:'))
          ?.split(':')[1] || 'unknown';

      const dbSize = await client.dbsize();

      return {
        status: 'connected',
        latency: latency + 'ms',
        usedMemory,
        keyCount: dbSize,
      };
    } catch (error) {
      return {
        status: 'error',
        error: error.message,
      };
    }
  }
}
