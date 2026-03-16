import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { PrismaService } from '../../prisma/prisma.service';

/**
 * 安全审计日志拦截器
 * 记录所有敏感操作，用于安全审计和合规性检查
 */
@Injectable()
export class AuditLogInterceptor implements NestInterceptor {
  constructor(private readonly prisma: PrismaService) {}

  // 需要审计的敏感操作
  private readonly sensitiveOperations = [
    // 认证相关
    '/auth/login',
    '/auth/register',
    '/auth/logout',
    '/auth/change-password',
    '/auth/reset-password',
    '/auth/enable-2fa',
    '/auth/disable-2fa',
    
    // 用户管理
    '/users/:id',
    '/admin/users',
    
    // 权限管理
    '/admin/roles',
    '/sellers/apply',
    '/admin/sellers/:id/approve',
    
    // 支付相关
    '/payments',
    '/payments/notify',
    '/orders/:id/pay',
    
    // 退款相关
    '/refunds',
    '/refunds/:id/approve',
    '/refunds/:id/reject',
    
    // 财务相关
    '/sellers/withdraw',
    '/admin/settlements',
    
    // 敏感数据访问
    '/admin/audit-logs',
    '/users/:id/profile',
    
    // 系统配置
    '/admin/settings',
    '/admin/payment-gateways',
  ];

  // 需要记录的 HTTP 方法
  private readonly auditMethods = ['POST', 'PUT', 'PATCH', 'DELETE'];

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const response = context.switchToHttp().getResponse();
    const user = request.user;

    const shouldAudit = this.shouldAuditRequest(request);

    if (!shouldAudit) {
      return next.handle();
    }

    const startTime = Date.now();
    const auditData = {
      // 操作者信息
      userId: user?.id || null,
      userEmail: user?.email || null,
      userRole: user?.roles?.[0] || 'GUEST',
      
      // 请求信息
      method: request.method,
      path: request.path,
      url: request.url,
      
      // 客户端信息
      ip: this.getClientIp(request),
      userAgent: request.headers['user-agent'] || null,
      
      // 请求数据（脱敏）
      requestBody: this.sanitizeData(request.body),
      queryParams: this.sanitizeData(request.query),
      
      // 时间戳
      timestamp: new Date(),
    };

    return next.handle().pipe(
      tap({
        next: (data) => {
          // 请求成功
          this.logAudit({
            ...auditData,
            statusCode: response.statusCode,
            success: true,
            responseTime: Date.now() - startTime,
            responseData: this.sanitizeData(data),
          });
        },
        error: (error) => {
          // 请求失败
          this.logAudit({
            ...auditData,
            statusCode: error.status || 500,
            success: false,
            responseTime: Date.now() - startTime,
            errorMessage: error.message,
            errorStack: process.env.NODE_ENV === 'development' ? error.stack : null,
          });
        },
      }),
    );
  }

  /**
   * 判断是否需要审计该请求
   */
  private shouldAuditRequest(request: any): boolean {
    // 检查 HTTP 方法
    if (!this.auditMethods.includes(request.method)) {
      return false;
    }

    // 检查路径是否匹配敏感操作
    const path = request.path;
    return this.sensitiveOperations.some((pattern) => {
      // 简单的路径匹配（支持 :id 参数）
      const regex = new RegExp(
        '^' + pattern.replace(/:\w+/g, '[^/]+') + '$',
      );
      return regex.test(path);
    });
  }

  /**
   * 获取客户端真实 IP
   */
  private getClientIp(request: any): string {
    return (
      request.headers['x-forwarded-for']?.split(',')[0] ||
      request.headers['x-real-ip'] ||
      request.connection.remoteAddress ||
      request.socket.remoteAddress ||
      request.ip ||
      'unknown'
    );
  }

  /**
   * 数据脱敏
   * 移除敏感字段，避免记录密码、令牌等信息
   */
  private sanitizeData(data: any): any {
    if (!data || typeof data !== 'object') {
      return data;
    }

    const sensitiveFields = [
      'password',
      'passwordHash',
      'token',
      'accessToken',
      'refreshToken',
      'secret',
      'apiKey',
      'privateKey',
      'creditCard',
      'cvv',
      'ssn',
      'idNumber',
    ];

    const sanitized = Array.isArray(data) ? [...data] : { ...data };

    for (const key in sanitized) {
      if (sensitiveFields.some((field) => key.toLowerCase().includes(field))) {
        sanitized[key] = '***REDACTED***';
      } else if (typeof sanitized[key] === 'object') {
        sanitized[key] = this.sanitizeData(sanitized[key]);
      }
    }

    return sanitized;
  }

  /**
   * 记录审计日志到数据库
   */
  private async logAudit(data: any): Promise<void> {
    try {
      await this.prisma.auditLog.create({
        data: {
          operatorId: data.userId || 'anonymous',
          operatorRole: data.userRole || 'GUEST',
          action: `${data.method} ${data.path}`,
          module: this.extractModule(data.path),
          targetType: this.extractTargetType(data.path),
          targetId: this.extractTargetId(data.path),
          description: data.errorMessage || `${data.method} ${data.path}`,
          beforeData: data.requestBody || data.queryParams,
          afterData: data.responseData,
          ipAddress: data.ip,
          userAgent: data.userAgent,
        },
      });
    } catch (error) {
      // 审计日志记录失败不应影响业务流程
      console.error('Failed to log audit:', error);
    }
  }

  /**
   * 从路径提取模块名
   */
  private extractModule(path: string): string {
    const parts = path.split('/').filter(Boolean);
    return parts[0] || 'unknown';
  }

  /**
   * 从路径提取目标类型
   */
  private extractTargetType(path: string): string | null {
    const parts = path.split('/').filter(Boolean);
    if (parts.length >= 2 && !parts[1].match(/^\d+$/)) {
      return parts[1];
    }
    return null;
  }

  /**
   * 从路径提取目标 ID
   */
  private extractTargetId(path: string): string | null {
    const parts = path.split('/').filter(Boolean);
    for (const part of parts) {
      // UUID 格式
      if (part.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
        return part;
      }
      // 数字 ID
      if (part.match(/^\d+$/)) {
        return part;
      }
    }
    return null;
  }
}

