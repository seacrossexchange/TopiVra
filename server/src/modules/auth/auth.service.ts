import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  Logger,
  Inject,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import { PrismaService } from '../../prisma/prisma.service';
import { Prisma } from '@prisma/client';
import { TotpService } from '../../common/totp/totp.service';
import { RedisService } from '../../common/redis/redis.service';
import { MailService } from '../../common/mail/mail.service';
import {
  AuditService,
  AuditAction,
  AuditModule,
  OperatorRole,
} from '../../common/audit/audit.service';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private readonly jwtExpiresIn: string;
  private readonly refreshExpiresIn: string;

  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private configService: ConfigService,
    private totpService: TotpService,
    @Inject(RedisService) private redisService: RedisService,
    private mailService: MailService,
    private auditService: AuditService,
  ) {
    this.jwtExpiresIn = this.configService.get('JWT_EXPIRES_IN') || '2h';
    this.refreshExpiresIn =
      this.configService.get('JWT_REFRESH_EXPIRES_IN') || '7d';
  }

  // ==================== 本地认证 ====================

  async validateUser(email: string, password: string): Promise<any> {
    const MAX_ATTEMPTS = 5;
    const LOCK_TIME = 15 * 60; // 15分钟

    // 检查是否被锁定
    const lockKey = `login:lock:${email}`;
    const attemptsKey = `login:attempts:${email}`;

    const isLocked = await this.redisService.get(lockKey);
    if (isLocked) {
      const ttl = await this.redisService.getClient()?.ttl(lockKey);
      const remainingMinutes = ttl ? Math.ceil(ttl / 60) : 15;
      throw new UnauthorizedException(
        `登录失败次数过多，账号已锁定 ${remainingMinutes} 分钟`,
      );
    }

    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    if (!user || !user.passwordHash) {
      await this.incrementLoginAttempts(
        email,
        attemptsKey,
        lockKey,
        MAX_ATTEMPTS,
        LOCK_TIME,
      );
      return null;
    }

    if (user.status !== 'ACTIVE') {
      throw new UnauthorizedException({
        code: 'AUTH_ACCOUNT_SUSPENDED',
        translationKey: 'errors.AUTH_ACCOUNT_SUSPENDED',
        message: 'Account is disabled or suspended',
      });
    }

    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      await this.incrementLoginAttempts(
        email,
        attemptsKey,
        lockKey,
        MAX_ATTEMPTS,
        LOCK_TIME,
      );
      return null;
    }

    // 登录成功，清除失败记录
    await this.redisService.del(attemptsKey);

    // 更新最后登录信息
    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        lastLoginAt: new Date(),
        loginAttempts: 0,
      },
    });

    const {
      passwordHash: _passwordHash,
      twoFactorSecret: _twoFactorSecret,
      recoveryCodes: _recoveryCodes,
      ...result
    } = user;
    return result;
  }

  /**
   * 增加登录失败次数
   */
  private async incrementLoginAttempts(
    email: string,
    attemptsKey: string,
    lockKey: string,
    maxAttempts: number,
    lockTime: number,
  ): Promise<void> {
    const attempts = await this.redisService.incr(attemptsKey);

    if (attempts === 1) {
      // 第一次失败，设置过期时间为15分钟
      await this.redisService.expire(attemptsKey, lockTime);
    }

    if (attempts >= maxAttempts) {
      // 达到最大失败次数，锁定账号
      await this.redisService.set(lockKey, '1', lockTime);
      await this.redisService.del(attemptsKey);
      this.logger.warn(`账号 ${email} 因登录失败次数过多被锁定`);
    } else {
      this.logger.warn(`账号 ${email} 登录失败 ${attempts}/${maxAttempts} 次`);
    }
  }

  async login(user: any, ipAddress?: string, userAgent?: string) {
    // 检查是否启用了 2FA
    if (user.twoFactorEnabled === true) {
      return {
        requiresTwoFactor: true,
        tempToken: this.jwtService.sign(
          { sub: user.id, email: user.email, twoFactorPending: true },
          { expiresIn: '5m' },
        ),
      };
    }

    // 记录登录审计日志
    await this.auditService.log({
      operatorId: user.id,
      operatorRole: user.isSeller ? OperatorRole.SELLER : OperatorRole.USER,
      module: AuditModule.AUTH,
      action: AuditAction.USER_LOGIN,
      targetType: 'user',
      targetId: user.id,
      description: `用户登录: ${user.email}`,
      ipAddress,
      userAgent,
    });

    return this.generateTokens(user);
  }

  async verifyTwoFactor(tempToken: string, code: string) {
    let payload: any;
    try {
      payload = this.jwtService.verify(tempToken);
    } catch {
      throw new UnauthorizedException({
        code: 'AUTH_TOKEN_INVALID',
        translationKey: 'errors.INVALID_TOKEN',
        message: 'Temporary token is invalid or expired',
      });
    }

    if (!payload.twoFactorPending) {
      throw new BadRequestException({
        code: 'AUTH_TOKEN_INVALID',
        translationKey: 'errors.INVALID_TOKEN',
        message: 'Temporary token is invalid',
      });
    }

    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
    });

    if (!user || !user.twoFactorEnabled || !user.twoFactorSecret) {
      throw new BadRequestException({
        code: 'AUTH_2FA_REQUIRED',
        translationKey: 'errors.AUTH_2FA_REQUIRED',
        message: 'Two-factor authentication is not enabled for this user',
      });
    }

    // 验证 TOTP 或恢复码
    const isValidTotp = this.totpService.verifyToken(
      code,
      user.twoFactorSecret,
    );
    let isValidRecovery = false;

    if (!isValidTotp && user.recoveryCodes) {
      const recoveryCodes = user.recoveryCodes as string[];
      const result = this.totpService.verifyRecoveryCode(code, recoveryCodes);
      if (result.valid) {
        isValidRecovery = true;
        await this.prisma.user.update({
          where: { id: user.id },
          data: { recoveryCodes: result.remainingCodes },
        });
      }
    }

    if (!isValidTotp && !isValidRecovery) {
      throw new UnauthorizedException({
        code: 'AUTH_2FA_INVALID',
        translationKey: 'errors.AUTH_2FA_INVALID',
        message: 'Invalid verification code',
      });
    }

    const { passwordHash: _passwordHash2, ...userWithoutPassword } = user;
    return this.generateTokens(userWithoutPassword);
  }

  async generateTokens(user: any) {
    // 获取用户角色
    const userRoles = await this.prisma.userRole.findMany({
      where: { userId: user.id },
      select: { role: true },
    });

    const roles = userRoles.map((ur) => ur.role);

    const payload = {
      sub: user.id,
      email: user.email,
      username: user.username,
      isSeller: user.isSeller,
      roles,
    };

    const accessToken = this.jwtService.sign(payload, {
      expiresIn: '2h',
    });

    const refreshToken = this.jwtService.sign(
      { sub: user.id, type: 'refresh' },
      { expiresIn: '7d' },
    );

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        avatar: user.avatar,
        isSeller: user.isSeller,
        roles,
        twoFactorEnabled: user.twoFactorEnabled || false,
      },
    };
  }

  // ==================== Telegram OAuth ====================

  async verifyTelegramAuth(authData: any) {
    const { hash, ...userData } = authData;

    // 验证 auth_date 不超过 24 小时
    const authDate = parseInt(userData.auth_date, 10);
    const now = Math.floor(Date.now() / 1000);
    if (now - authDate > 86400) {
      throw new UnauthorizedException({
        code: 'AUTH_TOKEN_EXPIRED',
        translationKey: 'errors.TOKEN_EXPIRED',
        message: 'Telegram authorization data has expired',
      });
    }

    // 验证 hash
    const botToken = this.configService.get('TELEGRAM_BOT_TOKEN');
    if (!botToken) {
      throw new BadRequestException({
        code: 'EXTERNAL_SERVICE_ERROR',
        translationKey: 'errors.EXTERNAL_SERVICE_ERROR',
        message: 'Telegram bot token is not configured',
      });
    }

    const expectedHash = this.generateTelegramHash(userData, botToken);
    if (hash !== expectedHash) {
      throw new UnauthorizedException({
        code: 'AUTH_UNAUTHORIZED',
        translationKey: 'errors.UNAUTHORIZED',
        message: 'Telegram authorization verification failed',
      });
    }

    // 查找或创建用户
    const telegramId = userData.id.toString();
    let user = await this.prisma.user.findUnique({
      where: { telegramId },
    });

    if (!user) {
      // 创建新用户
      user = await this.prisma.user.create({
        data: {
          telegramId,
          telegramUsername: userData.username,
          email: `tg_${telegramId}@topter.placeholder`,
          username: userData.first_name || `Telegram_${telegramId}`,
          avatar: userData.photo_url,
          emailVerified: true,
          roles: {
            create: {
              role: 'USER',
            },
          },
        },
        include: {
          roles: true,
        },
      });
      this.logger.log(`通过 Telegram 创建新用户: ${user.id}`);
    } else {
      // 更新用户信息
      user = await this.prisma.user.update({
        where: { id: user.id },
        data: {
          telegramUsername: userData.username,
          avatar: userData.photo_url || user.avatar,
          lastLoginAt: new Date(),
        },
      });
    }

    if (user.status !== 'ACTIVE') {
      throw new UnauthorizedException({
        code: 'AUTH_ACCOUNT_SUSPENDED',
        translationKey: 'errors.AUTH_ACCOUNT_SUSPENDED',
        message: 'Account is disabled or suspended',
      });
    }

    const { passwordHash: _passwordHash3, ...userWithoutPassword } = user;
    return this.generateTokens(userWithoutPassword);
  }

  private generateTelegramHash(userData: any, botToken: string): string {
    // 排除 hash 字段后，按字母顺序排序
    const dataCheckArr = Object.keys(userData)
      .filter((key) => key !== 'hash')
      .sort()
      .map((key) => `${key}=${userData[key]}`);

    const dataCheckString = dataCheckArr.join('\n');

    // 使用 SHA256 哈希 bot token 作为 secret key
    const secretKey = crypto.createHash('sha256').update(botToken).digest();

    // 计算 HMAC-SHA256
    const hash = crypto
      .createHmac('sha256', secretKey)
      .update(dataCheckString)
      .digest('hex');

    return hash;
  }

  // ==================== 2FA 管理 ====================

  async enableTwoFactor(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new BadRequestException({
        code: 'USER_NOT_FOUND',
        translationKey: 'errors.USER_NOT_FOUND',
        message: 'User not found',
      });
    }

    const { secret, otpauthUrl } = this.totpService.generateSecret(user.email);
    const recoveryCodes = this.totpService.generateRecoveryCodes();

    // 临时存储（需要用户验证后才真正启用）
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        twoFactorSecret: secret,
        recoveryCodes,
      },
    });

    return {
      secret,
      otpauthUrl,
      recoveryCodes,
    };
  }

  async confirmTwoFactor(userId: string, code: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user || !user.twoFactorSecret) {
      throw new BadRequestException({
        code: 'AUTH_2FA_REQUIRED',
        translationKey: 'errors.AUTH_2FA_REQUIRED',
        message: 'Please enable two-factor authentication first',
      });
    }

    const isValid = this.totpService.verifyToken(code, user.twoFactorSecret);
    if (!isValid) {
      throw new UnauthorizedException({
        code: 'AUTH_2FA_INVALID',
        translationKey: 'errors.AUTH_2FA_INVALID',
        message: 'Invalid verification code',
      });
    }

    await this.prisma.user.update({
      where: { id: userId },
      data: { twoFactorEnabled: true },
    });

    // 记录 2FA 启用审计日志
    await this.auditService.log({
      operatorId: userId,
      operatorRole: user.isSeller ? OperatorRole.SELLER : OperatorRole.USER,
      module: AuditModule.AUTH,
      action: AuditAction.USER_2FA_ENABLE,
      targetType: 'user',
      targetId: userId,
      description: '用户启用双因素认证',
    });

    return {
      success: true,
      message: 'Two-factor authentication enabled',
      translationKey: 'auth.twoFactorEnabled',
    };
  }

  async disableTwoFactor(userId: string, code: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user || !user.twoFactorEnabled) {
      throw new BadRequestException({
        code: 'AUTH_2FA_REQUIRED',
        translationKey: 'errors.AUTH_2FA_REQUIRED',
        message: 'Two-factor authentication is not enabled',
      });
    }

    const isValidTotp = this.totpService.verifyToken(
      code,
      user.twoFactorSecret || '',
    );
    let isValidRecovery = false;

    if (!isValidTotp && user.recoveryCodes) {
      const result = this.totpService.verifyRecoveryCode(
        code,
        user.recoveryCodes as string[],
      );
      isValidRecovery = result.valid;
    }

    if (!isValidTotp && !isValidRecovery) {
      throw new UnauthorizedException({
        code: 'AUTH_2FA_INVALID',
        translationKey: 'errors.AUTH_2FA_INVALID',
        message: 'Invalid verification code',
      });
    }

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        twoFactorEnabled: false,
        twoFactorSecret: null,
        recoveryCodes: Prisma.JsonNull,
      },
    });

    // 记录 2FA 禁用审计日志
    await this.auditService.log({
      operatorId: userId,
      operatorRole: user.isSeller ? OperatorRole.SELLER : OperatorRole.USER,
      module: AuditModule.AUTH,
      action: AuditAction.USER_2FA_DISABLE,
      targetType: 'user',
      targetId: userId,
      description: '用户禁用双因素认证',
    });

    return {
      success: true,
      message: 'Two-factor authentication disabled',
      translationKey: 'auth.twoFactorDisabled',
    };
  }

  // ==================== 恢复码验证 ====================

  async verifyRecoveryCode(tempToken: string, recoveryCode: string) {
    let payload: any;
    try {
      payload = this.jwtService.verify(tempToken);
    } catch {
      throw new UnauthorizedException({
        code: 'AUTH_TOKEN_INVALID',
        translationKey: 'errors.INVALID_TOKEN',
        message: 'Temporary token is invalid or expired',
      });
    }

    if (!payload.twoFactorPending) {
      throw new BadRequestException({
        code: 'AUTH_TOKEN_INVALID',
        translationKey: 'errors.INVALID_TOKEN',
        message: 'Temporary token is invalid',
      });
    }

    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
    });

    if (!user || !user.twoFactorEnabled || !user.recoveryCodes) {
      throw new BadRequestException({
        code: 'AUTH_2FA_REQUIRED',
        translationKey: 'errors.AUTH_2FA_REQUIRED',
        message: 'Two-factor authentication or recovery codes are not available',
      });
    }

    // 验证恢复码
    const result = this.totpService.verifyRecoveryCode(
      recoveryCode,
      user.recoveryCodes as string[],
    );

    if (!result.valid) {
      throw new UnauthorizedException({
        code: 'AUTH_2FA_INVALID',
        translationKey: 'errors.AUTH_2FA_INVALID',
        message: 'Recovery code is invalid or already used',
      });
    }

    // 更新剩余恢复码
    await this.prisma.user.update({
      where: { id: user.id },
      data: { recoveryCodes: result.remainingCodes },
    });

    const { passwordHash: _, ...userWithoutPassword } = user;
    return this.generateTokens(userWithoutPassword);
  }

  // ==================== 注册 ====================

  async register(email: string, password: string, username: string) {
    const existingUser = await this.prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      throw new BadRequestException({
        code: 'USER_EMAIL_EXISTS',
        translationKey: 'errors.EMAIL_ALREADY_EXISTS',
        message: 'Email already exists',
      });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    // 生成邮箱验证令牌
    const verificationToken = uuidv4();
    const verificationCode = Math.floor(
      100000 + Math.random() * 900000,
    ).toString(); // 6位数字验证码

    // 创建用户并添加默认 USER 角色
    const user = await this.prisma.user.create({
      data: {
        email,
        passwordHash,
        username,
        emailVerified: false,
        roles: {
          create: {
            role: 'USER',
          },
        },
      },
      include: {
        roles: true,
      },
    });

    // 存储验证令牌到 Redis (24小时有效)
    await this.redisService.set(
      `email:verification:${verificationToken}`,
      JSON.stringify({ userId: user.id, email, code: verificationCode }),
      86400, // 24 hours
    );

    // 同时存储验证码 (5分钟有效)
    await this.redisService.set(
      `email:verification:code:${email}`,
      JSON.stringify({ userId: user.id, code: verificationCode }),
      300, // 5 minutes
    );

    // 发送验证邮件
    const emailSent = await this.mailService.sendVerificationCode(
      email,
      verificationCode,
    );

    this.logger.log(`用户注册成功: ${user.id}, 邮件发送: ${emailSent}`);

    // 记录注册审计日志
    await this.auditService.log({
      operatorId: user.id,
      operatorRole: OperatorRole.USER,
      module: AuditModule.AUTH,
      action: AuditAction.USER_REGISTER,
      targetType: 'user',
      targetId: user.id,
      description: `新用户注册: ${email}`,
    });

    const response = {
      success: true,
      message: 'Registration successful, please check your verification email',
      translationKey: 'auth.registrationSuccess',
      requiresVerification: true,
      email: user.email,
    } as Record<string, unknown>;

    if (process.env.NODE_ENV !== 'production') {
      response.verificationCode = verificationCode;
    }

    return response;
  }

  // ==================== 邮箱验证 ====================

  async verifyEmail(token?: string, code?: string) {
    let verificationData: {
      userId: string;
      email: string;
      code: string;
    } | null = null;

    // 优先使用 token 验证
    if (token) {
      const storedData = await this.redisService.get(
        `email:verification:${token}`,
      );
      if (storedData) {
        verificationData = JSON.parse(storedData);
        // 验证成功后删除 token
        await this.redisService.del(`email:verification:${token}`);
      }
    }
    // 使用验证码验证
    else if (code) {
      throw new BadRequestException({
        code: 'INVALID_INPUT',
        translationKey: 'errors.VALIDATION_ERROR',
        message: 'Email is required when verifying with a code',
      });
    }

    if (!verificationData) {
      throw new BadRequestException({
        code: 'AUTH_TOKEN_INVALID',
        translationKey: 'errors.INVALID_TOKEN',
        message: 'Verification link is invalid or expired',
      });
    }

    // 更新用户邮箱验证状态
    const user = await this.prisma.user.update({
      where: { id: verificationData.userId },
      data: { emailVerified: true },
    });

    this.logger.log(`用户邮箱验证成功: ${user.id}`);

    const { passwordHash: _, ...userWithoutPassword } = user;
    const tokens = await this.generateTokens(userWithoutPassword);
    return {
      success: true,
      message: 'Email verified successfully',
      translationKey: 'auth.emailVerified',
      ...tokens,
    };
  }

  async verifyEmailWithCode(email: string, code: string) {
    const storedData = await this.redisService.get(
      `email:verification:code:${email}`,
    );

    if (!storedData) {
      throw new BadRequestException({
        code: 'AUTH_TOKEN_INVALID',
        translationKey: 'errors.INVALID_TOKEN',
        message: 'Verification code is invalid or expired',
      });
    }

    const verificationData = JSON.parse(storedData);

    if (verificationData.code !== code) {
      throw new BadRequestException({
        code: 'AUTH_2FA_INVALID',
        translationKey: 'errors.AUTH_2FA_INVALID',
        message: 'Verification code is invalid',
      });
    }

    // 验证成功后删除验证码
    await this.redisService.del(`email:verification:code:${email}`);

    // 更新用户邮箱验证状态
    const user = await this.prisma.user.update({
      where: { id: verificationData.userId },
      data: { emailVerified: true },
    });

    this.logger.log(`用户邮箱验证成功: ${user.id}`);

    const { passwordHash: _, ...userWithoutPassword } = user;
    const tokens = await this.generateTokens(userWithoutPassword);
    return {
      success: true,
      message: 'Email verified successfully',
      translationKey: 'auth.emailVerified',
      ...tokens,
    };
  }

  async resendVerification(email: string) {
    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      throw new BadRequestException({
        code: 'USER_NOT_FOUND',
        translationKey: 'errors.USER_NOT_FOUND',
        message: 'User not found',
      });
    }

    if (user.emailVerified) {
      throw new BadRequestException({
        code: 'AUTH_EMAIL_NOT_VERIFIED',
        translationKey: 'errors.AUTH_EMAIL_NOT_VERIFIED',
        message: 'Email is already verified',
      });
    }

    // 检查是否在冷却期内 (60秒)
    const cooldownKey = `email:verification:cooldown:${email}`;
    const cooldown = await this.redisService.get(cooldownKey);
    if (cooldown) {
      const remaining = Number.parseInt(cooldown, 10);
      throw new BadRequestException({
        code: 'RATE_LIMIT_EXCEEDED',
        translationKey: 'errors.RATE_LIMIT_EXCEEDED',
        message: 'Please wait before requesting another verification email',
        details: { remainingSeconds: remaining },
      });
    }

    // 生成新的验证码
    const verificationCode = Math.floor(
      100000 + Math.random() * 900000,
    ).toString();
    const verificationToken = uuidv4();

    // 更新 Redis
    await this.redisService.set(
      `email:verification:code:${email}`,
      JSON.stringify({ userId: user.id, code: verificationCode }),
      300, // 5 minutes
    );

    await this.redisService.set(
      `email:verification:${verificationToken}`,
      JSON.stringify({ userId: user.id, email, code: verificationCode }),
      86400, // 24 hours
    );

    // 设置冷却期
    await this.redisService.set(cooldownKey, '60', 60);

    // 发送验证邮件
    const emailSent = await this.mailService.sendVerificationCode(
      email,
      verificationCode,
    );

    this.logger.log(`重发验证邮件: ${email}, 发送状态: ${emailSent}`);

    const response: Record<string, unknown> = {
      success: true,
      message: 'Verification email sent successfully',
      translationKey: 'auth.verificationEmailSent',
    };

    if (process.env.NODE_ENV !== 'production') {
      response.verificationCode = verificationCode;
    }

    return response;
  }

  // ==================== 登出与 Token 管理 ====================

  async logout(userId: string, token: string) {
    // 获取用户信息用于审计日志
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    // 将 token 加入黑名单
    const decoded = this.jwtService.decode(token);
    if (decoded?.exp) {
      const ttl = decoded.exp - Math.floor(Date.now() / 1000);
      if (ttl > 0) {
        await this.redisService.set(
          `token:blacklist:${token}`,
          JSON.stringify({ userId, logoutAt: new Date().toISOString() }),
          ttl,
        );
        this.logger.log(`用户 ${userId} 已登出，token 已加入黑名单`);
      }
    }

    // 记录登出审计日志
    if (user) {
      await this.auditService.log({
        operatorId: userId,
        operatorRole: user.isSeller ? OperatorRole.SELLER : OperatorRole.USER,
        module: AuditModule.AUTH,
        action: AuditAction.USER_LOGOUT,
        targetType: 'user',
        targetId: userId,
        description: `用户登出: ${user.email}`,
      });
    }

    return {
      success: true,
      message: 'Logged out successfully',
      translationKey: 'auth.logoutSuccess',
    };
  }

  async refreshToken(refreshToken: string) {
    // 验证 refresh token 是否在黑名单中
    const isBlacklisted = await this.redisService.get(
      `token:blacklist:${refreshToken}`,
    );
    if (isBlacklisted) {
      throw new UnauthorizedException({
        code: 'AUTH_REFRESH_TOKEN_INVALID',
        translationKey: 'errors.INVALID_TOKEN',
        message: 'Refresh token is invalid',
      });
    }

    let payload: any;
    try {
      payload = this.jwtService.verify(refreshToken);
    } catch {
      throw new UnauthorizedException({
        code: 'AUTH_REFRESH_TOKEN_INVALID',
        translationKey: 'errors.INVALID_TOKEN',
        message: 'Refresh token is invalid or expired',
      });
    }

    if (payload.type !== 'refresh') {
      throw new BadRequestException({
        code: 'AUTH_REFRESH_TOKEN_INVALID',
        translationKey: 'errors.INVALID_TOKEN',
        message: 'Invalid refresh token',
      });
    }

    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
    });

    if (!user || user.status !== 'ACTIVE') {
      throw new UnauthorizedException({
        code: 'AUTH_ACCOUNT_SUSPENDED',
        translationKey: 'errors.AUTH_ACCOUNT_SUSPENDED',
        message: 'User does not exist or is disabled',
      });
    }

    // 将旧的 refresh token 加入黑名单
    const decoded = this.jwtService.decode(refreshToken);
    if (decoded?.exp) {
      const ttl = decoded.exp - Math.floor(Date.now() / 1000);
      if (ttl > 0) {
        await this.redisService.set(
          `token:blacklist:${refreshToken}`,
          JSON.stringify({
            userId: user.id,
            replacedAt: new Date().toISOString(),
          }),
          ttl,
        );
      }
    }

    const { passwordHash: _, ...userWithoutPassword } = user;
    return this.generateTokens(userWithoutPassword);
  }

  // 检查 token 是否在黑名单中
  async isTokenBlacklisted(token: string): Promise<boolean> {
    const blacklisted = await this.redisService.get(`token:blacklist:${token}`);
    return !!blacklisted;
  }

  // ==================== 用户信息 ====================

  async getUserProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        roles: {
          select: { role: true },
        },
      },
    });

    if (!user) {
      throw new BadRequestException({
        code: 'USER_NOT_FOUND',
        translationKey: 'errors.USER_NOT_FOUND',
        message: 'User not found',
      });
    }

    // 获取卖家信息（如果是卖家）
    let sellerProfile = null;
    if (user.isSeller) {
      sellerProfile = await this.prisma.sellerProfile.findUnique({
        where: { userId },
        select: {
          id: true,
          shopName: true,
          shopDescription: true,
          shopAvatar: true,
          rating: true,
          totalSales: true,
          applicationStatus: true,
        },
      });
    }

    const { passwordHash: _, ...userWithoutPassword } = user;

    return {
      ...userWithoutPassword,
      roles: user.roles.map((r) => r.role),
      sellerProfile,
    };
  }

  async updateProfile(
    userId: string,
    data: { username?: string; phone?: string; avatar?: string },
  ) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new BadRequestException({
        code: 'USER_NOT_FOUND',
        translationKey: 'errors.USER_NOT_FOUND',
        message: 'User not found',
      });
    }

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: {
        ...(data.username && { username: data.username }),
        ...(data.phone && { phone: data.phone }),
        ...(data.avatar && { avatar: data.avatar }),
      },
      include: {
        roles: {
          select: { role: true },
        },
      },
    });

    // 记录审计日志
    await this.auditService.log({
      operatorId: userId,
      operatorRole: user.isSeller ? OperatorRole.SELLER : OperatorRole.USER,
      module: AuditModule.USER,
      action: AuditAction.USER_PROFILE_UPDATE,
      targetType: 'user',
      targetId: userId,
      description: '用户更新个人资料',
      afterData: data,
    });

    const { passwordHash: _, ...userWithoutPassword } = updated;

    return {
      ...userWithoutPassword,
      roles: updated.roles.map((r) => r.role),
    };
  }

  async changePassword(
    userId: string,
    oldPassword: string,
    newPassword: string,
  ) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user?.passwordHash) {
      throw new BadRequestException({
        code: 'USER_NOT_FOUND',
        translationKey: 'errors.USER_NOT_FOUND',
        message: 'User does not exist or has no password set',
      });
    }

    // 验证旧密码
    const isPasswordValid = await bcrypt.compare(
      oldPassword,
      user.passwordHash,
    );
    if (!isPasswordValid) {
      throw new UnauthorizedException({
        code: 'AUTH_INVALID_CREDENTIALS',
        translationKey: 'errors.INVALID_CREDENTIALS',
        message: 'Current password is incorrect',
      });
    }

    // 验证新密码强度
    if (newPassword.length < 8) {
      throw new BadRequestException({
        code: 'USER_INVALID_PASSWORD',
        translationKey: 'errors.WEAK_PASSWORD',
        message: 'New password must be at least 8 characters long',
      });
    }

    // 加密新密码
    const newPasswordHash = await bcrypt.hash(newPassword, 10);

    // 更新密码
    await this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash: newPasswordHash },
    });

    // 记录审计日志
    await this.auditService.log({
      operatorId: userId,
      operatorRole: user.isSeller ? OperatorRole.SELLER : OperatorRole.USER,
      module: AuditModule.AUTH,
      action: AuditAction.USER_PASSWORD_CHANGE,
      targetType: 'user',
      targetId: userId,
      description: '用户修改密码',
    });

    this.logger.log(`用户 ${userId} 修改密码成功`);

    return {
      success: true,
      message: 'Password changed successfully',
      translationKey: 'auth.passwordChanged',
    };
  }
}
