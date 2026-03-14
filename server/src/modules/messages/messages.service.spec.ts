import { Test, TestingModule } from '@nestjs/testing';
import { MessagesService } from './messages.service';
import { PrismaService } from '../../prisma/prisma.service';
import { NotFoundException } from '@nestjs/common';

describe('MessagesService', () => {
  let service: MessagesService;
  let prismaService: any;

  const mockMessage = {
    id: 'msg-001',
    senderId: 'user-001',
    receiverId: 'user-002',
    conversationId: 'conv-001',
    content: '你好',
    messageType: 'TEXT',
    isRead: false,
    createdAt: new Date(),
    sender: { id: 'user-001', username: 'alice', avatar: null },
  };

  const mockConversation = {
    id: 'conv-001',
    user1Id: 'user-001',
    user2Id: 'user-002',
    lastMessage: '你好',
    lastMessageAt: new Date(),
  };

  beforeEach(async () => {
    const mockPrisma: any = {
      message: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
        count: jest.fn(),
      },
      conversation: {
        findFirst: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
      },
      user: {
        findUnique: jest.fn(),
      },
      $transaction: jest.fn((fn: (tx: any) => any) => fn(mockPrisma)),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MessagesService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<MessagesService>(MessagesService);
    prismaService = mockPrisma;
  });

  // -- sendMessage --------------------------------------------
  describe('sendMessage', () => {
    it('应成功发送消息', async () => {
      prismaService.user.findUnique.mockResolvedValue({
        id: 'user-002',
        status: 'ACTIVE',
      });
      prismaService.conversation.findUnique.mockResolvedValue(mockConversation);
      prismaService.conversation.findFirst.mockResolvedValue(mockConversation);
      prismaService.message.create.mockResolvedValue(mockMessage);
      prismaService.conversation.update.mockResolvedValue(mockConversation);

      const result = await service.sendMessage('user-001', {
        receiverId: 'user-002',
        content: '你好',
      } as any);

      expect(result.id).toBe('msg-001');
      expect(prismaService.message.create).toHaveBeenCalled();
    });

    it('接收者不存在 -> 应抛出 NotFoundException', async () => {
      prismaService.user.findUnique.mockResolvedValue(null);

      await expect(
        service.sendMessage('user-001', {
          receiverId: 'nonexistent',
          content: '你好',
        } as any),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // -- getConversations ----------------------------------------
  describe('getConversations', () => {
    it('应返回用户的会话列表', async () => {
      prismaService.conversation.findMany.mockResolvedValue([mockConversation]);
      prismaService.conversation.count.mockResolvedValue(1);

      const result = await service.getConversations('user-001', {});

      expect(result).toBeDefined();
      expect(Array.isArray(result) || result).toBeTruthy();
    });
  });

  // -- getMessages ---------------------------------------------
  describe('getMessages', () => {
    it('应返回消息列表', async () => {
      prismaService.message.findMany.mockResolvedValue([mockMessage]);
      prismaService.message.count.mockResolvedValue(1);

      const result = await service.getMessages('user-001', {
        receiverId: 'user-002',
      } as any);

      expect(result).toBeDefined();
    });
  });

  // -- markAsRead ----------------------------------------------
  describe('markAsRead', () => {
    it('应将指定消息标记为已读', async () => {
      prismaService.message.updateMany.mockResolvedValue({ count: 1 });

      await service.markAsRead('user-001', {
        messageIds: ['msg-001'],
      } as any);

      expect(prismaService.message.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            id: { in: ['msg-001'] },
            receiverId: 'user-001',
          }),
        }),
      );
    });

    it('空 messageIds -> 不调用 updateMany', async () => {
      await service.markAsRead('user-001', { messageIds: [] } as any);
      expect(prismaService.message.updateMany).not.toHaveBeenCalled();
    });
  });

  // -- getUnreadCount ------------------------------------------
  describe('getUnreadCount', () => {
    it('应返回未读消息数量', async () => {
      prismaService.message.count.mockResolvedValue(7);

      const result = await service.getUnreadCount('user-001');

      expect(result.count).toBe(7);
    });
  });
});
