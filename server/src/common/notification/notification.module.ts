import { Module, Global } from '@nestjs/common';
import { NotificationService } from './notification.service';
import { MailModule } from '../mail/mail.module';
import { WebsocketModule } from '../../modules/websocket/websocket.module';
import { PrismaModule } from '../../prisma/prisma.module';

@Global()
@Module({
  imports: [MailModule, WebsocketModule, PrismaModule],
  providers: [NotificationService],
  exports: [NotificationService],
})
export class NotificationModule {}
