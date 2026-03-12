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
import { ReviewsService } from './reviews.service';
import { CreateReviewDto, QueryReviewDto } from './dto/review.dto';

@ApiTags('reviews')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('reviews')
export class ReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  @Post()
  @ApiOperation({ summary: '创建评价' })
  async create(
    @CurrentUser('id') userId: string,
    @Body() dto: CreateReviewDto,
  ) {
    return this.reviewsService.create(userId, dto);
  }
}

@ApiTags('reviews')
@Controller('reviews')
export class PublicReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  @Get('product/:productId')
  @ApiOperation({ summary: '获取商品评价列表' })
  async findByProduct(
    @Param('productId', ParseUUIDPipe) productId: string,
    @Query() query: QueryReviewDto,
  ) {
    return this.reviewsService.findByProduct(productId, query);
  }

  @Get('seller/:sellerId')
  @ApiOperation({ summary: '获取卖家评价列表' })
  async findBySeller(
    @Param('sellerId', ParseUUIDPipe) sellerId: string,
    @Query() query: QueryReviewDto,
  ) {
    return this.reviewsService.findBySeller(sellerId, query);
  }

  @Get('seller/:sellerId/stats')
  @ApiOperation({ summary: '获取卖家评价统计' })
  async getSellerStats(@Param('sellerId', ParseUUIDPipe) sellerId: string) {
    return this.reviewsService.getSellerStats(sellerId);
  }
}
