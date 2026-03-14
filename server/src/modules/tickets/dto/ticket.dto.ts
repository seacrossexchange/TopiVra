import { IsString, IsOptional, IsEnum, IsNumber, IsArray, IsBoolean } from 'class-validator';
import { Type } from 'class-transformer';

export enum TicketType {
  REFUND = 'REFUND',
  DM = 'DM',
  SUPPORT = 'SUPPORT',
  COMPLAINT = 'COMPLAINT',
}

export enum TicketStatus {
  PENDING = 'PENDING',
  SELLER_REVIEWING = 'SELLER_REVIEWING',
  SELLER_AGREED = 'SELLER_AGREED',
  SELLER_REJECTED = 'SELLER_REJECTED',
  SELLER_OFFERED_REPLACEMENT = 'SELLER_OFFERED_REPLACEMENT', // 卖家提供换货
  BUYER_ACCEPTED_REPLACEMENT = 'BUYER_ACCEPTED_REPLACEMENT', // 买家接受换货
  BUYER_REJECTED_REPLACEMENT = 'BUYER_REJECTED_REPLACEMENT', // 买家拒绝换货
  REPLACEMENT_DELIVERED = 'REPLACEMENT_DELIVERED', // 换货已发货
  ADMIN_REVIEWING = 'ADMIN_REVIEWING',
  ADMIN_APPROVED = 'ADMIN_APPROVED',
  ADMIN_REJECTED = 'ADMIN_REJECTED',
  COMPLETED = 'COMPLETED',
  CLOSED = 'CLOSED',
  CANCELLED = 'CANCELLED',
}

export enum TicketPriority {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  URGENT = 'URGENT',
}

export enum SenderRole {
  BUYER = 'BUYER',
  SELLER = 'SELLER',
  ADMIN = 'ADMIN',
  SYSTEM = 'SYSTEM',
}

// 创建退款工单
export class CreateRefundTicketDto {
  @IsString()
  orderId: string;

  @IsString()
  refundReason: string;

  @IsOptional()
  @IsArray()
  refundEvidence?: string[];

  @IsOptional()
  @IsNumber()
  refundAmount?: number;
}

// 创建私信工单
export class CreateDMTicketDto {
  @IsString()
  sellerId: string;

  @IsString()
  subject: string;

  @IsString()
  content: string;

  @IsOptional()
  @IsString()
  orderId?: string;
}

// 发送消息
export class SendMessageDto {
  @IsString()
  content: string;

  @IsOptional()
  @IsArray()
  attachments?: string[];

  @IsOptional()
  @IsBoolean()
  isInternal?: boolean;
}

// 卖家响应退款
export class SellerRespondDto {
  @IsEnum(['AGREE', 'REJECT', 'OFFER_REPLACEMENT'])
  action: 'AGREE' | 'REJECT' | 'OFFER_REPLACEMENT';

  @IsOptional()
  @IsString()
  response?: string;

  @IsOptional()
  @IsString()
  rejectReason?: string;

  @IsOptional()
  @IsString()
  replacementReason?: string; // 换货说明
}

// 买家响应换货
export class BuyerRespondReplacementDto {
  @IsEnum(['ACCEPT', 'REJECT'])
  action: 'ACCEPT' | 'REJECT';

  @IsOptional()
  @IsString()
  reason?: string;
}

// 卖家发货换货商品
export class DeliverReplacementDto {
  @IsString()
  deliveryInfo: string; // 新账号信息

  @IsOptional()
  @IsString()
  note?: string;
}

// 买家申请平台介入
export class EscalateTicketDto {
  @IsString()
  reason: string;
}

// 管理员处理工单
export class AdminProcessTicketDto {
  @IsEnum(['APPROVE', 'REJECT'])
  action: 'APPROVE' | 'REJECT';

  @IsOptional()
  @IsString()
  adminResponse?: string;

  @IsOptional()
  @IsNumber()
  refundAmount?: number;
}

// 查询工单列表
export class TicketQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  limit?: number = 20;

  @IsOptional()
  @IsEnum(TicketType)
  type?: TicketType;

  @IsOptional()
  @IsEnum(TicketStatus)
  status?: TicketStatus;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsString()
  startDate?: string;

  @IsOptional()
  @IsString()
  endDate?: string;
}
