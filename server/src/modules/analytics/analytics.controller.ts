import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { AnalyticsService } from './analytics.service';

@Controller('analytics')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AnalyticsController {
  constructor(private service: AnalyticsService) {}

  @Get('overview')
  @Roles('ADMIN')
  async getOverview() {
    return this.service.getPlatformOverview();
  }

  @Get('sales-trend')
  @Roles('ADMIN')
  async getSalesTrend(@Query('days') days?: number) {
    return this.service.getSalesTrend(days ? +days : 30);
  }

  @Get('top-products')
  @Roles('ADMIN')
  async getTopProducts(@Query('limit') limit?: number) {
    return this.service.getTopProducts(limit ? +limit : 10);
  }

  @Get('top-sellers')
  @Roles('ADMIN')
  async getTopSellers(@Query('limit') limit?: number) {
    return this.service.getTopSellers(limit ? +limit : 10);
  }

  @Get('user-growth')
  @Roles('ADMIN')
  async getUserGrowth(@Query('days') days?: number) {
    return this.service.getUserGrowth(days ? +days : 30);
  }

  @Get('category-sales')
  @Roles('ADMIN')
  async getCategorySales() {
    return this.service.getCategorySales();
  }
}
