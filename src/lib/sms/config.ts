// lib/sms/config.ts
export interface SMSConfig {
  apiKey: string;
  senderId: string; // Your Termii sender ID (max 11 characters)
  apiUrl: string;
}

export const smsConfig: SMSConfig = {
  apiKey: process.env.TERMII_API_KEY || '',
  senderId: process.env.SMS_SENDER_ID || 'EMAP',
  apiUrl: 'https://api.termii.com/api',
};