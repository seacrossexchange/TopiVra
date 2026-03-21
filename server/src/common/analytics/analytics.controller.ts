import {
  Controller,
  Get,
  Query,
  UseGuards,
  ParseIntPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../modules/auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../modules/auth/guards/roles.guard';
import { Roles } from '../../modules/auth/decorators/roles.decorator';
import { AnalyticsService } from './analytics.service';

@ApiTags('数据分析')
@Controller('analytics')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
@ApiBearerAuth()
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('dashboard')
  @ApiOperation({ summary: '获取仪表板汇总数据' })
  async getDashboardSummary() {
    return this.analyticsService.getDashboardSummary();
  }

  @Get('sales-trend')
  @ApiOperation({ summary: '获取销售趋势' })
  @ApiQuery({ name: 'period', enum: ['day', 'week', 'month'], required: false })
  @ApiQuery({ name: 'days', type: Number, required: false })
  async getSalesTrend(
    @Query('period') period?: 'day' | 'week' | 'month',
    @Query('days', new ParseIntPipe({ optional: true })) days?: number,
  ) {
    return this.analyticsService.getSalesTrend(period, days);
  }

  @Get('top-products')
  @ApiOperation({ summary: '获取热销商品排行' })
  @ApiQuery({ name: 'limit', type: Number, required: false })
  async getTopProducts(
    @Query('limit', new ParseIntPipe({ optional: true })) limit?: number,
  ) {
    return this.analyticsService.getTopProducts(limit);
  }

  @Get('top-sellers')
  @ApiOperation({ summary: '获取卖家销售排行' })
  @ApiQuery({ name: 'limit', type: Number, required: false })
  async getTopSellers(
    @Query('limit', new ParseIntPipe({ optional: true })) limit?: number,
  ) {
    return this.analyticsService.getTopSellers(limit);
  }

  @Get('user-growth')
  @ApiOperation({ summary: '获取用户增长曲线' })
  @ApiQuery({ name: 'days', type: Number, required: false })
  async getUserGrowth(
    @Query('days', new ParseIntPipe({ optional: true })) days?: number,
  ) {
    return this.analyticsService.getUserGrowth(days);
  }

  @Get('category-distribution')
  @ApiOperation({ summary: '获取品类销售分布' })
  async getCategorySalesDistribution() {
    return this.analyticsService.getCategorySalesDistribution();
  }

  @Get('platform-distribution')
  @ApiOperation({ summary: '获取平台销售分布' })
  async getPlatformSalesDistribution() {
    return this.analyticsService.getPlatformSalesDistribution();
  }

  @Get('user-geographic')
  @ApiOperation({ summary: '获取用户地域分布' })
  async getUserGeographicDistribution() {
    return this.analyticsService.getUserGeographicDistribution();
  }

  @Get('gmv-growth')
  @ApiOperation({ summary: '获取GMV增长曲线' })
  @ApiQuery({ name: 'days', type: Number, required: false })
  async getGMVGrowth(
    @Query('days', new ParseIntPipe({ optional: true })) days?: number,
  ) {
    return this.analyticsService.getGMVGrowth(days);
  }

  @Get('user-activity')
  @ApiOperation({ summary: '获取用户活跃度统计' })
  @ApiQuery({ name: 'days', type: Number, required: false })
  async getUserActivityStats(
    @Query('days', new ParseIntPipe({ optional: true })) days?: number,
  ) {
    return this.analyticsService.getUserActivityStats(days);
  }
}



