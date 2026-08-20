/*
  Warnings:

  - You are about to drop the column `commission_computation` on the `vtu_transactions` table. All the data in the column will be lost.
  - You are about to drop the column `commission_metadata` on the `vtu_transactions` table. All the data in the column will be lost.
  - You are about to drop the column `commission_rate` on the `vtu_transactions` table. All the data in the column will be lost.
  - You are about to drop the column `commission_type` on the `vtu_transactions` table. All the data in the column will be lost.
  - You are about to drop the column `cost_price` on the `vtu_transactions` table. All the data in the column will be lost.
  - You are about to drop the column `effective_rate` on the `vtu_transactions` table. All the data in the column will be lost.
  - You are about to drop the column `gross_profit` on the `vtu_transactions` table. All the data in the column will be lost.
  - You are about to drop the column `net_profit` on the `vtu_transactions` table. All the data in the column will be lost.
  - You are about to drop the column `platform_commission` on the `vtu_transactions` table. All the data in the column will be lost.
  - You are about to drop the column `platform_total_amount` on the `vtu_transactions` table. All the data in the column will be lost.
  - You are about to drop the column `profit_margin` on the `vtu_transactions` table. All the data in the column will be lost.
  - You are about to drop the column `selling_price` on the `vtu_transactions` table. All the data in the column will be lost.
  - You are about to drop the column `total_commission` on the `vtu_transactions` table. All the data in the column will be lost.
  - You are about to drop the column `vendor_commission` on the `vtu_transactions` table. All the data in the column will be lost.
  - You are about to drop the column `vendor_total_amount` on the `vtu_transactions` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[refundId]` on the table `vtu_transactions` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[refundId]` on the table `wallet_transactions` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX `vtu_transactions_gross_profit_idx` ON `vtu_transactions`;

-- DropIndex
DROP INDEX `vtu_transactions_profit_margin_idx` ON `vtu_transactions`;

-- DropIndex
DROP INDEX `vtu_transactions_status_vendor_commission_idx` ON `vtu_transactions`;

-- DropIndex
DROP INDEX `vtu_transactions_vendor_commission_idx` ON `vtu_transactions`;

-- AlterTable
ALTER TABLE `daily_metrics` ADD COLUMN `refundsAmount` DECIMAL(65, 30) NOT NULL DEFAULT 0,
    ADD COLUMN `refundsProcessed` INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE `vtu_transactions` DROP COLUMN `commission_computation`,
    DROP COLUMN `commission_metadata`,
    DROP COLUMN `commission_rate`,
    DROP COLUMN `commission_type`,
    DROP COLUMN `cost_price`,
    DROP COLUMN `effective_rate`,
    DROP COLUMN `gross_profit`,
    DROP COLUMN `net_profit`,
    DROP COLUMN `platform_commission`,
    DROP COLUMN `platform_total_amount`,
    DROP COLUMN `profit_margin`,
    DROP COLUMN `selling_price`,
    DROP COLUMN `total_commission`,
    DROP COLUMN `vendor_commission`,
    DROP COLUMN `vendor_total_amount`,
    ADD COLUMN `commissionComputation` VARCHAR(191) NULL,
    ADD COLUMN `commissionMetadata` JSON NULL,
    ADD COLUMN `commissionRate` DECIMAL(65, 30) NULL DEFAULT 0,
    ADD COLUMN `commissionType` VARCHAR(191) NULL,
    ADD COLUMN `costPrice` DECIMAL(65, 30) NULL DEFAULT 0,
    ADD COLUMN `effectiveRate` DECIMAL(65, 30) NULL DEFAULT 0,
    ADD COLUMN `grossProfit` DECIMAL(65, 30) NULL DEFAULT 0,
    ADD COLUMN `netProfit` DECIMAL(65, 30) NULL DEFAULT 0,
    ADD COLUMN `platformCommission` DECIMAL(65, 30) NULL DEFAULT 0,
    ADD COLUMN `platformTotalAmount` DECIMAL(65, 30) NULL DEFAULT 0,
    ADD COLUMN `profitMargin` DECIMAL(65, 30) NULL DEFAULT 0,
    ADD COLUMN `refundId` VARCHAR(191) NULL,
    ADD COLUMN `refundStatus` ENUM('NONE', 'PENDING', 'APPROVED', 'PROCESSING', 'COMPLETED', 'FAILED', 'REJECTED', 'CANCELLED', 'PARTIAL', 'MANUAL_REVIEW') NOT NULL DEFAULT 'NONE',
    ADD COLUMN `sellingPrice` DECIMAL(65, 30) NULL DEFAULT 0,
    ADD COLUMN `totalCommission` DECIMAL(65, 30) NULL DEFAULT 0,
    ADD COLUMN `totalRefunded` DECIMAL(65, 30) NOT NULL DEFAULT 0,
    ADD COLUMN `vendorCommission` DECIMAL(65, 30) NULL DEFAULT 0,
    ADD COLUMN `vendorTotalAmount` DECIMAL(65, 30) NULL DEFAULT 0,
    MODIFY `totalDebited` DECIMAL(65, 30) NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE `wallet_transactions` ADD COLUMN `refundId` VARCHAR(191) NULL,
    MODIFY `category` ENUM('FUNDING', 'AIRTIME', 'DATA', 'ELECTRICITY', 'CABLE_TV', 'EDUCATION', 'TRANSFER', 'LOAN_DISBURSEMENT', 'LOAN_REPAYMENT', 'BULK_PURCHASE', 'API_PURCHASE', 'QR_PAYMENT', 'SYSTEM', 'ADMIN_ADJUSTMENT', 'REFUND') NULL;

-- CreateTable
CREATE TABLE `refunds` (
    `id` VARCHAR(191) NOT NULL,
    `refundReference` VARCHAR(191) NOT NULL,
    `transactionId` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `amount` DECIMAL(65, 30) NOT NULL,
    `fee` DECIMAL(65, 30) NOT NULL DEFAULT 0,
    `totalRefunded` DECIMAL(65, 30) NOT NULL,
    `status` ENUM('NONE', 'PENDING', 'APPROVED', 'PROCESSING', 'COMPLETED', 'FAILED', 'REJECTED', 'CANCELLED', 'PARTIAL', 'MANUAL_REVIEW') NOT NULL DEFAULT 'PENDING',
    `type` ENUM('AUTOMATIC', 'MANUAL', 'USER_REQUESTED', 'ADMIN_INITIATED', 'SYSTEM_CORRECTION') NOT NULL DEFAULT 'AUTOMATIC',
    `reason` VARCHAR(191) NOT NULL,
    `reasonCode` VARCHAR(191) NULL,
    `initiatedBy` VARCHAR(191) NULL,
    `approvedBy` VARCHAR(191) NULL,
    `approvedAt` DATETIME(3) NULL,
    `processedBy` VARCHAR(191) NULL,
    `walletTransactionId` VARCHAR(191) NULL,
    `walletId` VARCHAR(191) NULL,
    `initiatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `processedAt` DATETIME(3) NULL,
    `completedAt` DATETIME(3) NULL,
    `metadata` JSON NULL,
    `notes` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `refunds_refundReference_key`(`refundReference`),
    UNIQUE INDEX `refunds_transactionId_key`(`transactionId`),
    UNIQUE INDEX `refunds_walletTransactionId_key`(`walletTransactionId`),
    INDEX `refunds_transactionId_idx`(`transactionId`),
    INDEX `refunds_userId_idx`(`userId`),
    INDEX `refunds_status_idx`(`status`),
    INDEX `refunds_refundReference_idx`(`refundReference`),
    INDEX `refunds_createdAt_idx`(`createdAt`),
    INDEX `refunds_type_idx`(`type`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `refund_approvals` (
    `id` VARCHAR(191) NOT NULL,
    `refundId` VARCHAR(191) NOT NULL,
    `approverId` VARCHAR(191) NOT NULL,
    `level` INTEGER NOT NULL DEFAULT 1,
    `status` ENUM('PENDING', 'APPROVED', 'REJECTED', 'SKIPPED') NOT NULL DEFAULT 'PENDING',
    `comments` VARCHAR(191) NULL,
    `approvedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `refund_approvals_refundId_idx`(`refundId`),
    INDEX `refund_approvals_approverId_idx`(`approverId`),
    INDEX `refund_approvals_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `refund_audit_logs` (
    `id` VARCHAR(191) NOT NULL,
    `refundId` VARCHAR(191) NOT NULL,
    `action` VARCHAR(191) NOT NULL,
    `performedBy` VARCHAR(191) NOT NULL,
    `changes` JSON NULL,
    `notes` VARCHAR(191) NULL,
    `ipAddress` VARCHAR(191) NULL,
    `userAgent` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `refund_audit_logs_refundId_idx`(`refundId`),
    INDEX `refund_audit_logs_createdAt_idx`(`createdAt`),
    INDEX `refund_audit_logs_action_idx`(`action`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `refund_notifications` (
    `id` VARCHAR(191) NOT NULL,
    `refundId` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `type` ENUM('INITIATED', 'APPROVED', 'PROCESSING', 'COMPLETED', 'FAILED', 'REJECTED') NOT NULL,
    `sentAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `delivered` BOOLEAN NOT NULL DEFAULT false,
    `channel` ENUM('WHATSAPP', 'MOBILE_PUSH', 'USSD', 'SMS', 'EMAIL', 'WEBHOOK') NOT NULL,
    `message` VARCHAR(191) NOT NULL,
    `metadata` JSON NULL,

    INDEX `refund_notifications_refundId_idx`(`refundId`),
    INDEX `refund_notifications_userId_idx`(`userId`),
    INDEX `refund_notifications_type_idx`(`type`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `refund_attachments` (
    `id` VARCHAR(191) NOT NULL,
    `refundId` VARCHAR(191) NOT NULL,
    `url` VARCHAR(191) NOT NULL,
    `filename` VARCHAR(191) NOT NULL,
    `mimeType` VARCHAR(191) NOT NULL,
    `size` INTEGER NOT NULL,
    `uploadedBy` VARCHAR(191) NOT NULL,
    `description` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `refund_attachments_refundId_idx`(`refundId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE UNIQUE INDEX `vtu_transactions_refundId_key` ON `vtu_transactions`(`refundId`);

-- CreateIndex
CREATE INDEX `vtu_transactions_vendorCommission_idx` ON `vtu_transactions`(`vendorCommission`);

-- CreateIndex
CREATE INDEX `vtu_transactions_grossProfit_idx` ON `vtu_transactions`(`grossProfit`);

-- CreateIndex
CREATE INDEX `vtu_transactions_profitMargin_idx` ON `vtu_transactions`(`profitMargin`);

-- CreateIndex
CREATE INDEX `vtu_transactions_status_vendorCommission_idx` ON `vtu_transactions`(`status`, `vendorCommission`);

-- CreateIndex
CREATE INDEX `vtu_transactions_refundStatus_idx` ON `vtu_transactions`(`refundStatus`);

-- CreateIndex
CREATE UNIQUE INDEX `wallet_transactions_refundId_key` ON `wallet_transactions`(`refundId`);

-- AddForeignKey
ALTER TABLE `wallet_transactions` ADD CONSTRAINT `wallet_transaction_refund_fkey` FOREIGN KEY (`refundId`) REFERENCES `refunds`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `refunds` ADD CONSTRAINT `refund_transaction_fkey` FOREIGN KEY (`transactionId`) REFERENCES `vtu_transactions`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `refunds` ADD CONSTRAINT `refunds_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `refunds` ADD CONSTRAINT `refunds_initiatedBy_fkey` FOREIGN KEY (`initiatedBy`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `refunds` ADD CONSTRAINT `refunds_approvedBy_fkey` FOREIGN KEY (`approvedBy`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `refunds` ADD CONSTRAINT `refunds_processedBy_fkey` FOREIGN KEY (`processedBy`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `refunds` ADD CONSTRAINT `refunds_walletId_fkey` FOREIGN KEY (`walletId`) REFERENCES `wallets`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `refund_approvals` ADD CONSTRAINT `refund_approvals_refundId_fkey` FOREIGN KEY (`refundId`) REFERENCES `refunds`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `refund_approvals` ADD CONSTRAINT `refund_approvals_approverId_fkey` FOREIGN KEY (`approverId`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `refund_audit_logs` ADD CONSTRAINT `refund_audit_logs_refundId_fkey` FOREIGN KEY (`refundId`) REFERENCES `refunds`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `refund_audit_logs` ADD CONSTRAINT `refund_audit_logs_performedBy_fkey` FOREIGN KEY (`performedBy`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `refund_notifications` ADD CONSTRAINT `refund_notifications_refundId_fkey` FOREIGN KEY (`refundId`) REFERENCES `refunds`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `refund_notifications` ADD CONSTRAINT `refund_notifications_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `refund_attachments` ADD CONSTRAINT `refund_attachments_refundId_fkey` FOREIGN KEY (`refundId`) REFERENCES `refunds`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
