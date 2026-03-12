import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsBoolean,
  IsInt,
  IsUUID,
  MaxLength,
} from 'class-validator';

export class CreateCategoryDto {
  @ApiPropertyOptional({ description: '父分类ID' })
  @IsOptional()
  @IsUUID()
  parentId?: string;

  @ApiProperty({ description: '分类名称' })
  @IsString()
  @MaxLength(50)
  name: string;

  @ApiProperty({ description: '分类slug' })
  @IsString()
  @MaxLength(50)
  slug: string;

  @ApiPropertyOptional({ description: '分类图标' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  icon?: string;

  @ApiPropertyOptional({ description: '分类颜色' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  color?: string;

  @ApiPropertyOptional({ description: '分类描述' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  description?: string;

  @ApiPropertyOptional({ description: '排序权重', default: 0 })
  @IsOptional()
  @IsInt()
  sortOrder?: number;

  @ApiPropertyOptional({ description: '是否启用', default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateCategoryDto {
  @ApiPropertyOptional({ description: '父分类ID' })
  @IsOptional()
  @IsUUID()
  parentId?: string;

  @ApiPropertyOptional({ description: '分类名称' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  name?: string;

  @ApiPropertyOptional({ description: '分类slug' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  slug?: string;

  @ApiPropertyOptional({ description: '分类图标' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  icon?: string;

  @ApiPropertyOptional({ description: '分类颜色' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  color?: string;

  @ApiPropertyOptional({ description: '分类描述' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  description?: string;

  @ApiPropertyOptional({ description: '排序权重' })
  @IsOptional()
  @IsInt()
  sortOrder?: number;

  @ApiPropertyOptional({ description: '是否启用' })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
