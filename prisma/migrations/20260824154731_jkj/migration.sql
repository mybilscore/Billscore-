-- AlterTable
ALTER TABLE `data_plans` ADD COLUMN `isActiveForWhatsApp` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `whatsappPriority` INTEGER NOT NULL DEFAULT 0;
