import { Module } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { OrdersController } from './orders.controller';
import { PrismaModule } from '../../prisma/prisma.module';
import { AuditModule } from '../../common/audit/audit.module';
import { NotificationModule } from '../../common/notification';
import { RedisModule } from '../../common/redis/redis.module';

@Module({
  imports: [PrismaModule, AuditModule, NotificationModule, RedisModule],
  providers: [OrdersService],
  controllers: [OrdersController],
  exports: [OrdersService],
})
export class OrdersModule {}
