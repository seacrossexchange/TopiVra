import { Test, TestingModule } from '@nestjs/testing';
import { ProductsService } from './products.service';
import { PrismaService } from '../../prisma/prisma.service';
import { RedisService } from '../../common/redis/redis.service';
import { AuditService } from '../../common/audit/audit.service';
import {
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { ProductStatus } from '@prisma/client';

describe('ProductsService', () => {
  let service: ProductsService;
  let prisma: any;
  let redis: any;
  let audit: any;

  const mockSellerId = 'seller-1';
  const mockProductId = 'product-1';
  const mockCategoryId = 'cat-1';
  const mockUserId = 'user-1';

  beforeEach(async () => {
    prisma = {
      user: {
        findUnique: jest.fn(),
      },
      category: {
        findUnique: jest.fn(),
      },
      product: {
        create: jest.fn(),
        findUnique: jest.fn(),
        findMany: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        deleteMany: jest.fn(),
        updateMany: jest.fn(),
        count: jest.fn(),
        groupBy: jest.fn(),
      },
      sellerProfile: {
        update: jest.fn(),
      },
      favorite: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        delete: jest.fn(),
        count: jest.fn(),
      },
    };

    redis = {
      isAvailable: jest.fn().mockReturnValue(false),
      get: jest.fn(),
      set: jest.fn(),
      del: jest.fn(),
      keys: jest.fn().mockResolvedValue([]),
    };

    audit = {
      log: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductsService,
        { provide: PrismaService, useValue: prisma },
        { provide: RedisService, useValue: redis },
        { provide: AuditService, useValue: audit },
      ],
    }).compile();

    service = module.get<ProductsService>(ProductsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    const createDto = {
      categoryId: mockCategoryId,
      title: 'Test Product',
      description: 'Test Description',
      platform: 'Steam',
      accountType: 'Account',
      region: 'Global',
      price: 100,
      stock: 10,
    };

    it('should throw ForbiddenException if user is not a seller', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(service.create(mockSellerId, createDto)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should throw BadRequestException if category does not exist', async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: mockSellerId,
        isSeller: true,
        sellerProfile: { id: 'profile-1' },
      });
      prisma.category.findUnique.mockResolvedValue(null);

      await expect(service.create(mockSellerId, createDto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should create product successfully', async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: mockSellerId,
        isSeller: true,
        sellerProfile: { id: 'profile-1' },
      });
      prisma.category.findUnique.mockResolvedValue({
        id: mockCategoryId,
        isActive: true,
      });
      prisma.product.create.mockResolvedValue({
        id: mockProductId,
        ...createDto,
        status: ProductStatus.DRAFT,
      });
      prisma.sellerProfile.update.mockResolvedValue({});
      audit.log.mockResolvedValue(undefined);

      const result = await service.create(mockSellerId, createDto);

      expect(result).toBeDefined();
      expect(prisma.product.create).toHaveBeenCalled();
      expect(audit.log).toHaveBeenCalled();
    });
  });

  describe('update', () => {
    const updateDto = { title: 'Updated Title' };

    it('should throw NotFoundException if product does not exist', async () => {
      prisma.product.findUnique.mockResolvedValue(null);

      await expect(
        service.update(mockProductId, mockSellerId, updateDto),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException if user is not the seller', async () => {
      prisma.product.findUnique.mockResolvedValue({
        id: mockProductId,
        sellerId: 'other-seller',
      });

      await expect(
        service.update(mockProductId, mockSellerId, updateDto),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should update product successfully', async () => {
      prisma.product.findUnique.mockResolvedValue({
        id: mockProductId,
        sellerId: mockSellerId,
        categoryId: mockCategoryId,
      });
      prisma.product.update.mockResolvedValue({
        id: mockProductId,
        ...updateDto,
      });
      audit.log.mockResolvedValue(undefined);

      const result = await service.update(
        mockProductId,
        mockSellerId,
        updateDto,
      );

      expect(result).toBeDefined();
      expect(prisma.product.update).toHaveBeenCalled();
    });
  });

  describe('findOne', () => {
    it('should throw NotFoundException if product does not exist', async () => {
      prisma.product.findUnique.mockResolvedValue(null);

      await expect(service.findOne(mockProductId)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should return product', async () => {
      const mockProduct = {
        id: mockProductId,
        title: 'Test Product',
        viewCount: 0,
      };
      prisma.product.findUnique.mockResolvedValue(mockProduct);
      prisma.product.update.mockResolvedValue(mockProduct);

      const result = await service.findOne(mockProductId);

      expect(result).toBeDefined();
    });
  });

  describe('findPublic', () => {
    it('should return paginated products', async () => {
      const mockProducts = [{ id: '1', title: 'Product 1' }];
      prisma.product.findMany.mockResolvedValue(mockProducts);
      prisma.product.count.mockResolvedValue(1);

      const result = await service.findPublic({
        page: 1,
        limit: 10,
      });

      expect(result.items).toEqual(mockProducts);
      expect(result.total).toBe(1);
    });
  });

  describe('findBySeller', () => {
    it('should return seller products', async () => {
      const mockProducts = [
        { id: '1', title: 'Product 1', sellerId: mockSellerId },
      ];
      prisma.product.findMany.mockResolvedValue(mockProducts);
      prisma.product.count.mockResolvedValue(1);

      const result = await service.findBySeller(mockSellerId, {
        page: 1,
        limit: 10,
      });

      expect(result.items).toEqual(mockProducts);
    });
  });

  describe('audit', () => {
    const adminId = 'admin-1';

    it('should throw NotFoundException if product does not exist', async () => {
      prisma.product.findUnique.mockResolvedValue(null);

      await expect(
        service.audit(mockProductId, adminId, { status: 'APPROVED' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if product is not pending', async () => {
      prisma.product.findUnique.mockResolvedValue({
        id: mockProductId,
        status: ProductStatus.APPROVED,
      });

      await expect(
        service.audit(mockProductId, adminId, { status: 'APPROVED' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should approve product successfully', async () => {
      prisma.product.findUnique.mockResolvedValue({
        id: mockProductId,
        status: ProductStatus.PENDING,
        title: 'Test',
      });
      prisma.product.update.mockResolvedValue({
        id: mockProductId,
        status: ProductStatus.APPROVED,
      });
      audit.log.mockResolvedValue(undefined);

      const result = await service.audit(mockProductId, adminId, {
        status: 'APPROVED',
      });

      expect(result.status).toBe(ProductStatus.APPROVED);
    });
  });

  describe('remove', () => {
    it('should throw NotFoundException if product does not exist', async () => {
      prisma.product.findUnique.mockResolvedValue(null);

      await expect(service.remove(mockProductId, mockSellerId)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw ForbiddenException if user is not the seller', async () => {
      prisma.product.findUnique.mockResolvedValue({
        id: mockProductId,
        sellerId: 'other-seller',
      });

      await expect(service.remove(mockProductId, mockSellerId)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should delete product successfully', async () => {
      prisma.product.findUnique.mockResolvedValue({
        id: mockProductId,
        sellerId: mockSellerId,
        title: 'Test',
      });
      prisma.product.delete.mockResolvedValue({});
      prisma.sellerProfile.update.mockResolvedValue({});
      audit.log.mockResolvedValue(undefined);

      const result = await service.remove(mockProductId, mockSellerId);

      expect(result.success).toBe(true);
    });
  });

  describe('addFavorite', () => {
    it('should throw NotFoundException if product does not exist', async () => {
      prisma.product.findUnique.mockResolvedValue(null);

      await expect(
        service.addFavorite(mockUserId, mockProductId),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if already favorited', async () => {
      prisma.product.findUnique.mockResolvedValue({ id: mockProductId });
      prisma.favorite.findUnique.mockResolvedValue({ id: 'fav-1' });

      await expect(
        service.addFavorite(mockUserId, mockProductId),
      ).rejects.toThrow(BadRequestException);
    });

    it('should add favorite successfully', async () => {
      prisma.product.findUnique.mockResolvedValue({ id: mockProductId });
      prisma.favorite.findUnique.mockResolvedValue(null);
      prisma.favorite.create.mockResolvedValue({});
      prisma.product.update.mockResolvedValue({});

      const result = await service.addFavorite(mockUserId, mockProductId);

      expect(result.success).toBe(true);
    });
  });

  describe('removeFavorite', () => {
    it('should throw NotFoundException if not favorited', async () => {
      prisma.favorite.findUnique.mockResolvedValue(null);

      await expect(
        service.removeFavorite(mockUserId, mockProductId),
      ).rejects.toThrow(NotFoundException);
    });

    it('should remove favorite successfully', async () => {
      prisma.favorite.findUnique.mockResolvedValue({ id: 'fav-1' });
      prisma.favorite.delete.mockResolvedValue({});
      prisma.product.update.mockResolvedValue({});

      const result = await service.removeFavorite(mockUserId, mockProductId);

      expect(result.success).toBe(true);
    });
  });

  describe('getPopularPlatforms', () => {
    it('should return popular platforms', async () => {
      prisma.product.groupBy.mockResolvedValue([
        { platform: 'Steam', _count: { id: 100 } },
        { platform: 'PSN', _count: { id: 50 } },
      ]);

      const result = await service.getPopularPlatforms();

      expect(result).toHaveLength(2);
      expect(result[0].platform).toBe('Steam');
    });
  });

  describe('getRelatedProducts', () => {
    it('should return empty array if product does not exist', async () => {
      prisma.product.findUnique.mockResolvedValue(null);

      const result = await service.getRelatedProducts(mockProductId);

      expect(result).toEqual([]);
    });

    it('should return related products', async () => {
      prisma.product.findUnique.mockResolvedValue({
        id: mockProductId,
        categoryId: mockCategoryId,
        platform: 'Steam',
      });
      prisma.product.findMany.mockResolvedValue([
        { id: 'product-2', title: 'Related' },
      ]);

      const result = await service.getRelatedProducts(mockProductId);

      expect(result).toHaveLength(1);
    });
  });

  describe('submitForAudit', () => {
    it('should throw NotFoundException if product does not exist', async () => {
      prisma.product.findUnique.mockResolvedValue(null);

      await expect(
        service.submitForAudit(mockProductId, mockSellerId),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException if user is not the seller', async () => {
      prisma.product.findUnique.mockResolvedValue({
        id: mockProductId,
        sellerId: 'other-seller',
      });

      await expect(
        service.submitForAudit(mockProductId, mockSellerId),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw BadRequestException if product is not draft', async () => {
      prisma.product.findUnique.mockResolvedValue({
        id: mockProductId,
        sellerId: mockSellerId,
        status: ProductStatus.APPROVED,
      });

      await expect(
        service.submitForAudit(mockProductId, mockSellerId),
      ).rejects.toThrow(BadRequestException);
    });

    it('should submit product for audit', async () => {
      prisma.product.findUnique.mockResolvedValue({
        id: mockProductId,
        sellerId: mockSellerId,
        status: ProductStatus.DRAFT,
      });
      prisma.product.update.mockResolvedValue({
        id: mockProductId,
        status: ProductStatus.PENDING,
      });

      const result = await service.submitForAudit(mockProductId, mockSellerId);

      expect(result.status).toBe(ProductStatus.PENDING);
    });
  });

  describe('batchOperation', () => {
    it('should throw NotFoundException if no products found', async () => {
      prisma.product.findMany.mockResolvedValue([]);

      await expect(
        service.batchOperation(mockSellerId, { ids: ['1'], action: 'delete' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should delete products in batch', async () => {
      prisma.product.findMany.mockResolvedValue([{ id: '1' }]);
      prisma.product.deleteMany.mockResolvedValue({ count: 1 });

      const result = await service.batchOperation(mockSellerId, {
        ids: ['1'],
        action: 'delete',
      });

      expect(result.success).toBe(true);
      expect(result.action).toBe('delete');
    });
  });

  describe('checkFavorite', () => {
    it('should return false if not favorited', async () => {
      prisma.favorite.findUnique.mockResolvedValue(null);

      const result = await service.checkFavorite(mockUserId, mockProductId);

      expect(result.isFavorited).toBe(false);
    });

    it('should return true if favorited', async () => {
      prisma.favorite.findUnique.mockResolvedValue({ id: 'fav-1' });

      const result = await service.checkFavorite(mockUserId, mockProductId);

      expect(result.isFavorited).toBe(true);
    });
  });

  describe('getFavorites', () => {
    it('should return user favorites', async () => {
      prisma.favorite.findMany.mockResolvedValue([
        {
          id: 'fav-1',
          userId: mockUserId,
          product: { id: mockProductId, title: 'Product' },
        },
      ]);
      prisma.favorite.count.mockResolvedValue(1);

      const result = await service.getFavorites(mockUserId, 1, 10);

      expect(result.items).toHaveLength(1);
      expect(result.total).toBe(1);
    });
  });

  describe('toggleStatus', () => {
    it('should throw NotFoundException if product does not exist', async () => {
      prisma.product.findUnique.mockResolvedValue(null);

      await expect(
        service.toggleStatus(mockProductId, mockSellerId, true),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException if user is not the seller', async () => {
      prisma.product.findUnique.mockResolvedValue({
        id: mockProductId,
        sellerId: 'other-seller',
      });

      await expect(
        service.toggleStatus(mockProductId, mockSellerId, true),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw BadRequestException if product is not approved', async () => {
      prisma.product.findUnique.mockResolvedValue({
        id: mockProductId,
        sellerId: mockSellerId,
        status: ProductStatus.DRAFT,
      });

      await expect(
        service.toggleStatus(mockProductId, mockSellerId, true),
      ).rejects.toThrow(BadRequestException);
    });

    it('should toggle product status', async () => {
      prisma.product.findUnique.mockResolvedValue({
        id: mockProductId,
        sellerId: mockSellerId,
        status: ProductStatus.APPROVED,
      });
      prisma.product.update.mockResolvedValue({
        id: mockProductId,
        status: ProductStatus.OFF_SALE,
      });

      const result = await service.toggleStatus(
        mockProductId,
        mockSellerId,
        false,
      );

      expect(result).toBeDefined();
    });
  });

  describe('findAll', () => {
    it('should return all products for admin', async () => {
      const mockProducts = [{ id: '1', title: 'Product 1' }];
      prisma.product.findMany.mockResolvedValue(mockProducts);
      prisma.product.count.mockResolvedValue(1);

      const result = await service.findAll({ page: 1, limit: 10 });

      expect(result.items).toEqual(mockProducts);
    });
  });
});
