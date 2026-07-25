// lib/email/config.ts
export interface EmailConfig {
  apiKey: string;
  from: string;
  replyTo?: string;
}

export const emailConfig: EmailConfig = {
  apiKey: process.env.RESEND_API_KEY ||'',
  from: process.env.EMAIL_FROM || '',
  replyTo: process.env.EMAIL_REPLY_TO || '',
};