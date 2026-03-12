import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { TicketsService } from './tickets.service';
import {
  CreateTicketDto,
  ReplyTicketDto,
  UpdateTicketDto,
  QueryTicketDto,
} from './dto/ticket.dto';

@ApiTags('tickets')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('tickets')
export class TicketsController {
  constructor(private readonly ticketsService: TicketsService) {}

  @Post()
  @ApiOperation({ summary: '创建工单' })
  async create(
    @CurrentUser('id') userId: string,
    @Body() dto: CreateTicketDto,
  ) {
    return this.ticketsService.create(userId, dto);
  }

  @Get()
  @ApiOperation({ summary: '获取我的工单列表' })
  async findByUser(
    @CurrentUser('id') userId: string,
    @Query() query: QueryTicketDto,
  ) {
    return this.ticketsService.findByUser(userId, query);
  }

  @Get(':id')
  @ApiOperation({ summary: '获取工单详情' })
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.ticketsService.findOne(id, userId, false);
  }

  @Post(':id/reply')
  @ApiOperation({ summary: '回复工单' })
  async reply(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('id') userId: string,
    @Body() dto: ReplyTicketDto,
  ) {
    return this.ticketsService.reply(id, userId, dto, false);
  }

  @Patch(':id/close')
  @ApiOperation({ summary: '关闭工单' })
  async close(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.ticketsService.close(id, userId, false);
  }
}

@ApiTags('admin/tickets')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
@Controller('admin/tickets')
export class AdminTicketsController {
  constructor(private readonly ticketsService: TicketsService) {}

  @Get()
  @ApiOperation({ summary: '管理员获取所有工单' })
  async findAll(@Query() query: QueryTicketDto) {
    return this.ticketsService.findAll(query);
  }

  @Get('stats')
  @ApiOperation({ summary: '获取工单统计' })
  async getStats() {
    return this.ticketsService.getStats();
  }

  @Get(':id')
  @ApiOperation({ summary: '管理员获取工单详情' })
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.ticketsService.findOne(id, undefined, true);
  }

  @Post(':id/reply')
  @ApiOperation({ summary: '管理员回复工单' })
  async reply(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('id') userId: string,
    @Body() dto: ReplyTicketDto,
  ) {
    return this.ticketsService.reply(id, userId, dto, true);
  }

  @Patch(':id')
  @ApiOperation({ summary: '管理员更新工单' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('id') userId: string,
    @Body() dto: UpdateTicketDto,
  ) {
    return this.ticketsService.update(id, dto, userId);
  }

  @Patch(':id/assign/:assigneeId')
  @ApiOperation({ summary: '指派工单' })
  async assign(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('assigneeId', ParseUUIDPipe) assigneeId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.ticketsService.assign(id, assigneeId, userId);
  }

  @Patch(':id/close')
  @ApiOperation({ summary: '管理员关闭工单' })
  async close(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.ticketsService.close(id, userId, true);
  }
}
