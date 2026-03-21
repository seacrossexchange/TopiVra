import {
  Injectable,
  BadRequestException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import * as crypto from 'crypto';

@Injectable()
export class InventoryService {
  private readonly logger = new Logger(InventoryService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * 生成账号哈希（用于检测重复）
   */
  private generateAccountHash(accountData: string): string {
    return crypto
      .createHash('sha256')
      .update(accountData.trim().toLowerCase())
      .digest('hex');
  }

  /**
   * 加密账号数据
   */
  private encryptAccountData(accountData: string): string {
    const algorithm = 'aes-256-cbc';

    // ENCRYPTION_KEY expects a 64-hex-char (32-byte) key.
    // In test/dev it may be missing; in that case we fall back to a deterministic zero key
    // so the service remains functional (prod should always set a strong key).
    const rawKey = process.env.ENCRYPTION_KEY;
    const keyHex =
      rawKey && /^[0-9a-fA-F]{64}$/.test(rawKey) ? rawKey : '0'.repeat(64);
    const key = Buffer.from(keyHex, 'hex');

    const iv = crypto.randomBytes(16);

    const cipher = crypto.createCipheriv(algorithm, key, iv);
    let encrypted = cipher.update(accountData, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    return iv.toString('hex') + ':' + encrypted;
  }

  /**
   * 解密账号数据
   */
  private decryptAccountData(encryptedData: string): string {
    try {
      const algorithm = 'aes-256-cbc';

      const rawKey = process.env.ENCRYPTION_KEY;
      const keyHex =
        rawKey && /^[0-9a-fA-F]{64}$/.test(rawKey) ? rawKey : '0'.repeat(64);
      const key = Buffer.from(keyHex, 'hex');

      const parts = encryptedData.split(':');
      const iv = Buffer.from(parts[0], 'hex');
      const encrypted = parts[1];

      const decipher = crypto.createDecipheriv(algorithm, key, iv);
      let decrypted = decipher.update(encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');

      return decrypted;
    } catch (error: unknown) {
      this.logger.error(`解密失败: ${(error as Error).message}`);
      return encryptedData; // 如果解密失败，返回原始数据
    }
  }

  /**
   * 检查账号是否重复
   */
  async checkDuplicate(
    accountData: string,
    _sellerId?: string,
  ): Promise<{
    isDuplicate: boolean;
    existingInventory?: any;
  }> {
    const accountHash = this.generateAccountHash(accountData);

    // 检查全平台是否存在
    const existing = await this.prisma.productInventory.findUnique({
      where: { accountHash },
      include: {
        product: { select: { title: true } },
        seller: { select: { username: true } },
      },
    });

    if (existing) {
      return {
        isDuplicate: true,
        existingInventory: existing,
      };
    }

    return { isDuplicate: false };
  }

  /**
   * 添加单个账号
   */
  async addAccount(dto: {
    productId: string;
    sellerId: string;
    accountData: string;
    accountInfo?: any;
  }) {
    // 检查重复
    const { isDuplicate, existingInventory } = await this.checkDuplicate(
      dto.accountData,
      dto.sellerId,
    );

    if (isDuplicate) {
      if (existingInventory.sellerId === dto.sellerId) {
        throw new BadRequestException('您已经上架过这个账号');
      } else {
        throw new BadRequestException(
          `该账号已被其他卖家上架（${existingInventory.seller.username}）`,
        );
      }
    }

    // 加密并存储
    const accountHash = this.generateAccountHash(dto.accountData);
    const encryptedData = this.encryptAccountData(dto.accountData);

    const inventory = await this.prisma.productInventory.create({
      data: {
        productId: dto.productId,
        sellerId: dto.sellerId,
        accountData: encryptedData,
        accountHash,
        accountInfo: dto.accountInfo,
        status: 'AVAILABLE',
      },
    });

    // 更新商品库存数量
    await this.updateProductInventoryCount(dto.productId);

    this.logger.log(`账号添加成功: ${inventory.id}`);

    return inventory;
  }

  /**
   * 批量添加账号
   */
  async batchAddAccounts(dto: {
    productId: string;
    sellerId: string;
    accounts: Array<{ accountData: string; accountInfo?: any }>;
  }) {
    const results = {
      success: 0,
      failed: 0,
      duplicates: 0,
      errors: [] as string[],
    };

    for (const account of dto.accounts) {
      try {
        await this.addAccount({
          productId: dto.productId,
          sellerId: dto.sellerId,
          accountData: account.accountData,
          accountInfo: account.accountInfo,
        });
        results.success++;
      } catch (error: unknown) {
        results.failed++;
        // HttpException (BadRequestException) 的 message 在不同场景下可能是字符串或对象
        let errMsg: string;
        const httpResp = (error as any)?.response;
        if (typeof httpResp === 'string') {
          errMsg = httpResp;
        } else if (typeof httpResp?.message === 'string') {
          errMsg = httpResp.message;
        } else if (typeof (error as any)?.message === 'string') {
          errMsg = (error as any).message;
        } else {
          errMsg = String(error);
        }
        if (errMsg.includes('已上架') || errMsg.includes('已被其他卖家上架')) {
          results.duplicates++;
        }
        results.errors.push(
          `${account.accountData.substring(0, 20)}...: ${errMsg}`,
        );
      }
    }

    this.logger.log(
      `批量添加完成: 成功 ${results.success}, 失败 ${results.failed}, 重复 ${results.duplicates}`,
    );

    return results;
  }

  /**
   * 获取可用账号（用于自动发货）
   */
  async getAvailableAccount(productId: string): Promise<any | null> {
    const inventory = await this.prisma.productInventory.findFirst({
      where: {
        productId,
        status: 'AVAILABLE',
        isValid: true,
      },
      orderBy: { createdAt: 'asc' }, // FIFO 先进先出
    });

    if (!inventory) {
      return null;
    }

    // 解密账号数据
    const decryptedData = this.decryptAccountData(inventory.accountData);

    return {
      ...inventory,
      accountData: decryptedData,
    };
  }

  /**
   * 标记账号为已售出
   */
  async markAsSold(inventoryId: string, orderId: string, orderItemId: string) {
    const inventory = await this.prisma.productInventory.update({
      where: { id: inventoryId },
      data: {
        status: 'SOLD',
        orderId,
        orderItemId,
        soldAt: new Date(),
      },
    });

    // 更新商品库存数量
    await this.updateProductInventoryCount(inventory.productId);

    this.logger.log(`账号已售出: ${inventoryId}`);

    return inventory;
  }

  /**
   * 更新商品库存数量
   */
  async updateProductInventoryCount(productId: string) {
    const count = await this.prisma.productInventory.count({
      where: {
        productId,
        status: 'AVAILABLE',
        isValid: true,
      },
    });

    await this.prisma.product.update({
      where: { id: productId },
      data: {
        inventoryCount: count,
        stock: count, // 同步更新 stock 字段
      },
    });

    this.logger.debug(`商品 ${productId} 库存更新为: ${count}`);
  }

  /**
   * 查询卖家的账号库存
   */
  async findBySeller(sellerId: string, query: any) {
    const { page = 1, limit = 20, productId, status } = query;
    const skip = (page - 1) * limit;

    const where: any = { sellerId };
    if (productId) where.productId = productId;
    if (status) where.status = status;

    const [items, total] = await Promise.all([
      this.prisma.productInventory.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          product: { select: { id: true, title: true } },
          order: { select: { orderNo: true } },
        },
      }),
      this.prisma.productInventory.count({ where }),
    ]);

    // 解密账号数据
    const decryptedItems = items.map((item) => ({
      ...item,
      accountData: this.decryptAccountData(item.accountData),
    }));

    return { items: decryptedItems, total, page, limit };
  }

  /**
   * 查询商品的库存统计
   */
  async getInventoryStats(productId: string, sellerId: string) {
    const [total, available, sold, invalid] = await Promise.all([
      this.prisma.productInventory.count({
        where: { productId, sellerId },
      }),
      this.prisma.productInventory.count({
        where: { productId, sellerId, status: 'AVAILABLE', isValid: true },
      }),
      this.prisma.productInventory.count({
        where: { productId, sellerId, status: 'SOLD' },
      }),
      this.prisma.productInventory.count({
        where: { productId, sellerId, isValid: false },
      }),
    ]);

    return { total, available, sold, invalid };
  }

  /**
   * 删除账号
   */
  async deleteAccount(inventoryId: string, sellerId: string) {
    const inventory = await this.prisma.productInventory.findUnique({
      where: { id: inventoryId },
    });

    if (!inventory) {
      throw new NotFoundException('账号不存在');
    }

    if (inventory.sellerId !== sellerId) {
      throw new BadRequestException('无权删除此账号');
    }

    if (inventory.status === 'SOLD') {
      throw new BadRequestException('已售出的账号不能删除');
    }

    await this.prisma.productInventory.delete({
      where: { id: inventoryId },
    });

    // 更新商品库存数量
    await this.updateProductInventoryCount(inventory.productId);

    this.logger.log(`账号已删除: ${inventoryId}`);

    return { success: true, message: '账号已删除' };
  }

  /**
   * 标记账号为失效
   */
  async markAsInvalid(inventoryId: string, sellerId: string, reason: string) {
    const inventory = await this.prisma.productInventory.findUnique({
      where: { id: inventoryId },
    });

    if (!inventory) {
      throw new NotFoundException('账号不存在');
    }

    if (inventory.sellerId !== sellerId) {
      throw new BadRequestException('无权操作此账号');
    }

    await this.prisma.productInventory.update({
      where: { id: inventoryId },
      data: {
        isValid: false,
        invalidReason: reason,
        invalidAt: new Date(),
      },
    });

    // 更新商品库存数量
    await this.updateProductInventoryCount(inventory.productId);

    this.logger.log(`账号已标记为失效: ${inventoryId}`);

    return { success: true, message: '账号已标记为失效' };
  }
}
