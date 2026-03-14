import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  Query,
  UseGuards,
  ParseIntPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { ReviewsService } from './reviews.service';
import { Public } from '../auth/decorators/public.decorator';

@ApiTags('评价系统')
@Controller('reviews')
export class ReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '创建评价' })
  async createReview(@CurrentUser('id') buyerId: string, @Body() dto: any) {
    return this.reviewsService.createReview(buyerId, dto);
  }

  @Put(':id/reply')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '卖家回复评价' })
  async replyReview(
    @CurrentUser('id') sellerId: string,
    @Param('id') reviewId: string,
    @Body('reply') reply: string,
  ) {
    return this.reviewsService.replyReview(sellerId, reviewId, reply);
  }

  @Public()
  @Get('product/:productId')
  @ApiOperation({ summary: '获取商品评价列表' })
  async getProductReviews(
    @Param('productId') productId: string,
    @Query('page', new ParseIntPipe({ optional: true })) page?: number,
    @Query('limit', new ParseIntPipe({ optional: true })) limit?: number,
  ) {
    return this.reviewsService.getProductReviews(productId, page, limit);
  }

  @Public()
  @Get('seller/:sellerId')
  @ApiOperation({ summary: '获取卖家评价列表' })
  async getSellerReviews(
    @Param('sellerId') sellerId: string,
    @Query('page', new ParseIntPipe({ optional: true })) page?: number,
    @Query('limit', new ParseIntPipe({ optional: true })) limit?: number,
  ) {
    return this.reviewsService.getSellerReviews(sellerId, page, limit);
  }

  @Public()
  @Get('seller/:sellerId/rating')
  @ApiOperation({ summary: '获取卖家信用评分' })
  async getSellerRating(@Param('sellerId') sellerId: string) {
    return this.reviewsService.getSellerRating(sellerId);
  }

  @Post(':id/like')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '点赞评价' })
  async likeReview(
    @CurrentUser('id') userId: string,
    @Param('id') reviewId: string,
  ) {
    return this.reviewsService.likeReview(userId, reviewId);
  }

  @Post(':id/unlike')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '取消点赞' })
  async unlikeReview(
    @CurrentUser('id') userId: string,
    @Param('id') reviewId: string,
  ) {
    return this.reviewsService.unlikeReview(userId, reviewId);
  }
}
