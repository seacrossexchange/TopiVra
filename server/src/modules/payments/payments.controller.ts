import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
  Req,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiBody } from '@nestjs/swagger';
import { PaymentsService } from './payments.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Public } from '../auth/decorators/public.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { PaymentCallbackGuard } from './guards/payment-callback.guard';

@ApiTags('支付')
@Controller('payments')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  // ==================== 创建支付 ====================

  @Post('create')
  @ApiOperation({ summary: '创建支付订单' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        orderId: { type: 'string' },
        method: { type: 'string', enum: ['USDT', 'ALIPAY', 'WECHAT'] },
      },
      required: ['orderId', 'method'],
    },
  })
  async createPayment(
    @Body('orderId') orderId: string,
    @Body('method') method: string,
    @CurrentUser('id') _userId: string,
  ) {
    return this.paymentsService.createPayment(orderId, method);
  }

  // ==================== USDT 支付 ====================

  @Post('usdt/verify')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '验证 USDT 支付' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        paymentNo: { type: 'string' },
        txHash: { type: 'string' },
      },
      required: ['paymentNo', 'txHash'],
    },
  })
  async verifyUsdtPayment(
    @Body('paymentNo') paymentNo: string,
    @Body('txHash') txHash: string,
  ) {
    return this.paymentsService.verifyUsdtPayment(paymentNo, txHash);
  }

  // ==================== 支付宝回调 ====================

  @Public()
  @UseGuards(PaymentCallbackGuard)
  @Post('callback/alipay')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '支付宝支付回调' })
  async handleAlipayCallback(@Req() req: any) {
    return this.paymentsService.handleAlipayCallback(req.body);
  }

  // ==================== 微信支付回调 ====================

  @Public()
  @UseGuards(PaymentCallbackGuard)
  @Post('callback/wechat')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '微信支付回调' })
  async handleWechatCallback(@Req() req: any) {
    return this.paymentsService.handleWechatCallback(req.body);
  }

  // ==================== 查询支付状态 ====================

  @Get(':paymentNo/status')
  @ApiOperation({ summary: '查询支付状态' })
  async getPaymentStatus(@Param('paymentNo') paymentNo: string) {
    return this.paymentsService.getPaymentStatus(paymentNo);
  }

  // ==================== 取消支付 ====================

  @Post(':paymentNo/cancel')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '取消支付' })
  async cancelPayment(@Param('paymentNo') paymentNo: string) {
    return this.paymentsService.cancelPayment(paymentNo);
  }
}
