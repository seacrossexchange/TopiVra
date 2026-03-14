import { Test, TestingModule } from '@nestjs/testing';
import { BlogService } from './blog.service';
import { PrismaService } from '../../prisma/prisma.service';

describe('BlogService', () => {
  let service: BlogService;

  const mockPrismaService = {
    blog: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
    blogTag: {
      createMany: jest.fn(),
      findMany: jest.fn(),
      deleteMany: jest.fn(),
    },
    tag: {
      updateMany: jest.fn(),
    },
    blogComment: {
      create: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
    },
    blogLike: {
      findUnique: jest.fn(),
      create: jest.fn(),
      delete: jest.fn(),
    },
    blogView: {
      findFirst: jest.fn(),
      create: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BlogService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<BlogService>(BlogService);
  });

  it('应该被定义', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('应该创建博客文章', async () => {
      const mockBlog = {
        id: 'blog1',
        title: '测试文章',
        slug: 'test-article',
        content: '文章内容',
        authorId: 'user1',
        status: 'DRAFT',
        createdAt: new Date(),
      };

      mockPrismaService.blog.findUnique.mockResolvedValue(null);
      mockPrismaService.blog.create.mockResolvedValue(mockBlog);
      mockPrismaService.blog.findUnique
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({
          ...mockBlog,
          author: { id: 'user1', username: 'testuser', avatar: null },
          category: null,
          tags: [],
          _count: { comments: 0, likes: 0 },
        });

      const result = await service.create('user1', {
        title: '测试文章',
        slug: 'test-article',
        excerpt: '摘要',
        content: '文章内容',
        categoryId: 'cat1',
      });

      expect(result.title).toBe('测试文章');
    });
  });

  describe('findAll', () => {
    it('应该返回文章列表', async () => {
      const mockBlogs = [
        {
          id: 'blog1',
          title: '文章1',
          author: { id: 'user1', username: 'user1', avatar: null },
          category: null,
          tags: [],
          _count: { comments: 0, likes: 0 },
        },
      ];

      mockPrismaService.blog.findMany.mockResolvedValue(mockBlogs);
      mockPrismaService.blog.count.mockResolvedValue(1);

      const result = await service.findAll({ page: 1, limit: 10 });
      expect(result.items).toHaveLength(1);
      expect(result.total).toBe(1);
    });
  });

  describe('findOne', () => {
    it('应该返回单篇文章', async () => {
      const mockBlog = {
        id: 'blog1',
        title: '测试文章',
        author: { id: 'user1', username: 'user1', avatar: null },
        category: null,
        tags: [],
        _count: { comments: 0, likes: 0 },
      };

      mockPrismaService.blog.findUnique.mockResolvedValue(mockBlog);

      const result = await service.findOne('blog1');
      expect(result.title).toBe('测试文章');
    });
  });
});
