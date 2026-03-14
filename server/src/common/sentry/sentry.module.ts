/**
 * Sprint 3: P1 生产可靠性 - Sentry 错误追踪集成
 *
 * 注意：此模块为可选功能，需要安装以下依赖才能启用：
 * npm install @sentry/node @sentry/profiling-node
 *
 * 如果未安装依赖，模块将跳过初始化，不影响应用正常运行
 */

import { Module, Global, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

const logger = new Logger('SentryModule');

// 动态导入 Sentry（可选依赖）
let Sentry: any = null;
let nodeProfilingIntegration: any = null;

try {
  /* eslint-disable @typescript-eslint/no-require-imports */
  Sentry = require('@sentry/node');
  nodeProfilingIntegration =
    require('@sentry/profiling-node').nodeProfilingIntegration;
  /* eslint-enable @typescript-eslint/no-require-imports */
} catch (_e) {
  logger.warn('Sentry dependencies not installed. Error tracking disabled.');
  logger.warn(
    'To enable Sentry, run: npm install @sentry/node @sentry/profiling-node',
  );
}

@Global()
@Module({
  providers: [
    {
      provide: 'SENTRY_INIT',
      useFactory: (configService: ConfigService) => {
        // 如果 Sentry 未安装，直接返回 null
        if (!Sentry) {
          return null;
        }

        const dsn = configService.get<string>('SENTRY_DSN');
        const environment =
          configService.get<string>('NODE_ENV') || 'development';
        const release = configService.get<string>('APP_VERSION') || '1.0.0';

        if (dsn) {
          Sentry.init({
            dsn,
            environment,
            release: `topter-c2c@${release}`,
            integrations: [
              // 启用性能分析
              nodeProfilingIntegration(),
            ],
            // 性能监控采样率
            tracesSampleRate: environment === 'production' ? 0.1 : 1.0,
            // 性能分析采样率
            profilesSampleRate: environment === 'production' ? 0.1 : 1.0,
            // 忽略特定错误
            ignoreErrors: [
              'NotFoundException',
              'UnauthorizedException',
              'BadRequestException',
            ],
            // 在发送前处理事件
            beforeSend(event: any, _hint: any) {
              // 过滤敏感信息
              if (event.request) {
                delete event.request.cookies;
                if (event.request.headers) {
                  delete event.request.headers.authorization;
                  delete event.request.headers.cookie;
                }
              }
              return event;
            },
          });
          logger.log(`Initialized with environment: ${environment}`);
        } else {
          logger.log('DSN not configured, skipping initialization');
        }

        return Sentry;
      },
      inject: [ConfigService],
    },
  ],
  exports: ['SENTRY_INIT'],
})
export class SentryModule {}

// 导出 Sentry 实例供其他模块使用（如果可用）
export const getSentryInstance = () => Sentry;
