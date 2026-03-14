import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { InventoryService } from '../inventory/inventory.service';
import { NotificationService } from '../../common/notification/notification.service';
import { DeliveryEventsService } from '../orders/delivery-events.service';

@Injectable()
export class AutoDeliveryService {
  private readonly logger = new Logger(AutoDeliveryService.name);

  constructor(
    private prisma: PrismaService,
    private inventoryService: InventoryService,
    private notificationService: NotificationService,
    private deliveryEventsService: DeliveryEventsService,
  ) {}

  /**
   * 支付成功后自动发货
   */
  async handlePaymentSuccess(orderId: string) {
    this.logger.log(`开始自动发货处理: ${orderId}`);

    this.deliveryEventsService.emit({
      orderId,
      type: 'STARTED',
    });

    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        orderItems: {
          include: { product: true },
        },
        buyer: true,
      },
    });

    if (!order) {
      throw new Error('订单不存在');
    }

    const deliveryResults = [];

    // 为每个订单项分配账号
    for (const item of order.orderItems) {
      const itemIndex = order.orderItems.indexOf(item) + 1;
      const totalItems = order.orderItems.length;
      try {
        // 检查商品是否支持自动发货
        if (!item.product.autoDeliver) {
          this.logger.log(`商品 ${item.productId} 不支持自动发货，跳过`);
          this.deliveryEventsService.emit({
            orderId,
            type: 'ITEM_FAILED',
            itemIndex,
            totalItems,
            productTitle: item.product.title,
            error: 'NOT_AUTO_DELIVER',
          });
          deliveryResults.push({
            orderItemId: item.id,
            success: false,
            reason: 'NOT_AUTO_DELIVER',
          });
          continue;
        }

        this.deliveryEventsService.emit({
          orderId,
          type: 'ITEM_PROCESSING',
          itemIndex,
          totalItems,
          productTitle: item.product.title,
        });

        // 为每个数量分配账号
        const accounts = [];
        for (let i = 0; i < item.quantity; i++) {
          const inventory = await this.inventoryService.getAvailableAccount(
            item.productId,
          );

          if (!inventory) {
            throw new Error(`商品 ${item.product.title} 库存不足`);
          }

          accounts.push(inventory);

          // 标记为已售出
          await this.inventoryService.markAsSold(
            inventory.id,
            order.id,
            item.id,
          );
        }

        // 格式化账号信息
        const accountsText = accounts
          .map((acc, index) => {
            return `账号 ${index + 1}:\n${acc.accountData}`;
          })
          .join('\n\n---\n\n');

        // 更新订单项
        await this.prisma.orderItem.update({
          where: { id: item.id },
          data: {
            deliveredCredentials: accountsText,
            deliveredAt: new Date(),
            autoDelivered: true,
            inventoryId: accounts[0]?.id, // 关联第一个账号
          },
        });

        deliveryResults.push({
          orderItemId: item.id,
          success: true,
          accountCount: accounts.length,
        });

        this.deliveryEventsService.emit({
          orderId,
          type: 'ITEM_SUCCESS',
          itemIndex,
          totalItems,
          productTitle: item.product.title,
          accountCount: accounts.length,
        });

        this.logger.log(
          `订单项 ${item.id} 自动发货成功，分配 ${accounts.length} 个账号`,
        );
      } catch (error: unknown) {
        const errMsg = (error as Error).message;
        this.logger.error(`订单项 ${item.id} 自动发货失败: ${errMsg}`);
        this.deliveryEventsService.emit({
          orderId,
          type: 'ITEM_FAILED',
          itemIndex,
          totalItems,
          productTitle: item.product.title,
          error: errMsg,
        });
        deliveryResults.push({
          orderItemId: item.id,
          success: false,
          error: errMsg,
        });
      }
    }

    // 检查是否全部发货成功
    const allSuccess = deliveryResults.every((r) => r.success);

    if (allSuccess) {
      // 更新订单状态为已发货
      await this.prisma.order.update({
        where: { id: orderId },
        data: {
          orderStatus: 'DELIVERED',
        },
      });

      this.deliveryEventsService.emit({
        orderId,
        type: 'COMPLETED',
        success: true,
        totalItems: order.orderItems.length,
      });

      // 通知买家
      await this.notificationService.notifyUser(order.buyerId, {
        type: 'ORDER_DELIVERED' as any,
        title: '订单已自动发货',
        content: `您的订单 ${order.orderNo} 已自动发货，请查收账号信息`,
        orderId: order.id,
        orderNo: order.orderNo,
      });

      // WebSocket 实时通知
      try {
        this.notificationService['websocketGateway']?.notifyOrderStatus(
          order.buyerId,
          order.orderNo,
          'DELIVERED',
        );
      } catch (error: unknown) {
        this.logger.warn(`WebSocket 通知失败: ${(error as Error).message}`);
      }

      this.logger.log(`订单 ${orderId} 自动发货完成`);
    } else {
      // 部分失败，需要人工处理
      this.logger.warn(`订单 ${orderId} 部分商品发货失败，需要人工处理`);

      this.deliveryEventsService.emit({
        orderId,
        type: 'PARTIAL_FAILED',
        success: false,
        totalItems: order.orderItems.length,
      });

      // 通知卖家
      const sellerIds = [
        ...new Set(order.orderItems.map((item) => item.sellerId)),
      ];
      for (const sellerId of sellerIds) {
        await this.notificationService.notifyUser(sellerId, {
          type: 'ORDER_DELIVERY_FAILED' as any,
          title: '自动发货失败',
          content: `订单 ${order.orderNo} 部分商品库存不足，请手动处理`,
          orderId: order.id,
          orderNo: order.orderNo,
        });
      }
    }

    return {
      orderId,
      success: allSuccess,
      results: deliveryResults,
    };
  }

  /**
   * 检查商品是否有足够的库存
   */
  async checkInventoryAvailability(productId: string, quantity: number) {
    const availableCount = await this.prisma.productInventory.count({
      where: {
        productId,
        status: 'AVAILABLE',
        isValid: true,
      },
    });

    return {
      available: availableCount >= quantity,
      availableCount,
      requiredCount: quantity,
    };
  }

  /**
   * 预留库存（创建订单时）
   */
  async reserveInventory(productId: string, quantity: number, orderId: string) {
    const inventories = await this.prisma.productInventory.findMany({
      where: {
        productId,
        status: 'AVAILABLE',
        isValid: true,
      },
      take: quantity,
      orderBy: { createdAt: 'asc' },
    });

    if (inventories.length < quantity) {
      throw new Error('库存不足');
    }

    // 标记为预留状态
    await this.prisma.productInventory.updateMany({
      where: {
        id: { in: inventories.map((inv) => inv.id) },
      },
      data: {
        status: 'RESERVED',
        orderId,
      },
    });

    this.logger.log(`订单 ${orderId} 预留 ${quantity} 个账号`);

    return inventories;
  }

  /**
   * 释放预留库存（订单取消时）
   */
  async releaseReservedInventory(orderId: string) {
    const result = await this.prisma.productInventory.updateMany({
      where: {
        orderId,
        status: 'RESERVED',
      },
      data: {
        status: 'AVAILABLE',
        orderId: null,
      },
    });

    this.logger.log(`订单 ${orderId} 释放 ${result.count} 个预留账号`);

    return result;
  }
}
