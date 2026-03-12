import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { AdminAnalyticsService } from './admin-analytics.service';
import { RoleController } from './role.controller';
import { RoleService } from '../auth/role.service';
import { PrismaModule } from '../../prisma/prisma.module';
import { AuditModule } from '../../common/audit/audit.module';
import { RedisModule } from '../../common/redis/redis.module';

@Module({
  imports: [PrismaModule, AuditModule, RedisModule],
  controllers: [AdminController, RoleController],
  providers: [AdminService, AdminAnalyticsService, RoleService],
})
export class AdminModule {}
