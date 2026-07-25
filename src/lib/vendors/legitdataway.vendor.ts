// src/lib/vendors/legitdataway.vendor.ts

import { BaseVendor } from './base.vendor';
import {
  VendorConfig,
  VendorRequest,
  VendorResponse,
  VendorAuthType,
  VtuVendor,
} from './types';
import { VtuType } from '@prisma/client';
import {
  LegitDatawayAuthResponse,
  LegitDatawayAirtimeRequest,
  LegitDatawayAirtimeResponse,
  LegitDatawayDataRequest,
  LegitDatawayDataResponse,
  LegitDatawayElectricityRequest,
  LegitDatawayElectricityResponse,
  LegitDatawayCableRequest,
  LegitDatawayCableResponse,
  LegitDatawayNetworkMap,
  LegitDatawayDataPlanMap,
  LegitDatawayDiscoMap,
  LegitDatawayCableMap,
} from './legitdataway.types';

interface LegitDatawayAuthConfig {
  username: string;
  password: string;
  accessToken?: string;
  tokenExpiry?: Date;
}

export class LegitDatawayVendor extends BaseVendor {
  private authConfig: LegitDatawayAuthConfig;
  private accessToken: string | null = null;
  private tokenExpiry: Date | null = null;

  constructor(config: VendorConfig) {
    super({
      ...config,
      authType: VendorAuthType.BEARER_TOKEN,
      authConfig: config.authConfig,
    });
    
    this.authConfig = config.authConfig as LegitDatawayAuthConfig;
    console.log(`✅ [LegitDatawayVendor] Initialized with username: ${this.authConfig.username}`);
    console.log(`✅ [LegitDatawayVendor] API Base URL: ${config.apiBaseUrl}`);
  }

  async authenticate(): Promise<Record<string, string>> {
    // Check if we have a valid token
    if (this.accessToken && this.tokenExpiry && this.tokenExpiry > new Date()) {
      console.log(`🔑 [LegitDatawayVendor] Using cached token: ${this.accessToken.substring(0, 10)}...`);
      return {
        'Authorization': `Token ${this.accessToken}`,
        'Content-Type': 'application/json',
      };
    }

    console.log(`🔑 [LegitDatawayVendor] Obtaining new token...`);
    
    // Simulate authentication with the Legitdataway API
    const authString = `${this.authConfig.username}:${this.authConfig.password}`;
    const encodedAuth = Buffer.from(authString).toString('base64');

    try {
      // In simulation mode, we'll simulate the API response
      // In real mode, this would make an actual API call
      const simulatedResponse: LegitDatawayAuthResponse = {
        status: 'success',
        AccessToken: `sim-token-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`,
        balance: '100000.00',
        username: this.authConfig.username,
      };

      // Simulate API call
      console.log(`🔑 [LegitDatawayVendor] Simulating auth request to: ${this.config.apiBaseUrl}/api/user`);
      
      // In production, you would make a real fetch call:
      // const response = await fetch(`${this.config.apiBaseUrl}/api/user`, {
      //   method: 'POST',
      //   headers: {
      //     'Authorization': `Basic ${encodedAuth}`,
      //     'Content-Type': 'application/json',
      //   },
      // });
      // const data = await response.json();

      // For simulation, we'll use the simulated response
      const data = simulatedResponse;

      if (data.status === 'success' && data.AccessToken) {
        this.accessToken = data.AccessToken;
        this.tokenExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
        console.log(`✅ [LegitDatawayVendor] Token obtained: ${this.accessToken.substring(0, 10)}...`);
        
        return {
          'Authorization': `Token ${this.accessToken}`,
          'Content-Type': 'application/json',
        };
      }

      throw new Error('Authentication failed: No access token received');
    } catch (error: any) {
      console.error(`❌ [LegitDatawayVendor] Authentication failed:`, error.message);
      throw new Error(`Authentication failed: ${error.message}`);
    }
  }

  transformRequest<T>(request: VendorRequest<T>): any {
    console.log(`🔄 [LegitDatawayVendor] Transforming request for: ${request.service}`);
    console.log(`🔄 [LegitDatawayVendor] Original data:`, JSON.stringify(request.data, null, 2));
    
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
        console.warn(`⚠️ [LegitDatawayVendor] Unknown service type: ${request.service}`);
        transformedData = request.data;
    }
    
    console.log(`🔄 [LegitDatawayVendor] Transformed data:`, JSON.stringify(transformedData, null, 2));
    return transformedData;
  }

  private transformAirtimeRequest(data: any): LegitDatawayAirtimeRequest {
    console.log(`📱 [LegitDatawayVendor] Airtime request:`, data);
    
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

  private transformDataRequest(data: any): LegitDatawayDataRequest {
    console.log(`📊 [LegitDatawayVendor] Data request:`, data);
    
    const networkMap: Record<string, number> = {
      'MTN': 1,
      'GLO': 3,
      'AIRTEL': 2,
      '9MOBILE': 4,
    };

    // Map plan code to data plan ID (simplified)
    const planId = this.getDataPlanId(data.network, data.planCode);

    return {
      network: networkMap[data.network] || 1,
      phone: data.phoneNumber,
      data_plan: planId,
      bypass: false,
      'request-id': this.generateRequestId('Data'),
    };
  }

  private transformElectricityRequest(data: any): LegitDatawayElectricityRequest {
    console.log(`⚡ [LegitDatawayVendor] Electricity request:`, data);
    
    const discoMap: Record<string, number> = {
      'IKEJA': 1,
      'EKO': 2,
      'KANO': 3,
      'PORT_HARCOURT': 4,
      'JOS': 5,
      'IBADAN': 6,
      'KADUNA': 7,
      'ABUJA': 8,
    };

    return {
      disco: discoMap[data.discoCode] || 1,
      meter_type: data.meterType || 'prepaid',
      meter_number: data.meterNumber,
      amount: data.amount,
      bypass: false,
      'request-id': this.generateRequestId('Bill'),
    };
  }

  private transformCableTVRequest(data: any): LegitDatawayCableRequest {
    console.log(`📺 [LegitDatawayVendor] Cable TV request:`, data);
    
    return {
      cablename: data.provider.toLowerCase(),
      cableplan: data.packageCode,
      smart_card_number: data.decoderNumber,
      'request-id': this.generateRequestId('Cable'),
    };
  }

  transformResponse(response: any): VendorResponse {
    console.log(`🔄 [LegitDatawayVendor] Transforming response...`);
    console.log(`🔄 [LegitDatawayVendor] Raw response:`, JSON.stringify(response, null, 2));
    
    if (response.status === 'success') {
      console.log(`✅ [LegitDatawayVendor] Success response`);
      
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
        vendor: VtuVendor.VTPASS,
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

    console.warn(`⚠️ [LegitDatawayVendor] Error response`);
    
    return {
      success: false,
      error: response.message || 'Transaction failed',
      statusCode: 400,
      vendor: VtuVendor.VTPASS,
      vendorReference: response['request-id'],
      rawResponse: response,
      metadata: {
        responseCode: '999',
        description: response.message || 'Unknown error',
      },
    };
  }

  // Override makeRequest for simulation
  protected async makeRequest<T>(request: VendorRequest<T>): Promise<VendorResponse<T>> {
    const startTime = Date.now();
    
    // Map endpoint to Legitdataway API
    let endpoint = request.endpoint;
    let url = `${this.config.apiBaseUrl}${endpoint}`;
    
    // Map service to correct endpoint
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
    console.log(`🔍 [LegitDatawayVendor] Full URL: ${url}`);
    console.log(`🔍 [LegitDatawayVendor] Request method: ${request.method}`);
    
    try {
      const headers = await this.authenticate();
      console.log(`🔍 [LegitDatawayVendor] Headers:`, JSON.stringify(headers, null, 2));
      
      const transformedData = this.transformRequest(request);
      console.log(`🔍 [LegitDatawayVendor] Request body:`, JSON.stringify(transformedData, null, 2));
      
      // In simulation mode, generate a simulated response
      // In production, make the actual API call
      const simulatedResponse = this.generateSimulatedResponse(request.service, transformedData);
      console.log(`🔍 [LegitDatawayVendor] Simulated response:`, JSON.stringify(simulatedResponse, null, 2));
      
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
      console.error(`❌ [LegitDatawayVendor] Request failed:`, error);
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
    // Simplified - you'd have a full mapping
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

  private getDataPlanId(network: string, planCode: string): number {
    // Simplified mapping - you'd have a full database of plans
    const networkMap: Record<string, Record<string, number>> = {
      'MTN': { '500MB': 1, '1GB': 2, '2GB': 3, '5GB': 4 },
      'GLO': { '500MB': 220, '1GB': 221, '3GB': 224, '5GB': 227 },
      'AIRTEL': { '500MB': 15, '1GB': 16, '2GB': 17, '5GB': 18 },
      '9MOBILE': { '500MB': 70, '1GB': 71, '2GB': 72, '5GB': 73 },
    };
    
    return networkMap[network]?.[planCode] || 1;
  }

  private generateRequestId(prefix: string): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    return `${prefix}_${timestamp}_${random}`;
  }

  // Override service methods to use the correct endpoints
  async buyAirtime(request: any): Promise<VendorResponse> {
    console.log(`📞 [LegitDatawayVendor] buyAirtime called`);
    return this.makeRequest({
      service: VtuType.AIRTIME,
      endpoint: '/api/topup',
      method: 'POST',
      data: request,
    });
  }

  async buyData(request: any): Promise<VendorResponse> {
    console.log(`📊 [LegitDatawayVendor] buyData called`);
    return this.makeRequest({
      service: VtuType.DATA,
      endpoint: '/api/data',
      method: 'POST',
      data: request,
    });
  }

  async buyElectricity(request: any): Promise<VendorResponse> {
    console.log(`⚡ [LegitDatawayVendor] buyElectricity called`);
    return this.makeRequest({
      service: VtuType.ELECTRICITY_INSTANT,
      endpoint: '/api/bill',
      method: 'POST',
      data: request,
    });
  }

  async buyCableTV(request: any): Promise<VendorResponse> {
    console.log(`📺 [LegitDatawayVendor] buyCableTV called`);
    return this.makeRequest({
      service: VtuType.CABLE_TV,
      endpoint: '/api/cable',
      method: 'POST',
      data: request,
    });
  }

  async checkVendorHealth(): Promise<boolean> {
    try {
      console.log(`🏥 [LegitDatawayVendor] Checking vendor health...`);
      // In simulation mode, always return true
      return true;
    } catch (error) {
      return false;
    }
  }
}