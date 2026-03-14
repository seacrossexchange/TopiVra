import {
  IsString,
  IsOptional,
  IsNumber,
  IsArray,
  IsUUID,
  IsEnum,
  IsPositive,
  MaxLength,
  Min,
  IsBoolean,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

// RefundStatus enum - matches Prisma schema
export enum RefundStatus {
  PENDING = 'PENDING', // 待卖家响应
  SELLER_AGREED = 'SELLER_AGREED', // 卖家同意
  SELLER_REJECTED = 'SELLER_REJECTED', // 卖家拒绝
  DISPUTED = 'DISPUTED', // 平台介入
  PROCESSING = 'PROCESSING', // 处理中
  COMPLETED = 'COMPLETED', // 已完成
  REJECTED = 'REJECTED', // 已拒绝
  CANCELLED = 'CANCELLED', // 已取消
}

// Refund type enum
export enum RefundType {
  REFUND_ONLY = 'REFUND_ONLY', // 仅退款
  RETURN_REFUND = 'RETURN_REFUND', // 退货退款
}

// ==================== 创建退款申请 ====================

export class CreateRefundRequestDto {
  @ApiProperty({ description: '订单ID' })
  @IsUUID()
  orderId!: string;

  @ApiPropertyOptional({ description: '订单项ID（部分退款时必填）' })
  @IsOptional()
  @IsUUID()
  orderItemId?: string;

  @ApiProperty({ description: '退款金额' })
  @IsNumber()
  @IsPositive()
  @Min(0.01)
  refundAmount!: number;

  @ApiPropertyOptional({
    description: '退款类型',
    enum: RefundType,
    default: RefundType.REFUND_ONLY,
  })
  @IsOptional()
  @IsEnum(RefundType)
  refundType?: RefundType;

  @ApiProperty({ description: '退款原因' })
  @IsString()
  @MaxLength(500)
  reason!: string;

  @ApiPropertyOptional({ description: '详细描述' })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @ApiPropertyOptional({ description: '证据图片URL列表', type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  evidence?: string[];
}

// ==================== 更新退款申请 ====================

export class UpdateRefundRequestDto {
  @ApiPropertyOptional({ description: '退款原因' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;

  @ApiPropertyOptional({ description: '详细描述' })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @ApiPropertyOptional({ description: '证据图片URL列表', type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  evidence?: string[];
}

// ==================== 卖家响应退款 ====================

export class SellerRespondRefundDto {
  @ApiProperty({ description: '是否同意退款' })
  @IsBoolean()
  agreed!: boolean;

  @ApiPropertyOptional({ description: '卖家回复说明' })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  sellerResponse?: string;

  @ApiPropertyOptional({ description: '拒绝原因（拒绝时建议填写）' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  rejectReason?: string;
}

// ==================== 买家升级纠纷（平台介入） ====================

export class EscalateRefundDto {
  @ApiProperty({ description: '升级原因' })
  @IsString()
  @MaxLength(500)
  escalateReason!: string;
}

// ==================== 管理员处理退款 ====================

export class AdminProcessRefundDto {
  @ApiProperty({
    description: '处理动作',
    enum: ['APPROVE', 'REJECT', 'PROCESS'],
  })
  @IsEnum(['APPROVE', 'REJECT', 'PROCESS'])
  action!: 'APPROVE' | 'REJECT' | 'PROCESS';

  @ApiPropertyOptional({ description: '管理员处理说明' })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  adminResponse?: string;

  @ApiPropertyOptional({ description: '拒绝原因（拒绝时必填）' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  rejectReason?: string;
}

// ==================== 取消退款申请 ====================

export class CancelRefundDto {
  @ApiPropertyOptional({ description: '取消原因' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  cancelReason?: string;
}

// ==================== 退款查询过滤器 ====================

export class RefundQueryDto {
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
  limit?: number = 10;

  @ApiPropertyOptional({ description: '订单ID' })
  @IsOptional()
  @IsUUID()
  orderId?: string;

  @ApiPropertyOptional({ description: '用户ID' })
  @IsOptional()
  @IsUUID()
  userId?: string;

  @ApiPropertyOptional({ description: '卖家ID' })
  @IsOptional()
  @IsUUID()
  sellerId?: string;

  @ApiPropertyOptional({ description: '退款状态', enum: RefundStatus })
  @IsOptional()
  @IsEnum(RefundStatus)
  status?: RefundStatus;

  @ApiPropertyOptional({ description: '退款类型', enum: RefundType })
  @IsOptional()
  @IsEnum(RefundType)
  refundType?: RefundType;

  @ApiPropertyOptional({ description: '开始日期' })
  @IsOptional()
  @IsString()
  startDate?: string;

  @ApiPropertyOptional({ description: '结束日期' })
  @IsOptional()
  @IsString()
  endDate?: string;
}

// ==================== 管理员退款查询 ====================

export class AdminRefundQueryDto extends RefundQueryDto {
  @ApiPropertyOptional({ description: '退款单号' })
  @IsOptional()
  @IsString()
  refundNo?: string;

  @ApiPropertyOptional({ description: '搜索关键词' })
  @IsOptional()
  @IsString()
  search?: string;
}

// ==================== 卖家退款查询 ====================

export class SellerRefundQueryDto extends RefundQueryDto {
  // 卖家只能查看自己的退款
}

// ==================== 退款统计 ====================

export class RefundStatsDto {
  @ApiProperty({ description: '待响应数量' })
  pending!: number;

  @ApiProperty({ description: '卖家同意数量' })
  sellerAgreed!: number;

  @ApiProperty({ description: '卖家拒绝数量' })
  sellerRejected!: number;

  @ApiProperty({ description: '平台介入数量' })
  disputed!: number;

  @ApiProperty({ description: '处理中数量' })
  processing!: number;

  @ApiProperty({ description: '已完成数量' })
  completed!: number;

  @ApiProperty({ description: '已拒绝数量' })
  rejected!: number;

  @ApiProperty({ description: '已取消数量' })
  cancelled!: number;

  @ApiProperty({ description: '退款总金额' })
  totalAmount!: number;
}
