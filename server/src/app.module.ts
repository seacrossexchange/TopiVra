import {
  Module,
  ValidationPipe,
  MiddlewareConsumer,
  NestModule,
} from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD, APP_PIPE } from '@nestjs/core';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { TerminusModule } from '@nestjs/terminus';
import {
  I18nModule,
  AcceptLanguageResolver,
  QueryResolver,
  HeaderResolver,
} from 'nestjs-i18n';
import * as path from 'path';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { PrismaService } from './prisma/prisma.service';
import { AuthModule } from './modules/auth/auth.module';
import { AdminModule } from './modules/admin/admin.module';
import { BlogModule } from './modules/blog/blog.module';
import { CartModule } from './modules/cart/cart.module';
import { CategoriesModule } from './modules/categories/categories.module';
import { FavoritesModule } from './modules/favorites/favorites.module';
import { HealthModule } from './modules/health/health.module';
import { OrdersModule } from './modules/orders/orders.module';
import { PaymentsModule } from './modules/payments/payments.module';
import { ProductsModule } from './modules/products/products.module';
import { ReviewsModule } from './modules/reviews/reviews.module';
import { ScheduleModule } from './modules/schedule/schedule.module';
import { SearchModule } from './modules/search/search.module';
import { SellersModule } from './modules/sellers/sellers.module';
import { TicketsModule } from './modules/tickets/tickets.module';
import { UploadModule } from './modules/upload/upload.module';
import { WebsocketModule } from './modules/websocket/websocket.module';
import { CouponsModule } from './modules/coupons/coupons.module';
import { MembershipModule } from './modules/membership/membership.module';
import { ReferralModule } from './modules/referral/referral.module';
import { RecommendationsModule } from './modules/recommendations/recommendations.module';
import { AnalyticsModule } from './modules/analytics/analytics.module';
import { RedisModule } from './common/redis/redis.module';
import { MailModule } from './common/mail/mail.module';
import { TotpModule } from './common/totp/totp.module';
import { AlertsModule } from './common/alerts/alerts.module';
import { CreditModule } from './common/credit/credit.module';
import { CreditModule as CreditApiModule } from './modules/credit/credit.module';
import { JwtAuthGuard } from './modules/auth/guards/jwt-auth.guard';
import { MessagesModule } from './modules/messages/messages.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { InventoryModule } from './modules/inventory/inventory.module';
import { RequestLoggerMiddleware } from './common/middleware/request-logger.middleware';
import { I18nMiddleware } from './common/middleware/i18n.middleware';
import { MetricsModule } from './common/metrics/metrics.module';
// TranslationsModule - 正在由其他 agent 处理国际化
// import { TranslationsModule } from './modules/translations/translations.module';

@Module({
  imports: [
    // 全局配置
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', '.env.local'],
    }),

    // 国际化配置
    I18nModule.forRoot({
      fallbackLanguage: 'zh-CN',
      loaderOptions: {
        path: path.join(__dirname, '/i18n/'),
        watch: true,
      },
      resolvers: [
        { use: QueryResolver, options: ['lang'] },
        AcceptLanguageResolver,
        new HeaderResolver(['x-lang']),
      ],
    }),

    // Rate limiting configuration
    ThrottlerModule.forRoot([
      {
        name: 'short',
        ttl: 1000,
        limit: 3,
      },
      {
        name: 'medium',
        ttl: 10000,
        limit: 20,
      },
      {
        name: 'long',
        ttl: 60000,
        limit: 100,
      },
    ]),

    // 核心模块
    PrismaModule,
    RedisModule,
    MailModule,
    TotpModule,
    AlertsModule,
    CreditModule,
    TerminusModule,
    MetricsModule,

    // 业务模块
    MessagesModule,
    NotificationsModule,
    InventoryModule,
    AuthModule,
    AdminModule,
    BlogModule,
    CartModule,
    CategoriesModule,
    CreditApiModule,
    FavoritesModule,
    HealthModule,
    OrdersModule,
    PaymentsModule,
    ProductsModule,
    ReviewsModule,
    ScheduleModule,
    SearchModule,
    SellersModule,
    TicketsModule,
    UploadModule,
    WebsocketModule,
    CouponsModule,
    MembershipModule,
    ReferralModule,
    RecommendationsModule,
    AnalyticsModule,
    // TranslationsModule, // 正在由其他 agent 处理国际化
  ],
  controllers: [AppController],
  providers: [
    AppService,
    PrismaService,
    // 全局 JWT 认证守卫
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    // 全局限流守卫
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
    // 全局验证管道
    {
      provide: APP_PIPE,
      useValue: new ValidationPipe({
        whitelist: true,
        transform: true,
        forbidNonWhitelisted: true,
        transformOptions: {
          enableImplicitConversion: true,
        },
      }),
    },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(I18nMiddleware, RequestLoggerMiddleware).forRoutes('*');
  }
}
