import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationQueryDto } from './dto/notification.dto';

@Injectable()
export class NotificationsService {
  constructor(private prisma: PrismaService) {}

  /**
   * 获取用户通知列表
   */
  async findByUser(userId: string, query: NotificationQueryDto) {
    const { page = 1, limit = 20, isRead, type } = query;
    const skip = (page - 1) * limit;

    const where: any = { userId };
    if (isRead !== undefined) {
      where.isRead = isRead === 'true' || isRead === true;
    }
    if (type) {
      where.type = type;
    }

    const [items, total] = await Promise.all([
      this.prisma.notification.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.notification.count({ where }),
    ]);

    return { items, total, page, limit };
  }

  /**
   * 获取未读通知数量
   */
  async getUnreadCount(userId: string) {
    const count = await this.prisma.notification.count({
      where: {
        userId,
        isRead: false,
      },
    });

    return { count };
  }

  /**
   * 标记单条通知为已读
   */
  async markAsRead(notificationId: string, userId: string) {
    const notification = await this.prisma.notification.findUnique({
      where: { id: notificationId },
    });

    if (!notification) {
      throw new NotFoundException('通知不存在');
    }

    if (notification.userId !== userId) {
      throw new ForbiddenException('无权操作此通知');
    }

    const updated = await this.prisma.notification.update({
      where: { id: notificationId },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    });

    return updated;
  }

  /**
   * 标记所有通知为已读
   */
  async markAllAsRead(userId: string) {
    const result = await this.prisma.notification.updateMany({
      where: {
        userId,
        isRead: false,
      },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    });

    return {
      success: true,
      count: result.count,
      message: `已标记 ${result.count} 条通知为已读`,
    };
  }
}








