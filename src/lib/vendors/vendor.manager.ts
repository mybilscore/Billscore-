// lib/vendors/vendor.manager.ts

import { getVendorService } from "./vendor.service";

// ============================================================
// TYPES
// ============================================================

export interface AirtimeParams {
  phoneNumber: string;
  amount: number;
  network: string;
}

export interface DataParams {
  phoneNumber: string;
  amount: number;
  network: string;
  dataPlan?: string;
}

export interface ElectricityParams {
  meterNumber: string;
  amount: number;
  provider: string;
  customerName?: string;
  meterType?: "PREPAID" | "POSTPAID";
}

export interface CableParams {
  decoderNumber: string;
  amount: number;
  provider: string;
  package?: string;
  customerName?: string;
}

export interface PurchaseResult {
  success: boolean;
  error?: string;
  vendor?: string;
  vendorReference?: string;
  vendorSwitched?: boolean;
  switchedFrom?: string[];
  vendorErrors?: Array<{ vendor: string; error: string }>;
  data?: any;
}

interface VendorHealth {
  code: string;
  priority: number;
  isAvailable: boolean;
  lastFailure: Date | null;
  consecutiveFailures: number;
  averageResponseTime: number;
  failureReasons: string[];
  totalRequests: number;
  successfulRequests: number;
  totalResponseTime: number;
}

// ============================================================
// VENDOR MANAGER CLASS
// ============================================================

class VendorManager {
  private vendors: VendorHealth[] = [];
  private readonly MAX_CONSECUTIVE_FAILURES = 3;
  private readonly CIRCUIT_BREAKER_TIMEOUT = 300000; // 5 minutes
  private readonly VENDOR_TIMEOUT = 30000; // 30 seconds
  private readonly HEALTH_CHECK_INTERVAL = 60000; // 1 minute
  private healthCheckInterval: NodeJS.Timeout | null = null;

  // Metrics
  private metrics = {
    totalRequests: 0,
    successfulRequests: 0,
    failedRequests: 0,
    vendorUsage: {} as Record<string, number>,
    vendorFailures: {} as Record<string, number>,
    switchCount: 0,
    totalResponseTime: 0,
  };

  constructor() {
    this.initializeVendors();
    this.startHealthChecks();
  }

  // ============================================================
  // INITIALIZATION
  // ============================================================

  private initializeVendors() {
    // Load vendors from environment or database
    // In production, fetch from database
    this.vendors = [
      {
        code: "BILAL_SADA",
        priority: parseInt(process.env.VENDOR_PRIORITY_BILAL_SADA || "1"),
        isAvailable: true,
        lastFailure: null,
        consecutiveFailures: 0,
        averageResponseTime: 0,
        failureReasons: [],
        totalRequests: 0,
        successfulRequests: 0,
        totalResponseTime: 0,
      },
      {
        code: "GIDIGITAL",
        priority: parseInt(process.env.VENDOR_PRIORITY_GIDIGITAL || "2"),
        isAvailable: true,
        lastFailure: null,
        consecutiveFailures: 0,
        averageResponseTime: 0,
        failureReasons: [],
        totalRequests: 0,
        successfulRequests: 0,
        totalResponseTime: 0,
      },
      {
        code: "VT_PASS",
        priority: parseInt(process.env.VENDOR_PRIORITY_VT_PASS || "3"),
        isAvailable: true,
        lastFailure: null,
        consecutiveFailures: 0,
        averageResponseTime: 0,
        failureReasons: [],
        totalRequests: 0,
        successfulRequests: 0,
        totalResponseTime: 0,
      },
      {
        code: "MONIEPOINT",
        priority: parseInt(process.env.VENDOR_PRIORITY_MONIEPOINT || "4"),
        isAvailable: true,
        lastFailure: null,
        consecutiveFailures: 0,
        averageResponseTime: 0,
        failureReasons: [],
        totalRequests: 0,
        successfulRequests: 0,
        totalResponseTime: 0,
      },
    ];

    // Sort by priority
    this.vendors.sort((a, b) => a.priority - b.priority);

    console.log(`✅ [VendorManager] Initialized ${this.vendors.length} vendors`);
    console.log(`📊 [VendorManager] Vendor priorities:`, 
      this.vendors.map(v => `${v.code}: ${v.priority}`).join(', ')
    );
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

    console.log(`✅ [VendorManager] Health checks started (interval: ${this.HEALTH_CHECK_INTERVAL}ms)`);
  }

  private async performHealthChecks() {
    for (const vendor of this.vendors) {
      // Check if vendor needs recovery
      if (!vendor.isAvailable && vendor.lastFailure) {
        const timeSinceFailure = Date.now() - vendor.lastFailure.getTime();
        if (timeSinceFailure > this.CIRCUIT_BREAKER_TIMEOUT) {
          vendor.isAvailable = true;
          vendor.consecutiveFailures = 0;
          vendor.failureReasons = [];
          console.log(`🔄 [VendorManager] Auto-recovered vendor: ${vendor.code}`);
        }
      }

      // Optional: Check vendor health by making a small request
      try {
        const service = getVendorService(vendor.code);
        if (service.checkHealth) {
          const health = await service.checkHealth();
          if (!health) {
            console.warn(`⚠️ [VendorManager] Health check failed for ${vendor.code}`);
          }
        }
      } catch (error) {
        // Silent fail for health checks
      }
    }
  }

  // ============================================================
  // VENDOR UPDATE METHODS
  // ============================================================

  private updateVendorHealth(code: string, success: boolean, responseTime?: number) {
    const vendor = this.vendors.find((v) => v.code === code);
    if (!vendor) return;

    vendor.totalRequests++;

    if (success) {
      vendor.successfulRequests++;
      vendor.consecutiveFailures = 0;
      vendor.lastFailure = null;
      vendor.isAvailable = true;
      vendor.failureReasons = [];

      if (responseTime) {
        vendor.totalResponseTime += responseTime;
        vendor.averageResponseTime = vendor.totalResponseTime / vendor.successfulRequests;
      }

      console.log(`✅ [VendorManager] ${code} health: Good (avg ${vendor.averageResponseTime.toFixed(0)}ms)`);
    } else {
      vendor.consecutiveFailures += 1;
      vendor.lastFailure = new Date();

      // Circuit Breaker: Disable after 3 consecutive failures
      if (vendor.consecutiveFailures >= this.MAX_CONSECUTIVE_FAILURES) {
        vendor.isAvailable = false;
        console.warn(`⛔ [VendorManager] CIRCUIT BREAKER TRIPPED for ${code} (${vendor.consecutiveFailures} failures)`);

        // Log the failure reason
        if (vendor.failureReasons.length > 0) {
          console.warn(`📋 [VendorManager] ${code} failure reasons:`, vendor.failureReasons.slice(-3));
        }

        // Auto-recover after timeout
        setTimeout(() => {
          vendor.isAvailable = true;
          vendor.consecutiveFailures = 0;
          vendor.failureReasons = [];
          console.log(`🔄 [VendorManager] Circuit breaker reset for ${code} (auto-recovered)`);
        }, this.CIRCUIT_BREAKER_TIMEOUT);
      } else {
        console.warn(`⚠️ [VendorManager] ${code} health: ${vendor.consecutiveFailures}/${this.MAX_CONSECUTIVE_FAILURES} failures`);
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
  // CORE BUY METHODS WITH SWITCHING
  // ============================================================

  // ---- AIRTIME ----

  async buyAirtime(params: AirtimeParams, userId: string): Promise<PurchaseResult> {
    const errors: Array<{ vendor: string; error: string }> = [];
    const startTime = Date.now();

    this.metrics.totalRequests++;

    // Get available vendors sorted by priority
    const availableVendors = this.vendors
      .filter((v) => v.isAvailable)
      .sort((a, b) => a.priority - b.priority);

    console.log(`🔄 [VendorManager] Available vendors: ${availableVendors.map((v) => v.code).join(", ")}`);

    if (availableVendors.length === 0) {
      return {
        success: false,
        error: "No vendors available. Please try again later.",
      };
    }

    for (const vendor of availableVendors) {
      try {
        console.log(`🔍 [VendorManager] Trying ${vendor.code} (Priority ${vendor.priority})...`);

        const vendorStartTime = Date.now();
        const service = getVendorService(vendor.code);

        // Execute with timeout
        const result = await this.executeWithTimeout(() =>
          service.buyAirtime(params, userId)
        );

        const responseTime = Date.now() - vendorStartTime;

        if (result.success) {
          // Success - update health
          this.updateVendorHealth(vendor.code, true, responseTime);
          this.metrics.successfulRequests++;
          this.metrics.vendorUsage[vendor.code] = (this.metrics.vendorUsage[vendor.code] || 0) + 1;
          this.metrics.totalResponseTime += Date.now() - startTime;

          if (vendor.priority > 1) {
            this.metrics.switchCount++;
          }

          console.log(`✅ [VendorManager] Success with ${vendor.code} in ${responseTime}ms`);

          return {
            ...result,
            vendor: vendor.code,
            vendorReference: result.vendorReference,
            vendorSwitched: vendor.priority > 1,
            switchedFrom: errors.length > 0 ? errors.map((e) => e.vendor) : [],
          };
        } else {
          // Vendor returned failure
          const errorMsg = result.error || "Unknown error";
          errors.push({ vendor: vendor.code, error: errorMsg });
          
          // Track failure reason
          const vendorHealth = this.vendors.find(v => v.code === vendor.code);
          if (vendorHealth) {
            vendorHealth.failureReasons.push(errorMsg);
            if (vendorHealth.failureReasons.length > 10) {
              vendorHealth.failureReasons.shift();
            }
          }
          
          this.updateVendorHealth(vendor.code, false);
          this.metrics.vendorFailures[vendor.code] = (this.metrics.vendorFailures[vendor.code] || 0) + 1;
          
          console.warn(`⚠️ [VendorManager] ${vendor.code} failed: ${errorMsg}`);
        }
      } catch (error: any) {
        // Vendor threw exception or timeout
        const errorMessage = error.message || "Unknown error";
        errors.push({ vendor: vendor.code, error: errorMessage });
        
        // Track failure reason
        const vendorHealth = this.vendors.find(v => v.code === vendor.code);
        if (vendorHealth) {
          vendorHealth.failureReasons.push(errorMessage);
          if (vendorHealth.failureReasons.length > 10) {
            vendorHealth.failureReasons.shift();
          }
        }
        
        this.updateVendorHealth(vendor.code, false);
        this.metrics.vendorFailures[vendor.code] = (this.metrics.vendorFailures[vendor.code] || 0) + 1;
        
        console.error(`❌ [VendorManager] ${vendor.code} error:`, errorMessage);
      }
    }

    // All vendors failed
    this.metrics.failedRequests++;
    this.metrics.totalResponseTime += Date.now() - startTime;

    console.error(`❌ [VendorManager] All vendors failed:`, errors);

    return {
      success: false,
      error: `Unable to process transaction. ${errors.map((e) => `${e.vendor}: ${e.error}`).join("; ")}`,
      vendorErrors: errors,
    };
  }

  // ---- DATA ----

  async buyData(params: DataParams, userId: string): Promise<PurchaseResult> {
    const errors: Array<{ vendor: string; error: string }> = [];
    const startTime = Date.now();

    this.metrics.totalRequests++;

    const availableVendors = this.vendors
      .filter((v) => v.isAvailable)
      .sort((a, b) => a.priority - b.priority);

    for (const vendor of availableVendors) {
      try {
        console.log(`🔍 [VendorManager] Trying ${vendor.code} for data purchase...`);

        const vendorStartTime = Date.now();
        const service = getVendorService(vendor.code);

        const result = await this.executeWithTimeout(() =>
          service.buyData(params, userId)
        );

        const responseTime = Date.now() - vendorStartTime;

        if (result.success) {
          this.updateVendorHealth(vendor.code, true, responseTime);
          this.metrics.successfulRequests++;
          this.metrics.vendorUsage[vendor.code] = (this.metrics.vendorUsage[vendor.code] || 0) + 1;

          if (vendor.priority > 1) {
            this.metrics.switchCount++;
          }

          return {
            ...result,
            vendor: vendor.code,
            vendorReference: result.vendorReference,
            vendorSwitched: vendor.priority > 1,
            switchedFrom: errors.length > 0 ? errors.map((e) => e.vendor) : [],
          };
        } else {
          errors.push({ vendor: vendor.code, error: result.error || "Unknown error" });
          this.updateVendorHealth(vendor.code, false);
        }
      } catch (error: any) {
        errors.push({ vendor: vendor.code, error: error.message });
        this.updateVendorHealth(vendor.code, false);
      }
    }

    this.metrics.failedRequests++;

    return {
      success: false,
      error: `Unable to process data purchase. ${errors.map((e) => `${e.vendor}: ${e.error}`).join("; ")}`,
      vendorErrors: errors,
    };
  }

  // ---- ELECTRICITY ----

  async buyElectricity(params: ElectricityParams, userId: string): Promise<PurchaseResult> {
    const errors: Array<{ vendor: string; error: string }> = [];
    const startTime = Date.now();

    this.metrics.totalRequests++;

    const availableVendors = this.vendors
      .filter((v) => v.isAvailable)
      .sort((a, b) => a.priority - b.priority);

    for (const vendor of availableVendors) {
      try {
        console.log(`🔍 [VendorManager] Trying ${vendor.code} for electricity purchase...`);

        const vendorStartTime = Date.now();
        const service = getVendorService(vendor.code);

        const result = await this.executeWithTimeout(() =>
          service.buyElectricity(params, userId)
        );

        const responseTime = Date.now() - vendorStartTime;

        if (result.success) {
          this.updateVendorHealth(vendor.code, true, responseTime);
          this.metrics.successfulRequests++;
          this.metrics.vendorUsage[vendor.code] = (this.metrics.vendorUsage[vendor.code] || 0) + 1;

          if (vendor.priority > 1) {
            this.metrics.switchCount++;
          }

          return {
            ...result,
            vendor: vendor.code,
            vendorReference: result.vendorReference,
            vendorSwitched: vendor.priority > 1,
            switchedFrom: errors.length > 0 ? errors.map((e) => e.vendor) : [],
          };
        } else {
          errors.push({ vendor: vendor.code, error: result.error || "Unknown error" });
          this.updateVendorHealth(vendor.code, false);
        }
      } catch (error: any) {
        errors.push({ vendor: vendor.code, error: error.message });
        this.updateVendorHealth(vendor.code, false);
      }
    }

    this.metrics.failedRequests++;

    return {
      success: false,
      error: `Unable to process electricity purchase. ${errors.map((e) => `${e.vendor}: ${e.error}`).join("; ")}`,
      vendorErrors: errors,
    };
  }

  // ---- CABLE TV ----

  async buyCable(params: CableParams, userId: string): Promise<PurchaseResult> {
    const errors: Array<{ vendor: string; error: string }> = [];
    const startTime = Date.now();

    this.metrics.totalRequests++;

    const availableVendors = this.vendors
      .filter((v) => v.isAvailable)
      .sort((a, b) => a.priority - b.priority);

    for (const vendor of availableVendors) {
      try {
        console.log(`🔍 [VendorManager] Trying ${vendor.code} for cable purchase...`);

        const vendorStartTime = Date.now();
        const service = getVendorService(vendor.code);

        const result = await this.executeWithTimeout(() =>
          service.buyCable(params, userId)
        );

        const responseTime = Date.now() - vendorStartTime;

        if (result.success) {
          this.updateVendorHealth(vendor.code, true, responseTime);
          this.metrics.successfulRequests++;
          this.metrics.vendorUsage[vendor.code] = (this.metrics.vendorUsage[vendor.code] || 0) + 1;

          if (vendor.priority > 1) {
            this.metrics.switchCount++;
          }

          return {
            ...result,
            vendor: vendor.code,
            vendorReference: result.vendorReference,
            vendorSwitched: vendor.priority > 1,
            switchedFrom: errors.length > 0 ? errors.map((e) => e.vendor) : [],
          };
        } else {
          errors.push({ vendor: vendor.code, error: result.error || "Unknown error" });
          this.updateVendorHealth(vendor.code, false);
        }
      } catch (error: any) {
        errors.push({ vendor: vendor.code, error: error.message });
        this.updateVendorHealth(vendor.code, false);
      }
    }

    this.metrics.failedRequests++;

    return {
      success: false,
      error: `Unable to process cable purchase. ${errors.map((e) => `${e.vendor}: ${e.error}`).join("; ")}`,
      vendorErrors: errors,
    };
  }

  // ============================================================
  // ADMIN & MONITORING METHODS
  // ============================================================

  getVendorStatus() {
    return this.vendors.map((vendor) => ({
      code: vendor.code,
      priority: vendor.priority,
      isAvailable: vendor.isAvailable,
      consecutiveFailures: vendor.consecutiveFailures,
      averageResponseTime: vendor.averageResponseTime,
      totalRequests: vendor.totalRequests,
      successRate: vendor.totalRequests > 0
        ? ((vendor.successfulRequests / vendor.totalRequests) * 100).toFixed(2) + "%"
        : "N/A",
      lastFailure: vendor.lastFailure,
      failureReasons: vendor.failureReasons.slice(-3), // Last 3 failures
    }));
  }

  getMetrics() {
    const totalTime = this.metrics.totalRequests > 0
      ? this.metrics.totalResponseTime / this.metrics.totalRequests
      : 0;

    return {
      ...this.metrics,
      successRate: this.metrics.totalRequests > 0
        ? ((this.metrics.successfulRequests / this.metrics.totalRequests) * 100).toFixed(2) + "%"
        : "N/A",
      switchRate: this.metrics.totalRequests > 0
        ? ((this.metrics.switchCount / this.metrics.totalRequests) * 100).toFixed(2) + "%"
        : "N/A",
      averageResponseTime: totalTime.toFixed(0) + "ms",
      vendorBreakdown: this.vendors.map((v) => ({
        code: v.code,
        usage: this.metrics.vendorUsage[v.code] || 0,
        failures: this.metrics.vendorFailures[v.code] || 0,
      })),
    };
  }

  resetVendorHealth(code: string) {
    const vendor = this.vendors.find((v) => v.code === code);
    if (vendor) {
      vendor.isAvailable = true;
      vendor.consecutiveFailures = 0;
      vendor.lastFailure = null;
      vendor.failureReasons = [];
      console.log(`🔄 [VendorManager] Manually reset health for ${code}`);
      return true;
    }
    return false;
  }

  setVendorPriority(code: string, priority: number) {
    const vendor = this.vendors.find((v) => v.code === code);
    if (vendor) {
      vendor.priority = priority;
      // Re-sort vendors
      this.vendors.sort((a, b) => a.priority - b.priority);
      console.log(`📊 [VendorManager] ${code} priority set to ${priority}`);
      return true;
    }
    return false;
  }

  // Cleanup
  destroy() {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
    }
    console.log(`🔄 [VendorManager] Destroyed`);
  }
}

// ============================================================
// SINGLETON EXPORT
// ============================================================

let vendorManagerInstance: VendorManager | null = null;

export function getVendorManager(): VendorManager {
  if (!vendorManagerInstance) {
    vendorManagerInstance = new VendorManager();
  }
  return vendorManagerInstance;
}

export const vendorManager = getVendorManager();