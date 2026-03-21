-- C2C 平台工单系统迁移脚本

-- 1. 创建工单类型枚举
CREATE TABLE IF NOT EXISTS `c2c_tickets` (
  `id` VARCHAR(191) NOT NULL,
  `ticket_no` VARCHAR(191) NOT NULL,
  `type` ENUM('REFUND', 'DM', 'SUPPORT', 'COMPLAINT') NOT NULL DEFAULT 'SUPPORT',
  `status` ENUM(
    'PENDING',
    'SELLER_REVIEWING',
    'SELLER_AGREED',
    'SELLER_REJECTED',
    'ADMIN_REVIEWING',
    'ADMIN_APPROVED',
    'ADMIN_REJECTED',
    'COMPLETED',
    'CLOSED',
    'CANCELLED'
  ) NOT NULL DEFAULT 'PENDING',
  
  -- 关联关系
  `order_id` VARCHAR(191) NULL,
  `buyer_id` VARCHAR(191) NOT NULL,
  `seller_id` VARCHAR(191) NULL,
  `admin_id` VARCHAR(191) NULL,
  
  -- 工单信息
  `subject` VARCHAR(500) NOT NULL,
  `priority` ENUM('LOW', 'MEDIUM', 'HIGH', 'URGENT') NOT NULL DEFAULT 'MEDIUM',
  
  -- 退款相关
  `refund_amount` DECIMAL(10, 2) NULL,
  `refund_reason` TEXT NULL,
  `refund_evidence` JSON NULL,
  
  -- 时间节点
  `seller_respond_deadline` DATETIME(3) NULL,
  `seller_responded_at` DATETIME(3) NULL,
  `admin_reviewed_at` DATETIME(3) NULL,
  `completed_at` DATETIME(3) NULL,
  `closed_at` DATETIME(3) NULL,
  `cancelled_at` DATETIME(3) NULL,
  
  -- 统计
  `unread_buyer` INT NOT NULL DEFAULT 0,
  `unread_seller` INT NOT NULL DEFAULT 0,
  `unread_admin` INT NOT NULL DEFAULT 0,
  
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL,
  
  PRIMARY KEY (`id`),
  UNIQUE INDEX `c2c_tickets_ticket_no_key`(`ticket_no`),
  INDEX `c2c_tickets_buyer_id_status_idx`(`buyer_id`, `status`),
  INDEX `c2c_tickets_seller_id_status_idx`(`seller_id`, `status`),
  INDEX `c2c_tickets_admin_id_status_idx`(`admin_id`, `status`),
  INDEX `c2c_tickets_order_id_idx`(`order_id`),
  INDEX `c2c_tickets_status_created_at_idx`(`status`, `created_at`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- 2. 创建工单消息表
CREATE TABLE IF NOT EXISTS `c2c_ticket_messages` (
  `id` VARCHAR(191) NOT NULL,
  `ticket_id` VARCHAR(191) NOT NULL,
  `sender_id` VARCHAR(191) NOT NULL,
  `sender_role` ENUM('BUYER', 'SELLER', 'ADMIN', 'SYSTEM') NOT NULL,
  `content` TEXT NOT NULL,
  `attachments` JSON NULL,
  `is_internal` BOOLEAN NOT NULL DEFAULT false,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  
  PRIMARY KEY (`id`),
  INDEX `c2c_ticket_messages_ticket_id_idx`(`ticket_id`),
  INDEX `c2c_ticket_messages_sender_id_idx`(`sender_id`),
  INDEX `c2c_ticket_messages_created_at_idx`(`created_at`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- 3. 添加外键约束
ALTER TABLE `c2c_tickets`
  ADD CONSTRAINT `c2c_tickets_order_id_fkey` FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `c2c_tickets_buyer_id_fkey` FOREIGN KEY (`buyer_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `c2c_tickets_seller_id_fkey` FOREIGN KEY (`seller_id`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `c2c_tickets_admin_id_fkey` FOREIGN KEY (`admin_id`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `c2c_ticket_messages`
  ADD CONSTRAINT `c2c_ticket_messages_ticket_id_fkey` FOREIGN KEY (`ticket_id`) REFERENCES `c2c_tickets`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `c2c_ticket_messages_sender_id_fkey` FOREIGN KEY (`sender_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;



