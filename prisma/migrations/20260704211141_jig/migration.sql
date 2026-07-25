/*
  Warnings:

  - The primary key for the `sessions` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `expires` on the `sessions` table. All the data in the column will be lost.
  - You are about to drop the column `sessionToken` on the `sessions` table. All the data in the column will be lost.
  - You are about to drop the column `uid` on the `sessions` table. All the data in the column will be lost.
  - The primary key for the `users` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `created_at` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `emailVerified` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `image` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `name` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `party_id` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `uid` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `updated_at` on the `users` table. All the data in the column will be lost.
  - The primary key for the `wallet_transactions` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `approval_notes` on the `wallet_transactions` table. All the data in the column will be lost.
  - You are about to drop the column `approved_at` on the `wallet_transactions` table. All the data in the column will be lost.
  - You are about to drop the column `approved_by` on the `wallet_transactions` table. All the data in the column will be lost.
  - You are about to drop the column `balance_after` on the `wallet_transactions` table. All the data in the column will be lost.
  - You are about to drop the column `balance_before` on the `wallet_transactions` table. All the data in the column will be lost.
  - You are about to drop the column `counterparty_wallet_id` on the `wallet_transactions` table. All the data in the column will be lost.
  - You are about to drop the column `created_at` on the `wallet_transactions` table. All the data in the column will be lost.
  - You are about to drop the column `created_by` on the `wallet_transactions` table. All the data in the column will be lost.
  - You are about to drop the column `failure_reason` on the `wallet_transactions` table. All the data in the column will be lost.
  - You are about to drop the column `fee` on the `wallet_transactions` table. All the data in the column will be lost.
  - You are about to drop the column `narration` on the `wallet_transactions` table. All the data in the column will be lost.
  - You are about to drop the column `net_amount` on the `wallet_transactions` table. All the data in the column will be lost.
  - You are about to drop the column `payment_method` on the `wallet_transactions` table. All the data in the column will be lost.
  - You are about to drop the column `payment_provider` on the `wallet_transactions` table. All the data in the column will be lost.
  - You are about to drop the column `provider_reference` on the `wallet_transactions` table. All the data in the column will be lost.
  - You are about to drop the column `reference_id` on the `wallet_transactions` table. All the data in the column will be lost.
  - You are about to drop the column `reference_number` on the `wallet_transactions` table. All the data in the column will be lost.
  - You are about to drop the column `reference_type` on the `wallet_transactions` table. All the data in the column will be lost.
  - You are about to drop the column `requires_approval` on the `wallet_transactions` table. All the data in the column will be lost.
  - You are about to drop the column `transaction_id` on the `wallet_transactions` table. All the data in the column will be lost.
  - You are about to drop the column `transaction_type` on the `wallet_transactions` table. All the data in the column will be lost.
  - You are about to drop the column `uid` on the `wallet_transactions` table. All the data in the column will be lost.
  - You are about to drop the column `updated_at` on the `wallet_transactions` table. All the data in the column will be lost.
  - You are about to drop the column `wallet_id` on the `wallet_transactions` table. All the data in the column will be lost.
  - You are about to alter the column `status` on the `wallet_transactions` table. The data in that column could be lost. The data in that column will be cast from `VarChar(191)` to `Enum(EnumId(28))`.
  - You are about to alter the column `metadata` on the `wallet_transactions` table. The data in that column could be lost. The data in that column will be cast from `LongText` to `Json`.
  - You are about to drop the `accounts` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `cluster_alerts` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `cluster_documents` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `cluster_farms` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `cluster_harvests` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `cluster_members` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `cluster_metrics` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `cluster_operations` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `cluster_payments` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `cluster_resources` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `clusters` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `community_parties` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `crop_cycles` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `cycle_activities` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `cycle_inputs` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `drone_analytics` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `drone_images` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `drone_missions` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `emaps_grade_standards` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `emaps_intake` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `emaps_intake_bales` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `emaps_inventory` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `emaps_inventory_movements` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `emaps_lot_allocations` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `emaps_lot_bales` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `emaps_lot_transfers` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `emaps_lots` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `emaps_qa_tests` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `emaps_quality_samples` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `emaps_shipment_lots` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `emaps_shipments` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `emaps_transfer_tracking` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `emmp_buyer_contacts` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `emmp_buyer_documents` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `emmp_buyers` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `emmp_contract_amendments` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `emmp_contract_items` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `emmp_contracts` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `emmp_dashboard_snapshots` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `emmp_invoices` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `emmp_market_intelligence` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `emmp_order_status_history` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `emmp_orders` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `emmp_payments` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `emmp_price_agreements` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `emmp_pricing_rules` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `emmp_products` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `emmp_shipment_tracking` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `farm_fields` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `field_reports` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `harvest_bales` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `harvests` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `individual_parties` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `inventory_batches` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `inventory_items` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `inventory_movements` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `inventory_po_items` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `inventory_purchase_orders` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `iot_alerts` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `iot_devices` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `iot_readings` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `organization_parties` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `parties` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `party_activity_log` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `party_addresses` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `party_audit_logs` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `party_bank_accounts` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `party_consents` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `party_contacts` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `party_custom_fields` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `party_documents` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `party_notes` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `party_notification_prefs` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `party_preferences` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `party_relationships` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `party_representatives` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `party_roles` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `party_security_settings` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `party_sessions` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `party_tags` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `party_tax_info` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `password_resets` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `report_aggregates` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `report_approvals` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `report_comments` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `report_history` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `report_instances` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `report_photos` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `report_schedules` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `report_templates` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `resource_usage_logs` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `supervisor_dashboards` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `supervisor_queue` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `system_settings` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `verification_tokens` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `wallet_holds` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `wallet_ledger_entries` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `wallet_settings` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `wallet_statements` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `wallet_webhooks` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `wallets` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `warehouse_zones` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `warehouses` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[token]` on the table `sessions` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[phone]` on the table `users` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[referralCode]` on the table `users` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[reference]` on the table `wallet_transactions` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[vtuTransactionId]` on the table `wallet_transactions` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `expiresAt` to the `sessions` table without a default value. This is not possible if the table is not empty.
  - Added the required column `token` to the `sessions` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `sessions` table without a default value. This is not possible if the table is not empty.
  - Added the required column `fullName` to the `users` table without a default value. This is not possible if the table is not empty.
  - Added the required column `phone` to the `users` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `users` table without a default value. This is not possible if the table is not empty.
  - Added the required column `balanceAfter` to the `wallet_transactions` table without a default value. This is not possible if the table is not empty.
  - Added the required column `balanceBefore` to the `wallet_transactions` table without a default value. This is not possible if the table is not empty.
  - Added the required column `reference` to the `wallet_transactions` table without a default value. This is not possible if the table is not empty.
  - Added the required column `type` to the `wallet_transactions` table without a default value. This is not possible if the table is not empty.
  - Added the required column `userId` to the `wallet_transactions` table without a default value. This is not possible if the table is not empty.
  - Made the column `description` on table `wallet_transactions` required. This step will fail if there are existing NULL values in that column.

*/
-- DropForeignKey
ALTER TABLE `accounts` DROP FOREIGN KEY `accounts_userId_fkey`;

-- DropForeignKey
ALTER TABLE `cluster_alerts` DROP FOREIGN KEY `cluster_alerts_cluster_id_fkey`;

-- DropForeignKey
ALTER TABLE `cluster_documents` DROP FOREIGN KEY `cluster_documents_cluster_id_fkey`;

-- DropForeignKey
ALTER TABLE `cluster_farms` DROP FOREIGN KEY `cluster_farms_cluster_id_fkey`;

-- DropForeignKey
ALTER TABLE `cluster_farms` DROP FOREIGN KEY `cluster_farms_operator_party_id_fkey`;

-- DropForeignKey
ALTER TABLE `cluster_farms` DROP FOREIGN KEY `cluster_farms_owner_party_id_fkey`;

-- DropForeignKey
ALTER TABLE `cluster_harvests` DROP FOREIGN KEY `cluster_harvests_cluster_id_fkey`;

-- DropForeignKey
ALTER TABLE `cluster_members` DROP FOREIGN KEY `cluster_members_cluster_id_fkey`;

-- DropForeignKey
ALTER TABLE `cluster_members` DROP FOREIGN KEY `cluster_members_party_id_fkey`;

-- DropForeignKey
ALTER TABLE `cluster_metrics` DROP FOREIGN KEY `cluster_metrics_cluster_id_fkey`;

-- DropForeignKey
ALTER TABLE `cluster_operations` DROP FOREIGN KEY `cluster_operations_cluster_id_fkey`;

-- DropForeignKey
ALTER TABLE `cluster_payments` DROP FOREIGN KEY `cluster_payments_cluster_id_fkey`;

-- DropForeignKey
ALTER TABLE `cluster_payments` DROP FOREIGN KEY `cluster_payments_from_party_id_fkey`;

-- DropForeignKey
ALTER TABLE `cluster_payments` DROP FOREIGN KEY `cluster_payments_to_party_id_fkey`;

-- DropForeignKey
ALTER TABLE `cluster_payments` DROP FOREIGN KEY `cluster_payments_wallet_transaction_id_fkey`;

-- DropForeignKey
ALTER TABLE `cluster_resources` DROP FOREIGN KEY `cluster_resources_cluster_id_fkey`;

-- DropForeignKey
ALTER TABLE `cluster_resources` DROP FOREIGN KEY `cluster_resources_owner_party_id_fkey`;

-- DropForeignKey
ALTER TABLE `clusters` DROP FOREIGN KEY `clusters_anchor_id_fkey`;

-- DropForeignKey
ALTER TABLE `clusters` DROP FOREIGN KEY `clusters_community_id_fkey`;

-- DropForeignKey
ALTER TABLE `clusters` DROP FOREIGN KEY `clusters_coordinator_id_fkey`;

-- DropForeignKey
ALTER TABLE `clusters` DROP FOREIGN KEY `clusters_spv_id_fkey`;

-- DropForeignKey
ALTER TABLE `clusters` DROP FOREIGN KEY `clusters_supervisor_id_fkey`;

-- DropForeignKey
ALTER TABLE `community_parties` DROP FOREIGN KEY `community_parties_party_id_fkey`;

-- DropForeignKey
ALTER TABLE `crop_cycles` DROP FOREIGN KEY `crop_cycles_field_id_fkey`;

-- DropForeignKey
ALTER TABLE `cycle_activities` DROP FOREIGN KEY `cycle_activities_cycle_id_fkey`;

-- DropForeignKey
ALTER TABLE `cycle_inputs` DROP FOREIGN KEY `cycle_inputs_applied_by_fkey`;

-- DropForeignKey
ALTER TABLE `cycle_inputs` DROP FOREIGN KEY `cycle_inputs_batch_id_fkey`;

-- DropForeignKey
ALTER TABLE `cycle_inputs` DROP FOREIGN KEY `cycle_inputs_cycle_id_fkey`;

-- DropForeignKey
ALTER TABLE `cycle_inputs` DROP FOREIGN KEY `cycle_inputs_item_id_fkey`;

-- DropForeignKey
ALTER TABLE `cycle_inputs` DROP FOREIGN KEY `cycle_inputs_movement_id_fkey`;

-- DropForeignKey
ALTER TABLE `drone_analytics` DROP FOREIGN KEY `drone_analytics_field_id_fkey`;

-- DropForeignKey
ALTER TABLE `drone_analytics` DROP FOREIGN KEY `drone_analytics_mission_id_fkey`;

-- DropForeignKey
ALTER TABLE `drone_images` DROP FOREIGN KEY `drone_images_field_id_fkey`;

-- DropForeignKey
ALTER TABLE `drone_images` DROP FOREIGN KEY `drone_images_mission_id_fkey`;

-- DropForeignKey
ALTER TABLE `drone_missions` DROP FOREIGN KEY `drone_missions_farm_id_fkey`;

-- DropForeignKey
ALTER TABLE `drone_missions` DROP FOREIGN KEY `drone_missions_pilot_id_fkey`;

-- DropForeignKey
ALTER TABLE `emaps_intake` DROP FOREIGN KEY `emaps_intake_cluster_id_fkey`;

-- DropForeignKey
ALTER TABLE `emaps_intake` DROP FOREIGN KEY `emaps_intake_emap_harvest_id_fkey`;

-- DropForeignKey
ALTER TABLE `emaps_intake` DROP FOREIGN KEY `emaps_intake_farm_id_fkey`;

-- DropForeignKey
ALTER TABLE `emaps_intake` DROP FOREIGN KEY `emaps_intake_field_id_fkey`;

-- DropForeignKey
ALTER TABLE `emaps_intake` DROP FOREIGN KEY `emaps_intake_qa_completed_by_fkey`;

-- DropForeignKey
ALTER TABLE `emaps_intake` DROP FOREIGN KEY `emaps_intake_received_by_id_fkey`;

-- DropForeignKey
ALTER TABLE `emaps_intake` DROP FOREIGN KEY `emaps_intake_rejected_by_id_fkey`;

-- DropForeignKey
ALTER TABLE `emaps_intake_bales` DROP FOREIGN KEY `emaps_intake_bales_emap_bale_id_fkey`;

-- DropForeignKey
ALTER TABLE `emaps_intake_bales` DROP FOREIGN KEY `emaps_intake_bales_intake_id_fkey`;

-- DropForeignKey
ALTER TABLE `emaps_intake_bales` DROP FOREIGN KEY `emaps_intake_bales_qa_assigned_by_fkey`;

-- DropForeignKey
ALTER TABLE `emaps_intake_bales` DROP FOREIGN KEY `emaps_intake_bales_qa_test_id_fkey`;

-- DropForeignKey
ALTER TABLE `emaps_intake_bales` DROP FOREIGN KEY `emaps_intake_bales_weighed_by_id_fkey`;

-- DropForeignKey
ALTER TABLE `emaps_inventory` DROP FOREIGN KEY `emaps_inventory_lot_id_fkey`;

-- DropForeignKey
ALTER TABLE `emaps_inventory` DROP FOREIGN KEY `emaps_inventory_warehouse_id_fkey`;

-- DropForeignKey
ALTER TABLE `emaps_inventory` DROP FOREIGN KEY `emaps_inventory_zone_id_fkey`;

-- DropForeignKey
ALTER TABLE `emaps_inventory_movements` DROP FOREIGN KEY `emaps_inventory_movements_authorized_by_id_fkey`;

-- DropForeignKey
ALTER TABLE `emaps_inventory_movements` DROP FOREIGN KEY `emaps_inventory_movements_from_warehouse_id_fkey`;

-- DropForeignKey
ALTER TABLE `emaps_inventory_movements` DROP FOREIGN KEY `emaps_inventory_movements_inventory_id_fkey`;

-- DropForeignKey
ALTER TABLE `emaps_inventory_movements` DROP FOREIGN KEY `emaps_inventory_movements_lot_id_fkey`;

-- DropForeignKey
ALTER TABLE `emaps_inventory_movements` DROP FOREIGN KEY `emaps_inventory_movements_performed_by_id_fkey`;

-- DropForeignKey
ALTER TABLE `emaps_inventory_movements` DROP FOREIGN KEY `emaps_inventory_movements_to_warehouse_id_fkey`;

-- DropForeignKey
ALTER TABLE `emaps_lot_allocations` DROP FOREIGN KEY `emaps_lot_allocations_buyer_id_fkey`;

-- DropForeignKey
ALTER TABLE `emaps_lot_allocations` DROP FOREIGN KEY `emaps_lot_allocations_created_by_id_fkey`;

-- DropForeignKey
ALTER TABLE `emaps_lot_allocations` DROP FOREIGN KEY `emaps_lot_allocations_inventory_id_fkey`;

-- DropForeignKey
ALTER TABLE `emaps_lot_allocations` DROP FOREIGN KEY `emaps_lot_allocations_lot_id_fkey`;

-- DropForeignKey
ALTER TABLE `emaps_lot_allocations` DROP FOREIGN KEY `emaps_lot_allocations_picked_by_id_fkey`;

-- DropForeignKey
ALTER TABLE `emaps_lot_allocations` DROP FOREIGN KEY `emaps_lot_allocations_shipment_id_fkey`;

-- DropForeignKey
ALTER TABLE `emaps_lot_bales` DROP FOREIGN KEY `emaps_lot_bales_intake_bale_id_fkey`;

-- DropForeignKey
ALTER TABLE `emaps_lot_bales` DROP FOREIGN KEY `emaps_lot_bales_lot_id_fkey`;

-- DropForeignKey
ALTER TABLE `emaps_lot_transfers` DROP FOREIGN KEY `emaps_lot_transfers_dispatched_by_id_fkey`;

-- DropForeignKey
ALTER TABLE `emaps_lot_transfers` DROP FOREIGN KEY `emaps_lot_transfers_from_warehouse_id_fkey`;

-- DropForeignKey
ALTER TABLE `emaps_lot_transfers` DROP FOREIGN KEY `emaps_lot_transfers_lot_id_fkey`;

-- DropForeignKey
ALTER TABLE `emaps_lot_transfers` DROP FOREIGN KEY `emaps_lot_transfers_received_by_id_fkey`;

-- DropForeignKey
ALTER TABLE `emaps_lot_transfers` DROP FOREIGN KEY `emaps_lot_transfers_requested_by_id_fkey`;

-- DropForeignKey
ALTER TABLE `emaps_lot_transfers` DROP FOREIGN KEY `emaps_lot_transfers_to_warehouse_id_fkey`;

-- DropForeignKey
ALTER TABLE `emaps_lots` DROP FOREIGN KEY `emaps_lots_created_by_id_fkey`;

-- DropForeignKey
ALTER TABLE `emaps_lots` DROP FOREIGN KEY `emaps_lots_current_warehouse_id_fkey`;

-- DropForeignKey
ALTER TABLE `emaps_lots` DROP FOREIGN KEY `emaps_lots_field_id_fkey`;

-- DropForeignKey
ALTER TABLE `emaps_lots` DROP FOREIGN KEY `emaps_lots_intake_id_fkey`;

-- DropForeignKey
ALTER TABLE `emaps_lots` DROP FOREIGN KEY `emaps_lots_qa_test_id_fkey`;

-- DropForeignKey
ALTER TABLE `emaps_qa_tests` DROP FOREIGN KEY `emaps_qa_tests_bale_id_fkey`;

-- DropForeignKey
ALTER TABLE `emaps_qa_tests` DROP FOREIGN KEY `emaps_qa_tests_certified_by_id_fkey`;

-- DropForeignKey
ALTER TABLE `emaps_qa_tests` DROP FOREIGN KEY `emaps_qa_tests_intake_id_fkey`;

-- DropForeignKey
ALTER TABLE `emaps_qa_tests` DROP FOREIGN KEY `emaps_qa_tests_locked_by_id_fkey`;

-- DropForeignKey
ALTER TABLE `emaps_qa_tests` DROP FOREIGN KEY `emaps_qa_tests_sampled_by_id_fkey`;

-- DropForeignKey
ALTER TABLE `emaps_qa_tests` DROP FOREIGN KEY `emaps_qa_tests_tested_by_id_fkey`;

-- DropForeignKey
ALTER TABLE `emaps_quality_samples` DROP FOREIGN KEY `emaps_quality_samples_customer_id_fkey`;

-- DropForeignKey
ALTER TABLE `emaps_quality_samples` DROP FOREIGN KEY `emaps_quality_samples_lot_id_fkey`;

-- DropForeignKey
ALTER TABLE `emaps_quality_samples` DROP FOREIGN KEY `emaps_quality_samples_sampled_by_id_fkey`;

-- DropForeignKey
ALTER TABLE `emaps_shipment_lots` DROP FOREIGN KEY `emaps_shipment_lots_allocation_id_fkey`;

-- DropForeignKey
ALTER TABLE `emaps_shipment_lots` DROP FOREIGN KEY `emaps_shipment_lots_lot_id_fkey`;

-- DropForeignKey
ALTER TABLE `emaps_shipment_lots` DROP FOREIGN KEY `emaps_shipment_lots_shipment_id_fkey`;

-- DropForeignKey
ALTER TABLE `emaps_shipments` DROP FOREIGN KEY `emaps_shipments_arranged_by_id_fkey`;

-- DropForeignKey
ALTER TABLE `emaps_transfer_tracking` DROP FOREIGN KEY `emaps_transfer_tracking_transfer_id_fkey`;

-- DropForeignKey
ALTER TABLE `emaps_transfer_tracking` DROP FOREIGN KEY `emaps_transfer_tracking_updated_by_fkey`;

-- DropForeignKey
ALTER TABLE `emmp_buyer_contacts` DROP FOREIGN KEY `emmp_buyer_contacts_buyer_id_fkey`;

-- DropForeignKey
ALTER TABLE `emmp_buyer_documents` DROP FOREIGN KEY `emmp_buyer_documents_buyer_id_fkey`;

-- DropForeignKey
ALTER TABLE `emmp_buyer_documents` DROP FOREIGN KEY `emmp_buyer_documents_uploaded_by_id_fkey`;

-- DropForeignKey
ALTER TABLE `emmp_buyer_documents` DROP FOREIGN KEY `emmp_buyer_documents_verified_by_id_fkey`;

-- DropForeignKey
ALTER TABLE `emmp_buyers` DROP FOREIGN KEY `emmp_buyers_account_manager_id_fkey`;

-- DropForeignKey
ALTER TABLE `emmp_buyers` DROP FOREIGN KEY `emmp_buyers_created_by_id_fkey`;

-- DropForeignKey
ALTER TABLE `emmp_buyers` DROP FOREIGN KEY `emmp_buyers_kyc_verified_by_id_fkey`;

-- DropForeignKey
ALTER TABLE `emmp_buyers` DROP FOREIGN KEY `emmp_buyers_party_id_fkey`;

-- DropForeignKey
ALTER TABLE `emmp_buyers` DROP FOREIGN KEY `emmp_buyers_reviewed_by_id_fkey`;

-- DropForeignKey
ALTER TABLE `emmp_contract_amendments` DROP FOREIGN KEY `emmp_contract_amendments_approved_by_id_fkey`;

-- DropForeignKey
ALTER TABLE `emmp_contract_amendments` DROP FOREIGN KEY `emmp_contract_amendments_contract_id_fkey`;

-- DropForeignKey
ALTER TABLE `emmp_contract_items` DROP FOREIGN KEY `emmp_contract_items_contract_id_fkey`;

-- DropForeignKey
ALTER TABLE `emmp_contract_items` DROP FOREIGN KEY `emmp_contract_items_lot_id_fkey`;

-- DropForeignKey
ALTER TABLE `emmp_contract_items` DROP FOREIGN KEY `emmp_contract_items_price_agreement_id_fkey`;

-- DropForeignKey
ALTER TABLE `emmp_contract_items` DROP FOREIGN KEY `emmp_contract_items_product_id_fkey`;

-- DropForeignKey
ALTER TABLE `emmp_contracts` DROP FOREIGN KEY `emmp_contracts_approved_by_id_fkey`;

-- DropForeignKey
ALTER TABLE `emmp_contracts` DROP FOREIGN KEY `emmp_contracts_buyer_id_fkey`;

-- DropForeignKey
ALTER TABLE `emmp_contracts` DROP FOREIGN KEY `emmp_contracts_created_by_id_fkey`;

-- DropForeignKey
ALTER TABLE `emmp_contracts` DROP FOREIGN KEY `emmp_contracts_seller_id_fkey`;

-- DropForeignKey
ALTER TABLE `emmp_invoices` DROP FOREIGN KEY `emmp_invoices_bank_account_id_fkey`;

-- DropForeignKey
ALTER TABLE `emmp_invoices` DROP FOREIGN KEY `emmp_invoices_buyer_id_fkey`;

-- DropForeignKey
ALTER TABLE `emmp_invoices` DROP FOREIGN KEY `emmp_invoices_created_by_id_fkey`;

-- DropForeignKey
ALTER TABLE `emmp_invoices` DROP FOREIGN KEY `emmp_invoices_order_id_fkey`;

-- DropForeignKey
ALTER TABLE `emmp_invoices` DROP FOREIGN KEY `emmp_invoices_shipment_id_fkey`;

-- DropForeignKey
ALTER TABLE `emmp_invoices` DROP FOREIGN KEY `emmp_invoices_wallet_transaction_id_fkey`;

-- DropForeignKey
ALTER TABLE `emmp_order_status_history` DROP FOREIGN KEY `emmp_order_status_history_changed_by_id_fkey`;

-- DropForeignKey
ALTER TABLE `emmp_order_status_history` DROP FOREIGN KEY `emmp_order_status_history_order_id_fkey`;

-- DropForeignKey
ALTER TABLE `emmp_orders` DROP FOREIGN KEY `emmp_orders_buyer_id_fkey`;

-- DropForeignKey
ALTER TABLE `emmp_orders` DROP FOREIGN KEY `emmp_orders_cancelled_by_id_fkey`;

-- DropForeignKey
ALTER TABLE `emmp_orders` DROP FOREIGN KEY `emmp_orders_contact_id_fkey`;

-- DropForeignKey
ALTER TABLE `emmp_orders` DROP FOREIGN KEY `emmp_orders_contract_id_fkey`;

-- DropForeignKey
ALTER TABLE `emmp_orders` DROP FOREIGN KEY `emmp_orders_created_by_id_fkey`;

-- DropForeignKey
ALTER TABLE `emmp_orders` DROP FOREIGN KEY `emmp_orders_invoice_id_fkey`;

-- DropForeignKey
ALTER TABLE `emmp_orders` DROP FOREIGN KEY `emmp_orders_product_id_fkey`;

-- DropForeignKey
ALTER TABLE `emmp_orders` DROP FOREIGN KEY `emmp_orders_shipment_id_fkey`;

-- DropForeignKey
ALTER TABLE `emmp_orders` DROP FOREIGN KEY `emmp_orders_validated_by_id_fkey`;

-- DropForeignKey
ALTER TABLE `emmp_payments` DROP FOREIGN KEY `emmp_payments_buyer_id_fkey`;

-- DropForeignKey
ALTER TABLE `emmp_payments` DROP FOREIGN KEY `emmp_payments_created_by_id_fkey`;

-- DropForeignKey
ALTER TABLE `emmp_payments` DROP FOREIGN KEY `emmp_payments_invoice_id_fkey`;

-- DropForeignKey
ALTER TABLE `emmp_payments` DROP FOREIGN KEY `emmp_payments_reconciled_by_id_fkey`;

-- DropForeignKey
ALTER TABLE `emmp_payments` DROP FOREIGN KEY `emmp_payments_to_account_id_fkey`;

-- DropForeignKey
ALTER TABLE `emmp_payments` DROP FOREIGN KEY `emmp_payments_wallet_transaction_id_fkey`;

-- DropForeignKey
ALTER TABLE `emmp_price_agreements` DROP FOREIGN KEY `emmp_price_agreements_approved_by_id_fkey`;

-- DropForeignKey
ALTER TABLE `emmp_price_agreements` DROP FOREIGN KEY `emmp_price_agreements_buyer_id_fkey`;

-- DropForeignKey
ALTER TABLE `emmp_price_agreements` DROP FOREIGN KEY `emmp_price_agreements_product_id_fkey`;

-- DropForeignKey
ALTER TABLE `emmp_pricing_rules` DROP FOREIGN KEY `emmp_pricing_rules_party_id_fkey`;

-- DropForeignKey
ALTER TABLE `emmp_pricing_rules` DROP FOREIGN KEY `emmp_pricing_rules_product_id_fkey`;

-- DropForeignKey
ALTER TABLE `emmp_shipment_tracking` DROP FOREIGN KEY `emmp_shipment_tracking_order_id_fkey`;

-- DropForeignKey
ALTER TABLE `emmp_shipment_tracking` DROP FOREIGN KEY `emmp_shipment_tracking_shipment_id_fkey`;

-- DropForeignKey
ALTER TABLE `farm_fields` DROP FOREIGN KEY `farm_fields_farm_id_fkey`;

-- DropForeignKey
ALTER TABLE `field_reports` DROP FOREIGN KEY `field_reports_cluster_id_fkey`;

-- DropForeignKey
ALTER TABLE `field_reports` DROP FOREIGN KEY `field_reports_created_by_id_fkey`;

-- DropForeignKey
ALTER TABLE `field_reports` DROP FOREIGN KEY `field_reports_cycle_id_fkey`;

-- DropForeignKey
ALTER TABLE `field_reports` DROP FOREIGN KEY `field_reports_farm_id_fkey`;

-- DropForeignKey
ALTER TABLE `field_reports` DROP FOREIGN KEY `field_reports_field_id_fkey`;

-- DropForeignKey
ALTER TABLE `field_reports` DROP FOREIGN KEY `field_reports_template_id_fkey`;

-- DropForeignKey
ALTER TABLE `harvest_bales` DROP FOREIGN KEY `harvest_bales_harvest_id_fkey`;

-- DropForeignKey
ALTER TABLE `harvests` DROP FOREIGN KEY `harvests_cluster_id_fkey`;

-- DropForeignKey
ALTER TABLE `harvests` DROP FOREIGN KEY `harvests_cycle_id_fkey`;

-- DropForeignKey
ALTER TABLE `harvests` DROP FOREIGN KEY `harvests_field_id_fkey`;

-- DropForeignKey
ALTER TABLE `individual_parties` DROP FOREIGN KEY `individual_parties_party_id_fkey`;

-- DropForeignKey
ALTER TABLE `inventory_batches` DROP FOREIGN KEY `inventory_batches_item_id_fkey`;

-- DropForeignKey
ALTER TABLE `inventory_batches` DROP FOREIGN KEY `inventory_batches_supplier_id_fkey`;

-- DropForeignKey
ALTER TABLE `inventory_items` DROP FOREIGN KEY `inventory_items_supplier_id_fkey`;

-- DropForeignKey
ALTER TABLE `inventory_movements` DROP FOREIGN KEY `inventory_movements_activity_id_fkey`;

-- DropForeignKey
ALTER TABLE `inventory_movements` DROP FOREIGN KEY `inventory_movements_authorized_by_id_fkey`;

-- DropForeignKey
ALTER TABLE `inventory_movements` DROP FOREIGN KEY `inventory_movements_batch_id_fkey`;

-- DropForeignKey
ALTER TABLE `inventory_movements` DROP FOREIGN KEY `inventory_movements_cycle_id_fkey`;

-- DropForeignKey
ALTER TABLE `inventory_movements` DROP FOREIGN KEY `inventory_movements_item_id_fkey`;

-- DropForeignKey
ALTER TABLE `inventory_movements` DROP FOREIGN KEY `inventory_movements_performed_by_id_fkey`;

-- DropForeignKey
ALTER TABLE `inventory_movements` DROP FOREIGN KEY `inventory_movements_po_id_fkey`;

-- DropForeignKey
ALTER TABLE `inventory_po_items` DROP FOREIGN KEY `inventory_po_items_item_id_fkey`;

-- DropForeignKey
ALTER TABLE `inventory_po_items` DROP FOREIGN KEY `inventory_po_items_po_id_fkey`;

-- DropForeignKey
ALTER TABLE `inventory_purchase_orders` DROP FOREIGN KEY `inventory_purchase_orders_approved_by_id_fkey`;

-- DropForeignKey
ALTER TABLE `inventory_purchase_orders` DROP FOREIGN KEY `inventory_purchase_orders_created_by_id_fkey`;

-- DropForeignKey
ALTER TABLE `inventory_purchase_orders` DROP FOREIGN KEY `inventory_purchase_orders_supplier_id_fkey`;

-- DropForeignKey
ALTER TABLE `iot_alerts` DROP FOREIGN KEY `iot_alerts_device_id_fkey`;

-- DropForeignKey
ALTER TABLE `iot_devices` DROP FOREIGN KEY `iot_devices_farm_id_fkey`;

-- DropForeignKey
ALTER TABLE `iot_devices` DROP FOREIGN KEY `iot_devices_field_id_fkey`;

-- DropForeignKey
ALTER TABLE `iot_readings` DROP FOREIGN KEY `iot_readings_device_id_fkey`;

-- DropForeignKey
ALTER TABLE `organization_parties` DROP FOREIGN KEY `organization_parties_party_id_fkey`;

-- DropForeignKey
ALTER TABLE `party_activity_log` DROP FOREIGN KEY `party_activity_log_party_id_fkey`;

-- DropForeignKey
ALTER TABLE `party_addresses` DROP FOREIGN KEY `party_addresses_party_id_fkey`;

-- DropForeignKey
ALTER TABLE `party_audit_logs` DROP FOREIGN KEY `party_audit_logs_acting_for_id_fkey`;

-- DropForeignKey
ALTER TABLE `party_audit_logs` DROP FOREIGN KEY `party_audit_logs_party_id_fkey`;

-- DropForeignKey
ALTER TABLE `party_bank_accounts` DROP FOREIGN KEY `party_bank_accounts_party_id_fkey`;

-- DropForeignKey
ALTER TABLE `party_consents` DROP FOREIGN KEY `party_consents_party_id_fkey`;

-- DropForeignKey
ALTER TABLE `party_contacts` DROP FOREIGN KEY `party_contacts_party_id_fkey`;

-- DropForeignKey
ALTER TABLE `party_custom_fields` DROP FOREIGN KEY `party_custom_fields_party_id_fkey`;

-- DropForeignKey
ALTER TABLE `party_documents` DROP FOREIGN KEY `party_documents_party_id_fkey`;

-- DropForeignKey
ALTER TABLE `party_notes` DROP FOREIGN KEY `party_notes_party_id_fkey`;

-- DropForeignKey
ALTER TABLE `party_notification_prefs` DROP FOREIGN KEY `party_notification_prefs_party_id_fkey`;

-- DropForeignKey
ALTER TABLE `party_preferences` DROP FOREIGN KEY `party_preferences_party_id_fkey`;

-- DropForeignKey
ALTER TABLE `party_relationships` DROP FOREIGN KEY `party_relationships_from_party_id_fkey`;

-- DropForeignKey
ALTER TABLE `party_relationships` DROP FOREIGN KEY `party_relationships_to_party_id_fkey`;

-- DropForeignKey
ALTER TABLE `party_representatives` DROP FOREIGN KEY `party_representatives_individual_id_fkey`;

-- DropForeignKey
ALTER TABLE `party_representatives` DROP FOREIGN KEY `party_representatives_represented_party_id_fkey`;

-- DropForeignKey
ALTER TABLE `party_roles` DROP FOREIGN KEY `party_roles_party_id_fkey`;

-- DropForeignKey
ALTER TABLE `party_roles` DROP FOREIGN KEY `party_roles_representation_id_fkey`;

-- DropForeignKey
ALTER TABLE `party_security_settings` DROP FOREIGN KEY `party_security_settings_party_id_fkey`;

-- DropForeignKey
ALTER TABLE `party_sessions` DROP FOREIGN KEY `party_sessions_party_id_fkey`;

-- DropForeignKey
ALTER TABLE `party_tags` DROP FOREIGN KEY `party_tags_party_id_fkey`;

-- DropForeignKey
ALTER TABLE `party_tax_info` DROP FOREIGN KEY `party_tax_info_party_id_fkey`;

-- DropForeignKey
ALTER TABLE `password_resets` DROP FOREIGN KEY `password_resets_userId_fkey`;

-- DropForeignKey
ALTER TABLE `report_approvals` DROP FOREIGN KEY `report_approvals_approved_by_id_fkey`;

-- DropForeignKey
ALTER TABLE `report_approvals` DROP FOREIGN KEY `report_approvals_next_approver_id_fkey`;

-- DropForeignKey
ALTER TABLE `report_approvals` DROP FOREIGN KEY `report_approvals_report_id_fkey`;

-- DropForeignKey
ALTER TABLE `report_comments` DROP FOREIGN KEY `report_comments_comment_by_id_fkey`;

-- DropForeignKey
ALTER TABLE `report_comments` DROP FOREIGN KEY `report_comments_parent_comment_id_fkey`;

-- DropForeignKey
ALTER TABLE `report_comments` DROP FOREIGN KEY `report_comments_report_id_fkey`;

-- DropForeignKey
ALTER TABLE `report_history` DROP FOREIGN KEY `report_history_changed_by_id_fkey`;

-- DropForeignKey
ALTER TABLE `report_history` DROP FOREIGN KEY `report_history_report_id_fkey`;

-- DropForeignKey
ALTER TABLE `report_instances` DROP FOREIGN KEY `report_instances_report_id_fkey`;

-- DropForeignKey
ALTER TABLE `report_instances` DROP FOREIGN KEY `report_instances_schedule_id_fkey`;

-- DropForeignKey
ALTER TABLE `report_photos` DROP FOREIGN KEY `report_photos_field_id_fkey`;

-- DropForeignKey
ALTER TABLE `report_photos` DROP FOREIGN KEY `report_photos_report_id_fkey`;

-- DropForeignKey
ALTER TABLE `report_schedules` DROP FOREIGN KEY `report_schedules_assigned_to_id_fkey`;

-- DropForeignKey
ALTER TABLE `report_schedules` DROP FOREIGN KEY `report_schedules_cluster_id_fkey`;

-- DropForeignKey
ALTER TABLE `report_schedules` DROP FOREIGN KEY `report_schedules_farm_id_fkey`;

-- DropForeignKey
ALTER TABLE `report_schedules` DROP FOREIGN KEY `report_schedules_template_id_fkey`;

-- DropForeignKey
ALTER TABLE `resource_usage_logs` DROP FOREIGN KEY `resource_usage_logs_operator_id_fkey`;

-- DropForeignKey
ALTER TABLE `resource_usage_logs` DROP FOREIGN KEY `resource_usage_logs_resource_id_fkey`;

-- DropForeignKey
ALTER TABLE `sessions` DROP FOREIGN KEY `sessions_userId_fkey`;

-- DropForeignKey
ALTER TABLE `supervisor_dashboards` DROP FOREIGN KEY `supervisor_dashboards_supervisor_id_fkey`;

-- DropForeignKey
ALTER TABLE `supervisor_queue` DROP FOREIGN KEY `supervisor_queue_report_id_fkey`;

-- DropForeignKey
ALTER TABLE `supervisor_queue` DROP FOREIGN KEY `supervisor_queue_supervisor_id_fkey`;

-- DropForeignKey
ALTER TABLE `users` DROP FOREIGN KEY `users_party_id_fkey`;

-- DropForeignKey
ALTER TABLE `wallet_holds` DROP FOREIGN KEY `wallet_holds_wallet_id_fkey`;

-- DropForeignKey
ALTER TABLE `wallet_ledger_entries` DROP FOREIGN KEY `wallet_ledger_entries_transaction_id_fkey`;

-- DropForeignKey
ALTER TABLE `wallet_ledger_entries` DROP FOREIGN KEY `wallet_ledger_entries_wallet_id_fkey`;

-- DropForeignKey
ALTER TABLE `wallet_settings` DROP FOREIGN KEY `wallet_settings_wallet_id_fkey`;

-- DropForeignKey
ALTER TABLE `wallet_statements` DROP FOREIGN KEY `wallet_statements_wallet_id_fkey`;

-- DropForeignKey
ALTER TABLE `wallet_transactions` DROP FOREIGN KEY `wallet_transactions_counterparty_wallet_id_fkey`;

-- DropForeignKey
ALTER TABLE `wallet_transactions` DROP FOREIGN KEY `wallet_transactions_wallet_id_fkey`;

-- DropForeignKey
ALTER TABLE `wallet_webhooks` DROP FOREIGN KEY `wallet_webhooks_transaction_id_fkey`;

-- DropForeignKey
ALTER TABLE `wallets` DROP FOREIGN KEY `wallets_party_id_fkey`;

-- DropForeignKey
ALTER TABLE `warehouse_zones` DROP FOREIGN KEY `warehouse_zones_warehouse_id_fkey`;

-- DropForeignKey
ALTER TABLE `warehouses` DROP FOREIGN KEY `warehouses_manager_id_fkey`;

-- DropForeignKey
ALTER TABLE `warehouses` DROP FOREIGN KEY `warehouses_party_id_fkey`;

-- DropIndex
DROP INDEX `sessions_sessionToken_key` ON `sessions`;

-- DropIndex
DROP INDEX `sessions_uid_idx` ON `sessions`;

-- DropIndex
DROP INDEX `sessions_uid_key` ON `sessions`;

-- DropIndex
DROP INDEX `users_party_id_key` ON `users`;

-- DropIndex
DROP INDEX `users_uid_idx` ON `users`;

-- DropIndex
DROP INDEX `users_uid_key` ON `users`;

-- DropIndex
DROP INDEX `wallet_transactions_counterparty_wallet_id_idx` ON `wallet_transactions`;

-- DropIndex
DROP INDEX `wallet_transactions_created_at_idx` ON `wallet_transactions`;

-- DropIndex
DROP INDEX `wallet_transactions_reference_type_reference_id_idx` ON `wallet_transactions`;

-- DropIndex
DROP INDEX `wallet_transactions_status_idx` ON `wallet_transactions`;

-- DropIndex
DROP INDEX `wallet_transactions_transaction_id_idx` ON `wallet_transactions`;

-- DropIndex
DROP INDEX `wallet_transactions_transaction_id_key` ON `wallet_transactions`;

-- DropIndex
DROP INDEX `wallet_transactions_uid_idx` ON `wallet_transactions`;

-- DropIndex
DROP INDEX `wallet_transactions_uid_key` ON `wallet_transactions`;

-- DropIndex
DROP INDEX `wallet_transactions_wallet_id_idx` ON `wallet_transactions`;

-- AlterTable
ALTER TABLE `sessions` DROP PRIMARY KEY,
    DROP COLUMN `expires`,
    DROP COLUMN `sessionToken`,
    DROP COLUMN `uid`,
    ADD COLUMN `channel` ENUM('WHATSAPP', 'MOBILE_APP', 'USSD', 'SMS', 'TELEGRAM', 'MESSENGER', 'API') NULL,
    ADD COLUMN `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    ADD COLUMN `deviceInfo` VARCHAR(191) NULL,
    ADD COLUMN `expiresAt` DATETIME(3) NOT NULL,
    ADD COLUMN `ipAddress` VARCHAR(191) NULL,
    ADD COLUMN `token` VARCHAR(191) NOT NULL,
    ADD COLUMN `updatedAt` DATETIME(3) NOT NULL,
    ADD COLUMN `userAgent` VARCHAR(191) NULL,
    MODIFY `id` VARCHAR(191) NOT NULL,
    MODIFY `userId` VARCHAR(191) NOT NULL,
    ADD PRIMARY KEY (`id`);

-- AlterTable
ALTER TABLE `users` DROP PRIMARY KEY,
    DROP COLUMN `created_at`,
    DROP COLUMN `emailVerified`,
    DROP COLUMN `image`,
    DROP COLUMN `name`,
    DROP COLUMN `party_id`,
    DROP COLUMN `uid`,
    DROP COLUMN `updated_at`,
    ADD COLUMN `companyName` VARCHAR(191) NULL,
    ADD COLUMN `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    ADD COLUMN `developerAccountType` ENUM('BASIC', 'PRO', 'ENTERPRISE') NULL DEFAULT 'BASIC',
    ADD COLUMN `developerCustomPricing` JSON NULL,
    ADD COLUMN `developerMonthlyVolume` DECIMAL(65, 30) NOT NULL DEFAULT 0,
    ADD COLUMN `developerStatus` ENUM('PENDING', 'ACTIVE', 'SUSPENDED', 'TERMINATED') NULL DEFAULT 'PENDING',
    ADD COLUMN `fullName` VARCHAR(191) NOT NULL,
    ADD COLUMN `hasWallet` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `isDeveloper` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `isVerified` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `isWalletFrozen` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `kycData` JSON NULL,
    ADD COLUMN `kycStatus` ENUM('PENDING', 'SUBMITTED', 'VERIFIED', 'REJECTED') NOT NULL DEFAULT 'PENDING',
    ADD COLUMN `lastLoginAt` DATETIME(3) NULL,
    ADD COLUMN `passwordHash` VARCHAR(191) NULL,
    ADD COLUMN `phone` VARCHAR(191) NOT NULL,
    ADD COLUMN `pinAttempts` INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN `pinHash` VARCHAR(191) NULL,
    ADD COLUMN `pinLockedUntil` DATETIME(3) NULL,
    ADD COLUMN `preferredChannel` ENUM('WHATSAPP', 'MOBILE_APP', 'USSD', 'SMS', 'TELEGRAM', 'MESSENGER', 'API') NULL,
    ADD COLUMN `preferredLanguage` ENUM('EN', 'PIDGIN', 'HAUSA', 'YORUBA', 'IGBO') NOT NULL DEFAULT 'EN',
    ADD COLUMN `referralCode` VARCHAR(191) NULL,
    ADD COLUMN `referredBy` VARCHAR(191) NULL,
    ADD COLUMN `role` ENUM('END_USER', 'RETAILER', 'AGENT', 'ADMIN', 'SUPER_ADMIN', 'DEVELOPER') NOT NULL DEFAULT 'END_USER',
    ADD COLUMN `updatedAt` DATETIME(3) NOT NULL,
    ADD COLUMN `walletBalance` DECIMAL(65, 30) NOT NULL DEFAULT 0,
    ADD COLUMN `walletFrozenAt` DATETIME(3) NULL,
    ADD COLUMN `walletFrozenReason` VARCHAR(191) NULL,
    MODIFY `id` VARCHAR(191) NOT NULL,
    ADD PRIMARY KEY (`id`);

-- AlterTable
ALTER TABLE `wallet_transactions` DROP PRIMARY KEY,
    DROP COLUMN `approval_notes`,
    DROP COLUMN `approved_at`,
    DROP COLUMN `approved_by`,
    DROP COLUMN `balance_after`,
    DROP COLUMN `balance_before`,
    DROP COLUMN `counterparty_wallet_id`,
    DROP COLUMN `created_at`,
    DROP COLUMN `created_by`,
    DROP COLUMN `failure_reason`,
    DROP COLUMN `fee`,
    DROP COLUMN `narration`,
    DROP COLUMN `net_amount`,
    DROP COLUMN `payment_method`,
    DROP COLUMN `payment_provider`,
    DROP COLUMN `provider_reference`,
    DROP COLUMN `reference_id`,
    DROP COLUMN `reference_number`,
    DROP COLUMN `reference_type`,
    DROP COLUMN `requires_approval`,
    DROP COLUMN `transaction_id`,
    DROP COLUMN `transaction_type`,
    DROP COLUMN `uid`,
    DROP COLUMN `updated_at`,
    DROP COLUMN `wallet_id`,
    ADD COLUMN `balanceAfter` DECIMAL(65, 30) NOT NULL,
    ADD COLUMN `balanceBefore` DECIMAL(65, 30) NOT NULL,
    ADD COLUMN `channel` ENUM('WHATSAPP', 'MOBILE_APP', 'USSD', 'SMS', 'TELEGRAM', 'MESSENGER', 'API') NULL,
    ADD COLUMN `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    ADD COLUMN `reference` VARCHAR(191) NOT NULL,
    ADD COLUMN `type` ENUM('CREDIT', 'DEBIT', 'REFUND', 'RESERVE', 'RELEASE', 'TRANSFER_SENT', 'TRANSFER_RECEIVED', 'ADMIN_ADJUSTMENT', 'LOAN_DISBURSEMENT', 'LOAN_REPAYMENT', 'API_PURCHASE', 'BULK_PURCHASE', 'QR_PAYMENT') NOT NULL,
    ADD COLUMN `userId` VARCHAR(191) NOT NULL,
    ADD COLUMN `vtuTransactionId` VARCHAR(191) NULL,
    MODIFY `id` VARCHAR(191) NOT NULL,
    MODIFY `amount` DECIMAL(65, 30) NOT NULL,
    MODIFY `description` VARCHAR(191) NOT NULL,
    MODIFY `status` ENUM('PENDING', 'PROCESSING', 'SUCCESS', 'FAILED') NOT NULL DEFAULT 'PENDING',
    MODIFY `metadata` JSON NULL,
    ADD PRIMARY KEY (`id`);

-- DropTable
DROP TABLE `accounts`;

-- DropTable
DROP TABLE `cluster_alerts`;

-- DropTable
DROP TABLE `cluster_documents`;

-- DropTable
DROP TABLE `cluster_farms`;

-- DropTable
DROP TABLE `cluster_harvests`;

-- DropTable
DROP TABLE `cluster_members`;

-- DropTable
DROP TABLE `cluster_metrics`;

-- DropTable
DROP TABLE `cluster_operations`;

-- DropTable
DROP TABLE `cluster_payments`;

-- DropTable
DROP TABLE `cluster_resources`;

-- DropTable
DROP TABLE `clusters`;

-- DropTable
DROP TABLE `community_parties`;

-- DropTable
DROP TABLE `crop_cycles`;

-- DropTable
DROP TABLE `cycle_activities`;

-- DropTable
DROP TABLE `cycle_inputs`;

-- DropTable
DROP TABLE `drone_analytics`;

-- DropTable
DROP TABLE `drone_images`;

-- DropTable
DROP TABLE `drone_missions`;

-- DropTable
DROP TABLE `emaps_grade_standards`;

-- DropTable
DROP TABLE `emaps_intake`;

-- DropTable
DROP TABLE `emaps_intake_bales`;

-- DropTable
DROP TABLE `emaps_inventory`;

-- DropTable
DROP TABLE `emaps_inventory_movements`;

-- DropTable
DROP TABLE `emaps_lot_allocations`;

-- DropTable
DROP TABLE `emaps_lot_bales`;

-- DropTable
DROP TABLE `emaps_lot_transfers`;

-- DropTable
DROP TABLE `emaps_lots`;

-- DropTable
DROP TABLE `emaps_qa_tests`;

-- DropTable
DROP TABLE `emaps_quality_samples`;

-- DropTable
DROP TABLE `emaps_shipment_lots`;

-- DropTable
DROP TABLE `emaps_shipments`;

-- DropTable
DROP TABLE `emaps_transfer_tracking`;

-- DropTable
DROP TABLE `emmp_buyer_contacts`;

-- DropTable
DROP TABLE `emmp_buyer_documents`;

-- DropTable
DROP TABLE `emmp_buyers`;

-- DropTable
DROP TABLE `emmp_contract_amendments`;

-- DropTable
DROP TABLE `emmp_contract_items`;

-- DropTable
DROP TABLE `emmp_contracts`;

-- DropTable
DROP TABLE `emmp_dashboard_snapshots`;

-- DropTable
DROP TABLE `emmp_invoices`;

-- DropTable
DROP TABLE `emmp_market_intelligence`;

-- DropTable
DROP TABLE `emmp_order_status_history`;

-- DropTable
DROP TABLE `emmp_orders`;

-- DropTable
DROP TABLE `emmp_payments`;

-- DropTable
DROP TABLE `emmp_price_agreements`;

-- DropTable
DROP TABLE `emmp_pricing_rules`;

-- DropTable
DROP TABLE `emmp_products`;

-- DropTable
DROP TABLE `emmp_shipment_tracking`;

-- DropTable
DROP TABLE `farm_fields`;

-- DropTable
DROP TABLE `field_reports`;

-- DropTable
DROP TABLE `harvest_bales`;

-- DropTable
DROP TABLE `harvests`;

-- DropTable
DROP TABLE `individual_parties`;

-- DropTable
DROP TABLE `inventory_batches`;

-- DropTable
DROP TABLE `inventory_items`;

-- DropTable
DROP TABLE `inventory_movements`;

-- DropTable
DROP TABLE `inventory_po_items`;

-- DropTable
DROP TABLE `inventory_purchase_orders`;

-- DropTable
DROP TABLE `iot_alerts`;

-- DropTable
DROP TABLE `iot_devices`;

-- DropTable
DROP TABLE `iot_readings`;

-- DropTable
DROP TABLE `organization_parties`;

-- DropTable
DROP TABLE `parties`;

-- DropTable
DROP TABLE `party_activity_log`;

-- DropTable
DROP TABLE `party_addresses`;

-- DropTable
DROP TABLE `party_audit_logs`;

-- DropTable
DROP TABLE `party_bank_accounts`;

-- DropTable
DROP TABLE `party_consents`;

-- DropTable
DROP TABLE `party_contacts`;

-- DropTable
DROP TABLE `party_custom_fields`;

-- DropTable
DROP TABLE `party_documents`;

-- DropTable
DROP TABLE `party_notes`;

-- DropTable
DROP TABLE `party_notification_prefs`;

-- DropTable
DROP TABLE `party_preferences`;

-- DropTable
DROP TABLE `party_relationships`;

-- DropTable
DROP TABLE `party_representatives`;

-- DropTable
DROP TABLE `party_roles`;

-- DropTable
DROP TABLE `party_security_settings`;

-- DropTable
DROP TABLE `party_sessions`;

-- DropTable
DROP TABLE `party_tags`;

-- DropTable
DROP TABLE `party_tax_info`;

-- DropTable
DROP TABLE `password_resets`;

-- DropTable
DROP TABLE `report_aggregates`;

-- DropTable
DROP TABLE `report_approvals`;

-- DropTable
DROP TABLE `report_comments`;

-- DropTable
DROP TABLE `report_history`;

-- DropTable
DROP TABLE `report_instances`;

-- DropTable
DROP TABLE `report_photos`;

-- DropTable
DROP TABLE `report_schedules`;

-- DropTable
DROP TABLE `report_templates`;

-- DropTable
DROP TABLE `resource_usage_logs`;

-- DropTable
DROP TABLE `supervisor_dashboards`;

-- DropTable
DROP TABLE `supervisor_queue`;

-- DropTable
DROP TABLE `system_settings`;

-- DropTable
DROP TABLE `verification_tokens`;

-- DropTable
DROP TABLE `wallet_holds`;

-- DropTable
DROP TABLE `wallet_ledger_entries`;

-- DropTable
DROP TABLE `wallet_settings`;

-- DropTable
DROP TABLE `wallet_statements`;

-- DropTable
DROP TABLE `wallet_webhooks`;

-- DropTable
DROP TABLE `wallets`;

-- DropTable
DROP TABLE `warehouse_zones`;

-- DropTable
DROP TABLE `warehouses`;

-- CreateTable
CREATE TABLE `channels` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `channelType` ENUM('WHATSAPP', 'MOBILE_APP', 'USSD', 'SMS', 'TELEGRAM', 'MESSENGER', 'API') NOT NULL,
    `channelIdentifier` VARCHAR(191) NOT NULL,
    `channelUsername` VARCHAR(191) NULL,
    `isVerified` BOOLEAN NOT NULL DEFAULT false,
    `linkedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `lastSeen` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `simCarrier` VARCHAR(191) NULL,
    `simExpiry` DATETIME(3) NULL,
    `metadata` JSON NULL,

    UNIQUE INDEX `channels_channelIdentifier_key`(`channelIdentifier`),
    UNIQUE INDEX `channels_userId_channelType_key`(`userId`, `channelType`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `qr_codes` (
    `id` VARCHAR(191) NOT NULL,
    `qrId` VARCHAR(191) NOT NULL,
    `serviceType` ENUM('ELECTRICITY', 'CABLE_TV', 'WATER', 'OTHER') NOT NULL DEFAULT 'ELECTRICITY',
    `disco` ENUM('IKEJA', 'EKO', 'ABUJA', 'KANO', 'PHCN', 'IBADAN', 'BENIN', 'ENUGU', 'JOS', 'PORT_HARCOURT') NULL,
    `meterNumber` VARCHAR(191) NULL,
    `decoderNumber` VARCHAR(191) NULL,
    `decoderProvider` VARCHAR(191) NULL,
    `customerName` VARCHAR(191) NULL,
    `customerAddress` VARCHAR(191) NULL,
    `agentId` VARCHAR(191) NULL,
    `userId` VARCHAR(191) NULL,
    `category` VARCHAR(191) NULL,
    `status` ENUM('ACTIVE', 'EXPIRED', 'REVOKED', 'USED') NOT NULL DEFAULT 'ACTIVE',
    `expiryDays` INTEGER NOT NULL DEFAULT 30,
    `expiresAt` DATETIME(3) NOT NULL,
    `signature` VARCHAR(191) NOT NULL,
    `scanCount` INTEGER NOT NULL DEFAULT 0,
    `paymentCount` INTEGER NOT NULL DEFAULT 0,
    `totalRevenue` DECIMAL(65, 30) NOT NULL DEFAULT 0,
    `metadata` JSON NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `qr_codes_qrId_key`(`qrId`),
    INDEX `qr_codes_qrId_idx`(`qrId`),
    INDEX `qr_codes_status_idx`(`status`),
    INDEX `qr_codes_agentId_idx`(`agentId`),
    INDEX `qr_codes_userId_idx`(`userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `qr_scan_logs` (
    `id` VARCHAR(191) NOT NULL,
    `qrId` VARCHAR(191) NOT NULL,
    `ipAddress` VARCHAR(191) NOT NULL,
    `userAgent` VARCHAR(191) NULL,
    `location` VARCHAR(191) NULL,
    `deviceInfo` VARCHAR(191) NULL,
    `sessionId` VARCHAR(191) NULL,
    `isSuspicious` BOOLEAN NOT NULL DEFAULT false,
    `suspicionReason` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `qr_scan_logs_qrId_idx`(`qrId`),
    INDEX `qr_scan_logs_createdAt_idx`(`createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `qr_payment_sessions` (
    `id` VARCHAR(191) NOT NULL,
    `qrId` VARCHAR(191) NOT NULL,
    `sessionToken` VARCHAR(191) NOT NULL,
    `phoneNumber` VARCHAR(191) NOT NULL,
    `otpCode` VARCHAR(191) NULL,
    `otpStatus` ENUM('PENDING', 'VERIFIED', 'EXPIRED', 'FAILED') NOT NULL DEFAULT 'PENDING',
    `otpAttempts` INTEGER NOT NULL DEFAULT 0,
    `otpSentAt` DATETIME(3) NULL,
    `otpVerifiedAt` DATETIME(3) NULL,
    `otpExpiresAt` DATETIME(3) NULL,
    `amount` DECIMAL(65, 30) NOT NULL,
    `paymentMethod` ENUM('CARD', 'BANK_TRANSFER', 'WALLET', 'USSD') NULL,
    `status` ENUM('PENDING', 'OTP_SENT', 'VERIFIED', 'PAID', 'FAILED', 'EXPIRED') NOT NULL DEFAULT 'PENDING',
    `ipAddress` VARCHAR(191) NULL,
    `userAgent` VARCHAR(191) NULL,
    `metadata` JSON NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `expiresAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `qr_payment_sessions_sessionToken_key`(`sessionToken`),
    INDEX `qr_payment_sessions_qrId_idx`(`qrId`),
    INDEX `qr_payment_sessions_sessionToken_idx`(`sessionToken`),
    INDEX `qr_payment_sessions_phoneNumber_idx`(`phoneNumber`),
    INDEX `qr_payment_sessions_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `qr_payments` (
    `id` VARCHAR(191) NOT NULL,
    `qrId` VARCHAR(191) NOT NULL,
    `sessionId` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NULL,
    `amount` DECIMAL(65, 30) NOT NULL,
    `serviceFee` DECIMAL(65, 30) NOT NULL DEFAULT 0,
    `totalAmount` DECIMAL(65, 30) NOT NULL,
    `paymentMethod` ENUM('CARD', 'BANK_TRANSFER', 'WALLET', 'USSD') NOT NULL,
    `status` ENUM('PENDING', 'PROCESSING', 'SUCCESS', 'FAILED') NOT NULL DEFAULT 'PENDING',
    `reference` VARCHAR(191) NOT NULL,
    `metadata` JSON NULL,
    `completedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `walletTransactionId` VARCHAR(191) NULL,

    UNIQUE INDEX `qr_payments_sessionId_key`(`sessionId`),
    UNIQUE INDEX `qr_payments_reference_key`(`reference`),
    UNIQUE INDEX `qr_payments_walletTransactionId_key`(`walletTransactionId`),
    INDEX `qr_payments_qrId_idx`(`qrId`),
    INDEX `qr_payments_reference_idx`(`reference`),
    INDEX `qr_payments_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `otp_logs` (
    `id` VARCHAR(191) NOT NULL,
    `phoneNumber` VARCHAR(191) NOT NULL,
    `otpCode` VARCHAR(191) NOT NULL,
    `purpose` VARCHAR(191) NOT NULL,
    `sessionId` VARCHAR(191) NULL,
    `attempts` INTEGER NOT NULL DEFAULT 0,
    `status` ENUM('PENDING', 'VERIFIED', 'EXPIRED', 'FAILED') NOT NULL DEFAULT 'PENDING',
    `sentAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `verifiedAt` DATETIME(3) NULL,
    `expiresAt` DATETIME(3) NOT NULL,
    `ipAddress` VARCHAR(191) NULL,
    `metadata` JSON NULL,

    INDEX `otp_logs_phoneNumber_idx`(`phoneNumber`),
    INDEX `otp_logs_sessionId_idx`(`sessionId`),
    INDEX `otp_logs_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ussd_sessions` (
    `id` VARCHAR(191) NOT NULL,
    `sessionId` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NULL,
    `phoneNumber` VARCHAR(191) NOT NULL,
    `currentMenu` VARCHAR(191) NOT NULL,
    `menuHistory` JSON NOT NULL,
    `step` INTEGER NOT NULL DEFAULT 0,
    `data` JSON NOT NULL,
    `language` ENUM('EN', 'PIDGIN', 'HAUSA', 'YORUBA', 'IGBO') NOT NULL DEFAULT 'EN',
    `status` ENUM('ACTIVE', 'TIMEOUT', 'COMPLETED', 'CANCELLED', 'ERROR') NOT NULL DEFAULT 'ACTIVE',
    `lastActivityAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `expiresAt` DATETIME(3) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `ussd_sessions_sessionId_key`(`sessionId`),
    INDEX `ussd_sessions_sessionId_idx`(`sessionId`),
    INDEX `ussd_sessions_phoneNumber_idx`(`phoneNumber`),
    INDEX `ussd_sessions_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ussd_logs` (
    `id` VARCHAR(191) NOT NULL,
    `sessionId` VARCHAR(191) NOT NULL,
    `phoneNumber` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NULL,
    `request` VARCHAR(191) NOT NULL,
    `response` VARCHAR(191) NOT NULL,
    `menu` VARCHAR(191) NOT NULL,
    `duration` INTEGER NOT NULL,
    `isError` BOOLEAN NOT NULL DEFAULT false,
    `errorMessage` VARCHAR(191) NULL,
    `metadata` JSON NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `ussd_logs_sessionId_idx`(`sessionId`),
    INDEX `ussd_logs_phoneNumber_idx`(`phoneNumber`),
    INDEX `ussd_logs_createdAt_idx`(`createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ussd_menus` (
    `id` VARCHAR(191) NOT NULL,
    `menuId` VARCHAR(191) NOT NULL,
    `parentMenuId` VARCHAR(191) NULL,
    `name` VARCHAR(191) NOT NULL,
    `description` VARCHAR(191) NULL,
    `messageTemplate` VARCHAR(191) NOT NULL,
    `options` JSON NOT NULL,
    `action` VARCHAR(191) NULL,
    `requiresAuth` BOOLEAN NOT NULL DEFAULT false,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `order` INTEGER NOT NULL DEFAULT 0,
    `language` ENUM('EN', 'PIDGIN', 'HAUSA', 'YORUBA', 'IGBO') NOT NULL DEFAULT 'EN',
    `metadata` JSON NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `ussd_menus_menuId_key`(`menuId`),
    INDEX `ussd_menus_parentMenuId_idx`(`parentMenuId`),
    INDEX `ussd_menus_menuId_idx`(`menuId`),
    INDEX `ussd_menus_language_idx`(`language`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `wallet_transfers` (
    `id` VARCHAR(191) NOT NULL,
    `senderId` VARCHAR(191) NOT NULL,
    `receiverId` VARCHAR(191) NOT NULL,
    `amount` DECIMAL(65, 30) NOT NULL,
    `fee` DECIMAL(65, 30) NOT NULL DEFAULT 0,
    `totalDebited` DECIMAL(65, 30) NOT NULL,
    `reference` VARCHAR(191) NOT NULL,
    `description` VARCHAR(191) NULL,
    `status` ENUM('PENDING', 'PROCESSING', 'SUCCESS', 'FAILED') NOT NULL DEFAULT 'PENDING',
    `channel` ENUM('WHATSAPP', 'MOBILE_APP', 'USSD', 'SMS', 'TELEGRAM', 'MESSENGER', 'API') NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `completedAt` DATETIME(3) NULL,

    UNIQUE INDEX `wallet_transfers_reference_key`(`reference`),
    INDEX `wallet_transfers_senderId_idx`(`senderId`),
    INDEX `wallet_transfers_receiverId_idx`(`receiverId`),
    INDEX `wallet_transfers_reference_idx`(`reference`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `vtu_transactions` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `transactionType` ENUM('AIRTIME', 'DATA', 'ELECTRICITY_INSTANT', 'ELECTRICITY_PREORDER', 'CABLE_TV', 'EDUCATION', 'INSURANCE') NOT NULL,
    `vendor` ENUM('VTPASS', 'QUICKTELLER', 'MONIEPOINT', 'FLUTTERWAVE_VTU') NULL,
    `product` VARCHAR(191) NOT NULL,
    `amount` DECIMAL(65, 30) NOT NULL,
    `serviceFee` DECIMAL(65, 30) NOT NULL DEFAULT 0,
    `totalDebited` DECIMAL(65, 30) NOT NULL,
    `meterNumber` VARCHAR(191) NULL,
    `meterType` ENUM('HOME', 'OFFICE', 'FARM') NULL,
    `meterName` VARCHAR(191) NULL,
    `phoneNumber` VARCHAR(191) NULL,
    `network` ENUM('MTN', 'GLO', 'AIRTEL', 'NINEMOBILE') NULL,
    `networkPlan` VARCHAR(191) NULL,
    `token` VARCHAR(191) NULL,
    `tokenValidUntil` DATETIME(3) NULL,
    `vendorReference` VARCHAR(191) NULL,
    `status` ENUM('PENDING', 'PROCESSING', 'SUCCESS', 'FAILED') NOT NULL DEFAULT 'PENDING',
    `retryCount` INTEGER NOT NULL DEFAULT 0,
    `maxRetries` INTEGER NOT NULL DEFAULT 3,
    `scheduledFor` DATETIME(3) NULL,
    `deliveredAt` DATETIME(3) NULL,
    `isBulkPurchase` BOOLEAN NOT NULL DEFAULT false,
    `bulkQuantity` INTEGER NULL,
    `channel` ENUM('WHATSAPP', 'MOBILE_APP', 'USSD', 'SMS', 'TELEGRAM', 'MESSENGER', 'API') NULL,
    `apiKeyId` VARCHAR(191) NULL,
    `qrPaymentId` VARCHAR(191) NULL,
    `metadata` JSON NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `subscriptionId` VARCHAR(191) NULL,
    `vendorId` VARCHAR(191) NULL,

    UNIQUE INDEX `vtu_transactions_qrPaymentId_key`(`qrPaymentId`),
    INDEX `vtu_transactions_userId_idx`(`userId`),
    INDEX `vtu_transactions_status_idx`(`status`),
    INDEX `vtu_transactions_createdAt_idx`(`createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `pre_orders` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `disCo` ENUM('IKEJA', 'EKO', 'ABUJA', 'KANO', 'PHCN', 'IBADAN', 'BENIN', 'ENUGU', 'JOS', 'PORT_HARCOURT') NOT NULL,
    `meterNumber` VARCHAR(191) NOT NULL,
    `meterType` ENUM('HOME', 'OFFICE', 'FARM') NOT NULL DEFAULT 'HOME',
    `meterName` VARCHAR(191) NULL,
    `amount` DECIMAL(65, 30) NOT NULL,
    `serviceFee` DECIMAL(65, 30) NOT NULL DEFAULT 0,
    `totalDebited` DECIMAL(65, 30) NOT NULL,
    `deliveryDate` DATETIME(3) NOT NULL,
    `status` ENUM('PENDING', 'PROCESSING', 'PURCHASED', 'DELIVERED', 'FAILED', 'CANCELLED') NOT NULL DEFAULT 'PENDING',
    `transactionId` VARCHAR(191) NULL,
    `tokenVaultId` VARCHAR(191) NULL,
    `isCancelled` BOOLEAN NOT NULL DEFAULT false,
    `cancelledAt` DATETIME(3) NULL,
    `cancellationReason` VARCHAR(191) NULL,
    `channel` ENUM('WHATSAPP', 'MOBILE_APP', 'USSD', 'SMS', 'TELEGRAM', 'MESSENGER', 'API') NULL,
    `apiKeyId` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `pre_orders_transactionId_key`(`transactionId`),
    INDEX `pre_orders_userId_idx`(`userId`),
    INDEX `pre_orders_status_idx`(`status`),
    INDEX `pre_orders_deliveryDate_idx`(`deliveryDate`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `subscriptions` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `type` ENUM('ELECTRICITY', 'CABLE_TV') NOT NULL DEFAULT 'ELECTRICITY',
    `disCo` ENUM('IKEJA', 'EKO', 'ABUJA', 'KANO', 'PHCN', 'IBADAN', 'BENIN', 'ENUGU', 'JOS', 'PORT_HARCOURT') NULL,
    `meterNumber` VARCHAR(191) NULL,
    `meterType` ENUM('HOME', 'OFFICE', 'FARM') NOT NULL DEFAULT 'HOME',
    `meterName` VARCHAR(191) NULL,
    `decoderNumber` VARCHAR(191) NULL,
    `decoderType` VARCHAR(191) NULL,
    `packageName` VARCHAR(191) NULL,
    `amount` DECIMAL(65, 30) NOT NULL,
    `serviceFee` DECIMAL(65, 30) NOT NULL DEFAULT 0,
    `renewalDay` INTEGER NOT NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `isPaused` BOOLEAN NOT NULL DEFAULT false,
    `pausedAt` DATETIME(3) NULL,
    `nextRenewalDate` DATETIME(3) NOT NULL,
    `lastRenewalDate` DATETIME(3) NULL,
    `channel` ENUM('WHATSAPP', 'MOBILE_APP', 'USSD', 'SMS', 'TELEGRAM', 'MESSENGER', 'API') NULL,
    `apiKeyId` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `subscriptions_userId_idx`(`userId`),
    INDEX `subscriptions_nextRenewalDate_idx`(`nextRenewalDate`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `token_vault` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `transactionId` VARCHAR(191) NOT NULL,
    `token` VARCHAR(191) NOT NULL,
    `tokenType` ENUM('ELECTRICITY') NOT NULL DEFAULT 'ELECTRICITY',
    `meterNumber` VARCHAR(191) NOT NULL,
    `disCo` ENUM('IKEJA', 'EKO', 'ABUJA', 'KANO', 'PHCN', 'IBADAN', 'BENIN', 'ENUGU', 'JOS', 'PORT_HARCOURT') NOT NULL,
    `amount` DECIMAL(65, 30) NOT NULL,
    `validFrom` DATETIME(3) NOT NULL,
    `validUntil` DATETIME(3) NOT NULL,
    `status` ENUM('STORED', 'DELIVERED', 'EXPIRED', 'REFUNDED', 'INVALIDATED') NOT NULL DEFAULT 'STORED',
    `scheduledFor` DATETIME(3) NOT NULL,
    `deliveredAt` DATETIME(3) NULL,
    `deliveryChannel` ENUM('WHATSAPP', 'MOBILE_PUSH', 'USSD', 'SMS', 'EMAIL', 'WEBHOOK') NULL,
    `isRefunded` BOOLEAN NOT NULL DEFAULT false,
    `refundedAt` DATETIME(3) NULL,
    `metadata` JSON NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `token_vault_transactionId_key`(`transactionId`),
    INDEX `token_vault_userId_idx`(`userId`),
    INDEX `token_vault_scheduledFor_idx`(`scheduledFor`),
    INDEX `token_vault_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `loan_products` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `type` ENUM('STARTER', 'STANDARD', 'PREMIUM', 'EMERGENCY') NOT NULL DEFAULT 'STARTER',
    `minAmount` DECIMAL(65, 30) NOT NULL,
    `maxAmount` DECIMAL(65, 30) NOT NULL,
    `defaultAmount` DECIMAL(65, 30) NOT NULL,
    `repaymentRate` DECIMAL(65, 30) NOT NULL,
    `durationDays` INTEGER NOT NULL,
    `interestRate` DECIMAL(65, 30) NOT NULL DEFAULT 0,
    `requiresKYC` BOOLEAN NOT NULL DEFAULT true,
    `minTransactions` INTEGER NULL,
    `minWalletAge` INTEGER NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `eligibilityRules` JSON NULL,
    `metadata` JSON NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `retailer_loans` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `productId` VARCHAR(191) NOT NULL,
    `amount` DECIMAL(65, 30) NOT NULL,
    `amountPaid` DECIMAL(65, 30) NOT NULL DEFAULT 0,
    `amountRemaining` DECIMAL(65, 30) NOT NULL,
    `repaymentRate` DECIMAL(65, 30) NOT NULL,
    `durationDays` INTEGER NOT NULL,
    `interestRate` DECIMAL(65, 30) NOT NULL,
    `interestAccrued` DECIMAL(65, 30) NOT NULL DEFAULT 0,
    `totalDue` DECIMAL(65, 30) NOT NULL,
    `status` ENUM('PENDING', 'APPROVED', 'DISBURSED', 'ACTIVE', 'COMPLETED', 'DEFAULTED', 'CANCELLED', 'RESTRUCTURED') NOT NULL DEFAULT 'PENDING',
    `appliedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `appliedChannel` ENUM('WHATSAPP', 'MOBILE_APP', 'USSD', 'SMS', 'TELEGRAM', 'MESSENGER', 'API') NULL,
    `approvedAt` DATETIME(3) NULL,
    `approvedBy` VARCHAR(191) NULL,
    `disbursedAt` DATETIME(3) NULL,
    `disbursedChannel` ENUM('WHATSAPP', 'MOBILE_APP', 'USSD', 'SMS', 'TELEGRAM', 'MESSENGER', 'API') NULL,
    `dueDate` DATETIME(3) NULL,
    `completedAt` DATETIME(3) NULL,
    `lastRepaymentAt` DATETIME(3) NULL,
    `daysOverdue` INTEGER NOT NULL DEFAULT 0,
    `delinquencyStage` VARCHAR(191) NULL,
    `freezeWallet` BOOLEAN NOT NULL DEFAULT false,
    `freezeReason` VARCHAR(191) NULL,
    `walletTransactionId` VARCHAR(191) NULL,
    `metadata` JSON NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `retailer_loans_walletTransactionId_key`(`walletTransactionId`),
    INDEX `retailer_loans_userId_idx`(`userId`),
    INDEX `retailer_loans_status_idx`(`status`),
    INDEX `retailer_loans_dueDate_idx`(`dueDate`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `repayments` (
    `id` VARCHAR(191) NOT NULL,
    `loanId` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `amount` DECIMAL(65, 30) NOT NULL,
    `type` ENUM('AUTO', 'MANUAL', 'LUMP_SUM', 'ADMIN_ADJUSTMENT', 'REFUND') NOT NULL DEFAULT 'AUTO',
    `sourceSale` VARCHAR(191) NULL,
    `sourceSaleAmount` DECIMAL(65, 30) NULL,
    `walletTransactionId` VARCHAR(191) NULL,
    `channel` ENUM('WHATSAPP', 'MOBILE_APP', 'USSD', 'SMS', 'TELEGRAM', 'MESSENGER', 'API') NULL,
    `notes` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `repayments_walletTransactionId_key`(`walletTransactionId`),
    INDEX `repayments_loanId_idx`(`loanId`),
    INDEX `repayments_userId_idx`(`userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `loan_adjustments` (
    `id` VARCHAR(191) NOT NULL,
    `loanId` VARCHAR(191) NOT NULL,
    `adminId` VARCHAR(191) NOT NULL,
    `type` ENUM('EXTENSION', 'REDUCTION', 'INCREASE', 'PAUSE', 'RESUME', 'WRITE_OFF', 'FREEZE_WALLET', 'UNFREEZE_WALLET') NOT NULL,
    `amount` DECIMAL(65, 30) NOT NULL,
    `previousValue` VARCHAR(191) NULL,
    `newValue` VARCHAR(191) NULL,
    `reason` VARCHAR(191) NOT NULL,
    `notes` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `loan_adjustments_loanId_idx`(`loanId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `loan_notifications` (
    `id` VARCHAR(191) NOT NULL,
    `loanId` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `type` ENUM('DISBURSEMENT', 'REMINDER_7_DAYS', 'REMINDER_14_DAYS', 'REMINDER_21_DAYS', 'REMINDER_30_DAYS', 'OVERDUE_ALERT', 'FINAL_WARNING', 'COMPLETION', 'WALLET_FROZEN', 'WALLET_UNFROZEN') NOT NULL,
    `sentAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `deliveryChannel` ENUM('WHATSAPP', 'MOBILE_PUSH', 'USSD', 'SMS', 'EMAIL', 'WEBHOOK') NOT NULL,
    `delivered` BOOLEAN NOT NULL DEFAULT false,
    `deliveredAt` DATETIME(3) NULL,
    `metadata` JSON NULL,

    INDEX `loan_notifications_loanId_idx`(`loanId`),
    INDEX `loan_notifications_userId_idx`(`userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `vendors` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `code` VARCHAR(191) NOT NULL,
    `type` ENUM('VTPASS', 'QUICKTELLER', 'MONIEPOINT', 'FLUTTERWAVE_VTU') NOT NULL,
    `apiBaseUrl` VARCHAR(191) NOT NULL,
    `apiKey` VARCHAR(191) NOT NULL,
    `apiSecret` VARCHAR(191) NULL,
    `status` ENUM('ACTIVE', 'INACTIVE', 'DEGRADED', 'DOWN') NOT NULL DEFAULT 'ACTIVE',
    `priority` INTEGER NOT NULL DEFAULT 1,
    `successRate` DECIMAL(65, 30) NOT NULL DEFAULT 0,
    `avgResponseTime` INTEGER NOT NULL DEFAULT 0,
    `lastCheckAt` DATETIME(3) NULL DEFAULT CURRENT_TIMESTAMP(3),
    `lastSuccessAt` DATETIME(3) NULL,
    `lastFailureAt` DATETIME(3) NULL,
    `failureCount` INTEGER NOT NULL DEFAULT 0,
    `consecutiveFailures` INTEGER NOT NULL DEFAULT 0,
    `supportedServices` JSON NOT NULL,
    `metadata` JSON NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `vendors_name_key`(`name`),
    UNIQUE INDEX `vendors_code_key`(`code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `vendor_health_checks` (
    `id` VARCHAR(191) NOT NULL,
    `vendorId` VARCHAR(191) NOT NULL,
    `status` ENUM('ACTIVE', 'INACTIVE', 'DEGRADED', 'DOWN') NOT NULL,
    `responseTime` INTEGER NOT NULL,
    `isSuccess` BOOLEAN NOT NULL,
    `errorMessage` VARCHAR(191) NULL,
    `checkedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `vendor_health_checks_vendorId_idx`(`vendorId`),
    INDEX `vendor_health_checks_checkedAt_idx`(`checkedAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `jobs` (
    `id` VARCHAR(191) NOT NULL,
    `type` ENUM('VTU_TRANSACTION', 'WHATSAPP_MESSAGE', 'USSD_SESSION', 'SUBSCRIPTION_PROCESSING', 'PRE_ORDER_PROCESSING', 'LOAN_PROCESSING', 'NOTIFICATION', 'SCHEDULED_JOB', 'TARIFF_CHECK', 'VENDOR_HEALTH_CHECK', 'TOKEN_EXPIRY_CHECK', 'LOAN_REMINDER', 'LOAN_DELINQUENCY_CHECK', 'USSD_CLEANUP', 'API_REQUEST', 'WEBHOOK_DELIVERY', 'BULK_OPERATION', 'QR_PAYMENT', 'OTP_DELIVERY') NOT NULL,
    `status` ENUM('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'RETRY', 'DLQ') NOT NULL DEFAULT 'PENDING',
    `payload` JSON NOT NULL,
    `idempotencyKey` VARCHAR(191) NULL,
    `priority` INTEGER NOT NULL DEFAULT 0,
    `attempts` INTEGER NOT NULL DEFAULT 0,
    `maxAttempts` INTEGER NOT NULL DEFAULT 3,
    `errorMessage` VARCHAR(191) NULL,
    `stackTrace` VARCHAR(191) NULL,
    `scheduledFor` DATETIME(3) NULL,
    `startedAt` DATETIME(3) NULL,
    `completedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `jobs_idempotencyKey_key`(`idempotencyKey`),
    INDEX `jobs_status_idx`(`status`),
    INDEX `jobs_type_idx`(`type`),
    INDEX `jobs_scheduledFor_idx`(`scheduledFor`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `job_logs` (
    `id` VARCHAR(191) NOT NULL,
    `jobId` VARCHAR(191) NOT NULL,
    `attemptNumber` INTEGER NOT NULL,
    `status` ENUM('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'RETRY', 'DLQ') NOT NULL,
    `message` VARCHAR(191) NULL,
    `errorMessage` VARCHAR(191) NULL,
    `metadata` JSON NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `job_logs_jobId_idx`(`jobId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `user_notifications` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `type` VARCHAR(191) NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `body` VARCHAR(191) NOT NULL,
    `data` JSON NULL,
    `priority` VARCHAR(191) NOT NULL DEFAULT 'NORMAL',
    `status` VARCHAR(191) NOT NULL DEFAULT 'PENDING',
    `channel` ENUM('WHATSAPP', 'MOBILE_PUSH', 'USSD', 'SMS', 'EMAIL', 'WEBHOOK') NOT NULL,
    `readAt` DATETIME(3) NULL,
    `sentAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `user_notifications_userId_idx`(`userId`),
    INDEX `user_notifications_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `disco_info` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `code` ENUM('IKEJA', 'EKO', 'ABUJA', 'KANO', 'PHCN', 'IBADAN', 'BENIN', 'ENUGU', 'JOS', 'PORT_HARCOURT') NOT NULL,
    `apiBaseUrl` VARCHAR(191) NOT NULL,
    `apiKey` VARCHAR(191) NULL,
    `status` ENUM('ACTIVE', 'INACTIVE', 'DEGRADED', 'DOWN') NOT NULL DEFAULT 'ACTIVE',
    `currentTariff` JSON NULL,
    `tariffLastUpdated` DATETIME(3) NULL,
    `supportsKCT` BOOLEAN NOT NULL DEFAULT false,
    `metadata` JSON NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `disco_info_name_key`(`name`),
    UNIQUE INDEX `disco_info_code_key`(`code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `tariff_history` (
    `id` VARCHAR(191) NOT NULL,
    `disCoId` VARCHAR(191) NOT NULL,
    `tariffData` JSON NOT NULL,
    `effectiveFrom` DATETIME(3) NOT NULL,
    `effectiveTo` DATETIME(3) NULL,
    `isCurrent` BOOLEAN NOT NULL DEFAULT false,
    `detectedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `tariff_history_disCoId_idx`(`disCoId`),
    INDEX `tariff_history_isCurrent_idx`(`isCurrent`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `system_config` (
    `id` VARCHAR(191) NOT NULL,
    `key` VARCHAR(191) NOT NULL,
    `value` JSON NOT NULL,
    `description` VARCHAR(191) NULL,
    `isEditable` BOOLEAN NOT NULL DEFAULT true,
    `updatedBy` VARCHAR(191) NULL,
    `updatedAt` DATETIME(3) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `system_config_key_key`(`key`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `audit_logs` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NULL,
    `action` VARCHAR(191) NOT NULL,
    `entityType` VARCHAR(191) NOT NULL,
    `entityId` VARCHAR(191) NOT NULL,
    `oldValues` JSON NULL,
    `newValues` JSON NULL,
    `ipAddress` VARCHAR(191) NULL,
    `userAgent` VARCHAR(191) NULL,
    `channel` ENUM('WHATSAPP', 'MOBILE_APP', 'USSD', 'SMS', 'TELEGRAM', 'MESSENGER', 'API') NULL,
    `metadata` JSON NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `audit_logs_userId_idx`(`userId`),
    INDEX `audit_logs_entityType_idx`(`entityType`),
    INDEX `audit_logs_entityId_idx`(`entityId`),
    INDEX `audit_logs_createdAt_idx`(`createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `daily_metrics` (
    `id` VARCHAR(191) NOT NULL,
    `date` DATETIME(3) NOT NULL,
    `totalUsers` INTEGER NOT NULL DEFAULT 0,
    `newUsers` INTEGER NOT NULL DEFAULT 0,
    `activeUsers` INTEGER NOT NULL DEFAULT 0,
    `totalTransactions` INTEGER NOT NULL DEFAULT 0,
    `totalVolume` DECIMAL(65, 30) NOT NULL DEFAULT 0,
    `totalRevenue` DECIMAL(65, 30) NOT NULL DEFAULT 0,
    `successfulTransactions` INTEGER NOT NULL DEFAULT 0,
    `failedTransactions` INTEGER NOT NULL DEFAULT 0,
    `totalLoansDisbursed` DECIMAL(65, 30) NOT NULL DEFAULT 0,
    `totalLoansRepaid` DECIMAL(65, 30) NOT NULL DEFAULT 0,
    `activeLoans` INTEGER NOT NULL DEFAULT 0,
    `overdueLoans` INTEGER NOT NULL DEFAULT 0,
    `defaultedLoans` INTEGER NOT NULL DEFAULT 0,
    `ussdSessions` INTEGER NOT NULL DEFAULT 0,
    `whatsappMessages` INTEGER NOT NULL DEFAULT 0,
    `mobileAppUsers` INTEGER NOT NULL DEFAULT 0,
    `apiRequests` INTEGER NOT NULL DEFAULT 0,
    `webhookDeliveries` INTEGER NOT NULL DEFAULT 0,
    `qrScans` INTEGER NOT NULL DEFAULT 0,
    `qrPayments` INTEGER NOT NULL DEFAULT 0,
    `qrRevenue` DECIMAL(65, 30) NOT NULL DEFAULT 0,
    `metadata` JSON NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `daily_metrics_date_key`(`date`),
    INDEX `daily_metrics_date_idx`(`date`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `referrals` (
    `id` VARCHAR(191) NOT NULL,
    `referrerId` VARCHAR(191) NOT NULL,
    `refereeId` VARCHAR(191) NOT NULL,
    `referralCode` VARCHAR(191) NOT NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'PENDING',
    `rewardAmount` DECIMAL(65, 30) NOT NULL DEFAULT 0,
    `rewardPaid` BOOLEAN NOT NULL DEFAULT false,
    `rewardPaidAt` DATETIME(3) NULL,
    `channel` ENUM('WHATSAPP', 'MOBILE_APP', 'USSD', 'SMS', 'TELEGRAM', 'MESSENGER', 'API') NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `referrals_refereeId_key`(`refereeId`),
    UNIQUE INDEX `referrals_referralCode_key`(`referralCode`),
    INDEX `referrals_referrerId_idx`(`referrerId`),
    INDEX `referrals_referralCode_idx`(`referralCode`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `support_tickets` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `subject` VARCHAR(191) NOT NULL,
    `message` VARCHAR(191) NOT NULL,
    `category` VARCHAR(191) NOT NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'OPEN',
    `priority` VARCHAR(191) NOT NULL DEFAULT 'NORMAL',
    `assignedTo` VARCHAR(191) NULL,
    `channel` ENUM('WHATSAPP', 'MOBILE_APP', 'USSD', 'SMS', 'TELEGRAM', 'MESSENGER', 'API') NULL,
    `resolvedAt` DATETIME(3) NULL,
    `closedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `support_tickets_userId_idx`(`userId`),
    INDEX `support_tickets_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `support_replies` (
    `id` VARCHAR(191) NOT NULL,
    `ticketId` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `message` VARCHAR(191) NOT NULL,
    `isInternal` BOOLEAN NOT NULL DEFAULT false,
    `channel` ENUM('WHATSAPP', 'MOBILE_APP', 'USSD', 'SMS', 'TELEGRAM', 'MESSENGER', 'API') NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `support_replies_ticketId_idx`(`ticketId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `bulk_operations` (
    `id` VARCHAR(191) NOT NULL,
    `type` VARCHAR(191) NOT NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'PENDING',
    `totalItems` INTEGER NOT NULL DEFAULT 0,
    `processedItems` INTEGER NOT NULL DEFAULT 0,
    `successfulItems` INTEGER NOT NULL DEFAULT 0,
    `failedItems` INTEGER NOT NULL DEFAULT 0,
    `items` JSON NOT NULL,
    `errors` JSON NULL,
    `initiatedBy` VARCHAR(191) NOT NULL,
    `channel` ENUM('WHATSAPP', 'MOBILE_APP', 'USSD', 'SMS', 'TELEGRAM', 'MESSENGER', 'API') NULL,
    `apiKeyId` VARCHAR(191) NULL,
    `completedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `bulk_operations_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `sms_logs` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `phoneNumber` VARCHAR(191) NOT NULL,
    `message` VARCHAR(191) NOT NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'PENDING',
    `provider` VARCHAR(191) NULL,
    `providerReference` VARCHAR(191) NULL,
    `sentAt` DATETIME(3) NULL,
    `deliveredAt` DATETIME(3) NULL,
    `errorMessage` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `sms_logs_userId_idx`(`userId`),
    INDEX `sms_logs_phoneNumber_idx`(`phoneNumber`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `email_logs` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `to` VARCHAR(191) NOT NULL,
    `subject` VARCHAR(191) NOT NULL,
    `body` VARCHAR(191) NOT NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'PENDING',
    `provider` VARCHAR(191) NULL,
    `providerReference` VARCHAR(191) NULL,
    `sentAt` DATETIME(3) NULL,
    `deliveredAt` DATETIME(3) NULL,
    `errorMessage` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `email_logs_userId_idx`(`userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `api_keys` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `key` VARCHAR(191) NOT NULL,
    `hashedKey` VARCHAR(191) NOT NULL,
    `permissions` JSON NOT NULL,
    `expiresAt` DATETIME(3) NULL,
    `lastUsedAt` DATETIME(3) NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `api_keys_key_key`(`key`),
    INDEX `api_keys_userId_idx`(`userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `system_health` (
    `id` VARCHAR(191) NOT NULL,
    `service` VARCHAR(191) NOT NULL,
    `status` VARCHAR(191) NOT NULL,
    `responseTime` INTEGER NOT NULL,
    `errorRate` DECIMAL(65, 30) NOT NULL DEFAULT 0,
    `uptimePercentage` DECIMAL(65, 30) NOT NULL DEFAULT 100,
    `lastIncidentAt` DATETIME(3) NULL,
    `metadata` JSON NULL,
    `checkedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `system_health_service_idx`(`service`),
    INDEX `system_health_checkedAt_idx`(`checkedAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `product_catalog` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `type` ENUM('AIRTIME', 'DATA', 'ELECTRICITY_INSTANT', 'ELECTRICITY_PREORDER', 'CABLE_TV', 'EDUCATION', 'INSURANCE') NOT NULL,
    `category` VARCHAR(191) NOT NULL,
    `provider` VARCHAR(191) NULL,
    `planName` VARCHAR(191) NULL,
    `price` DECIMAL(65, 30) NOT NULL,
    `serviceFee` DECIMAL(65, 30) NOT NULL DEFAULT 0,
    `vendorPrice` DECIMAL(65, 30) NULL,
    `vendorId` VARCHAR(191) NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `metadata` JSON NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `product_catalog_type_idx`(`type`),
    INDEX `product_catalog_isActive_idx`(`isActive`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ussd_shortcodes` (
    `id` VARCHAR(191) NOT NULL,
    `shortcode` VARCHAR(191) NOT NULL,
    `provider` VARCHAR(191) NOT NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `defaultMenuId` VARCHAR(191) NOT NULL,
    `metadata` JSON NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `ussd_shortcodes_shortcode_key`(`shortcode`),
    INDEX `ussd_shortcodes_shortcode_idx`(`shortcode`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `translations` (
    `id` VARCHAR(191) NOT NULL,
    `key` VARCHAR(191) NOT NULL,
    `language` ENUM('EN', 'PIDGIN', 'HAUSA', 'YORUBA', 'IGBO') NOT NULL,
    `value` VARCHAR(191) NOT NULL,
    `module` VARCHAR(191) NOT NULL,
    `context` VARCHAR(191) NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `translations_key_idx`(`key`),
    INDEX `translations_language_idx`(`language`),
    UNIQUE INDEX `translations_key_language_module_key`(`key`, `language`, `module`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `developers` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `companyName` VARCHAR(191) NOT NULL,
    `phone` VARCHAR(191) NULL,
    `accountType` ENUM('BASIC', 'PRO', 'ENTERPRISE') NOT NULL DEFAULT 'BASIC',
    `status` ENUM('PENDING', 'ACTIVE', 'SUSPENDED', 'TERMINATED') NOT NULL DEFAULT 'PENDING',
    `monthlyVolume` DECIMAL(65, 30) NOT NULL DEFAULT 0,
    `customPricing` JSON NULL,
    `walletBalance` DECIMAL(65, 30) NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `developers_userId_key`(`userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `developer_api_keys` (
    `id` VARCHAR(191) NOT NULL,
    `developerId` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `key` VARCHAR(191) NOT NULL,
    `keyPrefix` VARCHAR(191) NOT NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `isSandbox` BOOLEAN NOT NULL DEFAULT false,
    `ipWhitelist` JSON NOT NULL,
    `rateLimitPerMin` INTEGER NOT NULL DEFAULT 50,
    `rateLimitPerHour` INTEGER NOT NULL DEFAULT 1000,
    `lastUsedAt` DATETIME(3) NULL,
    `expiresAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `developer_api_keys_key_key`(`key`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `webhook_subscriptions` (
    `id` VARCHAR(191) NOT NULL,
    `developerId` VARCHAR(191) NOT NULL,
    `url` VARCHAR(191) NOT NULL,
    `secret` VARCHAR(191) NOT NULL,
    `events` JSON NOT NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `retryCount` INTEGER NOT NULL DEFAULT 3,
    `lastTriggeredAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `webhook_deliveries` (
    `id` VARCHAR(191) NOT NULL,
    `subscriptionId` VARCHAR(191) NOT NULL,
    `event` ENUM('TRANSACTION_COMPLETED', 'TRANSACTION_FAILED', 'PREORDER_DELIVERED', 'PREORDER_FAILED', 'SUBSCRIPTION_RENEWED', 'SUBSCRIPTION_FAILED', 'LOAN_DISBURSED', 'LOAN_COMPLETED', 'LOAN_DEFAULTED', 'WALLET_CREDITED', 'WALLET_DEBITED') NOT NULL,
    `payload` JSON NOT NULL,
    `responseStatus` INTEGER NULL,
    `responseBody` VARCHAR(191) NULL,
    `attempt` INTEGER NOT NULL DEFAULT 0,
    `maxAttempts` INTEGER NOT NULL DEFAULT 3,
    `success` BOOLEAN NOT NULL DEFAULT false,
    `deliveredAt` DATETIME(3) NULL,
    `nextRetryAt` DATETIME(3) NULL,
    `errorMessage` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `apiKeyId` VARCHAR(191) NULL,

    INDEX `webhook_deliveries_subscriptionId_idx`(`subscriptionId`),
    INDEX `webhook_deliveries_success_idx`(`success`),
    INDEX `webhook_deliveries_createdAt_idx`(`createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `api_logs` (
    `id` VARCHAR(191) NOT NULL,
    `developerId` VARCHAR(191) NULL,
    `apiKeyId` VARCHAR(191) NULL,
    `endpoint` VARCHAR(191) NOT NULL,
    `method` VARCHAR(191) NOT NULL,
    `statusCode` INTEGER NOT NULL,
    `requestPayload` JSON NULL,
    `responsePayload` JSON NULL,
    `ipAddress` VARCHAR(191) NOT NULL,
    `userAgent` VARCHAR(191) NULL,
    `responseTime` INTEGER NOT NULL,
    `isError` BOOLEAN NOT NULL DEFAULT false,
    `errorMessage` VARCHAR(191) NULL,
    `errorCode` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `api_logs_createdAt_idx`(`createdAt`),
    INDEX `api_logs_developerId_idx`(`developerId`),
    INDEX `api_logs_apiKeyId_idx`(`apiKeyId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `developer_webhook_logs` (
    `id` VARCHAR(191) NOT NULL,
    `developerId` VARCHAR(191) NOT NULL,
    `webhookId` VARCHAR(191) NULL,
    `event` ENUM('TRANSACTION_COMPLETED', 'TRANSACTION_FAILED', 'PREORDER_DELIVERED', 'PREORDER_FAILED', 'SUBSCRIPTION_RENEWED', 'SUBSCRIPTION_FAILED', 'LOAN_DISBURSED', 'LOAN_COMPLETED', 'LOAN_DEFAULTED', 'WALLET_CREDITED', 'WALLET_DEBITED') NOT NULL,
    `payload` JSON NOT NULL,
    `responseStatus` INTEGER NULL,
    `responseBody` VARCHAR(191) NULL,
    `attempt` INTEGER NOT NULL DEFAULT 0,
    `success` BOOLEAN NOT NULL DEFAULT false,
    `errorMessage` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `developer_webhook_logs_developerId_idx`(`developerId`),
    INDEX `developer_webhook_logs_success_idx`(`success`),
    INDEX `developer_webhook_logs_createdAt_idx`(`createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `developer_usage_metrics` (
    `id` VARCHAR(191) NOT NULL,
    `developerId` VARCHAR(191) NOT NULL,
    `date` DATETIME(3) NOT NULL,
    `totalRequests` INTEGER NOT NULL DEFAULT 0,
    `successfulRequests` INTEGER NOT NULL DEFAULT 0,
    `failedRequests` INTEGER NOT NULL DEFAULT 0,
    `totalRevenue` DECIMAL(65, 30) NOT NULL DEFAULT 0,
    `totalTransactions` INTEGER NOT NULL DEFAULT 0,
    `totalVolume` DECIMAL(65, 30) NOT NULL DEFAULT 0,
    `webhookDeliveries` INTEGER NOT NULL DEFAULT 0,
    `webhookSuccesses` INTEGER NOT NULL DEFAULT 0,
    `avgResponseTime` INTEGER NOT NULL DEFAULT 0,
    `metadata` JSON NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `developer_usage_metrics_developerId_idx`(`developerId`),
    INDEX `developer_usage_metrics_date_idx`(`date`),
    UNIQUE INDEX `developer_usage_metrics_developerId_date_key`(`developerId`, `date`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `developer_billing` (
    `id` VARCHAR(191) NOT NULL,
    `developerId` VARCHAR(191) NOT NULL,
    `periodStart` DATETIME(3) NOT NULL,
    `periodEnd` DATETIME(3) NOT NULL,
    `totalRequests` INTEGER NOT NULL DEFAULT 0,
    `totalTransactions` INTEGER NOT NULL DEFAULT 0,
    `totalVolume` DECIMAL(65, 30) NOT NULL DEFAULT 0,
    `totalFees` DECIMAL(65, 30) NOT NULL DEFAULT 0,
    `totalAmount` DECIMAL(65, 30) NOT NULL DEFAULT 0,
    `status` VARCHAR(191) NOT NULL DEFAULT 'PENDING',
    `invoiceUrl` VARCHAR(191) NULL,
    `paidAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `developer_billing_developerId_idx`(`developerId`),
    INDEX `developer_billing_periodStart_idx`(`periodStart`),
    INDEX `developer_billing_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE UNIQUE INDEX `sessions_token_key` ON `sessions`(`token`);

-- CreateIndex
CREATE INDEX `sessions_token_idx` ON `sessions`(`token`);

-- CreateIndex
CREATE UNIQUE INDEX `users_phone_key` ON `users`(`phone`);

-- CreateIndex
CREATE UNIQUE INDEX `users_referralCode_key` ON `users`(`referralCode`);

-- CreateIndex
CREATE UNIQUE INDEX `wallet_transactions_reference_key` ON `wallet_transactions`(`reference`);

-- CreateIndex
CREATE UNIQUE INDEX `wallet_transactions_vtuTransactionId_key` ON `wallet_transactions`(`vtuTransactionId`);

-- CreateIndex
CREATE INDEX `wallet_transactions_userId_idx` ON `wallet_transactions`(`userId`);

-- CreateIndex
CREATE INDEX `wallet_transactions_reference_idx` ON `wallet_transactions`(`reference`);

-- CreateIndex
CREATE INDEX `wallet_transactions_createdAt_idx` ON `wallet_transactions`(`createdAt`);

-- AddForeignKey
ALTER TABLE `channels` ADD CONSTRAINT `channels_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `qr_codes` ADD CONSTRAINT `qr_codes_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `qr_scan_logs` ADD CONSTRAINT `qr_scan_logs_qrId_fkey` FOREIGN KEY (`qrId`) REFERENCES `qr_codes`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `qr_scan_logs` ADD CONSTRAINT `qr_scan_logs_sessionId_fkey` FOREIGN KEY (`sessionId`) REFERENCES `qr_payment_sessions`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `qr_payment_sessions` ADD CONSTRAINT `qr_payment_sessions_qrId_fkey` FOREIGN KEY (`qrId`) REFERENCES `qr_codes`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `qr_payments` ADD CONSTRAINT `qr_payments_qrId_fkey` FOREIGN KEY (`qrId`) REFERENCES `qr_codes`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `qr_payments` ADD CONSTRAINT `qr_payments_sessionId_fkey` FOREIGN KEY (`sessionId`) REFERENCES `qr_payment_sessions`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `qr_payments` ADD CONSTRAINT `qr_payments_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `qr_payments` ADD CONSTRAINT `qr_payments_walletTransactionId_fkey` FOREIGN KEY (`walletTransactionId`) REFERENCES `wallet_transactions`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `otp_logs` ADD CONSTRAINT `otp_logs_sessionId_fkey` FOREIGN KEY (`sessionId`) REFERENCES `qr_payment_sessions`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ussd_sessions` ADD CONSTRAINT `ussd_sessions_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ussd_logs` ADD CONSTRAINT `ussd_logs_sessionId_fkey` FOREIGN KEY (`sessionId`) REFERENCES `ussd_sessions`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ussd_logs` ADD CONSTRAINT `ussd_logs_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `wallet_transactions` ADD CONSTRAINT `wallet_transactions_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `wallet_transactions` ADD CONSTRAINT `wallet_transactions_vtuTransactionId_fkey` FOREIGN KEY (`vtuTransactionId`) REFERENCES `vtu_transactions`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `wallet_transfers` ADD CONSTRAINT `wallet_transfers_senderId_fkey` FOREIGN KEY (`senderId`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `wallet_transfers` ADD CONSTRAINT `wallet_transfers_receiverId_fkey` FOREIGN KEY (`receiverId`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `vtu_transactions` ADD CONSTRAINT `vtu_transactions_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `vtu_transactions` ADD CONSTRAINT `vtu_transactions_subscriptionId_fkey` FOREIGN KEY (`subscriptionId`) REFERENCES `subscriptions`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `vtu_transactions` ADD CONSTRAINT `vtu_transactions_apiKeyId_fkey` FOREIGN KEY (`apiKeyId`) REFERENCES `developer_api_keys`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `vtu_transactions` ADD CONSTRAINT `vtu_transactions_qrPaymentId_fkey` FOREIGN KEY (`qrPaymentId`) REFERENCES `qr_payments`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `vtu_transactions` ADD CONSTRAINT `vtu_transactions_vendorId_fkey` FOREIGN KEY (`vendorId`) REFERENCES `vendors`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `pre_orders` ADD CONSTRAINT `pre_orders_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `pre_orders` ADD CONSTRAINT `pre_orders_transactionId_fkey` FOREIGN KEY (`transactionId`) REFERENCES `vtu_transactions`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `pre_orders` ADD CONSTRAINT `pre_orders_apiKeyId_fkey` FOREIGN KEY (`apiKeyId`) REFERENCES `developer_api_keys`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `subscriptions` ADD CONSTRAINT `subscriptions_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `subscriptions` ADD CONSTRAINT `subscriptions_apiKeyId_fkey` FOREIGN KEY (`apiKeyId`) REFERENCES `developer_api_keys`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `token_vault` ADD CONSTRAINT `token_vault_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `token_vault` ADD CONSTRAINT `token_vault_transactionId_fkey` FOREIGN KEY (`transactionId`) REFERENCES `vtu_transactions`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `retailer_loans` ADD CONSTRAINT `retailer_loans_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `retailer_loans` ADD CONSTRAINT `retailer_loans_productId_fkey` FOREIGN KEY (`productId`) REFERENCES `loan_products`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `retailer_loans` ADD CONSTRAINT `retailer_loans_walletTransactionId_fkey` FOREIGN KEY (`walletTransactionId`) REFERENCES `wallet_transactions`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `repayments` ADD CONSTRAINT `repayments_loanId_fkey` FOREIGN KEY (`loanId`) REFERENCES `retailer_loans`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `repayments` ADD CONSTRAINT `repayments_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `repayments` ADD CONSTRAINT `repayments_walletTransactionId_fkey` FOREIGN KEY (`walletTransactionId`) REFERENCES `wallet_transactions`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `loan_adjustments` ADD CONSTRAINT `loan_adjustments_loanId_fkey` FOREIGN KEY (`loanId`) REFERENCES `retailer_loans`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `loan_notifications` ADD CONSTRAINT `loan_notifications_loanId_fkey` FOREIGN KEY (`loanId`) REFERENCES `retailer_loans`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `loan_notifications` ADD CONSTRAINT `loan_notifications_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `vendor_health_checks` ADD CONSTRAINT `vendor_health_checks_vendorId_fkey` FOREIGN KEY (`vendorId`) REFERENCES `vendors`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `job_logs` ADD CONSTRAINT `job_logs_jobId_fkey` FOREIGN KEY (`jobId`) REFERENCES `jobs`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `user_notifications` ADD CONSTRAINT `user_notifications_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `tariff_history` ADD CONSTRAINT `tariff_history_disCoId_fkey` FOREIGN KEY (`disCoId`) REFERENCES `disco_info`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `audit_logs` ADD CONSTRAINT `audit_logs_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `referrals` ADD CONSTRAINT `referrals_referrerId_fkey` FOREIGN KEY (`referrerId`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `referrals` ADD CONSTRAINT `referrals_refereeId_fkey` FOREIGN KEY (`refereeId`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `support_tickets` ADD CONSTRAINT `support_tickets_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `support_replies` ADD CONSTRAINT `support_replies_ticketId_fkey` FOREIGN KEY (`ticketId`) REFERENCES `support_tickets`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `bulk_operations` ADD CONSTRAINT `bulk_operations_apiKeyId_fkey` FOREIGN KEY (`apiKeyId`) REFERENCES `developer_api_keys`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `sessions` ADD CONSTRAINT `sessions_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `api_keys` ADD CONSTRAINT `api_keys_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `developers` ADD CONSTRAINT `developers_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `developer_api_keys` ADD CONSTRAINT `developer_api_keys_developerId_fkey` FOREIGN KEY (`developerId`) REFERENCES `developers`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `webhook_subscriptions` ADD CONSTRAINT `webhook_subscriptions_developerId_fkey` FOREIGN KEY (`developerId`) REFERENCES `developers`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `webhook_deliveries` ADD CONSTRAINT `webhook_deliveries_subscriptionId_fkey` FOREIGN KEY (`subscriptionId`) REFERENCES `webhook_subscriptions`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `webhook_deliveries` ADD CONSTRAINT `webhook_deliveries_apiKeyId_fkey` FOREIGN KEY (`apiKeyId`) REFERENCES `developer_api_keys`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `api_logs` ADD CONSTRAINT `api_logs_developerId_fkey` FOREIGN KEY (`developerId`) REFERENCES `developers`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `api_logs` ADD CONSTRAINT `api_logs_apiKeyId_fkey` FOREIGN KEY (`apiKeyId`) REFERENCES `developer_api_keys`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `developer_webhook_logs` ADD CONSTRAINT `developer_webhook_logs_developerId_fkey` FOREIGN KEY (`developerId`) REFERENCES `developers`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `developer_webhook_logs` ADD CONSTRAINT `developer_webhook_logs_webhookId_fkey` FOREIGN KEY (`webhookId`) REFERENCES `webhook_subscriptions`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `developer_usage_metrics` ADD CONSTRAINT `developer_usage_metrics_developerId_fkey` FOREIGN KEY (`developerId`) REFERENCES `developers`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `developer_billing` ADD CONSTRAINT `developer_billing_developerId_fkey` FOREIGN KEY (`developerId`) REFERENCES `developers`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- RenameIndex
ALTER TABLE `sessions` RENAME INDEX `sessions_userId_fkey` TO `sessions_userId_idx`;
