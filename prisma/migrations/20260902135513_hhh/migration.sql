-- AlterTable
ALTER TABLE `disco_info` MODIFY `code` ENUM('IKEJA', 'EKO', 'ABUJA', 'KANO', 'PHCN', 'IBADAN', 'BENIN', 'ENUGU', 'JOS', 'PORT_HARCOURT', 'YOLA') NOT NULL;

-- AlterTable
ALTER TABLE `pre_orders` MODIFY `disCo` ENUM('IKEJA', 'EKO', 'ABUJA', 'KANO', 'PHCN', 'IBADAN', 'BENIN', 'ENUGU', 'JOS', 'PORT_HARCOURT', 'YOLA') NOT NULL;

-- AlterTable
ALTER TABLE `qr_codes` MODIFY `disco` ENUM('IKEJA', 'EKO', 'ABUJA', 'KANO', 'PHCN', 'IBADAN', 'BENIN', 'ENUGU', 'JOS', 'PORT_HARCOURT', 'YOLA') NULL;

-- AlterTable
ALTER TABLE `subscriptions` MODIFY `disCo` ENUM('IKEJA', 'EKO', 'ABUJA', 'KANO', 'PHCN', 'IBADAN', 'BENIN', 'ENUGU', 'JOS', 'PORT_HARCOURT', 'YOLA') NULL;

-- AlterTable
ALTER TABLE `token_vault` MODIFY `disCo` ENUM('IKEJA', 'EKO', 'ABUJA', 'KANO', 'PHCN', 'IBADAN', 'BENIN', 'ENUGU', 'JOS', 'PORT_HARCOURT', 'YOLA') NOT NULL;
