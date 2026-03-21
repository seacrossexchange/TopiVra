/**
 * StatCard 数据统计卡片组件
 * 用于 Dashboard、卖家中心、管理后台
 * 支持趋势指示和骨架屏加载态
 */

import React from 'react';
import { Skeleton } from 'antd';
import i18n from '@/i18n';
import { Icon } from './Icon';
import type { IconName, IconColor } from './Icon';
import './StatCard.css';

export type TrendDirection = 'up' | 'down' | 'flat';

export interface StatCardProps {
  /** 标题 */
  title: string;
  /** 数值 */
  value: string | number;
  /** 前缀（如货币符号） */
  prefix?: string | React.ReactNode;
  /** 后缀（如单位） */
  suffix?: string | React.ReactNode;
  /** 趋势方向 */
  trend?: TrendDirection;
  /** 趋势百分比 */
  trendValue?: string | number;
  /** 图标名称 */
  icon?: IconName;
  /** 图标颜色 */
  iconColor?: string;
  /** 是否加载中 */
  loading?: boolean;
  /** 点击回调 */
  onClick?: () => void;
  /** 自定义类名 */
  className?: string;
  /** 数值格式化函数 */
  formatter?: (value: string | number) => string;
}

/**
 * StatCard 数据统计卡片
 * 
 * @example
 * // 基础用法
 * <StatCard title="今日订单" value={128} />
 * 
 * // 带趋势
 * <StatCard
 *   title="销售额"
 *   value={9999.99}
 *   prefix="¥"
 *   trend="up"
 *   trendValue="12.5%"
 * />
 * 
 * // 带图标
 * <StatCard
 *   title="用户数"
 *   value={1024}
 *   icon="user"
 * />
 * 
 * // 加载态
 * <StatCard title="加载中" value={0} loading />
 */
export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  prefix,
  suffix,
  trend,
  trendValue,
  icon,
  iconColor = 'primary',
  loading = false,
  onClick,
  className = '',
  formatter,
}) => {
  // 格式化数值
  const formattedValue = formatter ? formatter(value) : value;

  // 趋势颜色映射
  const getTrendColor = (direction: TrendDirection): IconColor => {
    switch (direction) {
      case 'up':
        return 'success';
      case 'down':
        return 'error';
      default:
        return 'tertiary';
    }
  };

  // 趋势图标
  const getTrendIcon = (direction: TrendDirection): IconName => {
    switch (direction) {
      case 'up':
        return 'arrow-up';
      case 'down':
        return 'arrow-down';
      default:
        return 'minus';
    }
  };

  return (
    <div
      className={`stat-card ${onClick ? 'stat-card--clickable' : ''} ${className}`}
      onClick={onClick}
      role={onClick ? 'button' : 'figure'}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={(e) => {
        if (onClick && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault();
          onClick();
        }
      }}
    >
      {loading ? (
        // 加载骨架屏
        <>
          <div className="stat-card__header">
            <Skeleton.Input active size="small" style={{ width: 80 }} />
          </div>
          <div className="stat-card__body">
            <Skeleton.Input active size="large" style={{ width: 120 }} />
          </div>
        </>
      ) : (
        <>
          {/* 头部：标题和图标 */}
          <div className="stat-card__header">
            <span className="stat-card__title">{title}</span>
            {icon && (
              <div className="stat-card__icon">
                <Icon name={icon} size="lg" color={iconColor as IconColor} />
              </div>
            )}
          </div>

          {/* 主体：数值 */}
          <div className="stat-card__body">
            <span className="stat-card__value">
              {prefix && <span className="stat-card__prefix">{prefix}</span>}
              {formattedValue}
              {suffix && <span className="stat-card__suffix">{suffix}</span>}
            </span>
          </div>

          {/* 底部：趋势 */}
          {trend && trendValue !== undefined && (
            <div className="stat-card__footer">
              <span className={`stat-card__trend stat-card__trend--${trend}`}>
                <Icon
                  name={getTrendIcon(trend)}
                  size="xs"
                  color={getTrendColor(trend)}
                />
                <span className="stat-card__trend-value">{trendValue}</span>
              </span>
              <span className="stat-card__trend-label">{i18n.t('common.vsPreviousPeriod', '较上一周期')}</span>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default StatCard;