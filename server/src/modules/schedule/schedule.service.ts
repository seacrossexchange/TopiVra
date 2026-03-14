import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../prisma/prisma.service';
import { OrderStatus, PaymentStatus } from '@prisma/client';

@Injectable()
export class ScheduleService {
  private readonly logger = new Logger(ScheduleService.name);

  constructor(private prisma: PrismaService) {}

  // 每分钟检查订单自动取消（未支付订单超时）
  @Cron(CronExpression.EVERY_MINUTE)
  async handleOrderAutoCancel() {
    const now = new Date();

    // 查找需要自动取消的订单
    const orders = await this.prisma.order.findMany({
      where: {
        orderStatus: { in: [OrderStatus.CREATED, OrderStatus.PENDING_PAYMENT] },
        paymentStatus: PaymentStatus.UNPAID,
        autoCancelAt: { lte: now },
      },
      include: {
        orderItems: {
          include: {
            product: true,
          },
        },
      },
    });

    for (const order of orders) {
      try {
        await this.prisma.$transaction(async (tx) => {
          // 更新订单状态为已取消
          await tx.order.update({
            where: { id: order.id },
            data: {
              orderStatus: OrderStatus.CANCELLED,
              cancelledAt: now,
            },
          });

          // 恢复库存
          for (const item of order.orderItems) {
            await tx.product.update({
              where: { id: item.productId },
              data: {
                stock: { increment: item.quantity },
                status:
                  item.product.stock + item.quantity > 0
                    ? 'ON_SALE'
                    : item.product.status,
              },
            });
          }
        });

        this.logger.log(`订单 ${order.orderNo} 已自动取消（超时未支付）`);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        this.logger.error(`订单 ${order.orderNo} 自动取消失败: ${message}`);
      }
    }
  }

  // 每分钟检查订单自动确认（已交付订单超时确认）
  @Cron(CronExpression.EVERY_MINUTE)
  async handleOrderAutoConfirm() {
    const now = new Date();
    const orders = await this.prisma.order.findMany({
      where: {
        orderStatus: OrderStatus.DELIVERED,
        autoConfirmAt: { lte: now },
      },
      include: {
        orderItems: true,
      },
    });

    for (const order of orders) {
      try {
        await this.prisma.$transaction(async (tx) => {
          // 更新订单状态为已完成
          await tx.order.update({
            where: { id: order.id },
            data: {
              orderStatus: OrderStatus.COMPLETED,
              completedAt: now,
            },
          });

          // 标记所有订单项为已确认
          await tx.orderItem.updateMany({
            where: { orderId: order.id },
            data: {
              deliveryConfirmed: true,
              confirmedAt: now,
            },
          });

          // 更新卖家余额和统计
          for (const item of order.orderItems) {
            if (!item.settled) {
              // 更新卖家余额
              await tx.sellerProfile.update({
                where: { userId: item.sellerId },
                data: {
                  balance: { increment: item.sellerAmount },
                  totalEarnings: { increment: item.sellerAmount },
                  soldCount: { increment: item.quantity },
                },
              });

              // 创建资金流水
              await tx.sellerTransaction.create({
                data: {
                  sellerId: item.sellerId,
                  type: 'INCOME',
                  amount: item.sellerAmount,
                  balanceAfter: 0, // 将在后续查询更新
                  orderId: order.id,
                  orderItemId: item.id,
                  description: `订单 ${order.orderNo} 自动确认结算`,
                },
              });

              // 标记为已结算
              await tx.orderItem.update({
                where: { id: item.id },
                data: {
                  settled: true,
                  settledAt: now,
                },
              });
            }
          }
        });

        this.logger.log(`订单 ${order.orderNo} 自动确认完成`);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        this.logger.error(`订单 ${order.orderNo} 自动确认失败: ${message}`);
      }
    }
  }

  // 每天凌晨清理过期通知
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async cleanupExpiredNotifications() {
    // 清理30天前的已读通知
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const result = await this.prisma.notification.deleteMany({
      where: {
        isRead: true,
        readAt: { lt: thirtyDaysAgo },
      },
    });
    this.logger.log(`清理过期通知: ${result.count} 条`);
  }

  // 每小时检查商品库存
  @Cron(CronExpression.EVERY_HOUR)
  async checkLowStockProducts() {
    const lowStockProducts = await this.prisma.product.findMany({
      where: { stock: { lte: 5 }, status: 'ON_SALE' },
      select: { id: true, title: true, stock: true },
    });
    if (lowStockProducts.length > 0) {
      this.logger.warn(`低库存商品: ${lowStockProducts.length} 个`);
    }
  }
}
