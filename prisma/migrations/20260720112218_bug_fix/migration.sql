-- CreateTable
CREATE TABLE `customers` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `phone` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NULL,
    `fullName` VARCHAR(191) NULL,
    `address` VARCHAR(191) NULL,
    `city` VARCHAR(191) NULL,
    `state` VARCHAR(191) NULL,
    `country` VARCHAR(191) NOT NULL DEFAULT 'Nigeria',
    `dateOfBirth` DATETIME(3) NULL,
    `gender` VARCHAR(191) NULL,
    `customerType` ENUM('REGULAR', 'PREMIUM', 'VIP', 'WHOLESALE') NOT NULL DEFAULT 'REGULAR',
    `isFavorite` BOOLEAN NOT NULL DEFAULT false,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `tags` JSON NOT NULL,
    `notes` VARCHAR(191) NULL,
    `totalTransactions` INTEGER NOT NULL DEFAULT 0,
    `totalSpent` DECIMAL(65, 30) NOT NULL DEFAULT 0,
    `totalCommissionEarned` DECIMAL(65, 30) NOT NULL DEFAULT 0,
    `lastTransactionAt` DATETIME(3) NULL,
    `firstTransactionAt` DATETIME(3) NULL,
    `lastInteractionAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `customers_userId_idx`(`userId`),
    INDEX `customers_phone_idx`(`phone`),
    INDEX `customers_isFavorite_idx`(`isFavorite`),
    INDEX `customers_createdAt_idx`(`createdAt`),
    INDEX `customers_lastTransactionAt_idx`(`lastTransactionAt`),
    UNIQUE INDEX `customers_userId_phone_key`(`userId`, `phone`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `customer_transactions` (
    `id` VARCHAR(191) NOT NULL,
    `customerId` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `vtuTransactionId` VARCHAR(191) NULL,
    `transactionType` ENUM('AIRTIME', 'DATA', 'ELECTRICITY_INSTANT', 'ELECTRICITY_PREORDER', 'CABLE_TV', 'EDUCATION', 'INSURANCE') NOT NULL,
    `amount` DECIMAL(65, 30) NOT NULL,
    `serviceFee` DECIMAL(65, 30) NOT NULL DEFAULT 0,
    `totalAmount` DECIMAL(65, 30) NOT NULL,
    `product` VARCHAR(191) NOT NULL,
    `phoneNumber` VARCHAR(191) NULL,
    `meterNumber` VARCHAR(191) NULL,
    `network` ENUM('MTN', 'GLO', 'AIRTEL', 'NINEMOBILE') NULL,
    `planName` VARCHAR(191) NULL,
    `customerPhoneProvided` VARCHAR(191) NULL,
    `customerNameProvided` VARCHAR(191) NULL,
    `commissionAmount` DECIMAL(65, 30) NOT NULL DEFAULT 0,
    `commissionRate` DECIMAL(65, 30) NOT NULL DEFAULT 0,
    `commissionPaid` BOOLEAN NOT NULL DEFAULT false,
    `commissionPaidAt` DATETIME(3) NULL,
    `status` ENUM('PENDING', 'PROCESSING', 'SUCCESS', 'FAILED') NOT NULL DEFAULT 'SUCCESS',
    `notes` VARCHAR(191) NULL,
    `metadata` JSON NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `customer_transactions_vtuTransactionId_key`(`vtuTransactionId`),
    INDEX `customer_transactions_customerId_idx`(`customerId`),
    INDEX `customer_transactions_userId_idx`(`userId`),
    INDEX `customer_transactions_createdAt_idx`(`createdAt`),
    INDEX `customer_transactions_transactionType_idx`(`transactionType`),
    INDEX `customer_transactions_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `customer_notes` (
    `id` VARCHAR(191) NOT NULL,
    `customerId` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `note` VARCHAR(191) NOT NULL,
    `type` VARCHAR(191) NOT NULL DEFAULT 'GENERAL',
    `isPinned` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `customer_notes_customerId_idx`(`customerId`),
    INDEX `customer_notes_userId_idx`(`userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `customer_communications` (
    `id` VARCHAR(191) NOT NULL,
    `customerId` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `channel` ENUM('WHATSAPP', 'MOBILE_APP', 'USSD', 'SMS', 'TELEGRAM', 'MESSENGER', 'API') NOT NULL,
    `type` VARCHAR(191) NOT NULL,
    `subject` VARCHAR(191) NULL,
    `message` VARCHAR(191) NOT NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'SENT',
    `reference` VARCHAR(191) NULL,
    `sentAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `deliveredAt` DATETIME(3) NULL,
    `readAt` DATETIME(3) NULL,
    `repliedAt` DATETIME(3) NULL,
    `metadata` JSON NULL,

    INDEX `customer_communications_customerId_idx`(`customerId`),
    INDEX `customer_communications_userId_idx`(`userId`),
    INDEX `customer_communications_sentAt_idx`(`sentAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `customer_devices` (
    `id` VARCHAR(191) NOT NULL,
    `customerId` VARCHAR(191) NOT NULL,
    `deviceId` VARCHAR(191) NULL,
    `deviceType` VARCHAR(191) NOT NULL,
    `deviceName` VARCHAR(191) NULL,
    `osType` VARCHAR(191) NULL,
    `osVersion` VARCHAR(191) NULL,
    `appVersion` VARCHAR(191) NULL,
    `pushToken` VARCHAR(191) NULL,
    `lastSeenAt` DATETIME(3) NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `customer_devices_deviceId_key`(`deviceId`),
    INDEX `customer_devices_customerId_idx`(`customerId`),
    INDEX `customer_devices_deviceId_idx`(`deviceId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `customer_loyalty_points` (
    `id` VARCHAR(191) NOT NULL,
    `customerId` VARCHAR(191) NOT NULL,
    `points` INTEGER NOT NULL DEFAULT 0,
    `tier` VARCHAR(191) NOT NULL DEFAULT 'BRONZE',
    `pointsToNextTier` INTEGER NOT NULL DEFAULT 100,
    `lifetimePoints` INTEGER NOT NULL DEFAULT 0,
    `lastActivityAt` DATETIME(3) NULL,
    `expiresAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `customer_loyalty_points_customerId_key`(`customerId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `customer_loyalty_transactions` (
    `id` VARCHAR(191) NOT NULL,
    `customerId` VARCHAR(191) NOT NULL,
    `loyaltyPointId` VARCHAR(191) NULL,
    `points` INTEGER NOT NULL,
    `type` VARCHAR(191) NOT NULL DEFAULT 'EARN',
    `source` VARCHAR(191) NOT NULL,
    `description` VARCHAR(191) NULL,
    `reference` VARCHAR(191) NULL,
    `transactionId` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `customer_loyalty_transactions_customerId_idx`(`customerId`),
    INDEX `customer_loyalty_transactions_createdAt_idx`(`createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `customer_segments` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `description` VARCHAR(191) NULL,
    `criteria` JSON NOT NULL,
    `color` VARCHAR(191) NULL,
    `type` ENUM('HIGH_SPENDERS', 'FREQUENT_BUYERS', 'NEW_CUSTOMERS', 'AT_RISK', 'LOYAL', 'CUSTOM') NOT NULL DEFAULT 'CUSTOM',
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `isSystem` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `customer_segments_userId_name_key`(`userId`, `name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `customer_segment_members` (
    `id` VARCHAR(191) NOT NULL,
    `segmentId` VARCHAR(191) NOT NULL,
    `customerId` VARCHAR(191) NOT NULL,
    `addedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `removedAt` DATETIME(3) NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,

    UNIQUE INDEX `customer_segment_members_segmentId_customerId_key`(`segmentId`, `customerId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `customer_discounts` (
    `id` VARCHAR(191) NOT NULL,
    `customerId` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `discountType` VARCHAR(191) NOT NULL,
    `discountValue` DECIMAL(65, 30) NOT NULL,
    `description` VARCHAR(191) NULL,
    `minPurchase` DECIMAL(65, 30) NULL,
    `maxDiscount` DECIMAL(65, 30) NULL,
    `validFrom` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `validUntil` DATETIME(3) NOT NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `isUsed` BOOLEAN NOT NULL DEFAULT false,
    `usedAt` DATETIME(3) NULL,
    `transactionId` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `customer_discounts_customerId_idx`(`customerId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `commission_settings` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `transactionType` ENUM('AIRTIME', 'DATA', 'ELECTRICITY_INSTANT', 'ELECTRICITY_PREORDER', 'CABLE_TV', 'EDUCATION', 'INSURANCE') NOT NULL,
    `commissionType` VARCHAR(191) NOT NULL DEFAULT 'PERCENTAGE',
    `commissionValue` DECIMAL(65, 30) NOT NULL DEFAULT 0,
    `minAmount` DECIMAL(65, 30) NULL,
    `maxAmount` DECIMAL(65, 30) NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `effectiveFrom` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `effectiveUntil` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `commission_settings_userId_idx`(`userId`),
    UNIQUE INDEX `commission_settings_userId_transactionType_key`(`userId`, `transactionType`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `customer_analytics` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `totalCustomers` INTEGER NOT NULL DEFAULT 0,
    `newCustomers` INTEGER NOT NULL DEFAULT 0,
    `activeCustomers` INTEGER NOT NULL DEFAULT 0,
    `favoriteCustomers` INTEGER NOT NULL DEFAULT 0,
    `churnedCustomers` INTEGER NOT NULL DEFAULT 0,
    `returningCustomers` INTEGER NOT NULL DEFAULT 0,
    `totalTransactions` INTEGER NOT NULL DEFAULT 0,
    `totalRevenue` DECIMAL(65, 30) NOT NULL DEFAULT 0,
    `averageTransactionValue` DECIMAL(65, 30) NOT NULL DEFAULT 0,
    `highestTransaction` DECIMAL(65, 30) NOT NULL DEFAULT 0,
    `totalCommissionEarned` DECIMAL(65, 30) NOT NULL DEFAULT 0,
    `averageCommission` DECIMAL(65, 30) NOT NULL DEFAULT 0,
    `highValueCustomers` INTEGER NOT NULL DEFAULT 0,
    `regularCustomers` INTEGER NOT NULL DEFAULT 0,
    `oneTimeCustomers` INTEGER NOT NULL DEFAULT 0,
    `wholesaleCustomers` INTEGER NOT NULL DEFAULT 0,
    `topCustomers` JSON NULL,
    `date` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `customer_analytics_userId_idx`(`userId`),
    INDEX `customer_analytics_date_idx`(`date`),
    UNIQUE INDEX `customer_analytics_userId_date_key`(`userId`, `date`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `customers` ADD CONSTRAINT `customers_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `customer_transactions` ADD CONSTRAINT `customer_transactions_customerId_fkey` FOREIGN KEY (`customerId`) REFERENCES `customers`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `customer_transactions` ADD CONSTRAINT `customer_transactions_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `customer_transactions` ADD CONSTRAINT `customer_transactions_vtuTransactionId_fkey` FOREIGN KEY (`vtuTransactionId`) REFERENCES `vtu_transactions`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `customer_notes` ADD CONSTRAINT `customer_notes_customerId_fkey` FOREIGN KEY (`customerId`) REFERENCES `customers`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `customer_notes` ADD CONSTRAINT `customer_notes_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `customer_communications` ADD CONSTRAINT `customer_communications_customerId_fkey` FOREIGN KEY (`customerId`) REFERENCES `customers`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `customer_communications` ADD CONSTRAINT `customer_communications_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `customer_devices` ADD CONSTRAINT `customer_devices_customerId_fkey` FOREIGN KEY (`customerId`) REFERENCES `customers`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `customer_loyalty_points` ADD CONSTRAINT `customer_loyalty_points_customerId_fkey` FOREIGN KEY (`customerId`) REFERENCES `customers`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `customer_loyalty_transactions` ADD CONSTRAINT `customer_loyalty_transactions_customerId_fkey` FOREIGN KEY (`customerId`) REFERENCES `customers`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `customer_loyalty_transactions` ADD CONSTRAINT `customer_loyalty_transactions_loyaltyPointId_fkey` FOREIGN KEY (`loyaltyPointId`) REFERENCES `customer_loyalty_points`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `customer_segments` ADD CONSTRAINT `customer_segments_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `customer_segment_members` ADD CONSTRAINT `customer_segment_members_segmentId_fkey` FOREIGN KEY (`segmentId`) REFERENCES `customer_segments`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `customer_segment_members` ADD CONSTRAINT `customer_segment_members_customerId_fkey` FOREIGN KEY (`customerId`) REFERENCES `customers`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `customer_discounts` ADD CONSTRAINT `customer_discounts_customerId_fkey` FOREIGN KEY (`customerId`) REFERENCES `customers`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `customer_discounts` ADD CONSTRAINT `customer_discounts_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `commission_settings` ADD CONSTRAINT `commission_settings_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `customer_analytics` ADD CONSTRAINT `customer_analytics_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
