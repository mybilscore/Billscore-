-- AlterTable
ALTER TABLE `saved_meters` ADD COLUMN `customerAddress` VARCHAR(191) NULL,
    ADD COLUMN `customerEmail` VARCHAR(191) NULL,
    ADD COLUMN `customerName` VARCHAR(191) NULL,
    ADD COLUMN `customerPhone` VARCHAR(191) NULL,
    ADD COLUMN `lastVerified` DATETIME(3) NULL,
    ADD COLUMN `meterStatus` VARCHAR(191) NULL;
