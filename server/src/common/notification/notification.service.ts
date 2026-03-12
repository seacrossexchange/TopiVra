import { Injectable, Logger } from '@nestjs/common';
import { MailService } from '../mail/mail.service';
import { WebsocketGateway } from '../../modules/websocket/websocket.gateway';
import { PrismaService } from '../../prisma/prisma.service';

export enum NotificationType {
  ORDER_CREATED = 'ORDER_CREATED',
  ORDER_PAID = 'ORDER_PAID',
  ORDER_DELIVERED = 'ORDER_DELIVERED',
  ORDER_COMPLETED = 'ORDER_COMPLETED',
  ORDER_CANCELLED = 'ORDER_CANCELLED',
  ORDER_REFUND_REQUESTED = 'ORDER_REFUND_REQUESTED',
  ORDER_REFUNDED = 'ORDER_REFUNDED',
}

export interface NotificationPayload {
  type: NotificationType;
  title: string;
  content: string;
  orderId?: string;
  orderNo?: string;
  extra?: Record<string, any>;
}

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);

  constructor(
    private mailService: MailService,
    private websocketGateway: WebsocketGateway,
    private prisma: PrismaService,
  ) {}

  /**
   * 发送通知给用户（WebSocket + 邮件 + 数据库记录）
   */
  async notifyUser(
    userId: string,
    payload: NotificationPayload,
    userEmail?: string,
  ): Promise<void> {
    try {
      // 1. WebSocket 实时推送
      this.websocketGateway.notifyNewNotification(userId, {
        type: payload.type,
        title: payload.title,
        content: payload.content,
        orderId: payload.orderId,
        orderNo: payload.orderNo,
        timestamp: new Date(),
        ...payload.extra,
      });

      // 2. 存储到数据库
      await this.createNotificationRecord(userId, payload);

      // 3. 发送邮件通知
      if (userEmail) {
        await this.sendEmailNotification(userEmail, payload);
      }

      this.logger.debug(
        `通知已发送给用户 ${userId}: ${payload.type} - ${payload.title}`,
      );
    } catch (error) {
      this.logger.error(`发送通知失败: ${error.message}`, error.stack);
    }
  }

  /**
   * 发送通知给多个用户
   */
  async notifyUsers(
    userIds: string[],
    payload: NotificationPayload,
  ): Promise<void> {
    for (const userId of userIds) {
      await this.notifyUser(userId, payload);
    }
  }

  /**
   * 订单状态变更通知
   */
  async notifyOrderStatusChange(
    params: {
      orderId: string;
      orderNo: string;
      buyerId: string;
      buyerEmail?: string;
      sellerIds: string[];
      status: string;
      message: string;
    },
  ): Promise<void> {
    const { orderId, orderNo, buyerId, buyerEmail, sellerIds, status, message } =
      params;

    const type = this.getStatusNotificationType(status);
    if (!type) return;

    // 通知买家
    await this.notifyUser(buyerId, {
      type,
      title: `订单状态更新`,
      content: message,
      orderId,
      orderNo,
      extra: { status },
    });

    // 通知卖家
    const sellerMessage = this.getSellerMessage(status, orderNo);
    if (sellerMessage) {
      for (const sellerId of sellerIds) {
        await this.notifyUser(sellerId, {
          type,
          title: `订单状态更新`,
          content: sellerMessage,
          orderId,
          orderNo,
          extra: { status },
        });
      }
    }
  }

  /**
   * 创建数据库通知记录
   */
  private async createNotificationRecord(
    userId: string,
    payload: NotificationPayload,
  ): Promise<void> {
    try {
      await this.prisma.notification.create({
        data: {
          userId,
          type: payload.type,
          title: payload.title,
          content: payload.content,
          data: {
            orderId: payload.orderId,
            orderNo: payload.orderNo,
            ...payload.extra,
          },
        },
      });
    } catch (error) {
      this.logger.error(`创建通知记录失败: ${error.message}`);
    }
  }

  /**
   * 发送邮件通知
   */
  private async sendEmailNotification(
    email: string,
    payload: NotificationPayload,
  ): Promise<void> {
    const htmlContent = this.generateEmailContent(payload);
    await this.mailService.sendOrderNotification(
      email,
      payload.title,
      htmlContent,
    );
  }

  /**
   * 生成邮件内容
   */
  private generateEmailContent(payload: NotificationPayload): string {
    const platformName = process.env.PLATFORM_NAME || 'Topter C2C';

    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #3370FF 0%, #0052CC 100%); color: white; padding: 20px; border-radius: 8px 8px 0 0;">
          <h1 style="margin: 0; font-size: 20px;">${payload.title}</h1>
        </div>
        <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; border: 1px solid #e0e0e0; border-top: none;">
          <p style="font-size: 16px; color: #333; margin-bottom: 20px;">您好，</p>
          <p style="font-size: 16px; color: #333; margin-bottom: 20px;">${payload.content}</p>
          ${
            payload.orderNo
              ? `<p style="font-size: 14px; color: #666;">订单号: <strong>${payload.orderNo}</strong></p>`
              : ''
          }
        </div>
        <p style="font-size: 12px; color: #999; text-align: center; margin-top: 20px;">
          此邮件由 ${platformName} 系统自动发送，请勿回复。
        </p>
      </div>
    `;
  }

  /**
   * 获取状态对应的通知类型
   */
  private getStatusNotificationType(status: string): NotificationType | null {
    const mapping: Record<string, NotificationType> = {
      CREATED: NotificationType.ORDER_CREATED,
      PAID: NotificationType.ORDER_PAID,
      DELIVERED: NotificationType.ORDER_DELIVERED,
      COMPLETED: NotificationType.ORDER_COMPLETED,
      CANCELLED: NotificationType.ORDER_CANCELLED,
      REFUNDED: NotificationType.ORDER_REFUNDED,
    };
    return mapping[status] || null;
  }

  /**
   * 获取卖家通知消息
   */
  private getSellerMessage(status: string, orderNo: string): string | null {
    const messages: Record<string, string> = {
      CREATED: `您有新订单 ${orderNo}，请等待买家付款`,
      PAID: `订单 ${orderNo} 已付款，请尽快发货`,
      DELIVERED: `订单 ${orderNo} 已发货，等待买家确认`,
      COMPLETED: `订单 ${orderNo} 已完成，感谢您的服务`,
      CANCELLED: `订单 ${orderNo} 已取消`,
      REFUNDED: `订单 ${orderNo} 已退款`,
    };
    return messages[status] || null;
  }
}