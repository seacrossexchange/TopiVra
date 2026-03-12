import { Module } from '@nestjs/common';
import { TicketsService } from './tickets.service';
import {
  TicketsController,
  AdminTicketsController,
} from './tickets.controller';

@Module({
  controllers: [TicketsController, AdminTicketsController],
  providers: [TicketsService],
  exports: [TicketsService],
})
export class TicketsModule {}
