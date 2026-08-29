// src/lib/vendors/bilalsada.types.ts

import { VtuType } from "@prisma/client";

// ✅ Auth Config - Token only
export interface BilalSadaAuthConfig {
  // Token-based (from .env)
  accessToken?: string;
  
  // Environment
  mode?: 'sandbox' | 'simulation' | 'live';
}

export interface BilalSadaAuthResponse {
  status: string;
  AccessToken: string;
  balance: string;
  username: string;
}

// ✅ AIRTIME
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
  status: "success" | "failed";
  message: string;
  phone_number: string;
  oldbal: string;
  newbal: number;
  system: string;
  plan_type: string;
  wallet_vending: string;
}

// ✅ DATA
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
  status: "success" | "failed";
  message: string;
  response: string;
  phone_number: string;
  oldbal: string;
  newbal: number;
  system: string;
  plan_type: string;
  wallet_vending: string;
}

// ✅ ELECTRICITY
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
  status: "success" | "failed";
  message: string;
  meter_number: string;
  meter_type: string;
  oldbal: string;
  newbal: number;
  system: string;
  token: string;
  wallet_vending: string;
}

// ✅ CABLE TV
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
  status: "success" | "failed";
  message: string;
  smart_card_number: string;
  "request-id": string;
  oldbal: number;
  newbal: number;
  system: string;
}

// ✅ EXAM/RESULT CHECKER
export interface BilalSadaExamRequest {
  exam: number;
  quantity: number;
  "request-id": string;
}

export interface BilalSadaExamResponse {
  username: string;
  amount: number;
  quantity: number;
  message: string;
  oldbal: string;
  newbal: number;
  date: string;
  status: "success" | "failed";
  "request-id": string;
  pin: string;
}

// ✅ MAPPINGS
export const BilalSadaNetworkMap = {
  MTN: 1,
  AIRTEL: 2,
  GLO: 3,
  NINEMOBILE: 4,
} as const;

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

export const BilalSadaCableMap = {
  GOTV: "gotv",
  DSTV: "dstv",
  STARTIMES: "startimes",
} as const;

export const BilalSadaExamMap = {
  WAEC: 1,
  NECO: 2,
  NABTEB: 3,
} as const;