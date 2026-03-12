import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsInt,
  Min,
  Max,
  IsBoolean,
  IsUUID,
  IsArray,
} from 'class-validator';

export class CreateReviewDto {
  @ApiProperty({ description: '订单ID' })
  @IsUUID()
  @IsNotEmpty()
  orderId: string;

  @ApiProperty({ description: '评分 1-5', minimum: 1, maximum: 5 })
  @IsInt()
  @Min(1)
  @Max(5)
  rating: number;

  @ApiPropertyOptional({ description: '评价内容' })
  @IsOptional()
  @IsString()
  content?: string;

  @ApiPropertyOptional({ description: '评价标签' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiPropertyOptional({ description: '是否匿名', default: false })
  @IsOptional()
  @IsBoolean()
  isAnonymous?: boolean;
}

export class QueryReviewDto {
  @ApiPropertyOptional({ description: '页码', default: 1 })
  @IsOptional()
  page?: number = 1;

  @ApiPropertyOptional({ description: '每页数量', default: 10 })
  @IsOptional()
  limit?: number = 10;
}

export class SellerReviewStatsDto {
  @ApiProperty({ description: '平均评分' })
  averageRating: number;

  @ApiProperty({ description: '总评价数' })
  totalReviews: number;

  @ApiProperty({ description: '各星级数量' })
  ratingDistribution: {
    1: number;
    2: number;
    3: number;
    4: number;
    5: number;
  };
}
