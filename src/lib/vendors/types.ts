// src/lib/vendors/types.ts

import { VtuVendor, VtuType, VendorAuthType } from '@prisma/client';

export { VtuVendor, VtuType, VendorAuthType };

export interface VendorConfig {
  id: string;
  name: string;
  code: VtuVendor;
  apiBaseUrl: string;
  authType: VendorAuthType;
  authConfig: Record<string, any>;
  priority: number;
  supportedServices: VtuType[];
  isActive: boolean;
  timeout: number;
  maxRetries: number;
  retryDelay: number;
}

export interface VendorRequest<T = any> {
  service: VtuType;
  endpoint: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  data?: T;
  headers?: Record<string, string>;
  params?: Record<string, string>;
}

// ✅ Enhanced with switching info
export interface VendorResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  statusCode: number;
  vendor: VtuVendor;
  vendorReference?: string;
  vendorSwitched?: boolean;      // ✅ New: Was vendor switched?
  switchedFrom?: VtuVendor[];    // ✅ New: Which vendors failed?
  rawResponse?: any;
  metadata?: Record<string, any>;
}

export interface VendorAirtimeRequest {
  phoneNumber: string;
  amount: number;
  network: string;
}

export interface VendorDataRequest {
  phoneNumber: string;
  planCode: string;
  network: string;
  amount?: number;
}

export interface VendorElectricityRequest {
  meterNumber: string;
  amount: number;
  discoCode: string;
  meterType?: 'PREPAID' | 'POSTPAID';
}

export interface VendorCableTVRequest {
  decoderNumber: string;
  packageCode: string;
  provider: string;
  amount?: number;
}