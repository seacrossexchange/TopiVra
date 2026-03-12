import { Test, TestingModule } from '@nestjs/testing';
import { NotificationsService } from './notifications.service';
import { PrismaService } from '../../prisma/prisma.service';
import { NotFoundException, ForbiddenException } from '@nestjs/common';

describe('NotificationsService', () => {
  let service: NotificationsService;
  let prismaService: any;

  const mockNotification = {
    id: 'notif-001',
    userId: 'user-001',
    type: 'SYSTEM',
    title: '系统通知',
    content: '内容',
    status: 'UNREAD',
    priority: 'MEDIUM',
    createdAt: new Date(),
  };

  beforeEach(async () => {
    const mockPrisma = {
      notification: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
        delete: jest.fn(),
        count: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationsService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<NotificationsService>(NotificationsService);
    prismaService = mockPrisma;
  });

  // -- findByUser ----------------------------------------------
  describe('findByUser', () => {
    it('应返回用户的通知列表', async () => {
      prismaService.notification.findMany.mockResolvedValue([mockNotification]);
      prismaService.notification.count.mockResolvedValue(1);

      const result = await service.findByUser('user-001', {});

      expect(result.items).toHaveLength(1);
      expect(result.total).toBe(1);
    });

    it('应返回未读数量', async () => {
      prismaService.notification.findMany.mockResolvedValue([mockNotification]);
      prismaService.notification.count
        .mockResolvedValueOnce(1)  // total
        .mockResolvedValueOnce(1); // unreadCount

      const result = await service.findByUser('user-001', {});

      expect(result).toHaveProperty('unreadCount');
    });
  });

  // -- markAsRead ----------------------------------------------
  describe('markAsRead', () => {
    it('应将指定通知标记为已读', async () => {
      prismaService.notification.findUnique.mockResolvedValue(mockNotification);
      prismaService.notification.update.mockResolvedValue({
        ...mockNotification,
        status: 'READ',
      });

      const result = await service.markAsRead('notif-001', 'user-001');

      expect(result).toBeDefined();
      expect(prismaService.notification.update).toHaveBeenCalled();
    });

    it('通知不存在 -> 应抛出 NotFoundException', async () => {
      prismaService.notification.findUnique.mockResolvedValue(null);

      await expect(
        service.markAsRead('nonexistent', 'user-001'),
      ).rejects.toThrow(NotFoundException);
    });

    it('非通知所有者 -> 应抛出 ForbiddenException', async () => {
      prismaService.notification.findUnique.mockResolvedValue(mockNotification);

      await expect(
        service.markAsRead('notif-001', 'other-user'),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  // -- markAllAsRead -------------------------------------------
  describe('markAllAsRead', () => {
    it('应将用户所有未读通知标记为已读', async () => {
      prismaService.notification.updateMany.mockResolvedValue({ count: 3 });

      const result = await service.markAllAsRead('user-001');

      expect(result.success).toBe(true);
      expect(prismaService.notification.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            userId: 'user-001',
            status: 'UNREAD',
          }),
        }),
      );
    });
  });

  // -- delete --------------------------------------------------
  describe('delete', () => {
    it('应成功删除通知', async () => {
      prismaService.notification.findUnique.mockResolvedValue(mockNotification);
      prismaService.notification.delete.mockResolvedValue(mockNotification);

      const result = await service.delete('notif-001', 'user-001');

      expect(result.success).toBe(true);
    });

    it('非通知所有者 -> 应抛出 ForbiddenException', async () => {
      prismaService.notification.findUnique.mockResolvedValue(mockNotification);

      await expect(
        service.delete('notif-001', 'other-user'),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  // -- getUnreadCount ------------------------------------------
  describe('getUnreadCount', () => {
    it('应返回用户未读通知数量', async () => {
      prismaService.notification.count.mockResolvedValue(5);

      const result = await service.getUnreadCount('user-001');

      expect(result.count).toBe(5);
    });
  });
});
