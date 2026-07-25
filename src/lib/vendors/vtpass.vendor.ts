// src/lib/vendors/vtpass.vendor.ts

import { BaseVendor } from './base.vendor';
import {
  VendorConfig,
  VendorRequest,
  VendorResponse,
  VendorAuthType,
  VtuVendor,
} from './types';
import { VtuType } from '@prisma/client';

interface VTPassAuthConfig {
  authMethod: 'basic' | 'apikey' | 'headerkey';
  apiKey?: string;
  secretKey?: string;
  publicKey?: string;
  username?: string;
  password?: string;
}

interface VTPassPayRequest {
  request_id: string;
  serviceID: string;
  amount: string;
  phone: string;
  billersCode?: string;
  variation_code?: string;
}

interface VTPassRequeryRequest {
  request_id: string;
}

interface VTPassResponse {
  code: string;
  content: {
    transactions?: {
      status: string;
      product_name: string;
      unique_element: string;
      unit_price: number;
      quantity: number;
      channel: string;
      commission: number;
      total_amount: number;
      type: string;
      email: string;
      phone: string;
      name: string | null;
      transactionId: string;
      commission_details: {
        amount: number;
        rate: string;
        rate_type: string;
        computation_type: string;
      };
    };
  };
  response_description: string;
  requestId: string;
  amount: number;
  transaction_date: string;
  purchased_code?: string;
}

export class VTPassVendor extends BaseVendor {
  private authConfig: VTPassAuthConfig;

  constructor(config: VendorConfig) {
    super({
      ...config,
      authType: VendorAuthType.API_KEY,
      authConfig: config.authConfig,
    });
    
    this.authConfig = config.authConfig as VTPassAuthConfig;
    console.log(`✅ [VTPassVendor] Initialized with auth method: ${this.authConfig.authMethod}`);
    console.log(`✅ [VTPassVendor] API Base URL: ${config.apiBaseUrl}`);
  }

  async authenticate(): Promise<Record<string, string>> {
    const auth = this.authConfig;
    console.log(`🔑 [VTPassVendor] Authenticating with method: ${auth.authMethod}`);
    
    if (auth.authMethod === 'apikey' && auth.apiKey) {
      const headers: Record<string, string> = {
        'api-key': auth.apiKey,
        'Content-Type': 'application/json',
      };
      
      if (auth.secretKey) {
        headers['secret-key'] = auth.secretKey;
      }
      if (auth.publicKey) {
        headers['public-key'] = auth.publicKey;
      }
      
      console.log(`🔑 [VTPassVendor] API Key headers:`, Object.keys(headers));
      return headers;
    }
    
    if (auth.authMethod === 'basic' && auth.username && auth.password) {
      const credentials = Buffer.from(`${auth.username}:${auth.password}`).toString('base64');
      const headers = {
        'Authorization': `Basic ${credentials}`,
        'Content-Type': 'application/json',
      };
      console.log(`🔑 [VTPassVendor] Basic auth headers:`, Object.keys(headers));
      return headers;
    }
    
    if (auth.authMethod === 'headerkey' && auth.publicKey && auth.secretKey) {
      const headers = {
        'X-Token': auth.publicKey,
        'X-Secret': auth.secretKey,
        'Content-Type': 'application/json',
      };
      console.log(`🔑 [VTPassVendor] Header Key auth headers:`, Object.keys(headers));
      return headers;
    }
    
    if (auth.apiKey) {
      const headers = {
        'api-key': auth.apiKey,
        'Content-Type': 'application/json',
      };
      console.log(`🔑 [VTPassVendor] Default API Key headers:`, Object.keys(headers));
      return headers;
    }
    
    throw new Error('No valid authentication method configured for VTpass');
  }

  transformRequest<T>(request: VendorRequest<T>): any {
    console.log(`🔄 [VTPassVendor] Transforming request for: ${request.service}`);
    console.log(`🔄 [VTPassVendor] Original data:`, JSON.stringify(request.data, null, 2));
    
    let transformedData;
    
    switch (request.service) {
      case VtuType.AIRTIME:
        transformedData = this.transformAirtimeRequest(request.data);
        break;
      case VtuType.DATA:
        transformedData = this.transformDataRequest(request.data);
        break;
      case VtuType.ELECTRICITY_INSTANT:
        transformedData = this.transformElectricityRequest(request.data);
        break;
      case VtuType.CABLE_TV:
        transformedData = this.transformCableTVRequest(request.data);
        break;
      default:
        console.warn(`⚠️ [VTPassVendor] Unknown service type: ${request.service}`);
        transformedData = request.data;
    }
    
    console.log(`🔄 [VTPassVendor] Transformed data:`, JSON.stringify(transformedData, null, 2));
    return transformedData;
  }

  private transformAirtimeRequest(data: any): VTPassPayRequest {
    console.log(`📱 [VTPassVendor] Airtime request:`, data);
    
    // ✅ Use correct serviceID: 'mtn' (lowercase)
    const serviceID = this.getAirtimeServiceId(data.network);
    
    return {
      request_id: this.generateRequestId(),
      serviceID: serviceID,
      amount: data.amount.toString(),
      phone: data.phoneNumber,
    };
  }

  private transformDataRequest(data: any): VTPassPayRequest {
    console.log(`📊 [VTPassVendor] Data request:`, data);
    
    return {
      request_id: this.generateRequestId(),
      serviceID: this.getDataServiceId(data.network),
      billersCode: data.phoneNumber,
      variation_code: data.planCode,
      amount: data.amount ? data.amount.toString() : '0',
      phone: data.phoneNumber,
    };
  }

  private transformElectricityRequest(data: any): VTPassPayRequest {
    console.log(`⚡ [VTPassVendor] Electricity request:`, data);
    
    return {
      request_id: this.generateRequestId(),
      serviceID: this.getElectricityServiceId(data.discoCode),
      billersCode: data.meterNumber,
      amount: data.amount.toString(),
      phone: data.phone || '',
    };
  }

  private transformCableTVRequest(data: any): VTPassPayRequest {
    console.log(`📺 [VTPassVendor] Cable TV request:`, data);
    
    return {
      request_id: this.generateRequestId(),
      serviceID: this.getCableServiceId(data.provider),
      billersCode: data.decoderNumber,
      variation_code: data.packageCode,
      amount: data.amount ? data.amount.toString() : '0',
      phone: data.phone || '',
    };
  }

  transformResponse(response: any): VendorResponse {
    console.log(`🔄 [VTPassVendor] Transforming response...`);
    console.log(`🔄 [VTPassVendor] Raw response:`, JSON.stringify(response, null, 2));
    
    const vtpassResponse = response as VTPassResponse;
    
    // ✅ Success code is '000'
    if (vtpassResponse.code === '000') {
      console.log(`✅ [VTPassVendor] Success response:`, vtpassResponse);
      
      const transaction = vtpassResponse.content?.transactions;
      
      return {
        success: true,
        data: {
          transactionId: transaction?.transactionId || vtpassResponse.requestId,
          status: this.mapStatus(transaction?.status || 'SUCCESS'),
          amount: vtpassResponse.amount || 0,
          token: vtpassResponse.purchased_code || '',
          customerName: transaction?.name || '',
          customerAddress: '',
          units: '',
          reference: vtpassResponse.requestId,
          responseDescription: vtpassResponse.response_description,
          productName: transaction?.product_name,
          commission: transaction?.commission,
          totalAmount: transaction?.total_amount,
        },
        vendor: VtuVendor.VTPASS,
        vendorReference: vtpassResponse.requestId,
        rawResponse: vtpassResponse,
        metadata: {
          responseCode: vtpassResponse.code,
          description: vtpassResponse.response_description,
          transactionId: transaction?.transactionId,
          transactionDate: vtpassResponse.transaction_date,
        },
      };
    }

    console.warn(`⚠️ [VTPassVendor] Error response:`, vtpassResponse);
    const errorMessage = this.mapErrorCode(vtpassResponse.code, vtpassResponse.response_description);

    return {
      success: false,
      error: errorMessage,
      statusCode: parseInt(vtpassResponse.code) || 400,
      vendor: VtuVendor.VTPASS,
      vendorReference: vtpassResponse.requestId,
      rawResponse: vtpassResponse,
      metadata: {
        responseCode: vtpassResponse.code,
        description: vtpassResponse.response_description,
      },
    };
  }

  // ✅ Override the base makeRequest to use correct endpoints
// src/lib/vendors/vtpass.vendor.ts - Update the makeRequest method

protected async makeRequest<T>(request: VendorRequest<T>): Promise<VendorResponse<T>> {
  const startTime = Date.now();
  
  // ✅ Use /api/pay as the endpoint (since base URL is the domain)
  let endpoint = request.endpoint;
  
  // Map to correct VTpass endpoints
  if (request.service === VtuType.AIRTIME || 
      request.service === VtuType.DATA || 
      request.service === VtuType.ELECTRICITY_INSTANT || 
      request.service === VtuType.CABLE_TV) {
    // ✅ Use /api/pay for purchases
    endpoint = '/api/pay';
  } else if (request.endpoint.includes('requery')) {
    endpoint = '/api/requery';
  }
  
  const url = `${this.config.apiBaseUrl}${endpoint}`;
  console.log(`🔍 [VTPassVendor] Full URL: ${url}`);
  console.log(`🔍 [VTPassVendor] Request method: ${request.method}`);
  
  try {
    const headers = await this.authenticate();
    console.log(`🔍 [VTPassVendor] Headers:`, JSON.stringify(headers, null, 2));
    
    const transformedData = this.transformRequest(request);
    console.log(`🔍 [VTPassVendor] Request body:`, JSON.stringify(transformedData, null, 2));
    
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

    console.log(`🔍 [VTPassVendor] Response status: ${response.status} ${response.statusText}`);
    
    // Get response as text first to handle non-JSON responses
    const responseText = await response.text();
    console.log(`🔍 [VTPassVendor] Response text:`, responseText);
    
    let rawResponse;
    try {
      rawResponse = JSON.parse(responseText);
    } catch (parseError) {
      console.warn(`⚠️ [VTPassVendor] Response is not JSON, using text as raw response`);
      rawResponse = responseText;
    }
    
    const duration = Date.now() - startTime;
    
    const result = this.transformResponse(rawResponse);
    
    result.metadata = {
      ...result.metadata,
      duration,
      endpoint: request.endpoint,
      method: request.method,
      timestamp: new Date().toISOString(),
      statusCode: response.status,
    };
    
    return result;
  } catch (error: any) {
    console.error(`❌ [VTPassVendor] Request failed:`, error);
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

  // ✅ Override the base buy methods to use correct data structure
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
      endpoint: '/api/pay',  // ✅ Correct endpoint
      method: 'POST',
      data: request,
    });
  }

  async buyElectricity(request: any): Promise<VendorResponse> {
    return this.makeRequest({
      service: VtuType.ELECTRICITY_INSTANT,
      endpoint: '/api/pay',  // ✅ Correct endpoint
      method: 'POST',
      data: request,
    });
  }

  async buyCableTV(request: any): Promise<VendorResponse> {
    return this.makeRequest({
      service: VtuType.CABLE_TV,
      endpoint: '/api/pay',  // ✅ Correct endpoint
      method: 'POST',
      data: request,
    });
  }

  async checkTransactionStatus(reference: string): Promise<VendorResponse> {
    return this.makeRequest({
      service: VtuType.AIRTIME,
      endpoint: '/api/requery',  // ✅ Correct endpoint
      method: 'POST',
      data: { request_id: reference },
    });
  }

  private generateRequestId(): string {
    // ✅ Generate a unique request ID
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    return `${timestamp}${random}`;
  }

  private getAirtimeServiceId(network: string): string {
    // ✅ Use lowercase service IDs
    const mapping: Record<string, string> = {
      'MTN': 'mtn',
      'GLO': 'glo',
      'AIRTEL': 'airtel',
      '9MOBILE': '9mobile',
      'NINEMOBILE': '9mobile',
    };
    const serviceId = mapping[network.toUpperCase()] || network.toLowerCase();
    console.log(`🔍 [VTPassVendor] Airtime service ID for ${network}: ${serviceId}`);
    return serviceId;
  }

  private getDataServiceId(network: string): string {
    const mapping: Record<string, string> = {
      'MTN': 'mtn-data',
      'GLO': 'glo-data',
      'AIRTEL': 'airtel-data',
      '9MOBILE': '9mobile-data',
      'NINEMOBILE': '9mobile-data',
    };
    return mapping[network.toUpperCase()] || `${network.toLowerCase()}-data`;
  }

  private getElectricityServiceId(disco: string): string {
    const mapping: Record<string, string> = {
      'IKEJA': 'ikeja-electric',
      'EKO': 'eko-electric',
      'ABUJA': 'abuja-electric',
      'KANO': 'kano-electric',
      'PHCN': 'phcn-electric',
      'IBADAN': 'ibadan-electric',
      'BENIN': 'benin-electric',
      'ENUGU': 'enugu-electric',
      'JOS': 'jos-electric',
      'PORT_HARCOURT': 'portharcourt-electric',
    };
    return mapping[disco.toUpperCase()] || disco.toLowerCase();
  }

  private getCableServiceId(provider: string): string {
    const mapping: Record<string, string> = {
      'DSTV': 'dstv',
      'GOTV': 'gotv',
      'STARTIMES': 'startimes',
    };
    return mapping[provider.toUpperCase()] || provider.toLowerCase();
  }

  private mapStatus(vtpassStatus: string): string {
    const mapping: Record<string, string> = {
      'delivered': 'SUCCESS',
      'pending': 'PENDING',
      'failed': 'FAILED',
      'processing': 'PROCESSING',
      'SUCCESS': 'SUCCESS',
      'PENDING': 'PENDING',
      'FAILED': 'FAILED',
      'PROCESSING': 'PROCESSING',
    };
    return mapping[vtpassStatus.toLowerCase()] || 'PENDING';
  }

  private mapErrorCode(code: string, description: string): string {
    const errorMap: Record<string, string> = {
      '100': 'Invalid API key or authentication failed',
      '101': 'Insufficient wallet balance',
      '102': 'Invalid service ID',
      '103': 'Invalid biller code',
      '104': 'Invalid amount',
      '105': 'Duplicate request',
      '106': 'Service temporarily unavailable',
      '107': 'Invalid request format',
      '108': 'Transaction timeout',
      '109': 'Invalid variation code',
      '110': 'Customer not found',
      '111': 'Invalid credentials',
      '112': 'Account suspended',
      '113': 'Rate limit exceeded',
      '999': 'Unknown error occurred',
    };

    return errorMap[code] || description || 'Transaction failed';
  }
}