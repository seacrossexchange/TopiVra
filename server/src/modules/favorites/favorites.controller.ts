import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { FavoritesService } from './favorites.service';

@ApiTags('favorites')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('favorites')
export class FavoritesController {
  constructor(private readonly favoritesService: FavoritesService) {}

  @Post('toggle')
  @ApiOperation({ summary: '切换收藏状态' })
  async toggle(
    @CurrentUser('id') userId: string,
    @Body('productId') productId: string,
  ) {
    return this.favoritesService.toggle(userId, productId);
  }

  @Get()
  @ApiOperation({ summary: '获取我的收藏列表' })
  async findByUser(
    @CurrentUser('id') userId: string,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
  ) {
    return this.favoritesService.findByUser(userId, +page, +limit);
  }

  @Get('check/:productId')
  @ApiOperation({ summary: '检查是否已收藏' })
  async checkFavorite(
    @CurrentUser('id') userId: string,
    @Param('productId', ParseUUIDPipe) productId: string,
  ) {
    const isFavorited = await this.favoritesService.checkFavorite(
      userId,
      productId,
    );
    return { isFavorited };
  }

  @Post('check-batch')
  @ApiOperation({ summary: '批量检查收藏状态' })
  async checkFavorites(
    @CurrentUser('id') userId: string,
    @Body('productIds') productIds: string[],
  ) {
    return this.favoritesService.checkFavorites(userId, productIds);
  }

  @Get('count')
  @ApiOperation({ summary: '获取收藏数量' })
  async getCount(@CurrentUser('id') userId: string) {
    const count = await this.favoritesService.getCount(userId);
    return { count };
  }
}
