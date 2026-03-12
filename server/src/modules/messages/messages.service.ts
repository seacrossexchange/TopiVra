import { Injectable, ForbiddenException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma';
import { SendMessageDto, MessageQueryDto, ConversationQueryDto, MarkAsReadDto } from './dto/message.dto';
import { MessageType } from '@prisma/client';

@Injectable()
export class MessagesService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * 发送消息
   */
  async sendMessage(senderId: string, dto: SendMessageDto) {
    // 检查接收者是否存在
    const receiver = await this.prisma.user.findUnique({
      where: { id: dto.receiverId },
      select: { id: true, status: true },
    });

    if (!receiver) {
      throw new NotFoundException('接收者不存在');
    }

    // 获取或创建会话
    const conversation = await this.getOrCreateConversation(senderId, dto.receiverId);

    // 创建消息
    const message = await this.prisma.message.create({
      data: {
        senderId,
        receiverId: dto.receiverId,
        conversationId: conversation.id,
        content: dto.content,
        messageType: dto.messageType || MessageType.TEXT,
        attachments: dto.attachments || undefined,
        orderId: dto.orderId,
        productId: dto.productId,
      },
      include: {
        sender: {
          select: { id: true, username: true, avatar: true },
        },
      },
    });

    // 更新会话
    await this.prisma.conversation.update({
      where: { id: conversation.id },
      data: {
        lastMessage: dto.content.substring(0, 100),
        lastMessageAt: new Date(),
        user2Unread: { increment: 1 }, // 假设 user2 是接收者
      },
    });

    return message;
  }

  /**
   * 获取或创建会话
   */
  private async getOrCreateConversation(user1Id: string, user2Id: string) {
    // 确保 user1Id < user2Id 以保证唯一性
    const [smallerId, largerId] = user1Id < user2Id ? [user1Id, user2Id] : [user2Id, user1Id];

    let conversation = await this.prisma.conversation.findUnique({
      where: {
        user1Id_user2Id: {
          user1Id: smallerId,
          user2Id: largerId,
        },
      },
    });

    if (!conversation) {
      conversation = await this.prisma.conversation.create({
        data: {
          user1Id: smallerId,
          user2Id: largerId,
        },
      });
    }

    return conversation;
  }

  /**
   * 获取会话列表
   */
  async getConversations(userId: string, query: ConversationQueryDto) {
    const { page = 1, limit = 20 } = query;
    const skip = (page - 1) * limit;

    const conversations = await this.prisma.conversation.findMany({
      where: {
        OR: [{ user1Id: userId }, { user2Id: userId }],
      },
      orderBy: { lastMessageAt: 'desc' },
      skip,
      take: limit,
    });

    // 获取对方用户信息
    const conversationsWithUsers = await Promise.all(
      conversations.map(async (conv) => {
        const isUser1 = conv.user1Id === userId;
        const otherUserId = isUser1 ? conv.user2Id : conv.user1Id;
        const unreadCount = isUser1 ? conv.user1Unread : conv.user2Unread;

        const otherUser = await this.prisma.user.findUnique({
          where: { id: otherUserId },
          select: { id: true, username: true, avatar: true },
        });

        return {
          id: conv.id,
          otherUser,
          lastMessage: conv.lastMessage,
          lastMessageAt: conv.lastMessageAt,
          unreadCount,
          createdAt: conv.createdAt,
        };
      })
    );

    return conversationsWithUsers;
  }

  /**
   * 获取消息列表
   */
  async getMessages(userId: string, query: MessageQueryDto) {
    const { userId: otherUserId, page = 1, limit = 20, unreadOnly } = query;
    const skip = (page - 1) * limit;

    const where: any = {
      OR: [{ senderId: userId }, { receiverId: userId }],
      AND: [
        { senderDeleted: false },
        { receiverDeleted: false },
      ],
    };

    if (otherUserId) {
      where.OR = [
        { senderId: userId, receiverId: otherUserId },
        { senderId: otherUserId, receiverId: userId },
      ];
    }

    if (unreadOnly) {
      where.isRead = false;
      where.receiverId = userId;
    }

    const messages = await this.prisma.message.findMany({
      where,
      include: {
        sender: {
          select: { id: true, username: true, avatar: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    });

    return messages.reverse(); // 按时间正序返回
  }

  /**
   * 标记消息为已读
   */
  async markAsRead(userId: string, dto: MarkAsReadDto) {
    const result = await this.prisma.message.updateMany({
      where: {
        id: { in: dto.messageIds },
        receiverId: userId,
        isRead: false,
      },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    });

    return { updated: result.count };
  }

  /**
   * 获取未读消息数
   */
  async getUnreadCount(userId: string) {
    const count = await this.prisma.message.count({
      where: {
        receiverId: userId,
        isRead: false,
        receiverDeleted: false,
      },
    });

    return { count };
  }

  /**
   * 删除消息（软删除）
   */
  async deleteMessage(userId: string, messageId: string) {
    const message = await this.prisma.message.findUnique({
      where: { id: messageId },
      select: { senderId: true, receiverId: true },
    });

    if (!message) {
      throw new NotFoundException('消息不存在');
    }

    if (message.senderId !== userId && message.receiverId !== userId) {
      throw new ForbiddenException('无权删除此消息');
    }

    // 软删除：标记对应用户已删除
    if (message.senderId === userId) {
      await this.prisma.message.update({
        where: { id: messageId },
        data: { senderDeleted: true },
      });
    } else {
      await this.prisma.message.update({
        where: { id: messageId },
        data: { receiverDeleted: true },
      });
    }

    return { success: true };
  }
}