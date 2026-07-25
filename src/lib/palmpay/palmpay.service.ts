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
  VirtualAccountStatus,
} from './types';

class PalmPayService {
  private config: PalmPayConfig;
  private simulationMode: boolean;
  private simulationData: Map<string, any> = new Map();

  constructor(config: PalmPayConfig, simulationMode: boolean = true) {
    this.config = config;
    this.simulationMode = simulationMode;
    
    // Initialize simulation data
    if (this.simulationMode) {
      this.initSimulationData();
    }
  }

  private initSimulationData(): void {
    this.simulationData.set('virtualAccounts', new Map());
    this.simulationData.set('orders', new Map());
    this.simulationData.set('refunds', new Map());
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
    // ✅ Check if we have the Bearer token
    if (!this.simulationMode && !this.config.authorization) {
      console.error('❌ PalmPay Bearer token not configured!');
      return {
        respCode: '99999999',
        respMsg: 'PalmPay Bearer token not configured. Please set PALMPAY_AUTHORIZATION environment variable.',
        status: false,
      };
    }

    if (this.simulationMode) {
      return this.simulateRequest<T>(endpoint, method, data);
    }

    const requestTime = Date.now();
    const nonceStr = generateNonce();
    const version = 'V2.0';

    // Prepare request data
    const requestData = {
      ...data,
      requestTime,
      nonceStr,
      version,
    };

    // Generate signature
    const signature = generateSignature(
      requestData,
      this.config.privateKey,
      nonceStr,
      requestTime,
      version
    );

    const url = `${this.config.baseUrl}${endpoint}`;
    
    const headers: HeadersInit = {
      // ✅ Bearer token authorization
      'Authorization': `Bearer ${this.config.authorization}`,
      'countryCode': this.config.countryCode,
      'Signature': signature,
      'Content-Type': 'application/json;charset=UTF-8',
      ...customHeaders,
    };

    console.log(`📤 [PalmPay API] ${method} ${endpoint}`);
    console.log(`📤 [PalmPay API] Bearer token: ${this.config.authorization.substring(0, 10)}...`);

    try {
      const response = await fetch(url, {
        method,
        headers,
        body: method !== 'GET' ? JSON.stringify(requestData) : undefined,
      });

      const result = await response.json();
      
      console.log(`📥 [PalmPay API] Response status: ${response.status}`);
      console.log(`📥 [PalmPay API] Response code: ${result.respCode}`);
      
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
   * Simulate API requests
   */
  private async simulateRequest<T>(
    endpoint: string,
    method: 'GET' | 'POST' | 'PUT' | 'DELETE',
    data: Record<string, any>
  ): Promise<ApiResponse<T>> {
    console.log(`🔮 [SIMULATION] ${method} ${endpoint}`, {
      ...data,
      licenseNumber: data.licenseNumber ? '***REDACTED***' : undefined,
    });

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
      virtualAccountName: `${data.virtualAccountName}(Account Suffix of Institution)`,
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

  /**
   * Create a virtual account
   */
  async createVirtualAccount(
    request: CreateVirtualAccountRequest
  ): Promise<ApiResponse<CreateVirtualAccountResponse>> {
    return this.makeRequest<CreateVirtualAccountResponse>(
      '/api/v2/virtual/account/label/create',
      'POST',
      request
    );
  }

  /**
   * Update virtual account status
   */
  async updateVirtualAccount(
    request: UpdateVirtualAccountRequest
  ): Promise<ApiResponse<null>> {
    return this.makeRequest<null>(
      '/api/v2/virtual/account/label/update',
      'POST',
      request
    );
  }

  /**
   * Delete virtual account
   */
  async deleteVirtualAccount(
    virtualAccountNo: string
  ): Promise<ApiResponse<null>> {
    return this.makeRequest<null>(
      '/api/v2/virtual/account/label/delete',
      'POST',
      { virtualAccountNo }
    );
  }

  /**
   * Query virtual account
   */
  async queryVirtualAccount(
    virtualAccountNo: string
  ): Promise<ApiResponse<QueryVirtualAccountResponse>> {
    return this.makeRequest<QueryVirtualAccountResponse>(
      '/api/v2/virtual/account/label/queryOne',
      'POST',
      { virtualAccountNo }
    );
  }

  /**
   * Query pay-in order detail
   */
  async queryOrderDetail(
    orderNo: string
  ): Promise<ApiResponse<PayInOrderDetailResponse>> {
    return this.makeRequest<PayInOrderDetailResponse>(
      '/api/v2/virtual/order/detail',
      'POST',
      { orderNo }
    );
  }

  /**
   * Query pay-in orders (bulk)
   */
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

  /**
   * Create refund
   */
  async createRefund(
    request: RefundRequest
  ): Promise<ApiResponse<RefundResponse>> {
    return this.makeRequest<RefundResponse>(
      '/api/v2/virtual/order/refund',
      'POST',
      request
    );
  }

  /**
   * Query refund status
   */
  async queryRefundStatus(
    params: { orderId?: string; orderNo?: string }
  ): Promise<ApiResponse<RefundStatusResponse>> {
    return this.makeRequest<RefundStatusResponse>(
      '/api/v2/virtual/order/refund/queryStatus',
      'POST',
      params
    );
  }

  /**
   * Handle webhook notification
   */
  async handleWebhook(
    payload: PalmPayWebhookPayload,
    signature: string
  ): Promise<{
    verified: boolean;
    order: PayInOrderDetailResponse | null;
  }> {
    const verified = verifyWebhookSignature(
      payload as any,
      signature,
      this.config.publicKey
    );

    if (!verified) {
      console.error('Webhook signature verification failed');
      return { verified: false, order: null };
    }

    if (this.simulationMode) {
      const orders = this.simulationData.get('orders') as Map<string, any>;
      orders.set(payload.orderNo, payload);
    }

    // Update user wallet balance in database
    try {
      const user = await prisma.user.findFirst({
        where: {
          wallet: { accountNumber: payload.virtualAccountNo }
        },
        include: { wallet: true },
      });

      if (user && user.wallet) {
        await prisma.$transaction([
          prisma.wallet.update({
            where: { id: user.wallet.id },
            data: {
              walletBalance: {
                increment: payload.orderAmount / 100,
              },
            },
          }),
          prisma.walletTransaction.create({
            data: {
              walletId: user.wallet.id,
              userId: user.id,
              type: 'CREDIT',
              amount: payload.orderAmount / 100,
              balanceBefore: Number(user.wallet.walletBalance),
              balanceAfter: Number(user.wallet.walletBalance) + (payload.orderAmount / 100),
              reference: payload.orderNo,
              description: `Pay-in from ${payload.payerAccountName} (${payload.payerBankName})`,
              status: 'SUCCESS',
              category: 'DEPOSIT',
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

        console.log(`💰 Wallet balance updated for user ${user.id}: +₦${payload.orderAmount / 100}`);
      }
    } catch (error) {
      console.error('Failed to update wallet from webhook:', error);
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
   * Switch to production mode
   */
  switchToProduction(config?: Partial<PalmPayConfig>): void {
    this.simulationMode = false;
    if (config) {
      this.config = { ...this.config, ...config };
    }
  }

  /**
   * Switch to simulation mode
   */
  switchToSimulation(): void {
    this.simulationMode = true;
    this.initSimulationData();
  }

  /**
   * Get all simulated orders (for testing)
   */
  getSimulatedOrders(): any[] {
    if (!this.simulationMode) return [];
    const orders = this.simulationData.get('orders') as Map<string, any>;
    return Array.from(orders.values());
  }

  /**
   * Get all simulated virtual accounts (for testing)
   */
  getSimulatedAccounts(): any[] {
    if (!this.simulationMode) return [];
    const accounts = this.simulationData.get('virtualAccounts') as Map<string, any>;
    return Array.from(accounts.values());
  }

  /**
   * Simulate a pay-in webhook (for testing)
   */
  simulateWebhook(payload: Partial<PalmPayWebhookPayload>): void {
    if (!this.simulationMode) return;

    const orders = this.simulationData.get('orders') as Map<string, any>;
    const order = {
      orderNo: `MI${Date.now()}`,
      orderStatus: 1,
      createdTime: Date.now(),
      updateTime: Date.now(),
      currency: 'NGN',
      orderAmount: payload.orderAmount || 10000,
      reference: payload.reference || 'test',
      payerAccountNo: payload.payerAccountNo || '1234567890',
      payerAccountName: payload.payerAccountName || 'Test User',
      payerBankName: payload.payerBankName || 'PalmPay',
      virtualAccountNo: payload.virtualAccountNo || '6664564951',
      virtualAccountName: payload.virtualAccountName || 'Test Account',
      accountReference: payload.accountReference || `ref_${Date.now()}`,
      sessionId: payload.sessionId || `session_${Date.now()}`,
      ...payload,
    };

    orders.set(order.orderNo, order);
    console.log(`📨 [SIMULATION] Webhook triggered for order ${order.orderNo}`);
  }
}

// Singleton instance
let palmPayServiceInstance: PalmPayService | null = null;

export function getPalmPayService(
  config?: Partial<PalmPayConfig>,
  simulationMode?: boolean
): PalmPayService {
  if (!palmPayServiceInstance) {
    const defaultConfig: PalmPayConfig = {
      baseUrl: process.env.PALMPAY_BASE_URL || 'https://open-gw-sandbox.palmpay-inc.com',
      authorization: process.env.PALMPAY_AUTHORIZATION || '', // ✅ Bearer token
      countryCode: process.env.PALMPAY_COUNTRY_CODE || 'NG',
      publicKey: process.env.PALMPAY_PUBLIC_KEY || '',
      privateKey: process.env.PALMPAY_PRIVATE_KEY || '',
      isProduction: process.env.NODE_ENV === 'production',
      webhookUrl: process.env.PALMPAY_WEBHOOK_URL || '',
    };

    const mergedConfig = { ...defaultConfig, ...config };
    const isSimulation = simulationMode !== undefined 
      ? simulationMode 
      : !mergedConfig.isProduction || !mergedConfig.authorization;

    // ✅ Log the Bearer token status
    if (isSimulation) {
      console.log('🔮 [PalmPay] Running in SIMULATION mode');
    } else if (mergedConfig.authorization) {
      console.log('✅ [PalmPay] Running in PRODUCTION mode with Bearer token');
    } else {
      console.warn('⚠️ [PalmPay] PRODUCTION mode but no Bearer token configured! Falling back to SIMULATION.');
      return new PalmPayService(mergedConfig, true);
    }

    palmPayServiceInstance = new PalmPayService(mergedConfig, isSimulation);
  }
  return palmPayServiceInstance;
}