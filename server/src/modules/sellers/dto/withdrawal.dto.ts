import { IsNumber, Min, IsEnum, IsString, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export enum WithdrawalMethod {
  BANK = 'bank',
  ALIPAY = 'alipay',
  WECHAT = 'wechat',
  USDT = 'usdt',
}

export class RequestWithdrawalDto {
  @ApiProperty({ description: '提现金额', minimum: 50 })
  @IsNumber()
  @Min(50, { message: '最低提现金额为 50 元' })
  amount!: number;

  @ApiProperty({
    description: '提现方式',
    enum: WithdrawalMethod,
  })
  @IsEnum(WithdrawalMethod, { message: '不支持的提现方式' })
  method!: WithdrawalMethod;

  @ApiProperty({ description: '收款账户', maxLength: 200 })
  @IsString()
  @MaxLength(200)
  account!: string;
}
