// lib/email/index.ts
// Export all email functionality from a single entry point
export { EmailService, emailService } from './email.service';
export type { EmailOptions, EmailAttachment } from './email.service';
export { emailConfig } from './config';
export type { EmailConfig } from './config';
export * from './template';
export * from './utils';