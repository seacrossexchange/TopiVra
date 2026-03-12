import {
  IsString,
  IsNumber,
  IsOptional,
  IsBoolean,
  Min,
  Max,
  MaxLength,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateSettingsDto {
  @ApiPropertyOptional({ description: '平台名称', maxLength: 100 })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  platformName?: string;

  @ApiPropertyOptional({ description: '平台描述', maxLength: 500 })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  platformDescription?: string;

  @ApiPropertyOptional({ description: '佣金率', minimum: 0, maximum: 1 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  serviceFeeRate?: number;

  @ApiPropertyOptional({ description: '提现手续费率', minimum: 0, maximum: 1 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  withdrawalFeeRate?: number;

  @ApiPropertyOptional({ description: '最低提现金额', minimum: 1 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  minWithdrawalAmount?: number;

  @ApiPropertyOptional({
    description: '支付超时时间(分钟)',
    minimum: 5,
    maximum: 1440,
  })
  @IsOptional()
  @IsNumber()
  @Min(5)
  @Max(1440)
  paymentTimeoutMinutes?: number;

  @ApiPropertyOptional({
    description: '自动确认收货时间(小时)',
    minimum: 1,
    maximum: 720,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(720)
  autoConfirmHours?: number;

  @ApiPropertyOptional({ description: '是否开启注册' })
  @IsOptional()
  @IsBoolean()
  registrationEnabled?: boolean;

  @ApiPropertyOptional({ description: '是否开启卖家申请' })
  @IsOptional()
  @IsBoolean()
  sellerApplicationEnabled?: boolean;

  @ApiPropertyOptional({ description: '联系邮箱', maxLength: 100 })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  contactEmail?: string;

  @ApiPropertyOptional({ description: '联系 Telegram', maxLength: 100 })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  contactTelegram?: string;
}
