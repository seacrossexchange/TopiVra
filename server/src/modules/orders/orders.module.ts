import { Module } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { OrdersController } from './orders.controller';
import { OrdersCronService } from './orders.cron';
import { DeliveryEventsModule } from './delivery-events.module';
import { PrismaModule } from '../../prisma/prisma.module';
import { AuditModule } from '../../common/audit/audit.module';
import { NotificationModule } from '../../common/notification';
import { RedisModule } from '../../common/redis/redis.module';
import { InventoryModule } from '../inventory/inventory.module';

@Module({
  imports: [
    PrismaModule,
    AuditModule,
    NotificationModule,
    RedisModule,
    InventoryModule,
    DeliveryEventsModule,
  ],
  providers: [OrdersService, OrdersCronService],
  controllers: [OrdersController],
  exports: [OrdersService],
})
export class OrdersModule {}
