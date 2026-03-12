import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiParam,
  ApiResponse,
} from '@nestjs/swagger';
import { CartService } from './cart.service';
import {
  AddToCartDto,
  UpdateCartItemDto,
  BatchRemoveDto,
} from './dto/cart.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@ApiTags('购物车')
@Controller('cart')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class CartController {
  constructor(private readonly cartService: CartService) {}

  @Get()
  @ApiOperation({ summary: '获取购物车' })
  @ApiResponse({ status: 200, description: '返回购物车详情' })
  async getCart(@CurrentUser('id') userId: string) {
    return this.cartService.getCart(userId);
  }

  @Get('count')
  @ApiOperation({ summary: '获取购物车商品数量' })
  @ApiResponse({ status: 200, description: '返回购物车商品数量' })
  async getCartCount(@CurrentUser('id') userId: string) {
    return this.cartService.getCartCount(userId);
  }

  @Post()
  @ApiOperation({ summary: '添加到购物车' })
  @ApiResponse({ status: 201, description: '添加成功' })
  @ApiResponse({ status: 400, description: '商品不可购买或库存不足' })
  @ApiResponse({ status: 404, description: '商品不存在' })
  async addToCart(
    @CurrentUser('id') userId: string,
    @Body() dto: AddToCartDto,
  ) {
    return this.cartService.addToCart(userId, dto);
  }

  @Put(':id')
  @ApiOperation({ summary: '更新购物车项数量' })
  @ApiParam({ name: 'id', description: '购物车项ID' })
  @ApiResponse({ status: 200, description: '更新成功' })
  @ApiResponse({ status: 400, description: '超出库存数量' })
  @ApiResponse({ status: 404, description: '购物车项不存在' })
  async updateCartItem(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @Body() dto: UpdateCartItemDto,
  ) {
    return this.cartService.updateCartItem(userId, id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: '移除购物车项' })
  @ApiParam({ name: 'id', description: '购物车项ID' })
  @ApiResponse({ status: 200, description: '移除成功' })
  @ApiResponse({ status: 404, description: '购物车项不存在' })
  async removeCartItem(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.cartService.removeCartItem(userId, id);
  }

  @Post('batch-remove')
  @ApiOperation({ summary: '批量移除购物车项' })
  @ApiResponse({ status: 200, description: '批量移除成功' })
  async batchRemove(
    @CurrentUser('id') userId: string,
    @Body() dto: BatchRemoveDto,
  ) {
    return this.cartService.batchRemove(userId, dto);
  }

  @Delete()
  @ApiOperation({ summary: '清空购物车' })
  @ApiResponse({ status: 200, description: '清空成功' })
  async clearCart(@CurrentUser('id') userId: string) {
    return this.cartService.clearCart(userId);
  }

  @Post('validate')
  @ApiOperation({ summary: '验证购物车商品有效性' })
  @ApiResponse({ status: 200, description: '返回验证结果' })
  async validateCartItems(
    @CurrentUser('id') userId: string,
    @Body('productIds') productIds: string[],
  ) {
    return this.cartService.validateCartItems(userId, productIds);
  }
}
