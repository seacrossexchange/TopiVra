import {
  Controller,
  Post,
  Get,
  Put,
  Patch,
  Body,
  Param,
  UseGuards,
  Request,
  Query,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiQuery,
  ApiParam,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Public } from '../auth/decorators/public.decorator';
import { SellersService } from './sellers.service';
import { ApplySellerDto } from './dto/apply-seller.dto';
import { RequestWithdrawalDto } from './dto/withdrawal.dto';
import { TransactionFiltersDto } from './dto/transaction-filters.dto';
import { UpdateSellerProfileDto } from './dto/update-profile.dto';

@ApiTags('卖家')
@Controller('sellers')
export class SellersController {
  constructor(private readonly sellersService: SellersService) {}

  // ==================== 公开卖家信息 ====================

  @Get(':id/public')
  @Public()
  @ApiOperation({ summary: '获取公开卖家信息' })
  @ApiParam({ name: 'id', description: '卖家ID' })
  async getPublicSellerInfo(@Param('id') sellerId: string) {
    return this.sellersService.getPublicSellerInfo(sellerId);
  }

  // ==================== 卖家申请 ====================

  @Post('apply')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '申请成为卖家' })
  async applySeller(@Request() req, @Body() applySellerDto: ApplySellerDto) {
    return this.sellersService.applySeller(req.user.userId, applySellerDto);
  }

  // ==================== 卖家资料 ====================

  @Get('profile')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SELLER')
  @ApiBearerAuth()
  @ApiOperation({ summary: '获取卖家资料' })
  async getSellerProfile(@Request() req) {
    return this.sellersService.getSellerProfile(req.user.userId);
  }

  @Put('profile')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SELLER')
  @ApiBearerAuth()
  @ApiOperation({ summary: '更新卖家资料' })
  async updateSellerProfile(
    @Request() req,
    @Body() dto: UpdateSellerProfileDto,
  ) {
    return this.sellersService.updateSellerProfile(req.user.userId, dto);
  }

  // ==================== 卖家仪表盘 ====================

  @Get('dashboard/stats')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SELLER')
  @ApiBearerAuth()
  @ApiOperation({ summary: '获取卖家仪表盘统计' })
  async getDashboardStats(@Request() req) {
    return this.sellersService.getSellerDashboardStats(req.user.userId);
  }

  @Get('dashboard/products-stats')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SELLER')
  @ApiBearerAuth()
  @ApiOperation({ summary: '获取卖家商品统计' })
  async getProductsStats(@Request() req) {
    return this.sellersService.getSellerProductsStats(req.user.userId);
  }

  // ==================== 提现功能 ====================

  @Post('withdrawals')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SELLER')
  @ApiBearerAuth()
  @ApiOperation({ summary: '申请提现' })
  async requestWithdrawal(@Request() req, @Body() dto: RequestWithdrawalDto) {
    return this.sellersService.requestWithdrawal(req.user.userId, dto);
  }

  @Get('withdrawals')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SELLER')
  @ApiBearerAuth()
  @ApiOperation({ summary: '获取提现记录列表' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async getWithdrawals(
    @Request() req,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.sellersService.getWithdrawals(
      req.user.userId,
      page ? Number(page) : 1,
      limit ? Number(limit) : 10,
    );
  }

  @Get('withdrawals/:withdrawalNo')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SELLER')
  @ApiBearerAuth()
  @ApiOperation({ summary: '获取提现记录详情' })
  async getWithdrawalDetail(
    @Request() req,
    @Param('withdrawalNo') withdrawalNo: string,
  ) {
    return this.sellersService.getWithdrawalDetail(
      req.user.userId,
      withdrawalNo,
    );
  }

  // ==================== 资金流水 ====================

  @Get('transactions')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SELLER')
  @ApiBearerAuth()
  @ApiOperation({ summary: '获取资金流水' })
  async getTransactions(
    @Request() req,
    @Query() filters: TransactionFiltersDto,
  ) {
    return this.sellersService.getTransactions(req.user.userId, filters);
  }

  // ==================== 卖家订单 ====================

  @Get('orders')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SELLER')
  @ApiBearerAuth()
  @ApiOperation({ summary: '获取卖家订单列表' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'status', required: false, type: String })
  async getSellerOrders(
    @Request() req,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('status') status?: string,
  ) {
    return this.sellersService.getSellerOrders(
      req.user.userId,
      page ? Number(page) : 1,
      limit ? Number(limit) : 10,
      status,
    );
  }

  // ==================== 促销管理 ====================

  @Patch('products/:id/promotion')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SELLER')
  @ApiBearerAuth()
  @ApiOperation({ summary: '设置商品促销' })
  @ApiParam({ name: 'id', description: '商品ID' })
  async setPromotion(
    @Request() req,
    @Param('id') productId: string,
    @Body() dto: { label: string; startDate: string; endDate: string },
  ) {
    return this.sellersService.setPromotion(productId, dto, req.user.userId);
  }

  @Patch('products/:id/promotion/clear')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SELLER')
  @ApiBearerAuth()
  @ApiOperation({ summary: '清除商品促销' })
  @ApiParam({ name: 'id', description: '商品ID' })
  async clearPromotion(@Request() req, @Param('id') productId: string) {
    return this.sellersService.clearPromotion(productId, req.user.userId);
  }
}
