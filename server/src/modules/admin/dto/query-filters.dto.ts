import { IsOptional, IsString, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class AdminQueryFiltersDto {
  @ApiPropertyOptional({ description: '搜索关键词' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ description: '状态筛选' })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional({ description: '类型筛选' })
  @IsOptional()
  @IsString()
  type?: string;

  @ApiPropertyOptional({ description: '等级筛选' })
  @IsOptional()
  @IsString()
  level?: string;

  @ApiPropertyOptional({ description: '平台筛选' })
  @IsOptional()
  @IsString()
  platform?: string;

  @ApiPropertyOptional({ description: '开始日期' })
  @IsOptional()
  @IsString()
  startDate?: string;

  @ApiPropertyOptional({ description: '结束日期' })
  @IsOptional()
  @IsString()
  endDate?: string;

  @ApiPropertyOptional({ description: '页码', default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ description: '每页数量（旧参数）', default: 10 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;

  @ApiPropertyOptional({ description: '每页数量', default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize?: number;
}
