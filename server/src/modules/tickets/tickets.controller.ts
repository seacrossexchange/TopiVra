import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { Request as ExpressRequest } from 'express';
import { TicketsService } from './tickets.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import {
  CreateRefundTicketDto,
  CreateDMTicketDto,
  SendMessageDto,
  SellerRespondDto,
  EscalateTicketDto,
  AdminProcessTicketDto,
  TicketQueryDto,
  BuyerRespondReplacementDto,
  DeliverReplacementDto,
} from './dto/ticket.dto';

@Controller('tickets')
@UseGuards(JwtAuthGuard)
export class TicketsController {
  constructor(private readonly ticketsService: TicketsService) {}

  // ==================== 买家接口 ====================

  /**
   * 创建退款工单
   */
  @Post('refund')
  async createRefundTicket(@Request() req: ExpressRequest & { user: any }, @Body() dto: CreateRefundTicketDto) {
    return this.ticketsService.createRefundTicket(req.user.userId, dto);
  }

  /**
   * 创建私信工单
   */
  @Post('dm')
  async createDMTicket(@Request() req: ExpressRequest & { user: any }, @Body() dto: CreateDMTicketDto) {
    return this.ticketsService.createDMTicket(req.user.userId, dto);
  }

  /**
   * 买家查询工单列表
   */
  @Get('buyer')
  async getBuyerTickets(@Request() req: ExpressRequest & { user: any }, @Query() query: TicketQueryDto) {
    return this.ticketsService.findByBuyer(req.user.userId, query);
  }

  /**
   * 买家工单统计
   */
  @Get('buyer/stats')
  async getBuyerStats(@Request() req: ExpressRequest & { user: any }) {
    return this.ticketsService.getBuyerStats(req.user.userId);
  }

  /**
   * 申请平台介入
   */
  @Put(':ticketNo/escalate')
  async escalateTicket(
    @Request() req: ExpressRequest & { user: any },
    @Param('ticketNo') ticketNo: string,
    @Body() dto: EscalateTicketDto,
  ) {
    return this.ticketsService.escalateToAdmin(ticketNo, req.user.userId, dto);
  }

  /**
   * 买家响应换货
   */
  @Put(':ticketNo/buyer-respond-replacement')
  async buyerRespondReplacement(
    @Request() req: ExpressRequest & { user: any },
    @Param('ticketNo') ticketNo: string,
    @Body() dto: BuyerRespondReplacementDto,
  ) {
    return this.ticketsService.buyerRespondReplacement(ticketNo, req.user.userId, dto);
  }

  /**
   * 买家确认换货
   */
  @Put(':ticketNo/confirm-replacement')
  async confirmReplacement(@Request() req: ExpressRequest & { user: any }, @Param('ticketNo') ticketNo: string) {
    return this.ticketsService.confirmReplacement(ticketNo, req.user.userId);
  }

  // ==================== 卖家接口 ====================

  /**
   * 卖家查询工单列表
   */
  @Get('seller')
  @Roles('SELLER')
  @UseGuards(RolesGuard)
  async getSellerTickets(@Request() req: ExpressRequest & { user: any }, @Query() query: TicketQueryDto) {
    return this.ticketsService.findBySeller(req.user.userId, query);
  }

  /**
   * 卖家工单统计
   */
  @Get('seller/stats')
  @Roles('SELLER')
  @UseGuards(RolesGuard)
  async getSellerStats(@Request() req: ExpressRequest & { user: any }) {
    return this.ticketsService.getSellerStats(req.user.userId);
  }

  /**
   * 卖家响应退款
   */
  @Put(':ticketNo/seller-respond')
  @Roles('SELLER')
  @UseGuards(RolesGuard)
  async sellerRespond(
    @Request() req: ExpressRequest & { user: any },
    @Param('ticketNo') ticketNo: string,
    @Body() dto: SellerRespondDto,
  ) {
    return this.ticketsService.sellerRespond(ticketNo, req.user.userId, dto);
  }

  /**
   * 卖家发货换货商品
   */
  @Put(':ticketNo/deliver-replacement')
  @Roles('SELLER')
  @UseGuards(RolesGuard)
  async deliverReplacement(
    @Request() req: ExpressRequest & { user: any },
    @Param('ticketNo') ticketNo: string,
    @Body() dto: DeliverReplacementDto,
  ) {
    return this.ticketsService.deliverReplacement(ticketNo, req.user.userId, dto);
  }

  // ==================== 管理员接口 ====================

  /**
   * 管理员查询所有工单
   */
  @Get('admin')
  @Roles('ADMIN')
  @UseGuards(RolesGuard)
  async getAdminTickets(@Query() query: TicketQueryDto) {
    return this.ticketsService.findAll(query);
  }

  /**
   * 管理员工单统计
   */
  @Get('admin/stats')
  @Roles('ADMIN')
  @UseGuards(RolesGuard)
  async getAdminStats() {
    return this.ticketsService.getAdminStats();
  }

  /**
   * 管理员处理工单
   */
  @Put(':ticketNo/admin-process')
  @Roles('ADMIN')
  @UseGuards(RolesGuard)
  async adminProcess(
    @Request() req: ExpressRequest & { user: any },
    @Param('ticketNo') ticketNo: string,
    @Body() dto: AdminProcessTicketDto,
  ) {
    return this.ticketsService.adminProcess(ticketNo, req.user.userId, dto);
  }

  // ==================== 通用接口 ====================

  /**
   * 获取工单详情
   */
  @Get(':ticketNo')
  async getTicket(@Request() req: ExpressRequest & { user: any }, @Param('ticketNo') ticketNo: string) {
    return this.ticketsService.findOne(ticketNo, req.user.userId);
  }

  /**
   * 发送消息
   */
  @Post(':ticketNo/messages')
  async sendMessage(
    @Request() req: ExpressRequest & { user: any },
    @Param('ticketNo') ticketNo: string,
    @Body() dto: SendMessageDto,
  ) {
    return this.ticketsService.sendMessage(ticketNo, req.user.userId, dto);
  }

  /**
   * 关闭工单
   */
  @Put(':ticketNo/close')
  async closeTicket(@Request() req: ExpressRequest & { user: any }, @Param('ticketNo') ticketNo: string) {
    return this.ticketsService.closeTicket(ticketNo, req.user.userId);
  }
}
