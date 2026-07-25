/*
  Warnings:

  - You are about to drop the column `walletTransactionId` on the `qr_payments` table. All the data in the column will be lost.
  - The values [RESERVE,RELEASE,TRANSFER_SENT,TRANSFER_RECEIVED,ADMIN_ADJUSTMENT,LOAN_DISBURSEMENT,LOAN_REPAYMENT,API_PURCHASE,BULK_PURCHASE,QR_PAYMENT] on the enum `wallet_transactions_type` will be removed. If these variants are still used in the database, this will fail.
  - A unique constraint covering the columns `[repaymentId]` on the table `wallet_transactions` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[loanDisbursementId]` on the table `wallet_transactions` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[qrPaymentId]` on the table `wallet_transactions` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[fundingId]` on the table `wallet_transactions` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[debitTransactionId]` on the table `wallet_transfers` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[creditTransactionId]` on the table `wallet_transfers` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `walletId` to the `wallet_transactions` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE `qr_payments` DROP FOREIGN KEY `qr_payments_walletTransactionId_fkey`;

-- DropForeignKey
ALTER TABLE `repayments` DROP FOREIGN KEY `repayments_walletTransactionId_fkey`;

-- DropForeignKey
ALTER TABLE `retailer_loans` DROP FOREIGN KEY `retailer_loans_walletTransactionId_fkey`;

-- DropIndex
DROP INDEX `qr_payments_walletTransactionId_key` ON `qr_payments`;

-- AlterTable
ALTER TABLE `daily_metrics` ADD COLUMN `walletFundingCount` INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN `walletFundingVolume` DECIMAL(65, 30) NOT NULL DEFAULT 0,
    ADD COLUMN `walletTransfers` INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE `developer_webhook_logs` MODIFY `event` ENUM('TRANSACTION_COMPLETED', 'TRANSACTION_FAILED', 'PREORDER_DELIVERED', 'PREORDER_FAILED', 'SUBSCRIPTION_RENEWED', 'SUBSCRIPTION_FAILED', 'LOAN_DISBURSED', 'LOAN_COMPLETED', 'LOAN_DEFAULTED', 'WALLET_CREDITED', 'WALLET_DEBITED', 'WALLET_FUNDED') NOT NULL;

-- AlterTable
ALTER TABLE `jobs` MODIFY `type` ENUM('VTU_TRANSACTION', 'WHATSAPP_MESSAGE', 'USSD_SESSION', 'SUBSCRIPTION_PROCESSING', 'PRE_ORDER_PROCESSING', 'LOAN_PROCESSING', 'NOTIFICATION', 'SCHEDULED_JOB', 'TARIFF_CHECK', 'VENDOR_HEALTH_CHECK', 'TOKEN_EXPIRY_CHECK', 'LOAN_REMINDER', 'LOAN_DELINQUENCY_CHECK', 'USSD_CLEANUP', 'API_REQUEST', 'WEBHOOK_DELIVERY', 'BULK_OPERATION', 'QR_PAYMENT', 'OTP_DELIVERY', 'WALLET_FUNDING') NOT NULL;

-- AlterTable
ALTER TABLE `qr_payments` DROP COLUMN `walletTransactionId`;

-- AlterTable
ALTER TABLE `wallet_transactions` ADD COLUMN `category` ENUM('FUNDING', 'AIRTIME', 'DATA', 'ELECTRICITY', 'CABLE_TV', 'EDUCATION', 'TRANSFER', 'LOAN_DISBURSEMENT', 'LOAN_REPAYMENT', 'BULK_PURCHASE', 'API_PURCHASE', 'QR_PAYMENT', 'SYSTEM', 'ADMIN_ADJUSTMENT') NULL,
    ADD COLUMN `fundingId` VARCHAR(191) NULL,
    ADD COLUMN `loanDisbursementId` VARCHAR(191) NULL,
    ADD COLUMN `qrPaymentId` VARCHAR(191) NULL,
    ADD COLUMN `repaymentId` VARCHAR(191) NULL,
    ADD COLUMN `walletId` VARCHAR(191) NOT NULL,
    MODIFY `type` ENUM('CREDIT', 'DEBIT', 'REFUND', 'TRANSFER', 'FEE', 'SYSTEM') NOT NULL;

-- AlterTable
ALTER TABLE `wallet_transfers` ADD COLUMN `creditTransactionId` VARCHAR(191) NULL,
    ADD COLUMN `debitTransactionId` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `webhook_deliveries` MODIFY `event` ENUM('TRANSACTION_COMPLETED', 'TRANSACTION_FAILED', 'PREORDER_DELIVERED', 'PREORDER_FAILED', 'SUBSCRIPTION_RENEWED', 'SUBSCRIPTION_FAILED', 'LOAN_DISBURSED', 'LOAN_COMPLETED', 'LOAN_DEFAULTED', 'WALLET_CREDITED', 'WALLET_DEBITED', 'WALLET_FUNDED') NOT NULL;

-- CreateTable
CREATE TABLE `wallets` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `accountNumber` VARCHAR(191) NOT NULL,
    `bankName` VARCHAR(191) NOT NULL DEFAULT 'PALMPAY',
    `accountName` VARCHAR(191) NOT NULL,
    `walletBalance` DECIMAL(65, 30) NOT NULL DEFAULT 0,
    `ledgerBalance` DECIMAL(65, 30) NOT NULL DEFAULT 0,
    `currency` VARCHAR(191) NOT NULL DEFAULT 'NGN',
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `isFrozen` BOOLEAN NOT NULL DEFAULT false,
    `frozenAt` DATETIME(3) NULL,
    `frozenReason` VARCHAR(191) NULL,
    `kycLevel` INTEGER NOT NULL DEFAULT 1,
    `dailyLimit` DECIMAL(65, 30) NOT NULL DEFAULT 0,
    `monthlyLimit` DECIMAL(65, 30) NOT NULL DEFAULT 0,
    `metadata` JSON NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `wallets_userId_key`(`userId`),
    UNIQUE INDEX `wallets_accountNumber_key`(`accountNumber`),
    INDEX `wallets_userId_idx`(`userId`),
    INDEX `wallets_accountNumber_idx`(`accountNumber`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `wallet_fundings` (
    `id` VARCHAR(191) NOT NULL,
    `walletId` VARCHAR(191) NOT NULL,
    `amount` DECIMAL(65, 30) NOT NULL,
    `reference` VARCHAR(191) NOT NULL,
    `provider` VARCHAR(191) NOT NULL DEFAULT 'PALMPAY',
    `providerReference` VARCHAR(191) NULL,
    `status` ENUM('PENDING', 'PROCESSING', 'SUCCESS', 'FAILED', 'REVERSED') NOT NULL DEFAULT 'PENDING',
    `metadata` JSON NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `completedAt` DATETIME(3) NULL,

    UNIQUE INDEX `wallet_fundings_reference_key`(`reference`),
    INDEX `wallet_fundings_walletId_idx`(`walletId`),
    INDEX `wallet_fundings_reference_idx`(`reference`),
    INDEX `wallet_fundings_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE UNIQUE INDEX `wallet_transactions_repaymentId_key` ON `wallet_transactions`(`repaymentId`);

-- CreateIndex
CREATE UNIQUE INDEX `wallet_transactions_loanDisbursementId_key` ON `wallet_transactions`(`loanDisbursementId`);

-- CreateIndex
CREATE UNIQUE INDEX `wallet_transactions_qrPaymentId_key` ON `wallet_transactions`(`qrPaymentId`);

-- CreateIndex
CREATE UNIQUE INDEX `wallet_transactions_fundingId_key` ON `wallet_transactions`(`fundingId`);

-- CreateIndex
CREATE INDEX `wallet_transactions_walletId_idx` ON `wallet_transactions`(`walletId`);

-- CreateIndex
CREATE INDEX `wallet_transactions_category_idx` ON `wallet_transactions`(`category`);

-- CreateIndex
CREATE UNIQUE INDEX `wallet_transfers_debitTransactionId_key` ON `wallet_transfers`(`debitTransactionId`);

-- CreateIndex
CREATE UNIQUE INDEX `wallet_transfers_creditTransactionId_key` ON `wallet_transfers`(`creditTransactionId`);

-- AddForeignKey
ALTER TABLE `wallets` ADD CONSTRAINT `wallets_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `wallet_fundings` ADD CONSTRAINT `wallet_fundings_walletId_fkey` FOREIGN KEY (`walletId`) REFERENCES `wallets`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `wallet_transactions` ADD CONSTRAINT `wallet_transactions_walletId_fkey` FOREIGN KEY (`walletId`) REFERENCES `wallets`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `wallet_transactions` ADD CONSTRAINT `wallet_transactions_repaymentId_fkey` FOREIGN KEY (`repaymentId`) REFERENCES `repayments`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `wallet_transactions` ADD CONSTRAINT `wallet_transactions_loanDisbursementId_fkey` FOREIGN KEY (`loanDisbursementId`) REFERENCES `retailer_loans`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `wallet_transactions` ADD CONSTRAINT `wallet_transactions_qrPaymentId_fkey` FOREIGN KEY (`qrPaymentId`) REFERENCES `qr_payments`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `wallet_transactions` ADD CONSTRAINT `wallet_transactions_fundingId_fkey` FOREIGN KEY (`fundingId`) REFERENCES `wallet_fundings`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `wallet_transfers` ADD CONSTRAINT `wallet_transfers_debitTransactionId_fkey` FOREIGN KEY (`debitTransactionId`) REFERENCES `wallet_transactions`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `wallet_transfers` ADD CONSTRAINT `wallet_transfers_creditTransactionId_fkey` FOREIGN KEY (`creditTransactionId`) REFERENCES `wallet_transactions`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
