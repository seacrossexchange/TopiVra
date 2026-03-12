import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsUUID,
  IsInt,
  IsEnum,
  IsArray,
  ValidateNested,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { OrderStatus, PaymentStatus } from '@prisma/client';

// ==================== 创建订单 ====================

export class CreateOrderItemDto {
  @ApiProperty({ description: '商品ID' })
  @IsUUID()
  productId: string;

  @ApiProperty({ description: '数量', default: 1 })
  @IsInt()
  @Min(1)
  quantity: number;
}

export class CreateOrderDto {
  @ApiProperty({ description: '订单项列表', type: [CreateOrderItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateOrderItemDto)
  items: CreateOrderItemDto[];

  @ApiPropertyOptional({ description: '买家备注' })
  @IsOptional()
  @IsString()
  buyerRemark?: string;
}

// ==================== 更新订单状态 ====================

export class UpdateOrderStatusDto {
  @ApiProperty({ description: '订单状态', enum: OrderStatus })
  @IsEnum(OrderStatus)
  orderStatus: OrderStatus;

  @ApiPropertyOptional({ description: '管理员备注' })
  @IsOptional()
  @IsString()
  adminRemark?: string;
}

// ==================== 交付凭证 ====================

export class DeliverOrderDto {
  @ApiPropertyOptional({ description: '交付凭证（JSON格式）' })
  @IsOptional()
  deliveredCredentials?: any;
}

// ==================== 查询过滤 ====================

export class OrderQueryDto {
  @ApiPropertyOptional({ description: '订单状态' })
  @IsOptional()
  @IsEnum(OrderStatus)
  orderStatus?: OrderStatus;

  @ApiPropertyOptional({ description: '支付状态' })
  @IsOptional()
  @IsEnum(PaymentStatus)
  paymentStatus?: PaymentStatus;

  @ApiPropertyOptional({ description: '页码', default: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ description: '每页数量', default: 10 })
  @IsOptional()
  @IsInt()
  @Min(1)
  limit?: number;

  @ApiPropertyOptional({ description: '开始日期' })
  @IsOptional()
  @IsString()
  startDate?: string;

  @ApiPropertyOptional({ description: '结束日期' })
  @IsOptional()
  @IsString()
  endDate?: string;

  @ApiPropertyOptional({ description: '搜索关键词（订单号）' })
  @IsOptional()
  @IsString()
  search?: string;
}
