-- CreateTable
CREATE TABLE `accounts` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `uid` VARCHAR(191) NOT NULL,
    `userId` INTEGER NOT NULL,
    `type` VARCHAR(191) NOT NULL,
    `provider` VARCHAR(191) NOT NULL,
    `providerAccountId` VARCHAR(191) NOT NULL,
    `refresh_token` TEXT NULL,
    `access_token` TEXT NULL,
    `expires_at` INTEGER NULL,
    `token_type` VARCHAR(191) NULL,
    `scope` VARCHAR(191) NULL,
    `id_token` TEXT NULL,
    `session_state` VARCHAR(191) NULL,

    UNIQUE INDEX `accounts_uid_key`(`uid`),
    INDEX `accounts_uid_idx`(`uid`),
    INDEX `accounts_userId_fkey`(`userId`),
    UNIQUE INDEX `accounts_provider_providerAccountId_key`(`provider`, `providerAccountId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `sessions` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `uid` VARCHAR(191) NOT NULL,
    `sessionToken` VARCHAR(191) NOT NULL,
    `userId` INTEGER NOT NULL,
    `expires` DATETIME(3) NOT NULL,

    UNIQUE INDEX `sessions_uid_key`(`uid`),
    UNIQUE INDEX `sessions_sessionToken_key`(`sessionToken`),
    INDEX `sessions_uid_idx`(`uid`),
    INDEX `sessions_userId_fkey`(`userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `verification_tokens` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `uid` VARCHAR(191) NOT NULL,
    `identifier` VARCHAR(191) NOT NULL,
    `token` VARCHAR(191) NOT NULL,
    `expires` DATETIME(3) NOT NULL,

    UNIQUE INDEX `verification_tokens_uid_key`(`uid`),
    UNIQUE INDEX `verification_tokens_token_key`(`token`),
    INDEX `verification_tokens_uid_idx`(`uid`),
    UNIQUE INDEX `verification_tokens_identifier_token_key`(`identifier`, `token`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `users` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `uid` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NULL,
    `email` VARCHAR(191) NULL,
    `emailVerified` DATETIME(3) NULL,
    `image` VARCHAR(191) NULL,
    `party_id` INTEGER NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `users_uid_key`(`uid`),
    UNIQUE INDEX `users_email_key`(`email`),
    UNIQUE INDEX `users_party_id_key`(`party_id`),
    INDEX `users_uid_idx`(`uid`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `password_resets` (
    `id` VARCHAR(191) NOT NULL,
    `userId` INTEGER NOT NULL,
    `token` VARCHAR(191) NOT NULL,
    `expiresAt` DATETIME(3) NOT NULL,
    `used` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `password_resets_userId_idx`(`userId`),
    INDEX `password_resets_token_idx`(`token`),
    INDEX `password_resets_expiresAt_idx`(`expiresAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `parties` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `uid` VARCHAR(191) NOT NULL,
    `type` VARCHAR(191) NOT NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'ACTIVE',
    `slug` VARCHAR(191) NOT NULL,
    `user_id` INTEGER NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `created_by` INTEGER NULL,
    `updated_by` INTEGER NULL,
    `verified` BOOLEAN NOT NULL DEFAULT false,
    `verified_at` DATETIME(3) NULL,
    `verified_by` INTEGER NULL,
    `verification_method` VARCHAR(191) NULL,
    `verification_docs` LONGTEXT NULL,
    `risk_rating` VARCHAR(191) NULL,
    `risk_factors` LONGTEXT NULL,
    `last_reviewed` DATETIME(3) NULL,
    `reviewed_by` INTEGER NULL,

    UNIQUE INDEX `parties_uid_key`(`uid`),
    UNIQUE INDEX `parties_slug_key`(`slug`),
    UNIQUE INDEX `parties_user_id_key`(`user_id`),
    INDEX `parties_type_idx`(`type`),
    INDEX `parties_status_idx`(`status`),
    INDEX `parties_created_at_idx`(`created_at`),
    INDEX `parties_uid_idx`(`uid`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `individual_parties` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `uid` VARCHAR(191) NOT NULL,
    `party_id` INTEGER NOT NULL,
    `title` VARCHAR(191) NULL,
    `first_name` VARCHAR(191) NOT NULL,
    `middle_name` VARCHAR(191) NULL,
    `last_name` VARCHAR(191) NOT NULL,
    `suffix` VARCHAR(191) NULL,
    `preferred_name` VARCHAR(191) NULL,
    `gender` VARCHAR(191) NULL,
    `date_of_birth` DATETIME(3) NULL,
    `place_of_birth` VARCHAR(191) NULL,
    `nationality` VARCHAR(191) NULL DEFAULT 'NIGERIAN',
    `ethnicity` VARCHAR(191) NULL,
    `religion` VARCHAR(191) NULL,
    `marital_status` VARCHAR(191) NULL,
    `id_type` VARCHAR(191) NULL,
    `id_number` VARCHAR(191) NULL,
    `id_issue_date` DATETIME(3) NULL,
    `id_expiry_date` DATETIME(3) NULL,
    `id_issue_place` VARCHAR(191) NULL,
    `id_document_url` VARCHAR(191) NULL,
    `biometric_id` VARCHAR(191) NULL,
    `fingerprint` VARCHAR(191) NULL,
    `photo_url` VARCHAR(191) NULL,
    `occupation` VARCHAR(191) NULL,
    `job_title` VARCHAR(191) NULL,
    `employer` VARCHAR(191) NULL,
    `employer_id` INTEGER NULL,
    `department` VARCHAR(191) NULL,
    `employee_id` VARCHAR(191) NULL,
    `work_phone` VARCHAR(191) NULL,
    `work_email` VARCHAR(191) NULL,
    `highest_education` VARCHAR(191) NULL,
    `profession` VARCHAR(191) NULL,
    `skills` LONGTEXT NULL,
    `father_name` VARCHAR(191) NULL,
    `mother_name` VARCHAR(191) NULL,
    `spouse_name` VARCHAR(191) NULL,
    `number_of_children` INTEGER NULL DEFAULT 0,
    `emergency_contact_name` VARCHAR(191) NULL,
    `emergency_contact_phone` VARCHAR(191) NULL,
    `emergency_contact_relation` VARCHAR(191) NULL,
    `blood_group` VARCHAR(191) NULL,
    `allergies` LONGTEXT NULL,
    `medical_conditions` LONGTEXT NULL,
    `health_insurance_provider` VARCHAR(191) NULL,
    `health_insurance_number` VARCHAR(191) NULL,
    `farmer_type` VARCHAR(191) NULL,
    `years_farming` INTEGER NULL,
    `primary_crops` LONGTEXT NULL,
    `farm_size` DOUBLE NULL,
    `livestock_count` LONGTEXT NULL,
    `farming_certifications` LONGTEXT NULL,
    `is_spv_beneficiary` BOOLEAN NOT NULL DEFAULT false,
    `spv_equity_percent` DOUBLE NULL,
    `beneficiary_since` DATETIME(3) NULL,
    `digital_literacy_level` VARCHAR(191) NULL,
    `has_smartphone` BOOLEAN NOT NULL DEFAULT false,
    `preferred_contact_method` VARCHAR(191) NULL,
    `primary_language` VARCHAR(191) NULL DEFAULT 'ENGLISH',
    `secondary_language` VARCHAR(191) NULL,
    `can_read` BOOLEAN NOT NULL DEFAULT true,
    `can_write` BOOLEAN NOT NULL DEFAULT true,
    `password_hash` VARCHAR(191) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `individual_parties_uid_key`(`uid`),
    UNIQUE INDEX `individual_parties_party_id_key`(`party_id`),
    UNIQUE INDEX `individual_party_id_number`(`id_number`),
    UNIQUE INDEX `individual_party_work_email`(`work_email`),
    INDEX `individual_parties_last_name_first_name_idx`(`last_name`, `first_name`),
    INDEX `individual_parties_farmer_type_idx`(`farmer_type`),
    INDEX `individual_parties_uid_idx`(`uid`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `organization_parties` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `uid` VARCHAR(191) NOT NULL,
    `party_id` INTEGER NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `legal_name` VARCHAR(191) NULL,
    `trading_name` VARCHAR(191) NULL,
    `abbreviation` VARCHAR(191) NULL,
    `organization_type` VARCHAR(191) NOT NULL,
    `industry` VARCHAR(191) NULL,
    `sector` VARCHAR(191) NULL,
    `sub_sector` VARCHAR(191) NULL,
    `registration_number` VARCHAR(191) NULL,
    `tax_id` VARCHAR(191) NULL,
    `tax_id_type` VARCHAR(191) NULL,
    `registration_date` DATETIME(3) NULL,
    `registration_authority` VARCHAR(191) NULL,
    `registration_document_url` VARCHAR(191) NULL,
    `legal_structure` VARCHAR(191) NULL,
    `country_of_incorporation` VARCHAR(191) NULL DEFAULT 'NIGERIA',
    `year_founded` INTEGER NULL,
    `founded_date` DATETIME(3) NULL,
    `website` VARCHAR(191) NULL,
    `company_email` VARCHAR(191) NULL,
    `company_phone` VARCHAR(191) NULL,
    `company_fax` VARCHAR(191) NULL,
    `employee_count` INTEGER NULL,
    `annual_revenue` LONGTEXT NULL,
    `revenue_range` VARCHAR(191) NULL,
    `verified` BOOLEAN NOT NULL DEFAULT false,
    `verified_by` INTEGER NULL,
    `verified_date` DATETIME(3) NULL,
    `verification_level` VARCHAR(191) NULL,
    `licenses` LONGTEXT NULL,
    `certifications` LONGTEXT NULL,
    `insurance_provider` VARCHAR(191) NULL,
    `insurance_policy` VARCHAR(191) NULL,
    `insurance_expiry` DATETIME(3) NULL,
    `insurance_coverage` LONGTEXT NULL,
    `parent_company_id` INTEGER NULL,
    `stock_symbol` VARCHAR(191) NULL,
    `stock_exchange` VARCHAR(191) NULL,
    `esg_rating` VARCHAR(191) NULL,
    `sustainability_certifications` LONGTEXT NULL,
    `carbon_footprint` DOUBLE NULL,
    `water_usage` DOUBLE NULL,
    `is_spv` BOOLEAN NOT NULL DEFAULT false,
    `spv_parent` VARCHAR(191) NULL,
    `spv_partners` LONGTEXT NULL,
    `spv_equity_breakdown` LONGTEXT NULL,
    `cooperative_type` VARCHAR(191) NULL,
    `membership_count` INTEGER NULL,
    `registration_status` VARCHAR(191) NULL,
    `government_level` VARCHAR(191) NULL,
    `ministry` VARCHAR(191) NULL,
    `agency_code` VARCHAR(191) NULL,
    `primary_bank` VARCHAR(191) NULL,
    `primary_account` VARCHAR(191) NULL,
    `logo_url` VARCHAR(191) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `organization_parties_uid_key`(`uid`),
    UNIQUE INDEX `organization_parties_party_id_key`(`party_id`),
    UNIQUE INDEX `org_party_reg_number`(`registration_number`),
    UNIQUE INDEX `org_party_company_email`(`company_email`),
    INDEX `organization_parties_organization_type_idx`(`organization_type`),
    INDEX `organization_parties_industry_idx`(`industry`),
    INDEX `organization_parties_name_idx`(`name`),
    INDEX `organization_parties_uid_idx`(`uid`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `community_parties` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `uid` VARCHAR(191) NOT NULL,
    `party_id` INTEGER NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `alternative_name` VARCHAR(191) NULL,
    `community_type` VARCHAR(191) NOT NULL,
    `community_category` VARCHAR(191) NOT NULL,
    `population` INTEGER NULL,
    `male_count` INTEGER NULL,
    `female_count` INTEGER NULL,
    `children_count` INTEGER NULL,
    `adult_count` INTEGER NULL,
    `elderly_count` INTEGER NULL,
    `household_count` INTEGER NULL,
    `region` VARCHAR(191) NULL,
    `local_government` VARCHAR(191) NULL,
    `ward` VARCHAR(191) NULL,
    `village` VARCHAR(191) NULL,
    `settlement_type` VARCHAR(191) NULL,
    `latitude` DOUBLE NULL,
    `longitude` DOUBLE NULL,
    `altitude` DOUBLE NULL,
    `land_area` DOUBLE NULL,
    `grazing_land_ha` DOUBLE NULL,
    `farmland_ha` DOUBLE NULL,
    `water_sources` LONGTEXT NULL,
    `traditional_leader` VARCHAR(191) NULL,
    `leader_title` VARCHAR(191) NULL,
    `leadership_structure` LONGTEXT NULL,
    `council_members` INTEGER NULL,
    `governance_type` VARCHAR(191) NULL,
    `has_constitution` BOOLEAN NULL DEFAULT false,
    `constitution_url` VARCHAR(191) NULL,
    `meeting_frequency` VARCHAR(191) NULL,
    `primary_economic_activity` VARCHAR(191) NULL,
    `secondary_activities` LONGTEXT NULL,
    `main_crops` LONGTEXT NULL,
    `main_livestock` LONGTEXT NULL,
    `annual_income_range` VARCHAR(191) NULL,
    `total_land_ha` DOUBLE NULL,
    `communal_land_ha` DOUBLE NULL,
    `individual_land_ha` DOUBLE NULL,
    `livestock_count` INTEGER NULL,
    `communal_assets` LONGTEXT NULL,
    `has_electricity` BOOLEAN NULL DEFAULT false,
    `has_water_supply` BOOLEAN NULL DEFAULT false,
    `has_health_clinic` BOOLEAN NULL DEFAULT false,
    `has_school` BOOLEAN NULL DEFAULT false,
    `has_market` BOOLEAN NULL DEFAULT false,
    `has_mosque_church` BOOLEAN NULL DEFAULT false,
    `road_access` VARCHAR(191) NULL,
    `mobile_network_coverage` VARCHAR(191) NULL,
    `internet_access` VARCHAR(191) NULL,
    `is_spv_beneficiary` BOOLEAN NOT NULL DEFAULT false,
    `spv_equity_percent` DOUBLE NULL,
    `spv_programs` LONGTEXT NULL,
    `beneficiary_since` DATETIME(3) NULL,
    `development_partners` LONGTEXT NULL,
    `active_projects` LONGTEXT NULL,
    `conflict_risk_level` VARCHAR(191) NULL,
    `conflict_history` LONGTEXT NULL,
    `peace_agreements` LONGTEXT NULL,
    `grazing_routes` LONGTEXT NULL,
    `environmental_zone` VARCHAR(191) NULL,
    `climate_risks` LONGTEXT NULL,
    `conservation_areas` LONGTEXT NULL,
    `ethnic_group` VARCHAR(191) NULL,
    `language` VARCHAR(191) NULL,
    `cultural_practices` LONGTEXT NULL,
    `festivals` LONGTEXT NULL,
    `official_representative_id` INTEGER NULL,
    `alternate_representative_id` INTEGER NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `mapped_by` INTEGER NULL,
    `mapping_date` DATETIME(3) NULL,

    UNIQUE INDEX `community_parties_uid_key`(`uid`),
    UNIQUE INDEX `community_parties_party_id_key`(`party_id`),
    INDEX `community_parties_community_type_idx`(`community_type`),
    INDEX `community_parties_local_government_idx`(`local_government`),
    INDEX `community_parties_is_spv_beneficiary_idx`(`is_spv_beneficiary`),
    INDEX `community_parties_uid_idx`(`uid`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `party_representatives` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `uid` VARCHAR(191) NOT NULL,
    `individual_id` INTEGER NOT NULL,
    `represented_party_id` INTEGER NOT NULL,
    `representation_type` VARCHAR(191) NOT NULL,
    `title` VARCHAR(191) NULL,
    `role_description` VARCHAR(191) NULL,
    `authorization_type` VARCHAR(191) NULL,
    `authorization_ref` VARCHAR(191) NULL,
    `authorization_date` DATETIME(3) NULL,
    `authorization_document_url` VARCHAR(191) NULL,
    `authorized_by` INTEGER NULL,
    `start_date` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `end_date` DATETIME(3) NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `is_primary` BOOLEAN NOT NULL DEFAULT false,
    `scope_type` VARCHAR(191) NULL,
    `scope_description` VARCHAR(191) NULL,
    `scope_limitations` LONGTEXT NULL,
    `financial_limit` DOUBLE NULL,
    `contract_limit` DOUBLE NULL,
    `can_sign_contracts` BOOLEAN NOT NULL DEFAULT false,
    `can_approve_payments` BOOLEAN NOT NULL DEFAULT false,
    `can_vote` BOOLEAN NOT NULL DEFAULT false,
    `can_commit_resources` BOOLEAN NOT NULL DEFAULT false,
    `requires_co_signer` BOOLEAN NOT NULL DEFAULT false,
    `co_signer_id` INTEGER NULL,
    `is_hereditary` BOOLEAN NOT NULL DEFAULT false,
    `succession_order` INTEGER NULL,
    `dedicated_phone` VARCHAR(191) NULL,
    `dedicated_email` VARCHAR(191) NULL,
    `last_meeting_attended` DATETIME(3) NULL,
    `meeting_attendance_rate` DOUBLE NULL,
    `performance_rating` VARCHAR(191) NULL,
    `last_evaluation` DATETIME(3) NULL,
    `evaluation_notes` VARCHAR(191) NULL,
    `signed_agreement_url` VARCHAR(191) NULL,
    `notify_on_events` BOOLEAN NOT NULL DEFAULT true,
    `notification_channels` LONGTEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `created_by` INTEGER NULL,
    `updated_by` INTEGER NULL,

    UNIQUE INDEX `party_representatives_uid_key`(`uid`),
    INDEX `party_representatives_represented_party_id_is_active_idx`(`represented_party_id`, `is_active`),
    INDEX `party_representatives_individual_id_is_active_idx`(`individual_id`, `is_active`),
    INDEX `party_representatives_end_date_idx`(`end_date`),
    INDEX `party_representatives_uid_idx`(`uid`),
    UNIQUE INDEX `party_representatives_individual_id_represented_party_id_rep_key`(`individual_id`, `represented_party_id`, `representation_type`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `party_contacts` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `uid` VARCHAR(191) NOT NULL,
    `party_id` INTEGER NOT NULL,
    `type` VARCHAR(191) NOT NULL,
    `value` VARCHAR(191) NOT NULL,
    `country_code` VARCHAR(191) NULL,
    `area_code` VARCHAR(191) NULL,
    `extension` VARCHAR(191) NULL,
    `whatsapp_business` BOOLEAN NULL DEFAULT false,
    `is_verified` BOOLEAN NOT NULL DEFAULT false,
    `verified_at` DATETIME(3) NULL,
    `verification_method` VARCHAR(191) NULL,
    `is_primary` BOOLEAN NOT NULL DEFAULT false,
    `is_emergency` BOOLEAN NOT NULL DEFAULT false,
    `priority_order` INTEGER NULL,
    `available_from` VARCHAR(191) NULL,
    `available_to` VARCHAR(191) NULL,
    `timezone` VARCHAR(191) NULL,
    `notes` VARCHAR(191) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `created_by` INTEGER NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT true,

    UNIQUE INDEX `party_contacts_uid_key`(`uid`),
    INDEX `party_contacts_type_idx`(`type`),
    INDEX `party_contacts_is_primary_idx`(`is_primary`),
    INDEX `party_contacts_uid_idx`(`uid`),
    UNIQUE INDEX `party_contacts_party_id_value_key`(`party_id`, `value`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `party_addresses` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `uid` VARCHAR(191) NOT NULL,
    `party_id` INTEGER NOT NULL,
    `type` VARCHAR(191) NOT NULL,
    `address_line1` VARCHAR(191) NOT NULL,
    `address_line2` VARCHAR(191) NULL,
    `address_line3` VARCHAR(191) NULL,
    `city` VARCHAR(191) NOT NULL,
    `state` VARCHAR(191) NOT NULL,
    `postal_code` VARCHAR(191) NULL,
    `country` VARCHAR(191) NOT NULL DEFAULT 'NG',
    `landmark` VARCHAR(191) NULL,
    `district` VARCHAR(191) NULL,
    `region` VARCHAR(191) NULL,
    `latitude` DOUBLE NULL,
    `longitude` DOUBLE NULL,
    `altitude` DOUBLE NULL,
    `gps_accuracy` DOUBLE NULL,
    `geofence` LONGTEXT NULL,
    `village` VARCHAR(191) NULL,
    `ward` VARCHAR(191) NULL,
    `local_government` VARCHAR(191) NULL,
    `traditional_authority` VARCHAR(191) NULL,
    `farm_name` VARCHAR(191) NULL,
    `plot_number` VARCHAR(191) NULL,
    `hectare` DOUBLE NULL,
    `soil_type` VARCHAR(191) NULL,
    `irrigation_access` BOOLEAN NULL DEFAULT false,
    `is_verified` BOOLEAN NOT NULL DEFAULT false,
    `verified_at` DATETIME(3) NULL,
    `verified_by` INTEGER NULL,
    `verification_method` VARCHAR(191) NULL,
    `is_primary` BOOLEAN NOT NULL DEFAULT false,
    `is_public` BOOLEAN NOT NULL DEFAULT true,
    `valid_from` DATETIME(3) NULL,
    `valid_to` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `created_by` INTEGER NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT true,

    UNIQUE INDEX `party_addresses_uid_key`(`uid`),
    INDEX `party_addresses_country_state_city_idx`(`country`, `state`, `city`),
    INDEX `party_addresses_latitude_longitude_idx`(`latitude`, `longitude`),
    INDEX `party_addresses_uid_idx`(`uid`),
    INDEX `party_addresses_party_id_fkey`(`party_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `party_documents` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `uid` VARCHAR(191) NOT NULL,
    `party_id` INTEGER NOT NULL,
    `document_type` VARCHAR(191) NOT NULL,
    `document_name` VARCHAR(191) NOT NULL,
    `document_number` VARCHAR(191) NULL,
    `file_url` VARCHAR(191) NOT NULL,
    `file_type` VARCHAR(191) NOT NULL,
    `file_size` INTEGER NULL,
    `issue_date` DATETIME(3) NULL,
    `expiry_date` DATETIME(3) NULL,
    `issuing_authority` VARCHAR(191) NULL,
    `is_verified` BOOLEAN NOT NULL DEFAULT false,
    `verified_at` DATETIME(3) NULL,
    `verified_by` INTEGER NULL,
    `is_confidential` BOOLEAN NOT NULL DEFAULT false,
    `access_level` VARCHAR(191) NULL,
    `notes` VARCHAR(191) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `created_by` INTEGER NULL,

    UNIQUE INDEX `party_documents_uid_key`(`uid`),
    INDEX `party_documents_document_type_idx`(`document_type`),
    INDEX `party_documents_expiry_date_idx`(`expiry_date`),
    INDEX `party_documents_uid_idx`(`uid`),
    INDEX `party_documents_party_id_fkey`(`party_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `party_bank_accounts` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `uid` VARCHAR(191) NOT NULL,
    `party_id` INTEGER NOT NULL,
    `bank_name` VARCHAR(191) NOT NULL,
    `bank_code` VARCHAR(191) NULL,
    `branch_name` VARCHAR(191) NULL,
    `branch_code` VARCHAR(191) NULL,
    `account_name` VARCHAR(191) NOT NULL,
    `account_number` VARCHAR(191) NOT NULL,
    `account_type` VARCHAR(191) NULL,
    `currency` VARCHAR(191) NOT NULL DEFAULT 'NGN',
    `swift_code` VARCHAR(191) NULL,
    `iban` VARCHAR(191) NULL,
    `routing_number` VARCHAR(191) NULL,
    `is_verified` BOOLEAN NOT NULL DEFAULT false,
    `verified_at` DATETIME(3) NULL,
    `verification_doc` VARCHAR(191) NULL,
    `is_primary` BOOLEAN NOT NULL DEFAULT false,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `default_for_payments` BOOLEAN NOT NULL DEFAULT false,
    `payment_processor_id` VARCHAR(191) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `created_by` INTEGER NULL,

    UNIQUE INDEX `party_bank_accounts_uid_key`(`uid`),
    INDEX `party_bank_accounts_uid_idx`(`uid`),
    UNIQUE INDEX `party_bank_accounts_party_id_account_number_bank_code_key`(`party_id`, `account_number`, `bank_code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `party_tax_info` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `uid` VARCHAR(191) NOT NULL,
    `party_id` INTEGER NOT NULL,
    `tax_id_type` VARCHAR(191) NOT NULL,
    `tax_id_number` VARCHAR(191) NOT NULL,
    `tax_authority` VARCHAR(191) NULL,
    `tax_regime` VARCHAR(191) NULL,
    `is_vat_registered` BOOLEAN NOT NULL DEFAULT false,
    `vat_number` VARCHAR(191) NULL,
    `tax_certificate_url` VARCHAR(191) NULL,
    `certificate_expiry` DATETIME(3) NULL,
    `is_verified` BOOLEAN NOT NULL DEFAULT false,
    `verified_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `party_tax_info_uid_key`(`uid`),
    UNIQUE INDEX `party_tax_info_tax_id_number_key`(`tax_id_number`),
    INDEX `party_tax_info_uid_idx`(`uid`),
    UNIQUE INDEX `party_tax_info_party_id_tax_id_type_key`(`party_id`, `tax_id_type`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `party_roles` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `uid` VARCHAR(191) NOT NULL,
    `party_id` INTEGER NOT NULL,
    `role_name` VARCHAR(191) NOT NULL,
    `role_category` VARCHAR(191) NULL,
    `platform` VARCHAR(191) NOT NULL,
    `delegated_from` INTEGER NULL,
    `representation_id` INTEGER NULL,
    `assigned_by` INTEGER NULL,
    `assigned_date` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `approved_by` INTEGER NULL,
    `approved_date` DATETIME(3) NULL,
    `valid_from` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `valid_to` DATETIME(3) NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `permissions` LONGTEXT NOT NULL,
    `access_level` VARCHAR(191) NULL,
    `restrictions` LONGTEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `party_roles_uid_key`(`uid`),
    INDEX `party_roles_platform_idx`(`platform`),
    INDEX `party_roles_party_id_platform_idx`(`party_id`, `platform`),
    INDEX `party_roles_delegated_from_idx`(`delegated_from`),
    INDEX `party_roles_valid_to_idx`(`valid_to`),
    INDEX `party_roles_uid_idx`(`uid`),
    INDEX `party_roles_representation_id_fkey`(`representation_id`),
    UNIQUE INDEX `party_roles_party_id_role_name_platform_delegated_from_key`(`party_id`, `role_name`, `platform`, `delegated_from`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `party_sessions` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `uid` VARCHAR(191) NOT NULL,
    `party_id` INTEGER NOT NULL,
    `token` VARCHAR(191) NOT NULL,
    `platform` VARCHAR(191) NOT NULL,
    `expires_at` DATETIME(3) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `last_activity` DATETIME(3) NULL,
    `acting_as` INTEGER NULL,
    `context_id` VARCHAR(191) NULL,
    `ip_address` VARCHAR(191) NULL,
    `user_agent` VARCHAR(191) NULL,
    `device_id` VARCHAR(191) NULL,
    `device_name` VARCHAR(191) NULL,
    `device_type` VARCHAR(191) NULL,
    `location_lat` DOUBLE NULL,
    `location_lng` DOUBLE NULL,
    `location_city` VARCHAR(191) NULL,
    `location_country` VARCHAR(191) NULL,
    `is_valid` BOOLEAN NOT NULL DEFAULT true,
    `invalidated_at` DATETIME(3) NULL,
    `invalidated_by` INTEGER NULL,

    UNIQUE INDEX `party_sessions_uid_key`(`uid`),
    UNIQUE INDEX `party_sessions_token_key`(`token`),
    INDEX `party_sessions_token_idx`(`token`),
    INDEX `party_sessions_expires_at_idx`(`expires_at`),
    INDEX `party_sessions_party_id_platform_idx`(`party_id`, `platform`),
    INDEX `party_sessions_uid_idx`(`uid`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `party_relationships` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `uid` VARCHAR(191) NOT NULL,
    `from_party_id` INTEGER NOT NULL,
    `to_party_id` INTEGER NOT NULL,
    `relationship_type` VARCHAR(191) NOT NULL,
    `relationship_subtype` VARCHAR(191) NULL,
    `start_date` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `end_date` DATETIME(3) NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `role` VARCHAR(191) NULL,
    `share_percent` DOUBLE NULL,
    `contract_ref` VARCHAR(191) NULL,
    `financial_terms` LONGTEXT NULL,
    `is_verified` BOOLEAN NOT NULL DEFAULT false,
    `verified_by` INTEGER NULL,
    `verified_date` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `created_by` INTEGER NULL,

    UNIQUE INDEX `party_relationships_uid_key`(`uid`),
    INDEX `party_relationships_from_party_id_idx`(`from_party_id`),
    INDEX `party_relationships_to_party_id_idx`(`to_party_id`),
    INDEX `party_relationships_relationship_type_idx`(`relationship_type`),
    INDEX `party_relationships_uid_idx`(`uid`),
    UNIQUE INDEX `party_relationships_from_party_id_to_party_id_relationship_t_key`(`from_party_id`, `to_party_id`, `relationship_type`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `party_tags` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `uid` VARCHAR(191) NOT NULL,
    `party_id` INTEGER NOT NULL,
    `tag_name` VARCHAR(191) NOT NULL,
    `tag_category` VARCHAR(191) NULL,
    `tag_value` VARCHAR(191) NULL,
    `applied_by` INTEGER NULL,
    `applied_date` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `expires_at` DATETIME(3) NULL,

    UNIQUE INDEX `party_tags_uid_key`(`uid`),
    INDEX `party_tags_tag_name_idx`(`tag_name`),
    INDEX `party_tags_uid_idx`(`uid`),
    UNIQUE INDEX `party_tags_party_id_tag_name_key`(`party_id`, `tag_name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `party_custom_fields` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `uid` VARCHAR(191) NOT NULL,
    `party_id` INTEGER NOT NULL,
    `field_name` VARCHAR(191) NOT NULL,
    `field_type` VARCHAR(191) NOT NULL,
    `field_value` VARCHAR(191) NULL,
    `field_value_json` LONGTEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `created_by` INTEGER NULL,

    UNIQUE INDEX `party_custom_fields_uid_key`(`uid`),
    INDEX `party_custom_fields_uid_idx`(`uid`),
    UNIQUE INDEX `party_custom_fields_party_id_field_name_key`(`party_id`, `field_name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `party_notes` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `uid` VARCHAR(191) NOT NULL,
    `party_id` INTEGER NOT NULL,
    `note_type` VARCHAR(191) NOT NULL,
    `note_text` TEXT NOT NULL,
    `is_important` BOOLEAN NOT NULL DEFAULT false,
    `is_confidential` BOOLEAN NOT NULL DEFAULT false,
    `created_by` INTEGER NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `party_notes_uid_key`(`uid`),
    INDEX `party_notes_created_at_idx`(`created_at`),
    INDEX `party_notes_uid_idx`(`uid`),
    INDEX `party_notes_party_id_fkey`(`party_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `party_activity_log` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `uid` VARCHAR(191) NOT NULL,
    `party_id` INTEGER NOT NULL,
    `activity_type` VARCHAR(191) NOT NULL,
    `activity_description` VARCHAR(191) NOT NULL,
    `ip_address` VARCHAR(191) NULL,
    `user_agent` VARCHAR(191) NULL,
    `location` VARCHAR(191) NULL,
    `metadata` LONGTEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `party_activity_log_uid_key`(`uid`),
    INDEX `party_activity_log_created_at_idx`(`created_at`),
    INDEX `party_activity_log_uid_idx`(`uid`),
    INDEX `party_activity_log_party_id_fkey`(`party_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `party_notification_prefs` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `uid` VARCHAR(191) NOT NULL,
    `party_id` INTEGER NOT NULL,
    `email_enabled` BOOLEAN NOT NULL DEFAULT true,
    `sms_enabled` BOOLEAN NOT NULL DEFAULT true,
    `whatsapp_enabled` BOOLEAN NOT NULL DEFAULT false,
    `push_enabled` BOOLEAN NOT NULL DEFAULT true,
    `in_app_enabled` BOOLEAN NOT NULL DEFAULT true,
    `notify_on_harvest` BOOLEAN NOT NULL DEFAULT true,
    `notify_on_qa` BOOLEAN NOT NULL DEFAULT true,
    `notify_on_contract` BOOLEAN NOT NULL DEFAULT true,
    `notify_on_payment` BOOLEAN NOT NULL DEFAULT true,
    `notify_on_shipment` BOOLEAN NOT NULL DEFAULT true,
    `notify_on_alerts` BOOLEAN NOT NULL DEFAULT true,
    `digest_frequency` VARCHAR(191) NULL,
    `quiet_hours_start` VARCHAR(191) NULL,
    `quiet_hours_end` VARCHAR(191) NULL,
    `language` VARCHAR(191) NULL DEFAULT 'ENGLISH',
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `party_notification_prefs_uid_key`(`uid`),
    UNIQUE INDEX `party_notification_prefs_party_id_key`(`party_id`),
    INDEX `party_notification_prefs_uid_idx`(`uid`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `party_consents` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `uid` VARCHAR(191) NOT NULL,
    `party_id` INTEGER NOT NULL,
    `consent_type` VARCHAR(191) NOT NULL,
    `consent_version` VARCHAR(191) NOT NULL,
    `consent_text` VARCHAR(191) NULL,
    `is_granted` BOOLEAN NOT NULL DEFAULT true,
    `granted_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `granted_ip` VARCHAR(191) NULL,
    `expires_at` DATETIME(3) NULL,
    `revoked_at` DATETIME(3) NULL,
    `revoked_reason` VARCHAR(191) NULL,
    `document_url` VARCHAR(191) NULL,

    UNIQUE INDEX `party_consents_uid_key`(`uid`),
    INDEX `party_consents_uid_idx`(`uid`),
    UNIQUE INDEX `party_consents_party_id_consent_type_consent_version_key`(`party_id`, `consent_type`, `consent_version`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `party_preferences` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `uid` VARCHAR(191) NOT NULL,
    `party_id` INTEGER NOT NULL,
    `theme` VARCHAR(191) NULL DEFAULT 'light',
    `language` VARCHAR(191) NULL DEFAULT 'en',
    `timezone` VARCHAR(191) NULL DEFAULT 'Africa/Lagos',
    `date_format` VARCHAR(191) NULL DEFAULT 'DD/MM/YYYY',
    `number_format` VARCHAR(191) NULL DEFAULT '1,000.00',
    `default_dashboard` VARCHAR(191) NULL,
    `pinned_items` LONGTEXT NULL,
    `font_size` VARCHAR(191) NULL DEFAULT 'medium',
    `high_contrast` BOOLEAN NOT NULL DEFAULT false,
    `profile_visibility` VARCHAR(191) NULL,
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `party_preferences_uid_key`(`uid`),
    UNIQUE INDEX `party_preferences_party_id_key`(`party_id`),
    INDEX `party_preferences_uid_idx`(`uid`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `party_security_settings` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `uid` VARCHAR(191) NOT NULL,
    `party_id` INTEGER NOT NULL,
    `two_factor_enabled` BOOLEAN NOT NULL DEFAULT false,
    `two_factor_method` VARCHAR(191) NULL,
    `two_factor_secret` VARCHAR(191) NULL,
    `password_last_changed` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `password_expires_at` DATETIME(3) NULL,
    `password_history` LONGTEXT NULL,
    `max_sessions` INTEGER NULL DEFAULT 5,
    `session_timeout` INTEGER NULL DEFAULT 30,
    `alert_on_new_device` BOOLEAN NOT NULL DEFAULT true,
    `alert_on_new_location` BOOLEAN NOT NULL DEFAULT true,
    `trusted_devices` LONGTEXT NULL,
    `recovery_email` VARCHAR(191) NULL,
    `recovery_phone` VARCHAR(191) NULL,
    `backup_codes` LONGTEXT NULL,
    `security_questions` LONGTEXT NULL,
    `last_security_update` DATETIME(3) NOT NULL,

    UNIQUE INDEX `party_security_settings_uid_key`(`uid`),
    UNIQUE INDEX `party_security_settings_party_id_key`(`party_id`),
    INDEX `party_security_settings_uid_idx`(`uid`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `party_audit_logs` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `uid` VARCHAR(191) NOT NULL,
    `party_id` INTEGER NOT NULL,
    `acting_for_id` INTEGER NULL,
    `action` VARCHAR(191) NOT NULL,
    `action_category` VARCHAR(191) NULL,
    `entity_type` VARCHAR(191) NOT NULL,
    `entity_id` VARCHAR(191) NOT NULL,
    `old_values` LONGTEXT NULL,
    `new_values` LONGTEXT NULL,
    `changes` LONGTEXT NULL,
    `platform` VARCHAR(191) NULL,
    `ip_address` VARCHAR(191) NULL,
    `user_agent` VARCHAR(191) NULL,
    `location` VARCHAR(191) NULL,
    `request_id` VARCHAR(191) NULL,
    `session_id` VARCHAR(191) NULL,
    `success` BOOLEAN NOT NULL DEFAULT true,
    `error_message` VARCHAR(191) NULL,
    `timestamp` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `notes` VARCHAR(191) NULL,

    UNIQUE INDEX `party_audit_logs_uid_key`(`uid`),
    INDEX `party_audit_logs_party_id_idx`(`party_id`),
    INDEX `party_audit_logs_entity_type_entity_id_idx`(`entity_type`, `entity_id`),
    INDEX `party_audit_logs_timestamp_idx`(`timestamp`),
    INDEX `party_audit_logs_action_idx`(`action`),
    INDEX `party_audit_logs_uid_idx`(`uid`),
    INDEX `party_audit_logs_acting_for_id_fkey`(`acting_for_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `clusters` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `uid` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `description` VARCHAR(191) NULL,
    `cluster_type` VARCHAR(191) NOT NULL,
    `tier` VARCHAR(191) NOT NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'ACTIVE',
    `established_date` DATETIME(3) NULL,
    `registered_date` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `region` VARCHAR(191) NULL,
    `local_government` VARCHAR(191) NULL,
    `ward` VARCHAR(191) NULL,
    `village` VARCHAR(191) NULL,
    `gps_boundary` LONGTEXT NULL,
    `centroid_lat` DOUBLE NULL,
    `centroid_lng` DOUBLE NULL,
    `total_area_ha` DOUBLE NULL,
    `coordinator_id` INTEGER NULL,
    `supervisor_id` INTEGER NULL,
    `spv_id` INTEGER NULL,
    `anchor_id` INTEGER NULL,
    `community_id` INTEGER NULL,
    `member_count` INTEGER NULL DEFAULT 0,
    `active_members` INTEGER NULL DEFAULT 0,
    `total_farms` INTEGER NULL DEFAULT 0,
    `total_fields` INTEGER NULL DEFAULT 0,
    `total_land_ha` DOUBLE NULL DEFAULT 0,
    `cultivated_ha` DOUBLE NULL DEFAULT 0,
    `productivity_score` DOUBLE NULL,
    `compliance_score` DOUBLE NULL,
    `quality_score` DOUBLE NULL,
    `risk_rating` VARCHAR(191) NULL,
    `risk_factors` LONGTEXT NULL,
    `last_assessment` DATETIME(3) NULL,
    `is_spv_beneficiary` BOOLEAN NOT NULL DEFAULT false,
    `spv_equity_percent` DOUBLE NULL,
    `created_by` INTEGER NULL,
    `updated_by` INTEGER NULL,

    UNIQUE INDEX `clusters_uid_key`(`uid`),
    INDEX `clusters_tier_idx`(`tier`),
    INDEX `clusters_status_idx`(`status`),
    INDEX `clusters_region_local_government_idx`(`region`, `local_government`),
    INDEX `clusters_coordinator_id_idx`(`coordinator_id`),
    INDEX `clusters_uid_idx`(`uid`),
    INDEX `clusters_anchor_id_fkey`(`anchor_id`),
    INDEX `clusters_community_id_fkey`(`community_id`),
    INDEX `clusters_supervisor_id_fkey`(`supervisor_id`),
    UNIQUE INDEX `clusters_spv_id_uid_key`(`spv_id`, `uid`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `cluster_members` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `uid` VARCHAR(191) NOT NULL,
    `cluster_id` INTEGER NOT NULL,
    `party_id` INTEGER NOT NULL,
    `member_type` VARCHAR(191) NOT NULL,
    `membership_status` VARCHAR(191) NOT NULL DEFAULT 'ACTIVE',
    `role` VARCHAR(191) NULL,
    `joined_date` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `approved_date` DATETIME(3) NULL,
    `approved_by` INTEGER NULL,
    `exit_date` DATETIME(3) NULL,
    `exit_reason` VARCHAR(191) NULL,
    `allocated_land_ha` DOUBLE NULL,
    `land_ownership` VARCHAR(191) NULL,
    `is_community_leader` BOOLEAN NOT NULL DEFAULT false,
    `leadership_title` VARCHAR(191) NULL,
    `livestock_count` INTEGER NULL,
    `grazing_rights` BOOLEAN NULL DEFAULT false,
    `primary_contact` BOOLEAN NOT NULL DEFAULT false,
    `contact_preferences` LONGTEXT NULL,
    `contribution_type` VARCHAR(191) NULL,
    `contribution_value` DOUBLE NULL,
    `benefits_received` LONGTEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `created_by` INTEGER NULL,

    UNIQUE INDEX `cluster_members_uid_key`(`uid`),
    INDEX `cluster_members_cluster_id_membership_status_idx`(`cluster_id`, `membership_status`),
    INDEX `cluster_members_party_id_idx`(`party_id`),
    INDEX `cluster_members_uid_idx`(`uid`),
    UNIQUE INDEX `cluster_members_cluster_id_party_id_key`(`cluster_id`, `party_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `cluster_farms` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `uid` VARCHAR(191) NOT NULL,
    `cluster_id` INTEGER NOT NULL,
    `owner_party_id` INTEGER NULL,
    `operator_party_id` INTEGER NULL,
    `name` VARCHAR(191) NOT NULL,
    `farm_type` VARCHAR(191) NOT NULL,
    `latitude` DOUBLE NULL,
    `longitude` DOUBLE NULL,
    `gps_boundary` LONGTEXT NULL,
    `total_area_ha` DOUBLE NOT NULL,
    `cultivable_ha` DOUBLE NULL,
    `soil_type` VARCHAR(191) NULL,
    `soil_ph` DOUBLE NULL,
    `soil_fertility` VARCHAR(191) NULL,
    `soil_report_url` VARCHAR(191) NULL,
    `land_title_type` VARCHAR(191) NULL,
    `land_doc_url` VARCHAR(191) NULL,
    `land_registration_number` VARCHAR(191) NULL,
    `irrigation_type` VARCHAR(191) NULL,
    `irrigation_source` VARCHAR(191) NULL,
    `water_rights` BOOLEAN NULL DEFAULT false,
    `status` VARCHAR(191) NOT NULL DEFAULT 'ACTIVE',
    `current_crop` VARCHAR(191) NULL,
    `crop_variety` VARCHAR(191) NULL,
    `planting_date` DATETIME(3) NULL,
    `expected_harvest` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `created_by` INTEGER NULL,

    UNIQUE INDEX `cluster_farms_uid_key`(`uid`),
    INDEX `cluster_farms_cluster_id_idx`(`cluster_id`),
    INDEX `cluster_farms_owner_party_id_idx`(`owner_party_id`),
    INDEX `cluster_farms_status_idx`(`status`),
    INDEX `cluster_farms_uid_idx`(`uid`),
    INDEX `cluster_farms_operator_party_id_fkey`(`operator_party_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `farm_fields` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `uid` VARCHAR(191) NOT NULL,
    `farm_id` INTEGER NOT NULL,
    `name` VARCHAR(191) NULL,
    `field_number` VARCHAR(191) NOT NULL,
    `latitude` DOUBLE NULL,
    `longitude` DOUBLE NULL,
    `gps_boundary` LONGTEXT NULL,
    `area_ha` DOUBLE NOT NULL,
    `soil_type` VARCHAR(191) NULL,
    `soil_depth` DOUBLE NULL,
    `slope` VARCHAR(191) NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'ACTIVE',
    `current_cycle_id` INTEGER NULL,
    `irrigation_method` VARCHAR(191) NULL,
    `irrigation_schedule` LONGTEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `created_by` INTEGER NULL,

    UNIQUE INDEX `farm_fields_uid_key`(`uid`),
    INDEX `farm_fields_farm_id_idx`(`farm_id`),
    INDEX `farm_fields_status_idx`(`status`),
    INDEX `farm_fields_uid_idx`(`uid`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `crop_cycles` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `uid` VARCHAR(191) NOT NULL,
    `field_id` INTEGER NOT NULL,
    `cycle_number` INTEGER NOT NULL,
    `cycle_name` VARCHAR(191) NULL DEFAULT 'Elmeena Cycle',
    `crop_type` VARCHAR(191) NOT NULL DEFAULT 'ALFALFA',
    `variety` VARCHAR(191) NULL,
    `planting_date` DATETIME(3) NOT NULL,
    `germination_date` DATETIME(3) NULL,
    `first_cut_date` DATETIME(3) NULL,
    `expected_cuts` INTEGER NULL,
    `actual_cuts` INTEGER NULL DEFAULT 0,
    `status` VARCHAR(191) NOT NULL DEFAULT 'PLANTED',
    `seeds_used_kg` DOUBLE NULL,
    `fertilizer_used` LONGTEXT NULL,
    `pesticides_used` LONGTEXT NULL,
    `labor_days` INTEGER NULL,
    `weather_data` LONGTEXT NULL,
    `total_yield_kg` DOUBLE NULL DEFAULT 0,
    `yield_per_ha` DOUBLE NULL,
    `avg_moisture` DOUBLE NULL,
    `avg_protein` DOUBLE NULL,
    `completed_date` DATETIME(3) NULL,
    `closed_by` INTEGER NULL,
    `total_input_cost` DOUBLE NULL DEFAULT 0,
    `total_labor_cost` DOUBLE NULL DEFAULT 0,
    `total_equipment_cost` DOUBLE NULL DEFAULT 0,
    `total_cost` DOUBLE NULL DEFAULT 0,
    `revenue` DOUBLE NULL DEFAULT 0,
    `profit` DOUBLE NULL DEFAULT 0,
    `roi_percent` DOUBLE NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `crop_cycles_uid_key`(`uid`),
    INDEX `crop_cycles_field_id_cycle_number_idx`(`field_id`, `cycle_number`),
    INDEX `crop_cycles_status_idx`(`status`),
    INDEX `crop_cycles_uid_idx`(`uid`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `cycle_activities` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `uid` VARCHAR(191) NOT NULL,
    `cycle_id` INTEGER NOT NULL,
    `activity_type` VARCHAR(191) NOT NULL,
    `activity_date` DATETIME(3) NOT NULL,
    `performed_by` INTEGER NULL,
    `supervised_by` INTEGER NULL,
    `details` LONGTEXT NULL,
    `water_volume` DOUBLE NULL,
    `duration_hours` DOUBLE NULL,
    `product_name` VARCHAR(191) NULL,
    `product_quantity` DOUBLE NULL,
    `product_unit` VARCHAR(191) NULL,
    `observations` VARCHAR(191) NULL,
    `photos` LONGTEXT NULL,
    `issues_detected` BOOLEAN NULL DEFAULT false,
    `issue_description` VARCHAR(191) NULL,
    `corrective_action` VARCHAR(191) NULL,
    `cost_incurred` DOUBLE NULL,
    `cost_currency` VARCHAR(191) NULL DEFAULT 'NGN',
    `equipment_cost` DOUBLE NULL DEFAULT 0,
    `labor_cost` DOUBLE NULL DEFAULT 0,
    `material_cost` DOUBLE NULL DEFAULT 0,
    `total_cost` DOUBLE NULL DEFAULT 0,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `created_by` INTEGER NULL,

    UNIQUE INDEX `cycle_activities_uid_key`(`uid`),
    INDEX `cycle_activities_cycle_id_activity_date_idx`(`cycle_id`, `activity_date`),
    INDEX `cycle_activities_activity_type_idx`(`activity_type`),
    INDEX `cycle_activities_uid_idx`(`uid`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `inventory_items` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `uid` VARCHAR(191) NOT NULL,
    `item_type` VARCHAR(191) NOT NULL,
    `item_name` VARCHAR(191) NOT NULL,
    `item_code` VARCHAR(191) NULL,
    `description` VARCHAR(191) NULL,
    `manufacturer` VARCHAR(191) NULL,
    `supplier_id` INTEGER NULL,
    `unit_type` VARCHAR(191) NOT NULL,
    `unit_cost` DOUBLE NULL,
    `currency` VARCHAR(191) NOT NULL DEFAULT 'NGN',
    `current_stock` DOUBLE NOT NULL DEFAULT 0,
    `min_stock` DOUBLE NULL,
    `max_stock` DOUBLE NULL,
    `reorder_point` DOUBLE NULL,
    `storage_requirements` LONGTEXT NULL,
    `category` VARCHAR(191) NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `created_by` INTEGER NULL,

    UNIQUE INDEX `inventory_items_uid_key`(`uid`),
    UNIQUE INDEX `inventory_items_item_code_key`(`item_code`),
    INDEX `inventory_items_item_type_idx`(`item_type`),
    INDEX `inventory_items_item_code_idx`(`item_code`),
    INDEX `inventory_items_category_idx`(`category`),
    INDEX `inventory_items_supplier_id_idx`(`supplier_id`),
    INDEX `inventory_items_uid_idx`(`uid`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `inventory_batches` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `uid` VARCHAR(191) NOT NULL,
    `item_id` INTEGER NOT NULL,
    `batch_number` VARCHAR(191) NOT NULL,
    `manufactured_date` DATETIME(3) NULL,
    `expiry_date` DATETIME(3) NULL,
    `received_date` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `initial_quantity` DOUBLE NOT NULL,
    `current_quantity` DOUBLE NOT NULL,
    `unit_type` VARCHAR(191) NOT NULL,
    `purchase_price` DOUBLE NULL,
    `currency` VARCHAR(191) NOT NULL DEFAULT 'NGN',
    `supplier_batch` VARCHAR(191) NULL,
    `supplier_id` INTEGER NULL,
    `quality_certificate_url` VARCHAR(191) NULL,
    `lab_test_results` LONGTEXT NULL,
    `notes` VARCHAR(191) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `created_by` INTEGER NULL,

    UNIQUE INDEX `inventory_batches_uid_key`(`uid`),
    INDEX `inventory_batches_expiry_date_idx`(`expiry_date`),
    INDEX `inventory_batches_batch_number_idx`(`batch_number`),
    INDEX `inventory_batches_uid_idx`(`uid`),
    INDEX `inventory_batches_supplier_id_fkey`(`supplier_id`),
    UNIQUE INDEX `inventory_batches_item_id_batch_number_key`(`item_id`, `batch_number`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `inventory_movements` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `uid` VARCHAR(191) NOT NULL,
    `item_id` INTEGER NOT NULL,
    `batch_id` INTEGER NULL,
    `movement_type` VARCHAR(191) NOT NULL,
    `quantity` DOUBLE NOT NULL,
    `unit_type` VARCHAR(191) NOT NULL,
    `before_quantity` DOUBLE NULL,
    `after_quantity` DOUBLE NULL,
    `unit_cost` DOUBLE NULL,
    `total_cost` DOUBLE NULL,
    `reference_type` VARCHAR(191) NULL,
    `reference_id` INTEGER NULL,
    `reference_data` LONGTEXT NULL,
    `date` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `notes` VARCHAR(191) NULL,
    `document_url` VARCHAR(191) NULL,
    `cycle_id` INTEGER NULL,
    `activity_id` INTEGER NULL,
    `from_location_type` VARCHAR(191) NULL,
    `from_location_id` INTEGER NULL,
    `to_location_type` VARCHAR(191) NULL,
    `to_location_id` INTEGER NULL,
    `po_id` INTEGER NULL,
    `performed_by_id` INTEGER NULL,
    `authorized_by_id` INTEGER NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `inventory_movements_uid_key`(`uid`),
    INDEX `inventory_movements_item_id_date_idx`(`item_id`, `date`),
    INDEX `inventory_movements_cycle_id_idx`(`cycle_id`),
    INDEX `inventory_movements_activity_id_idx`(`activity_id`),
    INDEX `inventory_movements_reference_type_reference_id_idx`(`reference_type`, `reference_id`),
    INDEX `inventory_movements_movement_type_idx`(`movement_type`),
    INDEX `inventory_movements_batch_id_idx`(`batch_id`),
    INDEX `inventory_movements_po_id_idx`(`po_id`),
    INDEX `inventory_movements_uid_idx`(`uid`),
    INDEX `inventory_movements_authorized_by_id_fkey`(`authorized_by_id`),
    INDEX `inventory_movements_performed_by_id_fkey`(`performed_by_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `cycle_inputs` (
    `uid` VARCHAR(191) NOT NULL,
    `cycle_id` INTEGER NOT NULL,
    `item_id` INTEGER NOT NULL,
    `batch_id` INTEGER NULL,
    `movement_id` INTEGER NULL,
    `unit_type` VARCHAR(191) NOT NULL,
    `application_date` DATETIME(3) NULL,
    `applied_by` INTEGER NULL,
    `cost_per_unit` DOUBLE NULL,
    `total_cost` DOUBLE NULL,
    `application_rate` DOUBLE NULL,
    `application_method` VARCHAR(191) NULL,
    `application_area_ha` DOUBLE NULL,
    `notes` VARCHAR(191) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `created_by` INTEGER NULL,
    `quantity_consumed` DOUBLE NULL DEFAULT 0,
    `quantity_issued` DOUBLE NULL DEFAULT 0,
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `quantity` DOUBLE NOT NULL,
    `transaction_type` VARCHAR(191) NOT NULL,
    `quantity_used` DOUBLE NULL DEFAULT 0,

    UNIQUE INDEX `cycle_inputs_uid_key`(`uid`),
    INDEX `cycle_inputs_cycle_id_idx`(`cycle_id`),
    INDEX `cycle_inputs_item_id_idx`(`item_id`),
    INDEX `cycle_inputs_transaction_type_idx`(`transaction_type`),
    INDEX `cycle_inputs_uid_idx`(`uid`),
    INDEX `cycle_inputs_applied_by_fkey`(`applied_by`),
    INDEX `cycle_inputs_batch_id_idx`(`batch_id`),
    INDEX `cycle_inputs_movement_id_idx`(`movement_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `inventory_purchase_orders` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `uid` VARCHAR(191) NOT NULL,
    `po_number` VARCHAR(191) NOT NULL,
    `supplier_id` INTEGER NOT NULL,
    `order_date` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `expected_date` DATETIME(3) NULL,
    `delivered_date` DATETIME(3) NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'DRAFT',
    `subtotal` DOUBLE NOT NULL,
    `tax_amount` DOUBLE NULL DEFAULT 0,
    `shipping_cost` DOUBLE NULL DEFAULT 0,
    `total_amount` DOUBLE NOT NULL,
    `currency` VARCHAR(191) NOT NULL DEFAULT 'NGN',
    `notes` VARCHAR(191) NULL,
    `terms_conditions` VARCHAR(191) NULL,
    `created_by_id` INTEGER NULL,
    `approved_by_id` INTEGER NULL,
    `approved_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `inventory_purchase_orders_uid_key`(`uid`),
    UNIQUE INDEX `inventory_purchase_orders_po_number_key`(`po_number`),
    INDEX `inventory_purchase_orders_po_number_idx`(`po_number`),
    INDEX `inventory_purchase_orders_supplier_id_idx`(`supplier_id`),
    INDEX `inventory_purchase_orders_status_idx`(`status`),
    INDEX `inventory_purchase_orders_uid_idx`(`uid`),
    INDEX `inventory_purchase_orders_approved_by_id_fkey`(`approved_by_id`),
    INDEX `inventory_purchase_orders_created_by_id_fkey`(`created_by_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `inventory_po_items` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `uid` VARCHAR(191) NOT NULL,
    `po_id` INTEGER NOT NULL,
    `item_id` INTEGER NOT NULL,
    `quantity_ordered` DOUBLE NOT NULL,
    `quantity_received` DOUBLE NOT NULL DEFAULT 0,
    `unit_type` VARCHAR(191) NOT NULL,
    `unit_price` DOUBLE NOT NULL,
    `line_total` DOUBLE NOT NULL,
    `expected_date` DATETIME(3) NULL,
    `notes` VARCHAR(191) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `inventory_po_items_uid_key`(`uid`),
    INDEX `inventory_po_items_po_id_idx`(`po_id`),
    INDEX `inventory_po_items_item_id_idx`(`item_id`),
    INDEX `inventory_po_items_uid_idx`(`uid`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `harvests` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `uid` VARCHAR(191) NOT NULL,
    `harvest_tag_id` VARCHAR(191) NULL,
    `cycle_id` INTEGER NOT NULL,
    `cluster_id` INTEGER NOT NULL,
    `field_id` INTEGER NOT NULL,
    `cut_number` INTEGER NOT NULL,
    `harvest_date` DATETIME(3) NOT NULL,
    `completed_date` DATETIME(3) NULL,
    `estimated_bales` INTEGER NULL,
    `estimated_weight_kg` DOUBLE NULL,
    `actual_bales` INTEGER NULL,
    `actual_weight_kg` DOUBLE NULL,
    `moisture_pct` DOUBLE NULL,
    `visual_quality` VARCHAR(191) NULL,
    `lot_id` INTEGER NULL,
    `lot_number` VARCHAR(191) NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'DRAFT',
    `harvested_by` INTEGER NULL,
    `recorded_by` INTEGER NULL,
    `verified_by` INTEGER NULL,
    `verified_at` DATETIME(3) NULL,
    `locked_at` DATETIME(3) NULL,
    `locked_by` INTEGER NULL,
    `notes` VARCHAR(191) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `harvests_uid_key`(`uid`),
    UNIQUE INDEX `harvests_harvest_tag_id_key`(`harvest_tag_id`),
    UNIQUE INDEX `harvests_lot_number_key`(`lot_number`),
    INDEX `harvests_cluster_id_harvest_date_idx`(`cluster_id`, `harvest_date`),
    INDEX `harvests_status_idx`(`status`),
    INDEX `harvests_lot_number_idx`(`lot_number`),
    INDEX `harvests_uid_idx`(`uid`),
    INDEX `harvests_field_id_fkey`(`field_id`),
    UNIQUE INDEX `harvests_cycle_id_cut_number_key`(`cycle_id`, `cut_number`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `harvest_bales` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `uid` VARCHAR(191) NOT NULL,
    `harvest_tag_id` VARCHAR(191) NULL,
    `harvest_id` INTEGER NOT NULL,
    `bale_number` INTEGER NOT NULL,
    `bale_type` VARCHAR(191) NULL,
    `estimated_weight_kg` DOUBLE NULL,
    `actual_weight_kg` DOUBLE NULL,
    `weighed_at` DATETIME(3) NULL,
    `weighed_by` INTEGER NULL,
    `moisture_pct` DOUBLE NULL,
    `visual_grade` VARCHAR(191) NULL,
    `qr_code` VARCHAR(191) NULL,
    `qr_code_url` VARCHAR(191) NULL,
    `rfid_tag` VARCHAR(191) NULL,
    `current_location` VARCHAR(191) NULL,
    `location_updated` DATETIME(3) NULL,
    `emaps_intake_bale_id` INTEGER NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'FIELD',
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `harvest_bales_uid_key`(`uid`),
    UNIQUE INDEX `harvest_bales_qr_code_key`(`qr_code`),
    UNIQUE INDEX `harvest_bales_rfid_tag_key`(`rfid_tag`),
    UNIQUE INDEX `harvest_bales_emaps_intake_bale_id_key`(`emaps_intake_bale_id`),
    INDEX `harvest_bales_harvest_id_idx`(`harvest_id`),
    INDEX `harvest_bales_qr_code_idx`(`qr_code`),
    INDEX `harvest_bales_status_idx`(`status`),
    INDEX `harvest_bales_uid_idx`(`uid`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `iot_devices` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `uid` VARCHAR(191) NOT NULL,
    `farm_id` INTEGER NOT NULL,
    `field_id` INTEGER NULL,
    `device_type` VARCHAR(191) NOT NULL,
    `device_model` VARCHAR(191) NULL,
    `manufacturer` VARCHAR(191) NULL,
    `serial_number` VARCHAR(191) NULL,
    `installed_date` DATETIME(3) NOT NULL,
    `installed_by` INTEGER NULL,
    `location_lat` DOUBLE NULL,
    `location_lng` DOUBLE NULL,
    `elevation` DOUBLE NULL,
    `last_calibration` DATETIME(3) NULL,
    `calibration_due` DATETIME(3) NULL,
    `calibration_status` VARCHAR(191) NULL,
    `connection_type` VARCHAR(191) NULL,
    `sim_card_number` VARCHAR(191) NULL,
    `signal_strength` INTEGER NULL,
    `power_source` VARCHAR(191) NULL,
    `battery_level` INTEGER NULL,
    `last_charge` DATETIME(3) NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'ACTIVE',
    `reading_frequency` INTEGER NULL,
    `last_reading` DATETIME(3) NULL,
    `last_reading_value` LONGTEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `created_by` INTEGER NULL,

    UNIQUE INDEX `iot_devices_uid_key`(`uid`),
    UNIQUE INDEX `iot_devices_serial_number_key`(`serial_number`),
    INDEX `iot_devices_farm_id_idx`(`farm_id`),
    INDEX `iot_devices_device_type_status_idx`(`device_type`, `status`),
    INDEX `iot_devices_last_reading_idx`(`last_reading`),
    INDEX `iot_devices_uid_idx`(`uid`),
    INDEX `iot_devices_field_id_fkey`(`field_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `iot_readings` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `uid` VARCHAR(191) NOT NULL,
    `device_id` INTEGER NOT NULL,
    `reading_time` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `reading_type` VARCHAR(191) NOT NULL,
    `reading_value` DOUBLE NOT NULL,
    `unit` VARCHAR(191) NOT NULL,
    `sensor_index` INTEGER NULL,
    `sensor_depth` DOUBLE NULL,
    `reading_quality` VARCHAR(191) NULL,
    `is_calibrated` BOOLEAN NOT NULL DEFAULT true,
    `raw_data` LONGTEXT NULL,
    `is_aggregated` BOOLEAN NOT NULL DEFAULT false,
    `aggregation_period` VARCHAR(191) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `iot_readings_uid_key`(`uid`),
    INDEX `iot_readings_device_id_reading_time_idx`(`device_id`, `reading_time`),
    INDEX `iot_readings_reading_time_idx`(`reading_time`),
    INDEX `iot_readings_reading_type_idx`(`reading_type`),
    INDEX `iot_readings_uid_idx`(`uid`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `iot_alerts` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `uid` VARCHAR(191) NOT NULL,
    `device_id` INTEGER NOT NULL,
    `alert_type` VARCHAR(191) NOT NULL,
    `severity` VARCHAR(191) NOT NULL,
    `threshold_min` DOUBLE NULL,
    `threshold_max` DOUBLE NULL,
    `actual_value` DOUBLE NOT NULL,
    `detected_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `resolved_at` DATETIME(3) NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'ACTIVE',
    `acknowledged_by` INTEGER NULL,
    `acknowledged_at` DATETIME(3) NULL,
    `resolved_by` INTEGER NULL,
    `notification_sent` BOOLEAN NOT NULL DEFAULT false,
    `notified_to` LONGTEXT NULL,
    `actions` LONGTEXT NULL,
    `farm_id` INTEGER NULL,
    `field_id` INTEGER NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `iot_alerts_uid_key`(`uid`),
    INDEX `iot_alerts_device_id_status_idx`(`device_id`, `status`),
    INDEX `iot_alerts_detected_at_idx`(`detected_at`),
    INDEX `iot_alerts_severity_status_idx`(`severity`, `status`),
    INDEX `iot_alerts_uid_idx`(`uid`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `drone_missions` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `uid` VARCHAR(191) NOT NULL,
    `farm_id` INTEGER NOT NULL,
    `target_fields` LONGTEXT NULL,
    `mission_type` VARCHAR(191) NOT NULL,
    `mission_name` VARCHAR(191) NOT NULL,
    `scheduled_date` DATETIME(3) NULL,
    `executed_date` DATETIME(3) NULL,
    `flight_plan` LONGTEXT NULL,
    `total_area_ha` DOUBLE NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'PLANNED',
    `pilot_id` INTEGER NULL,
    `drone_id` VARCHAR(191) NULL,
    `drone_model` VARCHAR(191) NULL,
    `weather_conditions` LONGTEXT NULL,
    `images_captured` INTEGER NULL DEFAULT 0,
    `data_quality` VARCHAR(191) NULL,
    `report_url` VARCHAR(191) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `created_by` INTEGER NULL,

    UNIQUE INDEX `drone_missions_uid_key`(`uid`),
    INDEX `drone_missions_farm_id_status_idx`(`farm_id`, `status`),
    INDEX `drone_missions_scheduled_date_idx`(`scheduled_date`),
    INDEX `drone_missions_uid_idx`(`uid`),
    INDEX `drone_missions_pilot_id_fkey`(`pilot_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `drone_images` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `uid` VARCHAR(191) NOT NULL,
    `mission_id` INTEGER NOT NULL,
    `field_id` INTEGER NULL,
    `image_url` VARCHAR(191) NOT NULL,
    `thumbnail_url` VARCHAR(191) NULL,
    `camera_type` VARCHAR(191) NULL,
    `resolution` VARCHAR(191) NULL,
    `bands` LONGTEXT NULL,
    `latitude` DOUBLE NULL,
    `longitude` DOUBLE NULL,
    `altitude` DOUBLE NULL,
    `gimbal_angle` DOUBLE NULL,
    `capture_time` DATETIME(3) NOT NULL,
    `file_size` INTEGER NULL,
    `file_format` VARCHAR(191) NULL,
    `is_processed` BOOLEAN NOT NULL DEFAULT false,
    `processed_url` VARCHAR(191) NULL,
    `processing_date` DATETIME(3) NULL,
    `ai_analysis` LONGTEXT NULL,
    `ndvi_value` DOUBLE NULL,
    `ndwi_value` DOUBLE NULL,
    `anomalies` LONGTEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `drone_images_uid_key`(`uid`),
    INDEX `drone_images_mission_id_idx`(`mission_id`),
    INDEX `drone_images_field_id_idx`(`field_id`),
    INDEX `drone_images_capture_time_idx`(`capture_time`),
    INDEX `drone_images_uid_idx`(`uid`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `drone_analytics` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `uid` VARCHAR(191) NOT NULL,
    `mission_id` INTEGER NOT NULL,
    `field_id` INTEGER NULL,
    `analysis_type` VARCHAR(191) NOT NULL,
    `analysis_date` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `results` LONGTEXT NULL,
    `mean_value` DOUBLE NULL,
    `min_value` DOUBLE NULL,
    `max_value` DOUBLE NULL,
    `std_deviation` DOUBLE NULL,
    `area_analyzed_ha` DOUBLE NULL,
    `healthy_percent` DOUBLE NULL,
    `stressed_percent` DOUBLE NULL,
    `dead_percent` DOUBLE NULL,
    `recommendations` LONGTEXT NULL,
    `map_url` VARCHAR(191) NULL,
    `report_url` VARCHAR(191) NULL,
    `reviewed_by` INTEGER NULL,
    `reviewed_at` DATETIME(3) NULL,
    `review_notes` VARCHAR(191) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `drone_analytics_uid_key`(`uid`),
    INDEX `drone_analytics_mission_id_idx`(`mission_id`),
    INDEX `drone_analytics_field_id_analysis_date_idx`(`field_id`, `analysis_date`),
    INDEX `drone_analytics_uid_idx`(`uid`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `cluster_resources` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `uid` VARCHAR(191) NOT NULL,
    `cluster_id` INTEGER NOT NULL,
    `resource_type` VARCHAR(191) NOT NULL,
    `resource_name` VARCHAR(191) NOT NULL,
    `resource_code` VARCHAR(191) NULL,
    `owner_type` VARCHAR(191) NOT NULL,
    `owner_party_id` INTEGER NULL,
    `manufacturer` VARCHAR(191) NULL,
    `model` VARCHAR(191) NULL,
    `serial_number` VARCHAR(191) NULL,
    `year_manufactured` INTEGER NULL,
    `fuel_type` VARCHAR(191) NULL,
    `power_rating` DOUBLE NULL,
    `capacity` DOUBLE NULL,
    `current_location_lat` DOUBLE NULL,
    `current_location_lng` DOUBLE NULL,
    `current_farm_id` INTEGER NULL,
    `current_field_id` INTEGER NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'AVAILABLE',
    `condition` VARCHAR(191) NULL,
    `last_maintenance` DATETIME(3) NULL,
    `next_maintenance` DATETIME(3) NULL,
    `maintenance_schedule` LONGTEXT NULL,
    `total_hours` DOUBLE NULL DEFAULT 0,
    `total_fuel_used` DOUBLE NULL,
    `assigned_to` INTEGER NULL,
    `assigned_date` DATETIME(3) NULL,
    `manual_url` VARCHAR(191) NULL,
    `insurance_doc_url` VARCHAR(191) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `cluster_resources_uid_key`(`uid`),
    UNIQUE INDEX `cluster_resources_serial_number_key`(`serial_number`),
    INDEX `cluster_resources_cluster_id_resource_type_idx`(`cluster_id`, `resource_type`),
    INDEX `cluster_resources_status_idx`(`status`),
    INDEX `cluster_resources_uid_idx`(`uid`),
    INDEX `cluster_resources_owner_party_id_fkey`(`owner_party_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `resource_usage_logs` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `uid` VARCHAR(191) NOT NULL,
    `resource_id` INTEGER NOT NULL,
    `start_date` DATETIME(3) NOT NULL,
    `end_date` DATETIME(3) NULL,
    `duration_hours` DOUBLE NULL,
    `operator_id` INTEGER NULL,
    `farm_id` INTEGER NULL,
    `field_id` INTEGER NULL,
    `task_type` VARCHAR(191) NULL,
    `task_description` VARCHAR(191) NULL,
    `fuel_used_liters` DOUBLE NULL,
    `material_used` LONGTEXT NULL,
    `area_covered_ha` DOUBLE NULL,
    `quantity_processed` DOUBLE NULL,
    `issues_encountered` BOOLEAN NULL DEFAULT false,
    `issue_description` VARCHAR(191) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `created_by` INTEGER NULL,

    UNIQUE INDEX `resource_usage_logs_uid_key`(`uid`),
    INDEX `resource_usage_logs_resource_id_start_date_idx`(`resource_id`, `start_date`),
    INDEX `resource_usage_logs_uid_idx`(`uid`),
    INDEX `resource_usage_logs_operator_id_fkey`(`operator_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `cluster_operations` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `uid` VARCHAR(191) NOT NULL,
    `cluster_id` INTEGER NOT NULL,
    `operation_type` VARCHAR(191) NOT NULL,
    `operation_name` VARCHAR(191) NOT NULL,
    `scheduled_date` DATETIME(3) NOT NULL,
    `scheduled_start` VARCHAR(191) NULL,
    `scheduled_end` VARCHAR(191) NULL,
    `assigned_to` INTEGER NULL,
    `assigned_team` LONGTEXT NULL,
    `required_resources` LONGTEXT NULL,
    `required_inputs` LONGTEXT NULL,
    `farm_id` INTEGER NULL,
    `field_id` INTEGER NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'SCHEDULED',
    `completed_date` DATETIME(3) NULL,
    `completed_by` INTEGER NULL,
    `results` LONGTEXT NULL,
    `notes` VARCHAR(191) NULL,
    `weather_conditions` VARCHAR(191) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `created_by` INTEGER NULL,

    UNIQUE INDEX `cluster_operations_uid_key`(`uid`),
    INDEX `cluster_operations_cluster_id_scheduled_date_idx`(`cluster_id`, `scheduled_date`),
    INDEX `cluster_operations_status_idx`(`status`),
    INDEX `cluster_operations_uid_idx`(`uid`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `cluster_harvests` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `uid` VARCHAR(191) NOT NULL,
    `cluster_id` INTEGER NOT NULL,
    `harvest_year` INTEGER NOT NULL,
    `harvest_season` VARCHAR(191) NULL,
    `total_harvests` INTEGER NOT NULL DEFAULT 0,
    `total_bales` INTEGER NOT NULL DEFAULT 0,
    `total_weight_kg` DOUBLE NULL DEFAULT 0,
    `supreme_bales` INTEGER NOT NULL DEFAULT 0,
    `premium_bales` INTEGER NOT NULL DEFAULT 0,
    `standard_bales` INTEGER NOT NULL DEFAULT 0,
    `reject_bales` INTEGER NOT NULL DEFAULT 0,
    `estimated_value` DOUBLE NULL,
    `actual_revenue` DOUBLE NULL,
    `total_paid` DOUBLE NULL DEFAULT 0,
    `pending_payment` DOUBLE NULL DEFAULT 0,
    `last_harvest_date` DATETIME(3) NULL,
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `cluster_harvests_uid_key`(`uid`),
    INDEX `cluster_harvests_uid_idx`(`uid`),
    UNIQUE INDEX `cluster_harvests_cluster_id_harvest_year_harvest_season_key`(`cluster_id`, `harvest_year`, `harvest_season`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `cluster_payments` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `uid` VARCHAR(191) NOT NULL,
    `cluster_id` INTEGER NOT NULL,
    `payment_type` VARCHAR(191) NOT NULL,
    `payment_date` DATETIME(3) NOT NULL,
    `amount` DOUBLE NOT NULL,
    `currency` VARCHAR(191) NOT NULL DEFAULT 'NGN',
    `from_party_id` INTEGER NOT NULL,
    `to_party_id` INTEGER NOT NULL,
    `harvest_id` INTEGER NULL,
    `lot_number` VARCHAR(191) NULL,
    `payment_method` VARCHAR(191) NOT NULL,
    `transaction_id` VARCHAR(191) NULL,
    `bank_account_id` INTEGER NULL,
    `wallet_transaction_id` INTEGER NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'PENDING',
    `initiated_by` INTEGER NULL,
    `approved_by` INTEGER NULL,
    `approved_at` DATETIME(3) NULL,
    `processed_by` INTEGER NULL,
    `processed_at` DATETIME(3) NULL,
    `receipt_url` VARCHAR(191) NULL,
    `dividend_period` VARCHAR(191) NULL,
    `equity_percent` DOUBLE NULL,
    `notes` VARCHAR(191) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `cluster_payments_uid_key`(`uid`),
    INDEX `cluster_payments_cluster_id_payment_date_idx`(`cluster_id`, `payment_date`),
    INDEX `cluster_payments_status_idx`(`status`),
    INDEX `cluster_payments_from_party_id_idx`(`from_party_id`),
    INDEX `cluster_payments_to_party_id_idx`(`to_party_id`),
    INDEX `cluster_payments_wallet_transaction_id_idx`(`wallet_transaction_id`),
    INDEX `cluster_payments_uid_idx`(`uid`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `cluster_documents` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `uid` VARCHAR(191) NOT NULL,
    `cluster_id` INTEGER NOT NULL,
    `document_type` VARCHAR(191) NOT NULL,
    `document_name` VARCHAR(191) NOT NULL,
    `file_url` VARCHAR(191) NOT NULL,
    `issue_date` DATETIME(3) NULL,
    `expiry_date` DATETIME(3) NULL,
    `is_confidential` BOOLEAN NOT NULL DEFAULT false,
    `uploaded_by` INTEGER NULL,
    `uploaded_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `verified` BOOLEAN NOT NULL DEFAULT false,
    `verified_by` INTEGER NULL,
    `verified_at` DATETIME(3) NULL,

    UNIQUE INDEX `cluster_documents_uid_key`(`uid`),
    INDEX `cluster_documents_cluster_id_document_type_idx`(`cluster_id`, `document_type`),
    INDEX `cluster_documents_uid_idx`(`uid`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `cluster_metrics` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `uid` VARCHAR(191) NOT NULL,
    `cluster_id` INTEGER NOT NULL,
    `metric_date` DATETIME(3) NOT NULL,
    `metric_type` VARCHAR(191) NOT NULL,
    `area_planted_ha` DOUBLE NULL,
    `area_harvested_ha` DOUBLE NULL,
    `yield_kg_per_ha` DOUBLE NULL,
    `total_production_kg` DOUBLE NULL,
    `avg_moisture` DOUBLE NULL,
    `avg_protein` DOUBLE NULL,
    `grade_a_percent` DOUBLE NULL,
    `irrigation_efficiency` DOUBLE NULL,
    `equipment_uptime` DOUBLE NULL,
    `labor_productivity` DOUBLE NULL,
    `revenue` DOUBLE NULL,
    `cost_per_kg` DOUBLE NULL,
    `profit_margin` DOUBLE NULL,
    `audit_score` DOUBLE NULL,
    `compliance_rate` DOUBLE NULL,
    `active_members` INTEGER NULL,
    `new_members` INTEGER NULL,
    `training_hours` DOUBLE NULL,
    `water_usage_m3` DOUBLE NULL,
    `carbon_footprint` DOUBLE NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `cluster_metrics_uid_key`(`uid`),
    INDEX `cluster_metrics_cluster_id_metric_date_idx`(`cluster_id`, `metric_date`),
    INDEX `cluster_metrics_uid_idx`(`uid`),
    UNIQUE INDEX `cluster_metrics_cluster_id_metric_date_metric_type_key`(`cluster_id`, `metric_date`, `metric_type`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `cluster_alerts` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `uid` VARCHAR(191) NOT NULL,
    `cluster_id` INTEGER NOT NULL,
    `alert_type` VARCHAR(191) NOT NULL,
    `alert_severity` VARCHAR(191) NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `description` VARCHAR(191) NOT NULL,
    `farm_id` INTEGER NULL,
    `field_id` INTEGER NULL,
    `detected_at` DATETIME(3) NOT NULL,
    `resolved_at` DATETIME(3) NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'ACTIVE',
    `assigned_to` INTEGER NULL,
    `assigned_at` DATETIME(3) NULL,
    `actions_taken` LONGTEXT NULL,
    `resolved_by` INTEGER NULL,
    `resolution_notes` VARCHAR(191) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `cluster_alerts_uid_key`(`uid`),
    INDEX `cluster_alerts_cluster_id_status_idx`(`cluster_id`, `status`),
    INDEX `cluster_alerts_alert_severity_status_idx`(`alert_severity`, `status`),
    INDEX `cluster_alerts_uid_idx`(`uid`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `report_templates` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `uid` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `description` VARCHAR(191) NULL,
    `report_type` VARCHAR(191) NOT NULL,
    `platform` VARCHAR(191) NOT NULL,
    `target_role` VARCHAR(191) NULL,
    `form_schema` LONGTEXT NOT NULL,
    `sections` LONGTEXT NOT NULL,
    `requires_photos` BOOLEAN NOT NULL DEFAULT false,
    `min_photos` INTEGER NULL DEFAULT 0,
    `max_photos` INTEGER NULL DEFAULT 10,
    `requires_signature` BOOLEAN NOT NULL DEFAULT false,
    `requires_supervisor_signature` BOOLEAN NOT NULL DEFAULT false,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `version` INTEGER NOT NULL DEFAULT 1,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `created_by` INTEGER NULL,

    UNIQUE INDEX `report_templates_uid_key`(`uid`),
    INDEX `report_templates_platform_is_active_idx`(`platform`, `is_active`),
    INDEX `report_templates_report_type_idx`(`report_type`),
    INDEX `report_templates_uid_idx`(`uid`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `field_reports` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `uid` VARCHAR(191) NOT NULL,
    `template_id` INTEGER NOT NULL,
    `created_by_id` INTEGER NOT NULL,
    `cycle_id` INTEGER NULL,
    `report_date` DATETIME(3) NOT NULL,
    `submitted_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `latitude` DOUBLE NULL,
    `longitude` DOUBLE NULL,
    `location_accuracy` DOUBLE NULL,
    `location_name` VARCHAR(191) NULL,
    `entity_type` VARCHAR(191) NULL,
    `entity_id` VARCHAR(191) NULL,
    `cluster_id` INTEGER NULL,
    `farm_id` INTEGER NULL,
    `field_id` INTEGER NULL,
    `report_data` LONGTEXT NOT NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'DRAFT',
    `device_id` VARCHAR(191) NULL,
    `sync_status` VARCHAR(191) NOT NULL DEFAULT 'PENDING',
    `sync_attempts` INTEGER NOT NULL DEFAULT 0,
    `last_sync_attempt` DATETIME(3) NULL,
    `sync_error` VARCHAR(191) NULL,
    `has_photos` BOOLEAN NOT NULL DEFAULT false,
    `photo_count` INTEGER NOT NULL DEFAULT 0,
    `has_signature` BOOLEAN NOT NULL DEFAULT false,
    `signature_data` VARCHAR(191) NULL,
    `is_recurring` BOOLEAN NOT NULL DEFAULT false,
    `recurring_id` VARCHAR(191) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `updated_by` INTEGER NULL,

    UNIQUE INDEX `field_reports_uid_key`(`uid`),
    INDEX `field_reports_created_by_id_status_idx`(`created_by_id`, `status`),
    INDEX `field_reports_farm_id_report_date_idx`(`farm_id`, `report_date`),
    INDEX `field_reports_cluster_id_report_date_idx`(`cluster_id`, `report_date`),
    INDEX `field_reports_status_sync_status_idx`(`status`, `sync_status`),
    INDEX `field_reports_report_date_idx`(`report_date`),
    INDEX `field_reports_entity_type_entity_id_idx`(`entity_type`, `entity_id`),
    INDEX `field_reports_uid_idx`(`uid`),
    INDEX `field_reports_cycle_id_fkey`(`cycle_id`),
    INDEX `field_reports_field_id_fkey`(`field_id`),
    INDEX `field_reports_template_id_fkey`(`template_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `report_photos` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `uid` VARCHAR(191) NOT NULL,
    `report_id` INTEGER NOT NULL,
    `filename` VARCHAR(191) NOT NULL,
    `filesize` INTEGER NULL,
    `mime_type` VARCHAR(191) NOT NULL,
    `local_path` VARCHAR(191) NULL,
    `cloud_url` VARCHAR(191) NULL,
    `thumbnail_url` VARCHAR(191) NULL,
    `caption` VARCHAR(191) NULL,
    `photo_type` VARCHAR(191) NULL,
    `latitude` DOUBLE NULL,
    `longitude` DOUBLE NULL,
    `altitude` DOUBLE NULL,
    `timestamp` DATETIME(3) NULL,
    `field_id` INTEGER NULL,
    `ai_processed` BOOLEAN NOT NULL DEFAULT false,
    `ai_tags` LONGTEXT NULL,
    `sort_order` INTEGER NOT NULL DEFAULT 0,
    `sync_status` VARCHAR(191) NOT NULL DEFAULT 'PENDING',
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `uploaded_at` DATETIME(3) NULL,

    UNIQUE INDEX `report_photos_uid_key`(`uid`),
    INDEX `report_photos_report_id_idx`(`report_id`),
    INDEX `report_photos_sync_status_idx`(`sync_status`),
    INDEX `report_photos_uid_idx`(`uid`),
    INDEX `report_photos_field_id_fkey`(`field_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `report_approvals` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `uid` VARCHAR(191) NOT NULL,
    `report_id` INTEGER NOT NULL,
    `approved_by_id` INTEGER NOT NULL,
    `approval_date` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `decision` VARCHAR(191) NOT NULL,
    `comments` VARCHAR(191) NULL,
    `rejection_reason` VARCHAR(191) NULL,
    `conditions` LONGTEXT NULL,
    `next_approver_id` INTEGER NULL,
    `approval_level` INTEGER NOT NULL DEFAULT 1,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `report_approvals_uid_key`(`uid`),
    INDEX `report_approvals_report_id_idx`(`report_id`),
    INDEX `report_approvals_approved_by_id_idx`(`approved_by_id`),
    INDEX `report_approvals_uid_idx`(`uid`),
    INDEX `report_approvals_next_approver_id_fkey`(`next_approver_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `report_comments` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `uid` VARCHAR(191) NOT NULL,
    `report_id` INTEGER NOT NULL,
    `comment_by_id` INTEGER NOT NULL,
    `comment_text` TEXT NOT NULL,
    `has_attachment` BOOLEAN NOT NULL DEFAULT false,
    `attachment_url` VARCHAR(191) NULL,
    `mentions` LONGTEXT NULL,
    `parent_comment_id` INTEGER NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `sync_status` VARCHAR(191) NOT NULL DEFAULT 'SYNCED',

    UNIQUE INDEX `report_comments_uid_key`(`uid`),
    INDEX `report_comments_report_id_idx`(`report_id`),
    INDEX `report_comments_comment_by_id_idx`(`comment_by_id`),
    INDEX `report_comments_uid_idx`(`uid`),
    INDEX `report_comments_parent_comment_id_fkey`(`parent_comment_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `report_history` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `uid` VARCHAR(191) NOT NULL,
    `report_id` INTEGER NOT NULL,
    `changed_by_id` INTEGER NOT NULL,
    `change_type` VARCHAR(191) NOT NULL,
    `old_status` VARCHAR(191) NULL,
    `new_status` VARCHAR(191) NULL,
    `changes` LONGTEXT NULL,
    `ip_address` VARCHAR(191) NULL,
    `device_id` VARCHAR(191) NULL,
    `changed_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `report_history_uid_key`(`uid`),
    INDEX `report_history_report_id_idx`(`report_id`),
    INDEX `report_history_changed_at_idx`(`changed_at`),
    INDEX `report_history_uid_idx`(`uid`),
    INDEX `report_history_changed_by_id_fkey`(`changed_by_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `report_schedules` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `uid` VARCHAR(191) NOT NULL,
    `template_id` INTEGER NOT NULL,
    `assigned_to_id` INTEGER NOT NULL,
    `farm_id` INTEGER NULL,
    `cluster_id` INTEGER NULL,
    `frequency` VARCHAR(191) NOT NULL,
    `interval_days` INTEGER NULL,
    `day_of_week` INTEGER NULL,
    `day_of_month` INTEGER NULL,
    `due_time` VARCHAR(191) NULL,
    `start_date` DATETIME(3) NOT NULL,
    `end_date` DATETIME(3) NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `reminder_enabled` BOOLEAN NOT NULL DEFAULT true,
    `reminder_hours_before` INTEGER NULL DEFAULT 24,
    `escalate_to_id` INTEGER NULL,
    `escalate_after_hours` INTEGER NULL,
    `last_generated` DATETIME(3) NULL,
    `next_due` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `created_by` INTEGER NULL,

    UNIQUE INDEX `report_schedules_uid_key`(`uid`),
    INDEX `report_schedules_assigned_to_id_is_active_idx`(`assigned_to_id`, `is_active`),
    INDEX `report_schedules_next_due_idx`(`next_due`),
    INDEX `report_schedules_uid_idx`(`uid`),
    INDEX `report_schedules_cluster_id_fkey`(`cluster_id`),
    INDEX `report_schedules_farm_id_fkey`(`farm_id`),
    INDEX `report_schedules_template_id_fkey`(`template_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `report_instances` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `uid` VARCHAR(191) NOT NULL,
    `schedule_id` INTEGER NOT NULL,
    `due_date` DATETIME(3) NOT NULL,
    `period_start` DATETIME(3) NOT NULL,
    `period_end` DATETIME(3) NOT NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'PENDING',
    `report_id` INTEGER NULL,
    `submitted_at` DATETIME(3) NULL,
    `submitted_by` INTEGER NULL,
    `is_late` BOOLEAN NOT NULL DEFAULT false,
    `late_minutes` INTEGER NULL,
    `reminders_sent` LONGTEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `report_instances_uid_key`(`uid`),
    INDEX `report_instances_status_due_date_idx`(`status`, `due_date`),
    INDEX `report_instances_uid_idx`(`uid`),
    INDEX `report_instances_report_id_fkey`(`report_id`),
    UNIQUE INDEX `report_instances_schedule_id_due_date_key`(`schedule_id`, `due_date`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `supervisor_dashboards` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `uid` VARCHAR(191) NOT NULL,
    `supervisor_id` INTEGER NOT NULL,
    `default_view` VARCHAR(191) NOT NULL DEFAULT 'PENDING_REPORTS',
    `refresh_interval` INTEGER NULL DEFAULT 300,
    `managed_clusters` LONGTEXT NULL,
    `managed_farms` LONGTEXT NULL,
    `managed_fields` LONGTEXT NULL,
    `notify_on_submission` BOOLEAN NOT NULL DEFAULT true,
    `notify_on_late` BOOLEAN NOT NULL DEFAULT true,
    `notify_on_approval` BOOLEAN NOT NULL DEFAULT true,
    `submission_rate_target` DOUBLE NULL DEFAULT 95,
    `approval_time_target` INTEGER NULL DEFAULT 24,
    `widgets` LONGTEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `supervisor_dashboards_uid_key`(`uid`),
    UNIQUE INDEX `supervisor_dashboards_supervisor_id_key`(`supervisor_id`),
    INDEX `supervisor_dashboards_uid_idx`(`uid`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `supervisor_queue` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `uid` VARCHAR(191) NOT NULL,
    `supervisor_id` INTEGER NOT NULL,
    `report_id` INTEGER NOT NULL,
    `priority` INTEGER NOT NULL DEFAULT 0,
    `added_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `added_reason` VARCHAR(191) NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'PENDING',
    `reviewed_at` DATETIME(3) NULL,
    `due_by` DATETIME(3) NULL,
    `notes` VARCHAR(191) NULL,

    UNIQUE INDEX `supervisor_queue_uid_key`(`uid`),
    INDEX `supervisor_queue_supervisor_id_status_idx`(`supervisor_id`, `status`),
    INDEX `supervisor_queue_priority_added_at_idx`(`priority`, `added_at`),
    INDEX `supervisor_queue_uid_idx`(`uid`),
    INDEX `supervisor_queue_report_id_fkey`(`report_id`),
    UNIQUE INDEX `supervisor_queue_supervisor_id_report_id_key`(`supervisor_id`, `report_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `report_aggregates` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `uid` VARCHAR(191) NOT NULL,
    `period_type` VARCHAR(191) NOT NULL,
    `period_start` DATETIME(3) NOT NULL,
    `period_end` DATETIME(3) NOT NULL,
    `entity_type` VARCHAR(191) NOT NULL,
    `entity_id` VARCHAR(191) NOT NULL,
    `total_reports` INTEGER NOT NULL DEFAULT 0,
    `submitted_reports` INTEGER NOT NULL DEFAULT 0,
    `pending_reports` INTEGER NOT NULL DEFAULT 0,
    `late_reports` INTEGER NOT NULL DEFAULT 0,
    `approved_reports` INTEGER NOT NULL DEFAULT 0,
    `rejected_reports` INTEGER NOT NULL DEFAULT 0,
    `submission_rate` DOUBLE NULL,
    `avg_approval_hours` DOUBLE NULL,
    `total_photos` INTEGER NOT NULL DEFAULT 0,
    `key_metrics` LONGTEXT NULL,
    `generated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `generated_by` INTEGER NULL,

    UNIQUE INDEX `report_aggregates_uid_key`(`uid`),
    INDEX `report_aggregates_entity_type_entity_id_period_start_idx`(`entity_type`, `entity_id`, `period_start`),
    INDEX `report_aggregates_uid_idx`(`uid`),
    UNIQUE INDEX `report_aggregates_period_type_period_start_period_end_entity_key`(`period_type`, `period_start`, `period_end`, `entity_type`, `entity_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `emaps_intake` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `uid` VARCHAR(191) NOT NULL,
    `harvest_tag_id` VARCHAR(191) NULL,
    `emap_harvest_id` INTEGER NOT NULL,
    `received_date` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `received_by_id` INTEGER NOT NULL,
    `cluster_id` INTEGER NOT NULL,
    `farm_id` INTEGER NOT NULL,
    `field_id` INTEGER NULL,
    `harvest_date` DATETIME(3) NOT NULL,
    `cut_number` INTEGER NOT NULL,
    `expected_bales` INTEGER NOT NULL,
    `actual_bales` INTEGER NULL,
    `expected_weight_kg` DOUBLE NULL,
    `actual_weight_kg` DOUBLE NULL,
    `initial_visual_grade` VARCHAR(191) NULL,
    `initial_notes` VARCHAR(191) NULL,
    `receipt_number` VARCHAR(191) NULL,
    `receipt_url` VARCHAR(191) NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'PENDING_QA',
    `rejection_reason` VARCHAR(191) NULL,
    `rejected_at` DATETIME(3) NULL,
    `rejected_by_id` INTEGER NULL,
    `disposition` VARCHAR(191) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `created_by` INTEGER NULL,
    `qa_partial_completed` BOOLEAN NULL DEFAULT false,
    `qa_completion_percent` DECIMAL(5, 2) NULL DEFAULT 0.00,
    `qa_completed_at` DATETIME(3) NULL,
    `qa_completed_by` INTEGER NULL,

    UNIQUE INDEX `emaps_intake_uid_key`(`uid`),
    INDEX `emaps_intake_emap_harvest_id_idx`(`emap_harvest_id`),
    INDEX `emaps_intake_cluster_id_received_date_idx`(`cluster_id`, `received_date`),
    INDEX `emaps_intake_status_idx`(`status`),
    INDEX `emaps_intake_received_date_idx`(`received_date`),
    INDEX `emaps_intake_uid_idx`(`uid`),
    INDEX `emaps_intake_qa_partial_completed_idx`(`qa_partial_completed`),
    INDEX `emaps_intake_qa_completion_percent_idx`(`qa_completion_percent`),
    INDEX `emaps_intake_farm_id_fkey`(`farm_id`),
    INDEX `emaps_intake_field_id_fkey`(`field_id`),
    INDEX `emaps_intake_qa_completed_by_fkey`(`qa_completed_by`),
    INDEX `emaps_intake_received_by_id_fkey`(`received_by_id`),
    INDEX `emaps_intake_rejected_by_id_fkey`(`rejected_by_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `emaps_intake_bales` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `uid` VARCHAR(191) NOT NULL,
    `harvest_tag_id` VARCHAR(191) NULL,
    `intake_id` INTEGER NOT NULL,
    `emap_bale_id` INTEGER NULL,
    `bale_number` INTEGER NOT NULL,
    `qr_code` VARCHAR(191) NULL,
    `rfid_tag` VARCHAR(191) NULL,
    `weight_kg` DOUBLE NULL,
    `weighbridge_ticket` VARCHAR(191) NULL,
    `weighed_at` DATETIME(3) NULL,
    `weighed_by_id` INTEGER NULL,
    `visual_condition` VARCHAR(191) NULL,
    `condition_notes` VARCHAR(191) NULL,
    `has_photo` BOOLEAN NOT NULL DEFAULT false,
    `photo_url` VARCHAR(191) NULL,
    `is_sample` BOOLEAN NOT NULL DEFAULT false,
    `staging_location` VARCHAR(191) NULL,
    `lot_id` INTEGER NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'INTAKE',
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `qa_grade` VARCHAR(50) NULL,
    `qa_status` VARCHAR(20) NULL DEFAULT 'PENDING',
    `qa_test_id` INTEGER NULL,
    `qa_assigned_at` DATETIME(3) NULL,
    `qa_assigned_by` INTEGER NULL,
    `qa_notes` TEXT NULL,

    UNIQUE INDEX `emaps_intake_bales_uid_key`(`uid`),
    UNIQUE INDEX `emaps_intake_bales_emap_bale_id_key`(`emap_bale_id`),
    UNIQUE INDEX `emaps_intake_bales_qr_code_key`(`qr_code`),
    UNIQUE INDEX `emaps_intake_bales_rfid_tag_key`(`rfid_tag`),
    INDEX `emaps_intake_bales_intake_id_idx`(`intake_id`),
    INDEX `emaps_intake_bales_qr_code_idx`(`qr_code`),
    INDEX `emaps_intake_bales_status_idx`(`status`),
    INDEX `emaps_intake_bales_uid_idx`(`uid`),
    INDEX `emaps_intake_bales_qa_status_idx`(`qa_status`),
    INDEX `emaps_intake_bales_qa_grade_idx`(`qa_grade`),
    INDEX `emaps_intake_bales_qa_assigned_at_idx`(`qa_assigned_at`),
    INDEX `emaps_intake_bales_qa_test_id_idx`(`qa_test_id`),
    INDEX `emaps_intake_bales_qa_assigned_by_fkey`(`qa_assigned_by`),
    INDEX `emaps_intake_bales_weighed_by_id_fkey`(`weighed_by_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `emaps_qa_tests` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `uid` VARCHAR(191) NOT NULL,
    `harvest_tag_id` VARCHAR(191) NULL,
    `intake_id` INTEGER NULL,
    `lot_id` INTEGER NULL,
    `sample_id` VARCHAR(191) NOT NULL,
    `sample_type` VARCHAR(191) NOT NULL,
    `sample_date` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `sampled_by_id` INTEGER NOT NULL,
    `bale_id` INTEGER NULL,
    `test_date` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `tested_by_id` INTEGER NOT NULL,
    `moisture_pct` DOUBLE NOT NULL,
    `moisture_method` VARCHAR(191) NULL,
    `cp_pct` DOUBLE NOT NULL,
    `cp_method` VARCHAR(191) NULL,
    `adf_pct` DOUBLE NULL,
    `ndf_pct` DOUBLE NULL,
    `density_kg_m3` DOUBLE NULL,
    `leaf_to_stem_ratio` DOUBLE NULL,
    `color` VARCHAR(191) NULL,
    `foreign_matter_pct` DOUBLE NULL,
    `mold_present` BOOLEAN NULL DEFAULT false,
    `mold_type` VARCHAR(191) NULL,
    `visual_grade` VARCHAR(191) NOT NULL,
    `quality_score` INTEGER NULL,
    `is_certified` BOOLEAN NOT NULL DEFAULT false,
    `certified_at` DATETIME(3) NULL,
    `certified_by_id` INTEGER NULL,
    `certificate_number` VARCHAR(191) NULL,
    `certificate_url` VARCHAR(191) NULL,
    `certificate_expiry` DATETIME(3) NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'PENDING',
    `is_locked` BOOLEAN NOT NULL DEFAULT false,
    `locked_at` DATETIME(3) NULL,
    `locked_by_id` INTEGER NULL,
    `rejection_reason` VARCHAR(191) NULL,
    `can_retest` BOOLEAN NOT NULL DEFAULT false,
    `lab_name` VARCHAR(191) NULL,
    `lab_reference` VARCHAR(191) NULL,
    `lab_report_url` VARCHAR(191) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `emaps_qa_tests_uid_key`(`uid`),
    UNIQUE INDEX `emaps_qa_tests_sample_id_key`(`sample_id`),
    UNIQUE INDEX `emaps_qa_tests_certificate_number_key`(`certificate_number`),
    INDEX `emaps_qa_tests_intake_id_idx`(`intake_id`),
    INDEX `emaps_qa_tests_lot_id_idx`(`lot_id`),
    INDEX `emaps_qa_tests_status_idx`(`status`),
    INDEX `emaps_qa_tests_certificate_number_idx`(`certificate_number`),
    INDEX `emaps_qa_tests_sample_id_idx`(`sample_id`),
    INDEX `emaps_qa_tests_uid_idx`(`uid`),
    INDEX `emaps_qa_tests_bale_id_fkey`(`bale_id`),
    INDEX `emaps_qa_tests_certified_by_id_fkey`(`certified_by_id`),
    INDEX `emaps_qa_tests_locked_by_id_fkey`(`locked_by_id`),
    INDEX `emaps_qa_tests_sampled_by_id_fkey`(`sampled_by_id`),
    INDEX `emaps_qa_tests_tested_by_id_fkey`(`tested_by_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `emaps_lots` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `uid` VARCHAR(191) NOT NULL,
    `harvest_tag_id` VARCHAR(191) NULL,
    `lot_number` VARCHAR(191) NOT NULL,
    `qa_test_id` INTEGER NOT NULL,
    `intake_id` INTEGER NULL,
    `lot_type` VARCHAR(191) NOT NULL,
    `grade` VARCHAR(191) NOT NULL,
    `pricing_type` VARCHAR(191) NULL,
    `pricing_reference_id` INTEGER NULL,
    `price_per_kg` DOUBLE NULL,
    `price_per_bale` DOUBLE NULL,
    `currency` VARCHAR(191) NULL DEFAULT 'USD',
    `price_assigned_at` DATETIME(3) NULL,
    `price_valid_from` DATETIME(3) NULL,
    `price_valid_to` DATETIME(3) NULL,
    `total_bales` INTEGER NOT NULL,
    `total_weight_kg` DOUBLE NOT NULL,
    `component_lots` LONGTEXT NULL,
    `avg_moisture_pct` DOUBLE NOT NULL,
    `avg_cp_pct` DOUBLE NOT NULL,
    `avg_adf_pct` DOUBLE NULL,
    `avg_ndf_pct` DOUBLE NULL,
    `quality_score` INTEGER NULL,
    `can_trace_to_field` BOOLEAN NOT NULL DEFAULT true,
    `field_id` INTEGER NULL,
    `harvest_date` DATETIME(3) NULL,
    `certificate_id` VARCHAR(191) NULL,
    `certificate_number` VARCHAR(191) NULL,
    `certificate_url` VARCHAR(191) NULL,
    `certification_date` DATETIME(3) NOT NULL,
    `production_date` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `expiry_date` DATETIME(3) NULL,
    `age_days` INTEGER NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'AVAILABLE',
    `current_warehouse_id` INTEGER NULL,
    `available_bales` INTEGER NOT NULL,
    `available_weight_kg` DOUBLE NOT NULL,
    `reserved_bales` INTEGER NOT NULL DEFAULT 0,
    `allocated_bales` INTEGER NOT NULL DEFAULT 0,
    `shipped_bales` INTEGER NOT NULL DEFAULT 0,
    `estimated_value` DOUBLE NULL,
    `cost_per_kg` DOUBLE NULL,
    `requires_cold_storage` BOOLEAN NOT NULL DEFAULT false,
    `organic_certified` BOOLEAN NOT NULL DEFAULT false,
    `non_gmo_certified` BOOLEAN NOT NULL DEFAULT false,
    `notes` VARCHAR(191) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `created_by_id` INTEGER NULL,

    UNIQUE INDEX `emaps_lots_uid_key`(`uid`),
    UNIQUE INDEX `emaps_lots_lot_number_key`(`lot_number`),
    INDEX `emaps_lots_lot_number_idx`(`lot_number`),
    INDEX `emaps_lots_grade_status_idx`(`grade`, `status`),
    INDEX `emaps_lots_expiry_date_idx`(`expiry_date`),
    INDEX `emaps_lots_current_warehouse_id_idx`(`current_warehouse_id`),
    INDEX `emaps_lots_pricing_type_pricing_reference_id_idx`(`pricing_type`, `pricing_reference_id`),
    INDEX `emaps_lots_uid_idx`(`uid`),
    INDEX `emaps_lots_created_by_id_fkey`(`created_by_id`),
    INDEX `emaps_lots_field_id_fkey`(`field_id`),
    INDEX `emaps_lots_intake_id_fkey`(`intake_id`),
    INDEX `emaps_lots_qa_test_id_fkey`(`qa_test_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `emaps_lot_bales` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `uid` VARCHAR(191) NOT NULL,
    `lot_id` INTEGER NOT NULL,
    `intake_bale_id` INTEGER NOT NULL,
    `bale_number` INTEGER NOT NULL,
    `weight_kg` DOUBLE NOT NULL,
    `qr_code` VARCHAR(191) NULL,
    `sequence` INTEGER NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `emaps_lot_bales_uid_key`(`uid`),
    INDEX `emaps_lot_bales_intake_bale_id_idx`(`intake_bale_id`),
    INDEX `emaps_lot_bales_uid_idx`(`uid`),
    UNIQUE INDEX `emaps_lot_bales_lot_id_intake_bale_id_key`(`lot_id`, `intake_bale_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `warehouses` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `uid` VARCHAR(191) NOT NULL,
    `warehouse_code` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `type` VARCHAR(191) NOT NULL,
    `location` VARCHAR(191) NOT NULL,
    `address_line1` VARCHAR(191) NULL,
    `address_line2` VARCHAR(191) NULL,
    `city` VARCHAR(191) NULL,
    `state` VARCHAR(191) NULL,
    `country` VARCHAR(191) NOT NULL DEFAULT 'NG',
    `latitude` DOUBLE NULL,
    `longitude` DOUBLE NULL,
    `total_capacity_bales` INTEGER NOT NULL,
    `total_capacity_kg` DOUBLE NULL,
    `utilized_capacity_bales` INTEGER NOT NULL DEFAULT 0,
    `utilized_capacity_kg` DOUBLE NULL DEFAULT 0,
    `utilization_percent` DOUBLE NULL,
    `is_temperature_controlled` BOOLEAN NOT NULL DEFAULT false,
    `min_temp_c` DOUBLE NULL,
    `max_temp_c` DOUBLE NULL,
    `has_humidity_control` BOOLEAN NOT NULL DEFAULT false,
    `target_humidity_pct` DOUBLE NULL,
    `manager_id` INTEGER NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'OPERATIONAL',
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `party_id` INTEGER NULL,

    UNIQUE INDEX `warehouses_uid_key`(`uid`),
    UNIQUE INDEX `warehouses_warehouse_code_key`(`warehouse_code`),
    INDEX `warehouses_warehouse_code_idx`(`warehouse_code`),
    INDEX `warehouses_status_idx`(`status`),
    INDEX `warehouses_uid_idx`(`uid`),
    INDEX `warehouses_manager_id_fkey`(`manager_id`),
    INDEX `warehouses_party_id_fkey`(`party_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `warehouse_zones` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `uid` VARCHAR(191) NOT NULL,
    `zone_code` VARCHAR(191) NOT NULL,
    `warehouse_id` INTEGER NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `zone_type` VARCHAR(191) NOT NULL,
    `capacity_bales` INTEGER NULL,
    `capacity_kg` DOUBLE NULL,
    `aisle` VARCHAR(191) NULL,
    `row` VARCHAR(191) NULL,
    `bay` VARCHAR(191) NULL,
    `level` VARCHAR(191) NULL,
    `has_temp_sensor` BOOLEAN NOT NULL DEFAULT false,
    `current_temp` DOUBLE NULL,
    `last_temp_reading` DATETIME(3) NULL,
    `has_humidity_sensor` BOOLEAN NOT NULL DEFAULT false,
    `current_humidity` DOUBLE NULL,
    `is_occupied` BOOLEAN NOT NULL DEFAULT false,
    `status` VARCHAR(191) NOT NULL DEFAULT 'ACTIVE',
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `warehouse_zones_uid_key`(`uid`),
    INDEX `warehouse_zones_uid_idx`(`uid`),
    UNIQUE INDEX `warehouse_zones_warehouse_id_zone_code_key`(`warehouse_id`, `zone_code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `emaps_inventory` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `uid` VARCHAR(191) NOT NULL,
    `lot_id` INTEGER NOT NULL,
    `warehouse_id` INTEGER NOT NULL,
    `zone_id` INTEGER NULL,
    `stack_position` VARCHAR(191) NULL,
    `coordinates` LONGTEXT NULL,
    `total_bales` INTEGER NOT NULL,
    `total_weight_kg` DOUBLE NOT NULL,
    `available_bales` INTEGER NOT NULL,
    `available_weight_kg` DOUBLE NOT NULL,
    `reserved_bales` INTEGER NOT NULL DEFAULT 0,
    `damaged_bales` INTEGER NOT NULL DEFAULT 0,
    `stored_date` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `last_count_date` DATETIME(3) NULL,
    `age_days` INTEGER NOT NULL,
    `estimated_remaining_life` INTEGER NULL,
    `condition` VARCHAR(191) NOT NULL DEFAULT 'GOOD',
    `last_movement_id` INTEGER NULL,
    `last_movement_at` DATETIME(3) NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'ACTIVE',
    `qr_code_url` VARCHAR(191) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `last_updated_by` INTEGER NULL,

    UNIQUE INDEX `emaps_inventory_uid_key`(`uid`),
    INDEX `emaps_inventory_warehouse_id_status_idx`(`warehouse_id`, `status`),
    INDEX `emaps_inventory_lot_id_idx`(`lot_id`),
    INDEX `emaps_inventory_uid_idx`(`uid`),
    INDEX `emaps_inventory_zone_id_fkey`(`zone_id`),
    UNIQUE INDEX `emaps_inventory_lot_id_warehouse_id_zone_id_key`(`lot_id`, `warehouse_id`, `zone_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `emaps_inventory_movements` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `uid` VARCHAR(191) NOT NULL,
    `inventory_id` INTEGER NOT NULL,
    `lot_id` INTEGER NOT NULL,
    `movement_type` VARCHAR(191) NOT NULL,
    `bales_moved` INTEGER NOT NULL,
    `weight_kg_moved` DOUBLE NOT NULL,
    `before_bales` INTEGER NOT NULL,
    `after_bales` INTEGER NOT NULL,
    `before_weight` DOUBLE NOT NULL,
    `after_weight` DOUBLE NOT NULL,
    `from_warehouse_id` INTEGER NULL,
    `from_zone_id` INTEGER NULL,
    `to_warehouse_id` INTEGER NULL,
    `to_zone_id` INTEGER NULL,
    `reason` VARCHAR(191) NOT NULL,
    `reference_type` VARCHAR(191) NULL,
    `reference_id` VARCHAR(191) NULL,
    `performed_by_id` INTEGER NOT NULL,
    `performed_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `authorized_by_id` INTEGER NULL,
    `authorized_at` DATETIME(3) NULL,
    `supporting_doc_url` VARCHAR(191) NULL,
    `notes` VARCHAR(191) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `emaps_inventory_movements_uid_key`(`uid`),
    INDEX `emaps_inventory_movements_lot_id_idx`(`lot_id`),
    INDEX `emaps_inventory_movements_inventory_id_idx`(`inventory_id`),
    INDEX `emaps_inventory_movements_movement_type_performed_at_idx`(`movement_type`, `performed_at`),
    INDEX `emaps_inventory_movements_reference_type_reference_id_idx`(`reference_type`, `reference_id`),
    INDEX `emaps_inventory_movements_uid_idx`(`uid`),
    INDEX `emaps_inventory_movements_authorized_by_id_fkey`(`authorized_by_id`),
    INDEX `emaps_inventory_movements_from_warehouse_id_fkey`(`from_warehouse_id`),
    INDEX `emaps_inventory_movements_performed_by_id_fkey`(`performed_by_id`),
    INDEX `emaps_inventory_movements_to_warehouse_id_fkey`(`to_warehouse_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `emaps_lot_allocations` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `uid` VARCHAR(191) NOT NULL,
    `lot_id` INTEGER NOT NULL,
    `inventory_id` INTEGER NOT NULL,
    `order_id` INTEGER NOT NULL,
    `contract_id` INTEGER NULL,
    `buyer_id` INTEGER NOT NULL,
    `bales_allocated` INTEGER NOT NULL,
    `weight_kg_allocated` DOUBLE NOT NULL,
    `allocation_date` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `required_by_date` DATETIME(3) NULL,
    `promised_date` DATETIME(3) NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'ACTIVE',
    `bales_fulfilled` INTEGER NOT NULL DEFAULT 0,
    `weight_fulfilled` DOUBLE NOT NULL DEFAULT 0,
    `shipment_id` INTEGER NULL,
    `pick_list_id` VARCHAR(191) NULL,
    `picked_at` DATETIME(3) NULL,
    `picked_by_id` INTEGER NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `created_by_id` INTEGER NULL,

    UNIQUE INDEX `emaps_lot_allocations_uid_key`(`uid`),
    UNIQUE INDEX `emaps_lot_allocations_order_id_key`(`order_id`),
    INDEX `emaps_lot_allocations_lot_id_status_idx`(`lot_id`, `status`),
    INDEX `emaps_lot_allocations_order_id_idx`(`order_id`),
    INDEX `emaps_lot_allocations_buyer_id_idx`(`buyer_id`),
    INDEX `emaps_lot_allocations_required_by_date_idx`(`required_by_date`),
    INDEX `emaps_lot_allocations_uid_idx`(`uid`),
    INDEX `emaps_lot_allocations_created_by_id_fkey`(`created_by_id`),
    INDEX `emaps_lot_allocations_inventory_id_fkey`(`inventory_id`),
    INDEX `emaps_lot_allocations_picked_by_id_fkey`(`picked_by_id`),
    INDEX `emaps_lot_allocations_shipment_id_fkey`(`shipment_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `emaps_shipments` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `uid` VARCHAR(191) NOT NULL,
    `shipment_type` VARCHAR(191) NOT NULL,
    `destination` VARCHAR(191) NOT NULL,
    `port_of_loading` VARCHAR(191) NULL,
    `port_of_discharge` VARCHAR(191) NULL,
    `container_number` VARCHAR(191) NULL,
    `container_type` VARCHAR(191) NULL,
    `seal_number` VARCHAR(191) NULL,
    `carrier` VARCHAR(191) NULL,
    `vessel_name` VARCHAR(191) NULL,
    `voyage_number` VARCHAR(191) NULL,
    `bl_number` VARCHAR(191) NULL,
    `bl_url` VARCHAR(191) NULL,
    `loading_date` DATETIME(3) NULL,
    `departure_date` DATETIME(3) NULL,
    `arrival_date` DATETIME(3) NULL,
    `total_lots` INTEGER NOT NULL,
    `total_bales` INTEGER NOT NULL,
    `total_weight_kg` DOUBLE NOT NULL,
    `total_volume_m3` DOUBLE NULL,
    `packing_list_url` VARCHAR(191) NULL,
    `invoice_url` VARCHAR(191) NULL,
    `certificate_of_origin_url` VARCHAR(191) NULL,
    `phytosanitary_url` VARCHAR(191) NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'PLANNED',
    `tracking_url` VARCHAR(191) NULL,
    `last_tracking_update` DATETIME(3) NULL,
    `current_location` VARCHAR(191) NULL,
    `arranged_by_id` INTEGER NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `emaps_shipments_uid_key`(`uid`),
    UNIQUE INDEX `emaps_shipments_container_number_key`(`container_number`),
    INDEX `emaps_shipments_uid_idx`(`uid`),
    INDEX `emaps_shipments_container_number_idx`(`container_number`),
    INDEX `emaps_shipments_status_idx`(`status`),
    INDEX `emaps_shipments_departure_date_idx`(`departure_date`),
    INDEX `emaps_shipments_arranged_by_id_fkey`(`arranged_by_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `emaps_shipment_lots` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `uid` VARCHAR(191) NOT NULL,
    `shipment_id` INTEGER NOT NULL,
    `lot_id` INTEGER NOT NULL,
    `allocation_id` INTEGER NULL,
    `bales_shipped` INTEGER NOT NULL,
    `weight_kg_shipped` DOUBLE NOT NULL,
    `container_position` VARCHAR(191) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `emaps_shipment_lots_uid_key`(`uid`),
    INDEX `emaps_shipment_lots_uid_idx`(`uid`),
    INDEX `emaps_shipment_lots_allocation_id_fkey`(`allocation_id`),
    INDEX `emaps_shipment_lots_lot_id_fkey`(`lot_id`),
    UNIQUE INDEX `emaps_shipment_lots_shipment_id_lot_id_key`(`shipment_id`, `lot_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `emaps_quality_samples` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `uid` VARCHAR(191) NOT NULL,
    `lot_id` INTEGER NOT NULL,
    `intake_id` INTEGER NULL,
    `bale_id` INTEGER NULL,
    `sample_type` VARCHAR(191) NOT NULL,
    `sample_size_kg` DOUBLE NOT NULL,
    `sample_date` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `sampled_by_id` INTEGER NOT NULL,
    `storage_location` VARCHAR(191) NULL,
    `expiry_date` DATETIME(3) NULL,
    `is_archived` BOOLEAN NOT NULL DEFAULT false,
    `qa_test_id` INTEGER NULL,
    `customer_id` INTEGER NULL,
    `date_sent` DATETIME(3) NULL,
    `tracking_number` VARCHAR(191) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `emaps_quality_samples_uid_key`(`uid`),
    INDEX `emaps_quality_samples_lot_id_idx`(`lot_id`),
    INDEX `emaps_quality_samples_uid_idx`(`uid`),
    INDEX `emaps_quality_samples_customer_id_fkey`(`customer_id`),
    INDEX `emaps_quality_samples_sampled_by_id_fkey`(`sampled_by_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `emaps_grade_standards` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `uid` VARCHAR(191) NOT NULL,
    `grade_name` VARCHAR(191) NOT NULL,
    `moisture_min` DOUBLE NULL,
    `moisture_max` DOUBLE NOT NULL,
    `cp_min` DOUBLE NOT NULL,
    `cp_max` DOUBLE NULL,
    `adf_max` DOUBLE NULL,
    `ndf_max` DOUBLE NULL,
    `density_min` DOUBLE NULL,
    `foreign_matter_max` DOUBLE NULL,
    `mold_allowed` BOOLEAN NOT NULL DEFAULT false,
    `color_requirements` VARCHAR(191) NULL,
    `market` VARCHAR(191) NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `valid_from` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `valid_to` DATETIME(3) NULL,
    `version` INTEGER NOT NULL DEFAULT 1,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `emaps_grade_standards_uid_key`(`uid`),
    INDEX `emaps_grade_standards_uid_idx`(`uid`),
    UNIQUE INDEX `emaps_grade_standards_grade_name_version_key`(`grade_name`, `version`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `emmp_buyers` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `uid` VARCHAR(191) NOT NULL,
    `party_id` INTEGER NOT NULL,
    `buyer_type` VARCHAR(191) NOT NULL,
    `buyer_category` VARCHAR(191) NOT NULL,
    `market` VARCHAR(191) NOT NULL,
    `country` VARCHAR(191) NOT NULL,
    `region` VARCHAR(191) NULL,
    `company_name` VARCHAR(191) NOT NULL,
    `registration_number` VARCHAR(191) NULL,
    `tax_id` VARCHAR(191) NULL,
    `credit_rating` VARCHAR(191) NULL,
    `credit_limit` DOUBLE NULL,
    `credit_currency` VARCHAR(191) NOT NULL DEFAULT 'USD',
    `payment_terms` VARCHAR(191) NULL,
    `risk_score` INTEGER NULL,
    `risk_factors` LONGTEXT NULL,
    `last_reviewed` DATETIME(3) NULL,
    `reviewed_by_id` INTEGER NULL,
    `kyc_status` VARCHAR(191) NOT NULL DEFAULT 'PENDING',
    `kyc_submitted_date` DATETIME(3) NULL,
    `kyc_verified_date` DATETIME(3) NULL,
    `kyc_verified_by_id` INTEGER NULL,
    `kyc_documents` LONGTEXT NULL,
    `kyc_notes` VARCHAR(191) NULL,
    `sanctioned` BOOLEAN NOT NULL DEFAULT false,
    `sanctioned_list` VARCHAR(191) NULL,
    `restricted` BOOLEAN NOT NULL DEFAULT false,
    `restriction_reason` VARCHAR(191) NULL,
    `account_manager_id` INTEGER NULL,
    `preferred_currency` VARCHAR(191) NOT NULL DEFAULT 'USD',
    `preferred_language` VARCHAR(191) NOT NULL DEFAULT 'EN',
    `preferred_incoterm` VARCHAR(191) NULL,
    `preferred_port` VARCHAR(191) NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'ACTIVE',
    `total_contracts` INTEGER NOT NULL DEFAULT 0,
    `total_orders` INTEGER NOT NULL DEFAULT 0,
    `total_volume_kg` DOUBLE NOT NULL DEFAULT 0,
    `total_revenue` DOUBLE NOT NULL DEFAULT 0,
    `last_order_date` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `created_by_id` INTEGER NULL,

    UNIQUE INDEX `emmp_buyers_uid_key`(`uid`),
    UNIQUE INDEX `emmp_buyers_party_id_key`(`party_id`),
    INDEX `emmp_buyers_buyer_type_idx`(`buyer_type`),
    INDEX `emmp_buyers_market_idx`(`market`),
    INDEX `emmp_buyers_credit_rating_idx`(`credit_rating`),
    INDEX `emmp_buyers_kyc_status_idx`(`kyc_status`),
    INDEX `emmp_buyers_status_idx`(`status`),
    INDEX `emmp_buyers_uid_idx`(`uid`),
    INDEX `emmp_buyers_account_manager_id_fkey`(`account_manager_id`),
    INDEX `emmp_buyers_created_by_id_fkey`(`created_by_id`),
    INDEX `emmp_buyers_kyc_verified_by_id_fkey`(`kyc_verified_by_id`),
    INDEX `emmp_buyers_reviewed_by_id_fkey`(`reviewed_by_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `emmp_buyer_contacts` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `uid` VARCHAR(191) NOT NULL,
    `buyer_id` INTEGER NOT NULL,
    `first_name` VARCHAR(191) NOT NULL,
    `last_name` VARCHAR(191) NOT NULL,
    `job_title` VARCHAR(191) NOT NULL,
    `department` VARCHAR(191) NULL,
    `email` VARCHAR(191) NOT NULL,
    `phone` VARCHAR(191) NULL,
    `mobile` VARCHAR(191) NULL,
    `whatsapp` VARCHAR(191) NULL,
    `preferred_contact` VARCHAR(191) NULL,
    `language` VARCHAR(191) NULL DEFAULT 'EN',
    `is_primary_contact` BOOLEAN NOT NULL DEFAULT false,
    `can_place_orders` BOOLEAN NOT NULL DEFAULT false,
    `can_sign_contracts` BOOLEAN NOT NULL DEFAULT false,
    `can_receive_invoices` BOOLEAN NOT NULL DEFAULT true,
    `notify_on_order_status` BOOLEAN NOT NULL DEFAULT true,
    `notify_on_shipment` BOOLEAN NOT NULL DEFAULT true,
    `notify_on_payment` BOOLEAN NOT NULL DEFAULT true,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `created_by_id` INTEGER NULL,

    UNIQUE INDEX `emmp_buyer_contacts_uid_key`(`uid`),
    UNIQUE INDEX `emmp_buyer_contacts_email_key`(`email`),
    INDEX `emmp_buyer_contacts_email_idx`(`email`),
    INDEX `emmp_buyer_contacts_uid_idx`(`uid`),
    UNIQUE INDEX `emmp_buyer_contacts_buyer_id_email_key`(`buyer_id`, `email`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `emmp_buyer_documents` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `uid` VARCHAR(191) NOT NULL,
    `buyer_id` INTEGER NOT NULL,
    `document_type` VARCHAR(191) NOT NULL,
    `document_name` VARCHAR(191) NOT NULL,
    `file_url` VARCHAR(191) NOT NULL,
    `issue_date` DATETIME(3) NULL,
    `expiry_date` DATETIME(3) NULL,
    `issuing_authority` VARCHAR(191) NULL,
    `is_verified` BOOLEAN NOT NULL DEFAULT false,
    `verified_at` DATETIME(3) NULL,
    `verified_by_id` INTEGER NULL,
    `is_confidential` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `uploaded_by_id` INTEGER NULL,

    UNIQUE INDEX `emmp_buyer_documents_uid_key`(`uid`),
    INDEX `emmp_buyer_documents_buyer_id_document_type_idx`(`buyer_id`, `document_type`),
    INDEX `emmp_buyer_documents_expiry_date_idx`(`expiry_date`),
    INDEX `emmp_buyer_documents_uid_idx`(`uid`),
    INDEX `emmp_buyer_documents_uploaded_by_id_fkey`(`uploaded_by_id`),
    INDEX `emmp_buyer_documents_verified_by_id_fkey`(`verified_by_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `emmp_products` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `uid` VARCHAR(191) NOT NULL,
    `product_code` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `description` VARCHAR(191) NULL,
    `category` VARCHAR(191) NOT NULL,
    `grade_name` VARCHAR(191) NOT NULL,
    `specifications` LONGTEXT NOT NULL,
    `base_unit` VARCHAR(191) NOT NULL,
    `default_packaging` VARCHAR(191) NULL,
    `hs_code` VARCHAR(191) NULL,
    `origin_country` VARCHAR(191) NOT NULL DEFAULT 'NIGERIA',
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `available_for` LONGTEXT NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `created_by_id` INTEGER NULL,

    UNIQUE INDEX `emmp_products_uid_key`(`uid`),
    UNIQUE INDEX `emmp_products_product_code_key`(`product_code`),
    INDEX `emmp_products_grade_name_idx`(`grade_name`),
    INDEX `emmp_products_uid_idx`(`uid`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `emmp_pricing_rules` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `uid` VARCHAR(191) NOT NULL,
    `product_id` INTEGER NOT NULL,
    `party_id` INTEGER NULL,
    `price_type` VARCHAR(191) NOT NULL,
    `fixed_price` DOUBLE NULL,
    `fixed_currency` VARCHAR(191) NULL DEFAULT 'USD',
    `volume_tiers` LONGTEXT NULL,
    `index_type` VARCHAR(191) NULL,
    `index_formula` VARCHAR(191) NULL,
    `base_index_value` DOUBLE NULL,
    `seasonal_adjustments` LONGTEXT NULL,
    `min_price` DOUBLE NULL,
    `max_price` DOUBLE NULL,
    `valid_from` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `valid_to` DATETIME(3) NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `applicable_markets` LONGTEXT NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `created_by_id` INTEGER NULL,

    UNIQUE INDEX `emmp_pricing_rules_uid_key`(`uid`),
    INDEX `emmp_pricing_rules_product_id_is_active_idx`(`product_id`, `is_active`),
    INDEX `emmp_pricing_rules_party_id_is_active_idx`(`party_id`, `is_active`),
    INDEX `emmp_pricing_rules_uid_idx`(`uid`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `emmp_price_agreements` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `uid` VARCHAR(191) NOT NULL,
    `buyer_id` INTEGER NOT NULL,
    `product_id` INTEGER NOT NULL,
    `grade_name` VARCHAR(191) NOT NULL DEFAULT 'STANDARD',
    `agreement_type` VARCHAR(191) NOT NULL,
    `price` DOUBLE NOT NULL,
    `currency` VARCHAR(191) NOT NULL DEFAULT 'USD',
    `min_volume_kg` DOUBLE NULL,
    `max_volume_kg` DOUBLE NULL,
    `annual_commitment_kg` DOUBLE NULL,
    `incoterm` VARCHAR(191) NULL,
    `port_of_loading` VARCHAR(191) NULL,
    `payment_terms` VARCHAR(191) NULL,
    `valid_from` DATETIME(3) NOT NULL,
    `valid_to` DATETIME(3) NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `requires_approval` BOOLEAN NOT NULL DEFAULT false,
    `approved_at` DATETIME(3) NULL,
    `approved_by_id` INTEGER NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `created_by_id` INTEGER NULL,

    UNIQUE INDEX `emmp_price_agreements_uid_key`(`uid`),
    INDEX `emmp_price_agreements_buyer_id_is_active_idx`(`buyer_id`, `is_active`),
    INDEX `emmp_price_agreements_product_id_idx`(`product_id`),
    INDEX `emmp_price_agreements_valid_to_idx`(`valid_to`),
    INDEX `emmp_price_agreements_uid_idx`(`uid`),
    INDEX `emmp_price_agreements_approved_by_id_fkey`(`approved_by_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `emmp_contracts` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `uid` VARCHAR(191) NOT NULL,
    `buyer_id` INTEGER NOT NULL,
    `seller_id` INTEGER NOT NULL,
    `contract_type` VARCHAR(191) NOT NULL,
    `contract_name` VARCHAR(191) NOT NULL,
    `description` VARCHAR(191) NULL,
    `start_date` DATETIME(3) NOT NULL,
    `end_date` DATETIME(3) NULL,
    `signed_date` DATETIME(3) NULL,
    `effective_date` DATETIME(3) NOT NULL,
    `currency` VARCHAR(191) NOT NULL DEFAULT 'USD',
    `payment_terms` VARCHAR(191) NOT NULL,
    `incoterm` VARCHAR(191) NULL,
    `port_of_loading` VARCHAR(191) NULL,
    `port_of_discharge` VARCHAR(191) NULL,
    `total_value` DOUBLE NULL,
    `total_volume_kg` DOUBLE NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'DRAFT',
    `version` INTEGER NOT NULL DEFAULT 1,
    `previous_version_id` INTEGER NULL,
    `amendment_reason` VARCHAR(191) NULL,
    `approved_by_id` INTEGER NULL,
    `approved_at` DATETIME(3) NULL,
    `governing_law` VARCHAR(191) NULL,
    `dispute_resolution` VARCHAR(191) NULL,
    `contract_document_url` VARCHAR(191) NULL,
    `signed_copy_url` VARCHAR(191) NULL,
    `internal_notes` VARCHAR(191) NULL,
    `fulfilled_volume_kg` DOUBLE NOT NULL DEFAULT 0,
    `fulfilled_value` DOUBLE NOT NULL DEFAULT 0,
    `last_order_date` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `created_by_id` INTEGER NULL,

    UNIQUE INDEX `emmp_contracts_uid_key`(`uid`),
    INDEX `emmp_contracts_buyer_id_status_idx`(`buyer_id`, `status`),
    INDEX `emmp_contracts_uid_idx`(`uid`),
    INDEX `emmp_contracts_start_date_end_date_idx`(`start_date`, `end_date`),
    INDEX `emmp_contracts_approved_by_id_fkey`(`approved_by_id`),
    INDEX `emmp_contracts_created_by_id_fkey`(`created_by_id`),
    INDEX `emmp_contracts_seller_id_fkey`(`seller_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `emmp_contract_items` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `uid` VARCHAR(191) NOT NULL,
    `contract_id` INTEGER NOT NULL,
    `product_id` INTEGER NOT NULL,
    `lot_id` INTEGER NULL,
    `price_per_kg` DOUBLE NOT NULL,
    `price_agreement_id` INTEGER NULL,
    `min_volume_kg` DOUBLE NULL,
    `max_volume_kg` DOUBLE NULL,
    `total_volume_kg` DOUBLE NULL,
    `quality_specs` LONGTEXT NULL,
    `delivery_schedule` LONGTEXT NULL,
    `fulfilled_volume_kg` DOUBLE NOT NULL DEFAULT 0,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `emmp_contract_items_uid_key`(`uid`),
    INDEX `emmp_contract_items_uid_idx`(`uid`),
    INDEX `emmp_contract_items_lot_id_fkey`(`lot_id`),
    INDEX `emmp_contract_items_price_agreement_id_fkey`(`price_agreement_id`),
    INDEX `emmp_contract_items_product_id_fkey`(`product_id`),
    UNIQUE INDEX `emmp_contract_items_contract_id_product_id_key`(`contract_id`, `product_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `emmp_contract_amendments` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `uid` VARCHAR(191) NOT NULL,
    `contract_id` INTEGER NOT NULL,
    `amendment_date` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `amendment_type` VARCHAR(191) NOT NULL,
    `changes` LONGTEXT NOT NULL,
    `reason` VARCHAR(191) NULL,
    `approved_by_id` INTEGER NULL,
    `approved_at` DATETIME(3) NULL,
    `amendment_document_url` VARCHAR(191) NULL,
    `new_version` INTEGER NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `created_by_id` INTEGER NULL,

    UNIQUE INDEX `emmp_contract_amendments_uid_key`(`uid`),
    INDEX `emmp_contract_amendments_contract_id_idx`(`contract_id`),
    INDEX `emmp_contract_amendments_uid_idx`(`uid`),
    INDEX `emmp_contract_amendments_approved_by_id_fkey`(`approved_by_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `emmp_orders` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `uid` VARCHAR(191) NOT NULL,
    `order_number` VARCHAR(191) NOT NULL,
    `buyer_id` INTEGER NOT NULL,
    `contact_id` INTEGER NULL,
    `contract_id` INTEGER NULL,
    `order_date` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `requested_delivery_date` DATETIME(3) NULL,
    `promised_delivery_date` DATETIME(3) NULL,
    `product_id` INTEGER NOT NULL,
    `quantity_kg` DOUBLE NOT NULL,
    `quantity_units` INTEGER NULL,
    `price_per_kg` DOUBLE NOT NULL,
    `currency` VARCHAR(191) NOT NULL DEFAULT 'USD',
    `line_total` DOUBLE NOT NULL,
    `freight_charge` DOUBLE NULL DEFAULT 0,
    `insurance_charge` DOUBLE NULL DEFAULT 0,
    `other_charges` LONGTEXT NULL,
    `total_amount` DOUBLE NOT NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'PENDING',
    `is_validated` BOOLEAN NOT NULL DEFAULT false,
    `validated_at` DATETIME(3) NULL,
    `validated_by_id` INTEGER NULL,
    `validation_notes` VARCHAR(191) NULL,
    `inventory_checked` BOOLEAN NOT NULL DEFAULT false,
    `inventory_available` BOOLEAN NULL,
    `insufficient_inventory_action` VARCHAR(191) NULL,
    `allocation_id` INTEGER NULL,
    `shipment_id` INTEGER NULL,
    `invoice_id` INTEGER NULL,
    `tracking_number` VARCHAR(191) NULL,
    `tracking_url` VARCHAR(191) NULL,
    `buyer_po_url` VARCHAR(191) NULL,
    `acknowledgment_url` VARCHAR(191) NULL,
    `special_instructions` VARCHAR(191) NULL,
    `internal_notes` VARCHAR(191) NULL,
    `fulfilled_quantity_kg` DOUBLE NOT NULL DEFAULT 0,
    `fulfillment_status` VARCHAR(191) NULL,
    `cancelled_at` DATETIME(3) NULL,
    `cancelled_by_id` INTEGER NULL,
    `cancellation_reason` VARCHAR(191) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `created_by_id` INTEGER NULL,

    UNIQUE INDEX `emmp_orders_uid_key`(`uid`),
    UNIQUE INDEX `emmp_orders_order_number_key`(`order_number`),
    INDEX `emmp_orders_buyer_id_order_date_idx`(`buyer_id`, `order_date`),
    INDEX `emmp_orders_contract_id_idx`(`contract_id`),
    INDEX `emmp_orders_status_idx`(`status`),
    INDEX `emmp_orders_uid_idx`(`uid`),
    INDEX `emmp_orders_requested_delivery_date_idx`(`requested_delivery_date`),
    INDEX `emmp_orders_cancelled_by_id_fkey`(`cancelled_by_id`),
    INDEX `emmp_orders_contact_id_fkey`(`contact_id`),
    INDEX `emmp_orders_created_by_id_fkey`(`created_by_id`),
    INDEX `emmp_orders_invoice_id_fkey`(`invoice_id`),
    INDEX `emmp_orders_product_id_fkey`(`product_id`),
    INDEX `emmp_orders_shipment_id_fkey`(`shipment_id`),
    INDEX `emmp_orders_validated_by_id_fkey`(`validated_by_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `emmp_order_status_history` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `uid` VARCHAR(191) NOT NULL,
    `order_id` INTEGER NOT NULL,
    `from_status` VARCHAR(191) NOT NULL,
    `to_status` VARCHAR(191) NOT NULL,
    `changed_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `changed_by_id` INTEGER NULL,
    `reason` VARCHAR(191) NULL,
    `notes` VARCHAR(191) NULL,

    UNIQUE INDEX `emmp_order_status_history_uid_key`(`uid`),
    INDEX `emmp_order_status_history_order_id_changed_at_idx`(`order_id`, `changed_at`),
    INDEX `emmp_order_status_history_uid_idx`(`uid`),
    INDEX `emmp_order_status_history_changed_by_id_fkey`(`changed_by_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `emmp_invoices` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `uid` VARCHAR(191) NOT NULL,
    `invoice_number` VARCHAR(191) NOT NULL,
    `buyer_id` INTEGER NOT NULL,
    `order_id` INTEGER NOT NULL,
    `shipment_id` INTEGER NULL,
    `invoice_date` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `due_date` DATETIME(3) NOT NULL,
    `subtotal` DOUBLE NOT NULL,
    `tax_amount` DOUBLE NULL DEFAULT 0,
    `tax_rate` DOUBLE NULL DEFAULT 0,
    `tax_type` VARCHAR(191) NULL,
    `discount_amount` DOUBLE NULL DEFAULT 0,
    `discount_reason` VARCHAR(191) NULL,
    `total_amount` DOUBLE NOT NULL,
    `currency` VARCHAR(191) NOT NULL DEFAULT 'USD',
    `exchange_rate` DOUBLE NULL,
    `payment_terms` VARCHAR(191) NOT NULL,
    `payment_status` VARCHAR(191) NOT NULL DEFAULT 'UNPAID',
    `amount_paid` DOUBLE NOT NULL DEFAULT 0,
    `amount_outstanding` DOUBLE NOT NULL,
    `last_payment_date` DATETIME(3) NULL,
    `payment_method` VARCHAR(191) NULL,
    `payment_reference` VARCHAR(191) NULL,
    `payment_date` DATETIME(3) NULL,
    `bank_account_id` INTEGER NULL,
    `wallet_transaction_id` INTEGER NULL,
    `invoice_pdf_url` VARCHAR(191) NULL,
    `proforma_invoice_url` VARCHAR(191) NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'ISSUED',
    `credit_note_for` INTEGER NULL,
    `credit_reason` VARCHAR(191) NULL,
    `last_reminder_sent` DATETIME(3) NULL,
    `reminder_count` INTEGER NOT NULL DEFAULT 0,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `created_by_id` INTEGER NULL,

    UNIQUE INDEX `emmp_invoices_uid_key`(`uid`),
    UNIQUE INDEX `emmp_invoices_invoice_number_key`(`invoice_number`),
    INDEX `emmp_invoices_buyer_id_invoice_date_idx`(`buyer_id`, `invoice_date`),
    INDEX `emmp_invoices_order_id_idx`(`order_id`),
    INDEX `emmp_invoices_payment_status_idx`(`payment_status`),
    INDEX `emmp_invoices_due_date_idx`(`due_date`),
    INDEX `emmp_invoices_wallet_transaction_id_idx`(`wallet_transaction_id`),
    INDEX `emmp_invoices_uid_idx`(`uid`),
    INDEX `emmp_invoices_bank_account_id_fkey`(`bank_account_id`),
    INDEX `emmp_invoices_created_by_id_fkey`(`created_by_id`),
    INDEX `emmp_invoices_shipment_id_fkey`(`shipment_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `emmp_payments` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `uid` VARCHAR(191) NOT NULL,
    `invoice_id` INTEGER NOT NULL,
    `buyer_id` INTEGER NOT NULL,
    `payment_date` DATETIME(3) NOT NULL,
    `amount` DOUBLE NOT NULL,
    `currency` VARCHAR(191) NOT NULL DEFAULT 'USD',
    `exchange_rate` DOUBLE NULL,
    `payment_method` VARCHAR(191) NOT NULL,
    `payment_reference` VARCHAR(191) NULL,
    `from_account` VARCHAR(191) NULL,
    `to_account_id` INTEGER NULL,
    `wallet_transaction_id` INTEGER NULL,
    `lc_number` VARCHAR(191) NULL,
    `lc_issuing_bank` VARCHAR(191) NULL,
    `lc_expiry_date` DATETIME(3) NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'PENDING',
    `reconciled_at` DATETIME(3) NULL,
    `reconciled_by_id` INTEGER NULL,
    `payment_proof_url` VARCHAR(191) NULL,
    `is_partial` BOOLEAN NOT NULL DEFAULT false,
    `remaining_balance` DOUBLE NULL,
    `notes` VARCHAR(191) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `created_by_id` INTEGER NULL,

    UNIQUE INDEX `emmp_payments_uid_key`(`uid`),
    INDEX `emmp_payments_invoice_id_idx`(`invoice_id`),
    INDEX `emmp_payments_buyer_id_payment_date_idx`(`buyer_id`, `payment_date`),
    INDEX `emmp_payments_payment_reference_idx`(`payment_reference`),
    INDEX `emmp_payments_status_idx`(`status`),
    INDEX `emmp_payments_wallet_transaction_id_idx`(`wallet_transaction_id`),
    INDEX `emmp_payments_uid_idx`(`uid`),
    INDEX `emmp_payments_created_by_id_fkey`(`created_by_id`),
    INDEX `emmp_payments_reconciled_by_id_fkey`(`reconciled_by_id`),
    INDEX `emmp_payments_to_account_id_fkey`(`to_account_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `emmp_shipment_tracking` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `uid` VARCHAR(191) NOT NULL,
    `order_id` INTEGER NOT NULL,
    `shipment_id` INTEGER NOT NULL,
    `events` LONGTEXT NOT NULL,
    `current_status` VARCHAR(191) NOT NULL,
    `last_update` DATETIME(3) NOT NULL,
    `estimated_delivery` DATETIME(3) NULL,
    `last_notification_sent` DATETIME(3) NULL,
    `notification_channel` VARCHAR(191) NULL,
    `delivered_at` DATETIME(3) NULL,
    `delivered_to` VARCHAR(191) NULL,
    `proof_of_delivery_url` VARCHAR(191) NULL,
    `feedback_rating` INTEGER NULL,
    `feedback_comment` VARCHAR(191) NULL,
    `feedback_date` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `emmp_shipment_tracking_uid_key`(`uid`),
    INDEX `emmp_shipment_tracking_uid_idx`(`uid`),
    INDEX `emmp_shipment_tracking_shipment_id_fkey`(`shipment_id`),
    UNIQUE INDEX `emmp_shipment_tracking_order_id_shipment_id_key`(`order_id`, `shipment_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `emmp_market_intelligence` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `uid` VARCHAR(191) NOT NULL,
    `market` VARCHAR(191) NOT NULL,
    `product_grade` VARCHAR(191) NOT NULL,
    `date` DATETIME(3) NOT NULL,
    `price_min` DOUBLE NOT NULL,
    `price_max` DOUBLE NOT NULL,
    `price_avg` DOUBLE NOT NULL,
    `currency` VARCHAR(191) NOT NULL DEFAULT 'USD',
    `unit` VARCHAR(191) NOT NULL DEFAULT 'KG',
    `data_source` VARCHAR(191) NOT NULL,
    `source_url` VARCHAR(191) NULL,
    `volume_traded` DOUBLE NULL,
    `trend` VARCHAR(191) NULL,
    `trend_percent` DOUBLE NULL,
    `notes` VARCHAR(191) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `created_by_id` INTEGER NULL,

    UNIQUE INDEX `emmp_market_intelligence_uid_key`(`uid`),
    INDEX `emmp_market_intelligence_date_idx`(`date`),
    INDEX `emmp_market_intelligence_uid_idx`(`uid`),
    UNIQUE INDEX `emmp_market_intelligence_market_product_grade_date_key`(`market`, `product_grade`, `date`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `emmp_dashboard_snapshots` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `uid` VARCHAR(191) NOT NULL,
    `snapshot_date` DATETIME(3) NOT NULL,
    `total_orders` INTEGER NOT NULL,
    `total_orders_value` DOUBLE NOT NULL,
    `avg_order_value` DOUBLE NOT NULL,
    `export_orders` INTEGER NOT NULL,
    `export_value` DOUBLE NOT NULL,
    `domestic_orders` INTEGER NOT NULL,
    `domestic_value` DOUBLE NOT NULL,
    `supreme_volume_kg` DOUBLE NOT NULL,
    `premium_volume_kg` DOUBLE NOT NULL,
    `standard_volume_kg` DOUBLE NOT NULL,
    `top_buyers` LONGTEXT NOT NULL,
    `active_contracts` INTEGER NOT NULL,
    `contract_value_total` DOUBLE NOT NULL,
    `contract_volume_total` DOUBLE NOT NULL,
    `pending_orders_value` DOUBLE NOT NULL,
    `pending_orders_count` INTEGER NOT NULL,
    `outstanding_invoices` DOUBLE NOT NULL,
    `overdue_invoices` DOUBLE NOT NULL,
    `paid_this_month` DOUBLE NOT NULL,
    `ytd_revenue` DOUBLE NOT NULL,
    `ytd_volume_kg` DOUBLE NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `emmp_dashboard_snapshots_uid_key`(`uid`),
    UNIQUE INDEX `emmp_dashboard_snapshots_snapshot_date_key`(`snapshot_date`),
    INDEX `emmp_dashboard_snapshots_uid_idx`(`uid`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `wallets` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `uid` VARCHAR(191) NOT NULL,
    `party_id` INTEGER NOT NULL,
    `account_number` VARCHAR(191) NOT NULL,
    `account_name` VARCHAR(191) NOT NULL,
    `account_type` VARCHAR(191) NOT NULL DEFAULT 'STANDARD',
    `balance` BIGINT NOT NULL DEFAULT 0,
    `ledger_balance` BIGINT NOT NULL DEFAULT 0,
    `available_balance` BIGINT NOT NULL DEFAULT 0,
    `currency` VARCHAR(191) NOT NULL DEFAULT 'NGN',
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `is_locked` BOOLEAN NOT NULL DEFAULT false,
    `lock_reason` VARCHAR(191) NULL,
    `locked_at` DATETIME(3) NULL,
    `locked_by` INTEGER NULL,
    `daily_limit` BIGINT NULL,
    `monthly_limit` BIGINT NULL,
    `withdrawal_limit` BIGINT NULL,
    `kyc_level` INTEGER NOT NULL DEFAULT 1,
    `metadata` LONGTEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `created_by` INTEGER NULL,
    `updated_by` INTEGER NULL,

    UNIQUE INDEX `wallets_uid_key`(`uid`),
    UNIQUE INDEX `wallets_party_id_key`(`party_id`),
    UNIQUE INDEX `wallets_account_number_key`(`account_number`),
    INDEX `wallets_account_number_idx`(`account_number`),
    INDEX `wallets_party_id_idx`(`party_id`),
    INDEX `wallets_uid_idx`(`uid`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `wallet_transactions` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `uid` VARCHAR(191) NOT NULL,
    `transaction_id` VARCHAR(191) NOT NULL,
    `wallet_id` INTEGER NOT NULL,
    `counterparty_wallet_id` INTEGER NULL,
    `transaction_type` VARCHAR(191) NOT NULL,
    `amount` BIGINT NOT NULL,
    `fee` BIGINT NOT NULL DEFAULT 0,
    `net_amount` BIGINT NOT NULL,
    `balance_before` BIGINT NOT NULL,
    `balance_after` BIGINT NOT NULL,
    `reference_type` VARCHAR(191) NULL,
    `reference_id` VARCHAR(191) NULL,
    `reference_number` VARCHAR(191) NULL,
    `description` TEXT NULL,
    `narration` VARCHAR(191) NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'PENDING',
    `failure_reason` VARCHAR(191) NULL,
    `payment_method` VARCHAR(191) NULL,
    `payment_provider` VARCHAR(191) NULL,
    `provider_reference` VARCHAR(191) NULL,
    `requires_approval` BOOLEAN NOT NULL DEFAULT false,
    `approved_by` INTEGER NULL,
    `approved_at` DATETIME(3) NULL,
    `approval_notes` VARCHAR(191) NULL,
    `metadata` LONGTEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `created_by` INTEGER NULL,

    UNIQUE INDEX `wallet_transactions_uid_key`(`uid`),
    UNIQUE INDEX `wallet_transactions_transaction_id_key`(`transaction_id`),
    INDEX `wallet_transactions_transaction_id_idx`(`transaction_id`),
    INDEX `wallet_transactions_wallet_id_idx`(`wallet_id`),
    INDEX `wallet_transactions_counterparty_wallet_id_idx`(`counterparty_wallet_id`),
    INDEX `wallet_transactions_reference_type_reference_id_idx`(`reference_type`, `reference_id`),
    INDEX `wallet_transactions_status_idx`(`status`),
    INDEX `wallet_transactions_created_at_idx`(`created_at`),
    INDEX `wallet_transactions_uid_idx`(`uid`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `wallet_ledger_entries` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `uid` VARCHAR(191) NOT NULL,
    `entry_id` VARCHAR(191) NOT NULL,
    `transaction_id` INTEGER NOT NULL,
    `wallet_id` INTEGER NOT NULL,
    `entry_type` VARCHAR(191) NOT NULL,
    `amount` BIGINT NOT NULL,
    `account_type` VARCHAR(191) NOT NULL,
    `account_code` VARCHAR(191) NOT NULL,
    `running_balance` BIGINT NOT NULL,
    `description` VARCHAR(191) NULL,
    `is_reconciled` BOOLEAN NOT NULL DEFAULT false,
    `reconciled_at` DATETIME(3) NULL,
    `reconciled_by` INTEGER NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `wallet_ledger_entries_uid_key`(`uid`),
    UNIQUE INDEX `wallet_ledger_entries_entry_id_key`(`entry_id`),
    INDEX `wallet_ledger_entries_transaction_id_idx`(`transaction_id`),
    INDEX `wallet_ledger_entries_wallet_id_idx`(`wallet_id`),
    INDEX `wallet_ledger_entries_entry_id_idx`(`entry_id`),
    INDEX `wallet_ledger_entries_created_at_idx`(`created_at`),
    INDEX `wallet_ledger_entries_uid_idx`(`uid`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `wallet_statements` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `uid` VARCHAR(191) NOT NULL,
    `wallet_id` INTEGER NOT NULL,
    `statement_period` VARCHAR(191) NOT NULL,
    `start_date` DATETIME(3) NOT NULL,
    `end_date` DATETIME(3) NOT NULL,
    `opening_balance` BIGINT NOT NULL,
    `closing_balance` BIGINT NOT NULL,
    `total_credits` BIGINT NOT NULL,
    `total_debits` BIGINT NOT NULL,
    `transaction_count` INTEGER NOT NULL,
    `statement_url` VARCHAR(191) NULL,
    `statement_data` LONGTEXT NULL,
    `is_generated` BOOLEAN NOT NULL DEFAULT false,
    `generated_at` DATETIME(3) NULL,
    `generated_by` INTEGER NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `wallet_statements_uid_key`(`uid`),
    INDEX `wallet_statements_wallet_id_idx`(`wallet_id`),
    INDEX `wallet_statements_statement_period_idx`(`statement_period`),
    INDEX `wallet_statements_uid_idx`(`uid`),
    UNIQUE INDEX `wallet_statements_wallet_id_statement_period_key`(`wallet_id`, `statement_period`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `wallet_holds` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `uid` VARCHAR(191) NOT NULL,
    `hold_reference` VARCHAR(191) NOT NULL,
    `wallet_id` INTEGER NOT NULL,
    `amount` BIGINT NOT NULL,
    `reason` VARCHAR(191) NOT NULL,
    `reference_type` VARCHAR(191) NOT NULL,
    `reference_id` VARCHAR(191) NOT NULL,
    `expires_at` DATETIME(3) NOT NULL,
    `released_at` DATETIME(3) NULL,
    `released_by` INTEGER NULL,
    `release_reason` VARCHAR(191) NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'ACTIVE',
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `created_by` INTEGER NULL,

    UNIQUE INDEX `wallet_holds_uid_key`(`uid`),
    UNIQUE INDEX `wallet_holds_hold_reference_key`(`hold_reference`),
    INDEX `wallet_holds_wallet_id_idx`(`wallet_id`),
    INDEX `wallet_holds_hold_reference_idx`(`hold_reference`),
    INDEX `wallet_holds_status_expires_at_idx`(`status`, `expires_at`),
    INDEX `wallet_holds_uid_idx`(`uid`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `system_settings` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `uid` VARCHAR(191) NOT NULL,
    `setting_key` VARCHAR(191) NOT NULL,
    `setting_value` VARCHAR(191) NOT NULL,
    `description` VARCHAR(191) NULL,
    `data_type` VARCHAR(191) NOT NULL DEFAULT 'string',
    `group` VARCHAR(191) NULL,
    `is_editable` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `updated_by` INTEGER NULL,
    `party_id` INTEGER NULL,

    UNIQUE INDEX `system_settings_uid_key`(`uid`),
    INDEX `system_settings_setting_key_idx`(`setting_key`),
    INDEX `system_settings_group_idx`(`group`),
    INDEX `system_settings_party_id_idx`(`party_id`),
    UNIQUE INDEX `system_settings_setting_key_party_id_key`(`setting_key`, `party_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `wallet_webhooks` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `uid` VARCHAR(191) NOT NULL,
    `webhook_id` VARCHAR(191) NOT NULL,
    `provider` VARCHAR(191) NOT NULL,
    `event_type` VARCHAR(191) NOT NULL,
    `payload` LONGTEXT NOT NULL,
    `transaction_id` INTEGER NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'RECEIVED',
    `processed_at` DATETIME(3) NULL,
    `error_message` VARCHAR(191) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `wallet_webhooks_uid_key`(`uid`),
    UNIQUE INDEX `wallet_webhooks_webhook_id_key`(`webhook_id`),
    INDEX `wallet_webhooks_webhook_id_idx`(`webhook_id`),
    INDEX `wallet_webhooks_transaction_id_idx`(`transaction_id`),
    INDEX `wallet_webhooks_status_idx`(`status`),
    INDEX `wallet_webhooks_uid_idx`(`uid`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `wallet_settings` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `uid` VARCHAR(191) NOT NULL,
    `wallet_id` INTEGER NOT NULL,
    `notify_on_credit` BOOLEAN NOT NULL DEFAULT true,
    `notify_on_debit` BOOLEAN NOT NULL DEFAULT true,
    `notify_on_low_balance` BOOLEAN NOT NULL DEFAULT true,
    `low_balance_threshold` BIGINT NULL,
    `auto_sweep_enabled` BOOLEAN NOT NULL DEFAULT false,
    `auto_sweep_target_wallet_id` INTEGER NULL,
    `auto_sweep_threshold` BIGINT NULL,
    `webhook_url` VARCHAR(191) NULL,
    `webhook_secret` VARCHAR(191) NULL,
    `api_enabled` BOOLEAN NOT NULL DEFAULT false,
    `api_key` VARCHAR(191) NULL,
    `api_secret` VARCHAR(191) NULL,
    `ip_whitelist` LONGTEXT NULL,
    `settings` LONGTEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `wallet_settings_uid_key`(`uid`),
    UNIQUE INDEX `wallet_settings_wallet_id_key`(`wallet_id`),
    UNIQUE INDEX `wallet_settings_api_key_key`(`api_key`),
    INDEX `wallet_settings_api_key_idx`(`api_key`),
    INDEX `wallet_settings_uid_idx`(`uid`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `emaps_lot_transfers` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `uid` VARCHAR(191) NOT NULL,
    `transfer_number` VARCHAR(191) NOT NULL,
    `from_warehouse_id` INTEGER NOT NULL,
    `to_warehouse_id` INTEGER NOT NULL,
    `lot_id` INTEGER NOT NULL,
    `bales_transferred` INTEGER NOT NULL,
    `weight_kg_transferred` DOUBLE NOT NULL,
    `transport_method` VARCHAR(191) NOT NULL,
    `vehicle_number` VARCHAR(191) NULL,
    `driver_name` VARCHAR(191) NULL,
    `driver_phone` VARCHAR(191) NULL,
    `transporter_name` VARCHAR(191) NULL,
    `transporter_phone` VARCHAR(191) NULL,
    `waybill_number` VARCHAR(191) NULL,
    `seal_number` VARCHAR(191) NULL,
    `container_number` VARCHAR(191) NULL,
    `dispatched_at` DATETIME(3) NULL,
    `expected_arrival` DATETIME(3) NULL,
    `arrived_at` DATETIME(3) NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'PENDING',
    `requested_by_id` INTEGER NOT NULL,
    `dispatched_by_id` INTEGER NULL,
    `received_by_id` INTEGER NULL,
    `notes` VARCHAR(191) NULL,
    `tracking_notes` LONGTEXT NULL,
    `gps_tracking_id` VARCHAR(191) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `dispatch_document_url` VARCHAR(191) NULL,
    `receipt_document_url` VARCHAR(191) NULL,

    UNIQUE INDEX `emaps_lot_transfers_uid_key`(`uid`),
    UNIQUE INDEX `emaps_lot_transfers_transfer_number_key`(`transfer_number`),
    INDEX `emaps_lot_transfers_transfer_number_idx`(`transfer_number`),
    INDEX `emaps_lot_transfers_from_warehouse_id_status_idx`(`from_warehouse_id`, `status`),
    INDEX `emaps_lot_transfers_to_warehouse_id_status_idx`(`to_warehouse_id`, `status`),
    INDEX `emaps_lot_transfers_lot_id_idx`(`lot_id`),
    INDEX `emaps_lot_transfers_status_idx`(`status`),
    INDEX `emaps_lot_transfers_dispatched_at_idx`(`dispatched_at`),
    INDEX `emaps_lot_transfers_expected_arrival_idx`(`expected_arrival`),
    INDEX `emaps_lot_transfers_dispatched_by_id_fkey`(`dispatched_by_id`),
    INDEX `emaps_lot_transfers_received_by_id_fkey`(`received_by_id`),
    INDEX `emaps_lot_transfers_requested_by_id_fkey`(`requested_by_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `emaps_transfer_tracking` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `uid` VARCHAR(191) NOT NULL,
    `transfer_id` INTEGER NOT NULL,
    `status` VARCHAR(191) NOT NULL,
    `location` VARCHAR(191) NULL,
    `latitude` DOUBLE NULL,
    `longitude` DOUBLE NULL,
    `timestamp` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `notes` VARCHAR(191) NULL,
    `updated_by` INTEGER NULL,

    UNIQUE INDEX `emaps_transfer_tracking_uid_key`(`uid`),
    INDEX `emaps_transfer_tracking_transfer_id_timestamp_idx`(`transfer_id`, `timestamp`),
    INDEX `emaps_transfer_tracking_uid_idx`(`uid`),
    INDEX `emaps_transfer_tracking_updated_by_fkey`(`updated_by`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `accounts` ADD CONSTRAINT `accounts_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `sessions` ADD CONSTRAINT `sessions_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `users` ADD CONSTRAINT `users_party_id_fkey` FOREIGN KEY (`party_id`) REFERENCES `parties`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `password_resets` ADD CONSTRAINT `password_resets_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `individual_parties` ADD CONSTRAINT `individual_parties_party_id_fkey` FOREIGN KEY (`party_id`) REFERENCES `parties`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `organization_parties` ADD CONSTRAINT `organization_parties_party_id_fkey` FOREIGN KEY (`party_id`) REFERENCES `parties`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `community_parties` ADD CONSTRAINT `community_parties_party_id_fkey` FOREIGN KEY (`party_id`) REFERENCES `parties`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `party_representatives` ADD CONSTRAINT `party_representatives_individual_id_fkey` FOREIGN KEY (`individual_id`) REFERENCES `individual_parties`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `party_representatives` ADD CONSTRAINT `party_representatives_represented_party_id_fkey` FOREIGN KEY (`represented_party_id`) REFERENCES `parties`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `party_contacts` ADD CONSTRAINT `party_contacts_party_id_fkey` FOREIGN KEY (`party_id`) REFERENCES `parties`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `party_addresses` ADD CONSTRAINT `party_addresses_party_id_fkey` FOREIGN KEY (`party_id`) REFERENCES `parties`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `party_documents` ADD CONSTRAINT `party_documents_party_id_fkey` FOREIGN KEY (`party_id`) REFERENCES `parties`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `party_bank_accounts` ADD CONSTRAINT `party_bank_accounts_party_id_fkey` FOREIGN KEY (`party_id`) REFERENCES `parties`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `party_tax_info` ADD CONSTRAINT `party_tax_info_party_id_fkey` FOREIGN KEY (`party_id`) REFERENCES `parties`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `party_roles` ADD CONSTRAINT `party_roles_party_id_fkey` FOREIGN KEY (`party_id`) REFERENCES `parties`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `party_roles` ADD CONSTRAINT `party_roles_representation_id_fkey` FOREIGN KEY (`representation_id`) REFERENCES `party_representatives`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `party_sessions` ADD CONSTRAINT `party_sessions_party_id_fkey` FOREIGN KEY (`party_id`) REFERENCES `parties`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `party_relationships` ADD CONSTRAINT `party_relationships_from_party_id_fkey` FOREIGN KEY (`from_party_id`) REFERENCES `parties`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `party_relationships` ADD CONSTRAINT `party_relationships_to_party_id_fkey` FOREIGN KEY (`to_party_id`) REFERENCES `parties`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `party_tags` ADD CONSTRAINT `party_tags_party_id_fkey` FOREIGN KEY (`party_id`) REFERENCES `parties`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `party_custom_fields` ADD CONSTRAINT `party_custom_fields_party_id_fkey` FOREIGN KEY (`party_id`) REFERENCES `parties`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `party_notes` ADD CONSTRAINT `party_notes_party_id_fkey` FOREIGN KEY (`party_id`) REFERENCES `parties`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `party_activity_log` ADD CONSTRAINT `party_activity_log_party_id_fkey` FOREIGN KEY (`party_id`) REFERENCES `parties`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `party_notification_prefs` ADD CONSTRAINT `party_notification_prefs_party_id_fkey` FOREIGN KEY (`party_id`) REFERENCES `parties`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `party_consents` ADD CONSTRAINT `party_consents_party_id_fkey` FOREIGN KEY (`party_id`) REFERENCES `parties`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `party_preferences` ADD CONSTRAINT `party_preferences_party_id_fkey` FOREIGN KEY (`party_id`) REFERENCES `parties`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `party_security_settings` ADD CONSTRAINT `party_security_settings_party_id_fkey` FOREIGN KEY (`party_id`) REFERENCES `parties`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `party_audit_logs` ADD CONSTRAINT `party_audit_logs_acting_for_id_fkey` FOREIGN KEY (`acting_for_id`) REFERENCES `parties`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `party_audit_logs` ADD CONSTRAINT `party_audit_logs_party_id_fkey` FOREIGN KEY (`party_id`) REFERENCES `parties`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `clusters` ADD CONSTRAINT `clusters_anchor_id_fkey` FOREIGN KEY (`anchor_id`) REFERENCES `parties`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `clusters` ADD CONSTRAINT `clusters_community_id_fkey` FOREIGN KEY (`community_id`) REFERENCES `community_parties`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `clusters` ADD CONSTRAINT `clusters_coordinator_id_fkey` FOREIGN KEY (`coordinator_id`) REFERENCES `parties`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `clusters` ADD CONSTRAINT `clusters_spv_id_fkey` FOREIGN KEY (`spv_id`) REFERENCES `parties`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `clusters` ADD CONSTRAINT `clusters_supervisor_id_fkey` FOREIGN KEY (`supervisor_id`) REFERENCES `parties`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `cluster_members` ADD CONSTRAINT `cluster_members_cluster_id_fkey` FOREIGN KEY (`cluster_id`) REFERENCES `clusters`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `cluster_members` ADD CONSTRAINT `cluster_members_party_id_fkey` FOREIGN KEY (`party_id`) REFERENCES `parties`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `cluster_farms` ADD CONSTRAINT `cluster_farms_cluster_id_fkey` FOREIGN KEY (`cluster_id`) REFERENCES `clusters`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `cluster_farms` ADD CONSTRAINT `cluster_farms_operator_party_id_fkey` FOREIGN KEY (`operator_party_id`) REFERENCES `parties`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `cluster_farms` ADD CONSTRAINT `cluster_farms_owner_party_id_fkey` FOREIGN KEY (`owner_party_id`) REFERENCES `parties`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `farm_fields` ADD CONSTRAINT `farm_fields_farm_id_fkey` FOREIGN KEY (`farm_id`) REFERENCES `cluster_farms`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `crop_cycles` ADD CONSTRAINT `crop_cycles_field_id_fkey` FOREIGN KEY (`field_id`) REFERENCES `farm_fields`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `cycle_activities` ADD CONSTRAINT `cycle_activities_cycle_id_fkey` FOREIGN KEY (`cycle_id`) REFERENCES `crop_cycles`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `inventory_items` ADD CONSTRAINT `inventory_items_supplier_id_fkey` FOREIGN KEY (`supplier_id`) REFERENCES `parties`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `inventory_batches` ADD CONSTRAINT `inventory_batches_item_id_fkey` FOREIGN KEY (`item_id`) REFERENCES `inventory_items`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `inventory_batches` ADD CONSTRAINT `inventory_batches_supplier_id_fkey` FOREIGN KEY (`supplier_id`) REFERENCES `parties`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `inventory_movements` ADD CONSTRAINT `inventory_movements_activity_id_fkey` FOREIGN KEY (`activity_id`) REFERENCES `cycle_activities`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `inventory_movements` ADD CONSTRAINT `inventory_movements_authorized_by_id_fkey` FOREIGN KEY (`authorized_by_id`) REFERENCES `parties`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `inventory_movements` ADD CONSTRAINT `inventory_movements_batch_id_fkey` FOREIGN KEY (`batch_id`) REFERENCES `inventory_batches`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `inventory_movements` ADD CONSTRAINT `inventory_movements_cycle_id_fkey` FOREIGN KEY (`cycle_id`) REFERENCES `crop_cycles`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `inventory_movements` ADD CONSTRAINT `inventory_movements_item_id_fkey` FOREIGN KEY (`item_id`) REFERENCES `inventory_items`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `inventory_movements` ADD CONSTRAINT `inventory_movements_performed_by_id_fkey` FOREIGN KEY (`performed_by_id`) REFERENCES `parties`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `inventory_movements` ADD CONSTRAINT `inventory_movements_po_id_fkey` FOREIGN KEY (`po_id`) REFERENCES `inventory_purchase_orders`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `cycle_inputs` ADD CONSTRAINT `cycle_inputs_applied_by_fkey` FOREIGN KEY (`applied_by`) REFERENCES `parties`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `cycle_inputs` ADD CONSTRAINT `cycle_inputs_batch_id_fkey` FOREIGN KEY (`batch_id`) REFERENCES `inventory_batches`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `cycle_inputs` ADD CONSTRAINT `cycle_inputs_cycle_id_fkey` FOREIGN KEY (`cycle_id`) REFERENCES `crop_cycles`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `cycle_inputs` ADD CONSTRAINT `cycle_inputs_item_id_fkey` FOREIGN KEY (`item_id`) REFERENCES `inventory_items`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `cycle_inputs` ADD CONSTRAINT `cycle_inputs_movement_id_fkey` FOREIGN KEY (`movement_id`) REFERENCES `inventory_movements`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `inventory_purchase_orders` ADD CONSTRAINT `inventory_purchase_orders_approved_by_id_fkey` FOREIGN KEY (`approved_by_id`) REFERENCES `parties`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `inventory_purchase_orders` ADD CONSTRAINT `inventory_purchase_orders_created_by_id_fkey` FOREIGN KEY (`created_by_id`) REFERENCES `parties`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `inventory_purchase_orders` ADD CONSTRAINT `inventory_purchase_orders_supplier_id_fkey` FOREIGN KEY (`supplier_id`) REFERENCES `parties`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `inventory_po_items` ADD CONSTRAINT `inventory_po_items_item_id_fkey` FOREIGN KEY (`item_id`) REFERENCES `inventory_items`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `inventory_po_items` ADD CONSTRAINT `inventory_po_items_po_id_fkey` FOREIGN KEY (`po_id`) REFERENCES `inventory_purchase_orders`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `harvests` ADD CONSTRAINT `harvests_cluster_id_fkey` FOREIGN KEY (`cluster_id`) REFERENCES `clusters`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `harvests` ADD CONSTRAINT `harvests_cycle_id_fkey` FOREIGN KEY (`cycle_id`) REFERENCES `crop_cycles`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `harvests` ADD CONSTRAINT `harvests_field_id_fkey` FOREIGN KEY (`field_id`) REFERENCES `farm_fields`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `harvest_bales` ADD CONSTRAINT `harvest_bales_harvest_id_fkey` FOREIGN KEY (`harvest_id`) REFERENCES `harvests`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `iot_devices` ADD CONSTRAINT `iot_devices_farm_id_fkey` FOREIGN KEY (`farm_id`) REFERENCES `cluster_farms`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `iot_devices` ADD CONSTRAINT `iot_devices_field_id_fkey` FOREIGN KEY (`field_id`) REFERENCES `farm_fields`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `iot_readings` ADD CONSTRAINT `iot_readings_device_id_fkey` FOREIGN KEY (`device_id`) REFERENCES `iot_devices`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `iot_alerts` ADD CONSTRAINT `iot_alerts_device_id_fkey` FOREIGN KEY (`device_id`) REFERENCES `iot_devices`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `drone_missions` ADD CONSTRAINT `drone_missions_farm_id_fkey` FOREIGN KEY (`farm_id`) REFERENCES `cluster_farms`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `drone_missions` ADD CONSTRAINT `drone_missions_pilot_id_fkey` FOREIGN KEY (`pilot_id`) REFERENCES `parties`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `drone_images` ADD CONSTRAINT `drone_images_field_id_fkey` FOREIGN KEY (`field_id`) REFERENCES `farm_fields`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `drone_images` ADD CONSTRAINT `drone_images_mission_id_fkey` FOREIGN KEY (`mission_id`) REFERENCES `drone_missions`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `drone_analytics` ADD CONSTRAINT `drone_analytics_field_id_fkey` FOREIGN KEY (`field_id`) REFERENCES `farm_fields`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `drone_analytics` ADD CONSTRAINT `drone_analytics_mission_id_fkey` FOREIGN KEY (`mission_id`) REFERENCES `drone_missions`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `cluster_resources` ADD CONSTRAINT `cluster_resources_cluster_id_fkey` FOREIGN KEY (`cluster_id`) REFERENCES `clusters`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `cluster_resources` ADD CONSTRAINT `cluster_resources_owner_party_id_fkey` FOREIGN KEY (`owner_party_id`) REFERENCES `parties`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `resource_usage_logs` ADD CONSTRAINT `resource_usage_logs_operator_id_fkey` FOREIGN KEY (`operator_id`) REFERENCES `parties`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `resource_usage_logs` ADD CONSTRAINT `resource_usage_logs_resource_id_fkey` FOREIGN KEY (`resource_id`) REFERENCES `cluster_resources`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `cluster_operations` ADD CONSTRAINT `cluster_operations_cluster_id_fkey` FOREIGN KEY (`cluster_id`) REFERENCES `clusters`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `cluster_harvests` ADD CONSTRAINT `cluster_harvests_cluster_id_fkey` FOREIGN KEY (`cluster_id`) REFERENCES `clusters`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `cluster_payments` ADD CONSTRAINT `cluster_payments_cluster_id_fkey` FOREIGN KEY (`cluster_id`) REFERENCES `clusters`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `cluster_payments` ADD CONSTRAINT `cluster_payments_from_party_id_fkey` FOREIGN KEY (`from_party_id`) REFERENCES `parties`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `cluster_payments` ADD CONSTRAINT `cluster_payments_to_party_id_fkey` FOREIGN KEY (`to_party_id`) REFERENCES `parties`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `cluster_payments` ADD CONSTRAINT `cluster_payments_wallet_transaction_id_fkey` FOREIGN KEY (`wallet_transaction_id`) REFERENCES `wallet_transactions`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `cluster_documents` ADD CONSTRAINT `cluster_documents_cluster_id_fkey` FOREIGN KEY (`cluster_id`) REFERENCES `clusters`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `cluster_metrics` ADD CONSTRAINT `cluster_metrics_cluster_id_fkey` FOREIGN KEY (`cluster_id`) REFERENCES `clusters`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `cluster_alerts` ADD CONSTRAINT `cluster_alerts_cluster_id_fkey` FOREIGN KEY (`cluster_id`) REFERENCES `clusters`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `field_reports` ADD CONSTRAINT `field_reports_cluster_id_fkey` FOREIGN KEY (`cluster_id`) REFERENCES `clusters`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `field_reports` ADD CONSTRAINT `field_reports_created_by_id_fkey` FOREIGN KEY (`created_by_id`) REFERENCES `parties`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `field_reports` ADD CONSTRAINT `field_reports_cycle_id_fkey` FOREIGN KEY (`cycle_id`) REFERENCES `crop_cycles`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `field_reports` ADD CONSTRAINT `field_reports_farm_id_fkey` FOREIGN KEY (`farm_id`) REFERENCES `cluster_farms`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `field_reports` ADD CONSTRAINT `field_reports_field_id_fkey` FOREIGN KEY (`field_id`) REFERENCES `farm_fields`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `field_reports` ADD CONSTRAINT `field_reports_template_id_fkey` FOREIGN KEY (`template_id`) REFERENCES `report_templates`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `report_photos` ADD CONSTRAINT `report_photos_field_id_fkey` FOREIGN KEY (`field_id`) REFERENCES `farm_fields`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `report_photos` ADD CONSTRAINT `report_photos_report_id_fkey` FOREIGN KEY (`report_id`) REFERENCES `field_reports`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `report_approvals` ADD CONSTRAINT `report_approvals_approved_by_id_fkey` FOREIGN KEY (`approved_by_id`) REFERENCES `parties`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `report_approvals` ADD CONSTRAINT `report_approvals_next_approver_id_fkey` FOREIGN KEY (`next_approver_id`) REFERENCES `parties`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `report_approvals` ADD CONSTRAINT `report_approvals_report_id_fkey` FOREIGN KEY (`report_id`) REFERENCES `field_reports`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `report_comments` ADD CONSTRAINT `report_comments_comment_by_id_fkey` FOREIGN KEY (`comment_by_id`) REFERENCES `parties`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `report_comments` ADD CONSTRAINT `report_comments_parent_comment_id_fkey` FOREIGN KEY (`parent_comment_id`) REFERENCES `report_comments`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `report_comments` ADD CONSTRAINT `report_comments_report_id_fkey` FOREIGN KEY (`report_id`) REFERENCES `field_reports`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `report_history` ADD CONSTRAINT `report_history_changed_by_id_fkey` FOREIGN KEY (`changed_by_id`) REFERENCES `parties`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `report_history` ADD CONSTRAINT `report_history_report_id_fkey` FOREIGN KEY (`report_id`) REFERENCES `field_reports`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `report_schedules` ADD CONSTRAINT `report_schedules_assigned_to_id_fkey` FOREIGN KEY (`assigned_to_id`) REFERENCES `parties`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `report_schedules` ADD CONSTRAINT `report_schedules_cluster_id_fkey` FOREIGN KEY (`cluster_id`) REFERENCES `clusters`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `report_schedules` ADD CONSTRAINT `report_schedules_farm_id_fkey` FOREIGN KEY (`farm_id`) REFERENCES `cluster_farms`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `report_schedules` ADD CONSTRAINT `report_schedules_template_id_fkey` FOREIGN KEY (`template_id`) REFERENCES `report_templates`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `report_instances` ADD CONSTRAINT `report_instances_report_id_fkey` FOREIGN KEY (`report_id`) REFERENCES `field_reports`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `report_instances` ADD CONSTRAINT `report_instances_schedule_id_fkey` FOREIGN KEY (`schedule_id`) REFERENCES `report_schedules`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `supervisor_dashboards` ADD CONSTRAINT `supervisor_dashboards_supervisor_id_fkey` FOREIGN KEY (`supervisor_id`) REFERENCES `parties`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `supervisor_queue` ADD CONSTRAINT `supervisor_queue_report_id_fkey` FOREIGN KEY (`report_id`) REFERENCES `field_reports`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `supervisor_queue` ADD CONSTRAINT `supervisor_queue_supervisor_id_fkey` FOREIGN KEY (`supervisor_id`) REFERENCES `parties`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `emaps_intake` ADD CONSTRAINT `emaps_intake_cluster_id_fkey` FOREIGN KEY (`cluster_id`) REFERENCES `clusters`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `emaps_intake` ADD CONSTRAINT `emaps_intake_emap_harvest_id_fkey` FOREIGN KEY (`emap_harvest_id`) REFERENCES `harvests`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `emaps_intake` ADD CONSTRAINT `emaps_intake_farm_id_fkey` FOREIGN KEY (`farm_id`) REFERENCES `cluster_farms`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `emaps_intake` ADD CONSTRAINT `emaps_intake_field_id_fkey` FOREIGN KEY (`field_id`) REFERENCES `farm_fields`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `emaps_intake` ADD CONSTRAINT `emaps_intake_qa_completed_by_fkey` FOREIGN KEY (`qa_completed_by`) REFERENCES `parties`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `emaps_intake` ADD CONSTRAINT `emaps_intake_received_by_id_fkey` FOREIGN KEY (`received_by_id`) REFERENCES `parties`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `emaps_intake` ADD CONSTRAINT `emaps_intake_rejected_by_id_fkey` FOREIGN KEY (`rejected_by_id`) REFERENCES `parties`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `emaps_intake_bales` ADD CONSTRAINT `emaps_intake_bales_emap_bale_id_fkey` FOREIGN KEY (`emap_bale_id`) REFERENCES `harvest_bales`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `emaps_intake_bales` ADD CONSTRAINT `emaps_intake_bales_intake_id_fkey` FOREIGN KEY (`intake_id`) REFERENCES `emaps_intake`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `emaps_intake_bales` ADD CONSTRAINT `emaps_intake_bales_qa_assigned_by_fkey` FOREIGN KEY (`qa_assigned_by`) REFERENCES `parties`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `emaps_intake_bales` ADD CONSTRAINT `emaps_intake_bales_qa_test_id_fkey` FOREIGN KEY (`qa_test_id`) REFERENCES `emaps_qa_tests`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `emaps_intake_bales` ADD CONSTRAINT `emaps_intake_bales_weighed_by_id_fkey` FOREIGN KEY (`weighed_by_id`) REFERENCES `parties`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `emaps_qa_tests` ADD CONSTRAINT `emaps_qa_tests_bale_id_fkey` FOREIGN KEY (`bale_id`) REFERENCES `emaps_intake_bales`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `emaps_qa_tests` ADD CONSTRAINT `emaps_qa_tests_certified_by_id_fkey` FOREIGN KEY (`certified_by_id`) REFERENCES `parties`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `emaps_qa_tests` ADD CONSTRAINT `emaps_qa_tests_intake_id_fkey` FOREIGN KEY (`intake_id`) REFERENCES `emaps_intake`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `emaps_qa_tests` ADD CONSTRAINT `emaps_qa_tests_locked_by_id_fkey` FOREIGN KEY (`locked_by_id`) REFERENCES `parties`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `emaps_qa_tests` ADD CONSTRAINT `emaps_qa_tests_sampled_by_id_fkey` FOREIGN KEY (`sampled_by_id`) REFERENCES `parties`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `emaps_qa_tests` ADD CONSTRAINT `emaps_qa_tests_tested_by_id_fkey` FOREIGN KEY (`tested_by_id`) REFERENCES `parties`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `emaps_lots` ADD CONSTRAINT `emaps_lots_created_by_id_fkey` FOREIGN KEY (`created_by_id`) REFERENCES `parties`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `emaps_lots` ADD CONSTRAINT `emaps_lots_current_warehouse_id_fkey` FOREIGN KEY (`current_warehouse_id`) REFERENCES `warehouses`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `emaps_lots` ADD CONSTRAINT `emaps_lots_field_id_fkey` FOREIGN KEY (`field_id`) REFERENCES `farm_fields`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `emaps_lots` ADD CONSTRAINT `emaps_lots_intake_id_fkey` FOREIGN KEY (`intake_id`) REFERENCES `emaps_intake`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `emaps_lots` ADD CONSTRAINT `emaps_lots_qa_test_id_fkey` FOREIGN KEY (`qa_test_id`) REFERENCES `emaps_qa_tests`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `emaps_lot_bales` ADD CONSTRAINT `emaps_lot_bales_intake_bale_id_fkey` FOREIGN KEY (`intake_bale_id`) REFERENCES `emaps_intake_bales`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `emaps_lot_bales` ADD CONSTRAINT `emaps_lot_bales_lot_id_fkey` FOREIGN KEY (`lot_id`) REFERENCES `emaps_lots`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `warehouses` ADD CONSTRAINT `warehouses_manager_id_fkey` FOREIGN KEY (`manager_id`) REFERENCES `parties`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `warehouses` ADD CONSTRAINT `warehouses_party_id_fkey` FOREIGN KEY (`party_id`) REFERENCES `parties`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `warehouse_zones` ADD CONSTRAINT `warehouse_zones_warehouse_id_fkey` FOREIGN KEY (`warehouse_id`) REFERENCES `warehouses`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `emaps_inventory` ADD CONSTRAINT `emaps_inventory_lot_id_fkey` FOREIGN KEY (`lot_id`) REFERENCES `emaps_lots`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `emaps_inventory` ADD CONSTRAINT `emaps_inventory_warehouse_id_fkey` FOREIGN KEY (`warehouse_id`) REFERENCES `warehouses`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `emaps_inventory` ADD CONSTRAINT `emaps_inventory_zone_id_fkey` FOREIGN KEY (`zone_id`) REFERENCES `warehouse_zones`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `emaps_inventory_movements` ADD CONSTRAINT `emaps_inventory_movements_authorized_by_id_fkey` FOREIGN KEY (`authorized_by_id`) REFERENCES `parties`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `emaps_inventory_movements` ADD CONSTRAINT `emaps_inventory_movements_from_warehouse_id_fkey` FOREIGN KEY (`from_warehouse_id`) REFERENCES `warehouses`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `emaps_inventory_movements` ADD CONSTRAINT `emaps_inventory_movements_inventory_id_fkey` FOREIGN KEY (`inventory_id`) REFERENCES `emaps_inventory`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `emaps_inventory_movements` ADD CONSTRAINT `emaps_inventory_movements_lot_id_fkey` FOREIGN KEY (`lot_id`) REFERENCES `emaps_lots`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `emaps_inventory_movements` ADD CONSTRAINT `emaps_inventory_movements_performed_by_id_fkey` FOREIGN KEY (`performed_by_id`) REFERENCES `parties`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `emaps_inventory_movements` ADD CONSTRAINT `emaps_inventory_movements_to_warehouse_id_fkey` FOREIGN KEY (`to_warehouse_id`) REFERENCES `warehouses`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `emaps_lot_allocations` ADD CONSTRAINT `emaps_lot_allocations_buyer_id_fkey` FOREIGN KEY (`buyer_id`) REFERENCES `parties`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `emaps_lot_allocations` ADD CONSTRAINT `emaps_lot_allocations_created_by_id_fkey` FOREIGN KEY (`created_by_id`) REFERENCES `parties`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `emaps_lot_allocations` ADD CONSTRAINT `emaps_lot_allocations_inventory_id_fkey` FOREIGN KEY (`inventory_id`) REFERENCES `emaps_inventory`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `emaps_lot_allocations` ADD CONSTRAINT `emaps_lot_allocations_lot_id_fkey` FOREIGN KEY (`lot_id`) REFERENCES `emaps_lots`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `emaps_lot_allocations` ADD CONSTRAINT `emaps_lot_allocations_picked_by_id_fkey` FOREIGN KEY (`picked_by_id`) REFERENCES `parties`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `emaps_lot_allocations` ADD CONSTRAINT `emaps_lot_allocations_shipment_id_fkey` FOREIGN KEY (`shipment_id`) REFERENCES `emaps_shipments`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `emaps_shipments` ADD CONSTRAINT `emaps_shipments_arranged_by_id_fkey` FOREIGN KEY (`arranged_by_id`) REFERENCES `parties`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `emaps_shipment_lots` ADD CONSTRAINT `emaps_shipment_lots_allocation_id_fkey` FOREIGN KEY (`allocation_id`) REFERENCES `emaps_lot_allocations`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `emaps_shipment_lots` ADD CONSTRAINT `emaps_shipment_lots_lot_id_fkey` FOREIGN KEY (`lot_id`) REFERENCES `emaps_lots`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `emaps_shipment_lots` ADD CONSTRAINT `emaps_shipment_lots_shipment_id_fkey` FOREIGN KEY (`shipment_id`) REFERENCES `emaps_shipments`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `emaps_quality_samples` ADD CONSTRAINT `emaps_quality_samples_customer_id_fkey` FOREIGN KEY (`customer_id`) REFERENCES `parties`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `emaps_quality_samples` ADD CONSTRAINT `emaps_quality_samples_lot_id_fkey` FOREIGN KEY (`lot_id`) REFERENCES `emaps_lots`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `emaps_quality_samples` ADD CONSTRAINT `emaps_quality_samples_sampled_by_id_fkey` FOREIGN KEY (`sampled_by_id`) REFERENCES `parties`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `emmp_buyers` ADD CONSTRAINT `emmp_buyers_account_manager_id_fkey` FOREIGN KEY (`account_manager_id`) REFERENCES `parties`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `emmp_buyers` ADD CONSTRAINT `emmp_buyers_created_by_id_fkey` FOREIGN KEY (`created_by_id`) REFERENCES `parties`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `emmp_buyers` ADD CONSTRAINT `emmp_buyers_kyc_verified_by_id_fkey` FOREIGN KEY (`kyc_verified_by_id`) REFERENCES `parties`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `emmp_buyers` ADD CONSTRAINT `emmp_buyers_party_id_fkey` FOREIGN KEY (`party_id`) REFERENCES `parties`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `emmp_buyers` ADD CONSTRAINT `emmp_buyers_reviewed_by_id_fkey` FOREIGN KEY (`reviewed_by_id`) REFERENCES `parties`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `emmp_buyer_contacts` ADD CONSTRAINT `emmp_buyer_contacts_buyer_id_fkey` FOREIGN KEY (`buyer_id`) REFERENCES `emmp_buyers`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `emmp_buyer_documents` ADD CONSTRAINT `emmp_buyer_documents_buyer_id_fkey` FOREIGN KEY (`buyer_id`) REFERENCES `emmp_buyers`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `emmp_buyer_documents` ADD CONSTRAINT `emmp_buyer_documents_uploaded_by_id_fkey` FOREIGN KEY (`uploaded_by_id`) REFERENCES `parties`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `emmp_buyer_documents` ADD CONSTRAINT `emmp_buyer_documents_verified_by_id_fkey` FOREIGN KEY (`verified_by_id`) REFERENCES `parties`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `emmp_pricing_rules` ADD CONSTRAINT `emmp_pricing_rules_party_id_fkey` FOREIGN KEY (`party_id`) REFERENCES `parties`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `emmp_pricing_rules` ADD CONSTRAINT `emmp_pricing_rules_product_id_fkey` FOREIGN KEY (`product_id`) REFERENCES `emmp_products`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `emmp_price_agreements` ADD CONSTRAINT `emmp_price_agreements_approved_by_id_fkey` FOREIGN KEY (`approved_by_id`) REFERENCES `parties`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `emmp_price_agreements` ADD CONSTRAINT `emmp_price_agreements_buyer_id_fkey` FOREIGN KEY (`buyer_id`) REFERENCES `emmp_buyers`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `emmp_price_agreements` ADD CONSTRAINT `emmp_price_agreements_product_id_fkey` FOREIGN KEY (`product_id`) REFERENCES `emmp_products`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `emmp_contracts` ADD CONSTRAINT `emmp_contracts_approved_by_id_fkey` FOREIGN KEY (`approved_by_id`) REFERENCES `parties`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `emmp_contracts` ADD CONSTRAINT `emmp_contracts_buyer_id_fkey` FOREIGN KEY (`buyer_id`) REFERENCES `emmp_buyers`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `emmp_contracts` ADD CONSTRAINT `emmp_contracts_created_by_id_fkey` FOREIGN KEY (`created_by_id`) REFERENCES `parties`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `emmp_contracts` ADD CONSTRAINT `emmp_contracts_seller_id_fkey` FOREIGN KEY (`seller_id`) REFERENCES `parties`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `emmp_contract_items` ADD CONSTRAINT `emmp_contract_items_contract_id_fkey` FOREIGN KEY (`contract_id`) REFERENCES `emmp_contracts`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `emmp_contract_items` ADD CONSTRAINT `emmp_contract_items_lot_id_fkey` FOREIGN KEY (`lot_id`) REFERENCES `emaps_lots`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `emmp_contract_items` ADD CONSTRAINT `emmp_contract_items_price_agreement_id_fkey` FOREIGN KEY (`price_agreement_id`) REFERENCES `emmp_price_agreements`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `emmp_contract_items` ADD CONSTRAINT `emmp_contract_items_product_id_fkey` FOREIGN KEY (`product_id`) REFERENCES `emmp_products`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `emmp_contract_amendments` ADD CONSTRAINT `emmp_contract_amendments_approved_by_id_fkey` FOREIGN KEY (`approved_by_id`) REFERENCES `parties`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `emmp_contract_amendments` ADD CONSTRAINT `emmp_contract_amendments_contract_id_fkey` FOREIGN KEY (`contract_id`) REFERENCES `emmp_contracts`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `emmp_orders` ADD CONSTRAINT `emmp_orders_buyer_id_fkey` FOREIGN KEY (`buyer_id`) REFERENCES `emmp_buyers`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `emmp_orders` ADD CONSTRAINT `emmp_orders_cancelled_by_id_fkey` FOREIGN KEY (`cancelled_by_id`) REFERENCES `parties`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `emmp_orders` ADD CONSTRAINT `emmp_orders_contact_id_fkey` FOREIGN KEY (`contact_id`) REFERENCES `emmp_buyer_contacts`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `emmp_orders` ADD CONSTRAINT `emmp_orders_contract_id_fkey` FOREIGN KEY (`contract_id`) REFERENCES `emmp_contracts`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `emmp_orders` ADD CONSTRAINT `emmp_orders_created_by_id_fkey` FOREIGN KEY (`created_by_id`) REFERENCES `parties`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `emmp_orders` ADD CONSTRAINT `emmp_orders_invoice_id_fkey` FOREIGN KEY (`invoice_id`) REFERENCES `emmp_invoices`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `emmp_orders` ADD CONSTRAINT `emmp_orders_product_id_fkey` FOREIGN KEY (`product_id`) REFERENCES `emmp_products`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `emmp_orders` ADD CONSTRAINT `emmp_orders_shipment_id_fkey` FOREIGN KEY (`shipment_id`) REFERENCES `emaps_shipments`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `emmp_orders` ADD CONSTRAINT `emmp_orders_validated_by_id_fkey` FOREIGN KEY (`validated_by_id`) REFERENCES `parties`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `emmp_order_status_history` ADD CONSTRAINT `emmp_order_status_history_changed_by_id_fkey` FOREIGN KEY (`changed_by_id`) REFERENCES `parties`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `emmp_order_status_history` ADD CONSTRAINT `emmp_order_status_history_order_id_fkey` FOREIGN KEY (`order_id`) REFERENCES `emmp_orders`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `emmp_invoices` ADD CONSTRAINT `emmp_invoices_bank_account_id_fkey` FOREIGN KEY (`bank_account_id`) REFERENCES `party_bank_accounts`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `emmp_invoices` ADD CONSTRAINT `emmp_invoices_buyer_id_fkey` FOREIGN KEY (`buyer_id`) REFERENCES `emmp_buyers`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `emmp_invoices` ADD CONSTRAINT `emmp_invoices_created_by_id_fkey` FOREIGN KEY (`created_by_id`) REFERENCES `parties`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `emmp_invoices` ADD CONSTRAINT `emmp_invoices_order_id_fkey` FOREIGN KEY (`order_id`) REFERENCES `emmp_orders`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `emmp_invoices` ADD CONSTRAINT `emmp_invoices_shipment_id_fkey` FOREIGN KEY (`shipment_id`) REFERENCES `emaps_shipments`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `emmp_invoices` ADD CONSTRAINT `emmp_invoices_wallet_transaction_id_fkey` FOREIGN KEY (`wallet_transaction_id`) REFERENCES `wallet_transactions`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `emmp_payments` ADD CONSTRAINT `emmp_payments_buyer_id_fkey` FOREIGN KEY (`buyer_id`) REFERENCES `emmp_buyers`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `emmp_payments` ADD CONSTRAINT `emmp_payments_created_by_id_fkey` FOREIGN KEY (`created_by_id`) REFERENCES `parties`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `emmp_payments` ADD CONSTRAINT `emmp_payments_invoice_id_fkey` FOREIGN KEY (`invoice_id`) REFERENCES `emmp_invoices`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `emmp_payments` ADD CONSTRAINT `emmp_payments_reconciled_by_id_fkey` FOREIGN KEY (`reconciled_by_id`) REFERENCES `parties`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `emmp_payments` ADD CONSTRAINT `emmp_payments_to_account_id_fkey` FOREIGN KEY (`to_account_id`) REFERENCES `party_bank_accounts`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `emmp_payments` ADD CONSTRAINT `emmp_payments_wallet_transaction_id_fkey` FOREIGN KEY (`wallet_transaction_id`) REFERENCES `wallet_transactions`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `emmp_shipment_tracking` ADD CONSTRAINT `emmp_shipment_tracking_order_id_fkey` FOREIGN KEY (`order_id`) REFERENCES `emmp_orders`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `emmp_shipment_tracking` ADD CONSTRAINT `emmp_shipment_tracking_shipment_id_fkey` FOREIGN KEY (`shipment_id`) REFERENCES `emaps_shipments`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `wallets` ADD CONSTRAINT `wallets_party_id_fkey` FOREIGN KEY (`party_id`) REFERENCES `parties`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `wallet_transactions` ADD CONSTRAINT `wallet_transactions_counterparty_wallet_id_fkey` FOREIGN KEY (`counterparty_wallet_id`) REFERENCES `wallets`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `wallet_transactions` ADD CONSTRAINT `wallet_transactions_wallet_id_fkey` FOREIGN KEY (`wallet_id`) REFERENCES `wallets`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `wallet_ledger_entries` ADD CONSTRAINT `wallet_ledger_entries_transaction_id_fkey` FOREIGN KEY (`transaction_id`) REFERENCES `wallet_transactions`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `wallet_ledger_entries` ADD CONSTRAINT `wallet_ledger_entries_wallet_id_fkey` FOREIGN KEY (`wallet_id`) REFERENCES `wallets`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `wallet_statements` ADD CONSTRAINT `wallet_statements_wallet_id_fkey` FOREIGN KEY (`wallet_id`) REFERENCES `wallets`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `wallet_holds` ADD CONSTRAINT `wallet_holds_wallet_id_fkey` FOREIGN KEY (`wallet_id`) REFERENCES `wallets`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `wallet_webhooks` ADD CONSTRAINT `wallet_webhooks_transaction_id_fkey` FOREIGN KEY (`transaction_id`) REFERENCES `wallet_transactions`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `wallet_settings` ADD CONSTRAINT `wallet_settings_wallet_id_fkey` FOREIGN KEY (`wallet_id`) REFERENCES `wallets`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `emaps_lot_transfers` ADD CONSTRAINT `emaps_lot_transfers_dispatched_by_id_fkey` FOREIGN KEY (`dispatched_by_id`) REFERENCES `parties`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `emaps_lot_transfers` ADD CONSTRAINT `emaps_lot_transfers_from_warehouse_id_fkey` FOREIGN KEY (`from_warehouse_id`) REFERENCES `warehouses`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `emaps_lot_transfers` ADD CONSTRAINT `emaps_lot_transfers_lot_id_fkey` FOREIGN KEY (`lot_id`) REFERENCES `emaps_lots`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `emaps_lot_transfers` ADD CONSTRAINT `emaps_lot_transfers_received_by_id_fkey` FOREIGN KEY (`received_by_id`) REFERENCES `parties`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `emaps_lot_transfers` ADD CONSTRAINT `emaps_lot_transfers_requested_by_id_fkey` FOREIGN KEY (`requested_by_id`) REFERENCES `parties`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `emaps_lot_transfers` ADD CONSTRAINT `emaps_lot_transfers_to_warehouse_id_fkey` FOREIGN KEY (`to_warehouse_id`) REFERENCES `warehouses`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `emaps_transfer_tracking` ADD CONSTRAINT `emaps_transfer_tracking_transfer_id_fkey` FOREIGN KEY (`transfer_id`) REFERENCES `emaps_lot_transfers`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `emaps_transfer_tracking` ADD CONSTRAINT `emaps_transfer_tracking_updated_by_fkey` FOREIGN KEY (`updated_by`) REFERENCES `parties`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
