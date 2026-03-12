import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma';
import { CreditService } from './credit.service';

@Module({
  imports: [PrismaModule],
  providers: [CreditService],
  exports: [CreditService],
})
export class CreditModule {}
