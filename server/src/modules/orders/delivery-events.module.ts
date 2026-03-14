import { Module } from '@nestjs/common';
import { DeliveryEventsService } from './delivery-events.service';

@Module({
  providers: [DeliveryEventsService],
  exports: [DeliveryEventsService],
})
export class DeliveryEventsModule {}


