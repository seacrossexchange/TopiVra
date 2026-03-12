import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { PrismaService } from '../../prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UnauthorizedException, BadRequestException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { TotpService } from '../../common/totp/totp.service';
import { RedisService } from '../../common/redis/redis.service';
import { MailService } from '../../common/mail/mail.service';
import { AuditService } from '../../common/audit/audit.service';

describe('AuthService', () => {
  let service: AuthService;
  let prismaService: any;
  let jwtService: any;
  let redisService: any;
  let mailService: any;
  let auditService: any;

  const mockUser = {
    id: 'user-123',
    email: 'test@example.com',
    username: 'testuser',
    passwordHash: 'hashedPassword',
    isSeller: false,
    status: 'ACTIVE',
    twoFactorEnabled: false,
    roles: [{ role: 'USER' }],
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    const mockPrisma = {
      user: {
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      userRole: {
        findMany: jest.fn(),
      },
    };

    const mockJwt = {
      sign: jest.fn().mockReturnValue('mock-token'),
      verify: jest.fn(),
      decode: jest.fn(),
    };

    const mockConfig = {
      get: jest.fn().mockImplementation((key: string) => {
        if (key === 'JWT_EXPIRES_IN') return '2h';
        if (key === 'JWT_REFRESH_EXPIRES_IN') return '7d';
        return null;
      }),
    };

    const mockRedis = {
      get: jest.fn(),
      set: jest.fn(),
      del: jest.fn(),
      incr: jest.fn().mockResolvedValue(1),
      expire: jest.fn().mockResolvedValue(true),
    };

    const mockMail = {
      sendVerificationCode: jest.fn().mockResolvedValue(true),
    };

    const mockAudit = {
      log: jest.fn(),
    };

    const mockTotp = {
      generateSecret: jest.fn(),
      verifyToken: jest.fn(),
      generateRecoveryCodes: jest.fn(),
      verifyRecoveryCode: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: JwtService, useValue: mockJwt },
        { provide: ConfigService, useValue: mockConfig },
        { provide: RedisService, useValue: mockRedis },
        { provide: MailService, useValue: mockMail },
        { provide: AuditService, useValue: mockAudit },
        { provide: TotpService, useValue: mockTotp },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    prismaService = mockPrisma;
    jwtService = mockJwt;
    redisService = mockRedis;
    mailService = mockMail;
    auditService = mockAudit;
  });

  describe('validateUser', () => {
    it('应该返回有效用户（不含密码）', async () => {
      prismaService.user.findUnique.mockResolvedValue(mockUser);
      jest.spyOn(bcrypt, 'compare').mockResolvedValue(true as never);

      const result = await service.validateUser('test@example.com', 'Password123!');

      expect(result).toBeDefined();
      expect(result?.passwordHash).toBeUndefined();
    });

    it('应该拒绝不存在的用户', async () => {
      prismaService.user.findUnique.mockResolvedValue(null);

      const result = await service.validateUser('nonexistent@example.com', 'Password123!');

      expect(result).toBeNull();
    });

    it('应该拒绝错误的密码', async () => {
      prismaService.user.findUnique.mockResolvedValue(mockUser);
      jest.spyOn(bcrypt, 'compare').mockResolvedValue(false as never);

      const result = await service.validateUser('test@example.com', 'WrongPassword!');

      expect(result).toBeNull();
    });

    it('应该拒绝被禁用的账户', async () => {
      const bannedUser = { ...mockUser, status: 'BANNED' };
      prismaService.user.findUnique.mockResolvedValue(bannedUser);

      await expect(service.validateUser('test@example.com', 'Password123!')).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('register', () => {
    it('应该成功注册新用户', async () => {
      prismaService.user.findUnique.mockResolvedValue(null);
      prismaService.user.create.mockResolvedValue(mockUser);
      redisService.set.mockResolvedValue(true);
      mailService.sendVerificationCode.mockResolvedValue(true);

      const result = await service.register('test@example.com', 'Password123!', 'testuser');

      expect(result.success).toBe(true);
      expect(prismaService.user.create).toHaveBeenCalled();
    });

    it('应该拒绝已存在的邮箱注册', async () => {
      prismaService.user.findUnique.mockResolvedValue(mockUser);

      await expect(service.register('test@example.com', 'Password123!', 'testuser')).rejects.toThrow(BadRequestException);
    });
  });

  describe('login', () => {
    it('应该成功登录并返回tokens', async () => {
      const userWithoutHash = { ...mockUser };
      delete userWithoutHash.passwordHash;
      
      prismaService.userRole.findMany.mockResolvedValue([{ role: 'USER' }]);

      const result = await service.login(userWithoutHash);

      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
      expect(result).toHaveProperty('user');
    });

    it('如果启用2FA应该返回requiresTwoFactor', async () => {
      const userWith2FA = { ...mockUser, twoFactorEnabled: true };

      const result = await service.login(userWith2FA);

      expect(result).toHaveProperty('requiresTwoFactor', true);
      expect(result).toHaveProperty('tempToken');
    });
  });

  describe('generateTokens', () => {
    it('应该生成access和refresh token', async () => {
      prismaService.userRole.findMany.mockResolvedValue([{ role: 'USER' }]);
      jwtService.sign.mockReturnValue('generated-token');

      const result = await service.generateTokens(mockUser);

      expect(result.accessToken).toBeDefined();
      expect(result.refreshToken).toBeDefined();
      expect(result.user.id).toBe('user-123');
    });
  });

  describe('refreshToken', () => {
    it('应该成功刷新access token', async () => {
      const mockPayload = { sub: 'user-123', type: 'refresh' };

      redisService.get.mockResolvedValue(null);
      jwtService.verify.mockReturnValue(mockPayload);
      prismaService.user.findUnique.mockResolvedValue(mockUser);
      prismaService.userRole.findMany.mockResolvedValue([{ role: 'USER' }]);
      jwtService.sign.mockReturnValue('new-token');
      jwtService.decode.mockReturnValue({ exp: Math.floor(Date.now() / 1000) + 3600 });

      const result = await service.refreshToken('valid-refresh-token') as any;

      expect(result).toHaveProperty('accessToken');
    });

    it('应该拒绝黑名单中的refresh token', async () => {
      redisService.get.mockResolvedValue('blacklisted');

      await expect(service.refreshToken('blacklisted-token')).rejects.toThrow(UnauthorizedException);
    });

    it('应该拒绝无效的refresh token', async () => {
      redisService.get.mockResolvedValue(null);
      jwtService.verify.mockImplementation(() => {
        throw new Error('Invalid token');
      });

      await expect(service.refreshToken('invalid-token')).rejects.toThrow(UnauthorizedException);
    });

    it('应该拒绝type不是refresh的token', async () => {
      const mockPayload = { sub: 'user-123', type: 'access' };

      redisService.get.mockResolvedValue(null);
      jwtService.verify.mockReturnValue(mockPayload);

      await expect(service.refreshToken('access-token')).rejects.toThrow(BadRequestException);
    });
  });

  describe('logout', () => {
    it('应该成功登出并将token加入黑名单', async () => {
      prismaService.user.findUnique.mockResolvedValue(mockUser);
      jwtService.decode.mockReturnValue({ exp: Math.floor(Date.now() / 1000) + 3600 });
      redisService.set.mockResolvedValue(true);

      const result = await service.logout('user-123', 'some-token');

      expect(result.success).toBe(true);
    });
  });

  describe('isTokenBlacklisted', () => {
    it('应该返回true对于黑名单中的token', async () => {
      redisService.get.mockResolvedValue('blacklisted');

      const result = await service.isTokenBlacklisted('blacklisted-token');

      expect(result).toBe(true);
    });

    it('应该返回false对于不在黑名单的token', async () => {
      redisService.get.mockResolvedValue(null);

      const result = await service.isTokenBlacklisted('valid-token');

      expect(result).toBe(false);
    });
  });

  describe('getUserProfile', () => {
    it('应该返回用户资料', async () => {
      prismaService.user.findUnique.mockResolvedValue(mockUser);

      const result = await service.getUserProfile('user-123');

      expect(result.id).toBe('user-123');
    });

    it('应该拒绝不存在的用户', async () => {
      prismaService.user.findUnique.mockResolvedValue(null);

      await expect(service.getUserProfile('nonexistent-user')).rejects.toThrow(BadRequestException);
    });

    it('卖家应该返回卖家信息', async () => {
      const sellerUser = { ...mockUser, isSeller: true };
      prismaService.user.findUnique.mockResolvedValue(sellerUser);
      prismaService.sellerProfile = { findUnique: jest.fn().mockResolvedValue({ shopName: 'Test Shop' }) };

      const result = await service.getUserProfile('seller-123');

      expect(result.isSeller).toBe(true);
    });
  });

  describe('verifyEmailWithCode', () => {
    it('应该成功验证邮箱', async () => {
      const verificationData = { userId: 'user-123', code: '123456' };
      redisService.get.mockResolvedValue(JSON.stringify(verificationData));
      prismaService.user.update.mockResolvedValue({ ...mockUser, emailVerified: true });
      prismaService.userRole.findMany.mockResolvedValue([{ role: 'USER' }]);
      jwtService.sign.mockReturnValue('token');

      const result = await service.verifyEmailWithCode('test@example.com', '123456') as any;

      expect(result.success).toBe(true);
    });

    it('应该拒绝无效的验证码', async () => {
      const verificationData = { userId: 'user-123', code: '654321' };
      redisService.get.mockResolvedValue(JSON.stringify(verificationData));

      await expect(service.verifyEmailWithCode('test@example.com', '123456')).rejects.toThrow(BadRequestException);
    });

    it('应该拒绝过期的验证码', async () => {
      redisService.get.mockResolvedValue(null);

      await expect(service.verifyEmailWithCode('test@example.com', '123456')).rejects.toThrow(BadRequestException);
    });
  });

  describe('resendVerification', () => {
    it('应该成功重发验证邮件', async () => {
      const unverifiedUser = { ...mockUser, emailVerified: false };
      prismaService.user.findUnique.mockResolvedValue(unverifiedUser);
      redisService.get.mockResolvedValue(null);
      redisService.set.mockResolvedValue(true);
      mailService.sendVerificationCode.mockResolvedValue(true);

      const result = await service.resendVerification('test@example.com');

      expect(result.success).toBe(true);
    });

    it('应该拒绝已验证的用户', async () => {
      const verifiedUser = { ...mockUser, emailVerified: true };
      prismaService.user.findUnique.mockResolvedValue(verifiedUser);

      await expect(service.resendVerification('test@example.com')).rejects.toThrow(BadRequestException);
    });

    it('应该拒绝不存在的用户', async () => {
      prismaService.user.findUnique.mockResolvedValue(null);

      await expect(service.resendVerification('nonexistent@example.com')).rejects.toThrow(BadRequestException);
    });
  });

  describe('2FA functionality', () => {
    describe('enableTwoFactor', () => {
      it('应该成功生成2FA密钥', async () => {
        prismaService.user.findUnique.mockResolvedValue(mockUser);
        prismaService.user.update.mockResolvedValue(mockUser);
        const mockTotp = (service as any).totpService;
        mockTotp.generateSecret = jest.fn().mockReturnValue({ secret: 'SECRET', otpauthUrl: 'otpauth://...' });
        mockTotp.generateRecoveryCodes = jest.fn().mockReturnValue(['code1', 'code2']);

        const result = await service.enableTwoFactor('user-123');

        expect(result.secret).toBeDefined();
        expect(result.recoveryCodes).toBeDefined();
      });

      it('应该拒绝不存在的用户', async () => {
        prismaService.user.findUnique.mockResolvedValue(null);

        await expect(service.enableTwoFactor('nonexistent-user')).rejects.toThrow(BadRequestException);
      });
    });

    describe('disableTwoFactor', () => {
      it('应该成功禁用2FA', async () => {
        const userWith2FA = { ...mockUser, twoFactorEnabled: true, twoFactorSecret: 'SECRET' };
        prismaService.user.findUnique.mockResolvedValue(userWith2FA);
        prismaService.user.update.mockResolvedValue({ ...mockUser, twoFactorEnabled: false });
        const mockTotp = (service as any).totpService;
        mockTotp.verifyToken = jest.fn().mockReturnValue(true);

        const result = await service.disableTwoFactor('user-123', '123456');

        expect(result.success).toBe(true);
      });

      it('应该拒绝未启用2FA的用户', async () => {
        prismaService.user.findUnique.mockResolvedValue(mockUser);

        await expect(service.disableTwoFactor('user-123', '123456')).rejects.toThrow(BadRequestException);
      });
    });
  });
});