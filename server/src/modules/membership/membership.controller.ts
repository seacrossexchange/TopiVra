import { Controller, Get, Post, Body, Param, UseGuards, Req } from '@nestjs/common';
import { MembershipService } from './membership.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@Controller('membership')
export class MembershipController {
  constructor(private readonly membershipService: MembershipService) {}

  // 获取用户会员信息
  @Get('my')
  @UseGuards(JwtAuthGuard)
  getMyMembership(@Req() req: any) {
    return this.membershipService.getUserMembership(req.user.userId);
  }

  // 获取会员等级配置
  @Get('tiers')
  getTiers() {
    return this.membershipService.getTiers();
  }

  // 计算用户升级进度
  @Get('progress')
  @UseGuards(JwtAuthGuard)
  getProgress(@Req() req: any) {
    return this.membershipService.getUpgradeProgress(req.user.userId);
  }

  // 管理员手动调整用户等级
  @Post('adjust/:userId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  adjustLevel(@Param('userId') userId: string, @Body('level') level: number) {
    return this.membershipService.adjustUserLevel(userId, level);
  }
}

