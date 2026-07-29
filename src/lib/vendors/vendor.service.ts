// lib/vendors/vendor.service.ts

import { prisma } from "~/lib/db";
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

// ============================================================
// VENDOR HEALTH TRACKING
// ============================================================

interface VendorHealth {
  code: VtuVendor;
  isAvailable: boolean;
  consecutiveFailures: number;
  lastFailure: Date | null;
  averageResponseTime: number;
  failureReasons: string[];
  priority: number;
}

interface VendorMetrics {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  vendorUsage: Record<string, number>;
  vendorFailures: Record<string, number>;
  switchCount: number;
  totalResponseTime: number;
}

// ============================================================
// VENDOR SERVICE - TRUE SINGLETON
// ============================================================

export class VendorService {
  private static instance: VendorService | null = null;
  private static initializationPromise: Promise<void> | null = null;
  
  private vendors: Map<VtuVendor, BaseVendor> = new Map();
  private vendorHealth: Map<VtuVendor, VendorHealth> = new Map();
  private fallbackChain: VtuVendor[] = [];
  private initialized: boolean = false;
  private vendorIdMap: Map<VtuVendor, string> = new Map();
  private isInitializing: boolean = false;
  
  // Configuration
  private readonly MAX_CONSECUTIVE_FAILURES = 3;
  private readonly CIRCUIT_BREAKER_TIMEOUT = 300000; // 5 minutes
  private readonly HEALTH_CHECK_INTERVAL = 60000; // 1 minute
  private readonly VENDOR_TIMEOUT = 30000; // 30 seconds
  
  // Metrics
  private metrics: VendorMetrics = {
    totalRequests: 0,
    successfulRequests: 0,
    failedRequests: 0,
    vendorUsage: {},
    vendorFailures: {},
    switchCount: 0,
    totalResponseTime: 0,
  };

  private healthCheckInterval: NodeJS.Timeout | null = null;

  // ✅ Private constructor - prevents external instantiation
  private constructor() {
    console.log("🔧 [VendorService] Creating singleton instance...");
  }

  // ✅ Get singleton instance with lazy initialization
  static getInstance(): VendorService {
    if (!VendorService.instance) {
      VendorService.instance = new VendorService();
    }
    return VendorService.instance;
  }

  // ✅ Ensure vendors are initialized
  async ensureInitialized(): Promise<void> {
    if (this.initialized) {
      return;
    }

    // If initialization is in progress, wait for it
    if (this.isInitializing && VendorService.initializationPromise) {
      console.log("⏳ [VendorService] Initialization in progress, waiting...");
      await VendorService.initializationPromise;
      return;
    }

    // Start initialization
    this.isInitializing = true;
    VendorService.initializationPromise = this.initializeVendors();
    
    try {
      await VendorService.initializationPromise;
    } finally {
      this.isInitializing = false;
    }
  }

  // ============================================================
  // INITIALIZATION
  // ============================================================

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
        },
      });

      console.log(`📊 [VendorService] Found ${vendorConfigs.length} active vendors`);

      if (vendorConfigs.length === 0) {
        console.warn("⚠️ [VendorService] No active vendors found!");
        console.warn("⚠️ [VendorService] Please seed vendors using /api/seed/");
        return;
      }

      // ✅ Clear existing data before loading
      this.vendors.clear();
      this.vendorHealth.clear();
      this.fallbackChain = [];
      this.vendorIdMap.clear();

      for (const vendorConfig of vendorConfigs) {
        try {
          // ✅ Use factory with caching
          const vendor = VendorFactory.createVendorFromPrisma(vendorConfig);
          const vendorCode = vendorConfig.code as VtuVendor;
          
          this.vendors.set(vendorCode, vendor);
          this.fallbackChain.push(vendorCode);
          this.vendorIdMap.set(vendorCode, vendorConfig.id);
          
          // Initialize health tracking
          this.vendorHealth.set(vendorCode, {
            code: vendorCode,
            isAvailable: true,
            consecutiveFailures: 0,
            lastFailure: null,
            averageResponseTime: 0,
            failureReasons: [],
            priority: vendorConfig.priority,
          });
          
          console.log(`✅ [VendorService] Vendor ${vendorCode} initialized (Priority: ${vendorConfig.priority})`);
        } catch (error) {
          console.error(`❌ [VendorService] Failed to initialize vendor ${vendorConfig.code}:`, error);
        }
      }

      // Sort fallback chain by priority and remove duplicates
      this.fallbackChain.sort((a, b) => {
        const healthA = this.vendorHealth.get(a);
        const healthB = this.vendorHealth.get(b);
        return (healthA?.priority || 999) - (healthB?.priority || 999);
      });

      // ✅ Remove duplicates
      this.fallbackChain = [...new Set(this.fallbackChain)];

      console.log(`✅ [VendorService] Initialization complete. ${this.vendors.size} vendors loaded.`);
      console.log(`📋 [VendorService] Fallback chain: ${this.fallbackChain.join(' → ')}`);
      
      this.initialized = true;
      
      // Start health checks after initialization
      this.startHealthChecks();
    } catch (error) {
      console.error('❌ [VendorService] Failed to initialize vendors:', error);
      this.initialized = false;
      throw error;
    }
  }

  // ============================================================
  // HEALTH CHECKS
  // ============================================================

  private startHealthChecks() {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }

    this.healthCheckInterval = setInterval(() => {
      this.performHealthChecks();
    }, this.HEALTH_CHECK_INTERVAL);

    console.log(`✅ [VendorService] Health checks started (interval: ${this.HEALTH_CHECK_INTERVAL}ms)`);
  }

  private async performHealthChecks() {
    for (const [vendorCode, vendor] of this.vendors) {
      const health = this.vendorHealth.get(vendorCode);
      if (!health) continue;

      // Check if vendor needs recovery from circuit breaker
      if (!health.isAvailable && health.lastFailure) {
        const timeSinceFailure = Date.now() - health.lastFailure.getTime();
        if (timeSinceFailure > this.CIRCUIT_BREAKER_TIMEOUT) {
          health.isAvailable = true;
          health.consecutiveFailures = 0;
          health.failureReasons = [];
          console.log(`🔄 [VendorService] Auto-recovered vendor: ${vendorCode}`);
        }
      }
    }
  }

  // ============================================================
  // VENDOR HEALTH UPDATE
  // ============================================================

  private updateVendorHealth(
    vendorCode: VtuVendor, 
    success: boolean, 
    responseTime?: number,
    errorMessage?: string
  ) {
    const health = this.vendorHealth.get(vendorCode);
    if (!health) return;

    if (success) {
      health.consecutiveFailures = 0;
      health.lastFailure = null;
      health.isAvailable = true;
      health.failureReasons = [];
      
      if (responseTime) {
        health.averageResponseTime = 
          (health.averageResponseTime * 0.7) + (responseTime * 0.3);
      }
      
      console.log(`✅ [VendorService] ${vendorCode} health: Good (avg ${health.averageResponseTime.toFixed(0)}ms)`);
    } else {
      health.consecutiveFailures += 1;
      health.lastFailure = new Date();
      
      if (errorMessage) {
        health.failureReasons.push(errorMessage);
        if (health.failureReasons.length > 10) {
          health.failureReasons.shift();
        }
      }

      // Circuit Breaker: Disable after 3 consecutive failures
      if (health.consecutiveFailures >= this.MAX_CONSECUTIVE_FAILURES) {
        health.isAvailable = false;
        console.warn(`⛔ [VendorService] CIRCUIT BREAKER TRIPPED for ${vendorCode} (${health.consecutiveFailures} failures)`);
      } else {
        console.warn(`⚠️ [VendorService] ${vendorCode} health: ${health.consecutiveFailures}/${this.MAX_CONSECUTIVE_FAILURES} failures`);
      }
    }
  }

  // ============================================================
  // EXECUTION WITH TIMEOUT
  // ============================================================

  private async executeWithTimeout<T>(
    fn: () => Promise<T>,
    timeoutMs: number = this.VENDOR_TIMEOUT
  ): Promise<T> {
    return Promise.race([
      fn(),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error(`Request timed out after ${timeoutMs}ms`)), timeoutMs)
      ),
    ]);
  }

  // ============================================================
  // CORE EXECUTION WITH SWITCHING
  // ============================================================

  private async executeWithSwitching(
    serviceType: VtuType,
    operation: (vendor: BaseVendor) => Promise<VendorResponse>,
    userId: string
  ): Promise<VendorResponse> {
    // ✅ Ensure vendors are initialized before proceeding
    await this.ensureInitialized();

    const startTime = Date.now();
    this.metrics.totalRequests++;

    if (this.fallbackChain.length === 0) {
      console.error("❌ [VendorService] No vendors available!");
      return {
        success: false,
        error: "No vendors configured",
        statusCode: 503,
        vendor: VtuVendor.VTPASS,
        metadata: { error: "No vendors available" },
      };
    }

    // Get available vendors sorted by priority
    const availableVendors = this.fallbackChain.filter(code => {
      const health = this.vendorHealth.get(code);
      return health?.isAvailable !== false;
    });

    console.log(`🔄 [VendorService] Available vendors: ${availableVendors.join(', ')}`);

    if (availableVendors.length === 0) {
      return {
        success: false,
        error: "No vendors available. Please try again later.",
        statusCode: 503,
        vendor: VtuVendor.VTPASS,
        metadata: { error: "All vendors are currently unavailable" },
      };
    }

    const errors: Array<{ vendor: VtuVendor; error: string }> = [];
    let lastError = '';
    let lastVendorCode: VtuVendor | null = null;
    let attemptCount = 0;

    for (const vendorCode of availableVendors) {
      attemptCount++;
      console.log(`🔄 [VendorService] Attempt ${attemptCount}: Trying ${vendorCode}`);

      const vendor = this.vendors.get(vendorCode);
      if (!vendor) {
        console.warn(`⚠️ [VendorService] Vendor ${vendorCode} not found`);
        continue;
      }

      const health = this.vendorHealth.get(vendorCode);
      if (!health) continue;

      // Check if vendor supports this service
      try {
        const vendorId = await this.getVendorId(vendorCode);
        if (!vendorId) {
          console.warn(`⚠️ [VendorService] Vendor ID not found for ${vendorCode}`);
          continue;
        }

        const vendorConfig = await prisma.vendor.findUnique({
          where: { id: vendorId },
          include: { services: true },
        });

        if (!vendorConfig) continue;

        const serviceSupported = vendorConfig.services.some(
          s => s.serviceType === serviceType && s.isActive
        );

        if (!serviceSupported) {
          console.warn(`⚠️ [VendorService] ${vendorCode} does not support ${serviceType}`);
          continue;
        }

        console.log(`✅ [VendorService] ${vendorCode} supports ${serviceType}`);

      } catch (error) {
        console.warn(`⚠️ [VendorService] Error checking ${vendorCode} support:`, error);
        continue;
      }

      try {
        const vendorStartTime = Date.now();
        
        // Execute with timeout
        const result = await this.executeWithTimeout(() => 
          operation(vendor)
        );

        const responseTime = Date.now() - vendorStartTime;

        if (result.success) {
          // Success - update health
          this.updateVendorHealth(vendorCode, true, responseTime);
          this.metrics.successfulRequests++;
          this.metrics.vendorUsage[vendorCode] = (this.metrics.vendorUsage[vendorCode] || 0) + 1;
          this.metrics.totalResponseTime += Date.now() - startTime;

          const wasSwitched = errors.length > 0;
          if (wasSwitched) {
            this.metrics.switchCount++;
          }

          console.log(`✅ [VendorService] Success with ${vendorCode} in ${responseTime}ms${wasSwitched ? ' (SWITCHED)' : ''}`);

          return {
            ...result,
            vendor: vendorCode,
            vendorSwitched: wasSwitched,
            switchedFrom: errors.map(e => e.vendor),
            metadata: {
              ...result.metadata,
              attemptCount,
              totalTime: Date.now() - startTime,
              vendorPriority: health.priority,
              wasSwitched,
              switchedFrom: errors.map(e => e.vendor),
            },
          };
        } else {
          // Vendor returned failure
          const errorMsg = result.error || 'Unknown error';
          errors.push({ vendor: vendorCode, error: errorMsg });
          lastError = errorMsg;
          lastVendorCode = vendorCode;
          
          this.updateVendorHealth(vendorCode, false, undefined, errorMsg);
          this.metrics.vendorFailures[vendorCode] = (this.metrics.vendorFailures[vendorCode] || 0) + 1;
          
          console.warn(`⚠️ [VendorService] ${vendorCode} failed: ${errorMsg}`);
        }
      } catch (error: any) {
        const errorMessage = error.message || 'Unknown error';
        errors.push({ vendor: vendorCode, error: errorMessage });
        lastError = errorMessage;
        lastVendorCode = vendorCode;
        
        this.updateVendorHealth(vendorCode, false, undefined, errorMessage);
        this.metrics.vendorFailures[vendorCode] = (this.metrics.vendorFailures[vendorCode] || 0) + 1;
        
        console.error(`❌ [VendorService] ${vendorCode} error:`, errorMessage);
      }
    }

    // All vendors failed
    this.metrics.failedRequests++;
    this.metrics.totalResponseTime += Date.now() - startTime;

    console.error(`❌ [VendorService] All vendors failed after ${attemptCount} attempts`);

    return {
      success: false,
      error: `All vendors failed. Last error: ${lastError}`,
      statusCode: 503,
      vendor: lastVendorCode || VtuVendor.VTPASS,
      metadata: {
        errors,
        totalAttempts: attemptCount,
        totalTime: Date.now() - startTime,
      },
    };
  }

  // ============================================================
  // PUBLIC METHODS
  // ============================================================

  async buyAirtime(request: VendorAirtimeRequest, userId: string): Promise<VendorResponse> {
    console.log(`📞 [VendorService] buyAirtime called for ${request.phoneNumber} (${request.network})`);
    return this.executeWithSwitching(
      VtuType.AIRTIME,
      async (vendor) => vendor.buyAirtime(request),
      userId
    );
  }

  async buyData(request: VendorDataRequest, userId: string): Promise<VendorResponse> {
    console.log(`📊 [VendorService] buyData called for ${request.phoneNumber} (${request.network})`);
    return this.executeWithSwitching(
      VtuType.DATA,
      async (vendor) => vendor.buyData(request),
      userId
    );
  }

  async buyElectricity(request: VendorElectricityRequest, userId: string): Promise<VendorResponse> {
    console.log(`⚡ [VendorService] buyElectricity called for ${request.meterNumber}`);
    return this.executeWithSwitching(
      VtuType.ELECTRICITY_INSTANT,
      async (vendor) => vendor.buyElectricity(request),
      userId
    );
  }

  async buyCableTV(request: VendorCableTVRequest, userId: string): Promise<VendorResponse> {
    console.log(`📺 [VendorService] buyCableTV called for ${request.decoderNumber}`);
    return this.executeWithSwitching(
      VtuType.CABLE_TV,
      async (vendor) => vendor.buyCableTV(request),
      userId
    );
  }

  // ============================================================
  // HELPER METHODS
  // ============================================================

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

  // ============================================================
  // ADMIN & MONITORING
  // ============================================================

  getVendorStatus() {
    const status: Record<string, any> = {};
    
    for (const [code, health] of this.vendorHealth) {
      status[code] = {
        code,
        isAvailable: health.isAvailable,
        consecutiveFailures: health.consecutiveFailures,
        averageResponseTime: health.averageResponseTime,
        priority: health.priority,
        lastFailure: health.lastFailure,
        failureReasons: health.failureReasons.slice(-3),
      };
    }
    
    return status;
  }

  getMetrics() {
    const totalTime = this.metrics.totalRequests > 0
      ? this.metrics.totalResponseTime / this.metrics.totalRequests
      : 0;

    return {
      ...this.metrics,
      successRate: this.metrics.totalRequests > 0
        ? ((this.metrics.successfulRequests / this.metrics.totalRequests) * 100).toFixed(2) + '%'
        : 'N/A',
      switchRate: this.metrics.totalRequests > 0
        ? ((this.metrics.switchCount / this.metrics.totalRequests) * 100).toFixed(2) + '%'
        : 'N/A',
      averageResponseTime: totalTime.toFixed(0) + 'ms',
      vendorBreakdown: Object.keys(this.metrics.vendorUsage).map(code => ({
        code,
        usage: this.metrics.vendorUsage[code] || 0,
        failures: this.metrics.vendorFailures[code] || 0,
      })),
    };
  }

  resetVendorHealth(vendorCode: VtuVendor) {
    const health = this.vendorHealth.get(vendorCode);
    if (health) {
      health.isAvailable = true;
      health.consecutiveFailures = 0;
      health.lastFailure = null;
      health.failureReasons = [];
      console.log(`🔄 [VendorService] Manually reset health for ${vendorCode}`);
      return true;
    }
    return false;
  }

  async refreshVendors() {
    console.log("🔄 [VendorService] Refreshing vendors...");
    this.initialized = false;
    this.vendors.clear();
    this.vendorHealth.clear();
    this.fallbackChain = [];
    this.vendorIdMap.clear();
    // Clear factory cache too
    VendorFactory.clearCache();
    await this.initializeVendors();
    console.log("✅ [VendorService] Refresh complete");
  }

  destroy() {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
    }
    console.log(`🔄 [VendorService] Destroyed`);
    VendorService.instance = null;
    VendorService.initializationPromise = null;
  }
}

// ============================================================
// ✅ SINGLETON EXPORT
// ============================================================

export function getVendorService(): VendorService {
  return VendorService.getInstance();
}