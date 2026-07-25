-- AlterTable
ALTER TABLE `audit_logs` ADD COLUMN `timestamp` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    MODIFY `entityType` VARCHAR(191) NULL,
    MODIFY `entityId` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `sessions` ADD COLUMN `isActive` BOOLEAN NOT NULL DEFAULT true,
    ADD COLUMN `terminatedAt` DATETIME(3) NULL,
    ADD COLUMN `terminationReason` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `users` ADD COLUMN `isLocked` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `lastLoginIP` VARCHAR(191) NULL,
    ADD COLUMN `lastLoginUserAgent` VARCHAR(191) NULL,
    ADD COLUMN `lastPasswordChangeAt` DATETIME(3) NULL,
    ADD COLUMN `lockedAt` DATETIME(3) NULL,
    ADD COLUMN `lockedReason` VARCHAR(191) NULL,
    ADD COLUMN `loginAttempts` INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN `twoFactorEnabled` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `twoFactorSecret` VARCHAR(191) NULL;

-- CreateTable
CREATE TABLE `registration_attempts` (
    `id` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `ipAddress` VARCHAR(191) NOT NULL,
    `userAgent` VARCHAR(191) NULL,
    `attempts` INTEGER NOT NULL DEFAULT 1,
    `firstAttempt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `lastAttempt` DATETIME(3) NOT NULL,
    `blockedUntil` DATETIME(3) NULL,
    `blockReason` ENUM('BRUTE_FORCE', 'SUSPICIOUS_ACTIVITY', 'ADMIN_ACTION', 'POLICY_VIOLATION', 'FRAUD_SUSPICION', 'MULTIPLE_FAILURES', 'IP_BLOCKED', 'USER_REQUEST', 'SYSTEM_AUTO') NULL,
    `metadata` JSON NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `registration_attempts_email_idx`(`email`),
    INDEX `registration_attempts_ipAddress_idx`(`ipAddress`),
    INDEX `registration_attempts_blockedUntil_idx`(`blockedUntil`),
    UNIQUE INDEX `registration_attempts_email_ipAddress_key`(`email`, `ipAddress`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `rate_limits` (
    `id` VARCHAR(191) NOT NULL,
    `key` VARCHAR(191) NOT NULL,
    `requests` INTEGER NOT NULL DEFAULT 0,
    `windowStart` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `windowEnd` DATETIME(3) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `rate_limits_key_key`(`key`),
    INDEX `rate_limits_key_idx`(`key`),
    INDEX `rate_limits_windowEnd_idx`(`windowEnd`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `security_events` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NULL,
    `eventType` ENUM('LOGIN_ATTEMPT', 'REGISTRATION_ATTEMPT', 'PASSWORD_RESET', 'PIN_VERIFICATION', 'TWO_FACTOR_AUTH', 'SUSPICIOUS_ACTIVITY', 'BLOCKED_IP', 'BLOCKED_USER', 'RATE_LIMIT_EXCEEDED', 'BRUTE_FORCE_ATTEMPT', 'ACCOUNT_LOCKED', 'ACCOUNT_UNLOCKED', 'PERMISSION_CHANGED', 'ROLE_CHANGED', 'API_ACCESS', 'SESSION_CREATED', 'SESSION_TERMINATED', 'DEVICE_REGISTERED', 'DEVICE_UNREGISTERED') NOT NULL,
    `ipAddress` VARCHAR(191) NOT NULL,
    `userAgent` VARCHAR(191) NULL,
    `sessionId` VARCHAR(191) NULL,
    `location` VARCHAR(191) NULL,
    `deviceId` VARCHAR(191) NULL,
    `details` JSON NULL,
    `isBlocked` BOOLEAN NOT NULL DEFAULT false,
    `blockReason` ENUM('BRUTE_FORCE', 'SUSPICIOUS_ACTIVITY', 'ADMIN_ACTION', 'POLICY_VIOLATION', 'FRAUD_SUSPICION', 'MULTIPLE_FAILURES', 'IP_BLOCKED', 'USER_REQUEST', 'SYSTEM_AUTO') NULL,
    `blockedUntil` DATETIME(3) NULL,
    `isResolved` BOOLEAN NOT NULL DEFAULT false,
    `resolvedAt` DATETIME(3) NULL,
    `resolvedBy` VARCHAR(191) NULL,
    `resolutionNotes` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `registrationAttemptId` VARCHAR(191) NULL,
    `rateLimitId` VARCHAR(191) NULL,
    `blockedIPId` VARCHAR(191) NULL,

    INDEX `security_events_userId_idx`(`userId`),
    INDEX `security_events_eventType_idx`(`eventType`),
    INDEX `security_events_ipAddress_idx`(`ipAddress`),
    INDEX `security_events_createdAt_idx`(`createdAt`),
    INDEX `security_events_isBlocked_idx`(`isBlocked`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `blocked_ips` (
    `id` VARCHAR(191) NOT NULL,
    `ipAddress` VARCHAR(191) NOT NULL,
    `reason` VARCHAR(191) NULL,
    `blockedBy` VARCHAR(191) NULL,
    `blockedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `expiresAt` DATETIME(3) NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `attempts` INTEGER NOT NULL DEFAULT 0,
    `lastAttemptAt` DATETIME(3) NULL,
    `notes` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `blocked_ips_ipAddress_key`(`ipAddress`),
    INDEX `blocked_ips_ipAddress_idx`(`ipAddress`),
    INDEX `blocked_ips_isActive_idx`(`isActive`),
    INDEX `blocked_ips_expiresAt_idx`(`expiresAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `security_alerts` (
    `id` VARCHAR(191) NOT NULL,
    `type` VARCHAR(191) NOT NULL,
    `severity` VARCHAR(191) NOT NULL,
    `message` VARCHAR(191) NOT NULL,
    `details` JSON NULL,
    `source` VARCHAR(191) NULL,
    `sourceId` VARCHAR(191) NULL,
    `isResolved` BOOLEAN NOT NULL DEFAULT false,
    `resolvedAt` DATETIME(3) NULL,
    `resolvedBy` VARCHAR(191) NULL,
    `notes` VARCHAR(191) NULL,
    `userId` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `security_alerts_severity_idx`(`severity`),
    INDEX `security_alerts_isResolved_idx`(`isResolved`),
    INDEX `security_alerts_createdAt_idx`(`createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE INDEX `audit_logs_action_idx` ON `audit_logs`(`action`);

-- CreateIndex
CREATE INDEX `audit_logs_timestamp_idx` ON `audit_logs`(`timestamp`);

-- CreateIndex
CREATE INDEX `sessions_isActive_idx` ON `sessions`(`isActive`);

-- AddForeignKey
ALTER TABLE `security_events` ADD CONSTRAINT `security_events_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `security_events` ADD CONSTRAINT `security_events_registrationAttemptId_fkey` FOREIGN KEY (`registrationAttemptId`) REFERENCES `registration_attempts`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `security_events` ADD CONSTRAINT `security_events_rateLimitId_fkey` FOREIGN KEY (`rateLimitId`) REFERENCES `rate_limits`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `security_events` ADD CONSTRAINT `security_events_sessionId_fkey` FOREIGN KEY (`sessionId`) REFERENCES `sessions`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `security_events` ADD CONSTRAINT `security_events_blockedIPId_fkey` FOREIGN KEY (`blockedIPId`) REFERENCES `blocked_ips`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `security_alerts` ADD CONSTRAINT `security_alerts_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
