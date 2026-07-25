// lib/sms/sms.service.ts
import { smsConfig, type SMSConfig } from './config';

export interface SMSOptions {
  to: string | string[];
  message: string;
  channel?: 'generic' | 'dnd' | 'whatsapp'; // Type of message
  media?: {
    url: string;
    caption?: string;
  }; // For WhatsApp messages
}

export interface SMSResponse {
  message_id: string;
  message: string;
  balance: number;
  user: string;
}

export interface BulkSMSResponse {
  code: string;
  message_id: string;
  message: string;
  balance: number;
  user: string;
}

export class SMSService {
  private config: SMSConfig;

  constructor(config?: SMSConfig) {
    this.config = config || smsConfig;
  }

  // Send single SMS
  async sendSMS(options: SMSOptions): Promise<boolean> {
    try {
      const recipients = Array.isArray(options.to) ? options.to : [options.to];
      
      // Termii API expects phone numbers in international format
      const formattedNumbers = recipients.map(phone => this.formatPhoneNumber(phone));
      
      const payload = {
        to: formattedNumbers,
        from: this.config.senderId,
        sms: options.message,
        type: 'plain',
        channel: options.channel || 'generic',
        api_key: this.config.apiKey,
      };

      const response = await fetch(`${this.config.apiUrl}/sms/send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json() as SMSResponse | BulkSMSResponse;
      
      if (response.ok && (data as SMSResponse).message_id) {
        console.log('✅ SMS sent successfully:', (data as SMSResponse).message_id);
        return true;
      } else {
        console.error('❌ Failed to send SMS:', data);
        return false;
      }
    } catch (error) {
      console.error('❌ Error sending SMS:', error);
      return false;
    }
  }

  // Send WhatsApp message (if you have WhatsApp API access)
  async sendWhatsAppMessage(options: SMSOptions): Promise<boolean> {
    try {
      const recipients = Array.isArray(options.to) ? options.to : [options.to];
      const formattedNumbers = recipients.map(phone => this.formatPhoneNumber(phone));
      
      const payload: any = {
        to: formattedNumbers,
        from: this.config.senderId,
        message: options.message,
        channel: 'whatsapp',
        api_key: this.config.apiKey,
      };

      if (options.media) {
        payload.media = options.media;
      }

      const response = await fetch(`${this.config.apiUrl}/sms/send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      
      if (response.ok && data.message_id) {
        console.log('✅ WhatsApp message sent successfully:', data.message_id);
        return true;
      } else {
        console.error('❌ Failed to send WhatsApp message:', data);
        return false;
      }
    } catch (error) {
      console.error('❌ Error sending WhatsApp message:', error);
      return false;
    }
  }

  // Send OTP via SMS
  async sendOTP(phoneNumber: string, otp: string, expirationTime: number = 10): Promise<boolean> {
    try {
      const formattedNumber = this.formatPhoneNumber(phoneNumber);
      
      const payload = {
        api_key: this.config.apiKey,
        message_type: 'NUMERIC',
        to: formattedNumber,
        from: this.config.senderId,
        channel: 'generic',
        pin_attempts: 3,
        pin_time_to_live: expirationTime, // in minutes
        pin_length: otp.length,
        pin_placeholder: '< 1234 >',
        message_text: `Your verification code is ${otp}. It expires in ${expirationTime} minutes.`,
        pin_code: otp, // If you want to specify the OTP
      };

      const response = await fetch(`${this.config.apiUrl}/sms/otp/send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      
      if (response.ok && data.pinId) {
        console.log('✅ OTP sent successfully:', data.pinId);
        return true;
      } else {
        console.error('❌ Failed to send OTP:', data);
        return false;
      }
    } catch (error) {
      console.error('❌ Error sending OTP:', error);
      return false;
    }
  }

  // Verify OTP
  async verifyOTP(phoneNumber: string, pinId: string, otp: string): Promise<boolean> {
    try {
      const formattedNumber = this.formatPhoneNumber(phoneNumber);
      
      const payload = {
        api_key: this.config.apiKey,
        pin_id: pinId,
        pin: otp,
      };

      const response = await fetch(`${this.config.apiUrl}/sms/otp/verify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      
      if (response.ok && data.verified === true) {
        console.log('✅ OTP verified successfully');
        return true;
      } else {
        console.error('❌ OTP verification failed:', data);
        return false;
      }
    } catch (error) {
      console.error('❌ Error verifying OTP:', error);
      return false;
    }
  }

  // Send template message
  async sendTemplateSMS(
    to: string | string[],
    templateId: string,
    variables: Record<string, string>
  ): Promise<boolean> {
    try {
      const recipients = Array.isArray(to) ? to : [to];
      const formattedNumbers = recipients.map(phone => this.formatPhoneNumber(phone));
      
      const payload = {
        api_key: this.config.apiKey,
        to: formattedNumbers,
        from: this.config.senderId,
        template_id: templateId,
        data: variables,
      };

      const response = await fetch(`${this.config.apiUrl}/sms/template/send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      
      if (response.ok && data.message_id) {
        console.log('✅ Template SMS sent successfully:', data.message_id);
        return true;
      } else {
        console.error('❌ Failed to send template SMS:', data);
        return false;
      }
    } catch (error) {
      console.error('❌ Error sending template SMS:', error);
      return false;
    }
  }

  // Send bulk SMS
  async sendBulkSMS(messages: { to: string; message: string }[]): Promise<boolean> {
    try {
      const formattedMessages = messages.map(msg => ({
        to: this.formatPhoneNumber(msg.to),
        from: this.config.senderId,
        sms: msg.message,
        type: 'plain',
        channel: 'generic',
      }));

      const payload = {
        api_key: this.config.apiKey,
        messages: formattedMessages,
      };

      const response = await fetch(`${this.config.apiUrl}/sms/send/bulk`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      
      if (response.ok && data.code === 'success') {
        console.log('✅ Bulk SMS sent successfully');
        return true;
      } else {
        console.error('❌ Failed to send bulk SMS:', data);
        return false;
      }
    } catch (error) {
      console.error('❌ Error sending bulk SMS:', error);
      return false;
    }
  }

  // Get sender IDs (for managing your sender IDs)
  async getSenderIDs(): Promise<any[]> {
    try {
      const response = await fetch(`${this.config.apiUrl}/sender-id?api_key=${this.config.apiKey}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();
      
      if (response.ok) {
        return data;
      } else {
        console.error('❌ Failed to fetch sender IDs:', data);
        return [];
      }
    } catch (error) {
      console.error('❌ Error fetching sender IDs:', error);
      return [];
    }
  }

  // Request new sender ID
  async requestSenderID(senderId: string, useCase: string): Promise<boolean> {
    try {
      const payload = {
        api_key: this.config.apiKey,
        sender_id: senderId,
        usecase: useCase,
        company: process.env.COMPANY_NAME || 'My Company',
      };

      const response = await fetch(`${this.config.apiUrl}/sender-id/request`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      
      if (response.ok && data.code === 'success') {
        console.log('✅ Sender ID request submitted successfully');
        return true;
      } else {
        console.error('❌ Failed to request sender ID:', data);
        return false;
      }
    } catch (error) {
      console.error('❌ Error requesting sender ID:', error);
      return false;
    }
  }

  // Check account balance
  async getBalance(): Promise<number | null> {
    try {
      const response = await fetch(`${this.config.apiUrl}/get-balance?api_key=${this.config.apiKey}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();
      
      if (response.ok && data.balance) {
        return parseFloat(data.balance);
      } else {
        console.error('❌ Failed to fetch balance:', data);
        return null;
      }
    } catch (error) {
      console.error('❌ Error fetching balance:', error);
      return null;
    }
  }

  // Format phone number to international format (Termii expects this)
  private formatPhoneNumber(phone: string): string {
    // Remove any non-digit characters
    let cleaned = phone.replace(/\D/g, '');
    
    // If it starts with 0, replace with 234 (Nigeria)
    if (cleaned.startsWith('0')) {
      cleaned = '234' + cleaned.substring(1);
    }
    
    // If it doesn't start with 234, add it
    if (!cleaned.startsWith('234')) {
      cleaned = '234' + cleaned;
    }
    
    return cleaned;
  }

  // Verify connection and API key
  async verifyConnection(): Promise<boolean> {
    try {
      const balance = await this.getBalance();
      if (balance !== null) {
        console.log('✅ Termii connection verified. Balance:', balance);
        return true;
      }
      return false;
    } catch (error) {
      console.error('❌ Termii connection failed:', error);
      return false;
    }
  }
}

// Singleton instance
export const smsService = new SMSService();