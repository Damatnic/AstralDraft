/**
 * Email Service
 * Handles transactional emails for authentication and user engagement
 */

import nodemailer from 'nodemailer';

// Email configuration
const EMAIL_CONFIG = {
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || ''
  }
};

// Create transporter
const transporter = nodemailer.createTransport(EMAIL_CONFIG);

// Email templates
const EMAIL_TEMPLATES = {
  emailVerification: {
    subject: 'Welcome to Astral Draft - Verify Your Email',
    html: (data: any) => `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #1a1a1a; color: #ffffff; padding: 20px; border-radius: 8px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #4F46E5; margin: 0;">🔮 Astral Draft</h1>
          <p style="color: #9CA3AF; margin: 5px 0;">Fantasy Football Oracle</p>
        </div>
        
        <h2 style="color: #ffffff; margin-bottom: 20px;">Welcome, ${data.displayName}!</h2>
        
        <p style="color: #D1D5DB; line-height: 1.6; margin-bottom: 20px;">
          Thank you for joining Astral Draft! To get started with your fantasy football predictions, 
          please verify your email address by clicking the button below.
        </p>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${data.verificationLink}" 
             style="background: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; 
                    border-radius: 6px; font-weight: bold; display: inline-block;">
            Verify Email Address
          </a>
        </div>
        
        <p style="color: #9CA3AF; font-size: 14px; margin-top: 30px;">
          If the button doesn't work, copy and paste this link into your browser:<br>
          <a href="${data.verificationLink}" style="color: #4F46E5;">${data.verificationLink}</a>
        </p>
        
        <hr style="border: none; border-top: 1px solid #374151; margin: 30px 0;">
        
        <p style="color: #9CA3AF; font-size: 12px; text-align: center;">
          This email was sent by Astral Draft. If you didn't create an account, you can safely ignore this email.
        </p>
      </div>
    `
  },
  
  passwordReset: {
    subject: 'Reset Your Astral Draft Password',
    html: (data: any) => `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #1a1a1a; color: #ffffff; padding: 20px; border-radius: 8px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #4F46E5; margin: 0;">🔮 Astral Draft</h1>
          <p style="color: #9CA3AF; margin: 5px 0;">Fantasy Football Oracle</p>
        </div>
        
        <h2 style="color: #ffffff; margin-bottom: 20px;">Password Reset Request</h2>
        
        <p style="color: #D1D5DB; line-height: 1.6; margin-bottom: 20px;">
          Hi ${data.displayName},<br><br>
          We received a request to reset your password for your Astral Draft account. 
          Click the button below to create a new password.
        </p>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${data.resetLink}" 
             style="background: #DC2626; color: white; padding: 12px 24px; text-decoration: none; 
                    border-radius: 6px; font-weight: bold; display: inline-block;">
            Reset Password
          </a>
        </div>
        
        <p style="color: #FCA5A5; background: #7F1D1D; padding: 12px; border-radius: 6px; font-size: 14px;">
          ⚠️ This link will expire in 1 hour for security reasons.
        </p>
        
        <p style="color: #9CA3AF; font-size: 14px; margin-top: 30px;">
          If the button doesn't work, copy and paste this link into your browser:<br>
          <a href="${data.resetLink}" style="color: #DC2626;">${data.resetLink}</a>
        </p>
        
        <hr style="border: none; border-top: 1px solid #374151; margin: 30px 0;">
        
        <p style="color: #9CA3AF; font-size: 12px; text-align: center;">
          If you didn't request a password reset, you can safely ignore this email. 
          Your password will remain unchanged.
        </p>
      </div>
    `
  },
  
  welcomeEmail: {
    subject: 'Welcome to Astral Draft - Let\'s Start Predicting!',
    html: (data: any) => `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #1a1a1a; color: #ffffff; padding: 20px; border-radius: 8px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #4F46E5; margin: 0;">🔮 Astral Draft</h1>
          <p style="color: #9CA3AF; margin: 5px 0;">Fantasy Football Oracle</p>
        </div>
        
        <h2 style="color: #ffffff; margin-bottom: 20px;">Welcome to the Oracle, ${data.displayName}!</h2>
        
        <p style="color: #D1D5DB; line-height: 1.6; margin-bottom: 20px;">
          Your email has been verified and you're ready to start making predictions! 
          Astral Draft uses advanced AI to help you make better fantasy football decisions.
        </p>
        
        <div style="background: #1F2937; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="color: #10B981; margin-top: 0;">🎯 Getting Started</h3>
          <ul style="color: #D1D5DB; padding-left: 20px;">
            <li>Make your first prediction to see the Oracle in action</li>
            <li>Check out the analytics dashboard for insights</li>
            <li>Join leagues to compete with friends</li>
            <li>Track your accuracy against the Oracle</li>
          </ul>
        </div>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${data.dashboardLink}" 
             style="background: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; 
                    border-radius: 6px; font-weight: bold; display: inline-block;">
            Start Predicting
          </a>
        </div>
        
        <hr style="border: none; border-top: 1px solid #374151; margin: 30px 0;">
        
        <p style="color: #9CA3AF; font-size: 12px; text-align: center;">
          Need help? Contact us at support@astral-draft.com
        </p>
      </div>
    `
  }
};

export interface EmailData {
  to: string;
  subject?: string;
  template: keyof typeof EMAIL_TEMPLATES;
  data: any;
}

export const sendEmail = async (emailData: EmailData): Promise<boolean> => {
  try {
    const template = EMAIL_TEMPLATES[emailData.template];
    
    if (!template) {
      throw new Error(`Email template '${emailData.template}' not found`);
    }

    const mailOptions = {
      from: `"Astral Draft" <${EMAIL_CONFIG.auth.user}>`,
      to: emailData.to,
      subject: emailData.subject || template.subject,
      html: template.html(emailData.data)
    };

    const result = await transporter.sendMail(mailOptions);
    console.log('📧 Email sent successfully:', result.messageId);
    
    return true;
  } catch (error) {
    console.error('❌ Email sending failed:', error);
    return false;
  }
};

export const verifyEmailConnection = async (): Promise<boolean> => {
  try {
    await transporter.verify();
    console.log('✅ Email service connected successfully');
    return true;
  } catch (error) {
    console.error('❌ Email service connection failed:', error);
    return false;
  }
};

export default { sendEmail, verifyEmailConnection };
