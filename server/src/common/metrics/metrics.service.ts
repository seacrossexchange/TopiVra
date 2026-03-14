import { Injectable, OnModuleInit } from '@nestjs/common';
import {
  Registry,
  Counter,
  Histogram,
  Gauge,
  collectDefaultMetrics,
} from 'prom-client';

@Injectable()
export class MetricsService implements OnModuleInit {
  private readonly registry: Registry;

  // HTTP 请求计数
  readonly httpRequestTotal: Counter;
  // HTTP 请求延迟
  readonly httpRequestDuration: Histogram;
  // 活跃连接数
  readonly activeConnections: Gauge;
  // 订单创建计数
  readonly orderCreatedTotal: Counter;
  // 支付成功计数
  readonly paymentSuccessTotal: Counter;
  // 支付失败计数
  readonly paymentFailedTotal: Counter;
  // 自动发货计数
  readonly autoDeliveryTotal: Counter;
  // 自动发货失败计数
  readonly autoDeliveryFailedTotal: Counter;
  // WebSocket 连接数
  readonly websocketConnections: Gauge;

  constructor() {
    this.registry = new Registry();

    this.httpRequestTotal = new Counter({
      name: 'http_requests_total',
      help: 'Total number of HTTP requests',
      labelNames: ['method', 'route', 'status_code'],
      registers: [this.registry],
    });

    this.httpRequestDuration = new Histogram({
      name: 'http_request_duration_seconds',
      help: 'HTTP request duration in seconds',
      labelNames: ['method', 'route', 'status_code'],
      buckets: [0.01, 0.05, 0.1, 0.2, 0.5, 1, 2, 5],
      registers: [this.registry],
    });

    this.activeConnections = new Gauge({
      name: 'active_connections',
      help: 'Number of active connections',
      registers: [this.registry],
    });

    this.orderCreatedTotal = new Counter({
      name: 'orders_created_total',
      help: 'Total number of orders created',
      labelNames: ['currency'],
      registers: [this.registry],
    });

    this.paymentSuccessTotal = new Counter({
      name: 'payments_success_total',
      help: 'Total number of successful payments',
      labelNames: ['method'],
      registers: [this.registry],
    });

    this.paymentFailedTotal = new Counter({
      name: 'payments_failed_total',
      help: 'Total number of failed payments',
      labelNames: ['method', 'reason'],
      registers: [this.registry],
    });

    this.autoDeliveryTotal = new Counter({
      name: 'auto_delivery_total',
      help: 'Total number of auto deliveries completed',
      registers: [this.registry],
    });

    this.autoDeliveryFailedTotal = new Counter({
      name: 'auto_delivery_failed_total',
      help: 'Total number of auto delivery failures',
      labelNames: ['reason'],
      registers: [this.registry],
    });

    this.websocketConnections = new Gauge({
      name: 'websocket_connections_active',
      help: 'Number of active WebSocket connections',
      registers: [this.registry],
    });
  }

  onModuleInit() {
    // 收集 Node.js 默认指标（CPU、内存、GC 等）
    collectDefaultMetrics({ register: this.registry });
  }

  async getMetrics(): Promise<string> {
    return this.registry.metrics();
  }

  getContentType(): string {
    return this.registry.contentType;
  }
}


