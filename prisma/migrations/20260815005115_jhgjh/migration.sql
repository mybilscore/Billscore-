-- AlterTable
ALTER TABLE `vtu_transactions` ADD COLUMN `commission_computation` VARCHAR(191) NULL,
    ADD COLUMN `commission_metadata` JSON NULL,
    ADD COLUMN `commission_rate` DECIMAL(65, 30) NULL DEFAULT 0,
    ADD COLUMN `commission_type` VARCHAR(191) NULL,
    ADD COLUMN `cost_price` DECIMAL(65, 30) NULL DEFAULT 0,
    ADD COLUMN `effective_rate` DECIMAL(65, 30) NULL DEFAULT 0,
    ADD COLUMN `gross_profit` DECIMAL(65, 30) NULL DEFAULT 0,
    ADD COLUMN `net_profit` DECIMAL(65, 30) NULL DEFAULT 0,
    ADD COLUMN `platform_commission` DECIMAL(65, 30) NULL DEFAULT 0,
    ADD COLUMN `platform_total_amount` DECIMAL(65, 30) NULL DEFAULT 0,
    ADD COLUMN `profit_margin` DECIMAL(65, 30) NULL DEFAULT 0,
    ADD COLUMN `selling_price` DECIMAL(65, 30) NULL DEFAULT 0,
    ADD COLUMN `total_commission` DECIMAL(65, 30) NULL DEFAULT 0,
    ADD COLUMN `vendor_commission` DECIMAL(65, 30) NULL DEFAULT 0,
    ADD COLUMN `vendor_total_amount` DECIMAL(65, 30) NULL DEFAULT 0;

-- CreateIndex
CREATE INDEX `vtu_transactions_vendor_commission_idx` ON `vtu_transactions`(`vendor_commission`);

-- CreateIndex
CREATE INDEX `vtu_transactions_gross_profit_idx` ON `vtu_transactions`(`gross_profit`);

-- CreateIndex
CREATE INDEX `vtu_transactions_profit_margin_idx` ON `vtu_transactions`(`profit_margin`);

-- CreateIndex
CREATE INDEX `vtu_transactions_vendor_idx` ON `vtu_transactions`(`vendor`);

-- CreateIndex
CREATE INDEX `vtu_transactions_transactionType_idx` ON `vtu_transactions`(`transactionType`);

-- CreateIndex
CREATE INDEX `vtu_transactions_createdAt_status_idx` ON `vtu_transactions`(`createdAt`, `status`);

-- CreateIndex
CREATE INDEX `vtu_transactions_vendor_createdAt_idx` ON `vtu_transactions`(`vendor`, `createdAt`);

-- CreateIndex
CREATE INDEX `vtu_transactions_transactionType_createdAt_idx` ON `vtu_transactions`(`transactionType`, `createdAt`);

-- CreateIndex
CREATE INDEX `vtu_transactions_status_vendor_commission_idx` ON `vtu_transactions`(`status`, `vendor_commission`);
