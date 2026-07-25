// lib/sms/index.ts
// Export all SMS functionality from a single entry point
export { SMSService, smsService } from './sms.service';
export type { SMSOptions, SMSResponse, BulkSMSResponse } from './sms.service';
export { smsConfig } from './config';
export type { SMSConfig } from './config';
// export * from './templates';
// export * from './utils';

export * from './utils'
export * from './templates'