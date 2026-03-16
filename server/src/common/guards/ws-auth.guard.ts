import { CanActivate, ExecutionContext, Injectable, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { WsException } from '@nestjs/websockets';
import { Socket } from 'socket.io';
import { RedisService } from '../redis/redis.service';

/**
 * WebSocket 认证守卫
 * 验证 WebSocket 连接的 JWT Token
 */
@Injectable()
export class WsAuthGuard implements CanActivate {
  private readonly logger = new Logger(WsAuthGuard.name);
  private readonly jwtSecret: string;

  constructor(
    private jwtService: JwtService,
    private configService: ConfigService,
    private redisService: RedisService,
  ) {
    this.jwtSecret = this.configService.get<string>('JWT_SECRET') || 'default-secret-key';
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    try {
      const client: Socket = context.switchToWs().getClient();
      
      // 从握手或消息中提取 token
      const token = this.extractToken(client);

      if (!token) {
        this.logger.warn('WebSocket 连接缺少认证 token');
        throw new WsException('未授权：缺少认证令牌');
      }

      // 检查 token 是否在黑名单中（已登出）
      const isBlacklisted = await this.redisService.get(`token:blacklist:${token}`);
      if (isBlacklisted) {
        this.logger.warn('WebSocket 连接使用已失效的 token');
        throw new WsException('未授权：令牌已失效');
      }

      // 验证 token
      const payload = this.jwtService.verify(token, {
        secret: this.jwtSecret,
      });

      // 将用户信息附加到 socket
      client.data.userId = payload.sub;
      client.data.email = payload.email;
      client.data.roles = payload.roles || [];
      client.data.token = token;

      return true;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : '未知错误';
      this.logger.error(`WebSocket 认证失败: ${errorMessage}`);
      throw new WsException('未授权：认证失败');
    }
  }

  /**
   * 从 Socket 中提取 token
   */
  private extractToken(client: Socket): string | null {
    // 1. 从 auth 对象中获取
    if (client.handshake.auth?.token) {
      return client.handshake.auth.token;
    }

    // 2. 从 headers 中获取
    const authHeader = client.handshake.headers?.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      return authHeader.substring(7);
    }

    // 3. 从 query 参数中获取（不推荐，但作为备选）
    if (client.handshake.query?.token) {
      return client.handshake.query.token as string;
    }

    return null;
  }
}



