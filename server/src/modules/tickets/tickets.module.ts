import { Module } from '@nestjs/common';
import { TicketsController } from './tickets.controller';
import { TicketsService } from './tickets.service';
import { PrismaModule } from '../../prisma/prisma.module';
import { NotificationModule } from '../../common/notification';

@Module({
  imports: [PrismaModule, NotificationModule],
  controllers: [TicketsController],
  providers: [TicketsService],
  exports: [TicketsService],
})
export class TicketsModule {}
