import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  CreateBlogDto,
  UpdateBlogDto,
  BlogQueryDto,
  CreateTagDto,
  CreateCommentDto,
  AuthorQueryDto,
} from './dto/blog.dto';
import { BlogStatus } from '@prisma/client';

// 阅读权限检查结果
export interface AccessCheckResult {
  canRead: boolean;
  reason?: string;
  requiredAction?: 'LOGIN' | 'UPGRADE_MEMBER' | 'PAY';
  requiredLevel?: number;
  unlockPrice?: number;
  previewContent?: string;
  isUnlocked?: boolean;
  unlockType?: 'PAID' | 'MEMBER' | 'ADMIN';
}

// 博客访问权限类型（与Prisma schema保持一致）
export enum BlogAccessType {
  PUBLIC = 'PUBLIC', // 公开免费
  LOGIN_REQUIRED = 'LOGIN_REQUIRED', // 需登录
  MEMBER_ONLY = 'MEMBER_ONLY', // 仅会员可读
  PAID_UNLOCK = 'PAID_UNLOCK', // 打赏解锁
  MEMBER_OR_PAID = 'MEMBER_OR_PAID', // 会员或打赏均可
}

@Injectable()
export class BlogService {
  constructor(private prisma: PrismaService) {}

  // ==================== 工具方法 ====================

  // 计算阅读时间（基于字数，中文按字符，英文按单词）
  private calculateReadingTime(content: string): number {
    const chineseChars = (content.match(/[\u4e00-\u9fa5]/g) || []).length;
    const englishWords = content
      .replace(/[\u4e00-\u9fa5]/g, '')
      .split(/\s+/)
      .filter((word) => word.length > 0).length;

    // 中文阅读速度约 300-500 字/分钟，英文约 200-250 词/分钟
    const readingTime = Math.ceil(chineseChars / 400 + englishWords / 225);
    return Math.max(1, readingTime); // 至少1分钟
  }

  // 检查是否需要增加浏览量（防刷）
  private async shouldIncrementView(
    blogId: string,
    userId: string | null,
    ipAddress: string,
  ): Promise<boolean> {
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    // 检查24小时内是否已浏览
    const existingView = await this.prisma.blogView.findFirst({
      where: {
        blogId,
        OR: [userId ? { userId } : { ipAddress }],
        createdAt: { gte: oneDayAgo },
      },
    });

    return !existingView;
  }

  // ==================== 创建文章 ====================

  async create(authorId: string, dto: CreateBlogDto) {
    // 检查 slug 是否已存在
    const existing = await this.prisma.blog.findUnique({
      where: { slug: dto.slug },
    });

    if (existing) {
      throw new ConflictException({
        code: 'BLOG_SLUG_EXISTS',
        translationKey: 'errors.BLOG_SLUG_EXISTS',
        message: 'Blog slug already exists',
      });
    }

    // 计算阅读时间
    const readingTime = this.calculateReadingTime(dto.content);

    // 创建文章
    const blog = await this.prisma.blog.create({
      data: {
        title: dto.title,
        slug: dto.slug,
        excerpt: dto.excerpt,
        content: dto.content,
        coverImage: dto.coverImage,
        categoryId: dto.categoryId,
        contentType: dto.contentType || 'MARKDOWN',
        readingTime,
        authorId,
        status: BlogStatus.DRAFT,
      },
      include: {
        author: {
          select: { id: true, username: true, avatar: true },
        },
        category: true,
      },
    });

    // 关联标签
    if (dto.tagIds && dto.tagIds.length > 0) {
      await this.prisma.blogTag.createMany({
        data: dto.tagIds.map((tagId) => ({
          blogId: blog.id,
          tagId,
        })),
      });

      // 更新标签的文章计数
      await this.prisma.tag.updateMany({
        where: { id: { in: dto.tagIds } },
        data: { postCount: { increment: 1 } },
      });
    }

    return this.findOne(blog.id);
  }

  // ==================== 获取文章列表 ====================

  async findAll(query: BlogQueryDto) {
    const { search, status, categoryId, tagId, page = 1, limit = 10 } = query;
    const skip = (page - 1) * limit;

    const where: any = {};

    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { excerpt: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (status) {
      where.status = status;
    }

    if (categoryId) {
      where.categoryId = categoryId;
    }

    if (tagId) {
      where.tags = {
        some: { tagId },
      };
    }

    const [items, total] = await Promise.all([
      this.prisma.blog.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          author: {
            select: { id: true, username: true, avatar: true },
          },
          category: true,
          tags: {
            include: {
              tag: true,
            },
          },
          _count: {
            select: {
              comments: true,
              likes: true,
            },
          },
        },
      }),
      this.prisma.blog.count({ where }),
    ]);

    return {
      items: items.map((item) => ({
        ...item,
        tags: item.tags.map((bt) => bt.tag),
        commentCount: item._count.comments,
        likeCount: item._count.likes,
      })),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  // ==================== 获取公开文章列表 ====================

  async findPublished(query: BlogQueryDto) {
    const { search, categoryId, tagId, page = 1, limit = 10 } = query;
    const skip = (page - 1) * limit;

    const where: any = {
      status: BlogStatus.PUBLISHED,
    };

    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { excerpt: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (categoryId) {
      where.categoryId = categoryId;
    }

    if (tagId) {
      where.tags = {
        some: { tagId },
      };
    }

    const [items, total] = await Promise.all([
      this.prisma.blog.findMany({
        where,
        skip,
        take: limit,
        orderBy: { publishedAt: 'desc' },
        include: {
          author: {
            select: { id: true, username: true, avatar: true },
          },
          category: true,
          tags: {
            include: {
              tag: true,
            },
          },
          _count: {
            select: {
              comments: true,
              likes: true,
            },
          },
        },
      }),
      this.prisma.blog.count({ where }),
    ]);

    return {
      items: items.map((item) => ({
        ...item,
        tags: item.tags.map((bt) => bt.tag),
        commentCount: item._count.comments,
        likeCount: item._count.likes,
      })),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  // ==================== 获取单篇文章 ====================

  async findOne(id: string) {
    const blog = await this.prisma.blog.findUnique({
      where: { id },
      include: {
        author: {
          select: { id: true, username: true, avatar: true },
        },
        category: true,
        tags: {
          include: {
            tag: true,
          },
        },
        _count: {
          select: {
            comments: true,
            likes: true,
          },
        },
      },
    });

    if (!blog) {
      throw new NotFoundException({
        code: 'BLOG_NOT_FOUND',
        translationKey: 'errors.BLOG_NOT_FOUND',
        message: 'Blog not found',
      });
    }

    return {
      ...blog,
      tags: blog.tags.map((bt) => bt.tag),
      commentCount: blog._count.comments,
      likeCount: blog._count.likes,
    };
  }

  // ==================== 通过 Slug 获取文章 ====================

  async findBySlug(
    slug: string,
    userId: string | null = null,
    ipAddress: string = '',
  ) {
    const blog = await this.prisma.blog.findUnique({
      where: { slug },
      include: {
        author: {
          select: { id: true, username: true, avatar: true },
        },
        category: true,
        tags: {
          include: {
            tag: true,
          },
        },
        _count: {
          select: {
            comments: true,
            likes: true,
          },
        },
      },
    });

    if (!blog || blog.status !== BlogStatus.PUBLISHED) {
      throw new NotFoundException({
        code: 'BLOG_NOT_FOUND',
        translationKey: 'errors.BLOG_NOT_FOUND',
        message: 'Blog not found',
      });
    }

    // 防刷机制：检查是否需要增加浏览量
    const shouldIncrement = await this.shouldIncrementView(
      blog.id,
      userId,
      ipAddress,
    );

    if (shouldIncrement) {
      // 记录浏览
      await this.prisma.blogView.create({
        data: {
          blogId: blog.id,
          userId,
          ipAddress,
        },
      });

      // 增加浏览量
      await this.prisma.blog.update({
        where: { id: blog.id },
        data: { viewCount: { increment: 1 } },
      });
    }

    return {
      ...blog,
      tags: blog.tags.map((bt) => bt.tag),
      commentCount: blog._count.comments,
      likeCount: blog._count.likes,
    };
  }

  // ==================== 更新文章 ====================

  async update(id: string, dto: UpdateBlogDto) {
    const blog = await this.findOne(id);

    // 如果要更新 slug，检查是否冲突
    if (dto.slug && dto.slug !== blog.slug) {
      const existing = await this.prisma.blog.findUnique({
        where: { slug: dto.slug },
      });

      if (existing) {
        throw new ConflictException({
          code: 'BLOG_SLUG_EXISTS',
          translationKey: 'errors.BLOG_SLUG_EXISTS',
          message: 'Blog slug already exists',
        });
      }
    }

    // 如果更新了内容，重新计算阅读时间
    let readingTime = blog.readingTime;
    if (dto.content) {
      readingTime = this.calculateReadingTime(dto.content);
    }

    // 如果发布文章，设置发布时间
    const updateData: any = {
      title: dto.title,
      slug: dto.slug,
      excerpt: dto.excerpt,
      content: dto.content,
      coverImage: dto.coverImage,
      categoryId: dto.categoryId,
      status: dto.status,
      contentType: dto.contentType,
      readingTime,
    };

    if (dto.status === BlogStatus.PUBLISHED && !blog.publishedAt) {
      updateData.publishedAt = new Date();
    }

    // 更新文章
    await this.prisma.blog.update({
      where: { id },
      data: updateData,
    });

    // 更新标签关联
    if (dto.tagIds !== undefined) {
      const newTagIds = dto.tagIds;
      // 获取旧标签
      const oldTags = await this.prisma.blogTag.findMany({
        where: { blogId: id },
        select: { tagId: true },
      });
      const oldTagIds = oldTags.map((t) => t.tagId);

      // 删除旧关联
      await this.prisma.blogTag.deleteMany({
        where: { blogId: id },
      });

      // 创建新关联
      if (newTagIds.length > 0) {
        await this.prisma.blogTag.createMany({
          data: newTagIds.map((tagId) => ({
            blogId: id,
            tagId,
          })),
        });
      }

      // 更新标签计数
      const removedTags = oldTagIds.filter((tid) => !newTagIds.includes(tid));
      const addedTags = newTagIds.filter((tid) => !oldTagIds.includes(tid));

      if (removedTags.length > 0) {
        await this.prisma.tag.updateMany({
          where: { id: { in: removedTags } },
          data: { postCount: { decrement: 1 } },
        });
      }

      if (addedTags.length > 0) {
        await this.prisma.tag.updateMany({
          where: { id: { in: addedTags } },
          data: { postCount: { increment: 1 } },
        });
      }
    }

    return this.findOne(id);
  }

  // ==================== 删除文章 ====================

  async remove(id: string) {
    const _blog = await this.findOne(id);

    // 获取关联的标签
    const blogTags = await this.prisma.blogTag.findMany({
      where: { blogId: id },
      select: { tagId: true },
    });

    // 删除文章（级联删除评论、点赞、浏览记录）
    await this.prisma.blog.delete({
      where: { id },
    });

    // 更新标签计数
    if (blogTags.length > 0) {
      await this.prisma.tag.updateMany({
        where: { id: { in: blogTags.map((bt) => bt.tagId) } },
        data: { postCount: { decrement: 1 } },
      });
    }

    return {
      success: true,
      message: 'Blog deleted successfully',
      translationKey: 'blog.deleteSuccess',
    };
  }

  // ==================== 获取热门文章 ====================

  async getPopular(limit: number = 5) {
    return this.prisma.blog.findMany({
      where: { status: BlogStatus.PUBLISHED },
      take: limit,
      orderBy: { viewCount: 'desc' },
      select: {
        id: true,
        title: true,
        slug: true,
        coverImage: true,
        viewCount: true,
        createdAt: true,
      },
    });
  }

  // ==================== 获取相关文章 ====================

  async getRelated(blogId: string, limit: number = 5) {
    const blog = await this.findOne(blogId);

    // 获取当前文章的标签
    const blogTags = await this.prisma.blogTag.findMany({
      where: { blogId },
      select: { tagId: true },
    });

    const tagIds = blogTags.map((bt) => bt.tagId);

    // 优先推荐：有相同标签的文章
    if (tagIds.length > 0) {
      const relatedByTags = await this.prisma.blog.findMany({
        where: {
          status: BlogStatus.PUBLISHED,
          id: { not: blogId },
          tags: {
            some: {
              tagId: { in: tagIds },
            },
          },
        },
        take: limit,
        orderBy: { viewCount: 'desc' },
        select: {
          id: true,
          title: true,
          slug: true,
          coverImage: true,
          viewCount: true,
        },
      });

      if (relatedByTags.length >= limit) {
        return relatedByTags;
      }

      // 如果标签相关的文章不够，补充同分类的文章
      if (blog.categoryId) {
        const relatedByCategory = await this.prisma.blog.findMany({
          where: {
            status: BlogStatus.PUBLISHED,
            categoryId: blog.categoryId,
            id: {
              not: blogId,
              notIn: relatedByTags.map((b) => b.id),
            },
          },
          take: limit - relatedByTags.length,
          orderBy: { viewCount: 'desc' },
          select: {
            id: true,
            title: true,
            slug: true,
            coverImage: true,
            viewCount: true,
          },
        });

        return [...relatedByTags, ...relatedByCategory];
      }

      return relatedByTags;
    }

    // 如果没有标签，按分类推荐
    if (blog.categoryId) {
      return this.prisma.blog.findMany({
        where: {
          status: BlogStatus.PUBLISHED,
          categoryId: blog.categoryId,
          id: { not: blogId },
        },
        take: limit,
        orderBy: { viewCount: 'desc' },
        select: {
          id: true,
          title: true,
          slug: true,
          coverImage: true,
          viewCount: true,
        },
      });
    }

    return [];
  }

  // ==================== 标签管理 ====================

  async createTag(dto: CreateTagDto) {
    const existing = await this.prisma.tag.findUnique({
      where: { slug: dto.slug },
    });

    if (existing) {
      throw new ConflictException({
        code: 'BLOG_TAG_SLUG_EXISTS',
        translationKey: 'errors.BLOG_TAG_SLUG_EXISTS',
        message: 'Blog tag slug already exists',
      });
    }

    return this.prisma.tag.create({
      data: dto,
    });
  }

  async getAllTags() {
    return this.prisma.tag.findMany({
      orderBy: { postCount: 'desc' },
    });
  }

  async getPopularTags(limit: number = 10) {
    return this.prisma.tag.findMany({
      where: { postCount: { gt: 0 } },
      take: limit,
      orderBy: { postCount: 'desc' },
    });
  }

  // ==================== 评论管理 ====================

  async createComment(blogId: string, userId: string, dto: CreateCommentDto) {
    const blog = await this.prisma.blog.findUnique({
      where: { id: blogId },
    });

    if (!blog) {
      throw new NotFoundException({
        code: 'BLOG_NOT_FOUND',
        translationKey: 'errors.BLOG_NOT_FOUND',
        message: 'Blog not found',
      });
    }

    // 如果是回复，检查父评论是否存在
    if (dto.parentId) {
      const parentComment = await this.prisma.blogComment.findUnique({
        where: { id: dto.parentId },
      });

      if (!parentComment || parentComment.blogId !== blogId) {
        throw new BadRequestException({
          code: 'BLOG_PARENT_COMMENT_NOT_FOUND',
          translationKey: 'errors.BLOG_PARENT_COMMENT_NOT_FOUND',
          message: 'Parent comment not found',
        });
      }
    }

    const comment = await this.prisma.blogComment.create({
      data: {
        blogId,
        userId,
        content: dto.content,
        parentId: dto.parentId,
      },
      include: {
        user: {
          select: { id: true, username: true, avatar: true },
        },
      },
    });

    // 更新文章评论数
    await this.prisma.blog.update({
      where: { id: blogId },
      data: { commentCount: { increment: 1 } },
    });

    return comment;
  }

  async getComments(blogId: string, page: number = 1, limit: number = 20) {
    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      this.prisma.blogComment.findMany({
        where: {
          blogId,
          parentId: null, // 只获取顶级评论
        },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: { id: true, username: true, avatar: true },
          },
          replies: {
            include: {
              user: {
                select: { id: true, username: true, avatar: true },
              },
            },
            orderBy: { createdAt: 'asc' },
          },
        },
      }),
      this.prisma.blogComment.count({
        where: { blogId, parentId: null },
      }),
    ]);

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  // ==================== 点赞功能 ====================

  async toggleLike(blogId: string, userId: string) {
    const blog = await this.prisma.blog.findUnique({
      where: { id: blogId },
    });

    if (!blog) {
      throw new NotFoundException({
        code: 'BLOG_NOT_FOUND',
        translationKey: 'errors.BLOG_NOT_FOUND',
        message: 'Blog not found',
      });
    }

    const existingLike = await this.prisma.blogLike.findUnique({
      where: {
        blogId_userId: { blogId, userId },
      },
    });

    if (existingLike) {
      // 取消点赞
      await this.prisma.blogLike.delete({
        where: { id: existingLike.id },
      });

      await this.prisma.blog.update({
        where: { id: blogId },
        data: { likeCount: { decrement: 1 } },
      });

      return {
        liked: false,
        message: 'Blog like removed',
        translationKey: 'blog.likeRemoved',
      };
    } else {
      // 点赞
      await this.prisma.blogLike.create({
        data: { blogId, userId },
      });

      await this.prisma.blog.update({
        where: { id: blogId },
        data: { likeCount: { increment: 1 } },
      });

      return {
        liked: true,
        message: 'Blog liked successfully',
        translationKey: 'blog.likeSuccess',
      };
    }
  }

  async checkLiked(blogId: string, userId: string) {
    const like = await this.prisma.blogLike.findUnique({
      where: {
        blogId_userId: { blogId, userId },
      },
    });

    return { liked: !!like };
  }

  // ==================== 审核功能 ====================

  /**
   * 提交文章审核
   */
  async submitForReview(id: string, userId: string) {
    const blog = await this.prisma.blog.findUnique({
      where: { id },
    });

    if (!blog) {
      throw new NotFoundException({
        code: 'BLOG_NOT_FOUND',
        translationKey: 'errors.BLOG_NOT_FOUND',
        message: 'Blog not found',
      });
    }

    // 验证作者权限
    if (blog.authorId !== userId) {
      throw new BadRequestException({
        code: 'BLOG_SUBMIT_OWN_ONLY',
        translationKey: 'errors.BLOG_SUBMIT_OWN_ONLY',
        message: 'You can only submit your own blog',
      });
    }

    // 只有草稿和已驳回状态可以提交
    if (
      blog.status !== BlogStatus.DRAFT &&
      blog.status !== BlogStatus.REJECTED
    ) {
      throw new BadRequestException({
        code: 'BLOG_STATUS_INVALID_FOR_SUBMISSION',
        translationKey: 'errors.BLOG_STATUS_INVALID_FOR_SUBMISSION',
        message: 'Blog status does not allow submission',
      });
    }

    const updated = await this.prisma.blog.update({
      where: { id },
      data: {
        status: BlogStatus.PENDING_REVIEW,
      },
      include: {
        author: { select: { id: true, username: true } },
      },
    });

    return {
      success: true,
      message: 'Blog submitted for review',
      translationKey: 'blog.submittedForReview',
      blog: updated,
    };
  }

  /**
   * 审核通过（管理员）
   */
  async approveBlog(id: string, adminId: string, reviewNotes?: string) {
    const blog = await this.prisma.blog.findUnique({
      where: { id },
    });

    if (!blog) {
      throw new NotFoundException({
        code: 'BLOG_NOT_FOUND',
        translationKey: 'errors.BLOG_NOT_FOUND',
        message: 'Blog not found',
      });
    }

    if (blog.status !== BlogStatus.PENDING_REVIEW) {
      throw new BadRequestException({
        code: 'BLOG_STATUS_INVALID_FOR_REVIEW',
        translationKey: 'errors.BLOG_STATUS_INVALID_FOR_REVIEW',
        message: 'Only blogs pending review can be reviewed',
      });
    }

    const updated = await this.prisma.blog.update({
      where: { id },
      data: {
        status: BlogStatus.PUBLISHED,
        reviewedBy: adminId,
        reviewNotes,
        publishedAt: blog.publishedAt || new Date(),
      },
      include: {
        author: { select: { id: true, username: true } },
      },
    });

    return {
      success: true,
      message: 'Blog approved successfully',
      translationKey: 'blog.approveSuccess',
      blog: updated,
    };
  }

  /**
   * 审核驳回（管理员）
   */
  async rejectBlog(id: string, adminId: string, reason: string) {
    const blog = await this.prisma.blog.findUnique({
      where: { id },
    });

    if (!blog) {
      throw new NotFoundException({
        code: 'BLOG_NOT_FOUND',
        translationKey: 'errors.BLOG_NOT_FOUND',
        message: 'Blog not found',
      });
    }

    if (blog.status !== BlogStatus.PENDING_REVIEW) {
      throw new BadRequestException({
        code: 'BLOG_STATUS_INVALID_FOR_REVIEW',
        translationKey: 'errors.BLOG_STATUS_INVALID_FOR_REVIEW',
        message: 'Only blogs pending review can be reviewed',
      });
    }

    const updated = await this.prisma.blog.update({
      where: { id },
      data: {
        status: BlogStatus.REJECTED,
        reviewedBy: adminId,
        reviewNotes: reason,
      },
      include: {
        author: { select: { id: true, username: true } },
      },
    });

    return {
      success: true,
      message: 'Blog rejected successfully',
      translationKey: 'blog.rejectSuccess',
      blog: updated,
    };
  }

  /**
   * 获取待审核文章列表（管理员）
   */
  async findPending(query: AuthorQueryDto) {
    const { search, page = 1, limit = 10 } = query;
    const skip = (page - 1) * limit;

    const where: any = {
      status: BlogStatus.PENDING_REVIEW,
    };

    if (search) {
      where.OR = [{ title: { contains: search, mode: 'insensitive' } }];
    }

    const [items, total] = await Promise.all([
      this.prisma.blog.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'asc' }, // 先提交先审核
        include: {
          author: {
            select: { id: true, username: true, avatar: true, roles: true },
          },
          category: true,
          tags: { include: { tag: true } },
        },
      }),
      this.prisma.blog.count({ where }),
    ]);

    return {
      items: items.map((item: any) => ({
        ...item,
        tags: item.tags?.map((bt: any) => bt.tag) || [],
      })),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * 获取作者的文章列表
   */
  async findByAuthor(authorId: string, query: BlogQueryDto) {
    const { search, status, page = 1, limit = 10 } = query;
    const skip = (page - 1) * limit;

    const where: any = { authorId };

    if (search) {
      where.OR = [{ title: { contains: search, mode: 'insensitive' } }];
    }

    if (status) {
      where.status = status;
    }

    const [items, total] = await Promise.all([
      this.prisma.blog.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          category: true,
          tags: { include: { tag: true } },
          _count: {
            select: { comments: true, likes: true },
          },
        },
      }),
      this.prisma.blog.count({ where }),
    ]);

    return {
      items: items.map((item) => ({
        ...item,
        tags: item.tags.map((bt) => bt.tag),
        commentCount: item._count.comments,
        likeCount: item._count.likes,
      })),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }
}
