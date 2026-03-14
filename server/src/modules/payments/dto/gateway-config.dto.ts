/**
 * 支付通道配置 DTO
 */
import {
  IsString,
  IsBoolean,
  IsObject,
  IsOptional,
  IsInt,
  Min,
  Max,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateGatewayConfigDto {
  @ApiPropertyOptional({ description: '是否启用' })
  @IsBoolean()
  @IsOptional()
  enabled?: boolean;

  @ApiPropertyOptional({
    description: '通道配置',
    type: 'object',
    additionalProperties: true,
  })
  @IsObject()
  @IsOptional()
  config?: Record<string, any>;

  @ApiPropertyOptional({ description: '排序', minimum: 0, maximum: 100 })
  @IsInt()
  @Min(0)
  @Max(100)
  @IsOptional()
  sort?: number;
}

export class GatewayConfigDto {
  @ApiProperty({ description: '通道代码' })
  @IsString()
  code: string;

  @ApiProperty({ description: '通道名称' })
  @IsString()
  name: string;

  @ApiProperty({ description: '是否启用' })
  @IsBoolean()
  enabled: boolean;

  @ApiProperty({
    description: '通道配置',
    type: 'object',
    additionalProperties: true,
  })
  @IsObject()
  config: Record<string, any>;

  @ApiProperty({ description: '排序' })
  @IsInt()
  sort: number;
}

export class TestGatewayDto {
  @ApiPropertyOptional({ description: '测试金额' })
  @IsOptional()
  amount?: number;
}
