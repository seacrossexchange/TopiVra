import { Injectable } from '@nestjs/common';
import {
  HealthIndicator,
  HealthIndicatorResult,
  HealthCheckError,
} from '@nestjs/terminus';
import { RedisService } from '../../common/redis/redis.service';

@Injectable()
export class RedisHealthIndicator extends HealthIndicator {
  constructor(private readonly redisService: RedisService) {
    super();
  }

  async isHealthy(key: string): Promise<HealthIndicatorResult> {
    try {
      const client = this.redisService.getClient();
      const result = await client!.ping();
      if (result === 'PONG') {
        return this.getStatus(key, true);
      }
      // ping 返回非 PONG，视为不健康
      throw new HealthCheckError(
        'Redis ping failed',
        this.getStatus(key, false, { message: 'Unexpected ping response' }),
      );
    } catch (error) {
      // 如果是 HealthCheckError 直接抛出
      if (error instanceof HealthCheckError) {
        throw error;
      }
      throw new HealthCheckError(
        'Redis check failed',
        this.getStatus(key, false, { message: (error as Error).message }),
      );
    }
  }
}
