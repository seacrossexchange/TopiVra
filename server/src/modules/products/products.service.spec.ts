import { Test, TestingModule } from '@nestjs/testing';
import { ProductsService } from './products.service';
import { PrismaService } from '../../prisma/prisma.service';
import { NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { AuditService } from '../../common/audit';

describe('ProductsService', () => {
  let service: ProductsService;
  let prismaService: any;

  const mockProduct = {
    id: 'product-001',
    title: '测试商品',
    description: '商品描述',
    price: 99.99,
    stock: 10,
    status: 'APPROVED',
    sellerId: 'seller-001',
    categoryId: 'cat-001',
    createdAt: new Date(),
    updatedAt: new Date(),
    seller: {
      id: 'seller-001',
      sellerProfile: { shopName: '测试店铺', commissionRate: 10 },
    },
  };

  const mockSeller = {
    id: 'seller-001',
    isSeller: true,
    sellerProfile: { isVerified: true, shopName: '测试店铺' },
  };

  beforeEach(async () => {
    const mockPrisma = {
      product: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        count: jest.fn(),
      },
      user: { findUnique: jest.fn() },
      category: { findUnique: jest.fn() },
      $transaction: jest.fn((fn: any) => fn(mockPrisma)),
    };

    const mockAudit = { log: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductsService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: AuditService, useValue: mockAudit },
      ],
    }).compile();

    service = module.get<ProductsService>(ProductsService);
    prismaService = mockPrisma;
  });

  // ── findAll ──────────────────────────────────────────────────
  describe('findAll', () => {
    it('应该返回商品列表（含分页信息）', async () => {
      prismaService.product.findMany.mockResolvedValue([mockProduct]);
      prismaService.product.count.mockResolvedValue(1);

      const result = await service.findAll({});

      expect(result).toHaveProperty('items');
      expect(result).toHaveProperty('total');
      expect(result.items).toHaveLength(1);
    });

    it('应该支持关键词搜索', async () => {
      prismaService.product.findMany.mockResolvedValue([mockProduct]);
      prismaService.product.count.mockResolvedValue(1);

      await service.findAll({ keyword: '测试' });

      expect(prismaService.product.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ OR: expect.any(Array) }),
        }),
      );
    });

    it('应该支持按分类筛选', async () => {
      prismaService.product.findMany.mockResolvedValue([]);
      prismaService.product.count.mockResolvedValue(0);

      await service.findAll({ categoryId: 'cat-001' });

      expect(prismaService.product.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ categoryId: 'cat-001' }),
        }),
      );
    });

    it('应该支持分页（skip / take）', async () => {
      prismaService.product.findMany.mockResolvedValue([]);
      prismaService.product.count.mockResolvedValue(20);

      await service.findAll({ page: 2, limit: 10 });

      expect(prismaService.product.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 10, take: 10 }),
      );
    });
  });

  // ── findOne ──────────────────────────────────────────────────
  describe('findOne', () => {
    it('应该返回商品详情', async () => {
      prismaService.product.findUnique.mockResolvedValue(mockProduct);

      const result = await service.findOne('product-001');

      expect(result.id).toBe('product-001');
    });

    it('商品不存在 → 应抛出 NotFoundException', async () => {
      prismaService.product.findUnique.mockResolvedValue(null);

      await expect(service.findOne('nonexistent')).rejects.toThrow(NotFoundException);
    });
  });

  // ── create ───────────────────────────────────────────────────
  describe('create', () => {
    it('认证卖家应能成功创建商品', async () => {
      prismaService.user.findUnique.mockResolvedValue(mockSeller);
      prismaService.product.create.mockResolvedValue(mockProduct);

      const dto = {
        title: '新商品',
        description: '描述',
        price: 50,
        stock: 5,
        categoryId: 'cat-001',
      };

      const result = await service.create('seller-001', dto as any);

      expect(result).toBeDefined();
      expect(prismaService.product.create).toHaveBeenCalled();
    });

    it('非卖家用户 → 应抛出 ForbiddenException', async () => {
      prismaService.user.findUnique.mockResolvedValue({
        ...mockSeller,
        isSeller: false,
        sellerProfile: null,
      });

      await expect(
        service.create('regular-user', { title: '商品' } as any),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  // ── update ───────────────────────────────────────────────────
  describe('update', () => {
    it('卖家应能更新自己的商品', async () => {
      prismaService.product.findUnique.mockResolvedValue(mockProduct);
      prismaService.product.update.mockResolvedValue({
        ...mockProduct,
        title: '更新后的商品',
      });

      const result = await service.update('product-001', 'seller-001', {
        title: '更新后的商品',
      } as any);

      expect(result.title).toBe('更新后的商品');
    });

    it('非商品所有者 → 应抛出 ForbiddenException', async () => {
      prismaService.product.findUnique.mockResolvedValue(mockProduct);

      await expect(
        service.update('product-001', 'other-seller', { title: '改名' } as any),
      ).rejects.toThrow(ForbiddenException);
    });

    it('商品不存在 → 应抛出 NotFoundException', async () => {
      prismaService.product.findUnique.mockResolvedValue(null);

      await expect(
        service.update('nonexistent', 'seller-001', {} as any),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ── remove ───────────────────────────────────────────────────
  describe('remove', () => {
    it('卖家应能删除自己的商品', async () => {
      prismaService.product.findUnique.mockResolvedValue(mockProduct);
      prismaService.product.delete.mockResolvedValue(mockProduct);

      const result = await service.remove('product-001', 'seller-001');

      expect(result).toHaveProperty('success', true);
    });

    it('非商品所有者 → 应抛出 ForbiddenException', async () => {
      prismaService.product.findUnique.mockResolvedValue(mockProduct);

      await expect(
        service.remove('product-001', 'other-seller'),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  // ── findBySeller ─────────────────────────────────────────────
  describe('findBySeller', () => {
    it('应返回指定卖家的商品列表', async () => {
      prismaService.product.findMany.mockResolvedValue([mockProduct]);
      prismaService.product.count.mockResolvedValue(1);

      const result = await service.findBySeller('seller-001', {});

      expect(result.items).toHaveLength(1);
      expect(prismaService.product.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ sellerId: 'seller-001' }),
        }),
      );
    });
  });
});
