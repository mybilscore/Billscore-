// src/lib/vendors/vendor.service.ts

import { prisma } from "~/lib/db";
// import { BaseVendor } from './base.vendor';
import { BaseVendor } from "./base.vendor";
import { VendorFactory } from './vendor.factory';
import { 
  VendorConfig, 
  VendorResponse, 
  VtuVendor,
  VendorAirtimeRequest,
  VendorDataRequest,
  VendorElectricityRequest,
  VendorCableTVRequest,
} from './types';
import { VtuType, VendorStatus } from '@prisma/client';

export class VendorService {
  private vendors: Map<VtuVendor, BaseVendor> = new Map();
  private fallbackChain: VtuVendor[] = [];
  private initialized: boolean = false;
  private vendorIdMap: Map<VtuVendor, string> = new Map();

  constructor() {
    console.log("🔧 [VendorService] Creating new instance...");
    this.initializeVendors();
  }

  private async initializeVendors() {
    if (this.initialized) {
      console.log("📋 [VendorService] Vendors already initialized");
      return;
    }
    
    console.log("🔧 [VendorService] Initializing vendors from database...");
    
    try {
      const vendorConfigs = await prisma.vendor.findMany({
        where: { status: VendorStatus.ACTIVE },
        orderBy: { priority: 'asc' },
        include: {
          services: true,
          failoverRules: true,
          circuitBreakers: true,
        },
      });

      console.log(`📊 [VendorService] Found ${vendorConfigs.length} active vendors in database`);

      if (vendorConfigs.length === 0) {
        console.warn("⚠️ [VendorService] No active vendors found in database!");
        console.warn("⚠️ [VendorService] Please seed a vendor using /api/seed/vtpass");
        return;
      }

      for (const vendorConfig of vendorConfigs) {
        console.log(`📋 [VendorService] Processing vendor: ${vendorConfig.code} (${vendorConfig.name})`);
        console.log(`📋 [VendorService]   - Services: ${vendorConfig.services.map(s => s.serviceType).join(', ')}`);
        console.log(`📋 [VendorService]   - Status: ${vendorConfig.status}`);
        console.log(`📋 [VendorService]   - Priority: ${vendorConfig.priority}`);
        console.log(`📋 [VendorService]   - Auth Config:`, vendorConfig.authConfig ? '✅ Present' : '❌ Missing');
        
        try {
          const vendor = VendorFactory.createVendorFromPrisma(vendorConfig);
          const vendorCode = vendorConfig.code as VtuVendor;
          
          this.vendors.set(vendorCode, vendor);
          this.fallbackChain.push(vendorCode);
          this.vendorIdMap.set(vendorCode, vendorConfig.id);
          
          console.log(`✅ [VendorService] Vendor ${vendorCode} initialized successfully`);
        } catch (error) {
          console.error(`❌ [VendorService] Failed to initialize vendor ${vendorConfig.code}:`, error);
        }
      }

      console.log(`✅ [VendorService] Initialization complete. ${this.vendors.size} vendors loaded.`);
      console.log(`📋 [VendorService] Fallback chain: ${this.fallbackChain.join(' → ')}`);
      
      this.initialized = true;
    } catch (error) {
      console.error('❌ [VendorService] Failed to initialize vendors:', error);
      this.initialized = false;
      throw error;
    }
  }

  private async getVendorId(vendorCode: VtuVendor): Promise<string | null> {
    if (this.vendorIdMap.has(vendorCode)) {
      return this.vendorIdMap.get(vendorCode) || null;
    }

    const vendor = await prisma.vendor.findUnique({
      where: { code: vendorCode },
      select: { id: true },
    });

    if (vendor) {
      this.vendorIdMap.set(vendorCode, vendor.id);
      return vendor.id;
    }

    return null;
  }

  private async getVendorForService(
    serviceType: VtuType,
    excludeVendors: VtuVendor[] = []
  ): Promise<BaseVendor | null> {
    if (!this.initialized) {
      await this.initializeVendors();
    }

    const availableVendors = this.fallbackChain.filter(
      vendor => !excludeVendors.includes(vendor)
    );

    for (const vendorCode of availableVendors) {
      const vendor = this.vendors.get(vendorCode);
      if (!vendor) continue;

      const vendorConfig = await prisma.vendor.findUnique({
        where: { code: vendorCode },
        include: { services: true },
      });

      if (!vendorConfig) continue;

      const serviceSupported = vendorConfig.services.some(
        s => s.serviceType === serviceType && s.isActive
      );

      if (!serviceSupported) continue;

      const isHealthy = await this.checkVendorHealth(vendorCode);
      if (isHealthy) {
        return vendor;
      }
    }

    return null;
  }

  private async checkVendorHealth(vendorCode: VtuVendor): Promise<boolean> {
    try {
      const vendorId = await this.getVendorId(vendorCode);
      if (!vendorId) return false;

      const circuitBreaker = await prisma.circuitBreaker.findFirst({
        where: { 
          vendorId: vendorId,
          serviceType: null,
        },
      });

      if (circuitBreaker && circuitBreaker.state === 'OPEN') {
        return false;
      }

      const recentHealthCheck = await prisma.vendorHealthCheck.findFirst({
        where: { 
          vendorId: vendorId,
          status: VendorStatus.ACTIVE,
        },
        orderBy: { checkedAt: 'desc' },
        take: 1,
      });

      if (recentHealthCheck) {
        const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
        if (recentHealthCheck.isSuccess && recentHealthCheck.checkedAt > fiveMinutesAgo) {
          return true;
        }
      }

      const vendor = this.vendors.get(vendorCode);
      if (!vendor) return false;

      const isHealthy = await vendor.checkVendorHealth();
      
      await prisma.vendorHealthCheck.create({
        data: {
          vendorId: vendorId,
          status: isHealthy ? VendorStatus.ACTIVE : VendorStatus.DOWN,
          responseTime: 0,
          isSuccess: isHealthy,
          checkedAt: new Date(),
          ...(!isHealthy && { errorMessage: 'Health check failed' }),
        },
      });

      return isHealthy;
    } catch (error) {
      console.error(`Health check failed for ${vendorCode}:`, error);
      return false;
    }
  }

  private async updateVendorHealth(
    vendorCode: VtuVendor, 
    isSuccess: boolean, 
    errorMessage?: string,
    responseTime?: number
  ) {
    const vendorId = await this.getVendorId(vendorCode);
    if (!vendorId) return;

    await prisma.vendorHealthCheck.create({
      data: {
        vendorId: vendorId,
        status: isSuccess ? VendorStatus.ACTIVE : VendorStatus.DEGRADED,
        responseTime: responseTime || 0,
        isSuccess,
        errorMessage: errorMessage,
        checkedAt: new Date(),
      },
    });

    if (!isSuccess) {
      const vendor = await prisma.vendor.findUnique({
        where: { id: vendorId },
      });

      if (vendor) {
        const newFailureCount = vendor.consecutiveFailures + 1;
        const newStatus = newFailureCount >= 3 ? VendorStatus.DEGRADED : vendor.status;
        
        await prisma.vendor.update({
          where: { id: vendorId },
          data: {
            consecutiveFailures: newFailureCount,
            status: newStatus,
            lastFailureAt: new Date(),
          },
        });
      }
    } else {
      await prisma.vendor.update({
        where: { id: vendorId },
        data: {
          consecutiveFailures: 0,
          status: VendorStatus.ACTIVE,
          lastSuccessAt: new Date(),
        },
      });
    }
  }

  private async executeWithFallback(
    serviceType: VtuType,
    operation: (vendor: BaseVendor) => Promise<VendorResponse>,
    userId: string
  ): Promise<VendorResponse> {
    console.log(`🔄 [VendorService] executeWithFallback called for service: ${serviceType}`);
    console.log(`📋 [VendorService] Fallback chain: ${this.fallbackChain.join(' → ')}`);
    console.log(`📋 [VendorService] Vendors map size: ${this.vendors.size}`);
    
    // Ensure vendors are initialized
    if (!this.initialized) {
      console.log("🔄 [VendorService] Vendors not initialized, initializing now...");
      await this.initializeVendors();
    }

    if (this.fallbackChain.length === 0) {
      console.error("❌ [VendorService] No vendors available in fallback chain!");
      console.error("❌ [VendorService] Please seed a vendor using /api/seed/vtpass");
      return {
        success: false,
        error: "No vendors configured. Please seed a vendor first.",
        statusCode: 503,
        vendor: VtuVendor.VTPASS,
        metadata: {
          error: "No vendors available",
        },
      };
    }

    const failedVendors: string[] = [];
    let lastError: string = '';
    let lastVendorCode: VtuVendor | null = null;
    let lastVendorId: string | null = null;
    let attemptCount = 0;

    for (const vendorCode of this.fallbackChain) {
      attemptCount++;
      console.log(`🔄 [VendorService] Attempt ${attemptCount}: Trying vendor ${vendorCode}`);
      
      const vendor = this.vendors.get(vendorCode);
      if (!vendor) {
        console.warn(`⚠️ [VendorService] Vendor ${vendorCode} not found in vendors map`);
        console.warn(`⚠️ [VendorService] Available vendors: ${Array.from(this.vendors.keys()).join(', ')}`);
        continue;
      }

      const vendorId = await this.getVendorId(vendorCode);
      if (!vendorId) {
        console.warn(`⚠️ [VendorService] Vendor ID not found for ${vendorCode}`);
        continue;
      }

      // Check if vendor supports this service
      const vendorConfig = await prisma.vendor.findUnique({
        where: { id: vendorId },
        include: { services: true },
      });

      if (!vendorConfig) {
        console.warn(`⚠️ [VendorService] Vendor config not found for ${vendorCode}`);
        continue;
      }

      const serviceSupported = vendorConfig.services.some(
        s => s.serviceType === serviceType && s.isActive
      );

      if (!serviceSupported) {
        console.warn(`⚠️ [VendorService] Vendor ${vendorCode} does not support service ${serviceType}`);
        console.warn(`⚠️ [VendorService] Supported services: ${vendorConfig.services.map(s => s.serviceType).join(', ')}`);
        continue;
      }

      console.log(`✅ [VendorService] Vendor ${vendorCode} supports service ${serviceType}`);

      try {
        console.log(`🔄 [VendorService] Calling vendor ${vendorCode}...`);
        console.log(`🔄 [VendorService] Vendor instance: ${vendor.constructor.name}`);
        
        const result = await operation(vendor);
        
        console.log(`📊 [VendorService] Vendor ${vendorCode} result:`, {
          success: result.success,
          error: result.error,
          vendor: result.vendor,
          vendorReference: result.vendorReference,
          hasData: !!result.data,
          metadata: result.metadata,
        });
        
        if (result.success) {
          console.log(`✅ [VendorService] Vendor ${vendorCode} succeeded!`);
          lastVendorCode = vendorCode;
          lastVendorId = vendorId;
          
          // Log successful selection
          try {
            await prisma.vendorSelectionLog.create({
              data: {
                serviceType,
                userId: userId,
                candidates: this.fallbackChain.map(c => c.toString()),
                selectedVendorId: vendorId,
                selectionReason: 'SUCCESS',
                vendorStates: JSON.stringify({
                  selectedVendor: vendorCode,
                  success: true,
                  metadata: result.metadata,
                }),
                selectionTimeMs: result.metadata?.duration || 0,
              },
            });
          } catch (logError) {
            console.error('Failed to log vendor selection:', logError);
          }
          
          return result;
        }

        failedVendors.push(vendorId);
        lastError = result.error || 'Vendor operation failed';
        lastVendorCode = vendorCode;
        lastVendorId = vendorId;
        
        console.warn(`⚠️ [VendorService] Vendor ${vendorCode} failed: ${lastError}`);
        console.warn(`⚠️ [VendorService] Full result:`, JSON.stringify(result, null, 2));
      } catch (error: any) {
        console.error(`❌ [VendorService] Vendor ${vendorCode} threw an error:`, error);
        console.error(`❌ [VendorService] Error message: ${error.message}`);
        console.error(`❌ [VendorService] Error stack:`, error.stack);
        
        failedVendors.push(vendorId);
        lastError = error.message || 'Unknown error';
        lastVendorCode = vendorCode;
        lastVendorId = vendorId;
        
        await this.updateVendorHealth(vendorCode, false, error.message);
      }
    }

    // Log failure
    console.error(`❌ [VendorService] All vendors failed after ${attemptCount} attempts.`);
    console.error(`❌ [VendorService] Last error: ${lastError}`);
    console.error(`❌ [VendorService] Failed vendors: ${failedVendors.join(', ')}`);

    if (lastVendorId && lastVendorCode) {
      try {
        await prisma.vendorSelectionLog.create({
          data: {
            serviceType,
            userId: userId,
            candidates: this.fallbackChain.map(c => c.toString()),
            selectedVendorId: lastVendorId,
            selectionReason: 'ALL_VENDORS_FAILED',
            vendorStates: JSON.stringify({
              failed: failedVendors,
              error: lastError,
              lastVendor: lastVendorCode,
              totalAttempts: attemptCount,
            }),
            selectionTimeMs: 0,
          },
        });
      } catch (logError) {
        console.error('Failed to log vendor selection:', logError);
      }
    }

    return {
      success: false,
      error: `All vendors failed. Last error: ${lastError}`,
      statusCode: 503,
      vendor: lastVendorCode || VtuVendor.VTPASS,
      metadata: {
        failedVendors,
        lastError,
        totalAttempts: attemptCount,
      },
    };
  }

  // Public methods
  async buyAirtime(request: VendorAirtimeRequest, userId: string): Promise<VendorResponse> {
    console.log(`📞 [VendorService] buyAirtime called for ${request.phoneNumber} (${request.network})`);
    return this.executeWithFallback(
      VtuType.AIRTIME,
      async (vendor) => {
        console.log(`🔄 [VendorService] Executing vendor.buyAirtime for ${vendor.config.code}`);
        const result = await vendor.buyAirtime(request);
        console.log(`📊 [VendorService] vendor.buyAirtime result: success=${result.success}, error=${result.error}`);
        return result;
      },
      userId
    );
  }

  async buyData(request: VendorDataRequest, userId: string): Promise<VendorResponse> {
    return this.executeWithFallback(
      VtuType.DATA,
      async (vendor) => {
        const result = await vendor.buyData(request);
        return result;
      },
      userId
    );
  }

  async buyElectricity(request: VendorElectricityRequest, userId: string): Promise<VendorResponse> {
    return this.executeWithFallback(
      VtuType.ELECTRICITY_INSTANT,
      async (vendor) => {
        const result = await vendor.buyElectricity(request);
        return result;
      },
      userId
    );
  }

  async buyCableTV(request: VendorCableTVRequest, userId: string): Promise<VendorResponse> {
    return this.executeWithFallback(
      VtuType.CABLE_TV,
      async (vendor) => {
        const result = await vendor.buyCableTV(request);
        return result;
      },
      userId
    );
  }

  async getVendorStatus(): Promise<Record<VtuVendor, { 
    isHealthy: boolean; 
    supportedServices: VtuType[];
    status: VendorStatus;
  }>> {
    const status: Record<VtuVendor, any> = {} as any;
    
    const vendors = await prisma.vendor.findMany({
      include: { services: true },
    });

    for (const vendor of vendors) {
      const vendorCode = vendor.code as VtuVendor;
      const isHealthy = await this.checkVendorHealth(vendorCode);
      
      status[vendorCode] = {
        isHealthy,
        supportedServices: vendor.services.map(s => s.serviceType),
        status: vendor.status,
      };
    }
    
    return status;
  }

  async refreshVendors() {
    console.log("🔄 [VendorService] Refreshing vendors...");
    this.initialized = false;
    this.vendors.clear();
    this.fallbackChain = [];
    this.vendorIdMap.clear();
    await this.initializeVendors();
    console.log("✅ [VendorService] Refresh complete");
  }
}

// Singleton instance
let vendorServiceInstance: VendorService | null = null;

export function getVendorService(): VendorService {
  if (!vendorServiceInstance) {
    console.log("🔧 [VendorService] Creating new singleton instance...");
    vendorServiceInstance = new VendorService();
  } else {
    console.log("🔧 [VendorService] Returning existing singleton instance");
  }
  return vendorServiceInstance;
}