// lib/email/email.service.ts
import { Resend } from 'resend';
// biome-ignore lint/style/useImportType: <explanation>
import { emailConfig, EmailConfig } from './config';

export interface EmailAttachment {
  filename: string;
  content?: string | Buffer;
  path?: string;
  contentType?: string;
}

export interface EmailOptions {
  to: string | string[];
  subject: string;
  text?: string;
  html?: string;
  attachments?: EmailAttachment[];
  cc?: string | string[];
  bcc?: string | string[];
}

export class EmailService {
  private resend: Resend;
  private config: EmailConfig;

  constructor(config?: EmailConfig) {
    this.config = config || emailConfig;
    this.resend = new Resend(this.config.apiKey);
  }

// lib/email/email.service.ts (updated sendEmail method)

async sendEmail(options: EmailOptions, retries = 2): Promise<boolean> {
  try {
    // Validate configuration before sending
    if (!this.config.apiKey || this.config.apiKey === '') {
      console.error('❌ RESEND_API_KEY is not configured');
      return false;
    }
    
    if (!this.config.from || this.config.from === '') {
      console.error('❌ EMAIL_FROM is not configured');
      return false;
    }
    
    console.log('📧 Email configuration:', {
      hasApiKey: !!this.config.apiKey,
      apiKeyPrefix: this.config.apiKey.substring(0, 10),
      from: this.config.from,
      to: options.to,
      subject: options.subject,
    });
    
    const recipients = Array.isArray(options.to) ? options.to : [options.to];
    const toAddress = recipients.join(', ');
    
    const { data, error } = await this.resend.emails.send({
      from: this.config.from,
      to: toAddress,
      subject: options.subject,
      text: options.text,
      html: options.html,
      replyTo: this.config.replyTo,
      cc: options.cc,
      bcc: options.bcc,
      attachments: options.attachments?.map(att => ({
        filename: att.filename,
        content: att.content,
        path: att.path,
        content_type: att.contentType,
      })),
    });

    if (error) {
      console.error('❌ Resend error details:', {
        name: error.name,
        message: error.message,
        statusCode: error.statusCode,
      });
      
      // Don't retry for invalid API key
      if (error.message.includes('API key is invalid')) {
        console.error('❌ Invalid API key - please check your RESEND_API_KEY environment variable');
        return false;
      }
      
      if (retries > 0 && (error.message.includes('Unable to fetch') || error.message.includes('network'))) {
        console.log(`🔄 Retrying email send... (${retries} attempts left)`);
        await new Promise(resolve => setTimeout(resolve, 2000));
        return this.sendEmail(options, retries - 1);
      }
      
      return false;
    }
    
    console.log('✅ Email sent successfully:', data?.id);
    return true;
  } catch (error) {
    console.error('❌ Error sending email:', error);
    return false;
  }
}

  // Verify connection configuration
  async verifyConnection(): Promise<boolean> {
    try {
      // Test by listing domains (lightweight operation)
      const { data, error } = await this.resend.domains.list();
      
      if (error) {
        console.error('Email server connection failed:', error);
        return false;
      }
      
      console.log('✅ Email server connection verified');
      return true;
    } catch (error) {
      console.error('❌ Email server connection failed:', error);
      return false;
    }
  }

  // Close the transporter (no-op for Resend, kept for API compatibility)
  async close(): Promise<void> {
    // Resend doesn't require connection cleanup
    console.log('Resend client closed');
  }
}

// Singleton instance
export const emailService = new EmailService();