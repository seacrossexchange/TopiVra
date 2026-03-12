/**
 * PageTransition 页面过渡动效组件
 * 使用 Framer Motion 实现页面切换动画
 */

import React, { type ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export interface PageTransitionProps {
  /** 子元素 */
  children: ReactNode;
  /** 是否显示 */
  visible?: boolean;
  /** 动画模式 */
  mode?: 'fade' | 'slide-up' | 'slide-left' | 'scale';
  /** 动画时长 (ms) */
  duration?: number;
  /** 自定义类名 */
  className?: string;
}

// 动画变体配置
const variants = {
  fade: {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    exit: { opacity: 0 },
  },
  'slide-up': {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -20 },
  },
  'slide-left': {
    initial: { opacity: 0, x: 20 },
    animate: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: -20 },
  },
  scale: {
    initial: { opacity: 0, scale: 0.95 },
    animate: { opacity: 1, scale: 1 },
    exit: { opacity: 0, scale: 0.95 },
  },
};

/**
 * PageTransition 页面过渡组件
 * 
 * @example
 * // 基础用法
 * <PageTransition>
 *   <YourPageContent />
 * </PageTransition>
 * 
 * // 使用不同模式
 * <PageTransition mode="slide-up">
 *   <YourPageContent />
 * </PageTransition>
 */
export const PageTransition: React.FC<PageTransitionProps> = ({
  children,
  visible = true,
  mode = 'fade',
  duration = 200,
  className = '',
}) => {
  const variant = variants[mode];

  return (
    <AnimatePresence mode="wait">
      {visible && (
        <motion.div
          className={className}
          initial={variant.initial}
          animate={variant.animate}
          exit={variant.exit}
          transition={{
            duration: duration / 1000,
            ease: [0.4, 0, 0.2, 1], // ease-out
          }}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  );
};

// ========== 列表动画组件 ==========

export interface ListTransitionProps<T> {
  /** 列表数据 */
  items: T[];
  /** 渲染函数 */
  renderItem: (item: T, index: number) => ReactNode;
  /** 获取唯一 key */
  getKey: (item: T) => string | number;
  /** 每项延迟 (ms) */
  staggerDelay?: number;
  /** 动画时长 (ms) */
  duration?: number;
  /** 自定义类名 */
  className?: string;
}

/**
 * ListTransition 列表交错动画组件
 * 
 * @example
 * <ListTransition
 *   items={products}
 *   getKey={(p) => p.id}
 *   renderItem={(p) => <ProductCard {...p} />}
 *   staggerDelay={50}
 * />
 */
export const ListTransition = <T,>({
  items,
  renderItem,
  getKey,
  staggerDelay = 50,
  duration = 200,
  className = '',
}: ListTransitionProps<T>) => {
  return (
    <div className={className}>
      <AnimatePresence>
        {items.map((item, index) => (
          <motion.div
            key={getKey(item)}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{
              duration: duration / 1000,
              delay: (index * staggerDelay) / 1000,
              ease: [0.4, 0, 0.2, 1],
            }}
          >
            {renderItem(item, index)}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
};

// ========== 淡入组件 ==========

export interface FadeInProps {
  children: ReactNode;
  /** 延迟 (ms) */
  delay?: number;
  /** 动画时长 (ms) */
  duration?: number;
  /** 自定义类名 */
  className?: string;
}

/**
 * FadeIn 简单淡入动画
 */
export const FadeIn: React.FC<FadeInProps> = ({
  children,
  delay = 0,
  duration = 200,
  className = '',
}) => {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{
        duration: duration / 1000,
        delay: delay / 1000,
        ease: 'easeOut',
      }}
    >
      {children}
    </motion.div>
  );
};

export default PageTransition;