import { IsString, IsOptional, MaxLength, IsEmail } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateSellerProfileDto {
  @ApiPropertyOptional({ description: '店铺名称', minLength: 2, maxLength: 50 })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  shopName?: string;

  @ApiPropertyOptional({ description: '店铺描述', maxLength: 500 })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  shopDescription?: string;

  @ApiPropertyOptional({ description: 'Telegram 联系方式', maxLength: 100 })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  contactTelegram?: string;

  @ApiPropertyOptional({ description: '联系邮箱' })
  @IsOptional()
  @IsEmail()
  contactEmail?: string;
}
