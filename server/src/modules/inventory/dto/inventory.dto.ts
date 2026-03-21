import {
  IsString,
  IsOptional,
  IsInt,
  Min,
  IsArray,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class AddAccountDto {
  @IsString()
  productId: string;

  @IsString()
  accountData: string;

  @IsOptional()
  accountInfo?: any;
}

export class BatchAddAccountsDto {
  @IsString()
  productId: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AccountItemDto)
  accounts: AccountItemDto[];
}

export class AccountItemDto {
  @IsString()
  accountData: string;

  @IsOptional()
  accountInfo?: any;
}

export class InventoryQueryDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  page?: number = 1;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  limit?: number = 20;

  @IsOptional()
  @IsString()
  productId?: string;

  @IsOptional()
  @IsString()
  status?: string;
}

export class MarkInvalidDto {
  @IsString()
  reason: string;
}




