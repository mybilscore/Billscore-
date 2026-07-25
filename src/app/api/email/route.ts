// app/api/email/send/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { emailService } from '~/lib/email/email.service';
import { 
  EmailTemplateData, 
  welcomeEmailTemplate,
  passwordResetEmailTemplate,
  verificationEmailTemplate, 
  orderConfirmationEmailTemplate,
  newsletterSubscriptionTemplate,
  accountUpdateTemplate,
  contactEmailTemplate // Added missing import
} from '~/lib/email/template';

// Define interfaces for the request body
interface SendEmailRequestBody {
  template?: string;
  data?: EmailTemplateData;
  to: string | string[];
  subject?: string;
  text?: string;
  html?: string;
  attachments?: Array<{
    filename: string;
    content: string;
    contentType?: string;
  }>;
  cc?: string | string[];
  bcc?: string | string[];
}

// Define email template types
type EmailTemplateType = 
  | 'welcome' 
  | 'password-reset' 
  | 'verification' 
  | 'contact'
  | 'order-confirmation' 
  | 'newsletter' 
  | 'account-update';

// Rate limiting configuration
const rateLimit = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT = 10; // 10 emails per hour per IP
const RATE_LIMIT_WINDOW = 60 * 60 * 1000; // 1 hour in milliseconds

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const record = rateLimit.get(ip);
  
  if (!record) {
    rateLimit.set(ip, { count: 1, resetTime: now + RATE_LIMIT_WINDOW });
    return true;
  }
  
  if (now > record.resetTime) {
    rateLimit.set(ip, { count: 1, resetTime: now + RATE_LIMIT_WINDOW });
    return true;
  }
  
  if (record.count >= RATE_LIMIT) {
    return false;
  }
  
  record.count++;
  return true;
}

export async function POST(request: NextRequest) {
  try {
    // Get client IP for rate limiting
    const ip = request.headers.get('x-forwarded-for') || 'unknown';
    
    // Check rate limit
    if (!checkRateLimit(ip)) {
      return NextResponse.json(
        { error: 'Rate limit exceeded. Please try again later.' },
        { status: 429 }
      );
    }
    
    const body = await request.json() as SendEmailRequestBody;
    const { template, data, to, subject, text, html, attachments, cc, bcc } = body;
    
    // Validate required fields
    if (!to) {
      return NextResponse.json(
        { error: 'Recipient email (to) is required' },
        { status: 400 }
      );
    }
    
    let finalSubject = subject;
    let finalHtml = html;
    
    // Use template if provided
    if (template) {
      const templateData: EmailTemplateData = data || {};
      const templateType = template as EmailTemplateType;
      
      switch (templateType) {
        case 'welcome':
          const welcome = welcomeEmailTemplate(templateData);
          finalSubject = finalSubject || welcome.subject;
          finalHtml = finalHtml || welcome.html;
          break;
          
        case 'password-reset':
          const reset = passwordResetEmailTemplate(templateData);
          finalSubject = finalSubject || reset.subject;
          finalHtml = finalHtml || reset.html;
          break;
          
        case 'verification':
          const verification = verificationEmailTemplate(templateData);
          finalSubject = finalSubject || verification.subject;
          finalHtml = finalHtml || verification.html;
          break;
          
        case 'contact':
          const contact = contactEmailTemplate(templateData);
          finalSubject = finalSubject || contact.subject;
          finalHtml = finalHtml || contact.html;
          break;
          
        case 'order-confirmation':
          const order = orderConfirmationEmailTemplate(templateData);
          finalSubject = finalSubject || order.subject;
          finalHtml = finalHtml || order.html;
          break;
          
        case 'newsletter':
          const newsletter = newsletterSubscriptionTemplate(templateData);
          finalSubject = finalSubject || newsletter.subject;
          finalHtml = finalHtml || newsletter.html;
          break;
          
        case 'account-update':
          const update = accountUpdateTemplate(templateData);
          finalSubject = finalSubject || update.subject;
          finalHtml = finalHtml || update.html;
          break;
          
        default:
          return NextResponse.json(
            { error: 'Invalid template specified' },
            { status: 400 }
          );
      }
    }
    
    // Validate that we have content to send
    if (!finalSubject || (!text && !finalHtml)) {
      return NextResponse.json(
        { error: 'Email subject and content are required' },
        { status: 400 }
      );
    }
    
    // Send email
    const result = await emailService.sendEmail({
      to,
      subject: finalSubject,
      text,
      html: finalHtml,
      attachments,
      cc,
      bcc,
    });
    
    if (result) {
      return NextResponse.json({ 
        success: true, 
        message: 'Email sent successfully' 
      });
    } else {
      throw new Error('Failed to send email');
    }
    
  } catch (error) {
    console.error('Error in email API:', error);
    return NextResponse.json(
      { 
        error: 'Failed to send email', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}

// Test endpoint to verify email configuration
export async function GET(request: NextRequest) {
  try {
    const isConnected = await emailService.verifyConnection();
    
    if (isConnected) {
      return NextResponse.json({ 
        success: true, 
        message: 'Email service is connected and ready' 
      });
    } else {
      return NextResponse.json(
        { error: 'Email service is not connected' },
        { status: 500 }
      );
    }
  } catch (error) {
    return NextResponse.json(
      { 
        error: 'Failed to verify email connection', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}