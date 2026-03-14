import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  Query,
  UseGuards,
  Res,
  Header,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { Response } from 'express';
import { DeliveryEventsService } from './delivery-events.service';
import { OrdersService } from './orders.service';
import {
  CreateOrderDto,
  UpdateOrderStatusDto,
  DeliverOrderDto,
  OrderQueryDto,
} from './dto/order.dto';
import {
  CreateRefundRequestDto,
  UpdateRefundRequestDto,
  AdminProcessRefundDto,
  SellerRespondRefundDto,
  RefundQueryDto,
  AdminRefundQueryDto,
} from './dto/refund.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { OrderRateLimitGuard } from '../../common/guards/order-rate-limit.guard';

@ApiTags('订单')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('orders')
export class OrdersController {
  constructor(
    private readonly ordersService: OrdersService,
    private readonly deliveryEventsService: DeliveryEventsService,
  ) {}

  // ==================== 买家端 ====================

  @Post()
  @UseGuards(OrderRateLimitGuard)
  @ApiOperation({ summary: '创建订单（买家）' })
  async create(@CurrentUser('id') userId: string, @Body() dto: CreateOrderDto) {
    return this.ordersService.create(userId, dto);
  }

  @Get('my')
  @ApiOperation({ summary: '我的订单列表（买家）' })
  async findMyOrders(
    @CurrentUser('id') userId: string,
    @Query() query: OrderQueryDto,
  ) {
    return this.ordersService.findByBuyer(userId, query);
  }

  @Get('no/:orderNo')
  @ApiOperation({ summary: '根据订单号查询' })
  @ApiParam({ name: 'orderNo', description: '订单号' })
  async findByOrderNo(
    @Param('orderNo') orderNo: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.ordersService.findByOrderNo(orderNo, userId);
  }

  @Get(':id')
  @ApiOperation({ summary: '订单详情' })
  @ApiParam({ name: 'id', description: '订单ID' })
  async findOne(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.ordersService.findOne(id, userId);
  }

  @Get(':id/delivery-stream')
  @Header('Content-Type', 'text/event-stream')
  @Header('Cache-Control', 'no-cache')
  @Header('Connection', 'keep-alive')
  @ApiOperation({ summary: '订单自动发货实时事件流（SSE）' })
  @ApiParam({ name: 'id', description: '订单ID' })
  async deliveryStream(@Param('id') id: string, @Res() res: Response) {
    res.flushHeaders();

    const subscription = this.deliveryEventsService
      .streamForOrder(id)
      .subscribe({
        next: (event) => {
          res.write(`data: ${JSON.stringify(event)}\n\n`);
          // 发货完成或全部失败后关闭连接
          if (
            event.type === 'COMPLETED' ||
            event.type === 'PARTIAL_FAILED' ||
            event.type === 'ERROR'
          ) {
            res.end();
          }
        },
        error: (err) => {
          res.write(
            `data: ${JSON.stringify({ type: 'ERROR', error: err.message, orderId: id, timestamp: Date.now() })}\n\n`,
          );
          res.end();
        },
      });

    // 客户端断开时取消订阅
    res.on('close', () => {
      subscription.unsubscribe();
    });
  }

  @Put(':id/cancel')
  @ApiOperation({ summary: '取消订单（买家）' })
  @ApiParam({ name: 'id', description: '订单ID' })
  async cancel(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @Body('reason') reason?: string,
  ) {
    return this.ordersService.cancel(id, userId, reason);
  }

  @Put(':id/confirm')
  @ApiOperation({ summary: '确认收货（买家）' })
  @ApiParam({ name: 'id', description: '订单ID' })
  async confirmDelivery(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.ordersService.confirmDelivery(id, userId);
  }

  // ==================== 卖家端 ====================

  @Get('seller/list')
  @Roles('SELLER')
  @UseGuards(RolesGuard)
  @ApiOperation({ summary: '卖家订单列表' })
  async findSellerOrders(
    @CurrentUser('id') userId: string,
    @Query() query: OrderQueryDto,
  ) {
    return this.ordersService.findBySeller(userId, query);
  }

  @Put('item/:orderItemId/deliver')
  @Roles('SELLER')
  @UseGuards(RolesGuard)
  @ApiOperation({ summary: '卖家交付商品' })
  @ApiParam({ name: 'orderItemId', description: '订单项ID' })
  async deliver(
    @Param('orderItemId') orderItemId: string,
    @CurrentUser('id') userId: string,
    @Body() dto: DeliverOrderDto,
  ) {
    return this.ordersService.deliver(orderItemId, userId, dto);
  }

  // ==================== 管理员端 ====================

  @Get('admin/all')
  @Roles('ADMIN')
  @UseGuards(RolesGuard)
  @ApiOperation({ summary: '管理员查询所有订单' })
  async findAll(@Query() query: OrderQueryDto) {
    return this.ordersService.findAll(query);
  }

  @Put('admin/:id/status')
  @Roles('ADMIN')
  @UseGuards(RolesGuard)
  @ApiOperation({ summary: '管理员更新订单状态' })
  @ApiParam({ name: 'id', description: '订单ID' })
  async updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateOrderStatusDto,
    @CurrentUser('id') adminId: string,
  ) {
    return this.ordersService.updateStatus(id, dto, adminId);
  }

  // ==================== 退款流程 ====================

  // 买家端
  @Post('refunds')
  @ApiOperation({ summary: '申请退款（买家）' })
  async createRefundRequest(
    @CurrentUser('id') userId: string,
    @Body() dto: CreateRefundRequestDto,
  ) {
    return this.ordersService.createRefundRequest(userId, dto);
  }

  @Get('refunds/my')
  @ApiOperation({ summary: '我的退款列表（买家）' })
  async findMyRefunds(
    @CurrentUser('id') userId: string,
    @Query() query: RefundQueryDto,
  ) {
    return this.ordersService.findRefundsByBuyer(userId, query);
  }

  @Put('refunds/:refundId')
  @ApiOperation({ summary: '修改退款申请（买家）' })
  @ApiParam({ name: 'refundId', description: '退款ID' })
  async updateRefundRequest(
    @Param('refundId') refundId: string,
    @CurrentUser('id') userId: string,
    @Body() dto: UpdateRefundRequestDto,
  ) {
    return this.ordersService.updateRefundRequest(refundId, userId, dto);
  }

  @Put('refunds/:refundId/cancel')
  @ApiOperation({ summary: '撤销退款申请（买家）' })
  @ApiParam({ name: 'refundId', description: '退款ID' })
  async cancelRefundRequest(
    @Param('refundId') refundId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.ordersService.cancelRefundRequest(refundId, userId);
  }

  @Put('refunds/:refundId/escalate')
  @ApiOperation({ summary: '申请平台介入（买家）' })
  @ApiParam({ name: 'refundId', description: '退款ID' })
  async escalateRefund(
    @Param('refundId') refundId: string,
    @CurrentUser('id') userId: string,
    @Body('reason') reason: string,
  ) {
    return this.ordersService.escalateRefund(refundId, userId, reason);
  }

  @Get('refunds/:refundId')
  @ApiOperation({ summary: '退款详情' })
  @ApiParam({ name: 'refundId', description: '退款ID' })
  async findRefundDetail(
    @Param('refundId') refundId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.ordersService.findRefundDetail(refundId, userId);
  }

  // 卖家端
  @Get('seller/refunds')
  @Roles('SELLER')
  @UseGuards(RolesGuard)
  @ApiOperation({ summary: '卖家退款列表' })
  async findSellerRefunds(
    @CurrentUser('id') userId: string,
    @Query() query: RefundQueryDto,
  ) {
    return this.ordersService.findRefundsBySeller(userId, query);
  }

  @Put('seller/refunds/:refundId/respond')
  @Roles('SELLER')
  @UseGuards(RolesGuard)
  @ApiOperation({ summary: '卖家响应退款申请' })
  @ApiParam({ name: 'refundId', description: '退款ID' })
  async sellerRespondRefund(
    @Param('refundId') refundId: string,
    @CurrentUser('id') userId: string,
    @Body() dto: SellerRespondRefundDto,
  ) {
    return this.ordersService.sellerRespondRefund(refundId, userId, dto);
  }

  // 管理员端
  @Get('admin/refunds')
  @Roles('ADMIN')
  @UseGuards(RolesGuard)
  @ApiOperation({ summary: '管理员查询所有退款' })
  async findAllRefunds(@Query() query: AdminRefundQueryDto) {
    return this.ordersService.findAllRefunds(query);
  }

  @Put('admin/refunds/:refundId/process')
  @Roles('ADMIN')
  @UseGuards(RolesGuard)
  @ApiOperation({ summary: '管理员处理退款' })
  @ApiParam({ name: 'refundId', description: '退款ID' })
  async processRefund(
    @Param('refundId') refundId: string,
    @CurrentUser('id') adminId: string,
    @Body() dto: AdminProcessRefundDto,
  ) {
    return this.ordersService.processRefund(refundId, adminId, dto);
  }
}
