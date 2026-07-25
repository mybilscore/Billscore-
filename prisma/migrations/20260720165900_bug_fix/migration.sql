-- CreateTable
CREATE TABLE `saved_meters` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `meterNumber` VARCHAR(191) NOT NULL,
    `disco` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NULL,
    `meterType` VARCHAR(191) NOT NULL DEFAULT 'Prepaid',
    `isDefault` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `saved_meters_userId_idx`(`userId`),
    INDEX `saved_meters_isDefault_idx`(`isDefault`),
    UNIQUE INDEX `saved_meters_userId_meterNumber_key`(`userId`, `meterNumber`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `saved_decoders` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `decoderNumber` VARCHAR(191) NOT NULL,
    `provider` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NULL,
    `package` VARCHAR(191) NULL,
    `isDefault` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `saved_decoders_userId_idx`(`userId`),
    INDEX `saved_decoders_isDefault_idx`(`isDefault`),
    UNIQUE INDEX `saved_decoders_userId_decoderNumber_key`(`userId`, `decoderNumber`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `saved_meters` ADD CONSTRAINT `saved_meters_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `saved_decoders` ADD CONSTRAINT `saved_decoders_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
