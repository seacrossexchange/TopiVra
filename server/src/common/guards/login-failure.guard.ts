import {
  Injectable,
  CanActivate,
  ExecutionContext,
  BadRequestException,
} from '@nestjs/common';
import { RedisService } from '../redis/redis.service';

@Injectable()
export class LoginFailureGuard implements CanActivate {
  constructor(private readonly redis: RedisService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const ip = request.ip;
    const key = `login:fail:${ip}`;

    const failCount = await this.redis.get(key);
    if (failCount && parseInt(failCount) >= 5) {
      throw new BadRequestException('登录失败次数过多，请 15 分钟后重试');
    }
    return true;
  }
}
