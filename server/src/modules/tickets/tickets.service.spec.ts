import { Test, TestingModule } from '@nestjs/testing';
import { TicketsService } from './tickets.service';
import { PrismaService } from '../../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import { NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { TicketStatus, TicketPriority } from '@prisma/client';

describe('TicketsService', () => {
  let service: TicketsService;
  let prisma: any;

  const mockUserId = 'user-1';
  const mockTicket = {
    id: 'ticket-1',
    ticketNo: 'TKT001',
    userId: mockUserId,
    subject: 'Test Subject',
    description: 'Test Description',
    status: TicketStatus.OPEN,
    priority: TicketPriority.MEDIUM,
    category: 'GENERAL',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    prisma = {
      ticket: {
        create: jest.fn(),
        findUnique: jest.fn(),
        findMany: jest.fn(),
        update: jest.fn(),
        count: jest.fn(),
      },
      ticketMessage: {
        create: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
      },
      user: {
        findUnique: jest.fn(),
      },
      $transaction: jest.fn(),
    };

    const mockWebsocketGateway = {
      sendToUser: jest.fn(),
      notifyTicketReply: jest.fn(),
    };

    const mockNotificationService = {
      notifyUser: jest.fn(),
    };

    const mockMailService = {
      sendEmail: jest.fn(),
    };

    const mockAuditService = {
      log: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TicketsService,
        { provide: PrismaService, useValue: prisma },
        { provide: ConfigService, useValue: { get: jest.fn() } },
        { provide: 'WebsocketGateway', useValue: mockWebsocketGateway },
        { provide: 'NotificationService', useValue: mockNotificationService },
        { provide: 'MailService', useValue: mockMailService },
        { provide: 'AuditService', useValue: mockAuditService },
      ],
    }).compile();

    service = module.get<TicketsService>(TicketsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    const createDto = {
      subject: 'Test Subject',
      description: 'Test Description',
      category: 'GENERAL' as any,
      priority: TicketPriority.MEDIUM,
    };

    it('should create a ticket', async () => {
      prisma.ticket.create.mockResolvedValue(mockTicket);

      const result = await service.create(mockUserId, createDto);

      expect(result).toEqual(mockTicket);
      expect(prisma.ticket.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            userId: mockUserId,
            subject: createDto.subject,
            description: createDto.description,
          }),
        }),
      );
    });

    it('should generate unique ticket number', async () => {
      prisma.ticket.create.mockResolvedValue(mockTicket);

      await service.create(mockUserId, createDto);

      expect(prisma.ticket.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            ticketNo: expect.stringMatching(/^TKT\d+/),
          }),
        }),
      );
    });
  });

  describe('findAll', () => {
    it('should return paginated tickets for user', async () => {
      const mockTickets = [mockTicket];
      prisma.ticket.findMany.mockResolvedValue(mockTickets);
      prisma.ticket.count.mockResolvedValue(1);

      const result = await service.findAll(mockUserId, { page: 1, limit: 10 });

      expect(result.data).toEqual(mockTickets);
      expect(result.meta.total).toBe(1);
      expect(prisma.ticket.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: mockUserId },
        }),
      );
    });

    it('should filter by status', async () => {
      prisma.ticket.findMany.mockResolvedValue([mockTicket]);
      prisma.ticket.count.mockResolvedValue(1);

      await service.findAll(mockUserId, { 
        page: 1, 
        limit: 10, 
        status: TicketStatus.OPEN 
      });

      expect(prisma.ticket.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: TicketStatus.OPEN,
          }),
        }),
      );
    });
  });

  describe('findOne', () => {
    it('should throw NotFoundException if ticket not found', async () => {
      prisma.ticket.findUnique.mockResolvedValue(null);

      await expect(service.findOne(mockUserId, 'TKT001')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw ForbiddenException if user is not owner', async () => {
      prisma.ticket.findUnique.mockResolvedValue({
        ...mockTicket,
        userId: 'other-user',
      });

      await expect(service.findOne(mockUserId, 'TKT001')).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should return ticket with messages', async () => {
      const mockMessages = [
        { id: 'msg-1', content: 'Test message', isStaff: false },
      ];
      prisma.ticket.findUnique.mockResolvedValue({
        ...mockTicket,
        messages: mockMessages,
      });

      const result = await service.findOne(mockUserId, 'TKT001');

      expect(result).toEqual(expect.objectContaining({
        ticketNo: 'TKT001',
        messages: mockMessages,
      }));
    });
  });

  describe('reply', () => {
    const replyDto = {
      content: 'Test reply',
      attachments: [],
    };

    it('should throw NotFoundException if ticket not found', async () => {
      prisma.ticket.findUnique.mockResolvedValue(null);

      await expect(
        service.reply(mockUserId, 'TKT001', replyDto),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if ticket is closed', async () => {
      prisma.ticket.findUnique.mockResolvedValue({
        ...mockTicket,
        status: TicketStatus.CLOSED,
      });

      await expect(
        service.reply(mockUserId, 'TKT001', replyDto),
      ).rejects.toThrow(BadRequestException);
    });

    it('should create message and update ticket status', async () => {
      prisma.ticket.findUnique.mockResolvedValue(mockTicket);
      const mockMessage = {
        id: 'msg-1',
        content: replyDto.content,
        isStaff: false,
      };
      prisma.ticketMessage.create.mockResolvedValue(mockMessage);
      prisma.ticket.update.mockResolvedValue({
        ...mockTicket,
        status: TicketStatus.AWAITING_STAFF,
      });

      const result = await service.reply(mockUserId, 'TKT001', replyDto);

      expect(result).toEqual(mockMessage);
      expect(prisma.ticketMessage.create).toHaveBeenCalled();
      expect(prisma.ticket.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: TicketStatus.AWAITING_STAFF,
          }),
        }),
      );
    });
  });

  describe('close', () => {
    it('should throw NotFoundException if ticket not found', async () => {
      prisma.ticket.findUnique.mockResolvedValue(null);

      await expect(service.close(mockUserId, 'TKT001')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw ForbiddenException if user is not owner', async () => {
      prisma.ticket.findUnique.mockResolvedValue({
        ...mockTicket,
        userId: 'other-user',
      });

      await expect(service.close(mockUserId, 'TKT001')).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should close ticket', async () => {
      prisma.ticket.findUnique.mockResolvedValue(mockTicket);
      prisma.ticket.update.mockResolvedValue({
        ...mockTicket,
        status: TicketStatus.CLOSED,
      });

      const result = await service.close(mockUserId, 'TKT001');

      expect(result.status).toBe(TicketStatus.CLOSED);
      expect(prisma.ticket.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: TicketStatus.CLOSED,
          }),
        }),
      );
    });
  });

  describe('reopen', () => {
    it('should throw NotFoundException if ticket not found', async () => {
      prisma.ticket.findUnique.mockResolvedValue(null);

      await expect(service.reopen(mockUserId, 'TKT001')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw BadRequestException if ticket is not closed', async () => {
      prisma.ticket.findUnique.mockResolvedValue({
        ...mockTicket,
        status: TicketStatus.OPEN,
      });

      await expect(service.reopen(mockUserId, 'TKT001')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should reopen ticket', async () => {
      prisma.ticket.findUnique.mockResolvedValue({
        ...mockTicket,
        status: TicketStatus.CLOSED,
      });
      prisma.ticket.update.mockResolvedValue({
        ...mockTicket,
        status: TicketStatus.OPEN,
      });

      const result = await service.reopen(mockUserId, 'TKT001');

      expect(result.status).toBe(TicketStatus.OPEN);
    });
  });

  describe('getStats', () => {
    it('should return ticket statistics', async () => {
      prisma.ticket.count
        .mockResolvedValueOnce(10) // total
        .mockResolvedValueOnce(3)  // open
        .mockResolvedValueOnce(2)  // awaiting_staff
        .mockResolvedValueOnce(1)  // awaiting_user
        .mockResolvedValueOnce(4); // closed

      const result = await service.getStats(mockUserId);

      expect(result).toEqual({
        total: 10,
        open: 3,
        awaitingStaff: 2,
        awaitingUser: 1,
        closed: 4,
      });
    });
  });
});
