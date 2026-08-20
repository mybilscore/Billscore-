export interface PalmPayConfig {
  baseUrl: string;
  authorization: string; // App ID (Bearer token)
  merchantId: string;
  countryCode: string;
  publicKey: string;
  privateKey: string;
  isProduction: boolean;
  webhookUrl: string;
}

export interface CreateVirtualAccountRequest {
  virtualAccountName: string;
  identityType: 'personal' | 'personal_nin' | 'company';
  licenseNumber: string;
  email?: string;
  customerName: string;
  accountReference?: string;
}

export interface CreateVirtualAccountResponse {
  virtualAccountName: string;
  virtualAccountNo: string;
  status: 'Enabled' | 'Disabled' | 'Deleted';
  identityType?: string;
  licenseNumber?: string;
  email?: string;
  customerName?: string;
  accountReference?: string;
}

export interface UpdateVirtualAccountRequest {
  virtualAccountNo: string;
  status: 'Enabled' | 'Disabled';
}

export interface QueryVirtualAccountResponse {
  virtualAccountName: string;
  virtualAccountNo: string;
  status: 'Enabled' | 'Disabled' | 'Deleted';
  identityType?: string;
  licenseNumber?: string;
  email?: string;
  customerName?: string;
  accountReference?: string;
}

export interface PayInOrderDetailResponse {
  orderNo: string;
  orderStatus: 0 | 1 | 2 | 3 | 4 | 5 | 6;
  createdTime: number;
  updateTime: number;
  currency: string;
  orderAmount: number;
  reference?: string;
  payerAccountNo: string;
  payerAccountName: string;
  payerBankName: string;
  virtualAccountNo?: string;
  virtualAccountName?: string;
  accountReference?: string;
  sessionId?: string;
  paidAmount?: number;
  fee?: number;
  settlementAmount?: number;
}

export interface PayInOrderListResponse {
  pageIndex: number;
  pageSize: number;
  totalCount: number;
  list: PayInOrderDetailResponse[];
}

export interface RefundRequest {
  orderId: string;
  originOrderNo: string;
  amount: number;
  payeeName?: string;
  payeeBankCode?: string;
  payeeBankAccNo?: string;
  notifyUrl?: string;
  remark?: string;
}

export interface RefundResponse {
  orderNo: string;
  orderId: string;
  orderStatus: 1 | 2 | 3 | 4 | 5;
  currency: string;
  amount: number;
}

export interface RefundStatusResponse {
  orderId: string;
  orderNo: string;
  orderStatus: 1 | 2 | 3 | 4 | 5;
  message: string;
  currency: string;
  amount: number;
}

export interface PalmPayWebhookPayload {
  orderNo: string;
  orderStatus: 1 | 2 | 3 | 4 | 5 | 6;
  createdTime: number;
  updateTime: number;
  currency: string;
  orderAmount: number;
  reference?: string;
  payerAccountNo: string;
  payerAccountName: string;
  payerBankName: string;
  virtualAccountNo?: string;
  virtualAccountName?: string;
  accountReference?: string;
  sessionId?: string;
  sign?: string;
}

export interface ApiResponse<T> {
  respCode: string;
  respMsg: string;
  status: boolean;
  data?: T;
}

export enum VirtualAccountStatus {
  ENABLED = 'Enabled',
  DISABLED = 'Disabled',
  DELETED = 'Deleted',
}