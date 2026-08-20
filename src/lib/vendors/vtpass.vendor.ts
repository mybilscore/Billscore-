// src/lib/vendors/vtpass.vendor.ts - Complete Updated with Environment Support

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
  environment?: string; // ✅ Add environment field
}

interface VTPassPayRequest {
  request_id: string;
  serviceID: string;
  amount?: string;
  phone: string;
  billersCode?: string;
  variation_code?: string;
  subscription_type?: 'change' | 'renew';
  quantity?: number;
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
  tokens?: string[];
  cards?: Array<{ Serial: string; Pin: string }>;
  Pin?: string;
}

export class VTPassVendor extends BaseVendor {
  private authConfig: VTPassAuthConfig;
  private environment: string;

  constructor(config: VendorConfig) {
    super({
      ...config,
      authType: VendorAuthType.API_KEY,
      authConfig: config.authConfig,
    });
    
    this.authConfig = config.authConfig as VTPassAuthConfig;
    
    // ✅ Detect environment from authConfig or metadata
    this.environment = this.authConfig?.environment || 
                       (config.metadata as any)?.environment || 
                       'sandbox';
    
    console.log(`✅ [VTPassVendor] Initialized with environment: ${this.environment}`);
    console.log(`✅ [VTPassVendor] Auth method: ${this.authConfig?.authMethod}`);
    console.log(`✅ [VTPassVendor] API Base URL: ${config.apiBaseUrl}`);
  }

  async authenticate(): Promise<Record<string, string>> {
    const auth = this.authConfig;
    console.log(`🔑 [VTPassVendor] Authenticating with method: ${auth.authMethod} (${this.environment})`);
    
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
      
      console.log(`🔑 [VTPassVendor] Headers: api-key, ${auth.secretKey ? 'secret-key' : ''}, ${auth.publicKey ? 'public-key' : ''}`);
      return headers;
    }
    
    if (auth.authMethod === 'basic' && auth.username && auth.password) {
      const credentials = Buffer.from(`${auth.username}:${auth.password}`).toString('base64');
      return {
        'Authorization': `Basic ${credentials}`,
        'Content-Type': 'application/json',
      };
    }
    
    if (auth.authMethod === 'headerkey' && auth.publicKey && auth.secretKey) {
      return {
        'X-Token': auth.publicKey,
        'X-Secret': auth.secretKey,
        'Content-Type': 'application/json',
      };
    }
    
    if (auth.apiKey) {
      return {
        'api-key': auth.apiKey,
        'Content-Type': 'application/json',
      };
    }
    
    throw new Error('No valid authentication method configured for VTpass');
  }

  transformRequest<T>(request: VendorRequest<T>): any {
    console.log(`🔄 [VTPassVendor] Transforming request for: ${request.service} (${this.environment})`);
    
    // ✅ For merchant-verify, don't transform the data, just pass it through
    if (request.endpoint.includes('merchant-verify')) {
      console.log(`🔄 [VTPassVendor] Skipping transformation for merchant-verify`);
      return request.data;
    }
    
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
      case VtuType.EDUCATION:
        transformedData = this.transformEducationRequest(request.data);
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
    
    const serviceID = this.getAirtimeServiceId(data.network);
    
    return {
      request_id: this.generateRequestId(),
      serviceID: serviceID,
      amount: data.amount?.toString() || '0',
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
      amount: data.amount ? data.amount.toString() : undefined,
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
      variation_code: data.meterType || 'prepaid',
    };
  }

  private transformCableTVRequest(data: any): VTPassPayRequest {
    console.log(`📺 [VTPassVendor] Cable TV request:`, data);
    
    return {
      request_id: this.generateRequestId(),
      serviceID: this.getCableServiceId(data.provider),
      billersCode: data.decoderNumber,
      variation_code: data.packageCode,
      amount: data.amount ? data.amount.toString() : undefined,
      phone: data.phone || '',
      subscription_type: data.subscriptionType || 'change',
      quantity: data.quantity || 1,
    };
  }

  // ✅ Updated Education transform with proper VTpass fields
  private transformEducationRequest(data: any): VTPassPayRequest {
    console.log(`📚 [VTPassVendor] Education request:`, data);
    
    // Map service IDs to VTpass format
    const serviceMap: Record<string, string> = {
      'waec': 'waec',
      'waec-registration': 'waec-registration',
      'waec-result': 'waec',
      'neco': 'neco',
      'jamb': 'jamb',
    };

    const serviceID = serviceMap[data.serviceId] || data.serviceId;
    
    // ✅ Build payload according to VTpass docs
    const payload: VTPassPayRequest = {
      request_id: this.generateRequestId(),
      serviceID: serviceID,
      variation_code: data.variationCode,
      phone: data.phone,
      quantity: data.quantity || 1,
    };

    // ✅ For JAMB, billersCode is required (Profile ID)
    if (serviceID === 'jamb' && data.billersCode) {
      payload.billersCode = data.billersCode;
    }

    // ✅ Amount is optional - VTpass uses variation_code to determine price
    if (data.amount) {
      payload.amount = data.amount.toString();
    }

    return payload;
  }

  transformResponse(response: any): VendorResponse {
    console.log(`🔄 [VTPassVendor] Transforming response...`);
    
    const vtpassResponse = response as VTPassResponse;
    
    // ✅ Check if this is a merchant-verify response
    if (vtpassResponse.code === '000' && vtpassResponse.content && !vtpassResponse.content?.transactions) {
      console.log(`✅ [VTPassVendor] Merchant verification success`);
      return {
        success: true,
        data: vtpassResponse.content,
        vendor: VtuVendor.VTPASS,
        rawResponse: vtpassResponse,
        response_description: vtpassResponse.response_description,
        metadata: {
          responseCode: vtpassResponse.code,
          description: vtpassResponse.response_description,
          environment: this.environment,
        },
      };
    }
    
    if (vtpassResponse.code === '000') {
      console.log(`✅ [VTPassVendor] Success response`);
      
      const transaction = vtpassResponse.content?.transactions;
      
      // ✅ Extract tokens/cards for education
      let tokens: string[] = [];
      let token: string = '';
      let cards: Array<{ Serial: string; Pin: string }> = [];
      
      // ✅ Check for different response formats for education
      // 1. Direct tokens array
      if (vtpassResponse.tokens && vtpassResponse.tokens.length > 0) {
        tokens = vtpassResponse.tokens;
        token = tokens[0];
      }
      
      // 2. Cards array (WAEC Result Checker)
      if (vtpassResponse.cards && vtpassResponse.cards.length > 0) {
        cards = vtpassResponse.cards;
        tokens = vtpassResponse.cards.map(c => c.Pin);
        token = vtpassResponse.cards[0]?.Pin || '';
      }
      
      // 3. Single Pin field (JAMB)
      if (vtpassResponse.Pin && !token) {
        token = vtpassResponse.Pin;
        tokens = [token];
      }
      
      // 4. Purchased code with tokens
      if (vtpassResponse.purchased_code && !token) {
        // Try to extract token from purchased_code
        const codeMatch = vtpassResponse.purchased_code.match(/[0-9]{10,}/g);
        if (codeMatch && codeMatch.length > 0) {
          tokens = codeMatch;
          token = codeMatch[0];
        } else {
          token = vtpassResponse.purchased_code;
          tokens = [token];
        }
      }
      
      return {
        success: true,
        data: {
          transactionId: transaction?.transactionId || vtpassResponse.requestId,
          status: this.mapStatus(transaction?.status || 'delivered'),
          amount: vtpassResponse.amount || 0,
          token: token,
          tokens: tokens.length > 0 ? tokens : undefined,
          cards: cards.length > 0 ? cards : undefined,
          customerName: transaction?.name || '',
          customerAddress: '',
          units: '',
          reference: vtpassResponse.requestId,
          responseDescription: vtpassResponse.response_description || 'TRANSACTION SUCCESSFUL',
          productName: transaction?.product_name,
          commission: transaction?.commission,
          totalAmount: transaction?.total_amount,
        },
        vendor: VtuVendor.VTPASS,
        vendorReference: vtpassResponse.requestId,
        rawResponse: vtpassResponse,
        response_description: vtpassResponse.response_description,
        metadata: {
          responseCode: vtpassResponse.code,
          description: vtpassResponse.response_description,
          transactionId: transaction?.transactionId,
          transactionDate: vtpassResponse.transaction_date,
          tokens: tokens,
          cards: cards,
          pin: token,
          environment: this.environment,
        },
      };
    }

    console.warn(`⚠️ [VTPassVendor] Error response:`, vtpassResponse);
    const errorMessage = this.mapErrorCode(vtpassResponse.code, vtpassResponse.response_description);

    return {
      success: false,
      error: errorMessage,
      response_description: vtpassResponse.response_description,
      statusCode: parseInt(vtpassResponse.code) || 400,
      vendor: VtuVendor.VTPASS,
      vendorReference: vtpassResponse.requestId,
      rawResponse: vtpassResponse,
      metadata: {
        responseCode: vtpassResponse.code,
        description: vtpassResponse.response_description,
        environment: this.environment,
      },
    };
  }

  protected async makeRequest<T>(request: VendorRequest<T>): Promise<VendorResponse<T>> {
    const startTime = Date.now();
    
    let endpoint = request.endpoint;
    
    // Map to correct VTpass endpoints
    if (request.service === VtuType.AIRTIME || 
        request.service === VtuType.DATA || 
        request.service === VtuType.ELECTRICITY_INSTANT || 
        request.service === VtuType.CABLE_TV ||
        request.service === VtuType.EDUCATION) {
      endpoint = '/pay';
    } else if (request.endpoint.includes('requery') || request.endpoint === '/requery') {
      endpoint = '/requery';
    } else if (request.endpoint.includes('balance') || request.endpoint === '/balance') {
      endpoint = '/balance';
    } else if (request.endpoint.includes('service-categories') || request.endpoint === '/service-categories') {
      endpoint = '/service-categories';
    } else if (request.endpoint.includes('service-variations') || request.endpoint === '/service-variations') {
      endpoint = request.endpoint; // Preserve query params
    } else if (request.endpoint.includes('merchant-verify') || request.endpoint === '/merchant-verify') {
      endpoint = '/merchant-verify';
    }
    
    const url = `${this.config.apiBaseUrl}${endpoint}`;
    console.log(`🔍 [VTPassVendor] Full URL: ${url}`);
    console.log(`🔍 [VTPassVendor] Request method: ${request.method}`);
    console.log(`🌐 [VTPassVendor] Environment: ${this.environment}`);
    
    try {
      const headers = await this.authenticate();
      console.log(`🔍 [VTPassVendor] Headers:`, Object.keys(headers));
      
      let transformedData = request.data;
      
      // ✅ Only transform for POST requests that are not merchant-verify
      if (request.method === 'POST' && request.data && Object.keys(request.data).length > 0) {
        if (!request.endpoint.includes('merchant-verify')) {
          transformedData = this.transformRequest(request);
        } else {
          // For merchant-verify, use data as-is
          console.log(`🔍 [VTPassVendor] Using merchant-verify data as-is:`, request.data);
        }
      } else if (request.method === 'GET') {
        transformedData = undefined;
      }
      
      if (transformedData) {
        console.log(`🔍 [VTPassVendor] Request body:`, JSON.stringify(transformedData, null, 2));
      }
      
      const fetchOptions: RequestInit = {
        method: request.method,
        headers: {
          'Content-Type': 'application/json',
          ...headers,
          ...request.headers,
        },
        signal: AbortSignal.timeout(this.config.timeout || 30000),
      };
      
      if (request.method !== 'GET' && transformedData) {
        fetchOptions.body = JSON.stringify(transformedData);
      }
      
      const response = await fetch(url, fetchOptions);

      console.log(`🔍 [VTPassVendor] Response status: ${response.status} ${response.statusText}`);
      
      const responseText = await response.text();
      console.log(`🔍 [VTPassVendor] Response text:`, responseText.substring(0, 500));
      
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
        environment: this.environment,
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
          environment: this.environment,
        },
      };
    }
  }

  async buyAirtime(request: any): Promise<VendorResponse> {
    console.log(`📞 [VTPassVendor] buyAirtime called (${this.environment})`);
    return this.makeRequest({
      service: VtuType.AIRTIME,
      endpoint: '/pay',
      method: 'POST',
      data: request,
    });
  }

  async buyData(request: any): Promise<VendorResponse> {
    console.log(`📊 [VTPassVendor] buyData called (${this.environment})`);
    return this.makeRequest({
      service: VtuType.DATA,
      endpoint: '/pay',
      method: 'POST',
      data: request,
    });
  }

  async buyElectricity(request: any): Promise<VendorResponse> {
    console.log(`⚡ [VTPassVendor] buyElectricity called (${this.environment})`);
    return this.makeRequest({
      service: VtuType.ELECTRICITY_INSTANT,
      endpoint: '/pay',
      method: 'POST',
      data: request,
    });
  }

  async buyCableTV(request: any): Promise<VendorResponse> {
    console.log(`📺 [VTPassVendor] buyCableTV called (${this.environment})`);
    return this.makeRequest({
      service: VtuType.CABLE_TV,
      endpoint: '/pay',
      method: 'POST',
      data: request,
    });
  }

  // ✅ Updated Education purchase with proper VTpass fields
  async buyEducation(request: any): Promise<VendorResponse> {
    console.log(`📚 [VTPassVendor] buyEducation called (${this.environment})`);
    console.log(`📚 [VTPassVendor] Request:`, request);
    return this.makeRequest({
      service: VtuType.EDUCATION,
      endpoint: '/pay',
      method: 'POST',
      data: request,
    });
  }

  // ✅ JAMB Profile verification
  async verifyJAMBProfile(profileId: string, variationCode: string): Promise<VendorResponse> {
    console.log(`📚 [VTPassVendor] Verifying JAMB Profile: ${profileId} (${this.environment})`);
    return this.makeRequest({
      service: VtuType.EDUCATION,
      endpoint: '/merchant-verify',
      method: 'POST',
      data: {
        serviceID: 'jamb',
        billersCode: profileId,
        type: variationCode,
      },
    });
  }

  async checkTransactionStatus(reference: string): Promise<VendorResponse> {
    console.log(`🔍 [VTPassVendor] Checking transaction status: ${reference} (${this.environment})`);
    return this.makeRequest({
      service: VtuType.AIRTIME,
      endpoint: '/requery',
      method: 'POST',
      data: { request_id: reference },
    });
  }

  async getWalletBalance(): Promise<VendorResponse> {
    console.log(`💰 [VTPassVendor] Getting wallet balance (${this.environment})`);
    return this.makeRequest({
      service: VtuType.AIRTIME,
      endpoint: '/balance',
      method: 'GET',
      data: {},
    });
  }

  async getServiceCategories(): Promise<VendorResponse> {
    console.log(`📂 [VTPassVendor] Getting service categories (${this.environment})`);
    return this.makeRequest({
      service: VtuType.AIRTIME,
      endpoint: '/service-categories',
      method: 'GET',
      data: {},
    });
  }

  async getServiceVariations(serviceID: string): Promise<VendorResponse> {
    console.log(`📋 [VTPassVendor] Getting service variations for ${serviceID} (${this.environment})`);
    return this.makeRequest({
      service: VtuType.AIRTIME,
      endpoint: `/service-variations?serviceID=${serviceID}`,
      method: 'GET',
      data: {},
    });
  }

  async verifyMerchant(serviceID: string, billersCode: string, type?: string): Promise<VendorResponse> {
    console.log(`🔍 [VTPassVendor] Verifying merchant: ${serviceID} - ${billersCode} (${this.environment})`);
    const payload: any = {
      serviceID,
      billersCode,
    };
    
    if (type) {
      payload.type = type;
    }
    
    return this.makeRequest({
      service: VtuType.AIRTIME,
      endpoint: '/merchant-verify',
      method: 'POST',
      data: payload,
    });
  }

  private getAirtimeServiceId(network: string): string {
    if (!network) {
      console.warn(`⚠️ [VTPassVendor] No network provided for airtime, defaulting to 'mtn'`);
      return 'mtn';
    }
    
    const mapping: Record<string, string> = {
      'MTN': 'mtn',
      'GLO': 'glo',
      'AIRTEL': 'airtel',
      '9MOBILE': 'etisalat',
      'NINEMOBILE': 'etisalat',
    };
    const serviceId = mapping[network.toUpperCase()] || network.toLowerCase();
    console.log(`🔍 [VTPassVendor] Airtime service ID for ${network}: ${serviceId}`);
    return serviceId;
  }

  private getDataServiceId(network: string): string {
    if (!network) {
      console.warn(`⚠️ [VTPassVendor] No network provided for data, defaulting to 'mtn-data'`);
      return 'mtn-data';
    }
    
    const mapping: Record<string, string> = {
      'MTN': 'mtn-data',
      'GLO': 'glo-data',
      'AIRTEL': 'airtel-data',
      '9MOBILE': 'etisalat-data',
      'NINEMOBILE': 'etisalat-data',
    };
    const serviceId = mapping[network.toUpperCase()] || `${network.toLowerCase()}-data`;
    console.log(`🔍 [VTPassVendor] Data service ID for ${network}: ${serviceId}`);
    return serviceId;
  }

  private getElectricityServiceId(disco: string): string {
    if (!disco) {
      console.warn(`⚠️ [VTPassVendor] No disco provided for electricity, defaulting to 'ikeja-electric'`);
      return 'ikeja-electric';
    }
    
    const mapping: Record<string, string> = {
      'ABUJA': 'abuja-electric',
      'PHED': 'poredc-electric',
      'IKEDC': 'ikeja-electric',
      'EKEDC': 'eko-electric',
      'JEDPLC': 'jos-electric',
      'KEDCO': 'kano-electric',
    };
    const serviceId = mapping[disco.toUpperCase()] || disco.toLowerCase();
    console.log(`🔍 [VTPassVendor] Electricity service ID for ${disco}: ${serviceId}`);
    return serviceId;
  }

  private getCableServiceId(provider: string): string {
    if (!provider) {
      console.warn(`⚠️ [VTPassVendor] No provider provided for cable, defaulting to 'dstv'`);
      return 'dstv';
    }
    
    const mapping: Record<string, string> = {
      'DSTV': 'dstv',
      'GOTV': 'gotv',
      'STARTIMES': 'startimes',
      'SHOWMAX': 'showmax',
    };
    const serviceId = mapping[provider.toUpperCase()] || provider.toLowerCase();
    console.log(`🔍 [VTPassVendor] Cable service ID for ${provider}: ${serviceId}`);
    return serviceId;
  }

  private generateRequestId(): string {
    const now = new Date();
    const lagosTime = new Date(now.getTime() + (60 * 60 * 1000));
    const year = lagosTime.getFullYear();
    const month = String(lagosTime.getMonth() + 1).padStart(2, '0');
    const day = String(lagosTime.getDate()).padStart(2, '0');
    const hours = String(lagosTime.getHours()).padStart(2, '0');
    const minutes = String(lagosTime.getMinutes()).padStart(2, '0');
    const random = Math.random().toString(36).substring(2, 8);
    
    return `${year}${month}${day}${hours}${minutes}${random}`;
  }

  private mapStatus(vtpassStatus: string): string {
    const mapping: Record<string, string> = {
      'delivered': 'SUCCESS',
      'pending': 'PENDING',
      'failed': 'FAILED',
      'processing': 'PROCESSING',
      'reversed': 'FAILED',
      'SUCCESS': 'SUCCESS',
      'PENDING': 'PENDING',
      'FAILED': 'FAILED',
      'PROCESSING': 'PROCESSING',
    };
    return mapping[vtpassStatus.toLowerCase()] || 'PENDING';
  }

  private mapErrorCode(code: string, description: string): string {
    const errorMap: Record<string, string> = {
      '001': 'Request failed',
      '002': 'Connection timeout',
      '003': 'Invalid credentials',
      '004': 'Insufficient balance',
      '005': 'Transaction failed',
      '006': 'Invalid request',
      '007': 'Service unavailable',
      '008': 'Duplicate transaction',
      '009': 'Transaction pending',
      '010': 'Invalid service',
      '016': 'Transaction failed',
      '083': 'System error - please contact support',
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

  // ✅ Get current environment
  getEnvironment(): string {
    return this.environment;
  }

  // ✅ Check if using sandbox
  isSandbox(): boolean {
    return this.environment === 'sandbox';
  }

  // ✅ Check if using live
  isLive(): boolean {
    return this.environment === 'live';
  }
}