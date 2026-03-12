import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsEnum, IsUUID, MaxLength, IsArray } from 'class-validator';
import { Type } from 'class-transformer';
import { MessageType } from '@prisma/client';

export class SendMessageDto {
  @ApiProperty({ description: '接收者ID' })
  @IsUUID()
  receiverId: string;

  @ApiProperty({ description: '消息内容', maxLength: 5000 })
  @IsString()
  @MaxLength(5000)
  content: string;

  @ApiPropertyOptional({ description: '消息类型', enum: MessageType, default: MessageType.TEXT })
  @IsEnum(MessageType)
  @IsOptional()
  messageType?: MessageType;

  @ApiPropertyOptional({ description: '附件列表' })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  attachments?: string[];

  @ApiPropertyOptional({ description: '关联订单ID' })
  @IsUUID()
  @IsOptional()
  orderId?: string;

  @ApiPropertyOptional({ description: '关联商品ID' })
  @IsUUID()
  @IsOptional()
  productId?: string;
}

export class MessageQueryDto {
  @ApiPropertyOptional({ description: '会话对方用户ID' })
  @IsUUID()
  @IsOptional()
  userId?: string;

  @ApiPropertyOptional({ description: '页码', default: 1 })
  @Type(() => Number)
  @IsOptional()
  page?: number = 1;

  @ApiPropertyOptional({ description: '每页数量', default: 20 })
  @Type(() => Number)
  @IsOptional()
  limit?: number = 20;

  @ApiPropertyOptional({ description: '是否只看未读' })
  @IsOptional()
  unreadOnly?: boolean;
}

export class ConversationQueryDto {
  @ApiPropertyOptional({ description: '页码', default: 1 })
  @Type(() => Number)
  @IsOptional()
  page?: number = 1;

  @ApiPropertyOptional({ description: '每页数量', default: 20 })
  @Type(() => Number)
  @IsOptional()
  limit?: number = 20;
}

export class MarkAsReadDto {
  @ApiProperty({ description: '消息ID列表' })
  @IsArray()
  @IsUUID('4', { each: true })
  messageIds: string[];
}