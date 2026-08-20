// src/lib/vendors/bilalsada.types.ts

// import { VtuType } from '@prisma/client';
import { VtuType } from "@prisma/client";

export interface BilalSadaAuthResponse {
  status: string;
  AccessToken: string;
  balance: string;
  username: string;
}

export interface BilalSadaAirtimeRequest {
  network: number;
  phone: string;
  plan_type: string;
  amount: number;
  bypass: boolean;
  "request-id": string;
}

export interface BilalSadaAirtimeResponse {
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

export interface BilalSadaDataRequest {
  network: number;
  phone: string;
  data_plan: number;
  bypass: boolean;
  "request-id": string;
}

export interface BilalSadaDataResponse {
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

export interface BilalSadaElectricityRequest {
  disco: number;
  meter_type: string;
  meter_number: string;
  amount: number;
  bypass: boolean;
  "request-id": string;
}

export interface BilalSadaElectricityResponse {
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

export interface BilalSadaCableRequest {
  cablename: string;
  cableplan: string;
  smart_card_number: string;
  "request-id": string;
}

export interface BilalSadaCableResponse {
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

// Network mapping
export const BilalSadaNetworkMap = {
  MTN: 1,
  GLO: 3,
  AIRTEL: 2,
 NINEMOBILE: 4,
} as const;

// Data plan mapping (simplified - you'd expand this)
export const BilalSadaDataPlanMap = {
  MTN: {
    '500MB': 1,
    '1GB': 2,
    '2GB': 3,
    '5GB': 4,
  },
  GLO: {
    '500MB': 220,
    '1GB': 221,
    '3GB': 224,
    '5GB': 227,
  },
  AIRTEL: {
    '500MB': 15,
    '1GB': 16,
    '2GB': 17,
    '5GB': 18,
  },
  '9MOBILE': {
    '500MB': 70,
    '1GB': 71,
    '2GB': 72,
    '5GB': 73,
  },
} as const;

// DISCO mapping
export const BilalSadaDiscoMap = {
  IKEJA: 1,
  EKO: 2,
  KANO: 3,
  PORTHARCOURT: 4,
  JOS: 5,
  IBADAN: 6,
  KADUNA: 7,
  ABUJA: 8,
} as const;

// Cable mapping
export const BilalSadaCableMap = {
  GOTV: 1,
  DSTV: 2,
  STARTIMES: 3,
} as const;

export interface BilalSadaConfig {
  id: string;
  name: string;
  code: string;
  apiBaseUrl: string;
  authType: string;
  authConfig: {
    username: string;
    password: string;
    accessToken?: string;
    tokenExpiry?: Date;
  };
  priority: number;
  supportedServices: VtuType[];
  isActive: boolean;
  timeout: number;
  maxRetries: number;
  retryDelay: number;
}