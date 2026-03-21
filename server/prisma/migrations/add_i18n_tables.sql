-- 创建商品多语言表
CREATE TABLE IF NOT EXISTS `product_translations` (
  `id` VARCHAR(191) NOT NULL,
  `product_id` VARCHAR(191) NOT NULL,
  `language` VARCHAR(10) NOT NULL,
  `title` VARCHAR(200) NOT NULL,
  `description` TEXT NOT NULL,
  `meta_title` VARCHAR(200) NULL,
  `meta_description` VARCHAR(500) NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE INDEX `product_translations_product_id_language_key` (`product_id`, `language`),
  INDEX `product_translations_product_id_idx` (`product_id`),
  INDEX `product_translations_language_idx` (`language`),
  CONSTRAINT `product_translations_product_id_fkey` FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- 创建分类多语言表
CREATE TABLE IF NOT EXISTS `category_translations` (
  `id` VARCHAR(191) NOT NULL,
  `category_id` VARCHAR(191) NOT NULL,
  `language` VARCHAR(10) NOT NULL,
  `name` VARCHAR(100) NOT NULL,
  `description` TEXT NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE INDEX `category_translations_category_id_language_key` (`category_id`, `language`),
  INDEX `category_translations_category_id_idx` (`category_id`),
  INDEX `category_translations_language_idx` (`language`),
  CONSTRAINT `category_translations_category_id_fkey` FOREIGN KEY (`category_id`) REFERENCES `categories`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- 创建博客多语言表
CREATE TABLE IF NOT EXISTS `blog_translations` (
  `id` VARCHAR(191) NOT NULL,
  `blog_id` VARCHAR(191) NOT NULL,
  `language` VARCHAR(10) NOT NULL,
  `title` VARCHAR(200) NOT NULL,
  `excerpt` TEXT NULL,
  `content` TEXT NOT NULL,
  `meta_title` VARCHAR(200) NULL,
  `meta_description` VARCHAR(500) NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE INDEX `blog_translations_blog_id_language_key` (`blog_id`, `language`),
  INDEX `blog_translations_blog_id_idx` (`blog_id`),
  INDEX `blog_translations_language_idx` (`language`),
  CONSTRAINT `blog_translations_blog_id_fkey` FOREIGN KEY (`blog_id`) REFERENCES `blogs`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- 迁移现有数据到多语言表（以中文为默认语言）
INSERT INTO `product_translations` (`id`, `product_id`, `language`, `title`, `description`, `meta_title`, `meta_description`, `created_at`, `updated_at`)
SELECT 
  UUID() as `id`,
  `id` as `product_id`,
  'zh-CN' as `language`,
  `title`,
  `description`,
  `meta_title`,
  `meta_description`,
  `created_at`,
  `updated_at`
FROM `products`
WHERE NOT EXISTS (
  SELECT 1 FROM `product_translations` 
  WHERE `product_translations`.`product_id` = `products`.`id` 
  AND `product_translations`.`language` = 'zh-CN'
);

INSERT INTO `category_translations` (`id`, `category_id`, `language`, `name`, `description`, `created_at`, `updated_at`)
SELECT 
  UUID() as `id`,
  `id` as `category_id`,
  'zh-CN' as `language`,
  `name`,
  `description`,
  `created_at`,
  `updated_at`
FROM `categories`
WHERE NOT EXISTS (
  SELECT 1 FROM `category_translations` 
  WHERE `category_translations`.`category_id` = `categories`.`id` 
  AND `category_translations`.`language` = 'zh-CN'
);

INSERT INTO `blog_translations` (`id`, `blog_id`, `language`, `title`, `excerpt`, `content`, `meta_title`, `meta_description`, `created_at`, `updated_at`)
SELECT 
  UUID() as `id`,
  `id` as `blog_id`,
  'zh-CN' as `language`,
  `title`,
  `excerpt`,
  `content`,
  `meta_title`,
  `meta_description`,
  `created_at`,
  `updated_at`
FROM `blogs`
WHERE NOT EXISTS (
  SELECT 1 FROM `blog_translations` 
  WHERE `blog_translations`.`blog_id` = `blogs`.`id` 
  AND `blog_translations`.`language` = 'zh-CN'
);








