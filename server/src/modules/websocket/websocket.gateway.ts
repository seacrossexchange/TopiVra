import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Logger, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { RedisService } from '../../common/redis/redis.service';

@WebSocketGateway({
  cors: {
    origin: true,
    credentials: true,
  },
  namespace: '/',
})
export class WebsocketGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server!: Server;

  private readonly logger = new Logger(WebsocketGateway.name);
  private userSockets: Map<string, Set<string>> = new Map();
  private jwtSecret: string;

  constructor(
    private jwtService: JwtService,
    private configService: ConfigService,
    @Inject(RedisService) private redisService: RedisService,
  ) {
    this.jwtSecret =
      this.configService.get<string>('JWT_SECRET') || 'default-secret-key';
  }

  async handleConnection(client: Socket) {
    try {
      const token =
        client.handshake.auth?.token ||
        client.handshake.headers?.authorization?.replace('Bearer ', '');

      if (!token) {
        this.logger.warn(`客户端连接被拒绝: 无 token, socketId: ${client.id}`);
        client.disconnect();
        return;
      }

      // Check if token is blacklisted (logged out)
      const isBlacklisted = await this.redisService.get(
        `token:blacklist:${token}`,
      );
      if (isBlacklisted) {
        this.logger.warn(
          `客户端连接被拒绝: token 已失效, socketId: ${client.id}`,
        );
        client.disconnect();
        return;
      }

      const payload = this.jwtService.verify(token, {
        secret: this.jwtSecret,
      });

      const userId = payload.sub;
      client.data.userId = userId;
      client.data.token = token;

      // 将用户加入专属房间
      client.join(`user:${userId}`);

      // 记录用户连接
      if (!this.userSockets.has(userId)) {
        this.userSockets.set(userId, new Set());
      }
      this.userSockets.get(userId)!.add(client.id);

      this.logger.log(`用户连接: ${userId}, socketId: ${client.id}`);
    } catch (error: unknown) {
      this.logger.warn(`客户端连接验证失败: ${(error as Error).message}`);
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    const userId = client.data.userId;
    if (userId) {
      const sockets = this.userSockets.get(userId);
      if (sockets) {
        sockets.delete(client.id);
        if (sockets.size === 0) {
          this.userSockets.delete(userId);
        }
      }
      this.logger.log(`用户断开连接: ${userId}, socketId: ${client.id}`);
    }
  }

  // 发送消息给指定用户
  sendToUser(userId: string, event: string, data: any) {
    this.server.to(`user:${userId}`).emit(event, data);
    this.logger.debug(`发送消息给用户 ${userId}: ${event}`);
  }

  // 发送消息给所有用户
  broadcast(event: string, data: any) {
    this.server.emit(event, data);
  }

  // 发送订单状态变更通知
  notifyOrderStatus(userId: string, orderNo: string, status: string) {
    this.sendToUser(userId, 'order:status_changed', {
      orderNo,
      status,
      timestamp: new Date(),
    });
  }

  // 发送新通知
  notifyNewNotification(userId: string, notification: any) {
    this.sendToUser(userId, 'notification:new', notification);
  }

  // 发送工单回复通知
  notifyTicketReply(userId: string, ticketNo: string, message: any) {
    this.sendToUser(userId, 'ticket:reply', {
      ticketNo,
      message,
      timestamp: new Date(),
    });
  }

  // 获取在线用户数量
  getOnlineUserCount(): number {
    return this.userSockets.size;
  }

  // 检查用户是否在线
  isUserOnline(userId: string): boolean {
    return (
      this.userSockets.has(userId) && this.userSockets.get(userId)!.size > 0
    );
  }

  // 心跳检测
  @SubscribeMessage('ping')
  handlePing(@ConnectedSocket() client: Socket) {
    client.emit('pong', { timestamp: new Date() });
  }

  // 订阅特定商品（用于库存变化等）
  @SubscribeMessage('subscribe:product')
  handleSubscribeProduct(
    @ConnectedSocket() client: Socket,
    @MessageBody() productId: string,
  ) {
    client.join(`product:${productId}`);
    return { success: true, message: `已订阅商品 ${productId}` };
  }

  // 取消订阅商品
  @SubscribeMessage('unsubscribe:product')
  handleUnsubscribeProduct(
    @ConnectedSocket() client: Socket,
    @MessageBody() productId: string,
  ) {
    client.leave(`product:${productId}`);
    return { success: true, message: `已取消订阅商品 ${productId}` };
  }
}
