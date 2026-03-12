import {
  IsString,
  IsOptional,
  IsNumber,
  IsEnum,
  IsArray,
  IsObject,
  Min,
  Max,
  IsUUID,
} from 'class-validator';
import { Type } from 'class-transformer';
import {
  ApiProperty,
  ApiPropertyOptional,
  PartialType,
  OmitType,
} from '@nestjs/swagger';
import { ProductStatus } from '@prisma/client';

// ==================== 创建商品 DTO ====================

export class CreateProductDto {
  @ApiProperty({ description: '商品标题' })
  @IsString()
  title: string;

  @ApiProperty({ description: '商品描述' })
  @IsString()
  description: string;

  @ApiProperty({ description: '平台' })
  @IsString()
  platform: string;

  @ApiPropertyOptional({ description: '账号类型' })
  @IsOptional()
  @IsString()
  accountType?: string;

  @ApiPropertyOptional({ description: '地区' })
  @IsOptional()
  @IsString()
  region?: string;

  @ApiPropertyOptional({ description: '分类ID' })
  @IsUUID()
  categoryId: string;

  @ApiProperty({ description: '价格' })
  @IsNumber()
  @Min(0)
  price: number;

  @ApiPropertyOptional({ description: '原价' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  originalPrice?: number;

  @ApiPropertyOptional({ description: '货币', default: 'USD' })
  @IsOptional()
  @IsString()
  currency?: string;

  @ApiProperty({ description: '库存' })
  @IsNumber()
  @Min(0)
  stock: number;

  @ApiPropertyOptional({ description: '标签 (JSON数组)' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiPropertyOptional({ description: '账号属性 (JSON对象)' })
  @IsOptional()
  @IsObject()
  attributes?: Record<string, any>;

  @ApiPropertyOptional({ description: '图片URL列表' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  images?: string[];

  @ApiPropertyOptional({ description: '缩略图URL' })
  @IsOptional()
  @IsString()
  thumbnailUrl?: string;

  @ApiPropertyOptional({ description: 'SEO标题' })
  @IsOptional()
  @IsString()
  metaTitle?: string;

  @ApiPropertyOptional({ description: 'SEO描述' })
  @IsOptional()
  @IsString()
  metaDescription?: string;
}

// ==================== 更新商品 DTO ====================

export class UpdateProductDto extends PartialType(
  OmitType(CreateProductDto, ['categoryId'] as const),
) {
  @ApiPropertyOptional({ description: '分类ID' })
  @IsOptional()
  @IsUUID()
  categoryId?: string;
}

// ==================== 商品查询 DTO ====================

export class ProductQueryDto {
  @ApiPropertyOptional({ description: '页码', default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ description: '每页数量', default: 10 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number = 10;

  @ApiPropertyOptional({ description: '分类ID' })
  @IsOptional()
  @IsUUID()
  categoryId?: string;

  @ApiPropertyOptional({ description: '平台' })
  @IsOptional()
  @IsString()
  platform?: string;

  @ApiPropertyOptional({ description: '地区' })
  @IsOptional()
  @IsString()
  region?: string;

  @ApiPropertyOptional({ description: '商品状态', enum: ProductStatus })
  @IsOptional()
  @IsEnum(ProductStatus)
  status?: ProductStatus;

  @ApiPropertyOptional({ description: '最低价格' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  minPrice?: number;

  @ApiPropertyOptional({ description: '最高价格' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  maxPrice?: number;

  @ApiPropertyOptional({ description: '搜索关键词' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ description: '排序字段', default: 'createdAt' })
  @IsOptional()
  @IsString()
  sortBy?: string;

  @ApiPropertyOptional({ description: '排序方向', default: 'desc' })
  @IsOptional()
  @IsString()
  sortOrder?: 'asc' | 'desc';

  @ApiPropertyOptional({ description: '卖家ID' })
  @IsOptional()
  @IsUUID()
  sellerId?: string;
}

// ==================== 审核商品 DTO ====================

export class AuditProductDto {
  @ApiProperty({ description: '审核状态', enum: ['APPROVED', 'REJECTED'] })
  @IsEnum(['APPROVED', 'REJECTED'])
  status: 'APPROVED' | 'REJECTED';

  @ApiPropertyOptional({ description: '拒绝原因' })
  @IsOptional()
  @IsString()
  rejectReason?: string;
}

// ==================== 批量操作 DTO ====================

export class BatchOperationDto {
  @ApiProperty({ description: '商品ID列表' })
  @IsArray()
  @IsUUID('4', { each: true })
  ids: string[];

  @ApiProperty({
    description: '操作类型',
    enum: ['delete', 'offline', 'online'],
  })
  @IsEnum(['delete', 'offline', 'online'])
  action: 'delete' | 'offline' | 'online';
}
