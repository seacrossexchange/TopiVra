import { Test, TestingModule } from '@nestjs/testing';
import { TicketsService } from './tickets.service';
import { PrismaService } from '../../prisma/prisma.service';
import { BadRequestException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { NotificationService } from '../../common/notification';
import { AuditService } from '../../common/audit';

describe('TicketsService', () => {
  let service: TicketsService;
  let prismaService: any;

  const mockTicket = {
    id: 'ticket-001',
    ticketNo: 'TKT20260001',
    userId: 'user-001',
    subject: '订单问题',
    category: 'ORDER',
    status: 'OPEN',
    priority: 'MEDIUM',
    createdAt: new Date(),
    updatedAt: new Date(),
    messages: [],
  };

  beforeEach(async () => {
    const mockPrisma = {
      ticket: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        count: jest.fn(),
      },
      ticketMessage: {
        create: jest.fn(),
        findMany: jest.fn(),
      },
      $transaction: jest.fn((fn: any) => fn(mockPrisma)),
    };

    const mockNotification = { notifyUser: jest.fn() };
    const mockAudit = { log: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TicketsService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: NotificationService, useValue: mockNotification },
        { provide: AuditService, useValue: mockAudit },
      ],
    }).compile();

    service = module.get<TicketsService>(TicketsService);
    prismaService = mockPrisma;
  });

  // -- create --------------------------------------------------
  describe('create', () => {
    it('应成功创建工单', async () => {
      prismaService.ticket.create.mockResolvedValue(mockTicket);

      const result = await service.create('user-001', {
        subject: '订单问题',
        category: 'ORDER',
        content: '我的订单出现了问题',
        priority: 'MEDIUM',
      } as any);

      expect(result).toBeDefined();
      expect(prismaService.ticket.create).toHaveBeenCalled();
    });
  });

  // -- findByUser ----------------------------------------------
  describe('findByUser', () => {
    it('应返回用户的工单列表', async () => {
      prismaService.ticket.findMany.mockResolvedValue([mockTicket]);
      prismaService.ticket.count.mockResolvedValue(1);

      const result = await service.findByUser('user-001', {});

      expect(result.items).toHaveLength(1);
    });

    it('应支持状态筛选', async () => {
      prismaService.ticket.findMany.mockResolvedValue([mockTicket]);
      prismaService.ticket.count.mockResolvedValue(1);

      await service.findByUser('user-001', { status: 'OPEN' });

      expect(prismaService.ticket.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ status: 'OPEN' }),
        }),
      );
    });
  });

  // -- findOne -------------------------------------------------
  describe('findOne', () => {
    it('应返回工单详情', async () => {
      prismaService.ticket.findUnique.mockResolvedValue(mockTicket);

      const result = await service.findOne('ticket-001', 'user-001');

      expect(result.id).toBe('ticket-001');
    });

    it('工单不存在 -> 应抛出 NotFoundException', async () => {
      prismaService.ticket.findUnique.mockResolvedValue(null);

      await expect(
        service.findOne('nonexistent', 'user-001'),
      ).rejects.toThrow(NotFoundException);
    });

    it('非工单所有者 -> 应抛出 ForbiddenException', async () => {
      prismaService.ticket.findUnique.mockResolvedValue(mockTicket);

      await expect(
        service.findOne('ticket-001', 'other-user'),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  // -- reply ---------------------------------------------------
  describe('reply', () => {
    it('工单所有者应能回复', async () => {
      prismaService.ticket.findUnique.mockResolvedValue(mockTicket);
      prismaService.ticketMessage.create.mockResolvedValue({
        id: 'msg-001',
        ticketId: 'ticket-001',
        senderId: 'user-001',
        content: '补充信息',
        createdAt: new Date(),
      });
      prismaService.ticket.update.mockResolvedValue(mockTicket);

      const result = await service.reply('ticket-001', 'user-001', {
        content: '补充信息',
      } as any);

      expect(result).toBeDefined();
    });

    it('已关闭的工单 -> 应抛出 BadRequestException', async () => {
      prismaService.ticket.findUnique.mockResolvedValue({
        ...mockTicket,
        status: 'CLOSED',
      });

      await expect(
        service.reply('ticket-001', 'user-001', { content: '...' } as any),
      ).rejects.toThrow(BadRequestException);
    });

    it('非工单相关用户 -> 应抛出 ForbiddenException', async () => {
      prismaService.ticket.findUnique.mockResolvedValue(mockTicket);

      await expect(
        service.reply('ticket-001', 'unrelated-user', { content: '...' } as any),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  // -- close ---------------------------------------------------
  describe('close', () => {
    it('工单所有者应能关闭工单', async () => {
      prismaService.ticket.findUnique.mockResolvedValue(mockTicket);
      prismaService.ticket.update.mockResolvedValue({
        ...mockTicket,
        status: 'CLOSED',
      });

      const result = await service.close('ticket-001', 'user-001');

      expect(result.success).toBe(true);
    });

    it('工单已关闭 -> 应抛出 BadRequestException', async () => {
      prismaService.ticket.findUnique.mockResolvedValue({
        ...mockTicket,
        status: 'CLOSED',
      });

      await expect(
        service.close('ticket-001', 'user-001'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // -- adminFindAll --------------------------------------------
  describe('adminFindAll', () => {
    it('管理员应能获取所有工单', async () => {
      prismaService.ticket.findMany.mockResolvedValue([mockTicket]);
      prismaService.ticket.count.mockResolvedValue(1);

      const result = await service.adminFindAll({});

      expect(result.items).toHaveLength(1);
    });

    it('应支持按状态筛选', async () => {
      prismaService.ticket.findMany.mockResolvedValue([]);
      prismaService.ticket.count.mockResolvedValue(0);

      await service.adminFindAll({ status: 'PENDING' });

      expect(prismaService.ticket.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ status: 'PENDING' }),
        }),
      );
    });
  });

  // -- adminReply ----------------------------------------------
  describe('adminReply', () => {
    it('管理员应能回复工单', async () => {
      prismaService.ticket.findUnique.mockResolvedValue(mockTicket);
      prismaService.ticketMessage.create.mockResolvedValue({
        id: 'admin-msg-001',
        ticketId: 'ticket-001',
        senderId: 'admin-001',
        content: '管理员回复',
        createdAt: new Date(),
      });
      prismaService.ticket.update.mockResolvedValue({
        ...mockTicket,
        status: 'ANSWERED',
      });

      const result = await service.adminReply('ticket-001', 'admin-001', {
        content: '管理员回复',
      } as any);

      expect(result).toBeDefined();
    });
  });
});
