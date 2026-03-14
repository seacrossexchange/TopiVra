import {
  Controller,
  Post,
  Get,
  Patch,
  Body,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
  Headers,
  Ip,
  UnauthorizedException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiBody } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { LocalAuthGuard } from './guards/local-auth.guard';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { Public } from './decorators/public.decorator';
import { CurrentUser } from './decorators/current-user.decorator';
import { LoginFailureGuard } from '../../common/guards/login-failure.guard';
import { RedisService } from '../../common/redis/redis.service';

@ApiTags('认证')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly redis: RedisService,
  ) {}

  // ==================== 本地认证 ====================

  @Public()
  @Post('register')
  @Throttle({ default: { limit: 1, ttl: 60000 } }) // 1 registration per minute
  @ApiOperation({ summary: '用户注册' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        email: { type: 'string', example: 'user@example.com' },
        password: { type: 'string', example: 'Password123!' },
        username: { type: 'string', example: 'testuser' },
      },
      required: ['email', 'password', 'username'],
    },
  })
  async register(
    @Body('email') email: string,
    @Body('password') password: string,
    @Body('username') username: string,
  ) {
    return this.authService.register(email, password, username);
  }

  @Public()
  @Post('verify-email')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 5, ttl: 60000 } }) // 5 attempts per minute
  @ApiOperation({ summary: '验证邮箱' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        token: { type: 'string', description: '验证令牌（可选）' },
        email: { type: 'string', description: '邮箱地址（验证码验证时必填）' },
        code: { type: 'string', description: '6位数字验证码' },
      },
    },
  })
  async verifyEmail(
    @Body('token') token?: string,
    @Body('email') email?: string,
    @Body('code') code?: string,
  ) {
    // 使用验证码验证
    if (email && code) {
      return this.authService.verifyEmailWithCode(email, code);
    }
    // 使用 token 验证
    return this.authService.verifyEmail(token, code);
  }

  @Public()
  @Post('resend-verification')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 1, ttl: 60000 } }) // 1 request per minute
  @ApiOperation({ summary: '重发验证邮件' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        email: { type: 'string', example: 'user@example.com' },
      },
      required: ['email'],
    },
  })
  async resendVerification(@Body('email') email: string) {
    return this.authService.resendVerification(email);
  }

  @Public()
  @UseGuards(LoginFailureGuard, LocalAuthGuard)
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 5, ttl: 60000 } }) // 5 login attempts per minute
  @ApiOperation({ summary: '用户登录' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        email: { type: 'string', example: 'user@example.com' },
        password: { type: 'string', example: 'Password123!' },
      },
      required: ['email', 'password'],
    },
  })
  async login(
    @Request() req: any,
    @Ip() ip: string,
    @Headers('user-agent') userAgent: string,
  ) {
    try {
      // 检查 req.user 是否存在
      if (!req.user) {
        throw new UnauthorizedException('用户认证失败');
      }

      const result = await this.authService.login(req.user, ip, userAgent);
      await this.redis.del(`login:fail:${ip}`);
      return result;
    } catch (error) {
      const key = `login:fail:${ip}`;
      await this.redis.incr(key);
      await this.redis.expire(key, 900);
      throw error;
    }
  }

  @Public()
  @Post('2fa/verify')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 3, ttl: 60000 } }) // 3 attempts per minute
  @ApiOperation({ summary: '验证双因素认证' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        tempToken: { type: 'string' },
        code: { type: 'string', example: '123456' },
      },
      required: ['tempToken', 'code'],
    },
  })
  async verifyTwoFactor(
    @Body('tempToken') tempToken: string,
    @Body('code') code: string,
  ) {
    return this.authService.verifyTwoFactor(tempToken, code);
  }

  // ==================== Telegram OAuth ====================

  @Public()
  @Post('telegram')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 5, ttl: 60000 } }) // 5 attempts per minute
  @ApiOperation({ summary: 'Telegram OAuth 登录' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        id: { type: 'number' },
        first_name: { type: 'string' },
        last_name: { type: 'string' },
        username: { type: 'string' },
        photo_url: { type: 'string' },
        auth_date: { type: 'number' },
        hash: { type: 'string' },
      },
      required: ['id', 'auth_date', 'hash'],
    },
  })
  async telegramLogin(@Body() authData: any) {
    return this.authService.verifyTelegramAuth(authData);
  }

  // ==================== 2FA 管理 ====================

  @Post('2fa/enable')
  @ApiBearerAuth()
  @ApiOperation({ summary: '启用双因素认证' })
  async enableTwoFactor(@CurrentUser('id') userId: string) {
    return this.authService.enableTwoFactor(userId);
  }

  @Post('2fa/confirm')
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '确认启用双因素认证' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        code: { type: 'string', example: '123456' },
      },
      required: ['code'],
    },
  })
  async confirmTwoFactor(
    @CurrentUser('id') userId: string,
    @Body('code') code: string,
  ) {
    return this.authService.confirmTwoFactor(userId, code);
  }

  @Post('2fa/disable')
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '禁用双因素认证' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        code: { type: 'string', example: '123456' },
      },
      required: ['code'],
    },
  })
  async disableTwoFactor(
    @CurrentUser('id') userId: string,
    @Body('code') code: string,
  ) {
    return this.authService.disableTwoFactor(userId, code);
  }

  // ==================== 用户信息 ====================

  @Get('me')
  @ApiBearerAuth()
  @ApiOperation({ summary: '获取当前用户信息' })
  async getCurrentUser(@CurrentUser('id') userId: string) {
    return this.authService.getUserProfile(userId);
  }

  @Patch('profile')
  @ApiBearerAuth()
  @ApiOperation({ summary: '更新用户资料' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        username: { type: 'string' },
        phone: { type: 'string' },
        avatar: { type: 'string' },
      },
    },
  })
  async updateProfile(
    @CurrentUser('id') userId: string,
    @Body() data: { username?: string; phone?: string; avatar?: string },
  ) {
    return this.authService.updateProfile(userId, data);
  }

  @Post('change-password')
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '修改密码' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        oldPassword: { type: 'string' },
        newPassword: { type: 'string' },
      },
      required: ['oldPassword', 'newPassword'],
    },
  })
  async changePassword(
    @CurrentUser('id') userId: string,
    @Body('oldPassword') oldPassword: string,
    @Body('newPassword') newPassword: string,
  ) {
    return this.authService.changePassword(userId, oldPassword, newPassword);
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 10, ttl: 60000 } }) // 10 refresh per minute
  @ApiOperation({ summary: '刷新访问令牌' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        refreshToken: { type: 'string' },
      },
      required: ['refreshToken'],
    },
  })
  async refreshToken(@Body('refreshToken') refreshToken: string) {
    return this.authService.refreshToken(refreshToken);
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '用户登出' })
  async logout(
    @CurrentUser('id') userId: string,
    @Headers('authorization') authorization: string,
  ) {
    // 从 authorization header 提取 token
    const token = authorization?.replace('Bearer ', '');
    if (token) {
      return this.authService.logout(userId, token);
    }
    return { success: true, message: '登出成功' };
  }
}
