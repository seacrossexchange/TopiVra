import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { HeartOutlined, HeartFilled, StarFilled, ShoppingCartOutlined } from '@ant-design/icons';
import { message } from 'antd';
import { useCartStore } from '@/store/cartStore';
import { useAuthStore } from '@/store/authStore';
import { favoritesService } from '@/services/favorites';
import './ProductCard.css';

export interface ProductCardProps {
  id: string;
  title: string;
  description?: string;
  price: number;
  originalPrice?: number;
  image?: string;
  rating?: number;
  reviewCount?: number;
  sellerName?: string;
  sellerId?: string;
  sellerRating?: number; // 卖家信用分 (0-100)
  sellerLevel?: string; // 卖家等级: 'bronze' | 'silver' | 'gold' | 'platinum'
  showRating?: boolean;
  showSeller?: boolean;
  showFavorite?: boolean;
  showAddToCart?: boolean;
  isFavorite?: boolean;
  onFavoriteChange?: (isFavorite: boolean) => void;
  onClick?: () => void;
}

export function ProductCard({
  id,
  title,
  description,
  price,
  originalPrice,
  image,
  rating = 0,
  reviewCount = 0,
  sellerName,
  sellerRating,
  sellerLevel,
  showRating = false,
  showSeller = false,
  showFavorite = true,
  showAddToCart = true,
  isFavorite: initialIsFavorite = false,
  onFavoriteChange,
  onClick,
}: ProductCardProps) {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuthStore();
  const { addToCart } = useCartStore();
  const [isFavorite, setIsFavorite] = useState(initialIsFavorite);
  const [isFavoriteLoading, setIsFavoriteLoading] = useState(false);

  // 计算折扣百分比
  const discountPercentage = originalPrice && originalPrice > price
    ? Math.round((1 - price / originalPrice) * 100)
    : 0;

  // 点击卡片
  const handleClick = () => {
    if (onClick) {
      onClick();
    } else {
      navigate(`/products/${id}`);
    }
  };

  // 切换收藏状态
  const handleFavoriteClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (!isAuthenticated) {
      message.warning('请先登录');
      navigate('/login');
      return;
    }

    setIsFavoriteLoading(true);
    try {
      if (isFavorite) {
        await favoritesService.removeFavorite(id);
        setIsFavorite(false);
        onFavoriteChange?.(false);
      } else {
        await favoritesService.addFavorite(id);
        setIsFavorite(true);
        onFavoriteChange?.(true);
      }
    } catch {
      message.error('操作失败，请重试');
    } finally {
      setIsFavoriteLoading(false);
    }
  };

  // 添加到购物车
  const handleAddToCart = async (e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (!isAuthenticated) {
      message.warning('请先登录');
      navigate('/login');
      return;
    }

    try {
      await addToCart(id, 1);
      message.success('已添加到购物车');
    } catch {
      message.error('添加失败，请重试');
    }
  };

  return (
    <div
      className="product-card"
      onClick={handleClick}
      tabIndex={0}
      role="button"
      aria-label={`查看商品: ${title}`}
    >
      {/* 图片区域 */}
      <div className="product-card__image-wrapper">
        {image ? (
          <img
            src={image}
            alt={title}
            className="product-card__image"
            loading="lazy"
          />
        ) : (
          <div className="product-card__image-placeholder">
            <ShoppingCartOutlined style={{ fontSize: 48, color: '#ccc' }} />
          </div>
        )}

        {/* 折扣标签 */}
        {discountPercentage > 0 && (
          <span className="product-card__discount-badge">
            -{discountPercentage}%
          </span>
        )}

        {/* 收藏按钮 */}
        {showFavorite && (
          <button
            className={`product-card__favorite-btn ${isFavorite ? 'product-card__favorite-btn--active' : ''}`}
            onClick={handleFavoriteClick}
            disabled={isFavoriteLoading}
            aria-label={isFavorite ? '取消收藏' : '收藏'}
            aria-pressed={isFavorite ? 'true' : 'false'}
          >
            {isFavorite ? (
              <HeartFilled style={{ color: '#ff4d4f', fontSize: 20 }} />
            ) : (
              <HeartOutlined style={{ fontSize: 20 }} />
            )}
          </button>
        )}
      </div>

      {/* 内容区域 */}
      <div className="product-card__content">
        {/* 标题 */}
        <h3 className="product-card__title" data-testid="product-title" title={title}>
          {title}
        </h3>

        {/* 描述 */}
        {description && (
          <p className="product-card__description">{description}</p>
        )}

        {/* 评分 */}
        {showRating && rating > 0 && (
          <div className="product-card__rating" data-testid="product-rating">
            <StarFilled style={{ color: '#faad14', fontSize: 14 }} />
            <span className="product-card__rating-value">{rating.toFixed(1)}</span>
            <span className="product-card__review-count">({reviewCount})</span>
          </div>
        )}

        {/* 卖家 */}
        {showSeller && sellerName && (
          <div className="product-card__seller" data-testid="product-seller">
            {/* 卖家等级徽章 */}
            {sellerLevel && (
              <span className={`product-card__seller-badge product-card__seller-badge--${sellerLevel}`}>
                {sellerLevel === 'platinum' && '💎'}
                {sellerLevel === 'gold' && '🥇'}
                {sellerLevel === 'silver' && '🥈'}
                {sellerLevel === 'bronze' && '🥉'}
              </span>
            )}
            <span className="product-card__seller-name">{sellerName}</span>
            {sellerRating !== undefined && (
              <span className="product-card__seller-rating">{sellerRating}</span>
            )}
          </div>
        )}

        {/* 底部：价格和添加购物车 */}
        <div className="product-card__footer">
          <div className="product-card__price-wrapper">
            <span className="product-card__price" data-testid="product-price">
              ${price.toFixed(2)}
            </span>
            {originalPrice && originalPrice > price && (
              <span className="product-card__original-price" data-testid="original-price">
                ${originalPrice.toFixed(2)}
              </span>
            )}
          </div>

          {showAddToCart && isAuthenticated && (
            <button
              className="product-card__cart-btn"
              onClick={handleAddToCart}
              aria-label="添加到购物车"
            >
              <ShoppingCartOutlined />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default ProductCard;