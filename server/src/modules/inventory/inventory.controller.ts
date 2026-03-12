import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { InventoryService } from './inventory.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import {
  AddAccountDto,
  BatchAddAccountsDto,
  InventoryQueryDto,
  MarkInvalidDto,
} from './dto/inventory.dto';

@Controller('inventory')
@UseGuards(JwtAuthGuard, RolesGuard)
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  /**
   * 添加单个账号
   */
  @Post('add')
  @Roles('SELLER')
  async addAccount(@Request() req, @Body() dto: AddAccountDto) {
    return this.inventoryService.addAccount({
      ...dto,
      sellerId: req.user.userId,
    });
  }

  /**
   * 批量添加账号
   */
  @Post('batch-add')
  @Roles('SELLER')
  async batchAddAccounts(@Request() req, @Body() dto: BatchAddAccountsDto) {
    return this.inventoryService.batchAddAccounts({
      ...dto,
      sellerId: req.user.userId,
    });
  }

  /**
   * 查询卖家的账号库存
   */
  @Get('list')
  @Roles('SELLER')
  async getInventoryList(@Request() req, @Query() query: InventoryQueryDto) {
    return this.inventoryService.findBySeller(req.user.userId, query);
  }

  /**
   * 查询商品的库存统计
   */
  @Get('stats/:productId')
  @Roles('SELLER')
  async getInventoryStats(@Request() req, @Param('productId') productId: string) {
    return this.inventoryService.getInventoryStats(productId, req.user.userId);
  }

  /**
   * 删除账号
   */
  @Delete(':id')
  @Roles('SELLER')
  async deleteAccount(@Request() req, @Param('id') id: string) {
    return this.inventoryService.deleteAccount(id, req.user.userId);
  }

  /**
   * 标记账号为失效
   */
  @Post(':id/mark-invalid')
  @Roles('SELLER')
  async markAsInvalid(
    @Request() req,
    @Param('id') id: string,
    @Body() dto: MarkInvalidDto,
  ) {
    return this.inventoryService.markAsInvalid(id, req.user.userId, dto.reason);
  }

  /**
   * 检查账号是否重复
   */
  @Post('check-duplicate')
  @Roles('SELLER')
  async checkDuplicate(@Body() body: { accountData: string }) {
    return this.inventoryService.checkDuplicate(body.accountData);
  }
}

