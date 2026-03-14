import {
  IsString,
  IsOptional,
  MinLength,
  MaxLength,
  IsEnum,
  IsInt,
  Min,
  Max,
  IsArray,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum BlogStatus {
  DRAFT = 'DRAFT',
  PUBLISHED = 'PUBLISHED',
  ARCHIVED = 'ARCHIVED',
}

export enum ContentType {
  MARKDOWN = 'MARKDOWN',
  HTML = 'HTML',
  RICH_TEXT = 'RICH_TEXT',
}

export class CreateBlogDto {
  @ApiProperty({ description: '文章标题', minLength: 2, maxLength: 200 })
  @IsString()
  @MinLength(2, { message: '标题至少 2 个字符' })
  @MaxLength(200, { message: '标题最多 200 个字符' })
  title!: string;

  @ApiProperty({ description: '文章 Slug', maxLength: 200 })
  @IsString()
  @MaxLength(200)
  slug!: string;

  @ApiPropertyOptional({ description: '文章摘要', maxLength: 500 })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  excerpt?: string;

  @ApiProperty({ description: '文章内容' })
  @IsString()
  @MinLength(10, { message: '内容至少 10 个字符' })
  content!: string;

  @ApiPropertyOptional({ description: '封面图片 URL', maxLength: 500 })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  coverImage?: string;

  @ApiPropertyOptional({ description: '分类 ID' })
  @IsOptional()
  @IsString()
  categoryId?: string;

  @ApiPropertyOptional({ description: '标签ID数组', type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tagIds?: string[];

  @ApiPropertyOptional({ description: '内容格式', enum: ContentType })
  @IsOptional()
  @IsEnum(ContentType)
  contentType?: ContentType;
}

export class UpdateBlogDto {
  @ApiPropertyOptional({
    description: '文章标题',
    minLength: 2,
    maxLength: 200,
  })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(200)
  title?: string;

  @ApiPropertyOptional({ description: '文章 Slug', maxLength: 200 })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  slug?: string;

  @ApiPropertyOptional({ description: '文章摘要', maxLength: 500 })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  excerpt?: string;

  @ApiPropertyOptional({ description: '文章内容' })
  @IsOptional()
  @IsString()
  @MinLength(10)
  content?: string;

  @ApiPropertyOptional({ description: '封面图片 URL', maxLength: 500 })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  coverImage?: string;

  @ApiPropertyOptional({ description: '分类 ID' })
  @IsOptional()
  @IsString()
  categoryId?: string;

  @ApiPropertyOptional({ description: '标签ID数组', type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tagIds?: string[];

  @ApiPropertyOptional({ description: '文章状态', enum: BlogStatus })
  @IsOptional()
  @IsEnum(BlogStatus)
  status?: BlogStatus;

  @ApiPropertyOptional({ description: '内容格式', enum: ContentType })
  @IsOptional()
  @IsEnum(ContentType)
  contentType?: ContentType;
}

export class BlogQueryDto {
  @ApiPropertyOptional({ description: '搜索关键词' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ description: '文章状态', enum: BlogStatus })
  @IsOptional()
  @IsEnum(BlogStatus)
  status?: BlogStatus;

  @ApiPropertyOptional({ description: '分类 ID' })
  @IsOptional()
  @IsString()
  categoryId?: string;

  @ApiPropertyOptional({ description: '标签 ID' })
  @IsOptional()
  @IsString()
  tagId?: string;

  @ApiPropertyOptional({ description: '页码', default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ description: '每页数量', default: 10 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;
}

export class CreateTagDto {
  @ApiProperty({ description: '标签名称', maxLength: 50 })
  @IsString()
  @MaxLength(50)
  name!: string;

  @ApiProperty({ description: '标签 Slug', maxLength: 50 })
  @IsString()
  @MaxLength(50)
  slug!: string;

  @ApiPropertyOptional({ description: '标签描述', maxLength: 200 })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  description?: string;

  @ApiPropertyOptional({ description: '标签颜色', maxLength: 20 })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  color?: string;
}

export class CreateCommentDto {
  @ApiProperty({ description: '评论内容' })
  @IsString()
  @MinLength(1)
  @MaxLength(1000)
  content!: string;

  @ApiPropertyOptional({ description: '父评论ID（回复）' })
  @IsOptional()
  @IsString()
  parentId?: string;
}
