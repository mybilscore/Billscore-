// src/lib/vendors/vtpass.config.ts

import { VtuVendor, VendorAuthType } from './types';
import { VtuType } from '@prisma/client';

export interface VTPassConfig {
  id: string;
  name: string;
  code: VtuVendor;
  apiBaseUrl: string;
  authType: VendorAuthType;
  authConfig: {
    authMethod: 'basic' | 'apikey' | 'headerkey';
    apiKey?: string;
    secretKey?: string;
    publicKey?: string;
    username?: string;
    password?: string;
  };
  priority: number;
  supportedServices: VtuType[];
  isActive: boolean;
  timeout: number;
  maxRetries: number;
  retryDelay: number;
}

export function createVTPassSandboxConfig(): VTPassConfig {
  const apiKey = process.env.VTPASS_SANDBOX_API_KEY;
  const secretKey = process.env.VTPASS_SANDBOX_SECRET_KEY;
  const publicKey = process.env.VTPASS_SANDBOX_PUBLIC_KEY;
  
  // ✅ Use /api as base (endpoints will be appended)
  const rawApiUrl = process.env.VTPASS_SANDBOX_API_URL || 'https://sandbox.vtpass.com/api';
  const apiBaseUrl = rawApiUrl.replace(/\/$/, ''); // Remove trailing slash

  console.log(`🔧 [VTPassConfig] API Base URL: ${apiBaseUrl}`);
  console.log(`🔧 [VTPassConfig] API Key set: ${!!apiKey}`);
  console.log(`🔧 [VTPassConfig] Secret Key set: ${!!secretKey}`);
  console.log(`🔧 [VTPassConfig] Public Key set: ${!!publicKey}`);

  return {
    id: 'vtpass-sandbox-001',
    name: 'VTpass Sandbox',
    code: VtuVendor.VTPASS,
    apiBaseUrl: apiBaseUrl,
    authType: VendorAuthType.API_KEY,
    authConfig: {
      authMethod: 'apikey',
      apiKey: apiKey || '',
      secretKey: secretKey || '',
      publicKey: publicKey || '',
    },
    priority: 1,
    supportedServices: [
      VtuType.AIRTIME,
      VtuType.DATA,
      VtuType.ELECTRICITY_INSTANT,
      VtuType.CABLE_TV,
    ],
    isActive: true,
    timeout: 30000,
    maxRetries: 3,
    retryDelay: 1000,
  };
}

export function createVTPassLiveConfig(): VTPassConfig {
  const apiKey = process.env.VTPASS_LIVE_API_KEY;
  const secretKey = process.env.VTPASS_LIVE_SECRET_KEY;
  const publicKey = process.env.VTPASS_LIVE_PUBLIC_KEY;
  
  const rawApiUrl = process.env.VTPASS_LIVE_API_URL || 'https://vtpass.com/api';
  const apiBaseUrl = rawApiUrl.replace(/\/$/, '');

  return {
    id: 'vtpass-live-001',
    name: 'VTpass Live',
    code: VtuVendor.VTPASS,
    apiBaseUrl: apiBaseUrl,
    authType: VendorAuthType.API_KEY,
    authConfig: {
      authMethod: 'apikey',
      apiKey: apiKey || '',
      secretKey: secretKey || '',
      publicKey: publicKey || '',
    },
    priority: 1,
    supportedServices: [
      VtuType.AIRTIME,
      VtuType.DATA,
      VtuType.ELECTRICITY_INSTANT,
      VtuType.CABLE_TV,
    ],
    isActive: true,
    timeout: 30000,
    maxRetries: 3,
    retryDelay: 1000,
  };
}

export function createVTPassConfig(): VTPassConfig {
  const isProduction = process.env.NODE_ENV === 'production';
  console.log(`🔧 [VTPassConfig] Environment: ${isProduction ? 'production' : 'development'}`);
  
  if (isProduction) {
    return createVTPassLiveConfig();
  }
  
  return createVTPassSandboxConfig();
}