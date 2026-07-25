// lib/email/utils.ts
import { EmailTemplateData } from "./template";
import { emailService } from "./email.service";

export interface SendEmailOptions {
  template?: 'welcome' | 'password-reset' | 'verification' | 'contact' | 'order-confirmation' | 'newsletter' | 'account-update';
  data?: EmailTemplateData;
  to: string | string[];
  subject?: string;
  text?: string;
  html?: string;
  attachments?: Array<{
    filename: string;
    content?: string | Buffer;
    path?: string;
    contentType?: string;
  }>;
  cc?: string | string[];
  bcc?: string | string[];
}

// Template mapping
const getTemplate = (template: string, data: EmailTemplateData) => {
  switch (template) {
    case 'welcome':
      return require('./template').welcomeEmailTemplate(data);
    case 'password-reset':
      return require('./template').passwordResetEmailTemplate(data);
    case 'verification':
      return require('./template').verificationEmailTemplate(data);
    case 'contact':
      return require('./template').contactEmailTemplate(data);
    case 'order-confirmation':
      return require('./template').orderConfirmationEmailTemplate(data);
    case 'newsletter':
      return require('./template').newsletterSubscriptionTemplate(data);
    case 'account-update':
      return require('./template').accountUpdateTemplate(data);
    case 'team-invitation':  // Add this new case
      return require('./template').teamMemberInvitationTemplate(data);
    default:
      throw new Error(`Unknown template: ${template}`);
  }
};

export async function sendEmail(options: SendEmailOptions): Promise<boolean> {
  try {
    // Check if email is configured
    if (!process.env.RESEND_API_KEY) {
      console.warn('⚠️ RESEND_API_KEY not configured. Email not sent.');
      return false;
    }
    
    if (!process.env.EMAIL_FROM) {
      console.warn('⚠️ EMAIL_FROM not configured. Email not sent.');
      return false;
    }
    
    let subject = options.subject;
    let html = options.html;
    let text = options.text;

    // If template is specified, use it
    if (options.template && options.data) {
      const templateResult = getTemplate(options.template, options.data);
      subject = subject || templateResult.subject;
      html = html || templateResult.html;
    }

    // If no content is provided, throw error
    if (!html && !text) {
      throw new Error('Either html/text content or a template must be provided');
    }

    // Send email using the EmailService
    return await emailService.sendEmail({
      to: options.to,
      subject: subject!,
      text,
      html,
      attachments: options.attachments,
      cc: options.cc,
      bcc: options.bcc,
    });
  } catch (error) {
    console.error('❌ Error sending email:', error);
    return false;
  }
}

// Convenience functions for common email types
export async function sendWelcomeEmail(to: string, name: string, email?: string, slink?: string): Promise<boolean> {
  console.log(`📧 Preparing welcome email for: ${to}`);
  
  // Validate email configuration before attempting to send
  if (!process.env.RESEND_API_KEY || !process.env.EMAIL_FROM) {
    console.warn('⚠️ Email not configured. Skipping welcome email.');
    return false;
  }
  
  try {
    const result = await sendEmail({
      template: 'welcome',
      to,
      data: {
        name,
        email: email || to,
        slink: slink || `${process.env.NEXT_PUBLIC_APP_URL}/dashboard`,
        date: new Date().toLocaleDateString(),
      },
    });
    
    if (result) {
      console.log(`✅ Welcome email sent to ${to}`);
    } else {
      console.error(`❌ Failed to send welcome email to ${to}`);
    }
    
    return result;
  } catch (error) {
    console.error(`❌ Exception sending welcome email to ${to}:`, error);
    return false;
  }
}

export async function sendPasswordResetEmail(to: string, name: string, otp: string, resetLink?: string): Promise<boolean> {
  return sendEmail({
    template: 'password-reset',
    to,
    data: {
      name,
      otp,
      link: resetLink,
    },
  });
}

export async function sendVerificationEmail(to: string, name: string, otp: string, verificationLink?: string): Promise<boolean> {
  return sendEmail({
    template: 'verification',
    to,
    data: {
      name,
      otp,
      link: verificationLink,
    },
  });
}

export async function sendContactFormEmail(
  fromEmail: string, 
  name: string, 
  subject: string, 
  message: string,
  adminEmail?: string
): Promise<boolean> {
  return sendEmail({
    template: 'contact',
    to: adminEmail || process.env.ADMIN_EMAIL || 'admin@yourdomain.com',
    data: {
      name,
      email: fromEmail,
      subject,
      message,
      date: new Date().toLocaleString(),
    },
  });
}

export async function sendOrderConfirmationEmail(
  to: string,
  name: string,
  orderId: string,
  amount: string
): Promise<boolean> {
  return sendEmail({
    template: 'order-confirmation',
    to,
    data: {
      name,
      orderId,
      amount,
      date: new Date().toLocaleString(),
    },
  });
}

export async function sendTeamInvitationEmail(
  to: string,
  name: string,
  password: string,
  roles: string[],
  platforms: string[],
  farmName?: string,
  loginLink?: string
): Promise<boolean> {
  console.log(`📧 Sending team invitation email to: ${to}`);
  
  // Validate email configuration before attempting to send
  if (!process.env.RESEND_API_KEY || !process.env.EMAIL_FROM) {
    console.warn('⚠️ Email not configured. Skipping team invitation email.');
    return false;
  }
  
  try {
    const result = await sendEmail({
      template: 'team-invitation',
      to,
      data: {
        name,
        email: to,
        password,
        roles: roles.join(', '),
        platforms: platforms.join(', '),
        farmName: farmName || process.env.NEXT_PUBLIC_APP_NAME || 'EMAP',
        link: loginLink || `${process.env.NEXT_PUBLIC_APP_URL}/login`,
      },
    });
    
    if (result) {
      console.log(`✅ Team invitation email sent to ${to}`);
    } else {
      console.error(`❌ Failed to send team invitation email to ${to}`);
    }
    
    return result;
  } catch (error) {
    console.error(`❌ Exception sending team invitation email to ${to}:`, error);
    return false;
  }
}
// Test email connection
export async function testEmailConnection(): Promise<boolean> {
  try {
    return await emailService.verifyConnection();
  } catch (error) {
    console.error('Error testing email connection:', error);
    return false;
  }
}