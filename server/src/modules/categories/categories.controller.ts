import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  ParseUUIDPipe,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { CategoriesService } from './categories.service';
import { CreateCategoryDto, UpdateCategoryDto } from './dto/category.dto';
import { Public } from '../auth/decorators/public.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@ApiTags('分类管理')
@Controller('categories')
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  // ==================== 公开接口 ====================

  @Public()
  @Get()
  @ApiOperation({ summary: '获取分类列表（公开）' })
  @ApiResponse({ status: 200, description: '返回分类列表' })
  async findAll(@Query('includeInactive') includeInactive?: string) {
    const showInactive = includeInactive === 'true';
    return this.categoriesService.findAll(showInactive);
  }

  @Public()
  @Get('tree')
  @ApiOperation({ summary: '获取分类树结构（公开）' })
  @ApiResponse({ status: 200, description: '返回分类树' })
  async getCategoryTree() {
    return this.categoriesService.getCategoryTree();
  }

  @Public()
  @Get('slug/:slug')
  @ApiOperation({ summary: '根据slug获取分类（公开）' })
  @ApiResponse({ status: 200, description: '返回分类详情' })
  @ApiResponse({ status: 404, description: '分类不存在' })
  async findBySlug(@Param('slug') slug: string) {
    return this.categoriesService.findBySlug(slug);
  }

  @Public()
  @Get(':id')
  @ApiOperation({ summary: '获取分类详情（公开）' })
  @ApiResponse({ status: 200, description: '返回分类详情' })
  @ApiResponse({ status: 404, description: '分类不存在' })
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.categoriesService.findOne(id);
  }

  // ==================== 管理接口 ====================

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: '创建分类（管理员）' })
  @ApiResponse({ status: 201, description: '分类创建成功' })
  @ApiResponse({ status: 400, description: '参数错误' })
  async create(@Body() dto: CreateCategoryDto) {
    return this.categoriesService.create(dto);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: '更新分类（管理员）' })
  @ApiResponse({ status: 200, description: '分类更新成功' })
  @ApiResponse({ status: 404, description: '分类不存在' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateCategoryDto,
  ) {
    return this.categoriesService.update(id, dto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: '删除分类（管理员）' })
  @ApiResponse({ status: 200, description: '分类删除成功' })
  @ApiResponse({ status: 400, description: '分类下有子分类或商品' })
  @ApiResponse({ status: 404, description: '分类不存在' })
  async remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.categoriesService.remove(id);
  }

  @Put(':id/sort')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: '更新分类排序（管理员）' })
  @ApiResponse({ status: 200, description: '排序更新成功' })
  async updateSort(
    @Param('id', ParseUUIDPipe) id: string,
    @Body('sortOrder') sortOrder: number,
  ) {
    return this.categoriesService.updateSort(id, sortOrder);
  }

  @Put(':id/toggle-active')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: '切换分类激活状态（管理员）' })
  @ApiResponse({ status: 200, description: '状态切换成功' })
  async toggleActive(@Param('id', ParseUUIDPipe) id: string) {
    return this.categoriesService.toggleActive(id);
  }
}
