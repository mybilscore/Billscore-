// src/lib/vendors/bilalsada.vendor.ts

import { BaseVendor } from './base.vendor';
import {
  VendorConfig,
  VendorRequest,
  VendorResponse,
  VendorAuthType,
  VtuVendor,
} from './types';
import { VtuType, NetworkProvider, PlanType, ValidityUnit, PlanStatus } from '@prisma/client';
import { prisma } from "~/lib/db";

// Types
interface BilalSadaAuthConfig {
  username: string;
  password: string;
  accessToken?: string;
  tokenExpiry?: Date;
}

interface BilalSadaAuthResponse {
  status: string;
  AccessToken: string;
  balance: string;
  username: string;
}

interface BilalSadaDataRequest {
  network: number;
  phone: string;
  data_plan: number;
  bypass: boolean;
  "request-id": string;
}

interface BilalSadaAirtimeRequest {
  network: number;
  phone: string;
  plan_type: string;
  amount: number;
  bypass: boolean;
  "request-id": string;
}

interface BilalSadaElectricityRequest {
  disco: number;
  meter_type: string;
  meter_number: string;
  amount: number;
  bypass: boolean;
  "request-id": string;
}

interface BilalSadaCableRequest {
  cablename: string;
  cableplan: string;
  smart_card_number: string;
  "request-id": string;
}

interface BilalSadaDataResponse {
  network: string;
  "request-id": string;
  amount: string;
  dataplan: string;
  status: string;
  message: string;
  response: string;
  phone_number: string;
  oldbal: string;
  newbal: number;
  system: string;
  plan_type: string;
  wallet_vending: string;
}

interface BilalSadaAirtimeResponse {
  network: string;
  "request-id": string;
  amount: number;
  discount: number;
  status: string;
  message: string;
  phone_number: string;
  oldbal: string;
  newbal: number;
  system: string;
  plan_type: string;
  wallet_vending: string;
}

interface BilalSadaElectricityResponse {
  disco_name: string;
  "request-id": string;
  amount: number;
  charges: number;
  status: string;
  message: string;
  meter_number: string;
  meter_type: string;
  oldbal: string;
  newbal: number;
  system: string;
  token: string;
  wallet_vending: string;
}

interface BilalSadaCableResponse {
  cablename: string;
  cableplan: string;
  amount: number;
  status: string;
  message: string;
  smart_card_number: string;
  "request-id": string;
  oldbal: number;
  newbal: number;
  system: string;
}

// Cache entry interface
interface CacheEntry {
  vendorPlanId: string;
  networkCode: number;
  timestamp: number;
}

export class BilalSadaVendor extends BaseVendor {
  private authConfig: BilalSadaAuthConfig;
  private accessToken: string | null = null;
  private tokenExpiry: Date | null = null;
  
  // Cache for database plan lookups
  private planCache: Map<string, CacheEntry> = new Map();
  private cacheTTL: number = 60000; // 1 minute cache

  // ✅ Vendor-specific network mapping (only for this vendor)
  private readonly VENDOR_NETWORK_MAP: Record<string, number> = {
    'MTN': 1,
    'GLO': 3,
    'AIRTEL': 2,
    '9MOBILE': 4,
  };

  // ✅ Vendor-specific disco mapping
  private readonly VENDOR_DISCO_MAP: Record<string, number> = {
    'IKEJA': 1,
    'EKO': 2,
    'KANO': 3,
    'PORT_HARCOURT': 4,
    'JOS': 5,
    'IBADAN': 6,
    'KADUNA': 7,
    'ABUJA': 8,
  };

  // ✅ Vendor-specific cable mapping
  private readonly VENDOR_CABLE_MAP: Record<string, string> = {
    'GOTV': 'gotv',
    'DSTV': 'dstv',
    'STARTIMES': 'startimes',
  };

  constructor(config: VendorConfig) {
    super({
      ...config,
      authType: VendorAuthType.BEARER_TOKEN,
      authConfig: config.authConfig,
    });
    
    this.authConfig = config.authConfig as BilalSadaAuthConfig;
    console.log(`✅ [BilalSadaVendor] Initialized with username: ${this.authConfig.username}`);
    console.log(`✅ [BilalSadaVendor] API Base URL: ${config.apiBaseUrl}`);
    console.log(`✅ [BilalSadaVendor] Vendor ID: ${config.id}`);
  }

  // ============================================================
  // AUTHENTICATION
  // ============================================================

  async authenticate(): Promise<Record<string, string>> {
    // Check if we have a valid token
    if (this.accessToken && this.tokenExpiry && this.tokenExpiry > new Date()) {
      console.log(`🔑 [BilalSadaVendor] Using cached token: ${this.accessToken.substring(0, 10)}...`);
      return {
        'Authorization': `Token ${this.accessToken}`,
        'Content-Type': 'application/json',
      };
    }

    console.log(`🔑 [BilalSadaVendor] Obtaining new token...`);
    
    // BilalSada uses Basic Auth for authentication
    const authString = `${this.authConfig.username}:${this.authConfig.password}`;
    const encodedAuth = Buffer.from(authString).toString('base64');

    try {
      // In simulation mode, we'll simulate the API response
      // In real mode, this would make an actual API call to BilalSada
      const simulatedResponse: BilalSadaAuthResponse = {
        status: 'success',
        AccessToken: `bilal-token-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`,
        balance: '100000.00',
        username: this.authConfig.username,
      };

      console.log(`🔑 [BilalSadaVendor] Simulating auth request to: ${this.config.apiBaseUrl}/api/user`);
      
      // In production, you would make a real fetch call:
      // const response = await fetch(`${this.config.apiBaseUrl}/api/user`, {
      //   method: 'POST',
      //   headers: {
      //     'Authorization': `Basic ${encodedAuth}`,
      //     'Content-Type': 'application/json',
      //   },
      // });
      // const data = await response.json();

      const data = simulatedResponse;

      if (data.status === 'success' && data.AccessToken) {
        this.accessToken = data.AccessToken;
        this.tokenExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
        console.log(`✅ [BilalSadaVendor] Token obtained: ${this.accessToken.substring(0, 10)}...`);
        
        return {
          'Authorization': `Token ${this.accessToken}`,
          'Content-Type': 'application/json',
        };
      }

      throw new Error('Authentication failed: No access token received');
    } catch (error: any) {
      console.error(`❌ [BilalSadaVendor] Authentication failed:`, error.message);
      throw new Error(`Authentication failed: ${error.message}`);
    }
  }

  // ============================================================
  // REQUEST TRANSFORMATION
  // ============================================================

  async transformRequest<T>(request: VendorRequest<T>): Promise<any> {
    console.log(`🔄 [BilalSadaVendor] Transforming request for: ${request.service}`);
    console.log(`🔄 [BilalSadaVendor] Original data:`, JSON.stringify(request.data, null, 2));
    
    let transformedData;
    
    switch (request.service) {
      case VtuType.AIRTIME:
        transformedData = this.transformAirtimeRequest(request.data);
        break;
      case VtuType.DATA:
        transformedData = await this.transformDataRequest(request.data);
        break;
      case VtuType.ELECTRICITY_INSTANT:
        transformedData = this.transformElectricityRequest(request.data);
        break;
      case VtuType.CABLE_TV:
        transformedData = this.transformCableTVRequest(request.data);
        break;
      default:
        console.warn(`⚠️ [BilalSadaVendor] Unknown service type: ${request.service}`);
        transformedData = request.data;
    }
    
    console.log(`🔄 [BilalSadaVendor] Transformed data:`, JSON.stringify(transformedData, null, 2));
    return transformedData;
  }

  // ============================================================
  // AIRTIME TRANSFORMATION
  // ============================================================

  private transformAirtimeRequest(data: any): BilalSadaAirtimeRequest {
    console.log(`📱 [BilalSadaVendor] Airtime request:`, data);
    
    const networkMap: Record<string, number> = {
      'MTN': 1,
      'GLO': 3,
      'AIRTEL': 2,
      '9MOBILE': 4,
    };

    return {
      network: networkMap[data.network] || 1,
      phone: data.phoneNumber,
      plan_type: 'VTU',
      amount: data.amount,
      bypass: false,
      'request-id': this.generateRequestId('Airtime'),
    };
  }

  // ============================================================
  // DATA TRANSFORMATION (VENDOR-AGNOSTIC LOOKUP)
  // ============================================================

  private async transformDataRequest(data: any): Promise<BilalSadaDataRequest> {
    console.log(`📊 [BilalSadaVendor] Data request:`, data);
    
    let networkCode = 1;
    let planId = 1;

    // ✅ Always try database first
    if (data.planCode && data.network) {
      const cacheKey = `${data.network}_${data.planCode}`;
      
      // Check cache
      const cached = this.planCache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < this.cacheTTL) {
        networkCode = cached.networkCode;
        planId = parseInt(cached.vendorPlanId) || 1;
        console.log(`✅ [BilalSadaVendor] Using cached plan: ${data.planCode} -> ${planId}`);
        return this.buildDataRequest(data, networkCode, planId);
      }

      try {
        // ✅ Query database using vendor-agnostic fields
        const plan = await prisma.dataPlan.findFirst({
          where: {
            vendorId: this.config.id, // Use this vendor's ID
            OR: [
              { name: data.planCode },
              { vendorPlanId: data.planCode },
            ],
            network: data.network as NetworkProvider,
            isActive: true,
          },
          select: {
            vendorPlanId: true,
            vendorNetworkCode: true,
          },
        });

        if (plan && plan.vendorPlanId) {
          planId = parseInt(plan.vendorPlanId) || 1;
          networkCode = parseInt(plan.vendorNetworkCode || '1') || 1;
          
          // Cache the result
          this.planCache.set(cacheKey, {
            vendorPlanId: plan.vendorPlanId,
            networkCode,
            timestamp: Date.now(),
          });
          
          console.log(`✅ [BilalSadaVendor] Found plan in DB: ${data.planCode} -> ${planId}`);
          return this.buildDataRequest(data, networkCode, planId);
        }
      } catch (error) {
        console.error(`❌ [BilalSadaVendor] DB lookup error:`, error);
      }
    }

    // ✅ Fallback to hardcoded mapping
    console.log(`⚠️ [BilalSadaVendor] Using fallback mapping for: ${data.network} ${data.planCode}`);
    const result = this.getDataPlanFromFallback(data.network, data.planCode);
    return this.buildDataRequest(data, result.networkCode, result.planId);
  }

  private buildDataRequest(data: any, networkCode: number, planId: number): BilalSadaDataRequest {
    return {
      network: networkCode,
      phone: data.phoneNumber,
      data_plan: planId,
      bypass: false,
      'request-id': this.generateRequestId('Data'),
    };
  }

  // ============================================================
  // FALLBACK MAPPING (VENDOR-SPECIFIC)
  // ============================================================

  private getDataPlanFromFallback(network: string, planCode: string): { networkCode: number; planId: number } {
    const networkCode = this.VENDOR_NETWORK_MAP[network] || 1;
    
    // Hardcoded mapping for this vendor only
    const fallbackMap: Record<string, Record<string, number>> = {
      'MTN': { '500MB': 1, '1GB': 2, '2GB': 3, '5GB': 4 },
      'GLO': { '500MB': 220, '1GB': 221, '3GB': 224, '5GB': 227 },
      'AIRTEL': { '500MB': 15, '1GB': 16, '2GB': 17, '5GB': 18 },
      '9MOBILE': { '500MB': 70, '1GB': 71, '2GB': 72, '5GB': 73 },
    };

    let planId = 1;
    const vendorMap = fallbackMap[network];
    if (vendorMap) {
      // Try exact match first
      if (vendorMap[planCode]) {
        planId = vendorMap[planCode];
      } else {
        // Try partial match
        const keys = Object.keys(vendorMap);
        for (const key of keys) {
          if (planCode.includes(key) || key.includes(planCode)) {
            planId = vendorMap[key];
            break;
          }
        }
      }
    }

    console.log(`📊 [BilalSadaVendor] Fallback: ${network} ${planCode} -> ${planId}`);
    return { networkCode, planId };
  }

  // ============================================================
  // ELECTRICITY TRANSFORMATION
  // ============================================================

  private transformElectricityRequest(data: any): BilalSadaElectricityRequest {
    console.log(`⚡ [BilalSadaVendor] Electricity request:`, data);
    
    return {
      disco: this.VENDOR_DISCO_MAP[data.discoCode] || 1,
      meter_type: data.meterType || 'prepaid',
      meter_number: data.meterNumber,
      amount: data.amount,
      bypass: false,
      'request-id': this.generateRequestId('Bill'),
    };
  }

  // ============================================================
  // CABLE TV TRANSFORMATION
  // ============================================================

  private transformCableTVRequest(data: any): BilalSadaCableRequest {
    console.log(`📺 [BilalSadaVendor] Cable TV request:`, data);
    
    return {
      cablename: this.VENDOR_CABLE_MAP[data.provider] || data.provider.toLowerCase(),
      cableplan: data.packageCode,
      smart_card_number: data.decoderNumber,
      'request-id': this.generateRequestId('Cable'),
    };
  }

  // ============================================================
  // RESPONSE TRANSFORMATION
  // ============================================================

  transformResponse(response: any): VendorResponse {
    console.log(`🔄 [BilalSadaVendor] Transforming response...`);
    console.log(`🔄 [BilalSadaVendor] Raw response:`, JSON.stringify(response, null, 2));
    
    if (response.status === 'success') {
      console.log(`✅ [BilalSadaVendor] Success response`);
      
      return {
        success: true,
        data: {
          transactionId: response['request-id'] || this.generateRequestId('TX'),
          status: 'SUCCESS',
          amount: response.amount || 0,
          token: response.token || '',
          customerName: response.customer_name || '',
          customerAddress: response.customer_address || '',
          units: response.units || '',
          reference: response['request-id'] || '',
          responseDescription: response.message || 'Transaction successful',
          productName: response.dataplan || response.network || response.cableplan || '',
          commission: response.discount || 0,
          totalAmount: response.amount || 0,
        },
        vendor: VtuVendor.BILAL_SADA,
        vendorReference: response['request-id'],
        rawResponse: response,
        metadata: {
          responseCode: '000',
          description: response.message,
          oldBalance: response.oldbal,
          newBalance: response.newbal,
          system: response.system,
        },
      };
    }

    console.warn(`⚠️ [BilalSadaVendor] Error response`);
    
    return {
      success: false,
      error: response.message || 'Transaction failed',
      statusCode: 400,
      vendor: VtuVendor.BILAL_SADA,
      vendorReference: response['request-id'],
      rawResponse: response,
      metadata: {
        responseCode: '999',
        description: response.message || 'Unknown error',
      },
    };
  }

  // ============================================================
  // MAKE REQUEST (OVERRIDE FOR ASYNC TRANSFORM)
  // ============================================================

  protected async makeRequest<T>(request: VendorRequest<T>): Promise<VendorResponse<T>> {
    const startTime = Date.now();
    
    let endpoint = request.endpoint;
    let url = `${this.config.apiBaseUrl}${endpoint}`;
    
    // Map service to correct BilalSada endpoint
    if (request.service === VtuType.AIRTIME) {
      endpoint = '/api/topup';
    } else if (request.service === VtuType.DATA) {
      endpoint = '/api/data';
    } else if (request.service === VtuType.ELECTRICITY_INSTANT) {
      endpoint = '/api/bill';
    } else if (request.service === VtuType.CABLE_TV) {
      endpoint = '/api/cable';
    }
    
    url = `${this.config.apiBaseUrl}${endpoint}`;
    console.log(`🔍 [BilalSadaVendor] Full URL: ${url}`);
    console.log(`🔍 [BilalSadaVendor] Request method: ${request.method}`);
    
    try {
      const headers = await this.authenticate();
      console.log(`🔍 [BilalSadaVendor] Headers:`, JSON.stringify(headers, null, 2));
      
      const transformedData = await this.transformRequest(request);
      console.log(`🔍 [BilalSadaVendor] Request body:`, JSON.stringify(transformedData, null, 2));
      
      // In simulation mode, generate a simulated response
      const simulatedResponse = this.generateSimulatedResponse(request.service, transformedData);
      console.log(`🔍 [BilalSadaVendor] Simulated response:`, JSON.stringify(simulatedResponse, null, 2));
      
      // In production, you would make a real fetch call:
      // const response = await fetch(url, {
      //   method: request.method,
      //   headers: {
      //     'Content-Type': 'application/json',
      //     ...headers,
      //     ...request.headers,
      //   },
      //   body: request.method !== 'GET' ? JSON.stringify(transformedData) : undefined,
      //   signal: AbortSignal.timeout(this.config.timeout || 30000),
      // });
      // const rawResponse = await response.json();
      
      const rawResponse = simulatedResponse;
      const duration = Date.now() - startTime;
      
      const result = this.transformResponse(rawResponse);
      
      result.metadata = {
        ...result.metadata,
        duration,
        endpoint: request.endpoint,
        method: request.method,
        timestamp: new Date().toISOString(),
        statusCode: 200,
        simulation: true,
      };
      
      return result;
    } catch (error: any) {
      console.error(`❌ [BilalSadaVendor] Request failed:`, error);
      const duration = Date.now() - startTime;
      
      return {
        success: false,
        error: error.message || 'Vendor request failed',
        statusCode: error.status || 500,
        vendor: this.config.code,
        metadata: {
          duration,
          error: error.message,
          errorType: error.name || 'UnknownError',
          timestamp: new Date().toISOString(),
        },
      };
    }
  }

  // ============================================================
  // SIMULATED RESPONSE GENERATOR
  // ============================================================

  private generateSimulatedResponse(service: VtuType, request: any): any {
    const requestId = request['request-id'] || this.generateRequestId('SIM');
    const amount = request.amount || 100;
    const phone = request.phone || '07012345678';
    const oldBalance = 100000;
    const newBalance = oldBalance - amount;

    switch (service) {
      case VtuType.AIRTIME:
        return {
          network: this.getNetworkName(request.network),
          'request-id': requestId,
          amount: amount,
          discount: Math.round(amount * 0.03),
          status: 'success',
          message: `Successfully purchased ${this.getNetworkName(request.network)} VTU ₦${amount} for ${phone}`,
          phone_number: phone,
          oldbal: oldBalance.toString(),
          newbal: newBalance,
          system: 'API',
          plan_type: request.plan_type || 'VTU',
          wallet_vending: 'wallet',
        };

      case VtuType.DATA:
        return {
          network: this.getNetworkName(request.network),
          'request-id': requestId,
          amount: amount.toString(),
          dataplan: this.getDataPlanName(request.data_plan),
          status: 'success',
          message: `Yello! You have gifted ${this.getDataPlanName(request.data_plan)} to ${phone}`,
          response: `Yello! You have gifted ${this.getDataPlanName(request.data_plan)} to ${phone}`,
          phone_number: phone,
          oldbal: oldBalance.toString(),
          newbal: newBalance,
          system: 'API',
          plan_type: 'GIFTING',
          wallet_vending: 'wallet',
        };

      case VtuType.ELECTRICITY_INSTANT:
        return {
          disco_name: this.getDiscoName(request.disco),
          'request-id': requestId,
          amount: amount,
          charges: Math.round(amount * 0.07),
          status: 'success',
          message: `Transaction successful ${this.getDiscoName(request.disco)} PREPAID ₦${amount} to ${request.meter_number}`,
          meter_number: request.meter_number,
          meter_type: request.meter_type?.toUpperCase() || 'PREPAID',
          oldbal: oldBalance.toString(),
          newbal: newBalance,
          system: 'API',
          token: `${Math.floor(1000 + Math.random() * 9000)}-${Math.floor(1000 + Math.random() * 9000)}-${Math.floor(1000 + Math.random() * 9000)}-${Math.floor(1000 + Math.random() * 9000)}`,
          wallet_vending: 'wallet',
        };

      case VtuType.CABLE_TV:
        return {
          cablename: request.cablename,
          cableplan: request.cableplan,
          amount: amount,
          status: 'success',
          message: `Successfully subscribed ${request.cablename.toUpperCase()} ${request.cableplan} for Smart Card ${request.smart_card_number}`,
          smart_card_number: request.smart_card_number,
          'request-id': requestId,
          oldbal: oldBalance,
          newbal: newBalance,
          system: 'API',
        };

      default:
        return {
          status: 'success',
          'request-id': requestId,
          amount: amount,
          message: 'Transaction successful',
          oldbal: oldBalance.toString(),
          newbal: newBalance,
          system: 'API',
        };
    }
  }

  // ============================================================
  // PLAN IMPORT (VENDOR-AGNOSTIC)
  // ============================================================

  async importPlans(planStrings: string[], importedBy: string = 'system'): Promise<{
    created: number;
    updated: number;
    errors: string[];
  }> {
    const results = { created: 0, updated: 0, errors: [] as string[] };
    const importBatch = `import_${Date.now()}_${this.config.code}`;

    for (const planString of planStrings) {
      try {
        const parsed = this.parsePlanString(planString);
        if (!parsed) {
          results.errors.push(`Failed to parse: ${planString}`);
          continue;
        }

        // ✅ Use vendor-agnostic fields
        const existing = await prisma.dataPlan.findUnique({
          where: {
            vendorId_vendorPlanId: {
              vendorId: this.config.id,
              vendorPlanId: String(parsed.id),
            },
          },
        });

        const planData = {
          network: parsed.network as NetworkProvider,
          planType: this.parsePlanType(parsed.planType),
          name: parsed.name,
          amountMB: parsed.sizeMB,
          ourPrice: parsed.price,
          vendorPrice: parsed.price,
          validity: parsed.validity.value,
          validityUnit: this.parseValidityUnit(parsed.validity.unit),
          description: parsed.description,
          vendorId: this.config.id,
          vendorPlanId: String(parsed.id),
          vendorNetworkCode: String(this.VENDOR_NETWORK_MAP[parsed.network] || 1),
          vendorPlanType: parsed.planType,
          vendorMetadata: { raw: planString },
          importBatch,
          lastSyncedAt: new Date(),
          isActive: true,
          status: PlanStatus.ACTIVE,
        };

        if (existing) {
          await prisma.dataPlan.update({
            where: { id: existing.id },
            data: {
              ...planData,
              updatedAt: new Date(),
              updatedBy: importedBy,
            },
          });
          results.updated++;
        } else {
          await prisma.dataPlan.create({
            data: {
              ...planData,
              createdBy: importedBy,
            },
          });
          results.created++;
        }
      } catch (error) {
        results.errors.push(`Error importing plan: ${error instanceof Error ? error.message : 'Unknown'}`);
      }
    }

    console.log(`✅ [BilalSadaVendor] Import complete: ${results.created} created, ${results.updated} updated`);
    return results;
  }

  // ============================================================
  // PLAN PARSING HELPERS
  // ============================================================

  private parsePlanString(planString: string): any {
    const parts = planString.split(/\s+/);
    if (parts.length < 6) return null;

    return {
      id: parseInt(parts[0]),
      network: parts[1],
      planType: parts[2],
      name: parts[3],
      price: parseFloat(parts[4].replace(/[₦,]/g, '')),
      validity: this.parseValidity(parts.slice(5).join(' ')),
      sizeMB: this.parseSizeToMB(parts[3]),
      description: planString,
    };
  }

  private parseSizeToMB(sizeStr: string): number {
    const upper = sizeStr.toUpperCase();
    if (upper.includes('TB')) return Math.round(parseFloat(upper) * 1024 * 1024);
    if (upper.includes('GB')) return Math.round(parseFloat(upper) * 1024);
    if (upper.includes('MB')) return parseFloat(upper);
    if (upper.includes('KB')) return Math.round(parseFloat(upper) / 1024);
    return 0;
  }

  private parseValidity(validityStr: string): { value: number; unit: string } {
    const lower = validityStr.toLowerCase();
    const match = lower.match(/(\d+)\s*(hour|day|week|month|year)s?/i);
    if (match) {
      let value = parseInt(match[1]);
      let unit = match[2].toLowerCase();
      if (unit === 'week') { value *= 7; unit = 'days'; }
      return { value, unit: unit + 's' };
    }
    return { value: 30, unit: 'days' };
  }

  private parsePlanType(type: string): PlanType {
    const map: Record<string, PlanType> = {
      'SME': PlanType.SME,
      'GIFTING': PlanType.GIFTING,
      'COOPERATE_GIFTING': PlanType.COOPERATE_GIFTING,
      'CORPORATE': PlanType.CORPORATE,
      'PREMIUM': PlanType.PREMIUM,
    };
    return map[type.toUpperCase()] || PlanType.GIFTING;
  }

  private parseValidityUnit(unit: string): ValidityUnit {
    const map: Record<string, ValidityUnit> = {
      'hours': ValidityUnit.HOURS,
      'days': ValidityUnit.DAYS,
      'months': ValidityUnit.MONTHS,
      'years': ValidityUnit.YEARS,
    };
    return map[unit] || ValidityUnit.DAYS;
  }

  // ============================================================
  // RESPONSE HELPER METHODS
  // ============================================================

  private getNetworkName(networkId: number): string {
    const map: Record<number, string> = {
      1: 'MTN',
      2: 'AIRTEL',
      3: 'GLO',
      4: '9MOBILE',
    };
    return map[networkId] || 'MTN';
  }

  private getDataPlanName(planId: number): string {
    const map: Record<number, string> = {
      1: '500MB',
      2: '1GB',
      3: '2GB',
      4: '5GB',
      220: '500MB',
      221: '1GB',
    };
    return map[planId] || 'Data Plan';
  }

  private getDiscoName(discoId: number): string {
    const map: Record<number, string> = {
      1: 'IKEJA ELECTRIC',
      2: 'EKO ELECTRIC',
      3: 'KANO ELECTRIC',
      4: 'PORT HARCOURT ELECTRIC',
      5: 'JOS ELECTRIC',
      6: 'IBADAN ELECTRIC',
      7: 'KADUNA ELECTRIC',
      8: 'ABUJA ELECTRIC',
    };
    return map[discoId] || 'DISCO';
  }

  // ============================================================
  // UTILITY METHODS
  // ============================================================

  private generateRequestId(prefix: string): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    return `${prefix}_${timestamp}_${random}`;
  }

  clearCache(): void {
    this.planCache.clear();
    console.log(`🗑️ [BilalSadaVendor] Plan cache cleared`);
  }

  // ============================================================
  // SERVICE METHODS
  // ============================================================

  async buyAirtime(request: any): Promise<VendorResponse> {
    console.log(`📞 [BilalSadaVendor] buyAirtime called`);
    return this.makeRequest({
      service: VtuType.AIRTIME,
      endpoint: '/api/topup',
      method: 'POST',
      data: request,
    });
  }

  async buyData(request: any): Promise<VendorResponse> {
    console.log(`📊 [BilalSadaVendor] buyData called`);
    return this.makeRequest({
      service: VtuType.DATA,
      endpoint: '/api/data',
      method: 'POST',
      data: request,
    });
  }

  async buyElectricity(request: any): Promise<VendorResponse> {
    console.log(`⚡ [BilalSadaVendor] buyElectricity called`);
    return this.makeRequest({
      service: VtuType.ELECTRICITY_INSTANT,
      endpoint: '/api/bill',
      method: 'POST',
      data: request,
    });
  }

  async buyCableTV(request: any): Promise<VendorResponse> {
    console.log(`📺 [BilalSadaVendor] buyCableTV called`);
    return this.makeRequest({
      service: VtuType.CABLE_TV,
      endpoint: '/api/cable',
      method: 'POST',
      data: request,
    });
  }

  async checkTransactionStatus(reference: string): Promise<VendorResponse> {
    console.log(`🔍 [BilalSadaVendor] checkTransactionStatus called`);
    return this.makeRequest({
      service: VtuType.AIRTIME,
      endpoint: '/requery',
      method: 'POST',
      data: { request_id: reference },
    });
  }

  async checkVendorHealth(): Promise<boolean> {
    try {
      console.log(`🏥 [BilalSadaVendor] Checking vendor health...`);
      // In simulation mode, always return true
      return true;
    } catch (error) {
      return false;
    }
  }
}