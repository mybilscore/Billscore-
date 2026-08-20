// src/lib/services/plan-import.service.ts

import { prisma } from "~/lib/db";
import { PlanParser, ParsedPlan } from "./plan-parser.service";
import { NetworkProvider, PlanType, ValidityUnit, PlanStatus } from "@prisma/client";

export class PlanImportService {
  private parser = new PlanParser();

  /**
   * Import plans from a list of strings
   */
  async importPlans(
    planStrings: string[],
    vendorCode: string,
    importedBy: string = 'system'
  ) {
    console.log(`📥 [PlanImport] Importing ${planStrings.length} plans for ${vendorCode}`);

    // 1. Get the vendor
    const vendor = await prisma.vendor.findUnique({
      where: { code: vendorCode },
      select: { id: true, code: true },
    });

    if (!vendor) {
      throw new Error(`Vendor ${vendorCode} not found`);
    }

    // 2. Parse all plans
    const parsedPlans = this.parser.parsePlans(planStrings);
    console.log(`📊 [PlanImport] Parsed ${parsedPlans.length} plans successfully`);

    const results = {
      created: 0,
      updated: 0,
      skipped: 0,
      errors: [] as string[],
    };

    const importBatch = `import_${Date.now()}_${vendorCode}`;

    // 3. Get or create network configs
    const networks = await this.ensureNetworks();

    // 4. Import each plan
    for (const parsed of parsedPlans) {
      try {
        const network = parsed.network as NetworkProvider;
        const networkConfig = networks.find(n => n.network === network);

        if (!networkConfig) {
          results.errors.push(`Network ${parsed.network} not found`);
          results.skipped++;
          continue;
        }

        // Parse validity unit
        const validityUnit = this.parseValidityUnit(parsed.validity.unit);
        const planType = this.parsePlanType(parsed.planType);

        // Get vendor network code from mapping or use default
        const vendorNetworkMapping = networkConfig.vendorNetworkMapping as Record<string, any> || {};
     const vendorNetworkCode = String(vendorNetworkMapping[vendorCode] || networkConfig.bilalSadaNetworkCode || 1);

        // Upsert plan
        await prisma.dataPlan.upsert({
          where: {
            vendorId_vendorPlanId: {
              vendorId: vendor.id,
              vendorPlanId: String(parsed.id),
            },
          },
          update: {
            network,
            planType,
            name: parsed.name,
            amountMB: parsed.sizeMB,
            ourPrice: parsed.price,
            vendorPrice: parsed.price,
            validity: parsed.validity.value,
            validityUnit,
            description: parsed.description,
            vendorNetworkCode,
            vendorPlanType: parsed.planType,
            vendorMetadata: parsed.metadata,
            isActive: true,
            status: PlanStatus.ACTIVE,
            importBatch,
            lastSyncedAt: new Date(),
            updatedAt: new Date(),
            updatedBy: importedBy,
          },
          create: {
            network,
            planType,
            name: parsed.name,
            amountMB: parsed.sizeMB,
            ourPrice: parsed.price,
            vendorPrice: parsed.price,
            validity: parsed.validity.value,
            validityUnit,
            description: parsed.description,
            vendorId: vendor.id,
            vendorPlanId: String(parsed.id),
            vendorNetworkCode,
            vendorPlanType: parsed.planType,
            vendorMetadata: parsed.metadata,
            isActive: true,
            status: PlanStatus.ACTIVE,
            importBatch,
            lastSyncedAt: new Date(),
            createdBy: importedBy,
          },
        });

        results.created++;
      } catch (error) {
        results.errors.push(`Error importing plan ${parsed.id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        results.skipped++;
      }
    }

    // 5. Log the import
    await prisma.planImportLog.create({
      data: {
        vendorId: vendor.id,
        vendorCode: vendor.code,
        totalRecords: planStrings.length,
        successfulRecords: results.created,
        failedRecords: results.skipped + results.errors.length,
        errors: results.errors,
        source: 'API',
        importedBy,
        metadata: {
          importBatch,
          parsedCount: parsedPlans.length,
          timestamp: new Date().toISOString(),
        },
      },
    });

    console.log(`✅ [PlanImport] Import complete: ${results.created} created, ${results.updated} updated, ${results.skipped} skipped`);

    return results;
  }

  /**
   * Import plans from CSV data
   */
  async importFromCSV(
    csvData: string,
    vendorCode: string,
    importedBy: string = 'system'
  ) {
    // Parse CSV - assuming format: id,network,planType,name,price,validity
    const lines = csvData.split('\n').filter(line => line.trim());
    const planStrings: string[] = [];

    for (const line of lines) {
      // Skip header
      if (line.toLowerCase().includes('id') && line.toLowerCase().includes('network')) {
        continue;
      }
      
      const parts = line.split(',');
      if (parts.length >= 6) {
        // Reconstruct the plan string format
        const planString = `${parts[0]} ${parts[1]} ${parts[2]} ${parts[3]} ₦${parts[4]} ${parts[5]}`;
        planStrings.push(planString);
      }
    }

    return this.importPlans(planStrings, vendorCode, importedBy);
  }

  /**
   * Ensure all network configs exist
   */
  private async ensureNetworks() {
    const networks = [
      { network: 'MTN' as NetworkProvider, code: 'MTN', displayName: 'MTN', bilalSadaNetworkCode: 1 },
      { network: 'AIRTEL' as NetworkProvider, code: 'AIRTEL', displayName: 'Airtel', bilalSadaNetworkCode: 2 },
      { network: 'GLO' as NetworkProvider, code: 'GLO', displayName: 'Glo', bilalSadaNetworkCode: 3 },
     { network: 'NINEMOBILE' as NetworkProvider, code: 'NINEMOBILE', displayName: '9mobile', bilalSadaNetworkCode: 4 },
    ];

    const results = [];
    for (const net of networks) {
      const result = await prisma.networkConfig.upsert({
        where: { network: net.network },
        update: {
          code: net.code,
          displayName: net.displayName,
          vendorNetworkMapping: {
            BILAL_SADA: net.bilalSadaNetworkCode,
          },
        },
        create: {
          network: net.network,
          code: net.code,
          displayName: net.displayName,
          vendorNetworkMapping: {
            BILAL_SADA: net.bilalSadaNetworkCode,
          },
          isActive: true,
          priority: 1,
        },
      });
      results.push(result);
    }
    return results;
  }

  private parseValidityUnit(unit: string): ValidityUnit {
    const map: Record<string, ValidityUnit> = {
      'hours': ValidityUnit.HOURS,
      'days': ValidityUnit.DAYS,
      'months': ValidityUnit.MONTHS,
      'years': ValidityUnit.YEARS,
      'minutes': ValidityUnit.MINUTES,
    };
    return map[unit.toLowerCase()] || ValidityUnit.DAYS;
  }

  private parsePlanType(type: string): PlanType {
    const map: Record<string, PlanType> = {
      'SME': PlanType.SME,
      'GIFTING': PlanType.GIFTING,
      'COOPERATE_GIFTING': PlanType.COOPERATE_GIFTING,
      'CORPORATE': PlanType.CORPORATE,
      'PREMIUM': PlanType.PREMIUM,
      'STANDARD': PlanType.STANDARD,
      'BASIC': PlanType.BASIC,
    };
    return map[type.toUpperCase()] || PlanType.GIFTING;
  }
}