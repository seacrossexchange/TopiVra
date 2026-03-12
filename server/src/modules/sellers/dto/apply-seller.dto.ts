import {
  IsString,
  MinLength,
  MaxLength,
  IsOptional,
  IsEmail,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ApplySellerDto {
  @ApiProperty({ description: '店铺名称', minLength: 2, maxLength: 50 })
  @IsString()
  @MinLength(2)
  @MaxLength(50)
  shopName: string;

  @ApiPropertyOptional({ description: '店铺描述', maxLength: 500 })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  shopDescription?: string;

  @ApiPropertyOptional({ description: 'Telegram 联系方式' })
  @IsOptional()
  @IsString()
  contactTelegram?: string;

  @ApiPropertyOptional({ description: '联系邮箱' })
  @IsOptional()
  @IsEmail()
  contactEmail?: string;
}
