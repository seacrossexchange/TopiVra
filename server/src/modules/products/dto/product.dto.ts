import {
  IsString,
  IsOptional,
  IsNumber,
  IsEnum,
  IsArray,
  IsObject,
  Min,
  Max,
  IsUUID,
} from 'class-validator';
import { Type } from 'class-transformer';
import {
  ApiProperty,
  ApiPropertyOptional,
  PartialType,
  OmitType,
} from '@nestjs/swagger';

// 本地定义枚举（待 prisma generate 后从 @prisma/client 导入）
export enum ProductType {
  ACCOUNT = 'ACCOUNT',
  SOFTWARE = 'SOFTWARE',
  DIGITAL = 'DIGITAL',
}

export enum DeliveryType {
  FILE = 'FILE',
  LINK = 'LINK',
  KEY = 'KEY',
  HYBRID = 'HYBRID',
}

export enum CountryMode {
  NONE = 'NONE',
  SINGLE = 'SINGLE',
  MULTI = 'MULTI',
}

export enum ProductStatus {
  DRAFT = 'DRAFT',
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  ONLINE = 'ONLINE',
  OFFLINE = 'OFFLINE',
}

// ==================== 创建商品 DTO ====================

export class CreateProductDto {
  @ApiProperty({ description: '商品标题' })
  @IsString()
  title: string;

  @ApiProperty({ description: '商品描述' })
  @IsString()
  description: string;

  @ApiProperty({ description: '平台' })
  @IsString()
  platform: string;

  @ApiPropertyOptional({ description: '账号类型' })
  @IsOptional()
  @IsString()
  accountType?: string;

  @ApiPropertyOptional({ description: '地区' })
  @IsOptional()
  @IsString()
  region?: string;

  @ApiPropertyOptional({ description: '分类ID' })
  @IsUUID()
  categoryId: string;

  @ApiProperty({ description: '价格' })
  @IsNumber()
  @Min(0)
  price: number;

  @ApiPropertyOptional({ description: '原价' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  originalPrice?: number;

  @ApiPropertyOptional({ description: '货币', default: 'USD' })
  @IsOptional()
  @IsString()
  currency?: string;

  @ApiProperty({ description: '库存' })
  @IsNumber()
  @Min(0)
  stock: number;

  @ApiPropertyOptional({ description: '标签 (JSON数组)' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiPropertyOptional({ description: '账号属性 (JSON对象)' })
  @IsOptional()
  @IsObject()
  attributes?: Record<string, any>;

  @ApiPropertyOptional({ description: '图片URL列表' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  images?: string[];

  @ApiPropertyOptional({ description: '缩略图URL' })
  @IsOptional()
  @IsString()
  thumbnailUrl?: string;

  @ApiPropertyOptional({ description: 'SEO标题' })
  @IsOptional()
  @IsString()
  metaTitle?: string;

  @ApiPropertyOptional({ description: 'SEO描述' })
  @IsOptional()
  @IsString()
  metaDescription?: string;

  // ===== 新增商品类型与交付相关字段 =====

  @ApiPropertyOptional({
    description: '商品类型',
    enum: ProductType,
    default: ProductType.ACCOUNT,
  })
  @IsOptional()
  @IsEnum(ProductType)
  productType?: ProductType;

  @ApiPropertyOptional({
    description: '交付方式',
    enum: DeliveryType,
    default: DeliveryType.FILE,
  })
  @IsOptional()
  @IsEnum(DeliveryType)
  deliveryType?: DeliveryType;

  @ApiPropertyOptional({
    description: '国家模式',
    enum: CountryMode,
    default: CountryMode.NONE,
  })
  @IsOptional()
  @IsEnum(CountryMode)
  countryMode?: CountryMode;

  @ApiPropertyOptional({ description: '国家代码列表（ISO 3166-1 alpha-2）' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  countries?: string[];

  // ===== 软件商品专属字段 =====

  @ApiPropertyOptional({
    description: '适用系统 (Windows/macOS/Linux/Android/iOS/Web)',
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  supportedSystems?: string[];

  @ApiPropertyOptional({ description: '文件类型 (zip/exe/dmg/apk/pdf等)' })
  @IsOptional()
  @IsString()
  fileType?: string;

  @ApiPropertyOptional({ description: '版本号' })
  @IsOptional()
  @IsString()
  version?: string;

  @ApiPropertyOptional({ description: '文件大小（字节）' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  fileSize?: number;

  @ApiPropertyOptional({ description: '下载链接' })
  @IsOptional()
  @IsString()
  downloadUrl?: string;

  @ApiPropertyOptional({ description: '安装说明' })
  @IsOptional()
  @IsString()
  installGuide?: string;

  @ApiPropertyOptional({ description: '更新说明' })
  @IsOptional()
  @IsString()
  updateNote?: string;

  // ===== 账号商品专属字段 =====

  @ApiPropertyOptional({ description: '粉丝量区间' })
  @IsOptional()
  @IsString()
  followerRange?: string;

  @ApiPropertyOptional({ description: '登录方式说明' })
  @IsOptional()
  @IsString()
  loginMethod?: string;

  @ApiPropertyOptional({ description: '质保说明' })
  @IsOptional()
  @IsString()
  warrantyInfo?: string;
}

// ==================== 更新商品 DTO ====================

export class UpdateProductDto extends PartialType(
  OmitType(CreateProductDto, ['categoryId'] as const),
) {
  @ApiPropertyOptional({ description: '分类ID' })
  @IsOptional()
  @IsUUID()
  categoryId?: string;
}

// ==================== 商品查询 DTO ====================

export class ProductQueryDto {
  @ApiPropertyOptional({ description: '页码', default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ description: '每页数量', default: 10 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number = 10;

  @ApiPropertyOptional({ description: '分类ID' })
  @IsOptional()
  @IsUUID()
  categoryId?: string;

  @ApiPropertyOptional({ description: '平台' })
  @IsOptional()
  @IsString()
  platform?: string;

  @ApiPropertyOptional({ description: '地区' })
  @IsOptional()
  @IsString()
  region?: string;

  @ApiPropertyOptional({ description: '商品状态', enum: ProductStatus })
  @IsOptional()
  @IsEnum(ProductStatus)
  status?: ProductStatus;

  @ApiPropertyOptional({ description: '商品类型', enum: ProductType })
  @IsOptional()
  @IsEnum(ProductType)
  productType?: ProductType;

  @ApiPropertyOptional({ description: '交付方式', enum: DeliveryType })
  @IsOptional()
  @IsEnum(DeliveryType)
  deliveryType?: DeliveryType;

  @ApiPropertyOptional({ description: '最低价格' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  minPrice?: number;

  @ApiPropertyOptional({ description: '最高价格' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  maxPrice?: number;

  @ApiPropertyOptional({ description: '搜索关键词' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ description: '排序字段', default: 'createdAt' })
  @IsOptional()
  @IsString()
  sortBy?: string;

  @ApiPropertyOptional({ description: '排序方向', default: 'desc' })
  @IsOptional()
  @IsString()
  sortOrder?: 'asc' | 'desc';

  @ApiPropertyOptional({ description: '卖家ID' })
  @IsOptional()
  @IsUUID()
  sellerId?: string;

  @ApiPropertyOptional({ description: '国家代码筛选' })
  @IsOptional()
  @IsString()
  country?: string;
}

// ==================== 审核商品 DTO ====================

export class AuditProductDto {
  @ApiProperty({ description: '审核状态', enum: ['APPROVED', 'REJECTED'] })
  @IsEnum(['APPROVED', 'REJECTED'])
  status: 'APPROVED' | 'REJECTED';

  @ApiPropertyOptional({ description: '拒绝原因' })
  @IsOptional()
  @IsString()
  rejectReason?: string;
}

// ==================== 批量操作 DTO ====================

export class BatchOperationDto {
  @ApiProperty({ description: '商品ID列表' })
  @IsArray()
  @IsUUID('4', { each: true })
  ids: string[];

  @ApiProperty({
    description: '操作类型',
    enum: ['delete', 'offline', 'online'],
  })
  @IsEnum(['delete', 'offline', 'online'])
  action: 'delete' | 'offline' | 'online';
}
