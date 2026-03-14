import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import {
  TOTP,
  generateSync,
  verifySync,
  NobleCryptoPlugin,
  ScureBase32Plugin,
} from 'otplib';

@Injectable()
export class TotpService {
  private readonly logger = new Logger(TotpService.name);
  private readonly serviceName: string;
  private readonly totp: TOTP;
  private readonly cryptoPlugin: NobleCryptoPlugin;
  private readonly base32Plugin: ScureBase32Plugin;

  constructor(private configService: ConfigService) {
    this.serviceName = this.configService.get('PLATFORM_NAME') || 'Topter C2C';
    this.cryptoPlugin = new NobleCryptoPlugin();
    this.base32Plugin = new ScureBase32Plugin();
    this.totp = new TOTP({
      crypto: this.cryptoPlugin,
      base32: this.base32Plugin,
    });
  }

  // 生成 TOTP 密钥
  generateSecret(email: string): { secret: string; otpauthUrl: string } {
    const secret = this.totp.generateSecret();
    const otpauthUrl = this.totp.toURI({
      secret,
      label: email,
      issuer: this.serviceName,
    });
    return { secret, otpauthUrl };
  }

  // 验证 TOTP 代码
  verifyToken(token: string, secret: string): boolean {
    try {
      const result = verifySync({
        secret,
        token,
        crypto: this.cryptoPlugin,
        base32: this.base32Plugin,
        epochTolerance: 30,
      });
      return result.valid;
    } catch (error) {
      this.logger.error(`TOTP 验证失败: ${(error as Error).message}`);
      return false;
    }
  }

  // 生成恢复代码
  generateRecoveryCodes(count: number = 8): string[] {
    const codes: string[] = [];
    for (let i = 0; i < count; i++) {
      const code = crypto.randomBytes(4).toString('hex').toUpperCase();
      codes.push(`${code.slice(0, 4)}-${code.slice(4)}`);
    }
    return codes;
  }

  // 验证恢复代码
  verifyRecoveryCode(
    code: string,
    codes: string[],
  ): { valid: boolean; remainingCodes: string[] } {
    const index = codes.indexOf(code);
    if (index === -1) {
      return { valid: false, remainingCodes: codes };
    }
    const remainingCodes = [
      ...codes.slice(0, index),
      ...codes.slice(index + 1),
    ];
    return { valid: true, remainingCodes };
  }

  // 生成当前 TOTP 代码（用于测试）
  generateCurrentToken(secret: string): string {
    return generateSync({
      secret,
      crypto: this.cryptoPlugin,
      base32: this.base32Plugin,
    });
  }
}
