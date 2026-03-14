import {
  Injectable,
  CanActivate,
  ExecutionContext,
  Logger,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';
import { RedisService } from '../../../common/redis/redis.service';

/**
 * 支付回调安全守卫
 * 功能:
 * 1. IP 白名单验证
 * 2. 防重放攻击（幂等性）
 * 3. 请求频率限制
 */
@Injectable()
export class PaymentCallbackGuard implements CanActivate {
  private readonly logger = new Logger(PaymentCallbackGuard.name);

  // 支付宝回调 IP 白名单（示例）
  private readonly alipayIpWhitelist: string[] = [
    '110.75.0.0/16',
    '110.76.0.0/17',
    '110.76.128.0/18',
    '110.75.151.0/24',
    '203.6.119.0/24',
    '203.6.120.0/24',
  ];

  // 微信支付回调 IP 白名单（示例，需要从微信官方获取最新列表）
  private readonly wechatIpWhitelist: string[] = [
    '101.226.103.0/24',
    '101.226.62.0/24',
    '140.207.54.0/24',
    '157.255.6.0/24',
    '58.251.80.0/24',
    '58.251.94.0/24',
    '59.36.101.0/24',
  ];

  constructor(
    private configService: ConfigService,
    private redisService: RedisService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const path = request.path;

    // 判断是哪种支付回调
    let provider: 'alipay' | 'wechat';
    let ipWhitelist: string[];

    if (path.includes('/callback/alipay')) {
      provider = 'alipay';
      ipWhitelist = this.alipayIpWhitelist;
    } else if (path.includes('/callback/wechat')) {
      provider = 'wechat';
      ipWhitelist = this.wechatIpWhitelist;
    } else {
      // 非支付回调，放行
      return true;
    }

    const clientIp = this.getClientIp(request);

    // 检查是否禁用 IP 白名单（开发环境）
    const disableIpWhitelist = this.configService.get(
      'PAYMENT_CALLBACK_DISABLE_IP_WHITELIST',
      'false',
    );
    if (disableIpWhitelist !== 'true') {
      // IP 白名单验证
      if (!this.isIpInWhitelist(clientIp, ipWhitelist)) {
        this.logger.warn(
          `支付回调 IP 不在白名单: ${clientIp}, provider: ${provider}`,
        );
        throw new HttpException(
          {
            code: 'IP_NOT_ALLOWED',
            message: '请求来源 IP 不被允许',
          },
          HttpStatus.FORBIDDEN,
        );
      }
    }

    // 防重放攻击
    const idempotencyKey = this.getIdempotencyKey(provider, request.body);
    if (idempotencyKey) {
      const isProcessed = await this.checkAndSetIdempotencyKey(idempotencyKey);
      if (isProcessed) {
        this.logger.warn(
          `重复的支付回调请求: ${idempotencyKey}, provider: ${provider}`,
        );
        // 返回成功状态，避免支付平台重试
        throw new HttpException(
          {
            code: 'DUPLICATE_REQUEST',
            message: provider === 'alipay' ? 'success' : 'SUCCESS',
          },
          HttpStatus.OK,
        );
      }
    }

    // 请求频率限制（同一 IP 每分钟最多 100 次）
    const rateLimitKey = `payment_callback_rate:${clientIp}`;
    const isRateLimited = await this.checkRateLimit(rateLimitKey, 100, 60);
    if (isRateLimited) {
      this.logger.warn(
        `支付回调频率限制触发: ${clientIp}, provider: ${provider}`,
      );
      throw new HttpException(
        {
          code: 'RATE_LIMITED',
          message: '请求过于频繁',
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    this.logger.log(`支付回调验证通过: provider=${provider}, ip=${clientIp}`);

    return true;
  }

  /**
   * 获取客户端真实 IP
   */
  private getClientIp(request: Request): string {
    const forwarded = request.headers['x-forwarded-for'];
    if (forwarded) {
      const ips = Array.isArray(forwarded)
        ? forwarded
        : forwarded.split(',').map((ip) => ip.trim());
      // 取第一个非私有 IP
      for (const ip of ips) {
        if (!this.isPrivateIp(ip)) {
          return ip;
        }
      }
      return ips[0];
    }

    const realIp = request.headers['x-real-ip'];
    if (realIp) {
      return Array.isArray(realIp) ? realIp[0] : realIp;
    }

    return request.ip || request.socket.remoteAddress || '0.0.0.0';
  }

  /**
   * 检查是否为私有 IP
   */
  private isPrivateIp(ip: string): boolean {
    return (
      ip.startsWith('10.') ||
      ip.startsWith('172.16.') ||
      ip.startsWith('172.17.') ||
      ip.startsWith('172.18.') ||
      ip.startsWith('172.19.') ||
      ip.startsWith('172.20.') ||
      ip.startsWith('172.21.') ||
      ip.startsWith('172.22.') ||
      ip.startsWith('172.23.') ||
      ip.startsWith('172.24.') ||
      ip.startsWith('172.25.') ||
      ip.startsWith('172.26.') ||
      ip.startsWith('172.27.') ||
      ip.startsWith('172.28.') ||
      ip.startsWith('172.29.') ||
      ip.startsWith('172.30.') ||
      ip.startsWith('172.31.') ||
      ip.startsWith('192.168.') ||
      ip === '127.0.0.1' ||
      ip === '::1'
    );
  }

  /**
   * 检查 IP 是否在白名单中
   */
  private isIpInWhitelist(ip: string, whitelist: string[]): boolean {
    // 如果白名单为空（未配置），允许所有 IP
    if (whitelist.length === 0) {
      return true;
    }

    for (const allowed of whitelist) {
      if (this.matchIp(ip, allowed)) {
        return true;
      }
    }

    return false;
  }

  /**
   * IP 匹配（支持 CIDR 格式）
   */
  private matchIp(ip: string, pattern: string): boolean {
    // 精确匹配
    if (!pattern.includes('/')) {
      return ip === pattern;
    }

    // CIDR 匹配
    const [network, prefixStr] = pattern.split('/');
    const prefix = parseInt(prefixStr, 10);

    const ipNum = this.ipToNumber(ip);
    const networkNum = this.ipToNumber(network);

    if (ipNum === null || networkNum === null) {
      return false;
    }

    const mask = ~((1 << (32 - prefix)) - 1);
    return (ipNum & mask) === (networkNum & mask);
  }

  /**
   * IP 转数字
   */
  private ipToNumber(ip: string): number | null {
    const parts = ip.split('.');
    if (parts.length !== 4) {
      return null;
    }

    let result = 0;
    for (let i = 0; i < 4; i++) {
      const part = parseInt(parts[i], 10);
      if (isNaN(part) || part < 0 || part > 255) {
        return null;
      }
      result = (result << 8) | part;
    }

    return result >>> 0;
  }

  /**
   * 获取幂等性 Key
   */
  private getIdempotencyKey(
    provider: 'alipay' | 'wechat',
    body: any,
  ): string | null {
    if (!body) {
      return null;
    }

    // 支付宝使用 out_trade_no
    if (provider === 'alipay' && body.out_trade_no) {
      return `payment:alipay:${body.out_trade_no}:${body.trade_no || ''}`;
    }

    // 微信支付使用 out_trade_no 和 transaction_id
    if (provider === 'wechat' && body.out_trade_no) {
      return `payment:wechat:${body.out_trade_no}:${body.transaction_id || ''}`;
    }

    return null;
  }

  /**
   * 检查并设置幂等性 Key
   * 返回 true 表示已处理过（重复请求）
   */
  private async checkAndSetIdempotencyKey(key: string): Promise<boolean> {
    const redis = this.redisService.getClient();
    if (!redis) {
      return false;
    }
    const existing = await redis.get(key);

    if (existing) {
      return true; // 已存在，表示重复请求
    }

    // 设置 Key，24 小时过期
    await redis.setex(key, 24 * 60 * 60, '1');
    return false;
  }

  /**
   * 检查频率限制
   */
  private async checkRateLimit(
    key: string,
    limit: number,
    windowSeconds: number,
  ): Promise<boolean> {
    const redis = this.redisService.getClient();
    if (!redis) {
      return false;
    }
    const current = await redis.incr(key);

    if (current === 1) {
      // 第一次请求，设置过期时间
      await redis.expire(key, windowSeconds);
    }

    return current > limit;
  }
}
