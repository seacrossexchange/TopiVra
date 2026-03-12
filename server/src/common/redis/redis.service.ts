import {
  Injectable,
  Logger,
  OnModuleInit,
  OnModuleDestroy,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private client: Redis | null = null;
  private isInitialized = false;

  constructor(private configService: ConfigService) {}

  async onModuleInit() {
    const redisUrl = this.configService.get('REDIS_URL');
    if (!redisUrl) {
      this.logger.warn('REDIS_URL 未配置，Redis 缓存功能将禁用');
      return;
    }

    try {
      this.client = new Redis(redisUrl);
      this.client.on('connect', () => {
        this.logger.log('Redis 连接成功');
        this.isInitialized = true;
      });
      this.client.on('error', (err) => {
        this.logger.error(`Redis 连接错误: ${err.message}`);
      });
    } catch (error) {
      this.logger.error(`Redis 初始化失败: ${error.message}`);
    }
  }

  async onModuleDestroy() {
    if (this.client) {
      await this.client.quit();
    }
  }

  isAvailable(): boolean {
    return this.isInitialized && this.client !== null;
  }

  async get(key: string): Promise<string | null> {
    if (!this.client) return null;
    return this.client.get(key);
  }

  async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
    if (!this.client) return;
    if (ttlSeconds) {
      await this.client.setex(key, ttlSeconds, value);
    } else {
      await this.client.set(key, value);
    }
  }

  async del(key: string): Promise<void> {
    if (!this.client) return;
    await this.client.del(key);
  }

  async exists(key: string): Promise<boolean> {
    if (!this.client) return false;
    const result = await this.client.exists(key);
    return result === 1;
  }

  async expire(key: string, seconds: number): Promise<void> {
    if (!this.client) return;
    await this.client.expire(key, seconds);
  }

  async incr(key: string): Promise<number> {
    if (!this.client) return 0;
    return this.client.incr(key);
  }

  async decr(key: string): Promise<number> {
    if (!this.client) return 0;
    return this.client.decr(key);
  }

  async hset(key: string, field: string, value: string): Promise<void> {
    if (!this.client) return;
    await this.client.hset(key, field, value);
  }

  async hget(key: string, field: string): Promise<string | null> {
    if (!this.client) return null;
    return this.client.hget(key, field);
  }

  async hgetall(key: string): Promise<Record<string, string>> {
    if (!this.client) return {};
    return this.client.hgetall(key);
  }

  async hdel(key: string, field: string): Promise<void> {
    if (!this.client) return;
    await this.client.hdel(key, field);
  }

  async lpush(key: string, value: string): Promise<void> {
    if (!this.client) return;
    await this.client.lpush(key, value);
  }

  async rpop(key: string): Promise<string | null> {
    if (!this.client) return null;
    return this.client.rpop(key);
  }

  async lrange(key: string, start: number, stop: number): Promise<string[]> {
    if (!this.client) return [];
    return this.client.lrange(key, start, stop);
  }

  async sadd(key: string, member: string): Promise<void> {
    if (!this.client) return;
    await this.client.sadd(key, member);
  }

  async smembers(key: string): Promise<string[]> {
    if (!this.client) return [];
    return this.client.smembers(key);
  }

  async srem(key: string, member: string): Promise<void> {
    if (!this.client) return;
    await this.client.srem(key, member);
  }

  async scard(key: string): Promise<number> {
    if (!this.client) return 0;
    return this.client.scard(key);
  }

  async keys(pattern: string): Promise<string[]> {
    if (!this.client) return [];
    return this.client.keys(pattern);
  }

  // 原子 INCR + 设置过期时间（如果是新 key）
  async incrWithExpire(key: string, ttlSeconds: number): Promise<number> {
    if (!this.client) return 0;
    const val = await this.client.incr(key);
    if (val === 1) {
      await this.client.expire(key, ttlSeconds);
    }
    return val;
  }

  // Hash incr
  async hincrby(key: string, field: string, increment: number): Promise<number> {
    if (!this.client) return 0;
    return this.client.hincrby(key, field, increment);
  }

  // 设置 Hash 过期
  async hexpire(key: string, ttlSeconds: number): Promise<void> {
    if (!this.client) return;
    await this.client.expire(key, ttlSeconds);
  }

  // 获取所有 hash key-value 对
  async hgetallWithKeys(key: string): Promise<Record<string, string>> {
    if (!this.client) return {};
    return this.client.hgetall(key);
  }

  getClient(): Redis | null {
    return this.client;
  }
}
