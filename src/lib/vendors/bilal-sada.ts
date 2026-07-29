// lib/vendors/vendors/bilal-sada.ts

import { VendorService } from "../vendor.service";
import { AirtimeParams, DataParams, ElectricityParams, CableParams, PurchaseResult } from "../vendor.manager";

export class BilalSadaService implements VendorService {
  async buyAirtime(params: AirtimeParams, userId: string): Promise<PurchaseResult> {
    // Your existing BilalSada airtime purchase logic
    // Make sure to return PurchaseResult with proper structure
    
    try {
      // Your implementation here
      const result = await fetch('https://api.bilalsada.com/airtime', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.BILAL_SADA_API_KEY}`,
        },
        body: JSON.stringify({
          phone: params.phoneNumber,
          amount: params.amount,
          network: params.network,
        }),
      });

      const data = await result.json();

      if (data.status === 'success') {
        return {
          success: true,
          vendorReference: data.transactionId,
          data: data,
        };
      } else {
        return {
          success: false,
          error: data.message || 'BilalSada purchase failed',
        };
      }
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'BilalSada service error',
      };
    }
  }

  async buyData(params: DataParams, userId: string): Promise<PurchaseResult> {
    // Your existing implementation
    return { success: true, vendorReference: 'DATA-123' };
  }

  async buyElectricity(params: ElectricityParams, userId: string): Promise<PurchaseResult> {
    // Your existing implementation
    return { success: true, vendorReference: 'ELEC-123' };
  }

  async buyCable(params: CableParams, userId: string): Promise<PurchaseResult> {
    // Your existing implementation
    return { success: true, vendorReference: 'CABLE-123' };
  }

  async checkHealth(): Promise<boolean> {
    // Optional: Check if vendor API is responding
    try {
      const response = await fetch('https://api.bilalsada.com/health', {
        signal: AbortSignal.timeout(5000),
      });
      return response.ok;
    } catch {
      return false;
    }
  }
}