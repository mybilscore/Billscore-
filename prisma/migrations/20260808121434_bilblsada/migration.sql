-- AlterTable
ALTER TABLE `vtu_transactions` ADD COLUMN `dataPlanId` VARCHAR(191) NULL;

-- CreateTable
CREATE TABLE `data_plans` (
    `id` VARCHAR(191) NOT NULL,
    `network` ENUM('MTN', 'GLO', 'AIRTEL', 'NINEMOBILE') NOT NULL,
    `planType` ENUM('SME', 'GIFTING', 'COOPERATE_GIFTING', 'CORPORATE', 'PREMIUM', 'STANDARD', 'BASIC') NOT NULL DEFAULT 'GIFTING',
    `planCategory` ENUM('DATA', 'AIRTIME', 'VOICE', 'SMS', 'BUNDLE', 'ROAMING', 'SPECIAL') NOT NULL DEFAULT 'DATA',
    `name` VARCHAR(191) NOT NULL,
    `amountMB` INTEGER NOT NULL,
    `description` VARCHAR(191) NULL,
    `ourPrice` DECIMAL(65, 30) NOT NULL DEFAULT 0,
    `vendorPrice` DECIMAL(65, 30) NOT NULL DEFAULT 0,
    `validity` INTEGER NOT NULL,
    `validityUnit` ENUM('HOURS', 'DAYS', 'MONTHS', 'YEARS', 'MINUTES') NOT NULL DEFAULT 'DAYS',
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `status` ENUM('ACTIVE', 'INACTIVE', 'DEPRECATED', 'COMING_SOON') NOT NULL DEFAULT 'ACTIVE',
    `vendorId` VARCHAR(191) NULL,
    `vendorPlanId` VARCHAR(191) NULL,
    `vendorNetworkCode` VARCHAR(191) NULL,
    `vendorPlanType` VARCHAR(191) NULL,
    `vendorMetadata` JSON NULL,
    `importBatch` VARCHAR(191) NULL,
    `lastSyncedAt` DATETIME(3) NULL,
    `createdBy` VARCHAR(191) NULL,
    `updatedBy` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `data_plans_network_idx`(`network`),
    INDEX `data_plans_vendorId_idx`(`vendorId`),
    INDEX `data_plans_isActive_idx`(`isActive`),
    INDEX `data_plans_status_idx`(`status`),
    INDEX `data_plans_importBatch_idx`(`importBatch`),
    UNIQUE INDEX `data_plans_vendorId_vendorPlanId_key`(`vendorId`, `vendorPlanId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `network_configs` (
    `id` VARCHAR(191) NOT NULL,
    `network` ENUM('MTN', 'GLO', 'AIRTEL', 'NINEMOBILE') NOT NULL,
    `code` VARCHAR(191) NOT NULL,
    `displayName` VARCHAR(191) NOT NULL,
    `logo` VARCHAR(191) NULL,
    `color` VARCHAR(191) NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `priority` INTEGER NOT NULL DEFAULT 1,
    `vendorNetworkMapping` JSON NULL,
    `metadata` JSON NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `network_configs_network_key`(`network`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `plan_price_histories` (
    `id` VARCHAR(191) NOT NULL,
    `dataPlanId` VARCHAR(191) NOT NULL,
    `oldPrice` DECIMAL(65, 30) NOT NULL,
    `newPrice` DECIMAL(65, 30) NOT NULL,
    `changedBy` VARCHAR(191) NOT NULL,
    `changeReason` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `plan_price_histories_dataPlanId_idx`(`dataPlanId`),
    INDEX `plan_price_histories_createdAt_idx`(`createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `plan_import_logs` (
    `id` VARCHAR(191) NOT NULL,
    `vendorId` VARCHAR(191) NULL,
    `vendorCode` VARCHAR(191) NOT NULL,
    `totalRecords` INTEGER NOT NULL,
    `successfulRecords` INTEGER NOT NULL,
    `failedRecords` INTEGER NOT NULL,
    `errors` JSON NOT NULL,
    `source` VARCHAR(191) NOT NULL,
    `importedBy` VARCHAR(191) NULL,
    `metadata` JSON NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `plan_import_logs_vendorId_idx`(`vendorId`),
    INDEX `plan_import_logs_vendorCode_idx`(`vendorCode`),
    INDEX `plan_import_logs_createdAt_idx`(`createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE INDEX `vtu_transactions_dataPlanId_idx` ON `vtu_transactions`(`dataPlanId`);

-- AddForeignKey
ALTER TABLE `vtu_transactions` ADD CONSTRAINT `vtu_transactions_dataPlanId_fkey` FOREIGN KEY (`dataPlanId`) REFERENCES `data_plans`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `data_plans` ADD CONSTRAINT `data_plans_network_fkey` FOREIGN KEY (`network`) REFERENCES `network_configs`(`network`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `data_plans` ADD CONSTRAINT `data_plans_vendorId_fkey` FOREIGN KEY (`vendorId`) REFERENCES `vendors`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `data_plans` ADD CONSTRAINT `data_plans_createdBy_fkey` FOREIGN KEY (`createdBy`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `data_plans` ADD CONSTRAINT `data_plans_updatedBy_fkey` FOREIGN KEY (`updatedBy`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `plan_price_histories` ADD CONSTRAINT `plan_price_histories_dataPlanId_fkey` FOREIGN KEY (`dataPlanId`) REFERENCES `data_plans`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `plan_import_logs` ADD CONSTRAINT `plan_import_logs_vendorId_fkey` FOREIGN KEY (`vendorId`) REFERENCES `vendors`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
