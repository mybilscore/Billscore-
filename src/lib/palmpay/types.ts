// src/lib/palmpay/types.ts

export interface PalmPayConfig {
  baseUrl: string;
  authorization: string;
  countryCode: string;
  publicKey: string;
  privateKey: string;
  isProduction: boolean;
  webhookUrl?: string;
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
  identityType: string;
  licenseNumber: string;
  email?: string;
  customerName: string;
  accountReference?: string;
}

export interface UpdateVirtualAccountRequest {
  virtualAccountNo: string;
  status: 'Enabled' | 'Disabled';
}

export interface QueryVirtualAccountResponse extends CreateVirtualAccountResponse {}

export interface PayInOrderDetailResponse {
  orderNo: string;
  orderStatus: number;
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
  orderStatus: number;
  currency: string;
  amount: number;
}

export interface RefundStatusResponse {
  orderId: string;
  orderNo: string;
  orderStatus: number;
  message?: string;
  currency: string;
  amount?: number;
  errorMsg?: string;
}

export interface PalmPayWebhookPayload {
  orderNo: string;
  orderStatus: number;
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

export enum OrderStatus {
  INITIATED = 0,
  SUCCESS = 1,
  FAILED = 2,
  PROCESSING = 3,
  REFUNDED = 4,
  PARTIAL_REFUND = 5,
}

export enum VirtualAccountStatus {
  ENABLED = 'Enabled',
  DISABLED = 'Disabled',
  DELETED = 'Deleted',
}

export interface ApiResponse<T = any> {
  data?: T;
  respMsg: string;
  respCode: string;
  status: boolean;
}