/*
  Warnings:

  - You are about to drop the column `message` on the `support_tickets` table. All the data in the column will be lost.
  - You are about to alter the column `status` on the `support_tickets` table. The data in that column could be lost. The data in that column will be cast from `VarChar(191)` to `Enum(EnumId(87))`.
  - You are about to alter the column `priority` on the `support_tickets` table. The data in that column could be lost. The data in that column will be cast from `VarChar(191)` to `Enum(EnumId(84))`.
  - You are about to drop the column `apiKey` on the `vendors` table. All the data in the column will be lost.
  - You are about to drop the column `apiSecret` on the `vendors` table. All the data in the column will be lost.
  - You are about to drop the column `supportedServices` on the `vendors` table. All the data in the column will be lost.
  - You are about to drop the column `creditTransactionId` on the `wallet_transfers` table. All the data in the column will be lost.
  - You are about to drop the column `debitTransactionId` on the `wallet_transfers` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[vtuTransactionId]` on the table `qr_payments` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[walletTransactionId]` on the table `qr_payments` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[ticketNumber]` on the table `support_tickets` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[walletTransactionId]` on the table `vtu_transactions` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[debitTransferId]` on the table `wallet_transactions` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[creditTransferId]` on the table `wallet_transactions` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `updatedAt` to the `support_replies` table without a default value. This is not possible if the table is not empty.
  - Made the column `channel` on table `support_replies` required. This step will fail if there are existing NULL values in that column.
  - Added the required column `description` to the `support_tickets` table without a default value. This is not possible if the table is not empty.
  - Added the required column `ticketNumber` to the `support_tickets` table without a default value. This is not possible if the table is not empty.
  - Made the column `channel` on table `support_tickets` required. This step will fail if there are existing NULL values in that column.

*/
-- DropForeignKey
ALTER TABLE `vtu_transactions` DROP FOREIGN KEY `vtu_transactions_qrPaymentId_fkey`;

-- DropForeignKey
ALTER TABLE `wallet_transfers` DROP FOREIGN KEY `wallet_transfers_creditTransactionId_fkey`;

-- DropForeignKey
ALTER TABLE `wallet_transfers` DROP FOREIGN KEY `wallet_transfers_debitTransactionId_fkey`;

-- DropIndex
DROP INDEX `wallet_transfers_creditTransactionId_key` ON `wallet_transfers`;

-- DropIndex
DROP INDEX `wallet_transfers_debitTransactionId_key` ON `wallet_transfers`;

-- AlterTable
ALTER TABLE `qr_payments` ADD COLUMN `vtuTransactionId` VARCHAR(191) NULL,
    ADD COLUMN `walletTransactionId` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `support_replies` ADD COLUMN `attachments` JSON NULL,
    ADD COLUMN `isPublic` BOOLEAN NOT NULL DEFAULT true,
    ADD COLUMN `isSystem` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `messageType` VARCHAR(191) NOT NULL DEFAULT 'TEXT',
    ADD COLUMN `readAt` DATETIME(3) NULL,
    ADD COLUMN `readByAgent` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `readByCustomer` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `updatedAt` DATETIME(3) NOT NULL,
    MODIFY `channel` ENUM('WHATSAPP', 'USSD', 'MOBILE_APP', 'WEB', 'EMAIL', 'SMS', 'PHONE', 'IN_APP_CHAT', 'SOCIAL_MEDIA', 'API', 'QR_PAYMENT') NOT NULL DEFAULT 'WEB';

-- AlterTable
ALTER TABLE `support_tickets` DROP COLUMN `message`,
    ADD COLUMN `apiKeyId` VARCHAR(191) NULL,
    ADD COLUMN `assignedAt` DATETIME(3) NULL,
    ADD COLUMN `assignedBy` VARCHAR(191) NULL,
    ADD COLUMN `customerEmail` VARCHAR(191) NULL,
    ADD COLUMN `customerName` VARCHAR(191) NULL,
    ADD COLUMN `customerPhone` VARCHAR(191) NULL,
    ADD COLUMN `description` VARCHAR(191) NOT NULL,
    ADD COLUMN `duplicateOfTicketId` VARCHAR(191) NULL,
    ADD COLUMN `escalatedAt` DATETIME(3) NULL,
    ADD COLUMN `escalatedBy` VARCHAR(191) NULL,
    ADD COLUMN `escalatedTo` VARCHAR(191) NULL,
    ADD COLUMN `escalationReason` VARCHAR(191) NULL,
    ADD COLUMN `firstResponseAt` DATETIME(3) NULL,
    ADD COLUMN `firstResponseSlaBreached` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `firstResponseTime` INTEGER NULL,
    ADD COLUMN `impact` ENUM('WIDESPREAD', 'LARGE', 'MEDIUM', 'LOW', 'INDIVIDUAL') NOT NULL DEFAULT 'INDIVIDUAL',
    ADD COLUMN `mergedTicketId` VARCHAR(191) NULL,
    ADD COLUMN `metadata` JSON NULL,
    ADD COLUMN `parentTicketId` VARCHAR(191) NULL,
    ADD COLUMN `qrPaymentId` VARCHAR(191) NULL,
    ADD COLUMN `reopenedAt` DATETIME(3) NULL,
    ADD COLUMN `reopenedCount` INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN `resolutionDeadline` DATETIME(3) NULL,
    ADD COLUMN `resolutionNotes` VARCHAR(191) NULL,
    ADD COLUMN `resolutionSlaBreached` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `resolutionTime` INTEGER NULL,
    ADD COLUMN `resolutionType` ENUM('FIXED', 'EXPLAINED', 'WORKAROUND', 'NOT_A_BUG', 'CANNOT_REPRODUCE', 'ESCALATED', 'REFUNDED', 'FEATURE', 'OTHER') NULL,
    ADD COLUMN `satisfactionFeedback` VARCHAR(191) NULL,
    ADD COLUMN `satisfactionRating` ENUM('VERY_UNSATISFIED', 'UNSATISFIED', 'NEUTRAL', 'SATISFIED', 'VERY_SATISFIED') NULL,
    ADD COLUMN `satisfactionSentAt` DATETIME(3) NULL,
    ADD COLUMN `slaBreachNotifiedAt` DATETIME(3) NULL,
    ADD COLUMN `slaId` VARCHAR(191) NULL,
    ADD COLUMN `slaStatus` ENUM('WITHIN_SLA', 'BREACHED', 'APPROACHING', 'BREACH_IMMINENT') NOT NULL DEFAULT 'WITHIN_SLA',
    ADD COLUMN `source` ENUM('CUSTOMER', 'AGENT', 'SYSTEM', 'MONITORING', 'AUTOMATION', 'API') NOT NULL DEFAULT 'CUSTOMER',
    ADD COLUMN `subCategory` VARCHAR(191) NULL,
    ADD COLUMN `ticketNumber` VARCHAR(191) NOT NULL,
    ADD COLUMN `timeToClose` INTEGER NULL,
    ADD COLUMN `totalInternalNotes` INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN `totalReplies` INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN `type` ENUM('QUESTION', 'COMPLAINT', 'FEATURE_REQUEST', 'BUG', 'BILLING', 'TECHNICAL', 'REFUND', 'ACCOUNT', 'FRAUD', 'OTHER') NOT NULL DEFAULT 'OTHER',
    ADD COLUMN `urgency` ENUM('CRITICAL', 'HIGH', 'MEDIUM', 'LOW') NOT NULL DEFAULT 'MEDIUM',
    MODIFY `status` ENUM('NEW', 'OPEN', 'PENDING', 'IN_PROGRESS', 'RESOLVED', 'CLOSED', 'REOPENED', 'ON_HOLD', 'ESCALATED', 'MERGED', 'DUPLICATE') NOT NULL DEFAULT 'NEW',
    MODIFY `priority` ENUM('CRITICAL', 'HIGH', 'MEDIUM', 'LOW') NOT NULL DEFAULT 'MEDIUM',
    MODIFY `channel` ENUM('WHATSAPP', 'USSD', 'MOBILE_APP', 'WEB', 'EMAIL', 'SMS', 'PHONE', 'IN_APP_CHAT', 'SOCIAL_MEDIA', 'API', 'QR_PAYMENT') NOT NULL DEFAULT 'WEB';

-- AlterTable
ALTER TABLE `vendor_health_checks` ADD COLUMN `avgResponseTime` INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN `errorRate` DECIMAL(65, 30) NOT NULL DEFAULT 0,
    ADD COLUMN `failureCount` INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN `maxResponseTime` INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN `metadata` JSON NULL,
    ADD COLUMN `minResponseTime` INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN `requestCount` INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN `serviceType` ENUM('AIRTIME', 'DATA', 'ELECTRICITY_INSTANT', 'ELECTRICITY_PREORDER', 'CABLE_TV', 'EDUCATION', 'INSURANCE') NULL,
    ADD COLUMN `successCount` INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN `uptimePercentage` DECIMAL(65, 30) NOT NULL DEFAULT 100;

-- AlterTable
ALTER TABLE `vendors` DROP COLUMN `apiKey`,
    DROP COLUMN `apiSecret`,
    DROP COLUMN `supportedServices`,
    ADD COLUMN `authConfig` JSON NULL,
    ADD COLUMN `authType` ENUM('API_KEY', 'HMAC', 'OAUTH2', 'BASIC', 'BEARER_TOKEN', 'CUSTOM') NOT NULL DEFAULT 'API_KEY';

-- AlterTable
ALTER TABLE `vtu_transactions` ADD COLUMN `failedVendors` JSON NULL,
    ADD COLUMN `fallbackAttempts` INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN `selectedVendorId` VARCHAR(191) NULL,
    ADD COLUMN `vendorPriorityUsed` INTEGER NULL,
    ADD COLUMN `walletTransactionId` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `wallet_transactions` ADD COLUMN `creditTransferId` VARCHAR(191) NULL,
    ADD COLUMN `debitTransferId` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `wallet_transfers` DROP COLUMN `creditTransactionId`,
    DROP COLUMN `debitTransactionId`;

-- CreateTable
CREATE TABLE `vendor_services` (
    `id` VARCHAR(191) NOT NULL,
    `vendorId` VARCHAR(191) NOT NULL,
    `serviceType` ENUM('AIRTIME', 'DATA', 'ELECTRICITY_INSTANT', 'ELECTRICITY_PREORDER', 'CABLE_TV', 'EDUCATION', 'INSURANCE') NOT NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `priority` INTEGER NOT NULL DEFAULT 1,
    `basePrice` DECIMAL(65, 30) NULL,
    `markup` DECIMAL(65, 30) NOT NULL DEFAULT 0,
    `minAmount` DECIMAL(65, 30) NULL,
    `maxAmount` DECIMAL(65, 30) NULL,
    `metadata` JSON NULL,

    INDEX `vendor_services_serviceType_idx`(`serviceType`),
    INDEX `vendor_services_isActive_idx`(`isActive`),
    UNIQUE INDEX `vendor_services_vendorId_serviceType_key`(`vendorId`, `serviceType`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `vendor_api_endpoints` (
    `id` VARCHAR(191) NOT NULL,
    `vendorId` VARCHAR(191) NOT NULL,
    `serviceType` ENUM('AIRTIME', 'DATA', 'ELECTRICITY_INSTANT', 'ELECTRICITY_PREORDER', 'CABLE_TV', 'EDUCATION', 'INSURANCE') NOT NULL,
    `endpoint` VARCHAR(191) NOT NULL,
    `method` VARCHAR(191) NOT NULL DEFAULT 'POST',
    `requestMapping` JSON NULL,
    `responseMapping` JSON NULL,
    `errorMapping` JSON NULL,
    `timeoutMs` INTEGER NOT NULL DEFAULT 30000,
    `retryableErrors` JSON NULL,

    UNIQUE INDEX `vendor_api_endpoints_vendorId_serviceType_key`(`vendorId`, `serviceType`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `vendor_transformers` (
    `id` VARCHAR(191) NOT NULL,
    `vendorId` VARCHAR(191) NOT NULL,
    `serviceType` ENUM('AIRTIME', 'DATA', 'ELECTRICITY_INSTANT', 'ELECTRICITY_PREORDER', 'CABLE_TV', 'EDUCATION', 'INSURANCE') NOT NULL,
    `transformType` VARCHAR(191) NOT NULL,
    `script` VARCHAR(191) NULL,
    `mapping` JSON NOT NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,

    UNIQUE INDEX `vendor_transformers_vendorId_serviceType_transformType_key`(`vendorId`, `serviceType`, `transformType`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `vendor_failover_rules` (
    `id` VARCHAR(191) NOT NULL,
    `vendorId` VARCHAR(191) NOT NULL,
    `serviceType` ENUM('AIRTIME', 'DATA', 'ELECTRICITY_INSTANT', 'ELECTRICITY_PREORDER', 'CABLE_TV', 'EDUCATION', 'INSURANCE') NULL,
    `failureThreshold` INTEGER NOT NULL DEFAULT 3,
    `errorRateThreshold` DECIMAL(65, 30) NOT NULL DEFAULT 0.1,
    `timeWindowMs` INTEGER NOT NULL DEFAULT 60000,
    `maxRetries` INTEGER NOT NULL DEFAULT 3,
    `retryDelayMs` INTEGER NOT NULL DEFAULT 1000,
    `backoffMultiplier` DECIMAL(65, 30) NOT NULL DEFAULT 2.0,
    `fallbackVendorId` VARCHAR(191) NULL,
    `fallbackAfterMs` INTEGER NOT NULL DEFAULT 5000,
    `circuitBreakerEnabled` BOOLEAN NOT NULL DEFAULT true,
    `circuitBreakerThreshold` INTEGER NOT NULL DEFAULT 5,
    `circuitBreakerTimeoutMs` INTEGER NOT NULL DEFAULT 60000,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `circuit_breakers` (
    `id` VARCHAR(191) NOT NULL,
    `vendorId` VARCHAR(191) NOT NULL,
    `serviceType` ENUM('AIRTIME', 'DATA', 'ELECTRICITY_INSTANT', 'ELECTRICITY_PREORDER', 'CABLE_TV', 'EDUCATION', 'INSURANCE') NULL,
    `state` ENUM('CLOSED', 'OPEN', 'HALF_OPEN') NOT NULL DEFAULT 'CLOSED',
    `failureCount` INTEGER NOT NULL DEFAULT 0,
    `successCount` INTEGER NOT NULL DEFAULT 0,
    `lastFailureAt` DATETIME(3) NULL,
    `lastSuccessAt` DATETIME(3) NULL,
    `openedAt` DATETIME(3) NULL,
    `resetTimeoutMs` INTEGER NOT NULL DEFAULT 60000,

    INDEX `circuit_breakers_state_idx`(`state`),
    UNIQUE INDEX `circuit_breakers_vendorId_serviceType_key`(`vendorId`, `serviceType`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `vendor_daily_metrics` (
    `id` VARCHAR(191) NOT NULL,
    `vendorId` VARCHAR(191) NOT NULL,
    `date` DATETIME(3) NOT NULL,
    `serviceType` ENUM('AIRTIME', 'DATA', 'ELECTRICITY_INSTANT', 'ELECTRICITY_PREORDER', 'CABLE_TV', 'EDUCATION', 'INSURANCE') NULL,
    `totalRequests` INTEGER NOT NULL DEFAULT 0,
    `successfulRequests` INTEGER NOT NULL DEFAULT 0,
    `failedRequests` INTEGER NOT NULL DEFAULT 0,
    `totalRevenue` DECIMAL(65, 30) NOT NULL DEFAULT 0,
    `avgResponseTime` INTEGER NOT NULL DEFAULT 0,
    `uptimeSeconds` INTEGER NOT NULL DEFAULT 0,
    `downtimeSeconds` INTEGER NOT NULL DEFAULT 0,
    `availability` DECIMAL(65, 30) NOT NULL DEFAULT 100,
    `errorCodes` JSON NULL,

    INDEX `vendor_daily_metrics_vendorId_idx`(`vendorId`),
    INDEX `vendor_daily_metrics_date_idx`(`date`),
    UNIQUE INDEX `vendor_daily_metrics_vendorId_date_serviceType_key`(`vendorId`, `date`, `serviceType`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `vendor_selection_logs` (
    `id` VARCHAR(191) NOT NULL,
    `transactionId` VARCHAR(191) NULL,
    `serviceType` ENUM('AIRTIME', 'DATA', 'ELECTRICITY_INSTANT', 'ELECTRICITY_PREORDER', 'CABLE_TV', 'EDUCATION', 'INSURANCE') NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `candidates` JSON NOT NULL,
    `selectedVendorId` VARCHAR(191) NOT NULL,
    `selectionReason` VARCHAR(191) NOT NULL,
    `vendorStates` JSON NOT NULL,
    `selectionTimeMs` INTEGER NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `vendor_selection_logs_transactionId_idx`(`transactionId`),
    INDEX `vendor_selection_logs_serviceType_idx`(`serviceType`),
    INDEX `vendor_selection_logs_createdAt_idx`(`createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `vtu_transaction_attempts` (
    `id` VARCHAR(191) NOT NULL,
    `transactionId` VARCHAR(191) NOT NULL,
    `vendorId` VARCHAR(191) NOT NULL,
    `attemptNumber` INTEGER NOT NULL DEFAULT 1,
    `requestPayload` JSON NULL,
    `endpoint` VARCHAR(191) NULL,
    `method` VARCHAR(191) NULL,
    `responsePayload` JSON NULL,
    `responseStatus` INTEGER NULL,
    `status` ENUM('PENDING', 'PROCESSING', 'SUCCESS', 'FAILED') NOT NULL DEFAULT 'PENDING',
    `responseTime` INTEGER NULL,
    `startedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `completedAt` DATETIME(3) NULL,
    `errorCode` VARCHAR(191) NULL,
    `errorMessage` VARCHAR(191) NULL,
    `errorType` VARCHAR(191) NULL,
    `isRetryable` BOOLEAN NOT NULL DEFAULT true,
    `vendorStateAtAttempt` JSON NULL,

    INDEX `vtu_transaction_attempts_transactionId_idx`(`transactionId`),
    INDEX `vtu_transaction_attempts_vendorId_idx`(`vendorId`),
    INDEX `vtu_transaction_attempts_status_idx`(`status`),
    INDEX `vtu_transaction_attempts_startedAt_idx`(`startedAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `product_providers` (
    `id` VARCHAR(191) NOT NULL,
    `productId` VARCHAR(191) NOT NULL,
    `vendorId` VARCHAR(191) NOT NULL,
    `vendorPrice` DECIMAL(65, 30) NOT NULL,
    `ourPrice` DECIMAL(65, 30) NOT NULL,
    `serviceFee` DECIMAL(65, 30) NOT NULL DEFAULT 0,
    `minAmount` DECIMAL(65, 30) NULL,
    `maxAmount` DECIMAL(65, 30) NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `priority` INTEGER NOT NULL DEFAULT 1,
    `vendorProductCode` VARCHAR(191) NULL,
    `vendorPlanCode` VARCHAR(191) NULL,
    `metadata` JSON NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `product_providers_isActive_idx`(`isActive`),
    UNIQUE INDEX `product_providers_productId_vendorId_key`(`productId`, `vendorId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `support_agents` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `role` ENUM('TIER_1', 'TIER_2', 'TIER_3', 'TEAM_LEAD', 'SUPERVISOR', 'MANAGER') NOT NULL DEFAULT 'TIER_1',
    `department` VARCHAR(191) NULL,
    `specialization` JSON NOT NULL,
    `status` ENUM('AVAILABLE', 'BUSY', 'AWAY', 'OFFLINE', 'DO_NOT_DISTURB', 'IN_MEETING') NOT NULL DEFAULT 'OFFLINE',
    `lastOnlineAt` DATETIME(3) NULL,
    `currentChatLimit` INTEGER NOT NULL DEFAULT 5,
    `currentChatCount` INTEGER NOT NULL DEFAULT 0,
    `maxDailyTickets` INTEGER NOT NULL DEFAULT 50,
    `skills` JSON NOT NULL,
    `languages` JSON NOT NULL,
    `avgResponseTime` INTEGER NOT NULL DEFAULT 0,
    `avgResolutionTime` INTEGER NOT NULL DEFAULT 0,
    `ticketsResolved` INTEGER NOT NULL DEFAULT 0,
    `satisfactionScore` DECIMAL(65, 30) NOT NULL DEFAULT 0,
    `firstContactResolution` DECIMAL(65, 30) NOT NULL DEFAULT 0,
    `workSchedule` JSON NULL,
    `timezone` VARCHAR(191) NOT NULL DEFAULT 'Africa/Lagos',
    `notificationChannels` JSON NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `support_agents_userId_key`(`userId`),
    INDEX `support_agents_userId_idx`(`userId`),
    INDEX `support_agents_status_idx`(`status`),
    INDEX `support_agents_role_idx`(`role`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `agent_shifts` (
    `id` VARCHAR(191) NOT NULL,
    `agentId` VARCHAR(191) NOT NULL,
    `date` DATETIME(3) NOT NULL,
    `startTime` DATETIME(3) NOT NULL,
    `endTime` DATETIME(3) NOT NULL,
    `breakStart` DATETIME(3) NULL,
    `breakEnd` DATETIME(3) NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `isOnCall` BOOLEAN NOT NULL DEFAULT false,
    `notes` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `agent_shifts_date_idx`(`date`),
    INDEX `agent_shifts_isActive_idx`(`isActive`),
    UNIQUE INDEX `agent_shifts_agentId_date_key`(`agentId`, `date`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `support_reply_reactions` (
    `id` VARCHAR(191) NOT NULL,
    `replyId` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `reaction` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `support_reply_reactions_replyId_userId_key`(`replyId`, `userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `support_internal_notes` (
    `id` VARCHAR(191) NOT NULL,
    `ticketId` VARCHAR(191) NOT NULL,
    `agentId` VARCHAR(191) NOT NULL,
    `note` VARCHAR(191) NOT NULL,
    `isPinned` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `support_internal_notes_ticketId_idx`(`ticketId`),
    INDEX `support_internal_notes_agentId_idx`(`agentId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `support_slas` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `description` VARCHAR(191) NULL,
    `criticalResponseMins` INTEGER NOT NULL DEFAULT 15,
    `criticalResolutionMins` INTEGER NOT NULL DEFAULT 240,
    `highResponseMins` INTEGER NOT NULL DEFAULT 60,
    `highResolutionMins` INTEGER NOT NULL DEFAULT 1440,
    `mediumResponseMins` INTEGER NOT NULL DEFAULT 240,
    `mediumResolutionMins` INTEGER NOT NULL DEFAULT 4320,
    `lowResponseMins` INTEGER NOT NULL DEFAULT 1440,
    `lowResolutionMins` INTEGER NOT NULL DEFAULT 10080,
    `businessHoursOnly` BOOLEAN NOT NULL DEFAULT true,
    `workingDays` JSON NOT NULL,
    `workingHoursStart` VARCHAR(191) NOT NULL DEFAULT '08:00',
    `workingHoursEnd` VARCHAR(191) NOT NULL DEFAULT '18:00',
    `timezone` VARCHAR(191) NOT NULL DEFAULT 'Africa/Lagos',
    `breachAction` VARCHAR(191) NULL,
    `escalateAfterBreach` BOOLEAN NOT NULL DEFAULT true,
    `escalateToRole` ENUM('TIER_1', 'TIER_2', 'TIER_3', 'TEAM_LEAD', 'SUPERVISOR', 'MANAGER') NULL DEFAULT 'TIER_2',
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `support_slas_name_key`(`name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `support_escalations` (
    `id` VARCHAR(191) NOT NULL,
    `ticketId` VARCHAR(191) NOT NULL,
    `escalatedFrom` VARCHAR(191) NOT NULL,
    `escalatedTo` VARCHAR(191) NOT NULL,
    `reason` VARCHAR(191) NOT NULL,
    `urgency` ENUM('CRITICAL', 'HIGH', 'MEDIUM', 'LOW') NOT NULL DEFAULT 'MEDIUM',
    `status` VARCHAR(191) NOT NULL DEFAULT 'PENDING',
    `approvedBy` VARCHAR(191) NULL,
    `approvedAt` DATETIME(3) NULL,
    `notes` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `support_escalations_ticketId_idx`(`ticketId`),
    INDEX `support_escalations_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `support_satisfactions` (
    `id` VARCHAR(191) NOT NULL,
    `ticketId` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `rating` ENUM('VERY_UNSATISFIED', 'UNSATISFIED', 'NEUTRAL', 'SATISFIED', 'VERY_SATISFIED') NOT NULL,
    `feedback` VARCHAR(191) NULL,
    `overallScore` INTEGER NULL,
    `responseTimeScore` INTEGER NULL,
    `knowledgeScore` INTEGER NULL,
    `friendlinessScore` INTEGER NULL,
    `issueResolved` BOOLEAN NULL,
    `channel` ENUM('WHATSAPP', 'USSD', 'MOBILE_APP', 'WEB', 'EMAIL', 'SMS', 'PHONE', 'IN_APP_CHAT', 'SOCIAL_MEDIA', 'API', 'QR_PAYMENT') NOT NULL DEFAULT 'WEB',
    `ipAddress` VARCHAR(191) NULL,
    `userAgent` VARCHAR(191) NULL,
    `reminderSent` BOOLEAN NOT NULL DEFAULT false,
    `reminderSentAt` DATETIME(3) NULL,
    `sentAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `respondedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `support_satisfactions_ticketId_key`(`ticketId`),
    INDEX `support_satisfactions_ticketId_idx`(`ticketId`),
    INDEX `support_satisfactions_userId_idx`(`userId`),
    INDEX `support_satisfactions_rating_idx`(`rating`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `knowledge_base` (
    `id` VARCHAR(191) NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `slug` VARCHAR(191) NOT NULL,
    `content` VARCHAR(191) NOT NULL,
    `summary` VARCHAR(191) NULL,
    `category` ENUM('FAQ', 'TROUBLESHOOTING', 'HOW_TO', 'BILLING', 'SECURITY', 'GENERAL', 'API', 'QUICK_START') NOT NULL DEFAULT 'GENERAL',
    `subCategory` VARCHAR(191) NULL,
    `seoTitle` VARCHAR(191) NULL,
    `seoDescription` VARCHAR(191) NULL,
    `keywords` JSON NOT NULL,
    `status` ENUM('DRAFT', 'PUBLISHED', 'ARCHIVED', 'UNDER_REVIEW') NOT NULL DEFAULT 'DRAFT',
    `version` INTEGER NOT NULL DEFAULT 1,
    `viewCount` INTEGER NOT NULL DEFAULT 0,
    `helpfulCount` INTEGER NOT NULL DEFAULT 0,
    `notHelpfulCount` INTEGER NOT NULL DEFAULT 0,
    `rating` DECIMAL(65, 30) NOT NULL DEFAULT 0,
    `authorId` VARCHAR(191) NOT NULL,
    `reviewerId` VARCHAR(191) NULL,
    `reviewedAt` DATETIME(3) NULL,
    `publishedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `knowledge_base_slug_key`(`slug`),
    INDEX `knowledge_base_slug_idx`(`slug`),
    INDEX `knowledge_base_status_idx`(`status`),
    INDEX `knowledge_base_category_idx`(`category`),
    INDEX `knowledge_base_publishedAt_idx`(`publishedAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `knowledge_base_tags` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `slug` VARCHAR(191) NOT NULL,
    `description` VARCHAR(191) NULL,
    `color` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `knowledge_base_tags_name_key`(`name`),
    UNIQUE INDEX `knowledge_base_tags_slug_key`(`slug`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `knowledge_base_votes` (
    `id` VARCHAR(191) NOT NULL,
    `articleId` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `isHelpful` BOOLEAN NOT NULL,
    `feedback` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `knowledge_base_votes_articleId_userId_key`(`articleId`, `userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `knowledge_base_revisions` (
    `id` VARCHAR(191) NOT NULL,
    `articleId` VARCHAR(191) NOT NULL,
    `version` INTEGER NOT NULL,
    `content` VARCHAR(191) NOT NULL,
    `summary` VARCHAR(191) NULL,
    `authorId` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `knowledge_base_revisions_articleId_idx`(`articleId`),
    INDEX `knowledge_base_revisions_version_idx`(`version`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `knowledge_base_attachments` (
    `id` VARCHAR(191) NOT NULL,
    `articleId` VARCHAR(191) NOT NULL,
    `url` VARCHAR(191) NOT NULL,
    `filename` VARCHAR(191) NOT NULL,
    `mimeType` VARCHAR(191) NOT NULL,
    `size` INTEGER NOT NULL,
    `uploadedBy` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `knowledge_base_attachments_articleId_idx`(`articleId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `knowledge_base_ticket_links` (
    `id` VARCHAR(191) NOT NULL,
    `ticketId` VARCHAR(191) NOT NULL,
    `articleId` VARCHAR(191) NOT NULL,
    `addedBy` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `knowledge_base_ticket_links_ticketId_idx`(`ticketId`),
    INDEX `knowledge_base_ticket_links_articleId_idx`(`articleId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `support_tags` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `slug` VARCHAR(191) NOT NULL,
    `description` VARCHAR(191) NULL,
    `color` VARCHAR(191) NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `support_tags_name_key`(`name`),
    UNIQUE INDEX `support_tags_slug_key`(`slug`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `support_ticket_tags` (
    `id` VARCHAR(191) NOT NULL,
    `ticketId` VARCHAR(191) NOT NULL,
    `tagId` VARCHAR(191) NOT NULL,
    `addedBy` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `support_ticket_tags_ticketId_tagId_key`(`ticketId`, `tagId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `support_automation_rules` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `description` VARCHAR(191) NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `priority` INTEGER NOT NULL DEFAULT 1,
    `conditions` JSON NOT NULL,
    `actions` JSON NOT NULL,
    `runOnCreate` BOOLEAN NOT NULL DEFAULT true,
    `runOnUpdate` BOOLEAN NOT NULL DEFAULT false,
    `runOnStatusChange` BOOLEAN NOT NULL DEFAULT false,
    `maxExecutionsPerDay` INTEGER NOT NULL DEFAULT 1000,
    `executionCount` INTEGER NOT NULL DEFAULT 0,
    `lastExecutedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `support_automation_rules_name_key`(`name`),
    INDEX `support_automation_rules_isActive_idx`(`isActive`),
    INDEX `support_automation_rules_priority_idx`(`priority`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `support_automation_executions` (
    `id` VARCHAR(191) NOT NULL,
    `ruleId` VARCHAR(191) NOT NULL,
    `ticketId` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NULL,
    `conditionsMatched` BOOLEAN NOT NULL,
    `actionsExecuted` BOOLEAN NOT NULL,
    `result` VARCHAR(191) NULL,
    `errorMessage` VARCHAR(191) NULL,
    `executedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `support_automation_executions_ruleId_idx`(`ruleId`),
    INDEX `support_automation_executions_ticketId_idx`(`ticketId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `support_ticket_automations` (
    `id` VARCHAR(191) NOT NULL,
    `ticketId` VARCHAR(191) NOT NULL,
    `automationId` VARCHAR(191) NOT NULL,
    `executedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `result` VARCHAR(191) NULL,
    `metadata` JSON NULL,

    UNIQUE INDEX `support_ticket_automations_ticketId_automationId_key`(`ticketId`, `automationId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `support_macros` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `description` VARCHAR(191) NULL,
    `subject` VARCHAR(191) NOT NULL,
    `body` VARCHAR(191) NOT NULL,
    `category` VARCHAR(191) NULL,
    `placeholders` JSON NULL,
    `visibility` VARCHAR(191) NOT NULL DEFAULT 'ALL',
    `createdBy` VARCHAR(191) NOT NULL,
    `useCount` INTEGER NOT NULL DEFAULT 0,
    `lastUsedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `support_macros_name_key`(`name`),
    INDEX `support_macros_category_idx`(`category`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `support_chat_sessions` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `agentId` VARCHAR(191) NULL,
    `ticketId` VARCHAR(191) NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'WAITING',
    `channel` ENUM('WHATSAPP', 'USSD', 'MOBILE_APP', 'WEB', 'EMAIL', 'SMS', 'PHONE', 'IN_APP_CHAT', 'SOCIAL_MEDIA', 'API', 'QR_PAYMENT') NOT NULL DEFAULT 'IN_APP_CHAT',
    `messages` JSON NULL,
    `messageCount` INTEGER NOT NULL DEFAULT 0,
    `startTime` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `endTime` DATETIME(3) NULL,
    `lastMessageAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `transferCount` INTEGER NOT NULL DEFAULT 0,
    `transferredFrom` VARCHAR(191) NULL,
    `transferredTo` VARCHAR(191) NULL,
    `satisfactionRating` ENUM('VERY_UNSATISFIED', 'UNSATISFIED', 'NEUTRAL', 'SATISFIED', 'VERY_SATISFIED') NULL,
    `satisfactionFeedback` VARCHAR(191) NULL,

    INDEX `support_chat_sessions_userId_idx`(`userId`),
    INDEX `support_chat_sessions_agentId_idx`(`agentId`),
    INDEX `support_chat_sessions_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `agent_performance` (
    `id` VARCHAR(191) NOT NULL,
    `agentId` VARCHAR(191) NOT NULL,
    `date` DATETIME(3) NOT NULL,
    `ticketsAssigned` INTEGER NOT NULL DEFAULT 0,
    `ticketsResolved` INTEGER NOT NULL DEFAULT 0,
    `ticketsReopened` INTEGER NOT NULL DEFAULT 0,
    `ticketsEscalated` INTEGER NOT NULL DEFAULT 0,
    `avgFirstResponseTime` DECIMAL(65, 30) NOT NULL DEFAULT 0,
    `avgResolutionTime` DECIMAL(65, 30) NOT NULL DEFAULT 0,
    `avgResponseTime` DECIMAL(65, 30) NOT NULL DEFAULT 0,
    `satisfactionScore` DECIMAL(65, 30) NOT NULL DEFAULT 0,
    `firstContactResolution` DECIMAL(65, 30) NOT NULL DEFAULT 0,
    `slaBreaches` INTEGER NOT NULL DEFAULT 0,
    `totalReplies` INTEGER NOT NULL DEFAULT 0,
    `totalInternalNotes` INTEGER NOT NULL DEFAULT 0,
    `totalTimeOnline` INTEGER NOT NULL DEFAULT 0,
    `totalChatsHandled` INTEGER NOT NULL DEFAULT 0,
    `ticketThroughput` DECIMAL(65, 30) NOT NULL DEFAULT 0,
    `backlogCleared` INTEGER NOT NULL DEFAULT 0,

    INDEX `agent_performance_agentId_idx`(`agentId`),
    INDEX `agent_performance_date_idx`(`date`),
    UNIQUE INDEX `agent_performance_agentId_date_key`(`agentId`, `date`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `agent_notes` (
    `id` VARCHAR(191) NOT NULL,
    `agentId` VARCHAR(191) NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `content` VARCHAR(191) NOT NULL,
    `isShared` BOOLEAN NOT NULL DEFAULT false,
    `tags` JSON NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `agent_notes_agentId_idx`(`agentId`),
    INDEX `agent_notes_isShared_idx`(`isShared`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `support_attachments` (
    `id` VARCHAR(191) NOT NULL,
    `ticketId` VARCHAR(191) NOT NULL,
    `url` VARCHAR(191) NOT NULL,
    `filename` VARCHAR(191) NOT NULL,
    `mimeType` VARCHAR(191) NOT NULL,
    `size` INTEGER NOT NULL,
    `uploadedBy` VARCHAR(191) NOT NULL,
    `isPublic` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `support_attachments_ticketId_idx`(`ticketId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `support_audit_logs` (
    `id` VARCHAR(191) NOT NULL,
    `ticketId` VARCHAR(191) NOT NULL,
    `agentId` VARCHAR(191) NULL,
    `action` VARCHAR(191) NOT NULL,
    `field` VARCHAR(191) NULL,
    `oldValue` VARCHAR(191) NULL,
    `newValue` VARCHAR(191) NULL,
    `notes` VARCHAR(191) NULL,
    `ipAddress` VARCHAR(191) NULL,
    `userAgent` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `support_audit_logs_ticketId_idx`(`ticketId`),
    INDEX `support_audit_logs_agentId_idx`(`agentId`),
    INDEX `support_audit_logs_createdAt_idx`(`createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `support_analytics` (
    `id` VARCHAR(191) NOT NULL,
    `date` DATETIME(3) NOT NULL,
    `totalTicketsCreated` INTEGER NOT NULL DEFAULT 0,
    `totalTicketsResolved` INTEGER NOT NULL DEFAULT 0,
    `totalTicketsClosed` INTEGER NOT NULL DEFAULT 0,
    `totalReopened` INTEGER NOT NULL DEFAULT 0,
    `criticalTickets` INTEGER NOT NULL DEFAULT 0,
    `highTickets` INTEGER NOT NULL DEFAULT 0,
    `mediumTickets` INTEGER NOT NULL DEFAULT 0,
    `lowTickets` INTEGER NOT NULL DEFAULT 0,
    `slaBreaches` INTEGER NOT NULL DEFAULT 0,
    `slaCompliance` DECIMAL(65, 30) NOT NULL DEFAULT 100,
    `avgFirstResponseTime` DECIMAL(65, 30) NOT NULL DEFAULT 0,
    `avgResolutionTime` DECIMAL(65, 30) NOT NULL DEFAULT 0,
    `avgSatisfaction` DECIMAL(65, 30) NOT NULL DEFAULT 0,
    `totalSurveysSent` INTEGER NOT NULL DEFAULT 0,
    `totalSurveysResponded` INTEGER NOT NULL DEFAULT 0,
    `satisfactionRate` DECIMAL(65, 30) NOT NULL DEFAULT 0,
    `backlogTotal` INTEGER NOT NULL DEFAULT 0,
    `backlogByStatus` JSON NULL,
    `categoryDistribution` JSON NULL,
    `topAgents` JSON NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `support_analytics_date_key`(`date`),
    INDEX `support_analytics_date_idx`(`date`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `_KnowledgeBaseToKnowledgeBaseTag` (
    `A` VARCHAR(191) NOT NULL,
    `B` VARCHAR(191) NOT NULL,

    UNIQUE INDEX `_KnowledgeBaseToKnowledgeBaseTag_AB_unique`(`A`, `B`),
    INDEX `_KnowledgeBaseToKnowledgeBaseTag_B_index`(`B`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE UNIQUE INDEX `qr_payments_vtuTransactionId_key` ON `qr_payments`(`vtuTransactionId`);

-- CreateIndex
CREATE UNIQUE INDEX `qr_payments_walletTransactionId_key` ON `qr_payments`(`walletTransactionId`);

-- CreateIndex
CREATE INDEX `support_replies_userId_idx` ON `support_replies`(`userId`);

-- CreateIndex
CREATE INDEX `support_replies_createdAt_idx` ON `support_replies`(`createdAt`);

-- CreateIndex
CREATE UNIQUE INDEX `support_tickets_ticketNumber_key` ON `support_tickets`(`ticketNumber`);

-- CreateIndex
CREATE INDEX `support_tickets_ticketNumber_idx` ON `support_tickets`(`ticketNumber`);

-- CreateIndex
CREATE INDEX `support_tickets_assignedTo_idx` ON `support_tickets`(`assignedTo`);

-- CreateIndex
CREATE INDEX `support_tickets_priority_idx` ON `support_tickets`(`priority`);

-- CreateIndex
CREATE INDEX `support_tickets_createdAt_idx` ON `support_tickets`(`createdAt`);

-- CreateIndex
CREATE INDEX `support_tickets_resolutionDeadline_idx` ON `support_tickets`(`resolutionDeadline`);

-- CreateIndex
CREATE INDEX `support_tickets_slaStatus_idx` ON `support_tickets`(`slaStatus`);

-- CreateIndex
CREATE INDEX `support_tickets_parentTicketId_idx` ON `support_tickets`(`parentTicketId`);

-- CreateIndex
CREATE INDEX `support_tickets_mergedTicketId_idx` ON `support_tickets`(`mergedTicketId`);

-- CreateIndex
CREATE INDEX `support_tickets_duplicateOfTicketId_idx` ON `support_tickets`(`duplicateOfTicketId`);

-- CreateIndex
CREATE INDEX `vendor_health_checks_serviceType_idx` ON `vendor_health_checks`(`serviceType`);

-- CreateIndex
CREATE UNIQUE INDEX `vtu_transactions_walletTransactionId_key` ON `vtu_transactions`(`walletTransactionId`);

-- CreateIndex
CREATE INDEX `vtu_transactions_selectedVendorId_idx` ON `vtu_transactions`(`selectedVendorId`);

-- CreateIndex
CREATE UNIQUE INDEX `wallet_transactions_debitTransferId_key` ON `wallet_transactions`(`debitTransferId`);

-- CreateIndex
CREATE UNIQUE INDEX `wallet_transactions_creditTransferId_key` ON `wallet_transactions`(`creditTransferId`);

-- AddForeignKey
ALTER TABLE `wallet_transactions` ADD CONSTRAINT `wallet_transactions_debitTransferId_fkey` FOREIGN KEY (`debitTransferId`) REFERENCES `wallet_transfers`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `wallet_transactions` ADD CONSTRAINT `wallet_transactions_creditTransferId_fkey` FOREIGN KEY (`creditTransferId`) REFERENCES `wallet_transfers`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `qr_payments` ADD CONSTRAINT `qr_payments_vtuTransactionId_fkey` FOREIGN KEY (`vtuTransactionId`) REFERENCES `vtu_transactions`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `vendor_services` ADD CONSTRAINT `vendor_services_vendorId_fkey` FOREIGN KEY (`vendorId`) REFERENCES `vendors`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `vendor_api_endpoints` ADD CONSTRAINT `vendor_api_endpoints_vendorId_fkey` FOREIGN KEY (`vendorId`) REFERENCES `vendors`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `vendor_transformers` ADD CONSTRAINT `vendor_transformers_vendorId_fkey` FOREIGN KEY (`vendorId`) REFERENCES `vendors`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `vendor_failover_rules` ADD CONSTRAINT `vendor_failover_rules_vendorId_fkey` FOREIGN KEY (`vendorId`) REFERENCES `vendors`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `circuit_breakers` ADD CONSTRAINT `circuit_breakers_vendorId_fkey` FOREIGN KEY (`vendorId`) REFERENCES `vendors`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `vendor_daily_metrics` ADD CONSTRAINT `vendor_daily_metrics_vendorId_fkey` FOREIGN KEY (`vendorId`) REFERENCES `vendors`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `vendor_selection_logs` ADD CONSTRAINT `vendor_selection_logs_selectedVendorId_fkey` FOREIGN KEY (`selectedVendorId`) REFERENCES `vendors`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `vtu_transactions` ADD CONSTRAINT `vtu_transactions_selectedVendorId_fkey` FOREIGN KEY (`selectedVendorId`) REFERENCES `vendors`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `vtu_transaction_attempts` ADD CONSTRAINT `vtu_transaction_attempts_transactionId_fkey` FOREIGN KEY (`transactionId`) REFERENCES `vtu_transactions`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `vtu_transaction_attempts` ADD CONSTRAINT `vtu_transaction_attempts_vendorId_fkey` FOREIGN KEY (`vendorId`) REFERENCES `vendors`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `product_providers` ADD CONSTRAINT `product_providers_productId_fkey` FOREIGN KEY (`productId`) REFERENCES `product_catalog`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `product_providers` ADD CONSTRAINT `product_providers_vendorId_fkey` FOREIGN KEY (`vendorId`) REFERENCES `vendors`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `support_tickets` ADD CONSTRAINT `support_tickets_assignedTo_fkey` FOREIGN KEY (`assignedTo`) REFERENCES `support_agents`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `support_tickets` ADD CONSTRAINT `support_tickets_assignedBy_fkey` FOREIGN KEY (`assignedBy`) REFERENCES `support_agents`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `support_tickets` ADD CONSTRAINT `support_tickets_escalatedTo_fkey` FOREIGN KEY (`escalatedTo`) REFERENCES `support_agents`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `support_tickets` ADD CONSTRAINT `support_tickets_escalatedBy_fkey` FOREIGN KEY (`escalatedBy`) REFERENCES `support_agents`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `support_tickets` ADD CONSTRAINT `support_tickets_slaId_fkey` FOREIGN KEY (`slaId`) REFERENCES `support_slas`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `support_tickets` ADD CONSTRAINT `support_tickets_parentTicketId_fkey` FOREIGN KEY (`parentTicketId`) REFERENCES `support_tickets`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `support_tickets` ADD CONSTRAINT `support_tickets_mergedTicketId_fkey` FOREIGN KEY (`mergedTicketId`) REFERENCES `support_tickets`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `support_tickets` ADD CONSTRAINT `support_tickets_duplicateOfTicketId_fkey` FOREIGN KEY (`duplicateOfTicketId`) REFERENCES `support_tickets`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `support_agents` ADD CONSTRAINT `support_agents_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `agent_shifts` ADD CONSTRAINT `agent_shifts_agentId_fkey` FOREIGN KEY (`agentId`) REFERENCES `support_agents`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `support_replies` ADD CONSTRAINT `support_replies_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `support_reply_reactions` ADD CONSTRAINT `support_reply_reactions_replyId_fkey` FOREIGN KEY (`replyId`) REFERENCES `support_replies`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `support_reply_reactions` ADD CONSTRAINT `support_reply_reactions_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `support_internal_notes` ADD CONSTRAINT `support_internal_notes_ticketId_fkey` FOREIGN KEY (`ticketId`) REFERENCES `support_tickets`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `support_internal_notes` ADD CONSTRAINT `support_internal_notes_agentId_fkey` FOREIGN KEY (`agentId`) REFERENCES `support_agents`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `support_escalations` ADD CONSTRAINT `support_escalations_ticketId_fkey` FOREIGN KEY (`ticketId`) REFERENCES `support_tickets`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `support_escalations` ADD CONSTRAINT `support_escalations_escalatedFrom_fkey` FOREIGN KEY (`escalatedFrom`) REFERENCES `support_agents`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `support_escalations` ADD CONSTRAINT `support_escalations_escalatedTo_fkey` FOREIGN KEY (`escalatedTo`) REFERENCES `support_agents`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `support_escalations` ADD CONSTRAINT `support_escalations_approvedBy_fkey` FOREIGN KEY (`approvedBy`) REFERENCES `support_agents`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `support_satisfactions` ADD CONSTRAINT `support_satisfactions_ticketId_fkey` FOREIGN KEY (`ticketId`) REFERENCES `support_tickets`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `support_satisfactions` ADD CONSTRAINT `support_satisfactions_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `knowledge_base` ADD CONSTRAINT `knowledge_base_authorId_fkey` FOREIGN KEY (`authorId`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `knowledge_base` ADD CONSTRAINT `knowledge_base_reviewerId_fkey` FOREIGN KEY (`reviewerId`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `knowledge_base_votes` ADD CONSTRAINT `knowledge_base_votes_articleId_fkey` FOREIGN KEY (`articleId`) REFERENCES `knowledge_base`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `knowledge_base_votes` ADD CONSTRAINT `knowledge_base_votes_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `knowledge_base_revisions` ADD CONSTRAINT `knowledge_base_revisions_articleId_fkey` FOREIGN KEY (`articleId`) REFERENCES `knowledge_base`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `knowledge_base_revisions` ADD CONSTRAINT `knowledge_base_revisions_authorId_fkey` FOREIGN KEY (`authorId`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `knowledge_base_attachments` ADD CONSTRAINT `knowledge_base_attachments_articleId_fkey` FOREIGN KEY (`articleId`) REFERENCES `knowledge_base`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `knowledge_base_attachments` ADD CONSTRAINT `knowledge_base_attachments_uploadedBy_fkey` FOREIGN KEY (`uploadedBy`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `knowledge_base_ticket_links` ADD CONSTRAINT `knowledge_base_ticket_links_ticketId_fkey` FOREIGN KEY (`ticketId`) REFERENCES `support_tickets`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `knowledge_base_ticket_links` ADD CONSTRAINT `knowledge_base_ticket_links_articleId_fkey` FOREIGN KEY (`articleId`) REFERENCES `knowledge_base`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `knowledge_base_ticket_links` ADD CONSTRAINT `knowledge_base_ticket_links_addedBy_fkey` FOREIGN KEY (`addedBy`) REFERENCES `support_agents`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `support_ticket_tags` ADD CONSTRAINT `support_ticket_tags_ticketId_fkey` FOREIGN KEY (`ticketId`) REFERENCES `support_tickets`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `support_ticket_tags` ADD CONSTRAINT `support_ticket_tags_tagId_fkey` FOREIGN KEY (`tagId`) REFERENCES `support_tags`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `support_ticket_tags` ADD CONSTRAINT `support_ticket_tags_addedBy_fkey` FOREIGN KEY (`addedBy`) REFERENCES `support_agents`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `support_automation_executions` ADD CONSTRAINT `support_automation_executions_ruleId_fkey` FOREIGN KEY (`ruleId`) REFERENCES `support_automation_rules`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `support_automation_executions` ADD CONSTRAINT `support_automation_executions_ticketId_fkey` FOREIGN KEY (`ticketId`) REFERENCES `support_tickets`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `support_automation_executions` ADD CONSTRAINT `support_automation_executions_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `support_ticket_automations` ADD CONSTRAINT `support_ticket_automations_ticketId_fkey` FOREIGN KEY (`ticketId`) REFERENCES `support_tickets`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `support_ticket_automations` ADD CONSTRAINT `support_ticket_automations_automationId_fkey` FOREIGN KEY (`automationId`) REFERENCES `support_automation_rules`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `support_macros` ADD CONSTRAINT `support_macros_createdBy_fkey` FOREIGN KEY (`createdBy`) REFERENCES `support_agents`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `support_chat_sessions` ADD CONSTRAINT `support_chat_sessions_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `support_chat_sessions` ADD CONSTRAINT `support_chat_sessions_agentId_fkey` FOREIGN KEY (`agentId`) REFERENCES `support_agents`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `support_chat_sessions` ADD CONSTRAINT `support_chat_sessions_ticketId_fkey` FOREIGN KEY (`ticketId`) REFERENCES `support_tickets`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `agent_performance` ADD CONSTRAINT `agent_performance_agentId_fkey` FOREIGN KEY (`agentId`) REFERENCES `support_agents`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `agent_notes` ADD CONSTRAINT `agent_notes_agentId_fkey` FOREIGN KEY (`agentId`) REFERENCES `support_agents`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `support_attachments` ADD CONSTRAINT `support_attachments_ticketId_fkey` FOREIGN KEY (`ticketId`) REFERENCES `support_tickets`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `support_attachments` ADD CONSTRAINT `support_attachments_uploadedBy_fkey` FOREIGN KEY (`uploadedBy`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `support_audit_logs` ADD CONSTRAINT `support_audit_logs_ticketId_fkey` FOREIGN KEY (`ticketId`) REFERENCES `support_tickets`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `support_audit_logs` ADD CONSTRAINT `support_audit_logs_agentId_fkey` FOREIGN KEY (`agentId`) REFERENCES `support_agents`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `_KnowledgeBaseToKnowledgeBaseTag` ADD CONSTRAINT `_KnowledgeBaseToKnowledgeBaseTag_A_fkey` FOREIGN KEY (`A`) REFERENCES `knowledge_base`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `_KnowledgeBaseToKnowledgeBaseTag` ADD CONSTRAINT `_KnowledgeBaseToKnowledgeBaseTag_B_fkey` FOREIGN KEY (`B`) REFERENCES `knowledge_base_tags`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
