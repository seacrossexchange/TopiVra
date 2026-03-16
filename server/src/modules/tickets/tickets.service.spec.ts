import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { TicketsService } from './tickets.service';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationService } from '../../common/notification';

// This spec is a lightweight unit smoke test aligned with the current
// TicketsService implementation (c2c_tickets + raw SQL), not the legacy Prisma `ticket` model.

describe('TicketsService', () => {
  let service: TicketsService;

  const prisma = {
    $queryRaw: jest.fn(),
    $queryRawUnsafe: jest.fn(),
    $executeRaw: jest.fn(),
    $executeRawUnsafe: jest.fn(),
  };

  const notificationService = {
    notifyUser: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TicketsService,
        { provide: PrismaService, useValue: prisma },
        { provide: NotificationService, useValue: notificationService },
      ],
    }).compile();

    service = module.get(TicketsService);
  });

  describe('findOne', () => {
    it('工单不存在时抛 NotFoundException', async () => {
      prisma.$queryRaw.mockResolvedValueOnce([]);

      await expect(service.findOne('TKT_NOT_FOUND', 'user-1')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('closeTicket', () => {
    it('工单不存在时抛 NotFoundException', async () => {
      prisma.$queryRaw.mockResolvedValueOnce([]);

      await expect(
        service.closeTicket('TKT_NOT_FOUND', 'user-1'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('getBuyerStats', () => {
    it('应返回统计字段（数字化）', async () => {
      prisma.$queryRaw.mockResolvedValueOnce([
        {
          total: 10,
          pending: 3,
          closed: 4,
          avgResponseTime: 12.6,
        },
      ]);

      const result = await service.getBuyerStats('buyer-1');

      expect(result).toEqual({
        total: 10,
        pending: 3,
        closed: 4,
        avgResponseTime: '13小时',
      });
    });
  });
});
