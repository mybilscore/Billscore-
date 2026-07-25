// src/lib/vendors/vendor.factory.ts

import { BaseVendor } from './base.vendor';
import { VTPassVendor } from './vtpass.vendor';
import { LegitDatawayVendor } from './legitdataway.vendor';
import {
  VendorConfig,
  VendorAuthType,
  VtuVendor,
} from './types';
import { VtuType, Vendor as PrismaVendor } from '@prisma/client';

export class VendorFactory {
  private static vendors: Map<VtuVendor, typeof BaseVendor> = new Map([
    [VtuVendor.VTPASS, VTPassVendor],
    // [VtuVendor.QUICKTELLER, QuicktellerVendor],
    // [VtuVendor.MONIEPOINT, MoniepointVendor],
    // [VtuVendor.FLUTTERWAVE_VTU, FlutterwaveVendor],
  ]);

  // Add a method to use LegitDataway as a simulation vendor
  static createSimulationVendor(config: VendorConfig): BaseVendor {
    console.log(`🔧 [VendorFactory] Creating simulation vendor: LegitDataway`);
    return new LegitDatawayVendor(config);
  }

  static createVendorFromPrisma(vendor: PrismaVendor): BaseVendor {
    console.log(`🔧 [VendorFactory] Creating vendor from Prisma: ${vendor.code}`);
    
    // Check if this is a simulation vendor
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
      return new LegitDatawayVendor(config);
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

    console.log(`✅ [VendorFactory] Vendor created: ${vendor.code} (${vendor.name})`);
    return new VendorClass(config);
  }

  static createVendor(vendorCode: VtuVendor, config: VendorConfig): BaseVendor {
    console.log(`🔧 [VendorFactory] Creating vendor: ${vendorCode}`);
    
    const VendorClass = this.vendors.get(vendorCode);
    
    if (!VendorClass) {
      throw new Error(`Vendor ${vendorCode} not supported`);
    }

    return new VendorClass(config);
  }

  static getSupportedVendors(): VtuVendor[] {
    return Array.from(this.vendors.keys());
  }
}