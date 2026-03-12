import { IsUUID, IsNumber, Min, IsArray } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

// ==================== 添加到购物车 DTO ====================

export class AddToCartDto {
  @ApiProperty({ description: '商品ID' })
  @IsUUID()
  productId: string;

  @ApiProperty({ description: '数量', default: 1 })
  @IsNumber()
  @Min(1)
  quantity: number;
}

// ==================== 更新购物车项数量 DTO ====================

export class UpdateCartItemDto {
  @ApiProperty({ description: '数量' })
  @IsNumber()
  @Min(1)
  quantity: number;
}

// ==================== 批量操作 DTO ====================

export class BatchRemoveDto {
  @ApiProperty({ description: '购物车项ID列表' })
  @IsArray()
  @IsUUID('4', { each: true })
  ids: string[];
}

// ==================== 购物车项响应 ====================

export class CartItemResponseDto {
  @ApiProperty({ description: '购物车项ID' })
  id: string;

  @ApiProperty({ description: '商品ID' })
  productId: string;

  @ApiProperty({ description: '商品标题' })
  productTitle: string;

  @ApiProperty({ description: '商品缩略图' })
  thumbnailUrl: string;

  @ApiProperty({ description: '单价' })
  price: number;

  @ApiProperty({ description: '原价' })
  originalPrice: number;

  @ApiProperty({ description: '数量' })
  quantity: number;

  @ApiProperty({ description: '小计' })
  subtotal: number;

  @ApiProperty({ description: '卖家ID' })
  sellerId: string;

  @ApiProperty({ description: '卖家店铺名' })
  shopName: string;

  @ApiProperty({ description: '库存' })
  stock: number;

  @ApiProperty({ description: '商品状态' })
  productStatus: string;
}

// ==================== 购物车响应 ====================

export class CartResponseDto {
  @ApiProperty({ description: '购物车项列表', type: [CartItemResponseDto] })
  items: CartItemResponseDto[];

  @ApiProperty({ description: '总数量' })
  totalItems: number;

  @ApiProperty({ description: '总金额' })
  totalPrice: number;

  @ApiProperty({ description: '原价总金额' })
  totalOriginalPrice: number;

  @ApiProperty({ description: '节省金额' })
  savedAmount: number;
}
