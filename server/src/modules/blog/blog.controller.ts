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
  Ip,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiParam,
  ApiResponse,
} from '@nestjs/swagger';
import { BlogService } from './blog.service';
import {
  CreateBlogDto,
  UpdateBlogDto,
  BlogQueryDto,
  CreateTagDto,
  CreateCommentDto,
  ApproveBlogDto,
  RejectBlogDto,
  AuthorQueryDto,
} from './dto/blog.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Public } from '../auth/decorators/public.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@ApiTags('博客')
@Controller('blog')
export class BlogController {
  constructor(private readonly blogService: BlogService) {}

  // ==================== 公开接口 ====================

  @Public()
  @Get()
  @ApiOperation({ summary: '获取公开文章列表' })
  @ApiResponse({ status: 200, description: '返回文章列表' })
  async findPublished(@Query() query: BlogQueryDto) {
    return this.blogService.findPublished(query);
  }

  @Public()
  @Get('popular')
  @ApiOperation({ summary: '获取热门文章' })
  @ApiResponse({ status: 200, description: '返回热门文章列表' })
  async getPopular(@Query('limit') limit?: number) {
    return this.blogService.getPopular(limit ? Number(limit) : 5);
  }

  @Public()
  @Get('slug/:slug')
  @ApiOperation({ summary: '通过 Slug 获取文章' })
  @ApiParam({ name: 'slug', description: '文章 Slug' })
  @ApiResponse({ status: 200, description: '返回文章详情' })
  @ApiResponse({ status: 404, description: '文章不存在' })
  async findBySlug(
    @Param('slug') slug: string,
    @CurrentUser('id') userId: string | null,
    @Ip() ipAddress: string,
  ) {
    return this.blogService.findBySlug(slug, userId, ipAddress);
  }

  @Public()
  @Get(':id/related')
  @ApiOperation({ summary: '获取相关文章' })
  @ApiParam({ name: 'id', description: '文章 ID' })
  @ApiResponse({ status: 200, description: '返回相关文章列表' })
  async getRelated(@Param('id') id: string, @Query('limit') limit?: number) {
    return this.blogService.getRelated(id, limit ? Number(limit) : 5);
  }

  @Public()
  @Get(':id')
  @ApiOperation({ summary: '获取单篇文章' })
  @ApiParam({ name: 'id', description: '文章 ID' })
  @ApiResponse({ status: 200, description: '返回文章详情' })
  @ApiResponse({ status: 404, description: '文章不存在' })
  async findOne(@Param('id') id: string) {
    return this.blogService.findOne(id);
  }

  // ==================== 标签接口 ====================

  @Public()
  @Get('tags/all')
  @ApiOperation({ summary: '获取所有标签' })
  @ApiResponse({ status: 200, description: '返回标签列表' })
  async getAllTags() {
    return this.blogService.getAllTags();
  }

  @Public()
  @Get('tags/popular')
  @ApiOperation({ summary: '获取热门标签' })
  @ApiResponse({ status: 200, description: '返回热门标签列表' })
  async getPopularTags(@Query('limit') limit?: number) {
    return this.blogService.getPopularTags(limit ? Number(limit) : 10);
  }

  @Post('tags')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '创建标签' })
  @ApiResponse({ status: 201, description: '创建成功' })
  async createTag(@Body() dto: CreateTagDto) {
    return this.blogService.createTag(dto);
  }

  // ==================== 评论接口 ====================

  @Public()
  @Get(':id/comments')
  @ApiOperation({ summary: '获取文章评论' })
  @ApiParam({ name: 'id', description: '文章 ID' })
  @ApiResponse({ status: 200, description: '返回评论列表' })
  async getComments(
    @Param('id') id: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.blogService.getComments(
      id,
      page ? Number(page) : 1,
      limit ? Number(limit) : 20,
    );
  }

  @Post(':id/comments')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '发表评论' })
  @ApiParam({ name: 'id', description: '文章 ID' })
  @ApiResponse({ status: 201, description: '评论成功' })
  async createComment(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @Body() dto: CreateCommentDto,
  ) {
    return this.blogService.createComment(id, userId, dto);
  }

  // ==================== 点赞接口 ====================

  @Post(':id/like')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '点赞/取消点赞' })
  @ApiParam({ name: 'id', description: '文章 ID' })
  @ApiResponse({ status: 200, description: '操作成功' })
  async toggleLike(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.blogService.toggleLike(id, userId);
  }

  @Get(':id/liked')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '检查是否已点赞' })
  @ApiParam({ name: 'id', description: '文章 ID' })
  @ApiResponse({ status: 200, description: '返回点赞状态' })
  async checkLiked(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.blogService.checkLiked(id, userId);
  }

  // ==================== 管理接口（需认证） ====================

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '创建文章' })
  @ApiResponse({ status: 201, description: '创建成功' })
  @ApiResponse({ status: 409, description: 'Slug 已存在' })
  async create(
    @CurrentUser('id') authorId: string,
    @Body() dto: CreateBlogDto,
  ) {
    return this.blogService.create(authorId, dto);
  }

  @Get('admin/all')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '获取所有文章（管理）' })
  @ApiResponse({ status: 200, description: '返回文章列表' })
  async findAll(@Query() query: BlogQueryDto) {
    return this.blogService.findAll(query);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '更新文章' })
  @ApiParam({ name: 'id', description: '文章 ID' })
  @ApiResponse({ status: 200, description: '更新成功' })
  @ApiResponse({ status: 404, description: '文章不存在' })
  @ApiResponse({ status: 409, description: 'Slug 已存在' })
  async update(@Param('id') id: string, @Body() dto: UpdateBlogDto) {
    return this.blogService.update(id, dto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '删除文章' })
  @ApiParam({ name: 'id', description: '文章 ID' })
  @ApiResponse({ status: 200, description: '删除成功' })
  @ApiResponse({ status: 404, description: '文章不存在' })
  async remove(@Param('id') id: string) {
    return this.blogService.remove(id);
  }

  // ==================== 审核接口 ====================

  @Post(':id/submit')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '提交文章审核' })
  @ApiParam({ name: 'id', description: '文章 ID' })
  @ApiResponse({ status: 200, description: '提交成功' })
  @ApiResponse({ status: 400, description: '文章状态不允许提交' })
  @ApiResponse({ status: 404, description: '文章不存在' })
  async submitForReview(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.blogService.submitForReview(id, userId);
  }

  @Post(':id/approve')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '审核通过（管理员）' })
  @ApiParam({ name: 'id', description: '文章 ID' })
  @ApiResponse({ status: 200, description: '审核通过' })
  @ApiResponse({ status: 400, description: '文章状态不允许审核' })
  @ApiResponse({ status: 404, description: '文章不存在' })
  async approve(
    @Param('id') id: string,
    @CurrentUser('id') adminId: string,
    @Body() dto: ApproveBlogDto,
  ) {
    return this.blogService.approveBlog(id, adminId, dto.reviewNotes);
  }

  @Post(':id/reject')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '审核驳回（管理员）' })
  @ApiParam({ name: 'id', description: '文章 ID' })
  @ApiResponse({ status: 200, description: '已驳回' })
  @ApiResponse({ status: 400, description: '文章状态不允许审核' })
  @ApiResponse({ status: 404, description: '文章不存在' })
  async reject(
    @Param('id') id: string,
    @CurrentUser('id') adminId: string,
    @Body() dto: RejectBlogDto,
  ) {
    return this.blogService.rejectBlog(id, adminId, dto.reason);
  }

  @Get('admin/pending')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '获取待审核文章列表（管理员）' })
  @ApiResponse({ status: 200, description: '返回待审核文章列表' })
  async findPending(@Query() query: AuthorQueryDto) {
    return this.blogService.findPending(query);
  }

  // ==================== 卖家投稿接口 ====================

  @Get('seller/my')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '获取我的文章（卖家）' })
  @ApiResponse({ status: 200, description: '返回我的文章列表' })
  async findMyBlogs(
    @CurrentUser('id') authorId: string,
    @Query() query: BlogQueryDto,
  ) {
    return this.blogService.findByAuthor(authorId, query);
  }
}
