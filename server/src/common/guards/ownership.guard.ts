import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaService } from '../../prisma/prisma.service';

/**
 * 资源所有权守卫
 * 确保用户只能访问自己的资源，防止水平越权
 */
@Injectable()
export class OwnershipGuard implements CanActivate {
  private readonly logger = new Logger(OwnershipGuard.name);

  constructor(
    private prisma: PrismaService,
    private reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('未登录');
    }

    // 管理员可以访问所有资源
    if (this.isAdmin(user)) {
      return true;
    }

    const resourceId = request.params.id;
    if (!resourceId) {
      // 没有资源ID，可能是列表接口，放行
      return true;
    }

    const resourceType = this.getResourceType(request.route.path);

    if (!resourceType) {
      // 无法识别资源类型，放行（由其他守卫处理）
      return true;
    }

    const resource = await this.getResource(resourceType, resourceId);

    if (!resource) {
      throw new NotFoundException('资源不存在');
    }

    // 检查资源所有权
    const hasAccess = this.checkOwnership(user, resource, resourceType);

    if (!hasAccess) {
      this.logger.warn(
        `用户 ${user.id} 尝试访问无权限的资源: ${resourceType}/${resourceId}`,
      );
      throw new ForbiddenException('无权访问此资源');
    }

    return true;
  }

  /**
   * 判断是否为管理员
   */
  private isAdmin(user: any): boolean {
    return (
      user.roles?.includes('ADMIN') ||
      user.email === 'admin@topivra.com' ||
      user.isAdmin === true
    );
  }

  /**
   * 从路径中识别资源类型
   */
  private getResourceType(path: string): string | null {
    if (path.includes('/orders')) return 'order';
    if (path.includes('/products')) return 'product';
    if (path.includes('/tickets')) return 'ticket';
    if (path.includes('/reviews')) return 'review';
    if (path.includes('/favorites')) return 'favorite';
    return null;
  }

  /**
   * 获取资源
   */
  private async getResource(type: string, id: string): Promise<any> {
    try {
      switch (type) {
        case 'order':
          return await this.prisma.order.findUnique({
            where: { id },
            select: {
              id: true,
              buyerId: true,
              orderItems: {
                select: {
                  sellerId: true,
                },
              },
            },
          });

        case 'product':
          return await this.prisma.product.findUnique({
            where: { id },
            select: {
              id: true,
              sellerId: true,
            },
          });

        case 'ticket':
          return await this.prisma.ticket.findUnique({
            where: { id },
            select: {
              id: true,
              userId: true,
            },
          });

        case 'review':
          return await this.prisma.review.findUnique({
            where: { id },
            select: {
              id: true,
              userId: true,
            },
          });

        case 'favorite':
          return await this.prisma.favorite.findUnique({
            where: { id },
            select: {
              id: true,
              userId: true,
            },
          });

        default:
          return null;
      }
    } catch (error) {
      this.logger.error(`获取资源失败: ${type}/${id}`, error);
      return null;
    }
  }

  /**
   * 检查资源所有权
   */
  private checkOwnership(user: any, resource: any, type: string): boolean {
    const userId = user.id || user.sub;

    switch (type) {
      case 'order':
        // 订单：买家或卖家可以访问
        const isBuyer = resource.buyerId === userId;
        const isSeller = resource.orderItems?.some(
          (item: any) => item.sellerId === userId,
        );
        return isBuyer || isSeller;

      case 'product':
        // 商品：卖家可以访问
        return resource.sellerId === userId;

      case 'ticket':
      case 'review':
      case 'favorite':
        // 工单、评价、收藏：创建者可以访问
        return resource.userId === userId;

      default:
        return false;
    }
  }
}
