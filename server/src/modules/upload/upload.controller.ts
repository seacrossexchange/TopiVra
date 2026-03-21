import {
  Controller,
  Post,
  Get,
  Delete,
  Param,
  UseInterceptors,
  UploadedFile,
  UploadedFiles,
  BadRequestException,
  Query,
  UseGuards,
} from '@nestjs/common';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiResponse,
  ApiConsumes,
} from '@nestjs/swagger';
import { UploadService } from './upload.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Public } from '../auth/decorators/public.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

// 文件类型定义
interface MulterFile {
  fieldname: string;
  originalname: string;
  encoding: string;
  mimetype: string;
  size: number;
  destination?: string;
  filename?: string;
  path?: string;
  buffer: Buffer;
}

@ApiTags('文件上传')
@Controller('upload')
export class UploadController {
  constructor(private readonly uploadService: UploadService) {}

  // ==================== 公开接口 ====================

  @Public()
  @Get('health')
  @ApiOperation({ summary: '上传服务健康检查' })
  @ApiResponse({ status: 200, description: '服务正常' })
  healthCheck() {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }

  // ==================== 卖家接口 ====================

  @Post('product/file')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SELLER')
  @ApiBearerAuth()
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: '上传商品文件（卖家）' })
  @ApiResponse({ status: 200, description: '文件上传成功' })
  @ApiResponse({ status: 400, description: '文件类型不支持或文件过大' })
  @UseInterceptors(FileInterceptor('file'))
  async uploadProductFile(
    @CurrentUser('id') userId: string,
    @UploadedFile() file: MulterFile,
    @Query('category') category?: string,
  ) {
    if (!file) {
      throw new BadRequestException('请选择要上传的文件');
    }

    const allowedExtensions = [
      '.zip',
      '.rar',
      '.7z',
      '.exe',
      '.dmg',
      '.apk',
      '.pdf',
      '.jpg',
      '.jpeg',
      '.png',
      '.gif',
    ];

    const fileExt = file.originalname
      .toLowerCase()
      .substring(file.originalname.lastIndexOf('.'));

    if (!allowedExtensions.includes(fileExt)) {
      throw new BadRequestException(`不支持的文件类型: ${fileExt}`);
    }

    // 文件大小限制: 100MB
    const maxSize = 100 * 1024 * 1024;
    if (file.size > maxSize) {
      throw new BadRequestException('文件大小不能超过100MB');
    }

    return this.uploadService.uploadProductFile(userId, file as any, category);
  }

  @Post('product/images')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SELLER')
  @ApiBearerAuth()
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: '上传商品图片（卖家）' })
  @ApiResponse({ status: 200, description: '图片上传成功' })
  @ApiResponse({ status: 400, description: '图片类型不支持或过大' })
  @UseInterceptors(FilesInterceptor('files', 10))
  async uploadProductImages(
    @CurrentUser('id') userId: string,
    @UploadedFiles() files: MulterFile[],
  ) {
    if (!files || files.length === 0) {
      throw new BadRequestException('请选择要上传的图片');
    }

    // 验证图片类型
    const allowedMimeTypes = [
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp',
    ];

    for (const file of files) {
      if (!allowedMimeTypes.includes(file.mimetype)) {
        throw new BadRequestException(`不支持的图片类型: ${file.mimetype}`);
      }

      // 图片大小限制: 5MB
      const maxSize = 5 * 1024 * 1024;
      if (file.size > maxSize) {
        throw new BadRequestException('图片大小不能超过5MB');
      }
    }

    return this.uploadService.uploadProductImages(userId, files as any);
  }

  @Post('keys/batch')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SELLER')
  @ApiBearerAuth()
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: '批量导入激活码（卖家）' })
  @ApiResponse({ status: 200, description: '激活码导入成功' })
  @ApiResponse({ status: 400, description: '文件格式错误' })
  @UseInterceptors(FileInterceptor('file'))
  async importKeys(
    @CurrentUser('id') userId: string,
    @UploadedFile() file: MulterFile,
    @Query('productId') productId: string,
  ) {
    if (!file) {
      throw new BadRequestException('请选择要上传的文件');
    }

    if (!productId) {
      throw new BadRequestException('请指定商品ID');
    }

    const fileExt = file.originalname
      .toLowerCase()
      .substring(file.originalname.lastIndexOf('.'));

    if (!['.txt', '.csv'].includes(fileExt)) {
      throw new BadRequestException('只支持 .txt 或 .csv 格式的文件');
    }

    return this.uploadService.importKeys(userId, productId, file as any);
  }

  // ==================== 管理员接口 ====================

  @Post('admin/banner')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth()
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: '上传广告图片（管理员）' })
  @ApiResponse({ status: 200, description: '图片上传成功' })
  @UseInterceptors(FileInterceptor('file'))
  async uploadBanner(
    @CurrentUser('id') adminId: string,
    @UploadedFile() file: MulterFile,
  ) {
    if (!file) {
      throw new BadRequestException('请选择要上传的图片');
    }

    const allowedMimeTypes = [
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp',
    ];
    if (!allowedMimeTypes.includes(file.mimetype)) {
      throw new BadRequestException('只支持 JPG, PNG, GIF, WEBP 格式的图片');
    }

    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      throw new BadRequestException('图片大小不能超过5MB');
    }

    return this.uploadService.uploadBanner(adminId, file as any);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SELLER', 'ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: '删除文件' })
  @ApiResponse({ status: 200, description: '文件删除成功' })
  async deleteFile(
    @Param('id') fileId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.uploadService.deleteFile(fileId, userId);
  }
}
