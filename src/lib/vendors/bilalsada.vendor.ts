// src/lib/vendors/bilalsada.vendor.ts

import { BaseVendor } from './base.vendor';
import {
  VendorConfig,
  VendorRequest,
  VendorResponse,
  VendorAuthType,
  VtuVendor,
} from './types';
import { VtuType, NetworkProvider } from '@prisma/client';
import { prisma } from "~/lib/db";
import {
  BilalSadaAuthConfig,
  BilalSadaAuthResponse,
  BilalSadaAirtimeRequest,
  BilalSadaDataRequest,
  BilalSadaElectricityRequest,
  BilalSadaCableRequest,
  BilalSadaExamRequest,
} from './bilalsada.types';

interface CacheEntry {
  vendorPlanId: string;
  networkCode: number;
  timestamp: number;
}

export class BilalSadaVendor extends BaseVendor {
  private authConfig: BilalSadaAuthConfig;
  private accessToken: string | null = null;
  private planCache: Map<string, CacheEntry> = new Map();
  private cacheTTL: number = 60000;

  // ✅ Vendor-specific network mapping
  private readonly VENDOR_NETWORK_MAP: Record<string, number> = {
    'MTN': 1,
    'AIRTEL': 2,
    'GLO': 3,
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

  // ✅ Default data plan mapping
  private readonly DEFAULT_DATA_PLANS: Record<string, Record<string, number>> = {
    'MTN': {
      '500MB': 1,
      '1GB': 2,
      '2GB': 3,
      '5GB': 4,
    },
    'AIRTEL': {
      '500MB': 1,
      '1GB': 2,
      '2GB': 3,
      '5GB': 4,
    },
    'GLO': {
      '500MB': 1,
      '1GB': 2,
      '3GB': 3,
      '5GB': 4,
    },
    '9MOBILE': {
      '500MB': 1,
      '1GB': 2,
      '2GB': 3,
      '5GB': 4,
    },
  };

  constructor(config: VendorConfig) {
    super({
      ...config,
      authType: VendorAuthType.BEARER_TOKEN,
      authConfig: config.authConfig,
    });
    
    this.authConfig = config.authConfig as BilalSadaAuthConfig;
    
    // ✅ Only token-based authentication
    if (this.authConfig.accessToken) {
      this.accessToken = this.authConfig.accessToken;
      console.log(`✅ [BilalSadaVendor] Using token from .env`);
      console.log(`✅ [BilalSadaVendor] Token: ${this.accessToken.substring(0, 15)}...`);
    } else {
      console.warn(`⚠️ [BilalSadaVendor] No access token configured!`);
      console.warn(`⚠️ [BilalSadaVendor] Please set BILAL_SADA_ACCESS_TOKEN in .env`);
    }
    
    console.log(`✅ [BilalSadaVendor] Mode: ${this.authConfig.mode || 'sandbox'}`);
    console.log(`✅ [BilalSadaVendor] API Base URL: ${config.apiBaseUrl}`);
    console.log(`✅ [BilalSadaVendor] Vendor ID: ${config.id}`);
  }

  // ============================================================
  // AUTHENTICATION - ✅ Only Token authorization
  // ============================================================

  async authenticate(): Promise<Record<string, string>> {
    // ✅ Check if we have a token
    if (!this.accessToken) {
      console.error(`❌ [BilalSadaVendor] No access token available`);
      throw new Error('No access token configured. Please set BILAL_SADA_ACCESS_TOKEN in .env');
    }

    console.log(`🔑 [BilalSadaVendor] Using token`);
    return {
      // ✅ BilalSada uses "Token" not "Bearer"
      'Authorization': `Token ${this.accessToken}`,
      'Content-Type': 'application/json',
    };
  }

  // ============================================================
  // REQUEST TRANSFORMATION
  // ============================================================

  async transformRequest<T>(request: VendorRequest<T>): Promise<any> {
    console.log(`🔄 [BilalSadaVendor] Transforming request for: ${request.service}`);
    
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
      case VtuType.EDUCATION:
        transformedData = this.transformExamRequest(request.data);
        break;
      default:
        console.warn(`⚠️ [BilalSadaVendor] Unknown service: ${request.service}`);
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
    
    return {
      network: this.VENDOR_NETWORK_MAP[data.network] || 1,
      phone: data.phoneNumber,
      plan_type: 'VTU',
      amount: data.amount,
      bypass: false,
      'request-id': this.generateRequestId('Airtime'),
    };
  }

  // ============================================================
  // DATA TRANSFORMATION
  // ============================================================

  private async transformDataRequest(data: any): Promise<BilalSadaDataRequest> {
    console.log(`📊 [BilalSadaVendor] Data request:`, data);
    
    let networkCode = this.VENDOR_NETWORK_MAP[data.network] || 1;
    let planId = 1;

    if (data.planCode && data.network) {
      const cacheKey = `${data.network}_${data.planCode}`;
      const cached = this.planCache.get(cacheKey);
      
      if (cached && Date.now() - cached.timestamp < this.cacheTTL) {
        planId = parseInt(cached.vendorPlanId) || 1;
        networkCode = cached.networkCode;
        console.log(`✅ [BilalSadaVendor] Using cached plan: ${data.planCode} -> ${planId}`);
        return this.buildDataRequest(data, networkCode, planId);
      }

      try {
        const plan = await prisma.dataPlan.findFirst({
          where: {
            vendorId: this.config.id,
            OR: [
              { name: data.planCode },
              { vendorPlanId: data.planCode },
              { vendorPlanId: String(data.planCode) },
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
          networkCode = parseInt(plan.vendorNetworkCode || String(networkCode)) || networkCode;
          
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

    console.log(`⚠️ [BilalSadaVendor] Using fallback mapping for: ${data.network} ${data.planCode}`);
    const result = this.getDataPlanFromFallback(data.network, data.planCode);
    return this.buildDataRequest(data, result.networkCode, result.planId);
  }

  private getDataPlanFromFallback(network: string, planCode: string): { networkCode: number; planId: number } {
    const networkCode = this.VENDOR_NETWORK_MAP[network] || 1;
    const vendorMap = this.DEFAULT_DATA_PLANS[network];
    
    let planId = 1;
    if (vendorMap) {
      if (vendorMap[planCode]) {
        planId = vendorMap[planCode];
      } else {
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
  // ELECTRICITY TRANSFORMATION
  // ============================================================

  private transformElectricityRequest(data: any): BilalSadaElectricityRequest {
    console.log(`⚡ [BilalSadaVendor] Electricity request:`, data);
    
    return {
      disco: this.VENDOR_DISCO_MAP[data.discoCode] || 1,
      meter_type: (data.meterType || 'prepaid').toLowerCase(),
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
    
    const cablename = this.VENDOR_CABLE_MAP[data.provider] || data.provider.toLowerCase();
    
    return {
      cablename: cablename,
      cableplan: data.packageCode || data.cableplan,
      smart_card_number: data.decoderNumber,
      'request-id': this.generateRequestId('Cable'),
    };
  }

  // ============================================================
  // EXAM TRANSFORMATION
  // ============================================================

  private transformExamRequest(data: any): BilalSadaExamRequest {
    console.log(`📚 [BilalSadaVendor] Exam request:`, data);
    
    const examMap: Record<string, number> = {
      'WAEC': 1,
      'NECO': 2,
      'NABTEB': 3,
    };

    return {
      exam: examMap[data.examName] || data.examId || 1,
      quantity: data.quantity || 1,
      'request-id': this.generateRequestId('RESULTCHECKER'),
    };
  }

  // ============================================================
  // RESPONSE TRANSFORMATION
  // ============================================================

  transformResponse(response: any): VendorResponse {
    console.log(`🔄 [BilalSadaVendor] Transforming response...`);
    console.log(`🔄 [BilalSadaVendor] Response status: ${response.status}`);

    // ✅ Handle success
    if (response.status === 'success' || response.status === 'SUCCESS') {
      console.log(`✅ [BilalSadaVendor] Success response`);
      
      return {
        success: true,
        data: {
          transactionId: response['request-id'] || this.generateRequestId('TX'),
          status: 'SUCCESS',
          amount: typeof response.amount === 'string' ? parseFloat(response.amount) : (response.amount || 0),
          token: response.token || response.pin || '',
          customerName: response.name || response.customer_name || '',
          customerAddress: response.customer_address || '',
          units: response.units || '',
          reference: response['request-id'] || '',
          responseDescription: response.message || response.response || 'Transaction successful',
          productName: response.dataplan || response.network || response.cableplan || '',
          commission: response.discount || 0,
          totalAmount: response.amount || 0,
        },
        vendor: VtuVendor.BILAL_SADA,
        vendorReference: response['request-id'],
        rawResponse: response,
        metadata: {
          responseCode: '000',
          description: response.message || response.response,
          oldBalance: response.oldbal,
          newBalance: response.newbal,
          system: response.system,
          walletVending: response.wallet_vending,
          pin: response.pin,
        },
      };
    }

    // ✅ Handle failure
    if (response.status === 'failed' || response.status === 'error' || response.status === 'ERROR' || response.status === 'fail') {
      console.warn(`⚠️ [BilalSadaVendor] Failed response: ${response.message}`);
      
      return {
        success: false,
        error: response.message || response.response || 'Transaction failed',
        statusCode: 400,
        vendor: VtuVendor.BILAL_SADA,
        vendorReference: response['request-id'],
        rawResponse: response,
        metadata: {
          responseCode: '999',
          description: response.message || 'Transaction failed',
        },
      };
    }

    console.warn(`⚠️ [BilalSadaVendor] Unknown status: ${response.status}`);
    
    return {
      success: false,
      error: response.message || 'Unknown response from vendor',
      statusCode: 500,
      vendor: VtuVendor.BILAL_SADA,
      vendorReference: response['request-id'],
      rawResponse: response,
      metadata: {
        responseCode: '500',
        description: response.message || 'Unknown error',
      },
    };
  }

  // ============================================================
  // MAKE REQUEST - ✅ Token only, auto-retry on 401/403
  // ============================================================

  protected async makeRequest<T>(request: VendorRequest<T>): Promise<VendorResponse<T>> {
    const startTime = Date.now();
    let retryCount = 0;
    const maxRetries = 2;

    let endpoint = request.endpoint;
    switch (request.service) {
      case VtuType.AIRTIME:
        endpoint = '/api/topup';
        break;
      case VtuType.DATA:
        endpoint = '/api/data';
        break;
      case VtuType.ELECTRICITY_INSTANT:
        endpoint = '/api/bill';
        break;
      case VtuType.CABLE_TV:
        endpoint = '/api/cable';
        break;
      case VtuType.EDUCATION:
        endpoint = '/api/exam';
        break;
      default:
        endpoint = request.endpoint;
    }
    
    const url = `${this.config.apiBaseUrl}${endpoint}`;
    console.log(`🔍 [BilalSadaVendor] URL: ${url}`);

    while (retryCount <= maxRetries) {
      try {
        const headers = await this.authenticate();
        const transformedData = await this.transformRequest(request);
        
        console.log(`🔍 [BilalSadaVendor] Request body:`, JSON.stringify(transformedData, null, 2));
        
        const response = await fetch(url, {
          method: request.method,
          headers: {
            'Content-Type': 'application/json',
            ...headers,
            ...request.headers,
          },
          body: request.method !== 'GET' ? JSON.stringify(transformedData) : undefined,
          signal: AbortSignal.timeout(this.config.timeout || 30000),
        });

        console.log(`🔍 [BilalSadaVendor] Response status: ${response.status}`);

        // ✅ Handle 401/403 - Token invalid/expired
        if (response.status === 401 || response.status === 403) {
          console.warn(`⚠️ [BilalSadaVendor] Token invalid (${response.status})`);
          
          // Get response body for error details
          let errorBody = '';
          try {
            errorBody = await response.text();
          } catch (e) {
            errorBody = 'Unable to parse error response';
          }
          
          console.error(`❌ [BilalSadaVendor] Auth error: ${errorBody}`);
          
          return {
            success: false,
            error: `Authentication failed: ${errorBody}`,
            statusCode: response.status,
            vendor: this.config.code,
            metadata: {
              duration: Date.now() - startTime,
              timestamp: new Date().toISOString(),
              response: errorBody,
            },
          };
        }

        if (!response.ok) {
          const errorText = await response.text();
          console.error(`❌ [BilalSadaVendor] Request failed: ${response.status} - ${errorText}`);
          
          return {
            success: false,
            error: `Request failed: ${response.status} - ${errorText}`,
            statusCode: response.status,
            vendor: this.config.code,
            metadata: {
              duration: Date.now() - startTime,
              endpoint: request.endpoint,
              method: request.method,
              timestamp: new Date().toISOString(),
            },
          };
        }

        const rawResponse = await response.json();
        console.log(`✅ [BilalSadaVendor] Response received`);
        console.log(`✅ [BilalSadaVendor] Response status: ${rawResponse.status}`);
        
        const duration = Date.now() - startTime;
        const result = this.transformResponse(rawResponse);
        
        result.metadata = {
          ...result.metadata,
          duration,
          endpoint: request.endpoint,
          method: request.method,
          timestamp: new Date().toISOString(),
          statusCode: response.status,
          retryCount,
        };
        
        return result;
      } catch (error: any) {
        console.error(`❌ [BilalSadaVendor] Request error:`, error);
        
        if (error.name === 'AbortError' || error.name === 'TimeoutError') {
          retryCount++;
          if (retryCount <= maxRetries) {
            console.log(`🔄 [BilalSadaVendor] Retry ${retryCount}/${maxRetries} after timeout...`);
            await new Promise(resolve => setTimeout(resolve, 1000 * retryCount));
            continue;
          }
        }
        
        return {
          success: false,
          error: error.message || 'Vendor request failed',
          statusCode: error.status || 500,
          vendor: this.config.code,
          metadata: {
            duration: Date.now() - startTime,
            error: error.message,
            errorType: error.name || 'UnknownError',
            timestamp: new Date().toISOString(),
            retryCount,
          },
        };
      }
    }

    return {
      success: false,
      error: 'Max retries exceeded',
      statusCode: 500,
      vendor: this.config.code,
      metadata: {
        duration: Date.now() - startTime,
        retryCount,
        timestamp: new Date().toISOString(),
      },
    };
  }

  // ============================================================
  // HELPER METHODS
  // ============================================================

  private generateRequestId(prefix: string): string {
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 1000000000);
    return `${prefix}_${timestamp}_${random}`;
  }

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
    };
    return map[planId] || `Plan ${planId}`;
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

  clearCache(): void {
    this.planCache.clear();
    console.log(`🗑️ [BilalSadaVendor] Plan cache cleared`);
  }

  // ============================================================
  // PUBLIC METHODS
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

  async buyEducation(request: any): Promise<VendorResponse> {
    console.log(`📚 [BilalSadaVendor] buyEducation called`);
    return this.makeRequest({
      service: VtuType.EDUCATION,
      endpoint: '/api/exam',
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
      await this.authenticate();
      return true;
    } catch (error) {
      console.error(`❌ [BilalSadaVendor] Health check failed:`, error);
      return false;
    }
  }
}