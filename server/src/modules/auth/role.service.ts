import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class RoleService {
  constructor(private prisma: PrismaService) {}

  /**
   * 获取用户的所有角色
   */
  async getUserRoles(userId: string): Promise<string[]> {
    const userRoles = await this.prisma.userRole.findMany({
      where: { userId },
      select: { role: true },
    });
    return userRoles.map((ur) => ur.role);
  }

  /**
   * 检查用户是否拥有指定角色
   */
  async hasRole(userId: string, role: string): Promise<boolean> {
    const userRole = await this.prisma.userRole.findUnique({
      where: {
        userId_role: {
          userId,
          role: role as any,
        },
      },
    });
    return !!userRole;
  }

  /**
   * 检查用户是否拥有任一指定角色
   */
  async hasAnyRole(userId: string, roles: string[]): Promise<boolean> {
    const userRoles = await this.getUserRoles(userId);
    return roles.some((role) => userRoles.includes(role));
  }

  /**
   * 为用户添加角色
   */
  async addRole(
    userId: string,
    role: string,
    grantedBy?: string,
  ): Promise<void> {
    // 检查用户是否存在
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new BadRequestException('用户不存在');
    }

    // 检查角色是否已存在
    const existingRole = await this.prisma.userRole.findUnique({
      where: {
        userId_role: {
          userId,
          role: role as any,
        },
      },
    });

    if (existingRole) {
      throw new BadRequestException('用户已拥有该角色');
    }

    // 添加角色
    await this.prisma.userRole.create({
      data: {
        userId,
        role: role as any,
        grantedBy,
      },
    });

    // 如果添加的是 SELLER 角色，更新 isSeller 字段
    if (role === 'SELLER') {
      await this.prisma.user.update({
        where: { id: userId },
        data: { isSeller: true },
      });
    }
  }

  /**
   * 移除用户角色
   */
  async removeRole(userId: string, role: string): Promise<void> {
    const userRole = await this.prisma.userRole.findUnique({
      where: {
        userId_role: {
          userId,
          role: role as any,
        },
      },
    });

    if (!userRole) {
      throw new BadRequestException('用户没有该角色');
    }

    // 不允许移除最后一个角色
    const allRoles = await this.getUserRoles(userId);
    if (allRoles.length === 1) {
      throw new BadRequestException('不能移除用户的最后一个角色');
    }

    await this.prisma.userRole.delete({
      where: { id: userRole.id },
    });

    // 如果移除的是 SELLER 角色，检查是否还有其他 SELLER 角色
    if (role === 'SELLER') {
      const hasSellerRole = await this.hasRole(userId, 'SELLER');
      if (!hasSellerRole) {
        await this.prisma.user.update({
          where: { id: userId },
          data: { isSeller: false },
        });
      }
    }
  }

  /**
   * 设置用户角色（替换所有现有角色）
   */
  async setRoles(
    userId: string,
    roles: string[],
    grantedBy?: string,
  ): Promise<void> {
    // 检查用户是否存在
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new BadRequestException('用户不存在');
    }

    if (roles.length === 0) {
      throw new BadRequestException('至少需要一个角色');
    }

    // 删除所有现有角色
    await this.prisma.userRole.deleteMany({
      where: { userId },
    });

    // 添加新角色
    await this.prisma.userRole.createMany({
      data: roles.map((role) => ({
        userId,
        role: role as any,
        grantedBy,
      })),
    });

    // 更新 isSeller 字段
    const isSeller = roles.includes('SELLER');
    await this.prisma.user.update({
      where: { id: userId },
      data: { isSeller },
    });
  }

  /**
   * 检查用户是否为管理员
   */
  async isAdmin(userId: string): Promise<boolean> {
    return this.hasRole(userId, 'ADMIN');
  }

  /**
   * 检查用户是否为卖家
   */
  async isSeller(userId: string): Promise<boolean> {
    return this.hasRole(userId, 'SELLER');
  }
}
