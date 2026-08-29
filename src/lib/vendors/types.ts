// src/lib/vendors/types.ts

import { VtuType, NetworkProvider } from '@prisma/client';

// ============================================================
// ✅ ADD THIS - VtuVendor Enum
// ============================================================
export enum VtuVendor {
  VTPASS = 'VTPASS',
  BILAL_SADA = 'BILAL_SADA',
  GIDIGITAL = 'GIDIGITAL',
  MONIEPOINT = 'MONIEPOINT',
  FLUTTERWAVE_VTU = 'FLUTTERWAVE_VTU',
  QUICKTELLER = 'QUICKTELLER',
}

// ============================================================
// VENDOR TYPES
// ============================================================

export interface VendorConfig {
  id: string;
  name: string;
  code: string;
  apiBaseUrl: string;
  authType: VendorAuthType;
  authConfig: Record<string, any>;
  priority: number;
  isActive: boolean;
  timeout: number;
  maxRetries: number;
  retryDelay: number;
}

export enum VendorAuthType {
  API_KEY = 'API_KEY',
  BEARER_TOKEN = 'BEARER_TOKEN',
  BASIC_AUTH = 'BASIC_AUTH',
  OAUTH2 = 'OAUTH2',
  NONE = 'NONE',
}

export interface VendorRequest<T = any> {
  service: VtuType;
  endpoint: string;
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  data?: T;
  headers?: Record<string, string>;
  retryCount?: number;
}

export interface VendorResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  statusCode?: number;
  vendor?: VtuVendor | string;
  vendorReference?: string;
  rawResponse?: any;
  metadata?: Record<string, any>;
  vendorSwitched?: boolean;
  switchedFrom?: string[];
  vendorErrors?: string[];
}

// ============================================================
// REQUEST TYPES
// ============================================================

export interface VendorAirtimeRequest {
  phoneNumber: string;
  network: string;
  amount: number;
  planType?: string;
  bypass?: boolean;
}

export interface VendorDataRequest {
  phoneNumber: string;
  network: string;
  planCode: string;
  amount?: number;
  bypass?: boolean;
}

export interface VendorElectricityRequest {
  meterNumber: string;
  discoCode: string;
  meterType: string;
  amount: number;
  bypass?: boolean;
}

export interface VendorCableTVRequest {
  decoderNumber: string;
  provider: string;
  packageCode: string;
  bypass?: boolean;
}

export interface VendorEducationRequest {
  serviceId: string;
  variationCode: string;
  quantity?: number;
  bypass?: boolean;
}

// ============================================================
// VENDOR HEALTH
// ============================================================

export interface VendorHealth {
  status: 'healthy' | 'degraded' | 'unhealthy';
  responseTime: number;
  lastCheck: Date;
  error?: string;
}