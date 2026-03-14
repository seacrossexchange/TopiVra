import { Test, TestingModule } from '@nestjs/testing';
import { CartService } from './cart.service';
import { PrismaService } from '../../prisma/prisma.service';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { ProductStatus } from '@prisma/client';

describe('CartService', () => {
  let service: CartService;
  let prismaService: any;

  const mockUserId = 'user-123';
  const mockProductId = 'product-123';
  const mockSellerId = 'seller-123';

  const mockProduct = {
    id: mockProductId,
    title: 'Test Product',
    price: 100,
    originalPrice: 120,
    stock: 10,
    status: ProductStatus.APPROVED,
    sellerId: mockSellerId,
    thumbnailUrl: 'http://example.com/image.jpg',
  };

  const mockCartItem = {
    id: 'cart-123',
    userId: mockUserId,
    productId: mockProductId,
    quantity: 2,
    createdAt: new Date(),
    product: {
      ...mockProduct,
      seller: {
        id: mockSellerId,
        sellerProfile: { shopName: 'Test Shop' },
      },
    },
  };

  beforeEach(async () => {
    prismaService = {
      cartItem: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        deleteMany: jest.fn(),
        aggregate: jest.fn(),
      },
      product: {
        findUnique: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CartService,
        { provide: PrismaService, useValue: prismaService },
      ],
    }).compile();

    service = module.get<CartService>(CartService);
  });

  describe('getCart', () => {
    it('应该返回购物车内容', async () => {
      prismaService.cartItem.findMany.mockResolvedValue([mockCartItem]);

      const result = await service.getCart(mockUserId);

      expect(result.items).toHaveLength(1);
      expect(result.totalItems).toBe(2);
      expect(result.totalPrice).toBe(200);
    });

    it('应该过滤无效商品', async () => {
      const invalidCartItem = {
        ...mockCartItem,
        product: { ...mockProduct, status: ProductStatus.OFF_SALE },
      };
      prismaService.cartItem.findMany.mockResolvedValue([invalidCartItem]);

      const result = await service.getCart(mockUserId);

      expect(result.items).toHaveLength(0);
      expect(result.totalPrice).toBe(0);
    });
  });

  describe('addToCart', () => {
    it('应该成功添加商品到购物车', async () => {
      prismaService.product.findUnique.mockResolvedValue(mockProduct);
      prismaService.cartItem.findUnique.mockResolvedValue(null);
      prismaService.cartItem.create.mockResolvedValue(mockCartItem);

      await service.addToCart(mockUserId, {
        productId: mockProductId,
        quantity: 2,
      });

      expect(prismaService.cartItem.create).toHaveBeenCalled();
    });

    it('应该拒绝不存在的商品', async () => {
      prismaService.product.findUnique.mockResolvedValue(null);

      await expect(
        service.addToCart(mockUserId, {
          productId: 'non-existent',
          quantity: 1,
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('应该拒绝不可购买的商品', async () => {
      prismaService.product.findUnique.mockResolvedValue({
        ...mockProduct,
        status: ProductStatus.OFF_SALE,
      });

      await expect(
        service.addToCart(mockUserId, {
          productId: mockProductId,
          quantity: 1,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('应该拒绝库存不足的商品', async () => {
      prismaService.product.findUnique.mockResolvedValue({
        ...mockProduct,
        stock: 0,
      });

      await expect(
        service.addToCart(mockUserId, {
          productId: mockProductId,
          quantity: 1,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('应该拒绝购买自己的商品', async () => {
      prismaService.product.findUnique.mockResolvedValue({
        ...mockProduct,
        sellerId: mockUserId,
      });

      await expect(
        service.addToCart(mockUserId, {
          productId: mockProductId,
          quantity: 1,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('应该更新已存在商品的数量', async () => {
      prismaService.product.findUnique.mockResolvedValue(mockProduct);
      prismaService.cartItem.findUnique.mockResolvedValue({
        ...mockCartItem,
        quantity: 1,
      });
      prismaService.cartItem.update.mockResolvedValue({
        ...mockCartItem,
        quantity: 3,
      });

      await service.addToCart(mockUserId, {
        productId: mockProductId,
        quantity: 2,
      });

      expect(prismaService.cartItem.update).toHaveBeenCalledWith({
        where: { id: mockCartItem.id },
        data: { quantity: 3 },
      });
    });
  });

  describe('updateCartItem', () => {
    it('应该更新购物车项数量', async () => {
      prismaService.cartItem.findUnique.mockResolvedValue(mockCartItem);
      prismaService.cartItem.update.mockResolvedValue({
        ...mockCartItem,
        quantity: 5,
      });

      await service.updateCartItem(mockUserId, mockCartItem.id, {
        quantity: 5,
      });

      expect(prismaService.cartItem.update).toHaveBeenCalledWith({
        where: { id: mockCartItem.id },
        data: { quantity: 5 },
      });
    });

    it('应该拒绝更新不存在的购物车项', async () => {
      prismaService.cartItem.findUnique.mockResolvedValue(null);

      await expect(
        service.updateCartItem(mockUserId, 'non-existent', { quantity: 5 }),
      ).rejects.toThrow(NotFoundException);
    });

    it('应该拒绝超出库存的更新', async () => {
      prismaService.cartItem.findUnique.mockResolvedValue({
        ...mockCartItem,
        product: { ...mockProduct, stock: 2 },
      });

      await expect(
        service.updateCartItem(mockUserId, mockCartItem.id, { quantity: 10 }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('removeCartItem', () => {
    it('应该移除购物车项', async () => {
      prismaService.cartItem.findUnique.mockResolvedValue(mockCartItem);
      prismaService.cartItem.delete.mockResolvedValue(mockCartItem);

      const result = await service.removeCartItem(mockUserId, mockCartItem.id);

      expect(result.success).toBe(true);
      expect(prismaService.cartItem.delete).toHaveBeenCalled();
    });

    it('应该拒绝移除不存在的购物车项', async () => {
      prismaService.cartItem.findUnique.mockResolvedValue(null);

      await expect(
        service.removeCartItem(mockUserId, 'non-existent'),
      ).rejects.toThrow(NotFoundException);
    });

    it('应该拒绝移除其他用户的购物车项', async () => {
      prismaService.cartItem.findUnique.mockResolvedValue({
        ...mockCartItem,
        userId: 'other-user',
      });

      await expect(
        service.removeCartItem(mockUserId, mockCartItem.id),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('batchRemove', () => {
    it('应该批量移除购物车项', async () => {
      prismaService.cartItem.deleteMany.mockResolvedValue({ count: 3 });

      const result = await service.batchRemove(mockUserId, {
        ids: ['id1', 'id2', 'id3'],
      });

      expect(result.success).toBe(true);
      expect(result.removed).toBe(3);
    });
  });

  describe('clearCart', () => {
    it('应该清空购物车', async () => {
      prismaService.cartItem.deleteMany.mockResolvedValue({ count: 5 });

      const result = await service.clearCart(mockUserId);

      expect(result.success).toBe(true);
      expect(prismaService.cartItem.deleteMany).toHaveBeenCalledWith({
        where: { userId: mockUserId },
      });
    });
  });

  describe('getCartCount', () => {
    it('应该返回购物车商品数量', async () => {
      prismaService.cartItem.aggregate.mockResolvedValue({
        _sum: { quantity: 10 },
      });

      const result = await service.getCartCount(mockUserId);

      expect(result.count).toBe(10);
    });

    it('应该返回0当购物车为空', async () => {
      prismaService.cartItem.aggregate.mockResolvedValue({
        _sum: { quantity: null },
      });

      const result = await service.getCartCount(mockUserId);

      expect(result.count).toBe(0);
    });
  });

  describe('validateCartItems', () => {
    it('应该验证有效商品', async () => {
      prismaService.cartItem.findMany.mockResolvedValue([mockCartItem]);

      const result = await service.validateCartItems(mockUserId, [
        mockProductId,
      ]);

      expect(result.valid).toHaveLength(1);
      expect(result.invalid).toHaveLength(0);
    });

    it('应该识别无效商品', async () => {
      const invalidCartItem = {
        ...mockCartItem,
        product: { ...mockProduct, status: ProductStatus.OFF_SALE },
      };
      prismaService.cartItem.findMany.mockResolvedValue([invalidCartItem]);

      const result = await service.validateCartItems(mockUserId, [
        mockProductId,
      ]);

      expect(result.valid).toHaveLength(0);
      expect(result.invalid).toHaveLength(1);
      expect(result.invalid[0].reason).toBe('商品不存在或已下架');
    });

    it('应该识别库存不足的商品', async () => {
      const insufficientStockItem = {
        ...mockCartItem,
        quantity: 20,
        product: { ...mockProduct, stock: 5 },
      };
      prismaService.cartItem.findMany.mockResolvedValue([
        insufficientStockItem,
      ]);

      const result = await service.validateCartItems(mockUserId, [
        mockProductId,
      ]);

      expect(result.invalid).toHaveLength(1);
      expect(result.invalid[0].reason).toBe('库存不足');
    });
  });
});
