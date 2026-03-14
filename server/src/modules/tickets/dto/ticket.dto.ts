import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsBoolean,
  IsUUID,
  MaxLength,
  IsArray,
} from 'class-validator';

export enum TicketType {
  PRODUCT = 'PRODUCT',
  ORDER = 'ORDER',
  PAYMENT = 'PAYMENT',
  ACCOUNT = 'ACCOUNT',
  OTHER = 'OTHER',
}

export enum TicketPriority {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  URGENT = 'URGENT',
}

export enum TicketStatus {
  OPEN = 'OPEN',
  IN_PROGRESS = 'IN_PROGRESS',
  WAITING = 'WAITING',
  RESOLVED = 'RESOLVED',
  CLOSED = 'CLOSED',
}

export class CreateTicketDto {
  @ApiProperty({ description: '工单标题', maxLength: 200 })
  @IsString()
  @IsNotEmpty({ message: '工单标题不能为空' })
  @MaxLength(200)
  subject!: string;

  @ApiProperty({ description: '工单类型', enum: TicketType })
  @IsEnum(TicketType, { message: '工单类型无效' })
  type!: TicketType;

  @ApiProperty({ description: '工单内容' })
  @IsString()
  @IsNotEmpty({ message: '工单内容不能为空' })
  content!: string;

  @ApiPropertyOptional({
    description: '工单优先级',
    enum: TicketPriority,
    default: TicketPriority.MEDIUM,
  })
  @IsOptional()
  @IsEnum(TicketPriority)
  priority?: TicketPriority;
}

export class ReplyTicketDto {
  @ApiProperty({ description: '回复内容' })
  @IsString()
  @IsNotEmpty({ message: '回复内容不能为空' })
  content!: string;

  @ApiPropertyOptional({ description: '是否内部备注', default: false })
  @IsOptional()
  @IsBoolean()
  isInternal?: boolean;

  @ApiPropertyOptional({ description: '附件URL列表' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  attachments?: string[];
}

export class UpdateTicketDto extends PartialType(CreateTicketDto) {
  @ApiPropertyOptional({ description: '工单状态', enum: TicketStatus })
  @IsOptional()
  @IsEnum(TicketStatus)
  status?: TicketStatus;

  @ApiPropertyOptional({ description: '工单优先级', enum: TicketPriority })
  @IsOptional()
  @IsEnum(TicketPriority)
  priority?: TicketPriority;

  @ApiPropertyOptional({ description: '指派人ID' })
  @IsOptional()
  @IsUUID()
  assigneeId?: string;
}

export class QueryTicketDto {
  @ApiPropertyOptional({ description: '页码', default: 1 })
  @IsOptional()
  page?: number = 1;

  @ApiPropertyOptional({ description: '每页数量', default: 10 })
  @IsOptional()
  limit?: number = 10;

  @ApiPropertyOptional({ description: '工单状态', enum: TicketStatus })
  @IsOptional()
  @IsEnum(TicketStatus)
  status?: TicketStatus;

  @ApiPropertyOptional({ description: '工单优先级', enum: TicketPriority })
  @IsOptional()
  @IsEnum(TicketPriority)
  priority?: TicketPriority;

  @ApiPropertyOptional({ description: '工单类型', enum: TicketType })
  @IsOptional()
  @IsEnum(TicketType)
  type?: TicketType;
}
