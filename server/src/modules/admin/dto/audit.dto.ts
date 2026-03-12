import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum AuditAction {
  APPROVE = 'approve',
  REJECT = 'reject',
}

export class AuditSellerDto {
  @ApiProperty({ description: '审核操作', enum: AuditAction })
  @IsEnum(AuditAction, { message: '审核操作必须是 approve 或 reject' })
  action: AuditAction;

  @ApiPropertyOptional({ description: '审核备注', maxLength: 500 })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  remark?: string;
}

export class AuditWithdrawalDto {
  @ApiProperty({ description: '审核操作', enum: AuditAction })
  @IsEnum(AuditAction, { message: '审核操作必须是 approve 或 reject' })
  action: AuditAction;

  @ApiPropertyOptional({ description: '审核备注', maxLength: 500 })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  remark?: string;
}
