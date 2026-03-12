-- CreateTable
CREATE TABLE `users` (
    `id` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `password_hash` VARCHAR(191) NULL,
    `username` VARCHAR(191) NOT NULL,
    `avatar` VARCHAR(191) NULL,
    `phone` VARCHAR(191) NULL,
    `google_id` VARCHAR(191) NULL,
    `telegram_id` VARCHAR(191) NULL,
    `telegram_username` VARCHAR(191) NULL,
    `status` ENUM('ACTIVE', 'SUSPENDED', 'BANNED', 'DELETED') NOT NULL DEFAULT 'ACTIVE',
    `email_verified` BOOLEAN NOT NULL DEFAULT false,
    `is_seller` BOOLEAN NOT NULL DEFAULT false,
    `language` VARCHAR(191) NOT NULL DEFAULT 'zh-CN',
    `currency` VARCHAR(191) NOT NULL DEFAULT 'USD',
    `timezone` VARCHAR(191) NOT NULL DEFAULT 'Asia/Shanghai',
    `two_factor_enabled` BOOLEAN NOT NULL DEFAULT false,
    `two_factor_secret` VARCHAR(191) NULL,
    `recovery_codes` JSON NULL,
    `last_login_at` DATETIME(3) NULL,
    `last_login_ip` VARCHAR(191) NULL,
    `login_attempts` INTEGER NOT NULL DEFAULT 0,
    `locked_until` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `users_email_key`(`email`),
    UNIQUE INDEX `users_google_id_key`(`google_id`),
    UNIQUE INDEX `users_telegram_id_key`(`telegram_id`),
    INDEX `users_email_idx`(`email`),
    INDEX `users_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `seller_profiles` (
    `id` VARCHAR(191) NOT NULL,
    `user_id` VARCHAR(191) NOT NULL,
    `shop_name` VARCHAR(191) NOT NULL,
    `shop_description` VARCHAR(191) NULL,
    `shop_avatar` VARCHAR(191) NULL,
    `shop_banner` VARCHAR(191) NULL,
    `real_name` VARCHAR(191) NULL,
    `id_card_number` VARCHAR(191) NULL,
    `contact_telegram` VARCHAR(191) NULL,
    `contact_email` VARCHAR(191) NULL,
    `level` ENUM('NORMAL', 'VERIFIED', 'PREMIUM') NOT NULL DEFAULT 'NORMAL',
    `application_status` ENUM('PENDING', 'APPROVED', 'REJECTED') NOT NULL DEFAULT 'PENDING',
    `application_note` VARCHAR(191) NULL,
    `approved_at` DATETIME(3) NULL,
    `approved_by` VARCHAR(191) NULL,
    `balance` DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    `frozen_balance` DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    `total_sales` DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    `total_withdrawn` DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    `product_count` INTEGER NOT NULL DEFAULT 0,
    `order_count` INTEGER NOT NULL DEFAULT 0,
    `sold_count` INTEGER NOT NULL DEFAULT 0,
    `rating` DECIMAL(2, 1) NOT NULL DEFAULT 5.0,
    `rating_count` INTEGER NOT NULL DEFAULT 0,
    `commission_rate` DECIMAL(4, 2) NOT NULL DEFAULT 10.00,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `seller_profiles_user_id_key`(`user_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `categories` (
    `id` VARCHAR(191) NOT NULL,
    `parent_id` VARCHAR(191) NULL,
    `name` VARCHAR(191) NOT NULL,
    `slug` VARCHAR(191) NOT NULL,
    `icon` VARCHAR(191) NULL,
    `color` VARCHAR(191) NULL,
    `description` VARCHAR(191) NULL,
    `sort_order` INTEGER NOT NULL DEFAULT 0,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `product_count` INTEGER NOT NULL DEFAULT 0,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `categories_slug_key`(`slug`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `products` (
    `id` VARCHAR(191) NOT NULL,
    `seller_id` VARCHAR(191) NOT NULL,
    `category_id` VARCHAR(191) NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `description` TEXT NOT NULL,
    `platform` VARCHAR(191) NOT NULL,
    `account_type` VARCHAR(191) NULL,
    `region` VARCHAR(191) NULL,
    `tags` JSON NULL,
    `attributes` JSON NULL,
    `price` DECIMAL(10, 2) NOT NULL,
    `original_price` DECIMAL(10, 2) NULL,
    `currency` VARCHAR(191) NOT NULL DEFAULT 'USD',
    `stock` INTEGER NOT NULL DEFAULT 1,
    `sold_count` INTEGER NOT NULL DEFAULT 0,
    `images` JSON NULL,
    `thumbnail_url` VARCHAR(191) NULL,
    `status` ENUM('DRAFT', 'PENDING', 'APPROVED', 'REJECTED', 'ON_SALE', 'OFF_SALE', 'SOLD_OUT') NOT NULL DEFAULT 'DRAFT',
    `reject_reason` VARCHAR(191) NULL,
    `audited_by` VARCHAR(191) NULL,
    `audited_at` DATETIME(3) NULL,
    `meta_title` VARCHAR(191) NULL,
    `meta_description` VARCHAR(191) NULL,
    `view_count` INTEGER NOT NULL DEFAULT 0,
    `favorite_count` INTEGER NOT NULL DEFAULT 0,
    `published_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `products_seller_id_idx`(`seller_id`),
    INDEX `products_category_id_idx`(`category_id`),
    INDEX `products_platform_idx`(`platform`),
    INDEX `products_status_idx`(`status`),
    INDEX `products_price_idx`(`price`),
    INDEX `products_sold_count_idx`(`sold_count`),
    INDEX `products_seller_id_status_idx`(`seller_id`, `status`),
    INDEX `products_platform_status_idx`(`platform`, `status`),
    INDEX `products_created_at_idx`(`created_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `orders` (
    `id` VARCHAR(191) NOT NULL,
    `order_no` VARCHAR(191) NOT NULL,
    `buyer_id` VARCHAR(191) NOT NULL,
    `total_amount` DECIMAL(10, 2) NOT NULL,
    `pay_amount` DECIMAL(10, 2) NOT NULL,
    `commission` DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    `currency` VARCHAR(191) NOT NULL DEFAULT 'USD',
    `payment_method` VARCHAR(191) NULL,
    `payment_status` ENUM('UNPAID', 'PAYING', 'PAID', 'REFUNDED', 'PARTIAL_REFUND') NOT NULL DEFAULT 'UNPAID',
    `paid_at` DATETIME(3) NULL,
    `order_status` ENUM('CREATED', 'PENDING_PAYMENT', 'PAID', 'DELIVERED', 'COMPLETED', 'REFUNDING', 'REFUNDED', 'CANCELLED', 'CLOSED') NOT NULL DEFAULT 'CREATED',
    `refund_reason` TEXT NULL,
    `refund_amount` DECIMAL(10, 2) NULL,
    `refunded_at` DATETIME(3) NULL,
    `buyer_remark` VARCHAR(191) NULL,
    `admin_remark` VARCHAR(191) NULL,
    `auto_cancel_at` DATETIME(3) NULL,
    `auto_confirm_at` DATETIME(3) NULL,
    `completed_at` DATETIME(3) NULL,
    `cancelled_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `orders_order_no_key`(`order_no`),
    INDEX `orders_buyer_id_idx`(`buyer_id`),
    INDEX `orders_order_status_idx`(`order_status`),
    INDEX `orders_payment_status_idx`(`payment_status`),
    INDEX `orders_buyer_id_order_status_idx`(`buyer_id`, `order_status`),
    INDEX `orders_created_at_idx`(`created_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `order_items` (
    `id` VARCHAR(191) NOT NULL,
    `order_id` VARCHAR(191) NOT NULL,
    `product_id` VARCHAR(191) NOT NULL,
    `seller_id` VARCHAR(191) NOT NULL,
    `product_title` VARCHAR(191) NOT NULL,
    `product_snapshot` JSON NULL,
    `quantity` INTEGER NOT NULL DEFAULT 1,
    `unit_price` DECIMAL(10, 2) NOT NULL,
    `subtotal` DECIMAL(10, 2) NOT NULL,
    `delivered_credentials` JSON NULL,
    `delivered_at` DATETIME(3) NULL,
    `delivery_confirmed` BOOLEAN NOT NULL DEFAULT false,
    `confirmed_at` DATETIME(3) NULL,
    `seller_amount` DECIMAL(10, 2) NOT NULL,
    `commission_amount` DECIMAL(10, 2) NOT NULL,
    `commission_rate` DECIMAL(4, 2) NOT NULL,
    `settled` BOOLEAN NOT NULL DEFAULT false,
    `settled_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `order_items_order_id_idx`(`order_id`),
    INDEX `order_items_seller_id_idx`(`seller_id`),
    INDEX `order_items_product_id_idx`(`product_id`),
    INDEX `order_items_seller_id_settled_idx`(`seller_id`, `settled`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `payments` (
    `id` VARCHAR(191) NOT NULL,
    `payment_no` VARCHAR(191) NOT NULL,
    `order_id` VARCHAR(191) NOT NULL,
    `user_id` VARCHAR(191) NOT NULL,
    `method` VARCHAR(191) NOT NULL,
    `amount` DECIMAL(10, 2) NOT NULL,
    `currency` VARCHAR(191) NOT NULL,
    `status` ENUM('PENDING', 'PROCESSING', 'SUCCESS', 'FAILED', 'EXPIRED', 'REFUNDED') NOT NULL DEFAULT 'PENDING',
    `provider_order_id` VARCHAR(191) NULL,
    `provider_data` JSON NULL,
    `wallet_address` VARCHAR(191) NULL,
    `tx_hash` VARCHAR(191) NULL,
    `usdt_amount` DECIMAL(12, 6) NULL,
    `exchange_rate` DECIMAL(10, 4) NULL,
    `expired_at` DATETIME(3) NULL,
    `paid_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `payments_payment_no_key`(`payment_no`),
    INDEX `payments_order_id_idx`(`order_id`),
    INDEX `payments_status_idx`(`status`),
    INDEX `payments_method_idx`(`method`),
    INDEX `payments_status_created_at_idx`(`status`, `created_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `cart_items` (
    `id` VARCHAR(191) NOT NULL,
    `user_id` VARCHAR(191) NOT NULL,
    `product_id` VARCHAR(191) NOT NULL,
    `quantity` INTEGER NOT NULL DEFAULT 1,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `cart_items_user_id_product_id_key`(`user_id`, `product_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `tickets` (
    `id` VARCHAR(191) NOT NULL,
    `ticket_no` VARCHAR(191) NOT NULL,
    `user_id` VARCHAR(191) NOT NULL,
    `order_id` VARCHAR(191) NULL,
    `type` ENUM('ORDER_ISSUE', 'ACCOUNT_ISSUE', 'PAYMENT_ISSUE', 'SUGGESTION', 'OTHER') NOT NULL,
    `subject` VARCHAR(191) NOT NULL,
    `content` TEXT NOT NULL,
    `priority` ENUM('URGENT', 'HIGH', 'MEDIUM', 'LOW') NOT NULL DEFAULT 'MEDIUM',
    `status` ENUM('OPEN', 'IN_PROGRESS', 'WAITING', 'RESOLVED', 'CLOSED') NOT NULL DEFAULT 'OPEN',
    `sla_level` VARCHAR(191) NULL,
    `sla_deadline` DATETIME(3) NULL,
    `assigned_to` VARCHAR(191) NULL,
    `resolved_at` DATETIME(3) NULL,
    `closed_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `tickets_ticket_no_key`(`ticket_no`),
    INDEX `tickets_user_id_status_idx`(`user_id`, `status`),
    INDEX `tickets_status_priority_idx`(`status`, `priority`),
    INDEX `tickets_assigned_to_idx`(`assigned_to`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ticket_messages` (
    `id` VARCHAR(191) NOT NULL,
    `ticket_id` VARCHAR(191) NOT NULL,
    `sender_id` VARCHAR(191) NOT NULL,
    `content` TEXT NOT NULL,
    `is_internal` BOOLEAN NOT NULL DEFAULT false,
    `attachments` JSON NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `ticket_messages_ticket_id_idx`(`ticket_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `reviews` (
    `id` VARCHAR(191) NOT NULL,
    `user_id` VARCHAR(191) NOT NULL,
    `product_id` VARCHAR(191) NOT NULL,
    `seller_id` VARCHAR(191) NOT NULL,
    `order_id` VARCHAR(191) NOT NULL,
    `rating` INTEGER NOT NULL,
    `content` TEXT NULL,
    `tags` JSON NULL,
    `is_anonymous` BOOLEAN NOT NULL DEFAULT false,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `reviews_order_id_key`(`order_id`),
    INDEX `reviews_product_id_created_at_idx`(`product_id`, `created_at`),
    INDEX `reviews_seller_id_idx`(`seller_id`),
    INDEX `reviews_rating_idx`(`rating`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `favorites` (
    `id` VARCHAR(191) NOT NULL,
    `user_id` VARCHAR(191) NOT NULL,
    `product_id` VARCHAR(191) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `favorites_user_id_product_id_key`(`user_id`, `product_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `notifications` (
    `id` VARCHAR(191) NOT NULL,
    `user_id` VARCHAR(191) NOT NULL,
    `type` VARCHAR(191) NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `content` TEXT NOT NULL,
    `data` JSON NULL,
    `is_read` BOOLEAN NOT NULL DEFAULT false,
    `read_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `notifications_user_id_is_read_idx`(`user_id`, `is_read`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `withdrawals` (
    `id` VARCHAR(191) NOT NULL,
    `withdrawal_no` VARCHAR(191) NOT NULL,
    `seller_id` VARCHAR(191) NOT NULL,
    `amount` DECIMAL(10, 2) NOT NULL,
    `fee` DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    `actual_amount` DECIMAL(10, 2) NOT NULL,
    `currency` VARCHAR(191) NOT NULL DEFAULT 'USD',
    `method` VARCHAR(191) NOT NULL,
    `account_info` JSON NOT NULL,
    `status` ENUM('PENDING', 'APPROVED', 'PROCESSING', 'COMPLETED', 'REJECTED') NOT NULL DEFAULT 'PENDING',
    `reject_reason` VARCHAR(191) NULL,
    `audited_by` VARCHAR(191) NULL,
    `audited_at` DATETIME(3) NULL,
    `completed_at` DATETIME(3) NULL,
    `transfer_proof` VARCHAR(191) NULL,
    `tx_hash` VARCHAR(191) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `withdrawals_withdrawal_no_key`(`withdrawal_no`),
    INDEX `withdrawals_seller_id_idx`(`seller_id`),
    INDEX `withdrawals_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `seller_transactions` (
    `id` VARCHAR(191) NOT NULL,
    `seller_id` VARCHAR(191) NOT NULL,
    `type` ENUM('INCOME', 'COMMISSION', 'WITHDRAWAL', 'REFUND', 'ADJUSTMENT') NOT NULL,
    `amount` DECIMAL(10, 2) NOT NULL,
    `balance_after` DECIMAL(12, 2) NOT NULL,
    `currency` VARCHAR(191) NOT NULL DEFAULT 'USD',
    `order_id` VARCHAR(191) NULL,
    `order_item_id` VARCHAR(191) NULL,
    `withdrawal_id` VARCHAR(191) NULL,
    `description` VARCHAR(191) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `seller_transactions_seller_id_idx`(`seller_id`),
    INDEX `seller_transactions_type_idx`(`type`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `system_configs` (
    `id` VARCHAR(191) NOT NULL,
    `key` VARCHAR(191) NOT NULL,
    `value` JSON NOT NULL,
    `description` VARCHAR(191) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `system_configs_key_key`(`key`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `blogs` (
    `id` VARCHAR(191) NOT NULL,
    `author_id` VARCHAR(191) NOT NULL,
    `category_id` VARCHAR(191) NULL,
    `title` VARCHAR(191) NOT NULL,
    `slug` VARCHAR(191) NOT NULL,
    `excerpt` TEXT NULL,
    `content` TEXT NOT NULL,
    `cover_image` VARCHAR(191) NULL,
    `status` ENUM('DRAFT', 'PUBLISHED', 'ARCHIVED') NOT NULL DEFAULT 'DRAFT',
    `meta_title` VARCHAR(191) NULL,
    `meta_description` VARCHAR(191) NULL,
    `view_count` INTEGER NOT NULL DEFAULT 0,
    `published_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `blogs_slug_key`(`slug`),
    INDEX `blogs_author_id_idx`(`author_id`),
    INDEX `blogs_category_id_idx`(`category_id`),
    INDEX `blogs_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `audit_logs` (
    `id` VARCHAR(191) NOT NULL,
    `operator_id` VARCHAR(191) NOT NULL,
    `operator_role` VARCHAR(191) NOT NULL,
    `module` VARCHAR(191) NOT NULL,
    `action` VARCHAR(191) NOT NULL,
    `target_type` VARCHAR(191) NULL,
    `target_id` VARCHAR(191) NULL,
    `description` VARCHAR(191) NULL,
    `before_data` JSON NULL,
    `after_data` JSON NULL,
    `ip_address` VARCHAR(191) NULL,
    `user_agent` VARCHAR(191) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `audit_logs_operator_id_idx`(`operator_id`),
    INDEX `audit_logs_module_action_idx`(`module`, `action`),
    INDEX `audit_logs_target_type_target_id_idx`(`target_type`, `target_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `seller_profiles` ADD CONSTRAINT `seller_profiles_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `categories` ADD CONSTRAINT `categories_parent_id_fkey` FOREIGN KEY (`parent_id`) REFERENCES `categories`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `products` ADD CONSTRAINT `products_seller_id_fkey` FOREIGN KEY (`seller_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `products` ADD CONSTRAINT `products_category_id_fkey` FOREIGN KEY (`category_id`) REFERENCES `categories`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `orders` ADD CONSTRAINT `orders_buyer_id_fkey` FOREIGN KEY (`buyer_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `order_items` ADD CONSTRAINT `order_items_order_id_fkey` FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `order_items` ADD CONSTRAINT `order_items_product_id_fkey` FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `order_items` ADD CONSTRAINT `order_items_seller_id_fkey` FOREIGN KEY (`seller_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `payments` ADD CONSTRAINT `payments_order_id_fkey` FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `cart_items` ADD CONSTRAINT `cart_items_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `cart_items` ADD CONSTRAINT `cart_items_product_id_fkey` FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `tickets` ADD CONSTRAINT `tickets_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `tickets` ADD CONSTRAINT `tickets_assigned_to_fkey` FOREIGN KEY (`assigned_to`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ticket_messages` ADD CONSTRAINT `ticket_messages_ticket_id_fkey` FOREIGN KEY (`ticket_id`) REFERENCES `tickets`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ticket_messages` ADD CONSTRAINT `ticket_messages_sender_id_fkey` FOREIGN KEY (`sender_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `reviews` ADD CONSTRAINT `reviews_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `reviews` ADD CONSTRAINT `reviews_product_id_fkey` FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `reviews` ADD CONSTRAINT `reviews_order_id_fkey` FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `favorites` ADD CONSTRAINT `favorites_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `favorites` ADD CONSTRAINT `favorites_product_id_fkey` FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `notifications` ADD CONSTRAINT `notifications_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `withdrawals` ADD CONSTRAINT `withdrawals_seller_id_fkey` FOREIGN KEY (`seller_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `seller_transactions` ADD CONSTRAINT `seller_transactions_seller_id_fkey` FOREIGN KEY (`seller_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `blogs` ADD CONSTRAINT `blogs_author_id_fkey` FOREIGN KEY (`author_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `blogs` ADD CONSTRAINT `blogs_category_id_fkey` FOREIGN KEY (`category_id`) REFERENCES `categories`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
