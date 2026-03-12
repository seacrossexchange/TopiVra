import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { CreditService } from './credit.service';
import { CreditController } from './credit.controller';

@Module({
  imports: [PrismaModule],
  providers: [CreditService],
  controllers: [CreditController],
  exports: [CreditService],
})
export class CreditModule {}
