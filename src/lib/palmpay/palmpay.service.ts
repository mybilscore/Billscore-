// src/lib/palmpay/palmpay.service.ts

import { prisma } from '~/lib/db';
import { generateSignature, generateNonce, verifyWebhookSignature } from './signature';
import {
  PalmPayConfig,
  CreateVirtualAccountRequest,
  CreateVirtualAccountResponse,
  UpdateVirtualAccountRequest,
  QueryVirtualAccountResponse,
  PayInOrderDetailResponse,
  PayInOrderListResponse,
  RefundRequest,
  RefundResponse,
  RefundStatusResponse,
  PalmPayWebhookPayload,
  ApiResponse,
} from './types';

// ✅ Global state for persistence across hot reloads
const globalForPalmPay = global as unknown as {
  palmPayServiceInstance: PalmPayService | null;
  palmPayMode: 'simulation' | 'sandbox' | 'production';
};

class PalmPayService {
  private config: PalmPayConfig;
  private simulationMode: boolean;
  private simulationData: Map<string, any> = new Map();

  constructor(config: PalmPayConfig, simulationMode: boolean = true) {
    this.config = config;
    this.simulationMode = simulationMode;
    
    if (this.simulationMode) {
      this.initSimulationData();
      console.log('🔮 [PalmPay] Running in SIMULATION mode');
    } else {
      console.log('✅ [PalmPay] Running in SANDBOX/PRODUCTION mode');
      console.log(`  - Base URL: ${this.config.baseUrl}`);
      console.log(`  - App ID: ${this.config.authorization}`);
      console.log(`  - Merchant ID: ${this.config.merchantId}`);
      console.log(`  - Country: ${this.config.countryCode}`);
    }
  }

  private initSimulationData(): void {
    this.simulationData.set('virtualAccounts', new Map());
    this.simulationData.set('orders', new Map());
    this.simulationData.set('refunds', new Map());
  }

  /**
   * Get private key in PEM format
   */
  private getPrivateKeyPEM(): string {
    let privateKey = this.config.privateKey;
    if (!privateKey.includes('BEGIN PRIVATE KEY')) {
      privateKey = `-----BEGIN PRIVATE KEY-----\n${privateKey}\n-----END PRIVATE KEY-----`;
    }
    return privateKey;
  }

  /**
   * Get public key in PEM format
   */
  private getPublicKeyPEM(): string {
    let publicKey = this.config.publicKey;
    if (!publicKey.includes('BEGIN PUBLIC KEY')) {
      publicKey = `-----BEGIN PUBLIC KEY-----\n${publicKey}\n-----END PUBLIC KEY-----`;
    }
    return publicKey;
  }

  /**
   * Make API request to PalmPay
   */
  private async makeRequest<T>(
    endpoint: string,
    method: 'GET' | 'POST' | 'PUT' | 'DELETE',
    data: Record<string, any> = {},
    customHeaders: Record<string, string> = {}
  ): Promise<ApiResponse<T>> {
    if (this.simulationMode) {
      return this.simulateRequest<T>(endpoint, method, data);
    }

    if (!this.config.authorization) {
      console.error('❌ PalmPay App ID not configured!');
      return {
        respCode: '99999999',
        respMsg: 'PalmPay App ID not configured',
        status: false,
      };
    }

    if (!this.config.merchantId) {
      console.error('❌ PalmPay Merchant ID not configured!');
      return {
        respCode: '99999999',
        respMsg: 'PalmPay Merchant ID not configured',
        status: false,
      };
    }

    const requestTime = Date.now();
    const nonceStr = generateNonce();
    const version = 'V2.0';

    const requestData = {
      ...data,
      requestTime,
      nonceStr,
      version,
    };

    const privateKeyPEM = this.getPrivateKeyPEM();
    const signature = generateSignature(requestData, privateKeyPEM);

    const url = `${this.config.baseUrl}${endpoint}`;
    
    const headers: HeadersInit = {
      'Authorization': `Bearer ${this.config.authorization}`,
      'CountryCode': this.config.countryCode,
      'Signature': signature,
      'Content-Type': 'application/json;charset=UTF-8',
      ...customHeaders,
    };

    console.log(`📤 [PalmPay API] ${method} ${endpoint}`);
    console.log(`📤 [PalmPay API] App ID: ${this.config.authorization}`);
    console.log(`📤 [PalmPay API] Merchant ID: ${this.config.merchantId}`);

    try {
      const response = await fetch(url, {
        method,
        headers,
        body: method !== 'GET' ? JSON.stringify(requestData) : undefined,
      });

      const result = await response.json();
      
      console.log(`📥 [PalmPay API] Response status: ${response.status}`);
      console.log(`📥 [PalmPay API] Response code: ${result.respCode}`);
      console.log(`📥 [PalmPay API] Response message: ${result.respMsg}`);
      
      if (result.respCode !== '00000000') {
        console.error(`❌ PalmPay API error: ${result.respMsg}`);
      }
      
      return result as ApiResponse<T>;
    } catch (error: any) {
      console.error(`❌ PalmPay API error (${endpoint}):`, error);
      return {
        respCode: '99999999',
        respMsg: error.message || 'Request failed',
        status: false,
      };
    }
  }

  /**
   * Simulate API requests for testing
   */
  private async simulateRequest<T>(
    endpoint: string,
    method: 'GET' | 'POST' | 'PUT' | 'DELETE',
    data: Record<string, any>
  ): Promise<ApiResponse<T>> {
    console.log(`🔮 [SIMULATION] ${method} ${endpoint}`);

    await new Promise(resolve => setTimeout(resolve, 500 + Math.random() * 1000));

    const response: ApiResponse<T> = {
      respCode: '00000000',
      respMsg: 'success',
      status: true,
    };

    try {
      if (endpoint.includes('/virtual/account/label/create')) {
        response.data = this.simulateCreateVirtualAccount(data) as T;
      } else if (endpoint.includes('/virtual/account/label/update')) {
        response.data = this.simulateUpdateVirtualAccount(data) as T;
      } else if (endpoint.includes('/virtual/account/label/delete')) {
        response.data = this.simulateDeleteVirtualAccount(data) as T;
      } else if (endpoint.includes('/virtual/account/label/queryOne')) {
        response.data = this.simulateQueryVirtualAccount(data) as T;
      } else if (endpoint.includes('/virtual/order/detail')) {
        response.data = this.simulateQueryOrder(data) as T;
      } else if (endpoint.includes('/virtual/order/pageList')) {
        response.data = this.simulateQueryOrders(data) as T;
      } else if (endpoint.includes('/virtual/order/refund')) {
        response.data = this.simulateRefund(data) as T;
      } else if (endpoint.includes('/virtual/order/refund/queryStatus')) {
        response.data = this.simulateRefundStatus(data) as T;
      } else {
        response.respCode = '99999999';
        response.respMsg = 'Endpoint not implemented in simulation';
        response.status = false;
      }
    } catch (error: any) {
      response.respCode = '99999999';
      response.respMsg = error.message || 'Simulation error';
      response.status = false;
    }

    return response;
  }

  // ============ Simulation Methods ============

  private simulateCreateVirtualAccount(data: Record<string, any>): CreateVirtualAccountResponse {
    const virtualAccounts = this.simulationData.get('virtualAccounts') as Map<string, any>;
    
    const existing = Array.from(virtualAccounts.values()).find(
      (v: any) => v.licenseNumber === data.licenseNumber
    );
    if (existing) {
      throw new Error('Virtual account already exists for this license number');
    }

    const accountNo = `666${Math.floor(1000000 + Math.random() * 9000000)}`;
    
    const account: CreateVirtualAccountResponse = {
      virtualAccountName: `${data.virtualAccountName}(Account Suffix)`,
      virtualAccountNo: accountNo,
      status: 'Enabled',
      identityType: data.identityType,
      licenseNumber: data.licenseNumber,
      email: data.email,
      customerName: data.customerName,
      accountReference: data.accountReference || `ref_${Date.now()}`,
    };

    virtualAccounts.set(accountNo, account);
    return account;
  }

  private simulateUpdateVirtualAccount(data: Record<string, any>): null {
    const virtualAccounts = this.simulationData.get('virtualAccounts') as Map<string, any>;
    const account = virtualAccounts.get(data.virtualAccountNo);
    
    if (!account) {
      throw new Error('Virtual account not found');
    }

    account.status = data.status;
    return null;
  }

  private simulateDeleteVirtualAccount(data: Record<string, any>): null {
    const virtualAccounts = this.simulationData.get('virtualAccounts') as Map<string, any>;
    
    if (!virtualAccounts.has(data.virtualAccountNo)) {
      throw new Error('Virtual account not found');
    }

    const account = virtualAccounts.get(data.virtualAccountNo);
    account.status = 'Deleted';
    return null;
  }

  private simulateQueryVirtualAccount(data: Record<string, any>): QueryVirtualAccountResponse {
    const virtualAccounts = this.simulationData.get('virtualAccounts') as Map<string, any>;
    const account = virtualAccounts.get(data.virtualAccountNo);
    
    if (!account) {
      throw new Error('Virtual account not found');
    }

    return { ...account };
  }

  private simulateQueryOrder(data: Record<string, any>): PayInOrderDetailResponse {
    const orders = this.simulationData.get('orders') as Map<string, any>;
    const order = orders.get(data.orderNo);
    
    if (!order) {
      throw new Error('Order not found');
    }

    return { ...order };
  }

  private simulateQueryOrders(data: Record<string, any>): PayInOrderListResponse {
    const orders = this.simulationData.get('orders') as Map<string, any>;
    const orderList = Array.from(orders.values());
    
    const filtered = data.accountNo 
      ? orderList.filter(o => o.virtualAccountNo === data.accountNo)
      : orderList;

    const timeFiltered = filtered.filter(o => {
      const created = o.createdTime;
      return created >= data.startTime && created <= data.endTime;
    });

    const pageIndex = data.pageIndex || 1;
    const pageSize = data.pageSize || 50;
    const start = (pageIndex - 1) * pageSize;
    const end = start + pageSize;
    const paginated = timeFiltered.slice(start, end);

    return {
      pageIndex,
      pageSize,
      totalCount: timeFiltered.length,
      list: paginated,
    };
  }

  private simulateRefund(data: Record<string, any>): RefundResponse {
    const orders = this.simulationData.get('orders') as Map<string, any>;
    const order = orders.get(data.originOrderNo);
    
    if (!order) {
      throw new Error('Order not found');
    }

    if (data.amount > order.orderAmount) {
      throw new Error('Refund amount exceeds order amount');
    }

    const refunds = this.simulationData.get('refunds') as Map<string, any>;
    const refundId = `REF_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

    const refund: RefundResponse = {
      orderNo: `RFN${Date.now()}`,
      orderId: data.orderId,
      orderStatus: 1,
      currency: 'NGN',
      amount: data.amount,
    };

    refunds.set(refundId, refund);
    
    if (data.amount === order.orderAmount) {
      order.orderStatus = 4;
    } else {
      order.orderStatus = 5;
    }

    return refund;
  }

  private simulateRefundStatus(data: Record<string, any>): RefundStatusResponse {
    const refunds = this.simulationData.get('refunds') as Map<string, any>;
    const refund = Array.from(refunds.values()).find((r: any) => r.orderId === data.orderId);
    
    if (!refund) {
      throw new Error('Refund not found');
    }

    return {
      orderId: refund.orderId,
      orderNo: refund.orderNo,
      orderStatus: 1,
      message: 'success',
      currency: 'NGN',
      amount: refund.amount,
    };
  }

  // ============ Public API Methods ============

  async createVirtualAccount(
    request: CreateVirtualAccountRequest
  ): Promise<ApiResponse<CreateVirtualAccountResponse>> {
    return this.makeRequest<CreateVirtualAccountResponse>(
      '/api/v2/virtual/account/label/create',
      'POST',
      request
    );
  }

  async updateVirtualAccount(
    request: UpdateVirtualAccountRequest
  ): Promise<ApiResponse<null>> {
    return this.makeRequest<null>(
      '/api/v2/virtual/account/label/update',
      'POST',
      request
    );
  }

  async deleteVirtualAccount(
    virtualAccountNo: string
  ): Promise<ApiResponse<null>> {
    return this.makeRequest<null>(
      '/api/v2/virtual/account/label/delete',
      'POST',
      { virtualAccountNo }
    );
  }

  async queryVirtualAccount(
    virtualAccountNo: string
  ): Promise<ApiResponse<QueryVirtualAccountResponse>> {
    return this.makeRequest<QueryVirtualAccountResponse>(
      '/api/v2/virtual/account/label/queryOne',
      'POST',
      { virtualAccountNo }
    );
  }

  async queryOrderDetail(
    orderNo: string
  ): Promise<ApiResponse<PayInOrderDetailResponse>> {
    return this.makeRequest<PayInOrderDetailResponse>(
      '/api/v2/virtual/order/detail',
      'POST',
      { orderNo }
    );
  }

  async queryOrders(params: {
    accountNo?: string;
    startTime: number;
    endTime: number;
    pageIndex?: number;
    pageSize?: number;
  }): Promise<ApiResponse<PayInOrderListResponse>> {
    return this.makeRequest<PayInOrderListResponse>(
      '/api/v2/virtual/order/pageList',
      'POST',
      params
    );
  }

  async createRefund(
    request: RefundRequest
  ): Promise<ApiResponse<RefundResponse>> {
    return this.makeRequest<RefundResponse>(
      '/api/v2/virtual/order/refund',
      'POST',
      request
    );
  }

  async queryRefundStatus(
    params: { orderId?: string; orderNo?: string }
  ): Promise<ApiResponse<RefundStatusResponse>> {
    return this.makeRequest<RefundStatusResponse>(
      '/api/v2/virtual/order/refund/queryStatus',
      'POST',
      params
    );
  }

  async handleWebhook(
    payload: PalmPayWebhookPayload,
    signature: string
  ): Promise<{
    verified: boolean;
    order: PayInOrderDetailResponse | null;
  }> {
    const publicKeyPEM = this.getPublicKeyPEM();
    const verified = verifyWebhookSignature(
      payload as any,
      signature,
      publicKeyPEM
    );

    if (!verified) {
      console.error('❌ Webhook signature verification failed');
      return { verified: false, order: null };
    }

    console.log('✅ Webhook signature verified');

    if (this.simulationMode) {
      const orders = this.simulationData.get('orders') as Map<string, any>;
      orders.set(payload.orderNo, payload);
    }

    try {
      const user = await prisma.user.findFirst({
        where: {
          wallet: { 
            accountNumber: payload.virtualAccountNo 
          }
        },
        include: { wallet: true },
      });

      if (user && user.wallet) {
        const amount = payload.orderAmount / 100;
        
        await prisma.$transaction([
          prisma.wallet.update({
            where: { id: user.wallet.id },
            data: {
              walletBalance: {
                increment: amount,
              },
            },
          }),
          prisma.walletTransaction.create({
            data: {
              walletId: user.wallet.id,
              userId: user.id,
              type: 'CREDIT',
              amount: amount,
              balanceBefore: Number(user.wallet.walletBalance),
              balanceAfter: Number(user.wallet.walletBalance) + amount,
              reference: payload.orderNo,
              description: `Pay-in from ${payload.payerAccountName} (${payload.payerBankName})`,
              status: 'SUCCESS',
              category: 'FUNDING',
              metadata: {
                orderNo: payload.orderNo,
                payerAccountNo: payload.payerAccountNo,
                payerBankName: payload.payerBankName,
                virtualAccountNo: payload.virtualAccountNo,
                sessionId: payload.sessionId,
              },
            },
          }),
        ]);

        await prisma.walletFunding.create({
          data: {
            walletId: user.wallet.id,
            amount: amount,
            reference: payload.orderNo,
            provider: 'PALMPAY',
            providerReference: payload.orderNo,
            status: 'SUCCESS',
            metadata: payload,
          },
        });

        console.log(`💰 Wallet balance updated for user ${user.id}: +₦${amount}`);
      } else {
        console.warn(`⚠️ User not found for virtual account: ${payload.virtualAccountNo}`);
      }
    } catch (error) {
      console.error('❌ Failed to update wallet from webhook:', error);
    }

    return { verified: true, order: payload };
  }

  /**
   * Check if the service is in simulation mode
   */
  isSimulationMode(): boolean {
    return this.simulationMode;
  }

  /**
   * Get current mode
   */
  getMode(): 'simulation' | 'sandbox' | 'production' {
    if (this.simulationMode) return 'simulation';
    return this.config.isProduction ? 'production' : 'sandbox';
  }

  /**
   * Get current status
   */
  getStatus() {
    return {
      mode: this.getMode(),
      isSimulation: this.simulationMode,
      config: {
        baseUrl: this.config.baseUrl,
        merchantId: this.config.merchantId,
        isProduction: this.config.isProduction || false,
        countryCode: this.config.countryCode,
      },
    };
  }

  /**
   * Switch to production/sandbox mode
   */
  switchToProduction(config?: Partial<PalmPayConfig>): void {
    this.simulationMode = false;
    if (config) {
      this.config = { ...this.config, ...config };
    }
    globalForPalmPay.palmPayMode = this.config.isProduction ? 'production' : 'sandbox';
    console.log('🔄 [PalmPay] Switched to PRODUCTION/SANDBOX mode');
    console.log(`  - Base URL: ${this.config.baseUrl}`);
    console.log(`  - App ID: ${this.config.authorization}`);
    console.log(`  - Merchant ID: ${this.config.merchantId}`);
  }

  /**
   * Switch to simulation mode
   */
  switchToSimulation(): void {
    this.simulationMode = true;
    this.initSimulationData();
    globalForPalmPay.palmPayMode = 'simulation';
    console.log('🔄 [PalmPay] Switched to SIMULATION mode');
  }

  /**
   * Switch mode with full control
   */
  switchMode(mode: 'simulation' | 'sandbox' | 'production'): void {
    if (mode === 'simulation') {
      this.switchToSimulation();
      return;
    }

    this.simulationMode = false;
    
    // Reload config from environment
    const newConfig: Partial<PalmPayConfig> = {
      baseUrl: process.env.PALMPAY_BASE_URL || this.config.baseUrl,
      authorization: process.env.PALMPAY_AUTHORIZATION || this.config.authorization,
      merchantId: process.env.PALMPAY_MERCHANT_ID || this.config.merchantId,
      countryCode: process.env.PALMPAY_COUNTRY_CODE || 'NG',
      publicKey: process.env.PALMPAY_PUBLIC_KEY || this.config.publicKey,
      privateKey: process.env.PALMPAY_PRIVATE_KEY || this.config.privateKey,
      isProduction: mode === 'production',
      webhookUrl: process.env.PALMPAY_WEBHOOK_URL || this.config.webhookUrl,
    };
    
    this.config = { ...this.config, ...newConfig };
    globalForPalmPay.palmPayMode = mode;
    
    console.log(`🔄 [PalmPay] Switched to ${mode.toUpperCase()} mode`);
    console.log(`  - Base URL: ${this.config.baseUrl}`);
    console.log(`  - App ID: ${this.config.authorization ? '✅' : '❌'}`);
    console.log(`  - Merchant ID: ${this.config.merchantId ? '✅' : '❌'}`);
  }

  /**
   * Test connection to PalmPay API
   */
  async testConnection(): Promise<{
    success: boolean;
    message: string;
    details?: any;
  }> {
    try {
      if (this.simulationMode) {
        return {
          success: true,
          message: 'Running in simulation mode',
          details: { mode: 'simulation' },
        };
      }

      const result = await this.queryVirtualAccount('test_connection_123');
      
      return {
        success: result.status,
        message: result.respMsg || 'Connection test completed',
        details: {
          respCode: result.respCode,
          mode: 'sandbox',
          appId: this.config.authorization,
          merchantId: this.config.merchantId,
        },
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.message || 'Connection test failed',
        details: { error: error.message },
      };
    }
  }
}

// ============================================================
// ✅ SINGLETON EXPORT WITH PERSISTENCE
// ============================================================

export function getPalmPayService(
  config?: Partial<PalmPayConfig>,
  simulationMode?: boolean
): PalmPayService {
  // ✅ Use persisted mode if available
  const persistedMode = globalForPalmPay.palmPayMode;
  
  if (!globalForPalmPay.palmPayServiceInstance) {
    const defaultConfig: PalmPayConfig = {
      baseUrl: process.env.PALMPAY_BASE_URL || 'https://open-gw-sandbox.palmpay-inc.com',
      authorization: process.env.PALMPAY_AUTHORIZATION || '',
      merchantId: process.env.PALMPAY_MERCHANT_ID || '',
      countryCode: process.env.PALMPAY_COUNTRY_CODE || 'NG',
      publicKey: process.env.PALMPAY_PUBLIC_KEY || '',
      privateKey: process.env.PALMPAY_PRIVATE_KEY || '',
      isProduction: process.env.NODE_ENV === 'production',
      webhookUrl: process.env.PALMPAY_WEBHOOK_URL || '',
    };

    const mergedConfig = { ...defaultConfig, ...config };
    
    const hasAllConfig = mergedConfig.authorization && 
                         mergedConfig.merchantId && 
                         mergedConfig.publicKey && 
                         mergedConfig.privateKey;

    // ✅ Use persisted mode or determine from config
    let isSimulation: boolean;

    if (persistedMode) {
      isSimulation = persistedMode === 'simulation';
    } else if (simulationMode !== undefined) {
      isSimulation = simulationMode;
    } else {
      isSimulation = !mergedConfig.isProduction || !hasAllConfig;
    }

    if (isSimulation && !simulationMode && !persistedMode) {
      console.warn('⚠️ [PalmPay] Missing configuration! Falling back to SIMULATION.');
      console.warn(`  - App ID: ${mergedConfig.authorization ? '✅' : '❌'}`);
      console.warn(`  - Merchant ID: ${mergedConfig.merchantId ? '✅' : '❌'}`);
      console.warn(`  - Public Key: ${mergedConfig.publicKey ? '✅' : '❌'}`);
      console.warn(`  - Private Key: ${mergedConfig.privateKey ? '✅' : '❌'}`);
    }

    globalForPalmPay.palmPayServiceInstance = new PalmPayService(mergedConfig, isSimulation);
    
    // ✅ Save the initial mode
    if (!globalForPalmPay.palmPayMode) {
      globalForPalmPay.palmPayMode = isSimulation ? 'simulation' : 'sandbox';
    }
  }
  
  return globalForPalmPay.palmPayServiceInstance;
}