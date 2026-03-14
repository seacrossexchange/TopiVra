import {
  Controller,
  Post,
  Delete,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiParam,
  ApiBody,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { RoleService } from '../auth/role.service';

@ApiTags('用户角色管理')
@Controller('admin/roles')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
@ApiBearerAuth()
export class RoleController {
  constructor(private readonly roleService: RoleService) {}

  @Post(':userId/add')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '为用户添加角色' })
  @ApiParam({ name: 'userId', description: '用户ID' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        role: { type: 'string', enum: ['ADMIN', 'SELLER', 'USER'] },
      },
      required: ['role'],
    },
  })
  async addRole(
    @Param('userId') userId: string,
    @Body('role') role: string,
    @CurrentUser('id') adminId: string,
  ) {
    await this.roleService.addRole(userId, role, adminId);
    return {
      success: true,
      message: '角色添加成功',
    };
  }

  @Delete(':userId/remove')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '移除用户角色' })
  @ApiParam({ name: 'userId', description: '用户ID' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        role: { type: 'string', enum: ['ADMIN', 'SELLER', 'USER'] },
      },
      required: ['role'],
    },
  })
  async removeRole(
    @Param('userId') userId: string,
    @Body('role') role: string,
  ) {
    await this.roleService.removeRole(userId, role);
    return {
      success: true,
      message: '角色移除成功',
    };
  }

  @Post(':userId/set')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '设置用户角色（替换所有现有角色）' })
  @ApiParam({ name: 'userId', description: '用户ID' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        roles: {
          type: 'array',
          items: { type: 'string', enum: ['ADMIN', 'SELLER', 'USER'] },
        },
      },
      required: ['roles'],
    },
  })
  async setRoles(
    @Param('userId') userId: string,
    @Body('roles') roles: string[],
    @CurrentUser('id') adminId: string,
  ) {
    await this.roleService.setRoles(userId, roles, adminId);
    return {
      success: true,
      message: '角色设置成功',
    };
  }
}
