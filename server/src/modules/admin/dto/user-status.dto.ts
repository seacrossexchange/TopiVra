import { IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { UserStatus as PrismaUserStatus } from '@prisma/client';

export { PrismaUserStatus as UserStatus };

export class UpdateUserStatusDto {
  @ApiProperty({
    description: '用户状态',
    enum: ['ACTIVE', 'SUSPENDED', 'BANNED', 'DELETED'],
  })
  @IsEnum(['ACTIVE', 'SUSPENDED', 'BANNED', 'DELETED'], {
    message: '用户状态必须是 ACTIVE、SUSPENDED、BANNED 或 DELETED',
  })
  status: PrismaUserStatus;
}
