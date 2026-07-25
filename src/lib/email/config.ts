// lib/email/config.ts
export interface EmailConfig {
  apiKey: string;
  from: string;
  replyTo?: string;
}

export const emailConfig: EmailConfig = {
  apiKey: process.env.RESEND_API_KEY ||'re_98NqC47x_LZnaXGQ2QCsjnnwWSQmt6Tys',
  from: process.env.EMAIL_FROM || '',
  replyTo: process.env.EMAIL_REPLY_TO || '',
};