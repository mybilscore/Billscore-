/*
  Warnings:

  - A unique constraint covering the columns `[tokenHash]` on the table `sessions` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `tokenHash` to the `sessions` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX `sessions_token_idx` ON `sessions`;

-- DropIndex
DROP INDEX `sessions_token_key` ON `sessions`;

-- AlterTable
ALTER TABLE `sessions` ADD COLUMN `tokenHash` VARCHAR(191) NOT NULL,
    MODIFY `token` TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX `sessions_tokenHash_key` ON `sessions`(`tokenHash`);

-- CreateIndex
CREATE INDEX `sessions_tokenHash_idx` ON `sessions`(`tokenHash`);
