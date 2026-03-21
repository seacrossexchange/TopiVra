import { Controller, Get, Post, Body, UseGuards, Req } from '@nestjs/common';
import { ReferralService } from './referral.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('referral')
export class ReferralController {
  constructor(private readonly referralService: ReferralService) {}

  // 获取我的推荐码
  @Get('my-code')
  @UseGuards(JwtAuthGuard)
  getMyCode(@Req() req: any) {
    return this.referralService.getOrCreateReferralCode(req.user.userId);
  }

  // 获取推荐统计
  @Get('stats')
  @UseGuards(JwtAuthGuard)
  getStats(@Req() req: any) {
    return this.referralService.getReferralStats(req.user.userId);
  }

  // 获取推荐列表
  @Get('list')
  @UseGuards(JwtAuthGuard)
  getList(@Req() req: any) {
    return this.referralService.getReferralList(req.user.userId);
  }
}

