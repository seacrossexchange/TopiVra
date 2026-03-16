import { Controller, Get } from '@nestjs/common';
import { Public } from '../../modules/auth/decorators/public.decorator';
import {
  HealthCheck,
  HealthCheckService,
  HealthCheckResult,
  DiskHealthIndicator,
  MemoryHealthIndicator,
} from '@nestjs/terminus';
import { PrismaHealthIndicator } from './prisma.health';
import { RedisHealthIndicator } from './redis.health';

@Controller('health')
export class HealthController {
  constructor(
    private readonly health: HealthCheckService,
    private readonly prismaHealth: PrismaHealthIndicator,
    private readonly redisHealth: RedisHealthIndicator,
    private readonly disk: DiskHealthIndicator,
    private readonly memory: MemoryHealthIndicator,
  ) {}

  @Get()
  @Public()
  @HealthCheck()
  check(): Promise<HealthCheckResult> {
    return this.health.check([
      () => this.prismaHealth.isHealthy('database'),
      () => this.redisHealth.isHealthy('redis'),
      () =>
        this.disk.checkStorage('disk', {
          path: '/',
          thresholdPercent: 0.9, // 90% 使用率告警
        }),
      () => this.memory.checkHeap('memory_heap', 500 * 1024 * 1024), // 500MB
      () => this.memory.checkRSS('memory_rss', 1024 * 1024 * 1024), // 1GB
    ]);
  }

  @Get('liveness')
  @Public()
  @HealthCheck()
  liveness(): Promise<HealthCheckResult> {
    // Kubernetes liveness probe - 只检查进程是否存活
    return this.health.check([]);
  }

  @Get('readiness')
  @Public()
  @HealthCheck()
  readiness(): Promise<HealthCheckResult> {
    // Kubernetes readiness probe - 检查是否可以接收流量
    return this.health.check([
      () => this.prismaHealth.isHealthy('database'),
      () => this.redisHealth.isHealthy('redis'),
    ]);
  }

  // ---- Aliases (compat with existing probes / configs) ----

  @Get('live')
  @Public()
  @HealthCheck()
  liveAlias(): Promise<HealthCheckResult> {
    return this.liveness();
  }

  @Get('ready')
  @Public()
  @HealthCheck()
  readyAlias(): Promise<HealthCheckResult> {
    return this.readiness();
  }
}
