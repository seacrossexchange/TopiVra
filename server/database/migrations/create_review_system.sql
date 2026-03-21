-- ============================================
-- 评价系统数据库表
-- ============================================

-- 订单评价表
CREATE TABLE IF NOT EXISTS reviews (
  id VARCHAR(36) PRIMARY KEY COMMENT '评价ID',
  order_id VARCHAR(36) NOT NULL COMMENT '订单ID',
  buyer_id VARCHAR(36) NOT NULL COMMENT '买家ID',
  seller_id VARCHAR(36) NOT NULL COMMENT '卖家ID',
  product_id VARCHAR(36) NOT NULL COMMENT '商品ID',
  
  -- 评价内容
  rating INT NOT NULL COMMENT '评分 1-5星',
  content TEXT COMMENT '评价内容',
  images JSON COMMENT '评价图片',
  
  -- 卖家回复
  seller_reply TEXT COMMENT '卖家回复',
  seller_replied_at DATETIME COMMENT '回复时间',
  
  -- 状态
  is_anonymous BOOLEAN DEFAULT FALSE COMMENT '是否匿名',
  is_visible BOOLEAN DEFAULT TRUE COMMENT '是否可见',
  
  -- 时间戳
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  
  INDEX idx_order (order_id),
  INDEX idx_buyer (buyer_id),
  INDEX idx_seller (seller_id),
  INDEX idx_product (product_id),
  INDEX idx_rating (rating),
  INDEX idx_created (created_at),
  
  FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
  FOREIGN KEY (buyer_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (seller_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='订单评价表';

-- 卖家信用评分表
CREATE TABLE IF NOT EXISTS seller_ratings (
  id VARCHAR(36) PRIMARY KEY COMMENT 'ID',
  seller_id VARCHAR(36) NOT NULL UNIQUE COMMENT '卖家ID',
  
  -- 评分统计
  total_reviews INT DEFAULT 0 COMMENT '总评价数',
  average_rating DECIMAL(3,2) DEFAULT 0.00 COMMENT '平均评分',
  
  -- 星级分布
  rating_5_count INT DEFAULT 0 COMMENT '5星数量',
  rating_4_count INT DEFAULT 0 COMMENT '4星数量',
  rating_3_count INT DEFAULT 0 COMMENT '3星数量',
  rating_2_count INT DEFAULT 0 COMMENT '2星数量',
  rating_1_count INT DEFAULT 0 COMMENT '1星数量',
  
  -- 信用等级
  credit_level VARCHAR(20) DEFAULT 'BRONZE' COMMENT '信用等级: BRONZE/SILVER/GOLD/PLATINUM/DIAMOND',
  credit_score INT DEFAULT 0 COMMENT '信用分数',
  
  -- 时间戳
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  
  INDEX idx_seller (seller_id),
  INDEX idx_credit_level (credit_level),
  INDEX idx_average_rating (average_rating),
  
  FOREIGN KEY (seller_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='卖家信用评分表';

-- 评价点赞表
CREATE TABLE IF NOT EXISTS review_likes (
  id VARCHAR(36) PRIMARY KEY COMMENT 'ID',
  review_id VARCHAR(36) NOT NULL COMMENT '评价ID',
  user_id VARCHAR(36) NOT NULL COMMENT '用户ID',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  
  UNIQUE KEY uk_review_user (review_id, user_id),
  INDEX idx_review (review_id),
  INDEX idx_user (user_id),
  
  FOREIGN KEY (review_id) REFERENCES reviews(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='评价点赞表';

-- ============================================
-- 初始化卖家信用评分
-- ============================================
INSERT INTO seller_ratings (id, seller_id)
SELECT UUID(), id FROM users WHERE is_seller = TRUE
ON DUPLICATE KEY UPDATE seller_id = seller_id;






