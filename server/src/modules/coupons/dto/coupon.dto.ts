import {
  IsString,
  IsNumber,
  IsEnum,
  IsOptional,
  IsDate,
  Min,
  Max,
  IsArray,
} from 'class-validator';
import { Type } from 'class-transformer';

export enum CouponType {
  PERCENTAGE = 'PERCENTAGE', // 百分比折扣
  FIXED = 'FIXED', // 固定金额
  FREE_SHIPPING = 'FREE_SHIPPING', // 免运费（预留）
}

export enum CouponStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  EXPIRED = 'EXPIRED',
}

export class CreateCouponDto {
  @IsString()
  code: string;

  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsEnum(CouponType)
  type: CouponType;

  @IsNumber()
  @Min(0)
  value: number; // 折扣值（百分比或固定金额）

  @IsOptional()
  @IsNumber()
  @Min(0)
  minPurchase?: number; // 最低消费金额

  @IsOptional()
  @IsNumber()
  @Min(0)
  maxDiscount?: number; // 最大折扣金额（用于百分比折扣）

  @IsOptional()
  @IsNumber()
  @Min(1)
  usageLimit?: number; // 总使用次数限制

  @IsOptional()
  @IsNumber()
  @Min(1)
  userUsageLimit?: number; // 每用户使用次数限制

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  startDate?: Date;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  endDate?: Date;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  applicablePlatforms?: string[]; // 适用平台

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  applicableCategories?: string[]; // 适用分类
}

export class UpdateCouponDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsEnum(CouponStatus)
  status?: CouponStatus;

  @IsOptional()
  @IsNumber()
  @Min(0)
  minPurchase?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  maxDiscount?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  usageLimit?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  userUsageLimit?: number;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  startDate?: Date;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  endDate?: Date;
}

export class ValidateCouponDto {
  @IsString()
  code: string;

  @IsNumber()
  @Min(0)
  orderAmount: number;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  platforms?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  categories?: string[];
}
