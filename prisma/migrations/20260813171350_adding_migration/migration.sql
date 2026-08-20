-- AlterTable
ALTER TABLE `audit_logs` MODIFY `channel` ENUM('WHATSAPP', 'MOBILE_APP', 'USSD', 'SMS', 'TELEGRAM', 'MESSENGER', 'API', 'WEB_APP') NULL;

-- AlterTable
ALTER TABLE `bulk_operations` MODIFY `channel` ENUM('WHATSAPP', 'MOBILE_APP', 'USSD', 'SMS', 'TELEGRAM', 'MESSENGER', 'API', 'WEB_APP') NULL;

-- AlterTable
ALTER TABLE `channels` MODIFY `channelType` ENUM('WHATSAPP', 'MOBILE_APP', 'USSD', 'SMS', 'TELEGRAM', 'MESSENGER', 'API', 'WEB_APP') NOT NULL;

-- AlterTable
ALTER TABLE `customer_communications` MODIFY `channel` ENUM('WHATSAPP', 'MOBILE_APP', 'USSD', 'SMS', 'TELEGRAM', 'MESSENGER', 'API', 'WEB_APP') NOT NULL;

-- AlterTable
ALTER TABLE `pre_orders` MODIFY `channel` ENUM('WHATSAPP', 'MOBILE_APP', 'USSD', 'SMS', 'TELEGRAM', 'MESSENGER', 'API', 'WEB_APP') NULL;

-- AlterTable
ALTER TABLE `referrals` MODIFY `channel` ENUM('WHATSAPP', 'MOBILE_APP', 'USSD', 'SMS', 'TELEGRAM', 'MESSENGER', 'API', 'WEB_APP') NULL;

-- AlterTable
ALTER TABLE `repayments` MODIFY `channel` ENUM('WHATSAPP', 'MOBILE_APP', 'USSD', 'SMS', 'TELEGRAM', 'MESSENGER', 'API', 'WEB_APP') NULL;

-- AlterTable
ALTER TABLE `retailer_loans` MODIFY `appliedChannel` ENUM('WHATSAPP', 'MOBILE_APP', 'USSD', 'SMS', 'TELEGRAM', 'MESSENGER', 'API', 'WEB_APP') NULL,
    MODIFY `disbursedChannel` ENUM('WHATSAPP', 'MOBILE_APP', 'USSD', 'SMS', 'TELEGRAM', 'MESSENGER', 'API', 'WEB_APP') NULL;

-- AlterTable
ALTER TABLE `sessions` MODIFY `channel` ENUM('WHATSAPP', 'MOBILE_APP', 'USSD', 'SMS', 'TELEGRAM', 'MESSENGER', 'API', 'WEB_APP') NULL;

-- AlterTable
ALTER TABLE `subscriptions` MODIFY `channel` ENUM('WHATSAPP', 'MOBILE_APP', 'USSD', 'SMS', 'TELEGRAM', 'MESSENGER', 'API', 'WEB_APP') NULL;

-- AlterTable
ALTER TABLE `users` MODIFY `preferredChannel` ENUM('WHATSAPP', 'MOBILE_APP', 'USSD', 'SMS', 'TELEGRAM', 'MESSENGER', 'API', 'WEB_APP') NULL;

-- AlterTable
ALTER TABLE `vtu_transactions` MODIFY `channel` ENUM('WHATSAPP', 'MOBILE_APP', 'USSD', 'SMS', 'TELEGRAM', 'MESSENGER', 'API', 'WEB_APP') NULL;

-- AlterTable
ALTER TABLE `wallet_transactions` MODIFY `channel` ENUM('WHATSAPP', 'MOBILE_APP', 'USSD', 'SMS', 'TELEGRAM', 'MESSENGER', 'API', 'WEB_APP') NULL;

-- AlterTable
ALTER TABLE `wallet_transfers` MODIFY `channel` ENUM('WHATSAPP', 'MOBILE_APP', 'USSD', 'SMS', 'TELEGRAM', 'MESSENGER', 'API', 'WEB_APP') NULL;
