/**
 * SkeletonCard 骨架屏组件
 * 用于加载状态展示
 */

import React from 'react';
import { Skeleton } from 'antd';
import './SkeletonCard.css';

export interface SkeletonCardProps {
  /** 骨架屏类型 */
  type?: 'product' | 'stat' | 'list' | 'table';
  /** 数量 */
  count?: number;
  /** 是否显示动画 */
  active?: boolean;
  /** 自定义类名 */
  className?: string;
}

/**
 * SkeletonCard 骨架屏组件
 * 
 * @example
 * // 商品卡片骨架屏
 * <SkeletonCard type="product" count={4} />
 * 
 * // 数据统计骨架屏
 * <SkeletonCard type="stat" count={3} />
 */
export const SkeletonCard: React.FC<SkeletonCardProps> = ({
  type = 'product',
  count = 1,
  active = true,
  className = '',
}) => {
  // 商品卡片骨架屏
  if (type === 'product') {
    return (
      <div className={`skeleton-grid ${className}`}>
        {Array.from({ length: count }).map((_, index) => (
          <div key={index} className="skeleton-card skeleton-card--product">
            <Skeleton.Image active={active} className="skeleton-card__image" />
            <div className="skeleton-card__content">
              <Skeleton.Input active={active} size="small" style={{ width: '80%' }} />
              <Skeleton.Input active={active} size="small" style={{ width: '60%' }} />
              <div className="skeleton-card__footer">
                <Skeleton.Input active={active} size="small" style={{ width: 80 }} />
                <Skeleton.Avatar active={active} size="small" shape="circle" />
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  // 数据统计骨架屏
  if (type === 'stat') {
    return (
      <div className={`skeleton-grid skeleton-grid--stat ${className}`}>
        {Array.from({ length: count }).map((_, index) => (
          <div key={index} className="skeleton-card skeleton-card--stat">
            <Skeleton.Input active={active} size="small" style={{ width: 80 }} />
            <Skeleton.Input active={active} size="large" style={{ width: 120, marginTop: 8 }} />
          </div>
        ))}
      </div>
    );
  }

  // 列表骨架屏
  if (type === 'list') {
    return (
      <div className={`skeleton-list ${className}`}>
        {Array.from({ length: count }).map((_, index) => (
          <div key={index} className="skeleton-card skeleton-card--list">
            <Skeleton avatar paragraph={{ rows: 2 }} active={active} />
          </div>
        ))}
      </div>
    );
  }

  // 表格骨架屏
  if (type === 'table') {
    return (
      <div className={`skeleton-table ${className}`}>
        <div className="skeleton-table__header">
          {Array.from({ length: 5 }).map((_, index) => (
            <Skeleton.Input key={index} active={active} size="small" />
          ))}
        </div>
        {Array.from({ length: count }).map((_, rowIndex) => (
          <div key={rowIndex} className="skeleton-table__row">
            {Array.from({ length: 5 }).map((_, colIndex) => (
              <Skeleton.Input key={colIndex} active={active} size="small" />
            ))}
          </div>
        ))}
      </div>
    );
  }

  return null;
};

/**
 * 简单的商品骨架屏
 */
export const ProductSkeleton: React.FC<{ active?: boolean }> = ({ active = true }) => (
  <div className="skeleton-card skeleton-card--product">
    <Skeleton.Image active={active} className="skeleton-card__image" />
    <div className="skeleton-card__content">
      <Skeleton.Input active={active} size="small" style={{ width: '80%' }} />
      <Skeleton.Input active={active} size="small" style={{ width: '60%' }} />
    </div>
  </div>
);

/**
 * 简单的统计骨架屏
 */
export const StatSkeleton: React.FC<{ active?: boolean }> = ({ active = true }) => (
  <div className="skeleton-card skeleton-card--stat">
    <Skeleton.Input active={active} size="small" style={{ width: 80 }} />
    <Skeleton.Input active={active} size="large" style={{ width: 120, marginTop: 8 }} />
  </div>
);

export default SkeletonCard;