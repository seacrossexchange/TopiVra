import { Injectable, NestMiddleware, Logger, Optional } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { RedisService } from '../redis/redis.service';
import * as geoip from 'geoip-lite';
import dayjs from 'dayjs';

// 不统计的路径前缀
const SKIP_PATHS = ['/health', '/admin/', '/auth/', '/socket.io'];

@Injectable()
export class RequestLoggerMiddleware implements NestMiddleware {
  private logger = new Logger('HTTP');

  constructor(@Optional() private readonly redisService?: RedisService) {}

  use(req: Request, res: Response, next: NextFunction) {
    const { method, originalUrl, ip } = req;
    const userAgent = req.get('user-agent') || '';
    const startTime = Date.now();

    this.logger.log(`→ ${method} ${originalUrl} - ${ip} - ${userAgent}`);

    res.on('finish', () => {
      const { statusCode } = res;
      const duration = Date.now() - startTime;
      const logLevel = statusCode >= 500 ? 'error' : statusCode >= 400 ? 'warn' : 'log';
      this.logger[logLevel](
        `← ${method} ${originalUrl} ${statusCode} - ${duration}ms - ${ip}`,
      );

      // 只统计 GET 页面请求，跳过内部接口
      const shouldTrack =
        method === 'GET' &&
        statusCode < 400 &&
        !SKIP_PATHS.some((p) => originalUrl.startsWith(p));

      if (shouldTrack && this.redisService?.isAvailable()) {
        this.trackVisit(ip, userAgent).catch(() => {});
      }
    });

    next();
  }

  private async trackVisit(rawIp: string, userAgent: string): Promise<void> {
    // 过滤爬虫
    const botPattern = /bot|crawler|spider|slurp|bingbot|googlebot|facebookexternalhit/i;
    if (botPattern.test(userAgent)) return;

    const ip = rawIp.replace(/^::ffff:/, '').replace('::1', '127.0.0.1');
    const now = dayjs();
    const hourKey = now.format('YYYYMMDDH'); // e.g. 202603111
    const dayKey = now.format('YYYYMMDD');   // e.g. 20260311
    const ttl24h = 60 * 60 * 25; // 25小时
    const ttl30d = 60 * 60 * 24 * 31;

    if (!this.redisService) return;

    // 1. 实时在线：用 SET 存 IP，TTL 5分钟（每次请求刷新）
    const onlineKey = 'analytics:online:ips';
    await this.redisService.sadd(onlineKey, ip);
    // 单独维护每个 IP 的活跃时间戳（TTL 5分钟）
    await this.redisService.set(`analytics:online:ip:${ip}`, '1', 300);

    // 2. 24小时小时级访问量
    await this.redisService.incrWithExpire(`analytics:hourly:${hourKey}`, ttl24h);

    // 3. 30天日级访问量
    await this.redisService.incrWithExpire(`analytics:daily:${dayKey}`, ttl30d);

    // 4. 国家地区分布
    if (ip !== '127.0.0.1') {
      const geo = geoip.lookup(ip);
      const country = geo?.country || 'UNKNOWN';
      await this.redisService.hincrby(`analytics:geo:${dayKey}`, country, 1);
      await this.redisService.hexpire(`analytics:geo:${dayKey}`, ttl30d);
    }
  }
}
