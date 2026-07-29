// lib/vendors/vendor.factory.ts

import { BaseVendor } from './base.vendor';
import { VTPassVendor } from './vtpass.vendor';
import { LegitDatawayVendor } from './legitdataway.vendor';
import { BilalSadaVendor } from './bilalsada.vendor';
import {
  VendorConfig,
  VendorAuthType,
  VtuVendor,
} from './types';
import { VtuType, Vendor as PrismaVendor } from '@prisma/client';

// ✅ Cache for created vendors
const vendorCache = new Map<string, BaseVendor>();

// biome-ignore lint/complexity/noStaticOnlyClass: <explanation>
export class VendorFactory {
  private static vendors: Map<VtuVendor, typeof BaseVendor> = new Map([
    [VtuVendor.VTPASS, VTPassVendor],
    [VtuVendor.BILAL_SADA, BilalSadaVendor],
    // Map LEGITDATAWAY to BilalSadaVendor since it's using the same implementation
  ]);

  static createVendorFromPrisma(vendor: PrismaVendor): BaseVendor {
    const cacheKey = `${vendor.code}:${vendor.id}`;
    
    // ✅ Check cache first
    if (vendorCache.has(cacheKey)) {
      console.log(`✅ [VendorFactory] Returning cached vendor: ${vendor.code}`);
      return vendorCache.get(cacheKey)!;
    }

    console.log(`🔧 [VendorFactory] Creating vendor from Prisma: ${vendor.code}`);
    
    // Handle LEGITDATAWAY as a simulation vendor
    if (vendor.code === 'LEGITDATAWAY' || vendor.code === 'SIMULATION') {
      const config: VendorConfig = {
        id: vendor.id,
        name: vendor.name,
        code: vendor.code as VtuVendor,
        apiBaseUrl: vendor.apiBaseUrl,
        authType: vendor.authType as VendorAuthType,
        authConfig: vendor.authConfig as Record<string, any> || {},
        priority: vendor.priority,
        supportedServices: vendor.supportedServices as VtuType[] || [],
        isActive: vendor.status === 'ACTIVE',
        timeout: 30000,
        maxRetries: 3,
        retryDelay: 1000,
      };
      
      // Use BilalSadaVendor for LEGITDATAWAY (same implementation)
      const vendorInstance = new BilalSadaVendor(config);
      vendorCache.set(cacheKey, vendorInstance);
      console.log(`✅ [VendorFactory] Cached LEGITDATAWAY vendor as BilalSadaVendor`);
      return vendorInstance;
    }
    
    const VendorClass = this.vendors.get(vendor.code as VtuVendor);
    
    if (!VendorClass) {
      throw new Error(`Vendor ${vendor.code} not supported`);
    }

    const config: VendorConfig = {
      id: vendor.id,
      name: vendor.name,
      code: vendor.code as VtuVendor,
      apiBaseUrl: vendor.apiBaseUrl,
      authType: vendor.authType as VendorAuthType,
      authConfig: vendor.authConfig as Record<string, any> || {},
      priority: vendor.priority,
      supportedServices: vendor.supportedServices as VtuType[] || [],
      isActive: vendor.status === 'ACTIVE',
      timeout: 30000,
      maxRetries: 3,
      retryDelay: 1000,
    };

    const vendorInstance = new VendorClass(config);
    vendorCache.set(cacheKey, vendorInstance);
    console.log(`✅ [VendorFactory] Vendor created and cached: ${vendor.code} (${vendor.name})`);
    return vendorInstance;
  }

  static getSupportedVendors(): VtuVendor[] {
    // biome-ignore lint/complexity/noThisInStatic: <explanation>
    return Array.from(this.vendors.keys());
  }

  // ✅ Clear cache (for testing)
  static clearCache() {
    vendorCache.clear();
    console.log('🗑️ [VendorFactory] Cache cleared');
  }
}