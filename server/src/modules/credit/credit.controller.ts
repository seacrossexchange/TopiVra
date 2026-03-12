import {
  Controller,
  Get,
  Post,
  Param,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Public } from '../auth/decorators/public.decorator';
import { CreditService } from './credit.service';

@ApiTags('信用分')
@Controller('credit')
export class CreditController {
  constructor(private readonly creditService: CreditService) {}

  // ==================== 获取卖家信用分（公开） ====================

  @Public()
  @Get('seller/:id')
  @ApiOperation({ summary: '获取卖家信用分' })
  @ApiParam({ name: 'id', description: '卖家ID' })
  async getSellerCredit(@Param('id') sellerId: string) {
    return this.creditService.getSellerCredit(sellerId);
  }

  // ==================== 管理员重新计算信用分 ====================

  @Post('recalculate/:sellerId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: '管理员重新计算卖家信用分' })
  @ApiParam({ name: 'sellerId', description: '卖家ID' })
  async recalculateCredit(@Param('sellerId') sellerId: string) {
    return this.creditService.calculateCredit(sellerId);
  }
}
