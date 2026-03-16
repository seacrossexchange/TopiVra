import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger, RequestMethod } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import helmet from 'helmet';
import * as compression from 'compression';
import { AppModule } from './app.module';
import { GlobalExceptionFilter } from './common/filters';
import { SanitizePipe } from './common/pipes';
import { TransformInterceptor } from './common/interceptors';

async function bootstrap() {
  const logger = new Logger('Bootstrap');

  const app = await NestFactory.create(AppModule, {
    bodyParser: true,
  });

  // 设置全局请求超时（30秒）
  app.use((req: any, res: any, next: any) => {
    req.setTimeout(30000, () => {
      res.status(408).json({
        success: false,
        error: 'Request Timeout',
        message: '请求超时，请稍后重试',
        statusCode: 408,
        timestamp: new Date().toISOString(),
      });
    });
    next();
  });

  // 使用 ConfigService 获取配置
  const configService = app.get(ConfigService);

  // ==================== 安全检查 ====================

  // 检查必需的环境变量
  const jwtSecret = configService.get<string>('JWT_SECRET');
  const jwtRefreshSecret = configService.get<string>('JWT_REFRESH_SECRET');
  const nodeEnv = configService.get<string>('NODE_ENV') || 'development';

  if (!jwtSecret || jwtSecret === 'your-jwt-secret-key-minimum-32-characters') {
    logger.error('❌ JWT_SECRET 未配置或使用默认值！');
    logger.error('请在 .env 文件中设置强密码（至少32个字符）');
    process.exit(1);
  }

  if (
    !jwtRefreshSecret ||
    jwtRefreshSecret === 'your-refresh-secret-minimum-32-characters'
  ) {
    logger.error('❌ JWT_REFRESH_SECRET 未配置或使用默认值！');
    logger.error('请在 .env 文件中设置强密码（至少32个字符）');
    process.exit(1);
  }

  if (jwtSecret.length < 32) {
    logger.error('❌ JWT_SECRET 长度不足32个字符！');
    process.exit(1);
  }

  if (jwtRefreshSecret.length < 32) {
    logger.error('❌ JWT_REFRESH_SECRET 长度不足32个字符！');
    process.exit(1);
  }

  logger.log('✅ 安全配置检查通过');

  // ==================== 安全中间件 ====================

  // Helmet 安全头
  app.use(
    helmet({
      contentSecurityPolicy: nodeEnv === 'production' ? undefined : false,
      crossOriginEmbedderPolicy: false,
    }),
  );
  logger.log('✅ Helmet 安全头已启用');

  // 响应压缩（gzip/brotli）
  app.use(compression());
  logger.log('✅ 响应压缩已启用');

  // Sentry 初始化（需要先安装 @sentry/node：npm i @sentry/node）
  const sentryDsn = configService.get<string>('SENTRY_DSN');
  if (sentryDsn) {
    try {
      const sentryModule = await (eval(
        'import("@sentry/node")',
      ) as Promise<any>);
      sentryModule.init({
        dsn: sentryDsn,
        environment: configService.get<string>('NODE_ENV') || 'development',
        tracesSampleRate: 0.1,
      });
      logger.log('Sentry 已初始化');
    } catch {
      logger.warn('Sentry 未安装，跳过初始化（npm i @sentry/node）');
    }
  }

  const frontendUrl =
    configService.get<string>('FRONTEND_URL') || 'http://localhost:5173';

  // 启用 CORS
  const allowedOrigins = [frontendUrl];

  // 开发环境添加localhost
  if (nodeEnv !== 'production') {
    allowedOrigins.push(
      'http://localhost:5173',
      'http://localhost:3000',
      'http://127.0.0.1:5173',
      'http://127.0.0.1:3000',
    );
  }

  app.enableCors({
    origin: allowedOrigins.filter((url, index, self) => self.indexOf(url) === index),
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-Requested-With',
      'Accept',
      'Origin',
    ],
  });
  const port =
    configService.get<number>('APP_PORT') ||
    configService.get<number>('PORT') ||
    3000;
  const apiVersion = configService.get<string>('API_VERSION') || 'v1';
  const apiPrefix =
    configService.get<string>('API_PREFIX') || `api/${apiVersion}`;

  // 设置全局路由前缀（支持版本化）
  // Terminus health endpoints must remain un-prefixed so probes can call /health/** directly.
  app.setGlobalPrefix(apiPrefix, {
    exclude: [
      { path: 'health', method: RequestMethod.ALL },
      { path: 'health/(.*)', method: RequestMethod.ALL },
    ],
  });

  // 全局异常过滤器
  app.useGlobalFilters(new GlobalExceptionFilter());

  // 全局响应转换拦截器（统一响应格式）
  app.useGlobalInterceptors(new TransformInterceptor());

  // 全局 XSS 净化管道（在验证管道之前执行）
  app.useGlobalPipes(new SanitizePipe());

  // 全局验证管道
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // Swagger API 文档配置 - 强制在生产环境禁用
  if (nodeEnv === 'development') {
    const config = new DocumentBuilder()
      .setTitle('TokBazaar API')
      .setDescription('TokBazaar 全球数字账号交易平台 API 文档')
      .setVersion('1.0')
      .addBearerAuth()
      .addTag('认证', '用户认证相关接口')
      .addTag('支付', '支付相关接口')
      .addTag('订单', '订单管理接口')
      .addTag('商品', '商品管理接口')
      .addTag('购物车', '购物车接口')
      .addTag('用户', '用户管理接口')
      .addTag('卖家', '卖家中心接口')
      .addTag('管理', '管理员接口')
      .addTag('工单', '工单系统接口')
      .addTag('评价', '评价系统接口')
      .addTag('收藏', '收藏功能接口')
      .addTag('搜索', '搜索接口')
      .addTag('上传', '文件上传接口')
      .addTag('分类', '分类管理接口')
      .addTag('博客', '博客文章接口')
      .addTag('通知', '消息通知接口')
      .build();

    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api/docs', app, document, {
      swaggerOptions: {
        persistAuthorization: true,
        tagsSorter: 'alpha',
        operationsSorter: 'alpha',
      },
    });
    logger.log(`📚 API 文档: http://localhost:${port}/${apiPrefix}/docs`);
  } else {
    logger.log('🔒 Swagger 已在生产环境中禁用（安全考虑）');
  }

  // 启动服务
  await app.listen(port);

  logger.log(`🚀 服务已启动: http://localhost:${port}`);
  logger.log(`🔧 环境: ${configService.get('NODE_ENV') || 'development'}`);
}

bootstrap();
