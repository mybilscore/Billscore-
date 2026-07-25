// lib/sms/utils.ts
import { smsService } from './sms.service';
import { smsTemplates, SMSTemplateData, truncateMessage } from './templates';

export interface SendSMSPptions {
  to: string | string[];
  message?: string;
  template?: keyof typeof smsTemplates;
  templateData?: SMSTemplateData;
  channel?: 'generic' | 'dnd' | 'whatsapp';
  media?: {
    url: string;
    caption?: string;
  };
}

export async function sendSMS(options: SendSMSPptions): Promise<boolean> {
  try {
    let message = options.message;
    
    // If template is specified, use it
    if (options.template && options.templateData) {
      const templateFn = smsTemplates[options.template];
      if (templateFn) {
        message = templateFn(options.templateData);
      } else {
        throw new Error(`Unknown template: ${options.template}`);
      }
    }
    
    if (!message) {
      throw new Error('Either message or template must be provided');
    }
    
    // Truncate message if needed (160 chars for standard SMS)
    const finalMessage = truncateMessage(message);
    
    // Send SMS
    return await smsService.sendSMS({
      to: options.to,
      message: finalMessage,
      channel: options.channel,
      media: options.media,
    });
  } catch (error) {
    console.error('❌ Error sending SMS:', error);
    return false;
  }
}

// Convenience functions for common SMS types

export async function sendWelcomeSMS(to: string, name: string): Promise<boolean> {
  return sendSMS({
    template: 'welcome',
    to,
    templateData: { name },
    channel: 'generic',
  });
}

export async function sendOTPSMS(to: string, otp: string): Promise<boolean> {
  return sendSMS({
    template: 'otp',
    to,
    templateData: { otp },
    channel: 'generic',
  });
}

export async function sendOrderConfirmationSMS(
  to: string,
  orderId: string,
  amount: string
): Promise<boolean> {
  return sendSMS({
    template: 'orderConfirmation',
    to,
    templateData: { orderId, amount },
  });
}

export async function sendOrderShippedSMS(to: string, orderId: string): Promise<boolean> {
  return sendSMS({
    template: 'orderShipped',
    to,
    templateData: { orderId },
  });
}

export async function sendOrderDeliveredSMS(to: string, orderId: string): Promise<boolean> {
  return sendSMS({
    template: 'orderDelivered',
    to,
    templateData: { orderId },
  });
}

export async function sendPasswordResetSMS(to: string, otp: string): Promise<boolean> {
  return sendSMS({
    template: 'passwordReset',
    to,
    templateData: { otp },
  });
}

export async function sendPaymentReceivedSMS(
  to: string,
  orderId: string,
  amount: string
): Promise<boolean> {
  return sendSMS({
    template: 'paymentReceived',
    to,
    templateData: { orderId, amount },
  });
}

export async function sendBookingConfirmationSMS(
  to: string,
  orderId: string,
  date: string
): Promise<boolean> {
  return sendSMS({
    template: 'bookingConfirmation',
    to,
    templateData: { orderId, date },
  });
}

export async function sendReminderSMS(
  to: string,
  date: string,
  link: string
): Promise<boolean> {
  return sendSMS({
    template: 'reminder',
    to,
    templateData: { date, link },
  });
}

export async function sendPromotionalSMS(to: string, name: string): Promise<boolean> {
  return sendSMS({
    template: 'promotional',
    to,
    templateData: { name },
    channel: 'dnd', // Use DND channel for promotional messages
  });
}

// Send OTP with automatic verification flow
export async function sendAndVerifyOTP(
  phoneNumber: string,
  otp: string,
  onVerify?: (verified: boolean) => void
): Promise<{ success: boolean; pinId?: string }> {
  try {
    // Send OTP using Termii's OTP endpoint
    const formattedNumber = smsService['formatPhoneNumber'](phoneNumber);
    
    const payload = {
      api_key: process.env.TERMII_API_KEY,
      message_type: 'NUMERIC',
      to: formattedNumber,
      from: process.env.SMS_SENDER_ID || 'QRETA',
      channel: 'generic',
      pin_attempts: 3,
      pin_time_to_live: 10,
      pin_length: otp.length,
      pin_placeholder: '< 1234 >',
      message_text: `Your verification code is ${otp}. It expires in 10 minutes.`,
      pin_code: otp,
    };

    const response = await fetch('https://api.termii.com/api/sms/otp/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();
    
    if (response.ok && data.pinId) {
      console.log('✅ OTP sent successfully');
      
      // If verification callback provided, set up verification
      if (onVerify) {
        // You would typically implement a polling mechanism or webhook here
        // For now, just return the pinId for manual verification
        return { success: true, pinId: data.pinId };
      }
      
      return { success: true, pinId: data.pinId };
    } else {
      console.error('❌ Failed to send OTP:', data);
      return { success: false };
    }
  } catch (error) {
    console.error('❌ Error sending OTP:', error);
    return { success: false };
  }
}

// Test SMS connection
export async function testSMSConnection(): Promise<boolean> {
  try {
    const balance = await smsService.getBalance();
    if (balance !== null) {
      console.log(`✅ SMS service connected. Balance: ${balance} credits`);
      return true;
    }
    return false;
  } catch (error) {
    console.error('❌ SMS connection test failed:', error);
    return false;
  }
}

// Get SMS status
export async function getSMSStatus(messageId: string): Promise<any> {
  try {
    const response = await fetch(
      `https://api.termii.com/api/sms/${messageId}?api_key=${process.env.TERMII_API_KEY}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );
    
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('❌ Error getting SMS status:', error);
    return null;
  }
}