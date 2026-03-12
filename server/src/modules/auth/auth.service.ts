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
      await this.incrementLoginAttempts(email, attemptsKey, lockKey, MAX_ATTEMPTS, LOCK_TIME);
      return null;
    }

    if (user.status !== 'ACTIVE') {
      throw new UnauthorizedException('账户已被禁用或封禁');
    }

    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      await this.incrementLoginAttempts(email, attemptsKey, lockKey, MAX_ATTEMPTS, LOCK_TIME);
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

    const { passwordHash: _passwordHash, twoFactorSecret: _twoFactorSecret, recoveryCodes: _recoveryCodes, ...result } = user;
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
      this.logger.warn(
        `账号 ${email} 登录失败 ${attempts}/${maxAttempts} 次`,
      );
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
      throw new UnauthorizedException('临时令牌无效或已过期');
    }

    if (!payload.twoFactorPending) {
      throw new BadRequestException('无效的临时令牌');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
    });

    if (!user || !user.twoFactorEnabled || !user.twoFactorSecret) {
      throw new BadRequestException('用户未启用双因素认证');
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
      throw new UnauthorizedException('验证码错误');
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
      throw new UnauthorizedException('Telegram 授权数据已过期');
    }

    // 验证 hash
    const botToken = this.configService.get('TELEGRAM_BOT_TOKEN');
    if (!botToken) {
      throw new BadRequestException('Telegram Bot Token 未配置');
    }

    const expectedHash = this.generateTelegramHash(userData, botToken);
    if (hash !== expectedHash) {
      throw new UnauthorizedException('Telegram 授权验证失败');
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
      throw new UnauthorizedException('账户已被禁用或封禁');
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
      throw new BadRequestException('用户不存在');
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
      throw new BadRequestException('请先启用双因素认证');
    }

    const isValid = this.totpService.verifyToken(code, user.twoFactorSecret);
    if (!isValid) {
      throw new UnauthorizedException('验证码错误');
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

    return { success: true, message: '双因素认证已启用' };
  }

  async disableTwoFactor(userId: string, code: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user || !user.twoFactorEnabled) {
      throw new BadRequestException('双因素认证未启用');
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
      throw new UnauthorizedException('验证码错误');
    }

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        twoFactorEnabled: false,
        twoFactorSecret: null,
        recoveryCodes: null,
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

    return { success: true, message: '双因素认证已禁用' };
  }

  // ==================== 恢复码验证 ====================

  async verifyRecoveryCode(tempToken: string, recoveryCode: string) {
    let payload: any;
    try {
      payload = this.jwtService.verify(tempToken);
    } catch {
      throw new UnauthorizedException('临时令牌无效或已过期');
    }

    if (!payload.twoFactorPending) {
      throw new BadRequestException('无效的临时令牌');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
    });

    if (!user || !user.twoFactorEnabled || !user.recoveryCodes) {
      throw new BadRequestException('用户未启用双因素认证或没有恢复码');
    }

    // 验证恢复码
    const result = this.totpService.verifyRecoveryCode(
      recoveryCode,
      user.recoveryCodes as string[],
    );

    if (!result.valid) {
      throw new UnauthorizedException('恢复码无效或已使用');
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
      throw new BadRequestException('邮箱已被注册');
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

    return {
      success: true,
      message: '注册成功，请查收验证邮件',
      requiresVerification: true,
      email: user.email,
      // 开发环境返回验证码方便测试
      ...(process.env.NODE_ENV !== 'production' && { verificationCode }),
    };
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
      // 需要提供 email 来查找验证码
      throw new BadRequestException('使用验证码验证时需要提供邮箱地址');
    }

    if (!verificationData) {
      throw new BadRequestException('验证链接无效或已过期');
    }

    // 更新用户邮箱验证状态
    const user = await this.prisma.user.update({
      where: { id: verificationData.userId },
      data: { emailVerified: true },
    });

    this.logger.log(`用户邮箱验证成功: ${user.id}`);

    const { passwordHash: _, ...userWithoutPassword } = user;
    return {
      success: true,
      message: '邮箱验证成功',
      ...this.generateTokens(userWithoutPassword),
    };
  }

  async verifyEmailWithCode(email: string, code: string) {
    const storedData = await this.redisService.get(
      `email:verification:code:${email}`,
    );

    if (!storedData) {
      throw new BadRequestException('验证码无效或已过期');
    }

    const verificationData = JSON.parse(storedData);

    if (verificationData.code !== code) {
      throw new BadRequestException('验证码错误');
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
    return {
      success: true,
      message: '邮箱验证成功',
      ...this.generateTokens(userWithoutPassword),
    };
  }

  async resendVerification(email: string) {
    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      throw new BadRequestException('用户不存在');
    }

    if (user.emailVerified) {
      throw new BadRequestException('邮箱已验证，无需重复验证');
    }

    // 检查是否在冷却期内 (60秒)
    const cooldownKey = `email:verification:cooldown:${email}`;
    const cooldown = await this.redisService.get(cooldownKey);
    if (cooldown) {
      const remaining = parseInt(cooldown, 10);
      throw new BadRequestException(`请等待 ${remaining} 秒后再次发送`);
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

    return {
      success: true,
      message: '验证邮件已发送，请查收',
      // 开发环境返回验证码
      ...(process.env.NODE_ENV !== 'production' && { verificationCode }),
    };
  }

  // ==================== 登出与 Token 管理 ====================

  async logout(userId: string, token: string) {
    // 获取用户信息用于审计日志
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    // 将 token 加入黑名单
    const decoded = this.jwtService.decode(token) as any;
    if (decoded && decoded.exp) {
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

    return { success: true, message: '登出成功' };
  }

  async refreshToken(refreshToken: string) {
    // 验证 refresh token 是否在黑名单中
    const isBlacklisted = await this.redisService.get(
      `token:blacklist:${refreshToken}`,
    );
    if (isBlacklisted) {
      throw new UnauthorizedException('Refresh token 已失效');
    }

    let payload: any;
    try {
      payload = this.jwtService.verify(refreshToken);
    } catch {
      throw new UnauthorizedException('Refresh token 无效或已过期');
    }

    if (payload.type !== 'refresh') {
      throw new BadRequestException('无效的 refresh token');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
    });

    if (!user || user.status !== 'ACTIVE') {
      throw new UnauthorizedException('用户不存在或已被禁用');
    }

    // 将旧的 refresh token 加入黑名单
    const decoded = this.jwtService.decode(refreshToken) as any;
    if (decoded && decoded.exp) {
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
      throw new BadRequestException('用户不存在');
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
      throw new BadRequestException('用户不存在');
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

    if (!user || !user.passwordHash) {
      throw new BadRequestException('用户不存在或未设置密码');
    }

    // 验证旧密码
    const isPasswordValid = await bcrypt.compare(oldPassword, user.passwordHash);
    if (!isPasswordValid) {
      throw new UnauthorizedException('当前密码错误');
    }

    // 验证新密码强度
    if (newPassword.length < 8) {
      throw new BadRequestException('新密码至少需要8个字符');
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

    return { success: true, message: '密码修改成功' };
  }
}
