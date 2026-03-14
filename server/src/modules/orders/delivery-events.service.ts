import { Injectable } from '@nestjs/common';
import { Subject, Observable, filter } from 'rxjs';

export type DeliveryEventType =
  | 'STARTED'
  | 'ITEM_PROCESSING'
  | 'ITEM_SUCCESS'
  | 'ITEM_FAILED'
  | 'COMPLETED'
  | 'PARTIAL_FAILED'
  | 'ERROR';

export interface DeliveryEvent {
  orderId: string;
  type: DeliveryEventType;
  /** 当前处理的第几个商品项（1-based） */
  itemIndex?: number;
  /** 总商品项数 */
  totalItems?: number;
  /** 商品标题 */
  productTitle?: string;
  /** 分配的账号数量 */
  accountCount?: number;
  /** 错误原因 */
  error?: string;
  /** 整体是否成功 */
  success?: boolean;
  timestamp: number;
}

@Injectable()
export class DeliveryEventsService {
  private readonly subject = new Subject<DeliveryEvent>();

  /** 发布事件（由 AutoDeliveryService 调用） */
  emit(event: Omit<DeliveryEvent, 'timestamp'>) {
    this.subject.next({ ...event, timestamp: Date.now() });
  }

  /** 订阅指定订单的事件流 */
  streamForOrder(orderId: string): Observable<DeliveryEvent> {
    return this.subject
      .asObservable()
      .pipe(filter((e) => e.orderId === orderId));
  }
}


