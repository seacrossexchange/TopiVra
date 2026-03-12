-- 添加角色权限系统

-- 创建角色枚举类型
-- MySQL 不支持枚举类型，Prisma 会自动处理

-- 创建用户角色表
CREATE TABLE `user_roles` (
    `id` VARCHAR(191) NOT NULL,
    `user_id` VARCHAR(191) NOT NULL,
    `role` ENUM('ADMIN', 'SELLER', 'USER') NOT NULL,
    `granted_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `granted_by` VARCHAR(191),

    INDEX `user_roles_user_id_idx`(`user_id`),
    INDEX `user_roles_role_idx`(`role`),
    UNIQUE INDEX `user_roles_user_id_role_key`(`user_id`, `role`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- 添加外键约束
ALTER TABLE `user_roles` ADD CONSTRAINT `user_roles_user_id_fkey` 
    FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- 为所有现有用户添加默认 USER 角色
INSERT INTO `user_roles` (`id`, `user_id`, `role`, `granted_at`)
SELECT UUID(), `id`, 'USER', NOW()
FROM `users`
WHERE NOT EXISTS (
    SELECT 1 FROM `user_roles` WHERE `user_roles`.`user_id` = `users`.`id`
);

-- 为已有的卖家添加 SELLER 角色
INSERT INTO `user_roles` (`id`, `user_id`, `role`, `granted_at`)
SELECT UUID(), `id`, 'SELLER', NOW()
FROM `users`
WHERE `is_seller` = 1
AND NOT EXISTS (
    SELECT 1 FROM `user_roles` 
    WHERE `user_roles`.`user_id` = `users`.`id` 
    AND `user_roles`.`role` = 'SELLER'
);

-- 注意：需要手动为管理员账号添加 ADMIN 角色
-- 示例：
-- INSERT INTO `user_roles` (`id`, `user_id`, `role`, `granted_at`)
-- VALUES (UUID(), 'admin-user-id-here', 'ADMIN', NOW());




