// src/lib/vendors/vtpass.endpoints.ts

export const VTPassEndpoints = {
  // Core endpoints
  HEALTH: '/api/health',
  
  // Airtime
  AIRTIME_PURCHASE: '/api/v1/airtime/buy',
  AIRTIME_VERIFY: '/api/v1/airtime/verify',
  
  // Data
  DATA_PURCHASE: '/api/v1/data/buy',
  DATA_VERIFY: '/api/v1/data/verify',
  DATA_PLANS: '/api/v1/data/plans',
  
  // Electricity
  ELECTRICITY_PURCHASE: '/api/v1/electricity/buy',
  ELECTRICITY_VERIFY: '/api/v1/electricity/verify',
  ELECTRICITY_TARIFF: '/api/v1/electricity/tariff',
  
  // Cable TV
  CABLE_PURCHASE: '/api/v1/cable/buy',
  CABLE_VERIFY: '/api/v1/cable/verify',
  CABLE_PACKAGES: '/api/v1/cable/packages',
  
  // Education
  EDUCATION_PURCHASE: '/api/v1/education/buy',
  EDUCATION_VERIFY: '/api/v1/education/verify',
  
  // Transactions
  TRANSACTION_STATUS: '/api/v1/transactions/status',
  TRANSACTION_HISTORY: '/api/v1/transactions/history',
  
  // Wallet
  WALLET_BALANCE: '/api/v1/wallet/balance',
  WALLET_FUND: '/api/v1/wallet/fund',
  
  // Verification
  VERIFY_METER: '/api/v1/verify/meter',
  VERIFY_DECODER: '/api/v1/verify/decoder',
  VERIFY_PHONE: '/api/v1/verify/phone',
};

export const VTPassServiceIDs = {
  AIRTIME: {
    MTN: 'MTN',
    GLO: 'GLO',
    AIRTEL: 'AIRTEL',
    '9MOBILE': '9MOBILE',
  },
  DATA: {
    MTN: 'MTN-DATA',
    GLO: 'GLO-DATA',
    AIRTEL: 'AIRTEL-DATA',
    '9MOBILE': '9MOBILE-DATA',
  },
  ELECTRICITY: {
    IKEJA: 'IKEJA-ELECTRIC',
    EKO: 'EKO-ELECTRIC',
    ABUJA: 'ABUJA-ELECTRIC',
    KANO: 'KANO-ELECTRIC',
    PHCN: 'PHCN-ELECTRIC',
    IBADAN: 'IBADAN-ELECTRIC',
    BENIN: 'BENIN-ELECTRIC',
    ENUGU: 'ENUGU-ELECTRIC',
    JOS: 'JOS-ELECTRIC',
    PORTHARCOURT: 'PORTHARCOURT-ELECTRIC',
  },
  CABLE: {
    DSTV: 'DSTV',
    GOTV: 'GOTV',
    STARTIMES: 'STARTIMES',
  },
  EDUCATION: {
    WAEC: 'WAEC',
    NECO: 'NECO',
    JAMB: 'JAMB',
  },
};