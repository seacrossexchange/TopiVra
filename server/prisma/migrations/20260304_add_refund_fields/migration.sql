-- Add refund fields to Order table
ALTER TABLE `Order` ADD COLUMN `refundStatus` ENUM('NONE', 'PENDING', 'APPROVED', 'REJECTED') DEFAULT 'NONE';
ALTER TABLE `Order` ADD COLUMN `refundReason` TEXT;
ALTER TABLE `Order` ADD COLUMN `refundReasonType` VARCHAR(50);
ALTER TABLE `Order` ADD COLUMN `refundEvidence` JSON;
ALTER TABLE `Order` ADD COLUMN `refundAmount` DECIMAL(10,2);
ALTER TABLE `Order` ADD COLUMN `refundRejectNote` TEXT;
ALTER TABLE `Order` ADD COLUMN `refundRequestAt` DATETIME(3);
ALTER TABLE `Order` ADD COLUMN `refundReviewedAt` DATETIME(3);
ALTER TABLE `Order` ADD COLUMN `refundReviewerId` VARCHAR(191);
