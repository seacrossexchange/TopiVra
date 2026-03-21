import { Injectable } from '@nestjs/common';
import * as crypto from 'crypto';

/**
 * 字段级加密服务
 * 用于加密敏感数据字段（手机号、身份证号、银行卡号等）
 */
@Injectable()
export class FieldEncryptionService {
  private readonly algorithm = 'aes-256-gcm';
  private readonly keyLength = 32; // 256 bits
  private readonly ivLength = 16; // 128 bits
  private readonly authTagLength = 16; // 128 bits

  private readonly encryptionKey: Buffer;

  constructor() {
    const key = process.env.ENCRYPTION_KEY;
    
    if (!key) {
      throw new Error('ENCRYPTION_KEY environment variable is required');
    }

    // 验证密钥长度
    if (key.length < 64) {
      throw new Error('ENCRYPTION_KEY must be at least 64 characters (hex)');
    }

    this.encryptionKey = Buffer.from(key, 'hex');

    if (this.encryptionKey.length !== this.keyLength) {
      throw new Error(`ENCRYPTION_KEY must be exactly ${this.keyLength} bytes`);
    }
  }

  /**
   * 加密文本
   * @param plaintext 明文
   * @returns Base64 编码的加密数据（包含 IV 和 AuthTag）
   */
  encrypt(plaintext: string): string {
    if (!plaintext) {
      return plaintext;
    }

    try {
      // 生成随机 IV
      const iv = crypto.randomBytes(this.ivLength);

      // 创建加密器
      const cipher = crypto.createCipheriv(
        this.algorithm,
        this.encryptionKey,
        iv,
      );

      // 加密数据
      const encrypted = Buffer.concat([
        cipher.update(plaintext, 'utf8'),
        cipher.final(),
      ]);

      // 获取认证标签
      const authTag = cipher.getAuthTag();

      // 组合: IV + AuthTag + 加密数据
      const combined = Buffer.concat([iv, authTag, encrypted]);

      // 返回 Base64 编码
      return combined.toString('base64');
    } catch (error) {
      console.error('Encryption error:', error);
      throw new Error('Failed to encrypt data');
    }
  }

  /**
   * 解密文本
   * @param encrypted Base64 编码的加密数据
   * @returns 明文
   */
  decrypt(encrypted: string): string {
    if (!encrypted) {
      return encrypted;
    }

    try {
      // 解码 Base64
      const combined = Buffer.from(encrypted, 'base64');

      // 提取 IV、AuthTag 和加密数据
      const iv = combined.slice(0, this.ivLength);
      const authTag = combined.slice(this.ivLength, this.ivLength + this.authTagLength);
      const encryptedData = combined.slice(this.ivLength + this.authTagLength);

      // 创建解密器
      const decipher = crypto.createDecipheriv(
        this.algorithm,
        this.encryptionKey,
        iv,
      );

      // 设置认证标签
      decipher.setAuthTag(authTag);

      // 解密数据
      const decrypted = Buffer.concat([
        decipher.update(encryptedData),
        decipher.final(),
      ]);

      return decrypted.toString('utf8');
    } catch (error) {
      console.error('Decryption error:', error);
      throw new Error('Failed to decrypt data');
    }
  }

  /**
   * 加密对象中的指定字段
   * @param obj 对象
   * @param fields 需要加密的字段名数组
   * @returns 加密后的对象
   */
  encryptFields<T extends Record<string, any>>(
    obj: T,
    fields: (keyof T)[],
  ): T {
    const result = { ...obj };

    for (const field of fields) {
      if (result[field] && typeof result[field] === 'string') {
        result[field] = this.encrypt(result[field] as string) as any;
      }
    }

    return result;
  }

  /**
   * 解密对象中的指定字段
   * @param obj 对象
   * @param fields 需要解密的字段名数组
   * @returns 解密后的对象
   */
  decryptFields<T extends Record<string, any>>(
    obj: T,
    fields: (keyof T)[],
  ): T {
    const result = { ...obj };

    for (const field of fields) {
      if (result[field] && typeof result[field] === 'string') {
        try {
          result[field] = this.decrypt(result[field] as string) as any;
        } catch (error) {
          console.error(`Failed to decrypt field ${String(field)}:`, error);
          // 解密失败时保持原值
        }
      }
    }

    return result;
  }

  /**
   * 生成加密密钥（用于初始化）
   * @returns Hex 编码的 256-bit 密钥
   */
  static generateKey(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * 对敏感数据进行哈希（用于搜索和去重）
   * @param data 数据
   * @returns SHA-256 哈希值
   */
  hash(data: string): string {
    return crypto.createHash('sha256').update(data).digest('hex');
  }

  /**
   * 部分脱敏显示
   * @param data 数据
   * @param visibleStart 开头可见字符数
   * @param visibleEnd 结尾可见字符数
   * @returns 脱敏后的字符串
   */
  mask(data: string, visibleStart = 3, visibleEnd = 4): string {
    if (!data || data.length <= visibleStart + visibleEnd) {
      return data;
    }

    const start = data.substring(0, visibleStart);
    const end = data.substring(data.length - visibleEnd);
    const masked = '*'.repeat(data.length - visibleStart - visibleEnd);

    return `${start}${masked}${end}`;
  }

  /**
   * 手机号脱敏
   * @param phone 手机号
   * @returns 脱敏后的手机号（如：138****5678）
   */
  maskPhone(phone: string): string {
    if (!phone || phone.length < 11) {
      return phone;
    }
    return this.mask(phone, 3, 4);
  }

  /**
   * 邮箱脱敏
   * @param email 邮箱
   * @returns 脱敏后的邮箱（如：abc***@example.com）
   */
  maskEmail(email: string): string {
    if (!email || !email.includes('@')) {
      return email;
    }

    const [local, domain] = email.split('@');
    const maskedLocal = this.mask(local, 3, 0);
    return `${maskedLocal}@${domain}`;
  }

  /**
   * 身份证号脱敏
   * @param idNumber 身份证号
   * @returns 脱敏后的身份证号（如：110***********1234）
   */
  maskIdNumber(idNumber: string): string {
    if (!idNumber || idNumber.length < 18) {
      return idNumber;
    }
    return this.mask(idNumber, 3, 4);
  }

  /**
   * 银行卡号脱敏
   * @param cardNumber 银行卡号
   * @returns 脱敏后的银行卡号（如：6222 **** **** 1234）
   */
  maskCardNumber(cardNumber: string): string {
    if (!cardNumber || cardNumber.length < 16) {
      return cardNumber;
    }

    const cleaned = cardNumber.replace(/\s/g, '');
    const masked = this.mask(cleaned, 4, 4);
    
    // 每 4 位添加空格
    return masked.replace(/(.{4})/g, '$1 ').trim();
  }
}



