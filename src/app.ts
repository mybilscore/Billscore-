// ============================================================
// CONFIGURATION
// ============================================================

/**
 * SEO & Brand Configuration
 * Centralized branding and metadata for the application
 */
export const SEO_CONFIG = {
  /** Application name used in meta tags and titles */
  name: "Bilscore",
  
  /** Full company/application name */
  fullName: "Bilscore",
  
  /** Tagline/slogan displayed in hero sections and meta descriptions */
  slogan: "Power Your World, Anytime, Anywhere",
  
  /** Brief description for SEO meta tags and social sharing */
  description:
    "Buy or sell VTU & cable TV instantly. Earn as an agent via WhatsApp, USSD, or mobile app. Pre-order electricity and access retailer credit programs.",
  
  /** Application version for cache busting and debugging */
  version: "1.0.0",
  
  /** Social media profiles */
  social: {
    instagram: "https://instagram.com/bilscore",
    facebook: "https://facebook.com/bilscore",
    twitter: "https://twitter.com/bilscore",
    youtube: "https://youtube.com/bilscore",
  },
  
  /** Contact information */
  contact: {
    email: "support@bilscore.com",
    phone: "+234 800 000 0000",
    address: "Lagos, Nigeria",
  },
} as const;

// ============================================================

/**
 * System Configuration
 * Application routing, repository settings, and feature flags
 */
export const SYSTEM_CONFIG = {
  /** Redirect path after successful sign in */
  redirectAfterSignIn: "/dashboard",
  
  /** Redirect path after successful sign up */
  redirectAfterSignUp: "/onboarding",
  
  // /** Repository information for GitHub integration */
  // repository: {
  //   name: "bilscore",
  //   owner: "bilscore",
  //   /** Show star count badge in footer/header */
  //   showStars: true,
  //   /** Repository URL */
  //   url: "https://github.com/bilscore/bilscore",
  // },
  
  /** Feature flags for enabling/disabling features */
  features: {
    /** Enable social authentication providers */
    socialAuth: true,
    /** Enable offline USSD mode */
    offlineMode: true,
    /** Enable AI-powered WhatsApp bot */
    whatsAppBot: true,
    /** Enable agent dashboard */
    agentDashboard: true,
  },
  
  /** API configuration */
  // api: {
  //   /** Base URL for API requests */
  //   baseUrl: process.env.NEXT_PUBLIC_API_URL || "/api",
  //   /** Request timeout in milliseconds */
  //   timeout: 30000,
  //   /** Enable request logging in development */
  //   debugLogging: process.env.NODE_ENV === "development",
  // },
} as const;

// ============================================================

/**
 * Admin Panel Configuration
 * Settings specific to the admin dashboard
 */
export const ADMIN_CONFIG = {
  /** Whether to display user emails in admin panels */
  displayEmails: false,
  
  /** Number of items per page in admin tables */
  itemsPerPage: 25,
  
  /** Enable analytics dashboard */
  analyticsEnabled: true,
  
  /** Enable user management features */
  userManagementEnabled: true,
  
  /** Enable transaction monitoring */
  transactionMonitoringEnabled: true,
} as const;

// ============================================================

/**
 * Database Configuration
 * Development and production database settings
 */
export const DB_CONFIG = {
  /** Enable SQL query logging in development */
  devLogger: process.env.NODE_ENV === "development",
  
  /** Maximum connection pool size */
  maxConnections: 10,
  
  /** Connection timeout in milliseconds */
  connectionTimeout: 5000,
} as const;

// ============================================================

/**
 * Security Configuration
 * Authentication and security settings
 */
export const SECURITY_CONFIG = {
  /** Minimum password length */
  minPasswordLength: 8,
  
  /** Session duration in hours */
  sessionDuration: 24,
  
  /** Enable two-factor authentication */
  twoFactorAuth: true,
  
  /** Rate limiting */
  rateLimit: {
    /** Maximum requests per minute */
    maxRequests: 60,
    /** Block duration in minutes after exceeding limit */
    blockDuration: 15,
  },
  
  /** CORS allowed origins */
  allowedOrigins: [
    "https://bilscore.com",
    "https://www.bilscore.com",
    "http://localhost:3000",
  ],
} as const;

// ============================================================

/**
 * Payment Configuration
 * Payment gateway and transaction settings
 */
export const PAYMENT_CONFIG = {
  /** Supported currencies */
  currencies: ["NGN", "USD"],
  
  /** Default currency */
  defaultCurrency: "NGN",
  
  /** Payment providers */
  // providers: {
  //   paystack: {
  //     enabled: true,
  //     publicKey: process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY || "",
  //     secretKey: process.env.PAYSTACK_SECRET_KEY || "",
  //   },
  //   flutterwave: {
  //     enabled: false,
  //     publicKey: process.env.NEXT_PUBLIC_FLUTTERWAVE_PUBLIC_KEY || "",
  //     secretKey: process.env.FLUTTERWAVE_SECRET_KEY || "",
  //   },
  // },
} as const;

// ============================================================

/**
 * Feature Flags
 * Toggle features on/off globally
 */
export const FEATURES = {
  /** Enable Airtime purchase */
  airtimePurchase: true,
  
  /** Enable Data bundle purchase */
  dataPurchase: true,
  
  /** Enable Electricity token purchase */
  electricityPurchase: true,
  
  /** Enable Cable TV subscription */
  cableTVPurchase: true,
  
  /** Enable Pre-order electricity */
  preOrderElectricity: true,
  
  /** Enable Smart subscriptions */
  smartSubscriptions: true,
  
  /** Enable AI WhatsApp bot */
  aiWhatsAppBot: true,
  
  /** Enable Offline USSD mode */
  offlineUSSD: true,
  
  /** Enable Agent program */
  agentProgram: true,
  
  /** Enable Retailer credit */
  retailerCredit: true,
} as const;

// ============================================================

/**
 * Environment Variables Validation
 * Ensures required env vars are present
 */
// export const validateConfig = (): void => {
//   const requiredEnvVars = [
//     "NEXT_PUBLIC_API_URL",
//   ];

//   const missingVars = requiredEnvVars.filter(
//     (varName) => !process.env[varName]
//   );

//   if (missingVars.length > 0) {
//     console.warn(
//       `⚠️ Missing environment variables: ${missingVars.join(", ")}`
//     );
//   }
// };

// Validate on import in development
// if (process.env.NODE_ENV === "development") {
//   validateConfig();
// }

// ============================================================
// TYPE DEFINITIONS
// ============================================================

export type SEOConfig = typeof SEO_CONFIG;
export type SystemConfig = typeof SYSTEM_CONFIG;
export type AdminConfig = typeof ADMIN_CONFIG;
export type DBConfig = typeof DB_CONFIG;
export type SecurityConfig = typeof SECURITY_CONFIG;
export type PaymentConfig = typeof PAYMENT_CONFIG;
export type Features = typeof FEATURES;

// ============================================================
// DEFAULT EXPORT
// ============================================================

export default {
  SEO: SEO_CONFIG,
  SYSTEM: SYSTEM_CONFIG,
  ADMIN: ADMIN_CONFIG,
  DATABASE: DB_CONFIG,
  SECURITY: SECURITY_CONFIG,
  PAYMENT: PAYMENT_CONFIG,
  FEATURES,
};