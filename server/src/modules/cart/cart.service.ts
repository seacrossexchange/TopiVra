import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  AddToCartDto,
  UpdateCartItemDto,
  BatchRemoveDto,
} from './dto/cart.dto';
import { ProductStatus } from '@prisma/client';

@Injectable()
export class CartService {
  constructor(private prisma: PrismaService) {}

  // ==================== 获取购物车 ====================

  async getCart(userId: string) {
    const cartItems = await this.prisma.cartItem.findMany({
      where: { userId },
      include: {
        product: {
          include: {
            seller: {
              select: {
                id: true,
                sellerProfile: {
                  select: { shopName: true },
                },
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // 过滤无效商品并计算价格
    const validItems = cartItems
      .filter(
        (item) =>
          item.product && item.product.status === ProductStatus.APPROVED,
      )
      .map((item) => {
        const price = Number(item.product.price);
        const originalPrice = item.product.originalPrice
          ? Number(item.product.originalPrice)
          : price;
        const quantity = item.quantity;

        return {
          id: item.id,
          productId: item.productId,
          productTitle: item.product.title,
          thumbnailUrl: item.product.thumbnailUrl,
          price,
          originalPrice,
          quantity,
          subtotal: price * quantity,
          sellerId: item.product.sellerId,
          shopName: item.product.seller?.sellerProfile?.shopName || '未知店铺',
          stock: item.product.stock,
          productStatus: item.product.status,
        };
      });

    const totalItems = validItems.reduce((sum, item) => sum + item.quantity, 0);
    const totalPrice = validItems.reduce((sum, item) => sum + item.subtotal, 0);
    const totalOriginalPrice = validItems.reduce(
      (sum, item) => sum + item.originalPrice * item.quantity,
      0,
    );
    const savedAmount = totalOriginalPrice - totalPrice;

    return {
      items: validItems,
      totalItems,
      totalPrice,
      totalOriginalPrice,
      savedAmount: savedAmount > 0 ? savedAmount : 0,
    };
  }

  // ==================== 添加到购物车 ====================

  async addToCart(userId: string, dto: AddToCartDto) {
    // 检查商品是否存在且可购买
    const product = await this.prisma.product.findUnique({
      where: { id: dto.productId },
    });

    if (!product) {
      throw new NotFoundException('商品不存在');
    }

    if (product.status !== ProductStatus.APPROVED) {
      throw new BadRequestException('该商品暂不可购买');
    }

    if (product.stock < dto.quantity) {
      throw new BadRequestException('库存不足');
    }

    // 不能购买自己的商品
    if (product.sellerId === userId) {
      throw new BadRequestException('不能购买自己的商品');
    }

    // 检查是否已在购物车
    const existingItem = await this.prisma.cartItem.findUnique({
      where: {
        userId_productId: {
          userId,
          productId: dto.productId,
        },
      },
    });

    if (existingItem) {
      // 更新数量
      const newQuantity = existingItem.quantity + dto.quantity;
      if (newQuantity > product.stock) {
        throw new BadRequestException('超出库存数量');
      }

      return this.prisma.cartItem.update({
        where: { id: existingItem.id },
        data: { quantity: newQuantity },
      });
    }

    // 创建新的购物车项
    return this.prisma.cartItem.create({
      data: {
        userId,
        productId: dto.productId,
        quantity: dto.quantity,
      },
    });
  }

  // ==================== 更新购物车项数量 ====================

  async updateCartItem(
    userId: string,
    cartItemId: string,
    dto: UpdateCartItemDto,
  ) {
    const cartItem = await this.prisma.cartItem.findUnique({
      where: { id: cartItemId },
      include: { product: true },
    });

    if (!cartItem || cartItem.userId !== userId) {
      throw new NotFoundException('购物车项不存在');
    }

    if (cartItem.product.stock < dto.quantity) {
      throw new BadRequestException('超出库存数量');
    }

    return this.prisma.cartItem.update({
      where: { id: cartItemId },
      data: { quantity: dto.quantity },
    });
  }

  // ==================== 移除购物车项 ====================

  async removeCartItem(userId: string, cartItemId: string) {
    const cartItem = await this.prisma.cartItem.findUnique({
      where: { id: cartItemId },
    });

    if (!cartItem || cartItem.userId !== userId) {
      throw new NotFoundException('购物车项不存在');
    }

    await this.prisma.cartItem.delete({
      where: { id: cartItemId },
    });

    return { success: true, message: '已移除' };
  }

  // ==================== 批量移除 ====================

  async batchRemove(userId: string, dto: BatchRemoveDto) {
    const result = await this.prisma.cartItem.deleteMany({
      where: {
        id: { in: dto.ids },
        userId,
      },
    });

    return {
      success: true,
      removed: result.count,
    };
  }

  // ==================== 清空购物车 ====================

  async clearCart(userId: string) {
    await this.prisma.cartItem.deleteMany({
      where: { userId },
    });

    return { success: true, message: '购物车已清空' };
  }

  // ==================== 获取购物车商品数量 ====================

  async getCartCount(userId: string) {
    const result = await this.prisma.cartItem.aggregate({
      where: { userId },
      _sum: { quantity: true },
    });

    return { count: result._sum.quantity || 0 };
  }

  // ==================== 检查购物车商品有效性 ====================

  async validateCartItems(userId: string, productIds: string[]) {
    const cartItems = await this.prisma.cartItem.findMany({
      where: {
        userId,
        productId: { in: productIds },
      },
      include: {
        product: {
          select: {
            id: true,
            title: true,
            price: true,
            stock: true,
            status: true,
            sellerId: true,
          },
        },
      },
    });

    const invalidItems: any[] = [];
    const validItems: any[] = [];

    for (const item of cartItems) {
      if (!item.product || item.product.status !== ProductStatus.APPROVED) {
        invalidItems.push({
          productId: item.productId,
          reason: '商品不存在或已下架',
        });
      } else if (item.product.stock < item.quantity) {
        invalidItems.push({
          productId: item.productId,
          reason: '库存不足',
        });
      } else {
        validItems.push({
          cartItemId: item.id,
          productId: item.productId,
          productTitle: item.product.title,
          price: Number(item.product.price),
          quantity: item.quantity,
          sellerId: item.product.sellerId,
        });
      }
    }

    return {
      valid: validItems,
      invalid: invalidItems,
    };
  }
}
