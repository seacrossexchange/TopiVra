-- 增强博客系统迁移

-- 修改 Blog 表
ALTER TABLE `blogs` 
  MODIFY COLUMN `title` VARCHAR(200) NOT NULL,
  MODIFY COLUMN `slug` VARCHAR(200) NOT NULL,
  MODIFY COLUMN `cover_image` VARCHAR(500),
  MODIFY COLUMN `meta_title` VARCHAR(200),
  MODIFY COLUMN `meta_description` VARCHAR(500),
  ADD COLUMN `like_count` INT NOT NULL DEFAULT 0,
  ADD COLUMN `comment_count` INT NOT NULL DEFAULT 0,
  ADD COLUMN `reading_time` INT NOT NULL DEFAULT 0 COMMENT '阅读时间（分钟）',
  ADD COLUMN `content_type` ENUM('MARKDOWN', 'HTML', 'RICH_TEXT') NOT NULL DEFAULT 'MARKDOWN';

-- 添加索引
CREATE INDEX `blogs_published_at_idx` ON `blogs`(`published_at`);
CREATE INDEX `blogs_view_count_idx` ON `blogs`(`view_count`);

-- 创建标签表
CREATE TABLE `tags` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(50) NOT NULL,
    `slug` VARCHAR(50) NOT NULL,
    `description` VARCHAR(200),
    `color` VARCHAR(20),
    `post_count` INT NOT NULL DEFAULT 0,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `tags_name_key`(`name`),
    UNIQUE INDEX `tags_slug_key`(`slug`),
    INDEX `tags_post_count_idx`(`post_count`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- 创建博客-标签关联表
CREATE TABLE `blog_tags` (
    `id` VARCHAR(191) NOT NULL,
    `blog_id` VARCHAR(191) NOT NULL,
    `tag_id` VARCHAR(191) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `blog_tags_blog_id_idx`(`blog_id`),
    INDEX `blog_tags_tag_id_idx`(`tag_id`),
    UNIQUE INDEX `blog_tags_blog_id_tag_id_key`(`blog_id`, `tag_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- 创建博客评论表
CREATE TABLE `blog_comments` (
    `id` VARCHAR(191) NOT NULL,
    `blog_id` VARCHAR(191) NOT NULL,
    `user_id` VARCHAR(191) NOT NULL,
    `parent_id` VARCHAR(191),
    `content` TEXT NOT NULL,
    `is_approved` BOOLEAN NOT NULL DEFAULT true,
    `like_count` INT NOT NULL DEFAULT 0,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `blog_comments_blog_id_idx`(`blog_id`),
    INDEX `blog_comments_user_id_idx`(`user_id`),
    INDEX `blog_comments_parent_id_idx`(`parent_id`),
    INDEX `blog_comments_created_at_idx`(`created_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- 创建博客点赞表
CREATE TABLE `blog_likes` (
    `id` VARCHAR(191) NOT NULL,
    `blog_id` VARCHAR(191) NOT NULL,
    `user_id` VARCHAR(191) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `blog_likes_blog_id_idx`(`blog_id`),
    INDEX `blog_likes_user_id_idx`(`user_id`),
    UNIQUE INDEX `blog_likes_blog_id_user_id_key`(`blog_id`, `user_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- 创建博客浏览记录表（防刷）
CREATE TABLE `blog_views` (
    `id` VARCHAR(191) NOT NULL,
    `blog_id` VARCHAR(191) NOT NULL,
    `user_id` VARCHAR(191),
    `ip_address` VARCHAR(45) NOT NULL,
    `user_agent` VARCHAR(500),
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `blog_views_blog_id_idx`(`blog_id`),
    INDEX `blog_views_user_id_idx`(`user_id`),
    INDEX `blog_views_ip_address_blog_id_idx`(`ip_address`, `blog_id`),
    INDEX `blog_views_created_at_idx`(`created_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- 添加外键约束
ALTER TABLE `blog_tags` ADD CONSTRAINT `blog_tags_blog_id_fkey` FOREIGN KEY (`blog_id`) REFERENCES `blogs`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `blog_tags` ADD CONSTRAINT `blog_tags_tag_id_fkey` FOREIGN KEY (`tag_id`) REFERENCES `tags`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `blog_comments` ADD CONSTRAINT `blog_comments_blog_id_fkey` FOREIGN KEY (`blog_id`) REFERENCES `blogs`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `blog_comments` ADD CONSTRAINT `blog_comments_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `blog_comments` ADD CONSTRAINT `blog_comments_parent_id_fkey` FOREIGN KEY (`parent_id`) REFERENCES `blog_comments`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `blog_likes` ADD CONSTRAINT `blog_likes_blog_id_fkey` FOREIGN KEY (`blog_id`) REFERENCES `blogs`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `blog_likes` ADD CONSTRAINT `blog_likes_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `blog_views` ADD CONSTRAINT `blog_views_blog_id_fkey` FOREIGN KEY (`blog_id`) REFERENCES `blogs`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;




