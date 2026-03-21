import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { I18nService } from 'nestjs-i18n';
import { Request, Response } from 'express';
import { AlertsService } from '../alerts/alerts.service';
import { BusinessException } from '../exceptions/error-codes';

/**
 * 统一错误响应格式
 */
interface ErrorResponse {
  statusCode: number;
  code: string;
  translationKey?: string;
  message: string;
  error: string;
  timestamp: string;
  path: string;
  method: string;
  details?: Record<string, unknown>;
}

interface ResolvedExceptionPayload {
  statusCode: number;
  code: string;
  translationKey?: string;
  message: string;
  error: string;
  details?: Record<string, unknown>;
}

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);
  private alertsService: AlertsService | null = null;

  constructor(private readonly i18n?: I18nService) {}

  setAlertsService(alertsService: AlertsService) {
    this.alertsService = alertsService;
  }

  async catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request & { language?: string; i18nLang?: string; user?: { userId?: string } }>();
    const lang = request.language || request.i18nLang || 'zh-CN';

    const resolved = await this.resolveExceptionPayload(exception, lang);

    const errorResponse: ErrorResponse = {
      statusCode: resolved.statusCode,
      code: resolved.code,
      translationKey: resolved.translationKey,
      message: resolved.message,
      error: resolved.error,
      timestamp: new Date().toISOString(),
      path: request.url,
      method: request.method,
      details: resolved.details,
    };

    // 记录错误日志（非 4xx 错误）
    if (resolved.statusCode >= 500) {
      this.logger.error(
        `${request.method} ${request.url} - ${resolved.statusCode} - ${resolved.message}`,
        exception instanceof Error ? exception.stack : undefined,
      );
    } else if (resolved.statusCode >= 400) {
      this.logger.warn(
        `${request.method} ${request.url} - ${resolved.statusCode} - ${resolved.message}`,
      );
    }

    // 发送响应
    response.status(resolved.statusCode).json(errorResponse);

    // 发送 5xx 错误告警到 Telegram
    if (resolved.statusCode >= 500 && this.alertsService) {
      try {
        await this.alertsService.sendHttpError(
          request.method,
          request.url,
          resolved.statusCode,
          resolved.message,
          request.user?.userId,
        );
      } catch (alertError) {
        this.logger.error(`Failed to send alert: ${alertError}`);
      }
    }
  }

  private async resolveExceptionPayload(
    exception: unknown,
    lang: string,
  ): Promise<ResolvedExceptionPayload> {
    if (exception instanceof BusinessException) {
      return {
        statusCode: exception.statusCode,
        code: exception.code,
        translationKey: exception.translationKey,
        error: exception.name,
        details: exception.details,
        message: await this.translateMessage(
          exception.translationKey,
          lang,
          exception.message,
          exception.details,
        ),
      };
    }

    if (exception instanceof HttpException) {
      return this.resolveHttpExceptionPayload(exception, lang);
    }

    if (exception instanceof Error) {
      this.logger.error(
        `Internal server error: ${exception.message}`,
        exception.stack,
      );

      return {
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        code: 'INTERNAL_SERVER_ERROR',
        translationKey: 'errors.INTERNAL_SERVER_ERROR',
        error: 'Internal Server Error',
        message: await this.translateMessage(
          'errors.INTERNAL_SERVER_ERROR',
          lang,
          exception.message,
        ),
      };
    }

    this.logger.error('Unknown error type:', exception);

    return {
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      code: 'INTERNAL_SERVER_ERROR',
      translationKey: 'errors.INTERNAL_SERVER_ERROR',
      error: 'Internal Server Error',
      message: await this.translateMessage(
        'errors.INTERNAL_SERVER_ERROR',
        lang,
        'Unknown error occurred',
      ),
    };
  }

  private async resolveHttpExceptionPayload(
    exception: HttpException,
    lang: string,
  ): Promise<ResolvedExceptionPayload> {
    const statusCode = exception.getStatus();
    const exceptionResponse = exception.getResponse();

    if (typeof exceptionResponse !== 'object' || exceptionResponse === null) {
      const code = this.mapHttpStatusToCode(statusCode);
      const translationKey = `errors.${code}`;

      return {
        statusCode,
        code,
        translationKey,
        error: exception.name,
        message: await this.translateMessage(
          translationKey,
          lang,
          exception.message,
        ),
      };
    }

    const responseObj = exceptionResponse as Record<string, unknown>;
    const code = typeof responseObj.code === 'string'
      ? responseObj.code
      : this.mapHttpStatusToCode(statusCode);
    const translationKey = typeof responseObj.translationKey === 'string'
      ? responseObj.translationKey
      : undefined;
    const details = responseObj.details as Record<string, unknown> | undefined;

    return {
      statusCode,
      code,
      translationKey,
      error: (responseObj.error as string) || exception.name,
      details,
      message: await this.translateMessage(
        translationKey,
        lang,
        this.normalizeExceptionMessage(responseObj.message, exception.message),
        details,
      ),
    };
  }

  private mapHttpStatusToCode(statusCode: number): string {
    switch (statusCode) {
      case HttpStatus.BAD_REQUEST:
        return 'VALIDATION_ERROR';
      case HttpStatus.UNAUTHORIZED:
        return 'UNAUTHORIZED';
      case HttpStatus.FORBIDDEN:
        return 'FORBIDDEN';
      case HttpStatus.NOT_FOUND:
        return 'RESOURCE_NOT_FOUND';
      case HttpStatus.TOO_MANY_REQUESTS:
        return 'RATE_LIMIT_EXCEEDED';
      case HttpStatus.REQUEST_TIMEOUT:
        return 'REQUEST_TIMEOUT';
      default:
        return 'INTERNAL_SERVER_ERROR';
    }
  }

  private normalizeExceptionMessage(
    rawMessage: unknown,
    fallbackMessage: string,
  ): string {
    if (Array.isArray(rawMessage)) {
      const firstMessage = rawMessage.find(
        (item): item is string => typeof item === 'string' && item.length > 0,
      );
      return firstMessage || fallbackMessage;
    }

    if (typeof rawMessage === 'string' && rawMessage.length > 0) {
      return rawMessage;
    }

    return fallbackMessage;
  }

  private async translateMessage(
    translationKey: string | undefined,
    lang: string,
    fallbackMessage: string,
    args?: Record<string, unknown>,
  ): Promise<string> {
    if (!translationKey || !this.i18n) {
      return fallbackMessage;
    }

    try {
      return await this.i18n.t(translationKey, {
        lang,
        args,
        defaultValue: fallbackMessage,
      });
    } catch {
      return fallbackMessage;
    }
  }
}
