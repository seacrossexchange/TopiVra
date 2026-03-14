import { Test, TestingModule } from '@nestjs/testing';
import { DeliveryEventsService } from './delivery-events.service';
import { firstValueFrom as _firstValueFrom, take, toArray } from 'rxjs';

describe('DeliveryEventsService', () => {
  let service: DeliveryEventsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [DeliveryEventsService],
    }).compile();

    service = module.get<DeliveryEventsService>(DeliveryEventsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('streamForOrder should filter events by orderId', (done) => {
    const results: any[] = [];

    service
      .streamForOrder('order-1')
      .pipe(take(2), toArray())
      .subscribe({
        next: (events) => {
          results.push(...events);
          expect(results).toHaveLength(2);
          expect(results.every((e) => e.orderId === 'order-1')).toBe(true);
          done();
        },
        error: done,
      });

    // 发布两个目标订单事件 + 一个其他订单事件（应被过滤）
    service.emit({ orderId: 'order-1', type: 'STARTED' });
    service.emit({ orderId: 'order-999', type: 'STARTED' }); // 应被过滤
    service.emit({ orderId: 'order-1', type: 'COMPLETED', success: true });
  });

  it('emit should attach timestamp', (done) => {
    const before = Date.now();

    service
      .streamForOrder('order-ts')
      .pipe(take(1))
      .subscribe({
        next: (event) => {
          expect(event.timestamp).toBeGreaterThanOrEqual(before);
          expect(event.timestamp).toBeLessThanOrEqual(Date.now());
          done();
        },
        error: done,
      });

    service.emit({ orderId: 'order-ts', type: 'STARTED' });
  });

  it('streamForOrder should only deliver events after subscription', (done) => {
    // 先发布事件（订阅前）
    service.emit({ orderId: 'order-late', type: 'STARTED' });

    const received: any[] = [];

    // 订阅后发布的事件才应被接收
    service
      .streamForOrder('order-late')
      .pipe(take(1))
      .subscribe({
        next: (e) => {
          received.push(e);
          expect(received).toHaveLength(1);
          expect(received[0].type).toBe('ITEM_SUCCESS');
          done();
        },
        error: done,
      });

    service.emit({
      orderId: 'order-late',
      type: 'ITEM_SUCCESS',
      itemIndex: 1,
      totalItems: 1,
      accountCount: 1,
    });
  });
});


