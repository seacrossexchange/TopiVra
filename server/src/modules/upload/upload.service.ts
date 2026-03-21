import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import * as fs from 'fs';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class UploadService {
  private uploadDir = path.join(process.cwd(), 'uploads');

  constructor(private prisma: PrismaService) {
    // 确保上传目录存在
    if (!fs.existsSync(this.uploadDir)) {
      fs.mkdirSync(this.uploadDir, { recursive: true });
    }
  }

  async uploadProductFile(
    userId: string,
    file: Express.Multer.File,
    category?: string,
  ) {
    // 保存文件信息到数据库
    const fileRecord = await this.prisma.uploadFile.create({
      data: {
        filename: file.filename || `${uuidv4()}_${file.originalname}`,
        originalname: file.originalname,
        mimetype: file.mimetype,
        size: file.size,
        path: file.path || `${this.uploadDir}/${uuidv4()}_${file.originalname}`,
        uploaderId: userId,
        category: category || 'product_file',
      },
    });

    return {
      id: fileRecord.id,
      filename: fileRecord.filename,
      originalname: fileRecord.originalname,
      size: fileRecord.size,
      mimetype: fileRecord.mimetype,
      url: `/uploads/${fileRecord.filename}`,
    };
  }

  async uploadProductImages(userId: string, files: Express.Multer.File[]) {
    const uploadedFiles = await Promise.all(
      files.map(async (file) => {
        const fileRecord = await this.prisma.uploadFile.create({
          data: {
            filename: file.filename || `${uuidv4()}_${file.originalname}`,
            originalname: file.originalname,
            mimetype: file.mimetype,
            size: file.size,
            path:
              file.path || `${this.uploadDir}/${uuidv4()}_${file.originalname}`,
            uploaderId: userId,
            category: 'product_image',
          },
        });

        return {
          id: fileRecord.id,
          filename: fileRecord.filename,
          originalname: fileRecord.originalname,
          url: `/uploads/${fileRecord.filename}`,
        };
      }),
    );

    return { files: uploadedFiles };
  }

  async importKeys(
    userId: string,
    productId: string,
    file: Express.Multer.File,
  ) {
    // 读取文件内容
    const content =
      file.buffer?.toString() ||
      (file.path ? fs.readFileSync(file.path, 'utf-8') : '');

    // 解析激活码（支持换行分隔或CSV格式）
    const lines = content.split(/\r?\n/).filter((line) => line.trim());

    if (lines.length === 0) {
      throw new BadRequestException('文件中没有找到激活码');
    }

    // 验证商品存在且属于当前卖家
    const product = await this.prisma.product.findFirst({
      where: { id: productId, sellerId: userId },
    });

    if (!product) {
      throw new NotFoundException('商品不存在或无权限');
    }

    // 批量导入激活码
    const keys = lines.map((line) => {
      const parts = line.split(',').map((p) => p.trim());
      return {
        productId,
        key: parts[0],
        extra: parts[1] || null,
        status: 'AVAILABLE' as const,
      };
    });

    await this.prisma.productKey.createMany({
      data: keys,
      skipDuplicates: true,
    });

    return {
      imported: keys.length,
      message: `成功导入 ${keys.length} 个激活码`,
    };
  }

  async uploadBanner(adminId: string, file: Express.Multer.File) {
    const fileRecord = await this.prisma.uploadFile.create({
      data: {
        filename: file.filename || `${uuidv4()}_${file.originalname}`,
        originalname: file.originalname,
        mimetype: file.mimetype,
        size: file.size,
        path: file.path || `${this.uploadDir}/${uuidv4()}_${file.originalname}`,
        uploaderId: adminId,
        category: 'banner',
      },
    });

    return {
      id: fileRecord.id,
      filename: fileRecord.filename,
      url: `/uploads/${fileRecord.filename}`,
    };
  }

  async deleteFile(fileId: string, userId: string) {
    const file = await this.prisma.uploadFile.findUnique({
      where: { id: fileId },
    });

    if (!file) {
      throw new NotFoundException('文件不存在');
    }

    // 检查权限
    if (file.uploaderId !== userId) {
      throw new ForbiddenException('无权限删除此文件');
    }

    // 删除物理文件
    if (fs.existsSync(file.path)) {
      fs.unlinkSync(file.path);
    }

    // 删除数据库记录
    await this.prisma.uploadFile.delete({
      where: { id: fileId },
    });

    return { success: true, message: '文件已删除' };
  }

  // 获取文件下载URL
  async getFileUrl(fileId: string, userId: string) {
    const file = await this.prisma.uploadFile.findUnique({
      where: { id: fileId },
    });

    if (!file) {
      throw new NotFoundException('文件不存在');
    }

    return {
      url: `/uploads/${file.filename}`,
      filename: file.originalname,
      mimetype: file.mimetype,
    };
  }
}
