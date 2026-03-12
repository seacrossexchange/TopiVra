import {
  Controller,
  Get,
  Post,
  Patch,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AdminService } from './admin.service';
import { AdminAnalyticsService } from './admin-analytics.service';
import { AuditSellerDto } from './dto/audit.dto';
import { UpdateUserStatusDto } from './dto/user-status.dto';
import { AdminQueryFiltersDto } from './dto/query-filters.dto';
import { Public } from '../auth/decorators/public.decorator';

@ApiTags('Admin')
@ApiBearerAuth()
@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
export class AdminController {
  constructor(
    private readonly adminService: AdminService,
    private readonly analyticsService: AdminAnalyticsService,
  ) {}

  // Dashboard Stats
  @Get('dashboard/stats')
  @ApiOperation({ summary: '获取全局统计数据' })
  async getDashboardStats() {
    return this.adminService.getDashboardStats();
  }

  // User Management
  @Get('users')
  @ApiOperation({ summary: '获取用户列表' })
  async getUsers(@Query() query: AdminQueryFiltersDto) {
    return this.adminService.getUsers(query);
  }

  @Patch('users/:id/status')
  @ApiOperation({ summary: '更新用户状态（封禁/解封）' })
  async updateUserStatus(
    @Param('id') id: string,
    @Body() dto: UpdateUserStatusDto,
    @CurrentUser('id') operatorId: string,
  ) {
    return this.adminService.updateUserStatus(id, dto, operatorId);
  }

  // Product Management
  @Get('products')
  @ApiOperation({ summary: '获取商品列表（含待审核）' })
  async getProducts(@Query() query: AdminQueryFiltersDto) {
    return this.adminService.getProducts(query);
  }

  @Patch('products/:id/audit')
  @ApiOperation({ summary: '审核商品' })
  async auditProduct(
    @Param('id') id: string,
    @Body() dto: AuditSellerDto,
    @CurrentUser('id') operatorId: string,
  ) {
    return this.adminService.auditProduct(id, dto, operatorId);
  }

  // Order Management
  @Get('orders')
  @ApiOperation({ summary: '获取全部订单' })
  async getOrders(@Query() query: AdminQueryFiltersDto) {
    return this.adminService.getOrders(query);
  }

  @Patch('orders/:id/refund')
  @ApiOperation({ summary: '管理员退款' })
  async refundOrder(
    @Param('id') id: string,
    @CurrentUser('id') operatorId: string,
  ) {
    return this.adminService.refundOrder(id, operatorId);
  }

  // Seller Management
  @Get('sellers')
  @ApiOperation({ summary: '获取卖家列表（含待审核）' })
  async getSellers(@Query() query: AdminQueryFiltersDto) {
    return this.adminService.getSellers(query);
  }

  @Patch('sellers/:id/audit')
  @ApiOperation({ summary: '审核卖家申请' })
  async auditSeller(
    @Param('id') id: string,
    @Body() dto: AuditSellerDto,
    @CurrentUser('id') operatorId: string,
  ) {
    return this.adminService.auditSeller(id, dto, operatorId);
  }

  @Patch('sellers/:id/level')
  @ApiOperation({ summary: '修改卖家等级' })
  async updateSellerLevel(
    @Param('id') id: string,
    @Body() dto: { level: 'NORMAL' | 'VERIFIED' | 'PREMIUM' },
    @CurrentUser('id') operatorId: string,
  ) {
    return this.adminService.updateSellerLevel(id, dto.level, operatorId);
  }

  @Patch('sellers/:id/status')
  @ApiOperation({ summary: '切换卖家状态（暂停/恢复）' })
  async toggleSellerStatus(
    @Param('id') id: string,
    @CurrentUser('id') operatorId: string,
  ) {
    return this.adminService.toggleSellerStatus(id, operatorId);
  }

  // Ticket Management
  @Get('tickets')
  @ApiOperation({ summary: '获取工单列表' })
  async getTickets(@Query() query: AdminQueryFiltersDto) {
    return this.adminService.getTickets(query);
  }

  // Finance Management
  @Get('finance/stats')
  @ApiOperation({ summary: '获取财务统计' })
  async getFinanceStats() {
    return this.adminService.getFinanceStats();
  }

  @Get('finance/transactions')
  @ApiOperation({ summary: '获取交易记录' })
  async getFinanceTransactions(@Query() query: AdminQueryFiltersDto) {
    return this.adminService.getFinanceTransactions(query);
  }

  // Refund Management
  @Get('refunds')
  @ApiOperation({ summary: '获取退款列表' })
  async getRefunds(@Query() query: AdminQueryFiltersDto) {
    return this.adminService.getRefunds(query);
  }

  @Put('refunds/:id/review')
  @ApiOperation({ summary: '审核退款申请' })
  async reviewRefund(
    @Param('id') id: string,
    @Body() body: { approved: boolean; adminNote?: string },
    @CurrentUser('id') operatorId: string,
  ) {
    return this.adminService.reviewRefund(id, body.approved, body.adminNote, operatorId);
  }

  // System Settings
  @Get('settings')
  @ApiOperation({ summary: '获取系统设置' })
  async getSettings() {
    return this.adminService.getSettings();
  }

  // Public Config - 游客可访问的公开配置（社交链接、工作时间等）
  @Public()
  @Get('config/public')
  @ApiOperation({ summary: '获取公开站点配置（无需登录）' })
  async getPublicConfig() {
    const settings = await this.adminService.getSettings();
    return {
      socialGithub: settings.socialGithub || '',
      socialTwitter: settings.socialTwitter || '',
      supportEmail: settings.supportEmail || 'support@topivra.com',
      workingHours: settings.workingHours || '',
    };
  }

  @Patch('settings')
  @ApiOperation({ summary: '更新系统设置' })
  async updateSettings(
    @Body() body: Record<string, any>,
    @CurrentUser('id') operatorId: string,
  ) {
    return this.adminService.updateSettings(body, operatorId);
  }

  // OAuth Config
  @Get('config/oauth')
  @ApiOperation({ summary: '获取 OAuth 配置' })
  async getOAuthConfig() {
    return this.adminService.getOAuthConfig();
  }

  @Put('config/oauth')
  @ApiOperation({ summary: '更新 OAuth 配置' })
  async updateOAuthConfig(
    @Body() body: any,
    @CurrentUser('id') operatorId: string,
  ) {
    return this.adminService.updateOAuthConfig(body, operatorId);
  }

  // Payment Config
  @Get('config/payment')
  @ApiOperation({ summary: '获取支付配置' })
  async getPaymentConfig() {
    return this.adminService.getPaymentConfig();
  }

  @Put('config/payment')
  @ApiOperation({ summary: '更新支付配置' })
  async updatePaymentConfig(
    @Body() body: any,
    @CurrentUser('id') operatorId: string,
  ) {
    return this.adminService.updatePaymentConfig(body, operatorId);
  }

  // SEO Config
  @Get('config/seo')
  @ApiOperation({ summary: '获取 SEO 配置' })
  async getSeoConfig() {
    return this.adminService.getSeoConfig();
  }

  @Put('config/seo')
  @ApiOperation({ summary: '更新 SEO 配置' })
  async updateSeoConfig(
    @Body() body: any,
    @CurrentUser('id') operatorId: string,
  ) {
    return this.adminService.updateSeoConfig(body, operatorId);
  }

  // Telegram Config
  @Get('config/telegram')
  @ApiOperation({ summary: '获取 Telegram 配置' })
  async getTelegramConfig() {
    return this.adminService.getTelegramConfig();
  }

  @Put('config/telegram')
  @ApiOperation({ summary: '更新 Telegram 配置' })
  async updateTelegramConfig(
    @Body() body: any,
    @CurrentUser('id') operatorId: string,
  ) {
    return this.adminService.updateTelegramConfig(body, operatorId);
  }

  // Ticket Messages & Reply
  @Get('tickets/:id/messages')
  @ApiOperation({ summary: '获取工单消息列表' })
  async getTicketMessages(@Param('id') id: string) {
    return this.adminService.getTicketMessages(id);
  }

  @Post('tickets/:id/reply')
  @ApiOperation({ summary: '回复工单' })
  async replyTicket(
    @Param('id') id: string,
    @Body() body: { content: string; isInternal?: boolean },
    @CurrentUser('id') operatorId: string,
  ) {
    return this.adminService.replyTicket(id, body.content, body.isInternal || false, operatorId);
  }

  @Patch('tickets/:id/status')
  @ApiOperation({ summary: '更新工单状态' })
  async updateTicketStatus(
    @Param('id') id: string,
    @Body() body: { status: string },
    @CurrentUser('id') operatorId: string,
  ) {
    return this.adminService.updateTicketStatus(id, body.status, operatorId);
  }

  // Force Complete Order
  @Patch('orders/:id/complete')
  @ApiOperation({ summary: '管理员强制完成订单' })
  async forceCompleteOrder(
    @Param('id') id: string,
    @CurrentUser('id') operatorId: string,
  ) {
    return this.adminService.forceCompleteOrder(id, operatorId);
  }

  // Delete User
  @Delete('users/:id')
  @ApiOperation({ summary: '删除用户（软删除）' })
  async deleteUser(
    @Param('id') id: string,
    @CurrentUser('id') operatorId: string,
  ) {
    return this.adminService.deleteUser(id, operatorId);
  }

  // System Logs
  @Get('logs')
  @ApiOperation({ summary: '获取系统日志' })
  async getLogs(@Query() query: AdminQueryFiltersDto) {
    return this.adminService.getLogs(query);
  }

  // ==================== 广告位管理 ====================

  @Public()
  @Get('config/ad-slots')
  @ApiOperation({ summary: '获取广告位配置（公开）' })
  async getAdSlots() {
    return this.adminService.getAdSlots();
  }

  @Put('config/ad-slots')
  @ApiOperation({ summary: '更新广告位配置（管理员）' })
  async updateAdSlots(
    @Body() body: { slots: any[] },
    @CurrentUser('id') operatorId: string,
  ) {
    return this.adminService.updateAdSlots(body.slots, operatorId);
  }

  // ==================== Analytics ====================
  @Get('analytics/summary')
  @ApiOperation({ summary: '获取访问统计摘要（实时+24h+30d+地区）' })
  async getAnalyticsSummary() {
    return this.analyticsService.getSummary();
  }

  @Get('analytics/realtime')
  @ApiOperation({ summary: '获取实时在线人数' })
  async getRealtimeOnline() {
    return this.analyticsService.getRealtimeOnline();
  }

  @Get('analytics/hourly')
  @ApiOperation({ summary: '获取过去 N 小时访问量' })
  async getHourlyVisits(@Query('hours') hours = 24) {
    return this.analyticsService.getHourlyVisits(+hours);
  }

  @Get('analytics/daily')
  @ApiOperation({ summary: '获取过去 N 天访问量' })
  async getDailyVisits(@Query('days') days = 30) {
    return this.analyticsService.getDailyVisits(+days);
  }

  @Get('analytics/geo')
  @ApiOperation({ summary: '获取今日国家地区分布' })
  async getGeoDistribution() {
    return this.analyticsService.getGeoDistribution();
  }

  // Risk Control - IP Blacklist
  @Get('risk/ip-blacklist')
  @ApiOperation({ summary: '获取IP黑名单列表' })
  async getBlacklistedIps(@Query('page') page = 1, @Query('limit') limit = 10) {
    return this.adminService.getBlacklistedIps(+page, +limit);
  }

  @Post('risk/ip-blacklist')
  @ApiOperation({ summary: '添加IP到黑名单' })
  async addBlacklistedIp(
    @Body() body: { ip: string; reason: string; expiresAt: string },
    @CurrentUser('id') operatorId: string,
  ) {
    return this.adminService.addBlacklistedIp(
      body.ip,
      body.reason,
      new Date(body.expiresAt),
      operatorId,
    );
  }

  @Delete('risk/ip-blacklist/:id')
  @ApiOperation({ summary: '从黑名单移除IP' })
  async removeBlacklistedIp(
    @Param('id') id: string,
    @CurrentUser('id') operatorId: string,
  ) {
    return this.adminService.removeBlacklistedIp(id, operatorId);
  }
}
