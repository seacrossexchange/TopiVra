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
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiParam,
  ApiResponse,
} from '@nestjs/swagger';
import { ProductsService } from './products.service';
import {
  CreateProductDto,
  UpdateProductDto,
  ProductQueryDto,
  AuditProductDto,
  BatchOperationDto,
} from './dto/product.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Public } from '../auth/decorators/public.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@ApiTags('商品')
@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  // ==================== 公开接口 ====================

  @Public()
  @Get()
  @ApiOperation({ summary: '获取商品列表（公开）' })
  @ApiResponse({ status: 200, description: '返回商品列表' })
  async findPublic(@Query() query: ProductQueryDto) {
    return this.productsService.findPublic(query);
  }

  @Public()
  @Get('popular-platforms')
  @ApiOperation({ summary: '获取热门平台' })
  @ApiResponse({ status: 200, description: '返回热门平台列表' })
  async getPopularPlatforms() {
    return this.productsService.getPopularPlatforms();
  }

  @Public()
  @Get(':id')
  @ApiOperation({ summary: '获取商品详情（公开）' })
  @ApiParam({ name: 'id', description: '商品ID' })
  @ApiResponse({ status: 200, description: '返回商品详情' })
  @ApiResponse({ status: 404, description: '商品不存在' })
  async findOne(@Param('id') id: string) {
    return this.productsService.findOne(id);
  }

  @Public()
  @Get(':id/related')
  @ApiOperation({ summary: '获取相关商品' })
  @ApiParam({ name: 'id', description: '商品ID' })
  @ApiResponse({ status: 200, description: '返回相关商品列表' })
  async getRelatedProducts(@Param('id') id: string) {
    return this.productsService.getRelatedProducts(id);
  }

  // ==================== 卖家接口 ====================

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SELLER')
  @ApiBearerAuth()
  @ApiOperation({ summary: '创建商品（卖家）' })
  @ApiResponse({ status: 201, description: '商品创建成功' })
  @ApiResponse({ status: 403, description: '无权限' })
  async create(
    @CurrentUser('id') sellerId: string,
    @Body() dto: CreateProductDto,
  ) {
    return this.productsService.create(sellerId, dto);
  }

  @Get('seller/my')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SELLER')
  @ApiBearerAuth()
  @ApiOperation({ summary: '获取我的商品列表（卖家）' })
  @ApiResponse({ status: 200, description: '返回我的商品列表' })
  async findBySeller(
    @CurrentUser('id') sellerId: string,
    @Query() query: ProductQueryDto,
  ) {
    return this.productsService.findBySeller(sellerId, query);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SELLER')
  @ApiBearerAuth()
  @ApiOperation({ summary: '更新商品（卖家）' })
  @ApiParam({ name: 'id', description: '商品ID' })
  @ApiResponse({ status: 200, description: '商品更新成功' })
  @ApiResponse({ status: 403, description: '无权限' })
  @ApiResponse({ status: 404, description: '商品不存在' })
  async update(
    @Param('id') id: string,
    @CurrentUser('id') sellerId: string,
    @Body() dto: UpdateProductDto,
  ) {
    return this.productsService.update(id, sellerId, dto);
  }

  @Post(':id/submit')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SELLER')
  @ApiBearerAuth()
  @ApiOperation({ summary: '提交审核（卖家）' })
  @ApiParam({ name: 'id', description: '商品ID' })
  @ApiResponse({ status: 200, description: '已提交审核' })
  @ApiResponse({ status: 400, description: '商品状态不允许提交' })
  async submitForAudit(
    @Param('id') id: string,
    @CurrentUser('id') sellerId: string,
  ) {
    return this.productsService.submitForAudit(id, sellerId);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SELLER')
  @ApiBearerAuth()
  @ApiOperation({ summary: '删除商品（卖家）' })
  @ApiParam({ name: 'id', description: '商品ID' })
  @ApiResponse({ status: 200, description: '商品删除成功' })
  @ApiResponse({ status: 403, description: '无权限' })
  async remove(@Param('id') id: string, @CurrentUser('id') sellerId: string) {
    return this.productsService.remove(id, sellerId);
  }

  @Put(':id/online')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SELLER')
  @ApiBearerAuth()
  @ApiOperation({ summary: '上架商品（卖家）' })
  @ApiParam({ name: 'id', description: '商品ID' })
  @ApiResponse({ status: 200, description: '商品已上架' })
  async setOnline(
    @Param('id') id: string,
    @CurrentUser('id') sellerId: string,
  ) {
    return this.productsService.toggleStatus(id, sellerId, true);
  }

  @Put(':id/offline')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SELLER')
  @ApiBearerAuth()
  @ApiOperation({ summary: '下架商品（卖家）' })
  @ApiParam({ name: 'id', description: '商品ID' })
  @ApiResponse({ status: 200, description: '商品已下架' })
  async setOffline(
    @Param('id') id: string,
    @CurrentUser('id') sellerId: string,
  ) {
    return this.productsService.toggleStatus(id, sellerId, false);
  }

  @Post('batch')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SELLER')
  @ApiBearerAuth()
  @ApiOperation({ summary: '批量操作商品（卖家）' })
  @ApiResponse({ status: 200, description: '批量操作成功' })
  async batchOperation(
    @CurrentUser('id') sellerId: string,
    @Body() dto: BatchOperationDto,
  ) {
    return this.productsService.batchOperation(sellerId, dto);
  }

  // ==================== 收藏夹接口 ====================

  @Get('favorites/list')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '获取我的收藏列表' })
  @ApiResponse({ status: 200, description: '返回收藏列表' })
  async getFavorites(
    @CurrentUser('id') userId: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.productsService.getFavorites(userId, page, limit);
  }

  @Post('favorites/:id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '添加收藏' })
  @ApiParam({ name: 'id', description: '商品ID' })
  @ApiResponse({ status: 200, description: '收藏成功' })
  @ApiResponse({ status: 400, description: '已收藏' })
  async addFavorite(
    @Param('id') productId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.productsService.addFavorite(userId, productId);
  }

  @Delete('favorites/:id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '取消收藏' })
  @ApiParam({ name: 'id', description: '商品ID' })
  @ApiResponse({ status: 200, description: '取消收藏成功' })
  async removeFavorite(
    @Param('id') productId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.productsService.removeFavorite(userId, productId);
  }

  @Get('favorites/check/:id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '检查是否已收藏' })
  @ApiParam({ name: 'id', description: '商品ID' })
  @ApiResponse({ status: 200, description: '返回是否已收藏' })
  async checkFavorite(
    @Param('id') productId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.productsService.checkFavorite(userId, productId);
  }

  // ==================== 管理员接口 ====================

  @Get('admin/all')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: '获取所有商品（管理员）' })
  @ApiResponse({ status: 200, description: '返回所有商品列表' })
  async findAll(@Query() query: ProductQueryDto) {
    return this.productsService.findAll(query);
  }

  @Post('admin/:id/audit')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: '审核商品（管理员）' })
  @ApiParam({ name: 'id', description: '商品ID' })
  @ApiResponse({ status: 200, description: '审核完成' })
  async audit(
    @Param('id') id: string,
    @CurrentUser('id') adminId: string,
    @Body() dto: AuditProductDto,
  ) {
    return this.productsService.audit(id, adminId, dto);
  }
}
