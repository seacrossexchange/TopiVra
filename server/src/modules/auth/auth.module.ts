import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { LocalStrategy } from './strategies/local.strategy';
import { JwtStrategy } from './strategies/jwt.strategy';
import { RoleService } from './role.service';
import { RolesGuard } from './guards/roles.guard';
import { PrismaModule } from '../../prisma/prisma.module';
import { TotpModule } from '../../common/totp/totp.module';
import { RedisModule } from '../../common/redis/redis.module';
import { MailModule } from '../../common/mail/mail.module';
import { AuditModule } from '../../common/audit/audit.module';

@Module({
  imports: [
    PrismaModule,
    TotpModule,
    RedisModule,
    MailModule,
    AuditModule,
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => {
        const secret = configService.get<string>('JWT_SECRET');
        if (!secret) {
          throw new Error('JWT_SECRET is not configured');
        }
        return {
          secret,
          signOptions: { expiresIn: '2h' },
        };
      },
      inject: [ConfigService],
    }),
  ],
  providers: [AuthService, RoleService, LocalStrategy, JwtStrategy, RolesGuard],
  controllers: [AuthController],
  exports: [AuthService, RoleService, JwtModule, RolesGuard],
})
export class AuthModule {}
