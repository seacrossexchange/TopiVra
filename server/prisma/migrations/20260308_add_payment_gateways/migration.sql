-- 创建支付通道配置表
CREATE TABLE `payment_gateways` (
  `id` VARCHAR(191) NOT NULL,
  `code` VARCHAR(50) NOT NULL,
  `name` VARCHAR(100) NOT NULL,
  `enabled` BOOLEAN NOT NULL DEFAULT false,
  `config` JSON NOT NULL,
  `sort` INT NOT NULL DEFAULT 0,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE INDEX `payment_gateways_code_key`(`code`),
  INDEX `payment_gateways_code_idx`(`code`),
  INDEX `payment_gateways_enabled_idx`(`enabled`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- 插入默认通道配置
INSERT INTO `payment_gateways` (`id`, `code`, `name`, `enabled`, `config`, `sort`, `updated_at`) VALUES
('gateway_yipay', 'YIPAY', '易支付', false, '{"apiUrl":"","mchId":"","apiKey":""}', 1, NOW(3)),
('gateway_mapay', 'MAPAY', '码支付', false, '{"apiUrl":"","appId":"","appSecret":""}', 2, NOW(3)),
('gateway_hupijiao', 'HUPIJIAO', '虎皮椒', false, '{"appId":"","appSecret":""}', 3, NOW(3)),
('gateway_paypal', 'PAYPAL', 'PayPal', false, '{"clientId":"","clientSecret":"","mode":"sandbox"}', 4, NOW(3)),
('gateway_stripe', 'STRIPE', 'Stripe', false, '{"publicKey":"","secretKey":""}', 5, NOW(3));