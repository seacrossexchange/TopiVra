import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { MetricsService } from '../metrics/metrics.service';
import { Request, Response } from 'express';

@Injectable()
export class MetricsInterceptor implements NestInterceptor {
  constructor(private readonly metricsService: MetricsService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const ctx = context.switchToHttp();
    const req = ctx.getRequest<Request>();
    const res = ctx.getResponse<Response>();

    const start = Date.now();
    const method = req.method;
    // 将动态路由参数替换为占位符，避免高基数标签
    const route = (req.route?.path ?? req.path ?? 'unknown')
      .replace(/\/[0-9a-f-]{8,}/gi, '/:id')
      .replace(/\/\d+/g, '/:id');

    return next.handle().pipe(
      tap(() => {
        const statusCode = String(res.statusCode);
        const durationSec = (Date.now() - start) / 1000;

        this.metricsService.httpRequestTotal.inc({
          method,
          route,
          status_code: statusCode,
        });
        this.metricsService.httpRequestDuration.observe(
          { method, route, status_code: statusCode },
          durationSec,
        );
      }),
    );
  }
}




