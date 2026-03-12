import { Module, forwardRef } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { PaymentsController } from './payments.controller';
import { PaymentGatewayController } from './controllers/gateway.controller';
import { PrismaModule } from '../../prisma/prisma.module';
import { WebsocketModule } from '../websocket/websocket.module';
import { MailModule } from '../../common/mail/mail.module';
import { RedisModule } from '../../common/redis/redis.module';
import { PaymentCallbackGuard } from './guards/payment-callback.guard';

@Module({
  imports: [
    PrismaModule,
    forwardRef(() => WebsocketModule),
    MailModule,
    RedisModule,
  ],
  providers: [PaymentsService, PaymentCallbackGuard],
  controllers: [PaymentsController, PaymentGatewayController],
  exports: [PaymentsService],
})
export class PaymentsModule {}
