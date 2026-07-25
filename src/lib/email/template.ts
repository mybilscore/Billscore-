// lib/email/templates.ts
export interface EmailTemplateData {
  name?: string;
  email?: string;
  subject?: string;
  message?: string;
  link?: string;
  slink?: string;
  mlink?: string;
  otp?: string;
  orderId?: string;
  amount?: string;
  date?: string;
  farmName?: string;
  clusterName?: string;
  hectares?: string;
  harvestCycle?: string;
  irrigationStatus?: string;
  cropType?: string;
  yield?: string;
  // Add more fields as needed
}

// Base template function
const baseTemplate = (content: string, title?: string): string => `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title || 'EMAP - El-Meena Agricultural Platform'}</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
            line-height: 1.6;
            color: #333;
            margin: 0;
            padding: 0;
            background-color: #f0f9f0;
        }
        .container {
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
            background-color: #ffffff;
        }
        .header {
            background: linear-gradient(135deg, #2d5a2c 0%, #1a3a19 100%);
            color: white;
            padding: 30px 20px;
            text-align: center;
            border-radius: 8px 8px 0 0;
        }
        .header h1 {
            margin: 0;
            font-size: 28px;
        }
        .header p {
            margin: 10px 0 0;
            opacity: 0.9;
            font-size: 14px;
        }
        .content {
            padding: 30px 20px;
            border-left: 1px solid #e5e5e5;
            border-right: 1px solid #e5e5e5;
        }
        .footer {
            background-color: #f8f9fa;
            padding: 20px;
            text-align: center;
            font-size: 12px;
            color: #666;
            border-radius: 0 0 8px 8px;
            border: 1px solid #e5e5e5;
            border-top: none;
        }
        .button {
            display: inline-block;
            padding: 12px 24px;
            background-color: #2d5a2c;
            color: white;
            text-decoration: none;
            border-radius: 6px;
            font-weight: 600;
            margin: 20px 0;
        }
        .button:hover {
            background-color: #1a3a19;
        }
        .otp {
            font-size: 32px;
            font-weight: bold;
            letter-spacing: 8px;
            color: #2d5a2c;
            text-align: center;
            padding: 20px;
            background-color: #f0f9f0;
            border-radius: 8px;
            margin: 20px 0;
        }
        .highlight {
            background-color: #f0f9f0;
            padding: 15px;
            border-left: 4px solid #2d5a2c;
            margin: 20px 0;
        }
        .stats-grid {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 15px;
            margin: 20px 0;
        }
        .stat-card {
            background-color: #f8f9fa;
            padding: 15px;
            text-align: center;
            border-radius: 8px;
        }
        .stat-number {
            font-size: 24px;
            font-weight: bold;
            color: #2d5a2c;
        }
        .stat-label {
            font-size: 12px;
            color: #666;
            margin-top: 5px;
        }
        @media (max-width: 600px) {
            .container {
                padding: 10px;
            }
            .header, .content, .footer {
                padding: 20px 15px;
            }
            .stats-grid {
                grid-template-columns: 1fr;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>EMAP</h1>
            <p>El-Meena Agricultural Platform</p>
        </div>
        <div class="content">
            ${content}
        </div>
        <div class="footer">
            <p><strong>EMAP - Field Operations Platform</strong></p>
            <p>Managing ${'150,000+'} hectares | 24/7 irrigation monitoring | Multi-cut harvest cycles</p>
            <p>&copy; ${new Date().getFullYear()} El-Meena Agricultural Platform. All rights reserved.</p>
            <p>This email was sent to you because you're registered with EMAP.</p>
            <p>If you didn't request this email, please ignore it or contact support.</p>
        </div>
    </div>
</body>
</html>
`;

// Welcome email template for EMAP
export const welcomeEmailTemplate = (data: EmailTemplateData): { subject: string; html: string } => {
  const subject = `Welcome to EMAP, ${data.name || 'Farmer'}!`;
  const content = `
    <h2>Welcome to EMAP, ${data.name}!</h2>
    
    <p>Welcome to the El-Meena Agricultural Platform (EMAP) — the authoritative production and field-operations platform for the El-Meena ecosystem.</p>
    
    <p>You're now part of a revolutionary agricultural management system that oversees:</p>
    
    <div class="stats-grid">
        <div class="stat-card">
            <div class="stat-number">150,000+</div>
            <div class="stat-label">Hectares Under Management</div>
        </div>
        <div class="stat-card">
            <div class="stat-number">24/7</div>
            <div class="stat-label">Irrigation Monitoring</div>
        </div>
        <div class="stat-card">
            <div class="stat-number">Multi-Cut</div>
            <div class="stat-label">Harvest Cycles</div>
        </div>
        <div class="stat-card">
            <div class="stat-number">Real-time</div>
            <div class="stat-label">Field Data</div>
        </div>
    </div>
    
    <h3>What you can do with EMAP:</h3>
    <ul>
        <li><strong>Production Management</strong> - Track crops from planting to harvest</li>
        <li><strong>Irrigation Control</strong> - Monitor and manage 24/7 irrigation systems</li>
        <li><strong>Harvest Logging</strong> - Record and analyze multi-cut harvest cycles</li>
        <li><strong>Cluster Management</strong> - Coordinate farm clusters efficiently</li>
        <li><strong>Agronomy Support</strong> - Access expert agricultural guidance</li>
    </ul>
    
    <div class="highlight">
        <p><strong>Your Account Information:</strong></p>
        <p><strong>Name:</strong> ${data.name}</p>
        <p><strong>Email:</strong> ${data.email}</p>
        <p><strong>Site Access:</strong> <a href="${data.slink}" style="color: #2d5a2c;">${data.slink}</a></p>
        <p><strong>Registered on:</strong> ${data.date || new Date().toLocaleDateString()}</p>
    </div>
    
    <p>To start managing your agricultural operations:</p>
    <ul>
        <li>Set up your farm clusters</li>
        <li>Configure irrigation schedules</li>
        <li>Log your harvest cycles</li>
        <li>Monitor production metrics</li>
    </ul>
    
    <center>
        <a href="${data.slink}" class="button">Access Your Dashboard</a>
    </center>
    
    <p>Need assistance? Our agricultural support team is ready to help you maximize your yields.</p>
    
    <p>Best regards,<br><strong>The EMAP Team</strong><br>El-Meena Agricultural Platform</p>
  `;

  return {
    subject,
    html: baseTemplate(content, 'Welcome to EMAP'),
  };
};

// Password reset email template
export const passwordResetEmailTemplate = (data: EmailTemplateData): { subject: string; html: string } => {
  const subject = 'Reset Your EMAP Password';
  const content = `
    <h2>Password Reset Request</h2>
    <p>Hi ${data.name || 'Farmer'},</p>
    <p>We received a request to reset your password for your EMAP (El-Meena Agricultural Platform) account.</p>
    
    <div class="otp">
        ${data.otp}
    </div>
    
    <p>Enter this OTP in the EMAP platform to reset your password. This OTP will expire in 10 minutes.</p>
    
    ${data.link ? `
    <p>Or click the button below to reset your password:</p>
    <center>
        <a href="${data.link}" class="button">Reset Password</a>
    </center>
    ` : ''}
    
    <p>If you didn't request this password reset, please ignore this email or contact EMAP support immediately.</p>
    
    <p>Best regards,<br><strong>The EMAP Security Team</strong></p>
  `;

  return {
    subject,
    html: baseTemplate(content, 'Reset Your EMAP Password'),
  };
};

// Email verification template
export const verificationEmailTemplate = (data: EmailTemplateData): { subject: string; html: string } => {
  const subject = 'Verify Your EMAP Account';
  const content = `
    <h2>Verify Your Email Address</h2>
    <p>Hi ${data.name || 'Farmer'},</p>
    <p>Thank you for joining EMAP (El-Meena Agricultural Platform). Please verify your email address to start managing your agricultural operations.</p>
    
    <div class="otp">
        ${data.otp}
    </div>
    
    <p>Enter this OTP in the EMAP platform to verify your email address. This OTP will expire in 10 minutes.</p>
    
    ${data.link ? `
    <p>Or click the button below to verify your email:</p>
    <center>
        <a href="${data.link}" class="button">Verify Email</a>
    </center>
    ` : ''}
    
    <p>Once verified, you'll have access to:</p>
    <ul>
        <li>Real-time production monitoring</li>
        <li>Irrigation management tools</li>
        <li>Harvest logging and analytics</li>
        <li>Farm cluster coordination</li>
    </ul>
    
    <p>If you didn't create an account with EMAP, please ignore this email.</p>
    
    <p>Best regards,<br><strong>The EMAP Team</strong></p>
  `;

  return {
    subject,
    html: baseTemplate(content, 'Verify Your EMAP Account'),
  };
};

// Harvest cycle notification template
export const harvestCycleTemplate = (data: EmailTemplateData): { subject: string; html: string } => {
  const subject = `Harvest Cycle Update - ${data.farmName || 'Your Farm'}`;
  const content = `
    <h2>Harvest Cycle Update</h2>
    <p>Hi ${data.name},</p>
    
    <div class="highlight">
        <p><strong>Harvest Details:</strong></p>
        <p><strong>Farm:</strong> ${data.farmName}</p>
        <p><strong>Cycle:</strong> ${data.harvestCycle || 'Multi-cut cycle'}</p>
        <p><strong>Expected Yield:</strong> ${data.yield || 'To be determined'}</p>
        <p><strong>Date:</strong> ${data.date || new Date().toLocaleString()}</p>
    </div>
    
    <p>Your harvest cycle is progressing. Remember to:</p>
    <ul>
        <li>Log daily harvest data</li>
        <li>Monitor cut quality</li>
        <li>Schedule next cuts</li>
        <li>Update inventory records</li>
    </ul>
    
    <center>
        <a href="${data.link}" class="button">Log Harvest Data</a>
    </center>
    
    <p>Best regards,<br><strong>EMAP Production Team</strong></p>
  `;

  return {
    subject,
    html: baseTemplate(content, 'Harvest Cycle Update'),
  };
};

// Irrigation alert template
export const irrigationAlertTemplate = (data: EmailTemplateData): { subject: string; html: string } => {
  const subject = `Irrigation Alert - ${data.farmName || 'Your Farm'}`;
  const content = `
    <h2>Irrigation System Alert</h2>
    <p>Hi ${data.name},</p>
    
    <div class="highlight">
        <p><strong>Alert Details:</strong></p>
        <p><strong>Status:</strong> ${data.irrigationStatus || 'Action Required'}</p>
        <p><strong>Farm:</strong> ${data.farmName}</p>
        <p><strong>Time:</strong> ${data.date || new Date().toLocaleString()}</p>
    </div>
    
    <p>Our 24/7 irrigation monitoring system has detected an update for your farm. Please log in to review and take appropriate action.</p>
    
    <center>
        <a href="${data.link}" class="button">View Irrigation Status</a>
    </center>
    
    <p>Best regards,<br><strong>EMAP Irrigation Monitoring</strong></p>
  `;

  return {
    subject,
    html: baseTemplate(content, 'Irrigation Alert'),
  };
};

// Contact form email template
export const contactEmailTemplate = (data: EmailTemplateData): { subject: string; html: string } => {
  const subject = `EMAP Contact Form: ${data.subject}`;
  const content = `
    <h2>New EMAP Contact Form Message</h2>
    <p><strong>From:</strong> ${data.name} (${data.email})</p>
    <p><strong>Subject:</strong> ${data.subject}</p>
    
    <div class="highlight">
        <p><strong>Message:</strong></p>
        <p>${data.message}</p>
    </div>
    
    <p><strong>Received:</strong> ${data.date || new Date().toLocaleString()}</p>
    
    <p>This inquiry is related to the El-Meena Agricultural Platform.</p>
  `;

  return {
    subject,
    html: baseTemplate(content, 'EMAP Contact Form Submission'),
  };
};

// Production report template
export const productionReportTemplate = (data: EmailTemplateData): { subject: string; html: string } => {
  const subject = `Production Report - ${data.date || 'Weekly Update'}`;
  const content = `
    <h2>Production Report</h2>
    <p>Hi ${data.name},</p>
    
    <div class="stats-grid">
        <div class="stat-card">
            <div class="stat-number">${data.hectares || '0'}</div>
            <div class="stat-label">Hectares Harvested</div>
        </div>
        <div class="stat-card">
            <div class="stat-number">${data.yield || '0'}</div>
            <div class="stat-label">Total Yield (tons)</div>
        </div>
    </div>
    
    <div class="highlight">
        <p><strong>Production Summary:</strong></p>
        <p><strong>Farm:</strong> ${data.farmName}</p>
        <p><strong>Crop Type:</strong> ${data.cropType}</p>
        <p><strong>Reporting Period:</strong> ${data.date}</p>
    </div>
    
    <center>
        <a href="${data.link}" class="button">View Full Report</a>
    </center>
    
    <p>Best regards,<br><strong>EMAP Analytics</strong></p>
  `;

  return {
    subject,
    html: baseTemplate(content, 'EMAP Production Report'),
  };
};


// lib/email/templates.ts - Add this new template

// Team member invitation template
export const teamMemberInvitationTemplate = (data: EmailTemplateData): { subject: string; html: string } => {
  const subject = `Welcome to ${data.farmName || 'EMAP'} - Your Account Credentials`;
  const content = `
    <h2>Welcome to the Team, ${data.name}!</h2>
    
    <p>You have been added as a team member to <strong>${data.farmName || 'EMAP'}</strong> with the following access:</p>
    
    <div class="highlight">
      <p><strong>Your Account Details:</strong></p>
      <p><strong>Name:</strong> ${data.name}</p>
      <p><strong>Email:</strong> ${data.email}</p>
      <p><strong>Temporary Password:</strong> <span style="font-family: monospace; font-size: 18px; font-weight: bold; background: #f0f9f0; padding: 4px 8px; border-radius: 4px;">${data.password || 'Use phone number as password'}</span></p>
      <p><strong>Role(s):</strong> ${data.roles || 'Team Member'}</p>
      <p><strong>Platform Access:</strong> ${data.platforms || 'EMAP'}</p>
    </div>
    
    <h3>Access Your Account:</h3>
    <p>Click the button below to login and access your dashboard:</p>
    
    <center>
      <a href="${data.link || process.env.NEXT_PUBLIC_APP_URL}" class="button">Login to Your Account</a>
    </center>
    
    <h3>Important Security Information:</h3>
    <ul>
      <li><strong>First Login:</strong> Use the temporary password provided above</li>
      <li><strong>Change Password:</strong> You will be prompted to change your password upon first login</li>
      <li><strong>Keep Secure:</strong> Do not share your password with anyone</li>
      <li><strong>Support:</strong> Contact your administrator if you need assistance</li>
    </ul>
    
    <h3>Platform Access Details:</h3>
    <ul>
      ${data.platforms?.includes('EMAP') ? '<li><strong>EMAP</strong> - Farm management and field operations</li>' : ''}
      ${data.platforms?.includes('EMAPS') ? '<li><strong>EMAPS</strong> - Quality assurance and inventory management</li>' : ''}
      ${data.platforms?.includes('EMMP') ? '<li><strong>EMMP</strong> - Sales, contracts, and buyer management</li>' : ''}
    </ul>
    
    <p>If you have any questions about your role or responsibilities, please reach out to your team administrator.</p>
    
    <p>Best regards,<br><strong>The EMAP Team</strong><br>El-Meena Agricultural Platform</p>
  `;

  return {
    subject,
    html: baseTemplate(content, 'Welcome to EMAP Team'),
  };
};