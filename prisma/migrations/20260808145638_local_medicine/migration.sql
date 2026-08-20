-- DropForeignKey
ALTER TABLE `data_plans` DROP FOREIGN KEY `data_plans_createdBy_fkey`;

-- DropForeignKey
ALTER TABLE `data_plans` DROP FOREIGN KEY `data_plans_updatedBy_fkey`;

-- DropIndex
DROP INDEX `data_plans_createdBy_fkey` ON `data_plans`;

-- DropIndex
DROP INDEX `data_plans_updatedBy_fkey` ON `data_plans`;
