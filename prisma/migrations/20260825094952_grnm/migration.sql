-- AlterTable
ALTER TABLE `vtu_transactions` ADD COLUMN `channelDisplay` VARCHAR(191) NULL DEFAULT 'Unknown';

-- CreateIndex
CREATE INDEX `vtu_transactions_channelDisplay_idx` ON `vtu_transactions`(`channelDisplay`);
