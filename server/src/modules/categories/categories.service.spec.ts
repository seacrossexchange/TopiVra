import { Test, TestingModule } from '@nestjs/testing';
import { CategoriesService } from './categories.service';
import { PrismaService } from '../../prisma/prisma.service';
import { RedisService } from '../../common/redis/redis.service';
import { NotFoundException, BadRequestException } from '@nestjs/common';

describe('CategoriesService', () => {
  let service: CategoriesService;
  let prisma: any;
  let redis: any;

  const mockCategoryId = 'cat-1';
  const mockCategory = {
    id: mockCategoryId,
    name: 'Test Category',
    slug: 'test-category',
    parentId: null,
    icon: 'icon.png',
    color: '#FF0000',
    description: 'Test description',
    sortOrder: 1,
    isActive: true,
    createdAt: new Date(),
    parent: null,
    children: [],
    _count: { products: 5 },
  };

  beforeEach(async () => {
    prisma = {
      category: {
        create: jest.fn(),
        findUnique: jest.fn(),
        findMany: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
    };

    redis = {
      isAvailable: jest.fn().mockReturnValue(false),
      get: jest.fn(),
      set: jest.fn(),
      del: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CategoriesService,
        { provide: PrismaService, useValue: prisma },
        { provide: RedisService, useValue: redis },
      ],
    }).compile();

    service = module.get<CategoriesService>(CategoriesService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    const createDto = {
      name: 'New Category',
      slug: 'new-category',
    };

    it('should throw NotFoundException if parent does not exist', async () => {
      prisma.category.findUnique.mockResolvedValue(null);

      await expect(
        service.create({ ...createDto, parentId: 'non-existent' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should create category with parent', async () => {
      prisma.category.findUnique.mockResolvedValue(mockCategory);
      prisma.category.create.mockResolvedValue({
        ...mockCategory,
        parentId: mockCategoryId,
      });

      const result = await service.create({
        ...createDto,
        parentId: mockCategoryId,
      });

      expect(result).toBeDefined();
    });

    it('should create category without parent', async () => {
      prisma.category.create.mockResolvedValue(mockCategory);

      const result = await service.create(createDto);

      expect(result).toBeDefined();
      expect(prisma.category.create).toHaveBeenCalled();
    });
  });

  describe('findAll', () => {
    it('should return all categories', async () => {
      prisma.category.findMany.mockResolvedValue([
        { ...mockCategory, _count: { products: 10 } },
      ]);

      const result = await service.findAll();

      expect(result).toHaveLength(1);
      expect(result[0].productCount).toBe(10);
    });

    it('should include inactive categories', async () => {
      prisma.category.findMany.mockResolvedValue([
        { ...mockCategory, isActive: false, _count: { products: 0 } },
      ]);

      const result = await service.findAll(true);

      expect(result).toHaveLength(1);
    });
  });

  describe('getCategoryTree', () => {
    it('should return category tree', async () => {
      prisma.category.findMany.mockResolvedValue([
        {
          ...mockCategory,
          children: [
            { ...mockCategory, id: 'child-1', _count: { products: 2 } },
          ],
          _count: { products: 5 },
        },
      ]);

      const result = await service.getCategoryTree();

      expect(result).toHaveLength(1);
      expect(result[0].children).toHaveLength(1);
    });
  });

  describe('findOne', () => {
    it('should throw NotFoundException if category does not exist', async () => {
      prisma.category.findUnique.mockResolvedValue(null);

      await expect(service.findOne('non-existent')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should return category', async () => {
      prisma.category.findUnique.mockResolvedValue(mockCategory);

      const result = await service.findOne(mockCategoryId);

      expect(result).toBeDefined();
      expect(result.productCount).toBe(5);
    });
  });

  describe('findBySlug', () => {
    it('should throw NotFoundException if category does not exist', async () => {
      prisma.category.findUnique.mockResolvedValue(null);

      await expect(service.findBySlug('non-existent')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should return category by slug', async () => {
      prisma.category.findUnique.mockResolvedValue(mockCategory);

      const result = await service.findBySlug('test-category');

      expect(result).toBeDefined();
    });
  });

  describe('update', () => {
    const updateDto = { name: 'Updated Category' };

    it('should throw NotFoundException if category does not exist', async () => {
      prisma.category.findUnique.mockResolvedValue(null);

      await expect(service.update(mockCategoryId, updateDto)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw BadRequestException if setting self as parent', async () => {
      prisma.category.findUnique.mockResolvedValue(mockCategory);

      await expect(
        service.update(mockCategoryId, { parentId: mockCategoryId }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException if parent does not exist', async () => {
      prisma.category.findUnique
        .mockResolvedValueOnce(mockCategory)
        .mockResolvedValueOnce(null);

      await expect(
        service.update(mockCategoryId, { parentId: 'non-existent' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should update category', async () => {
      prisma.category.findUnique.mockResolvedValue(mockCategory);
      prisma.category.update.mockResolvedValue({
        ...mockCategory,
        ...updateDto,
      });

      const result = await service.update(mockCategoryId, updateDto);

      expect(result.name).toBe('Updated Category');
    });
  });

  describe('remove', () => {
    it('should throw NotFoundException if category does not exist', async () => {
      prisma.category.findUnique.mockResolvedValue(null);

      await expect(service.remove('non-existent')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw BadRequestException if category has children', async () => {
      prisma.category.findUnique.mockResolvedValue({
        ...mockCategory,
        children: [{ id: 'child-1' }],
      });

      await expect(service.remove(mockCategoryId)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException if category has products', async () => {
      prisma.category.findUnique.mockResolvedValue({
        ...mockCategory,
        children: [],
        productCount: 5,
      });

      await expect(service.remove(mockCategoryId)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should delete category', async () => {
      prisma.category.findUnique.mockResolvedValue({
        ...mockCategory,
        children: [],
        _count: { products: 0 },
      });
      prisma.category.delete.mockResolvedValue(mockCategory);

      const result = await service.remove(mockCategoryId);

      expect(result.success).toBe(true);
    });
  });

  describe('updateSort', () => {
    it('should throw NotFoundException if category does not exist', async () => {
      prisma.category.findUnique.mockResolvedValue(null);

      await expect(service.updateSort(mockCategoryId, 10)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should update sort order', async () => {
      prisma.category.findUnique.mockResolvedValue(mockCategory);
      prisma.category.update.mockResolvedValue({
        ...mockCategory,
        sortOrder: 10,
      });

      const result = await service.updateSort(mockCategoryId, 10);

      expect(result.sortOrder).toBe(10);
    });
  });

  describe('toggleActive', () => {
    it('should throw NotFoundException if category does not exist', async () => {
      prisma.category.findUnique.mockResolvedValue(null);

      await expect(service.toggleActive(mockCategoryId)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should toggle active status', async () => {
      prisma.category.findUnique.mockResolvedValue(mockCategory);
      prisma.category.update.mockResolvedValue({
        ...mockCategory,
        isActive: false,
      });

      const result = await service.toggleActive(mockCategoryId);

      expect(result.isActive).toBe(false);
    });
  });
});
