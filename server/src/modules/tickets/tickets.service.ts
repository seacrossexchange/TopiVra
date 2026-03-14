import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  CreateTicketDto,
  ReplyTicketDto,
  UpdateTicketDto,
  QueryTicketDto,
  TicketPriority,
} from './dto/ticket.dto';

@Injectable()
export class TicketsService {
  private readonly logger = new Logger(TicketsService.name);

  // SLA 配置：不同优先级对应的响应时限（小时）
  private readonly slaConfig: Record<TicketPriority, number> = {
    [TicketPriority.URGENT]: 2,
    [TicketPriority.HIGH]: 8,
    [TicketPriority.MEDIUM]: 24,
    [TicketPriority.LOW]: 72,
  };

  constructor(private prisma: PrismaService) {}

  // 生成工单编号
  private generateTicketNo(): string {
    const date = new Date();
    const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
    const random = Math.random().toString(36).substring(2, 8).toUpperCase();
    return `TK${dateStr}${random}`;
  }

  // 计算 SLA 截止时间
  private calculateSlaDeadline(priority: TicketPriority): Date {
    const hours = this.slaConfig[priority];
    const deadline = new Date();
    deadline.setHours(deadline.getHours() + hours);
    return deadline;
  }

  // 创建工单
  async create(userId: string, dto: CreateTicketDto) {
    const priority = dto.priority || TicketPriority.MEDIUM;
    const slaDeadline = this.calculateSlaDeadline(priority);

    const ticket = await this.prisma.ticket.create({
      data: {
        ticketNo: this.generateTicketNo(),
        userId,
        type: dto.type as any,
        priority: priority as any,
        status: 'OPEN' as any,
        subject: dto.subject,
        content: dto.content,
        slaLevel: priority,
        slaDeadline,
      },
      include: {
        user: {
          select: { id: true, username: true, email: true, avatar: true },
        },
      },
    });

    this.logger.log(`工单创建成功: ${ticket.ticketNo}, 用户: ${userId}`);
    return ticket;
  }

  // 用户查看自己的工单列表
  async findByUser(userId: string, query: QueryTicketDto) {
    const { page = 1, limit = 10, status, priority, type } = query;
    const skip = (page - 1) * limit;

    const where: any = { userId };
    if (status) where.status = status;
    if (priority) where.priority = priority;
    if (type) where.type = type;

    const [items, total] = await Promise.all([
      this.prisma.ticket.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: { id: true, username: true, avatar: true },
          },
          assignee: {
            select: { id: true, username: true, avatar: true },
          },
          messages: {
            take: 1,
            orderBy: { createdAt: 'desc' },
          },
        },
      }),
      this.prisma.ticket.count({ where }),
    ]);

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  // 管理员查看全部工单
  async findAll(query: QueryTicketDto) {
    const { page = 1, limit = 10, status, priority, type } = query;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (status) where.status = status;
    if (priority) where.priority = priority;
    if (type) where.type = type;

    const [items, total] = await Promise.all([
      this.prisma.ticket.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }],
        include: {
          user: {
            select: { id: true, username: true, email: true, avatar: true },
          },
          assignee: {
            select: { id: true, username: true, avatar: true },
          },
          _count: {
            select: { messages: true },
          },
        },
      }),
      this.prisma.ticket.count({ where }),
    ]);

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  // 获取工单详情
  async findOne(id: string, userId?: string, isAdmin: boolean = false) {
    const ticket = await this.prisma.ticket.findUnique({
      where: { id },
      include: {
        user: {
          select: { id: true, username: true, email: true, avatar: true },
        },
        assignee: {
          select: { id: true, username: true, avatar: true },
        },
        messages: {
          orderBy: { createdAt: 'asc' },
          include: {
            sender: {
              select: { id: true, username: true, avatar: true },
            },
          },
        },
      },
    });

    if (!ticket) {
      throw new NotFoundException('工单不存在');
    }

    // 权限检查：只有工单所有者或管理员可以查看
    if (!isAdmin && ticket.userId !== userId) {
      throw new ForbiddenException('无权查看此工单');
    }

    // 如果是普通用户，过滤掉内部备注
    if (!isAdmin) {
      ticket.messages = ticket.messages.filter((m) => !m.isInternal);
    }

    return ticket;
  }

  // 回复工单
  async reply(
    id: string,
    senderId: string,
    dto: ReplyTicketDto,
    isAdmin: boolean = false,
  ) {
    const ticket = await this.prisma.ticket.findUnique({
      where: { id },
    });

    if (!ticket) {
      throw new NotFoundException('工单不存在');
    }

    // 权限检查
    if (!isAdmin && ticket.userId !== senderId) {
      throw new ForbiddenException('无权回复此工单');
    }

    // 只有管理员可以发送内部备注
    if (dto.isInternal && !isAdmin) {
      throw new ForbiddenException('无权创建内部备注');
    }

    // 检查工单状态
    if (ticket.status === 'CLOSED') {
      throw new BadRequestException('工单已关闭，无法回复');
    }

    const message = await this.prisma.ticketMessage.create({
      data: {
        ticketId: id,
        senderId,
        content: dto.content,
        isInternal: dto.isInternal || false,
        attachments: dto.attachments as any,
      },
      include: {
        sender: {
          select: { id: true, username: true, avatar: true },
        },
      },
    });

    // 更新工单状态
    const updateData: any = { updatedAt: new Date() };
    if (isAdmin && ticket.status === 'OPEN') {
      updateData.status = 'IN_PROGRESS';
    } else if (!isAdmin && ticket.status === 'IN_PROGRESS') {
      updateData.status = 'WAITING';
    }

    await this.prisma.ticket.update({
      where: { id },
      data: updateData,
    });

    this.logger.log(`工单回复成功: ${ticket.ticketNo}, 发送者: ${senderId}`);
    return message;
  }

  // 更新工单状态/优先级/指派
  async update(id: string, dto: UpdateTicketDto, operatorId: string) {
    const ticket = await this.prisma.ticket.findUnique({
      where: { id },
    });

    if (!ticket) {
      throw new NotFoundException('工单不存在');
    }

    const updateData: any = {};

    if (dto.status) {
      updateData.status = dto.status;
      if (dto.status === 'CLOSED') {
        updateData.closedAt = new Date();
      }
    }

    if (dto.priority) {
      updateData.priority = dto.priority;
      updateData.slaLevel = dto.priority;
      updateData.slaDeadline = this.calculateSlaDeadline(dto.priority);
    }

    if (dto.assigneeId !== undefined) {
      updateData.assignedTo = dto.assigneeId;
    }

    const updated = await this.prisma.ticket.update({
      where: { id },
      data: updateData,
      include: {
        user: {
          select: { id: true, username: true, email: true, avatar: true },
        },
        assignee: {
          select: { id: true, username: true, avatar: true },
        },
      },
    });

    this.logger.log(`工单更新成功: ${ticket.ticketNo}, 操作者: ${operatorId}`);
    return updated;
  }

  // 指派工单
  async assign(id: string, assigneeId: string, operatorId: string) {
    return this.update(id, { assigneeId }, operatorId);
  }

  // 关闭工单
  async close(id: string, userId: string, isAdmin: boolean = false) {
    const ticket = await this.prisma.ticket.findUnique({
      where: { id },
    });

    if (!ticket) {
      throw new NotFoundException('工单不存在');
    }

    // 权限检查：只有工单所有者或管理员可以关闭
    if (!isAdmin && ticket.userId !== userId) {
      throw new ForbiddenException('无权关闭此工单');
    }

    // 已关闭的工单不能重复关闭
    if (ticket.status === 'CLOSED') {
      throw new BadRequestException('工单已关闭');
    }

    const updated = await this.prisma.ticket.update({
      where: { id },
      data: {
        status: 'CLOSED',
        closedAt: new Date(),
      },
    });

    this.logger.log(`工单关闭成功: ${ticket.ticketNo}`);
    return updated;
  }

  // 获取 SLA 即将超时的工单（用于定时任务）
  async getExpiringTickets(minutesBefore: number = 30): Promise<any[]> {
    const threshold = new Date();
    threshold.setMinutes(threshold.getMinutes() + minutesBefore);

    return this.prisma.ticket.findMany({
      where: {
        status: { notIn: ['CLOSED', 'RESOLVED'] },
        slaDeadline: {
          lte: threshold,
          gt: new Date(),
        },
      },
      include: {
        user: {
          select: { id: true, username: true, email: true },
        },
      },
    });
  }

  // 统计数据
  async getStats() {
    const [total, open, inProgress, resolved, closed] = await Promise.all([
      this.prisma.ticket.count(),
      this.prisma.ticket.count({ where: { status: 'OPEN' } }),
      this.prisma.ticket.count({ where: { status: 'IN_PROGRESS' } }),
      this.prisma.ticket.count({ where: { status: 'RESOLVED' } }),
      this.prisma.ticket.count({ where: { status: 'CLOSED' } }),
    ]);

    const urgentCount = await this.prisma.ticket.count({
      where: {
        priority: 'URGENT',
        status: { notIn: ['CLOSED', 'RESOLVED'] },
      },
    });

    return {
      total,
      open,
      inProgress,
      resolved,
      closed,
      urgentCount,
    };
  }
}
