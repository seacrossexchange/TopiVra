import { Injectable, Scope } from '@nestjs/common';
import * as winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
import { ConfigService } from '@nestjs/config';

export interface LogContext {
  requestId?: string;
  userId?: string;
  ip?: string;
  userAgent?: string;
  module?: string;
  action?: string;
  [key: string]: any;
}

@Injectable({ scope: Scope.DEFAULT })
export class AppLoggerService {
  private logger: winston.Logger;
  private context?: string;

  constructor(private configService: ConfigService) {
    const env = configService.get('NODE_ENV') || 'development';
    const logLevel =
      configService.get('LOG_LEVEL') ||
      (env === 'production' ? 'info' : 'debug');

    const logFormat = winston.format.combine(
      winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
      winston.format.errors({ stack: true }),
      winston.format.json(),
    );

    const consoleFormat = winston.format.combine(
      winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
      winston.format.colorize(),
      winston.format.printf(
        ({
          timestamp,
          level,
          message,
          context,
          requestId,
          userId,
          stack,
          ...meta
        }) => {
          const ctx = context ? ` [${context}]` : '';
          const req = requestId ? ` <${requestId}>` : '';
          const user = userId ? ` [User:${userId}]` : '';
          const stackTrace = stack ? `\n${stack}` : '';
          const metaStr =
            Object.keys(meta).length > 0 ? ` ${JSON.stringify(meta)}` : '';
          return `${timestamp} [${level}]${ctx}${req}${user} ${message}${metaStr}${stackTrace}`;
        },
      ),
    );

    const transports: winston.transport[] = [
      new winston.transports.Console({
        format: consoleFormat,
        level: logLevel,
      }),
      new DailyRotateFile({
        filename: 'logs/app-%DATE%.log',
        datePattern: 'YYYY-MM-DD',
        maxSize: '20m',
        maxFiles: '14d',
        format: logFormat,
        level: logLevel,
      }),
      new DailyRotateFile({
        filename: 'logs/error-%DATE%.log',
        datePattern: 'YYYY-MM-DD',
        level: 'error',
        maxSize: '20m',
        maxFiles: '30d',
        format: logFormat,
      }),
      new DailyRotateFile({
        filename: 'logs/audit-%DATE%.log',
        datePattern: 'YYYY-MM-DD',
        maxSize: '20m',
        maxFiles: '90d',
        format: logFormat,
        level: 'info',
      }),
    ];

    this.logger = winston.createLogger({
      level: logLevel,
      transports,
      defaultMeta: {
        service: 'topter-api',
        env,
      },
    });
  }

  setContext(context: string) {
    this.context = context;
  }

  log(message: string, context?: string | LogContext, meta?: LogContext) {
    this.info(message, context, meta);
  }

  info(message: string, context?: string | LogContext, meta?: LogContext) {
    const { ctx, additionalMeta } = this.parseContextAndMeta(context, meta);
    this.logger.info(message, { context: ctx, ...additionalMeta });
  }

  debug(message: string, context?: string | LogContext, meta?: LogContext) {
    const { ctx, additionalMeta } = this.parseContextAndMeta(context, meta);
    this.logger.debug(message, { context: ctx, ...additionalMeta });
  }

  warn(message: string, context?: string | LogContext, meta?: LogContext) {
    const { ctx, additionalMeta } = this.parseContextAndMeta(context, meta);
    this.logger.warn(message, { context: ctx, ...additionalMeta });
  }

  error(
    message: string,
    trace?: string,
    context?: string | LogContext,
    meta?: LogContext,
  ) {
    const { ctx, additionalMeta } = this.parseContextAndMeta(context, meta);
    this.logger.error(message, {
      context: ctx,
      stack: trace,
      ...additionalMeta,
    });
  }

  verbose(message: string, context?: string | LogContext, meta?: LogContext) {
    const { ctx, additionalMeta } = this.parseContextAndMeta(context, meta);
    this.logger.verbose(message, { context: ctx, ...additionalMeta });
  }

  audit(event: string, context?: LogContext) {
    this.logger.info(event, {
      context: 'AUDIT',
      audit: true,
      timestamp: new Date().toISOString(),
      ...context,
    });
  }

  logLoginAttempt(
    email: string,
    success: boolean,
    ip: string,
    userAgent: string,
    userId?: string,
    failureReason?: string,
  ) {
    this.audit(`LOGIN_${success ? 'SUCCESS' : 'FAILED'}`, {
      email: this.maskEmail(email),
      userId,
      ip,
      userAgent,
      failureReason,
    });
  }

  logApiAccess(
    userId: string,
    method: string,
    path: string,
    ip: string,
    statusCode: number,
    responseTime?: number,
  ) {
    this.audit('API_ACCESS', {
      userId,
      method,
      path,
      ip,
      statusCode,
      responseTime,
    });
  }

  logDataModification(
    userId: string,
    action: 'CREATE' | 'UPDATE' | 'DELETE',
    entityType: string,
    entityId: string,
    beforeData?: any,
    afterData?: any,
    ip?: string,
  ) {
    this.audit(`DATA_${action}`, {
      userId,
      entityType,
      entityId,
      beforeData: this.sanitizeData(beforeData),
      afterData: this.sanitizeData(afterData),
      ip,
    });
  }

  logPaymentEvent(
    userId: string,
    event: string,
    orderId: string,
    amount: number,
    currency: string,
    paymentMethod: string,
    ip: string,
    additionalInfo?: Record<string, any>,
  ) {
    this.audit(`PAYMENT_${event}`, {
      userId,
      orderId,
      amount,
      currency,
      paymentMethod,
      ip,
      ...additionalInfo,
    });
  }

  logAdminAction(
    adminId: string,
    action: string,
    targetType: string,
    targetId: string,
    details: Record<string, any>,
    ip: string,
  ) {
    this.audit('ADMIN_ACTION', {
      adminId,
      action,
      targetType,
      targetId,
      details,
      ip,
    });
  }

  private parseContextAndMeta(
    context?: string | LogContext,
    meta?: LogContext,
  ): { ctx: string; additionalMeta: LogContext } {
    let ctx = this.context || 'Application';
    let additionalMeta: LogContext = {};

    if (typeof context === 'string') {
      ctx = context;
    } else if (context) {
      ctx = context.module || context.action || this.context || 'Application';
      additionalMeta = { ...context };
    }

    if (meta) {
      additionalMeta = { ...additionalMeta, ...meta };
    }

    return { ctx, additionalMeta };
  }

  private maskEmail(email: string): string {
    if (!email || !email.includes('@')) return email;
    const [localPart, domain] = email.split('@');
    const masked =
      localPart.length > 2
        ? localPart[0] +
          '*'.repeat(localPart.length - 2) +
          localPart[localPart.length - 1]
        : localPart[0] + '*';
    return `${masked}@${domain}`;
  }

  private sanitizeData(data: any): any {
    if (!data) return data;

    const sensitiveFields = [
      'password',
      'passwordHash',
      'token',
      'secret',
      'apiKey',
      'privateKey',
      'credentials',
    ];
    const sanitized = { ...data };

    for (const field of sensitiveFields) {
      if (sanitized[field]) {
        sanitized[field] = '***REDACTED***';
      }
    }

    return sanitized;
  }
}
