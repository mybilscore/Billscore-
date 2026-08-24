-- AlterTable
ALTER TABLE `saved_decoders` ADD COLUMN `customerAddress` VARCHAR(191) NULL,
    ADD COLUMN `customerEmail` VARCHAR(191) NULL,
    ADD COLUMN `customerName` VARCHAR(191) NULL,
    ADD COLUMN `customerPhone` VARCHAR(191) NULL,
    ADD COLUMN `decoderStatus` VARCHAR(191) NULL,
    ADD COLUMN `lastVerified` DATETIME(3) NULL;
