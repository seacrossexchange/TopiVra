import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../prisma/prisma.service';
import { OrderStatus } from '@prisma/client';

@Injectable()
export class OrdersCronService {
  private readonly logger = new Logger(OrdersCronService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * 每分钟检查并取消超时未支付的订单
   */
  @Cron(CronExpression.EVERY_MINUTE)
  async handleExpiredOrders() {
    try {
      const now = new Date();

      // 查找超时未支付的订单
      const expiredOrders = await this.prisma.order.findMany({
        where: {
          orderStatus: OrderStatus.CREATED,
          autoCancelAt: {
            lte: now,
          },
        },
      });

      if (expiredOrders.length === 0) {
        return;
      }

      this.logger.log(`发现 ${expiredOrders.length} 个超时订单，开始处理...`);

      for (const order of expiredOrders) {
        try {
          // 更新订单状态为已取消
          await this.prisma.order.update({
            where: { id: order.id },
            data: {
              orderStatus: OrderStatus.CANCELLED,
              cancelledAt: now,
              adminRemark: '支付超时自动取消',
            },
          });

          this.logger.log(`订单 ${order.orderNo} 已自动取消`);
        } catch (error) {
          const message =
            error instanceof Error ? error.message : String(error);
          this.logger.error(`取消订单 ${order.orderNo} 失败: ${message}`);
        }
      }

      this.logger.log(
        `超时订单处理完成，共处理 ${expiredOrders.length} 个订单`,
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`处理超时订单失败: ${message}`);
    }
  }
}
