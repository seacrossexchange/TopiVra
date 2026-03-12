import { Injectable, CanActivate, ExecutionContext, BadRequestException } from '@nestjs/common';
import { RedisService } from '../redis/redis.service';

@Injectable()
export class OrderRateLimitGuard implements CanActivate {
  constructor(private readonly redis: RedisService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const userId = request.user.id;

    const minuteKey = `order:rate:${userId}:minute`;
    const minuteCount = await this.redis.incr(minuteKey);
    await this.redis.expire(minuteKey, 60);
    if (minuteCount > 5) {
      throw new BadRequestException('下单过于频繁，请稍后再试');
    }

    const hourKey = `order:rate:${userId}:hour`;
    const hourCount = await this.redis.incr(hourKey);
    await this.redis.expire(hourKey, 3600);
    if (hourCount > 20) {
      throw new BadRequestException('下单次数超限，请 1 小时后重试');
    }

    return true;
  }
}
