import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
} from '@nestjs/common';
import { CouponsService } from './coupons.service';
import {
  CreateCouponDto,
  UpdateCouponDto,
  ValidateCouponDto,
} from './dto/coupon.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@Controller('coupons')
export class CouponsController {
  constructor(private readonly couponsService: CouponsService) {}

  // 管理员创建优惠券
  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  create(@Body() dto: CreateCouponDto) {
    return this.couponsService.create(dto);
  }

  // 管理员更新优惠券
  @Put(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  update(@Param('id') id: string, @Body() dto: UpdateCouponDto) {
    return this.couponsService.update(id, dto);
  }

  // 管理员查询所有优惠券
  @Get('admin/all')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  findAll(@Query('page') page?: string, @Query('limit') limit?: string) {
    return this.couponsService.findAll(
      page ? parseInt(page) : 1,
      limit ? parseInt(limit) : 20,
    );
  }

  // 用户查询可用优惠券
  @Get('available')
  @UseGuards(JwtAuthGuard)
  findAvailable(@Req() req: any, @Query('amount') amount?: string) {
    return this.couponsService.findAvailableForUser(
      req.user.userId,
      amount ? parseFloat(amount) : 0,
    );
  }

  // 验证优惠券
  @Post('validate')
  @UseGuards(JwtAuthGuard)
  validate(@Req() req: any, @Body() dto: ValidateCouponDto) {
    return this.couponsService.validate(req.user.userId, dto);
  }

  // 管理员删除优惠券
  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  remove(@Param('id') id: string) {
    return this.couponsService.remove(id);
  }
}
