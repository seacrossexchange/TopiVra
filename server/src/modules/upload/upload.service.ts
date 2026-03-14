import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class UploadService {
  private readonly logger = new Logger(UploadService.name);
  private readonly uploadDir = path.join(process.cwd(), 'uploads');
  private readonly maxImageSize = 5 * 1024 * 1024; // 5MB
  private readonly maxFileSize = 10 * 1024 * 1024; // 10MB
  private readonly allowedImageTypes = [
    'image/jpeg',
    'image/png',
    'image/webp',
  ];
  private readonly allowedFileTypes = [
    'application/pdf',
    ...this.allowedImageTypes,
  ];

  constructor(private configService: ConfigService) {
    // 确保 uploads 目录存在
    if (!fs.existsSync(this.uploadDir)) {
      fs.mkdirSync(this.uploadDir, { recursive: true });
    }
  }

  // 验证图片文件
  validateImage(file: Express.Multer.File): void {
    if (!file) {
      throw new BadRequestException('未提供文件');
    }

    if (!this.allowedImageTypes.includes(file.mimetype)) {
      throw new BadRequestException(
        `不支持的图片格式，仅支持: ${this.allowedImageTypes.join(', ')}`,
      );
    }

    if (file.size > this.maxImageSize) {
      throw new BadRequestException(
        `图片大小超过限制 (最大 ${this.maxImageSize / 1024 / 1024}MB)`,
      );
    }
  }

  // 验证文件
  validateFile(file: Express.Multer.File): void {
    if (!file) {
      throw new BadRequestException('未提供文件');
    }

    if (!this.allowedFileTypes.includes(file.mimetype)) {
      throw new BadRequestException(`不支持的文件格式`);
    }

    const maxSize = file.mimetype.startsWith('image/')
      ? this.maxImageSize
      : this.maxFileSize;
    if (file.size > maxSize) {
      throw new BadRequestException(
        `文件大小超过限制 (最大 ${maxSize / 1024 / 1024}MB)`,
      );
    }
  }

  // 保存图片
  async saveImage(
    file: Express.Multer.File,
    subDir: string = 'images',
  ): Promise<{ url: string; filename: string }> {
    this.validateImage(file);

    const dir = path.join(this.uploadDir, subDir);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    const ext = path.extname(file.originalname) || '.jpg';
    const filename = `${Date.now()}-${Math.random().toString(36).substring(7)}${ext}`;
    const filepath = path.join(dir, filename);

    fs.writeFileSync(filepath, file.buffer);

    const baseUrl =
      this.configService.get('BACKEND_URL') || 'http://localhost:3001';
    const url = `${baseUrl}/uploads/${subDir}/${filename}`;

    this.logger.log(`图片上传成功: ${filename}`);
    return { url, filename };
  }

  // 保存文件
  async saveFile(
    file: Express.Multer.File,
    subDir: string = 'files',
  ): Promise<{ url: string; filename: string }> {
    this.validateFile(file);

    const dir = path.join(this.uploadDir, subDir);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    const ext = path.extname(file.originalname) || '.bin';
    const filename = `${Date.now()}-${Math.random().toString(36).substring(7)}${ext}`;
    const filepath = path.join(dir, filename);

    fs.writeFileSync(filepath, file.buffer);

    const baseUrl =
      this.configService.get('BACKEND_URL') || 'http://localhost:3001';
    const url = `${baseUrl}/uploads/${subDir}/${filename}`;

    this.logger.log(`文件上传成功: ${filename}`);
    return { url, filename };
  }

  // 删除文件
  async deleteFile(url: string): Promise<boolean> {
    try {
      const baseUrl =
        this.configService.get('BACKEND_URL') || 'http://localhost:3001';
      const relativePath = url.replace(`${baseUrl}/uploads/`, '');
      const filepath = path.join(this.uploadDir, relativePath);

      if (fs.existsSync(filepath)) {
        fs.unlinkSync(filepath);
        this.logger.log(`文件删除成功: ${relativePath}`);
        return true;
      }
      return false;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`文件删除失败: ${message}`);
      return false;
    }
  }

  // 获取文件信息
  getFileInfo(
    filename: string,
    subDir: string,
  ): { exists: boolean; path: string; size?: number } {
    const filepath = path.join(this.uploadDir, subDir, filename);
    const exists = fs.existsSync(filepath);
    return {
      exists,
      path: filepath,
      size: exists ? fs.statSync(filepath).size : undefined,
    };
  }
}
