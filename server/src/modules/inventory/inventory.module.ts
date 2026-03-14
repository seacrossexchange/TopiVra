import { Module } from '@nestjs/common';
import { InventoryService } from './inventory.service';
import { AutoDeliveryService } from './auto-delivery.service';
import { InventoryController } from './inventory.controller';
import { PrismaModule } from '../../prisma/prisma.module';
import { NotificationModule } from '../../common/notification/notification.module';
import { DeliveryEventsModule } from '../orders/delivery-events.module';

@Module({
  imports: [PrismaModule, NotificationModule, DeliveryEventsModule],
  controllers: [InventoryController],
  providers: [InventoryService, AutoDeliveryService],
  exports: [InventoryService, AutoDeliveryService],
})
export class InventoryModule {}
