-- 会员等级配置表
CREATE TABLE `membership_tiers` (
  `id` VARCHAR(191) NOT NULL,
  `level` INT NOT NULL,
  `name` VARCHAR(191) NOT NULL,
  `name_en` VARCHAR(191) NOT NULL,
  `min_spent` DECIMAL(12, 2) NOT NULL,
  `discount` DECIMAL(4, 2) NOT NULL,
  `points_rate` DECIMAL(4, 2) NOT NULL,
  `benefits` JSON NOT NULL,
  `is_active` BOOLEAN NOT NULL DEFAULT true,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE INDEX `membership_tiers_level_key`(`level`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- 用户积分表
CREATE TABLE `user_points` (
  `id` VARCHAR(191) NOT NULL,
  `user_id` VARCHAR(191) NOT NULL,
  `points` INT NOT NULL DEFAULT 0,
  `total_earned` INT NOT NULL DEFAULT 0,
  `total_used` INT NOT NULL DEFAULT 0,
  `expires_at` DATETIME(3) NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE INDEX `user_points_user_id_key`(`user_id`),
  INDEX `user_points_user_id_idx`(`user_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- 积分交易记录表
CREATE TABLE `points_transactions` (
  `id` VARCHAR(191) NOT NULL,
  `user_id` VARCHAR(191) NOT NULL,
  `points` INT NOT NULL,
  `type` ENUM('EARN', 'SPEND', 'EXPIRE', 'REFUND') NOT NULL,
  `reason` VARCHAR(191) NOT NULL,
  `order_id` VARCHAR(191) NULL,
  `expires_at` DATETIME(3) NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  INDEX `points_transactions_user_id_idx`(`user_id`),
  INDEX `points_transactions_created_at_idx`(`created_at`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- 推荐记录表
CREATE TABLE `referral_records` (
  `id` VARCHAR(191) NOT NULL,
  `referrer_id` VARCHAR(191) NOT NULL,
  `referee_id` VARCHAR(191) NOT NULL,
  `reward` DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
  `status` ENUM('PENDING', 'COMPLETED', 'CANCELLED') NOT NULL DEFAULT 'PENDING',
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `rewarded_at` DATETIME(3) NULL,
  PRIMARY KEY (`id`),
  INDEX `referral_records_referrer_id_idx`(`referrer_id`),
  INDEX `referral_records_referee_id_idx`(`referee_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- 插入默认会员等级
INSERT INTO `membership_tiers` (`id`, `level`, `name`, `name_en`, `min_spent`, `discount`, `points_rate`, `benefits`, `is_active`, `created_at`, `updated_at`) VALUES
(UUID(), 0, '普通会员', 'Regular', 0.00, 0.00, 1.00, '{"features": ["基础购买"]}', true, NOW(), NOW()),
(UUID(), 1, '银牌会员', 'Silver', 100.00, 5.00, 1.20, '{"features": ["5%折扣", "1.2倍积分"]}', true, NOW(), NOW()),
(UUID(), 2, '金牌会员', 'Gold', 500.00, 10.00, 1.50, '{"features": ["10%折扣", "1.5倍积分", "优先客服"]}', true, NOW(), NOW()),
(UUID(), 3, 'VIP会员', 'VIP', 2000.00, 15.00, 2.00, '{"features": ["15%折扣", "2倍积分", "专属客服", "生日礼包"]}', true, NOW(), NOW());
