// src/lib/vendors/base.vendor.ts

import {
  VendorConfig,
  VendorRequest,
  VendorResponse,
  VtuVendor,
  VendorAuthType,
} from './types';
import { VtuType } from '@prisma/client';

export abstract class BaseVendor {
  protected config: VendorConfig;

  constructor(config: VendorConfig) {
    this.config = config;
  }

  abstract authenticate(): Promise<Record<string, string>>;
  abstract transformRequest<T>(request: VendorRequest<T>): any;
  abstract transformResponse<T>(response: any): VendorResponse<T>;

  protected async makeRequest<T>(request: VendorRequest<T>): Promise<VendorResponse<T>> {
    const startTime = Date.now();
    
    console.log(`🔍 [${this.config.code}] Making request to: ${request.endpoint}`);
    console.log(`🔍 [${this.config.code}] Method: ${request.method}`);
    console.log(`🔍 [${this.config.code}] Data:`, JSON.stringify(request.data, null, 2));
    
    try {
      const headers = await this.authenticate();
      console.log(`🔍 [${this.config.code}] Headers:`, Object.keys(headers));
      
      const transformedData = this.transformRequest(request);
      console.log(`🔍 [${this.config.code}] Transformed data:`, JSON.stringify(transformedData, null, 2));
      
      const url = `${this.config.apiBaseUrl}${request.endpoint}`;
      console.log(`🔍 [${this.config.code}] Full URL: ${url}`);
      
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

      const rawResponse = await response.json();
      console.log(`🔍 [${this.config.code}] Raw response:`, JSON.stringify(rawResponse, null, 2));
      
      const duration = Date.now() - startTime;
      
      const result = this.transformResponse(rawResponse);
      console.log(`🔍 [${this.config.code}] Transformed response:`, result);
      
      result.metadata = {
        ...result.metadata,
        duration,
        endpoint: request.endpoint,
        method: request.method,
        timestamp: new Date().toISOString(),
      };
      
      return result;
    } catch (error: any) {
      console.error(`❌ [${this.config.code}] Request failed:`, error);
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


async buyAirtime(request: any): Promise<VendorResponse> {
  return this.makeRequest({
    service: VtuType.AIRTIME,
    endpoint: '/api/pay',  // ✅ Correct endpoint
    method: 'POST',
    data: request,
  });
}

async buyData(request: any): Promise<VendorResponse> {
  return this.makeRequest({
    service: VtuType.DATA,
    endpoint: '/api/pay',
    method: 'POST',
    data: request,
  });
}

async buyElectricity(request: any): Promise<VendorResponse> {
  return this.makeRequest({
    service: VtuType.ELECTRICITY_INSTANT,
    endpoint: '/api/pay',
    method: 'POST',
    data: request,
  });
}

async buyCableTV(request: any): Promise<VendorResponse> {
  return this.makeRequest({
    service: VtuType.CABLE_TV,
    endpoint: '/api/pay',
    method: 'POST',
    data: request,
  });
}

// Also update the requery endpoint
async checkTransactionStatus(reference: string): Promise<VendorResponse> {
  return this.makeRequest({
    service: VtuType.AIRTIME,
    endpoint: '/requery',  // ✅ Changed from /api/requery
    method: 'POST',
    data: { request_id: reference },
  });
}
  async checkVendorHealth(): Promise<boolean> {
    try {
      const response = await fetch(`${this.config.apiBaseUrl}/api/health`, {
        method: 'GET',
        signal: AbortSignal.timeout(5000),
      });
      return response.ok;
    } catch (error) {
      return false;
    }
  }
}