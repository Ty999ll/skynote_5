import nodemailer from 'nodemailer';
import crypto from 'crypto';

interface EmailConfig {
  host: string;
  port: number;
  secure: boolean;
  auth: {
    user: string;
    pass: string;
  };
}

class EmailService {
  private transporter: nodemailer.Transporter | null = null;
  private isConfigured = false;

  constructor() {
    this.initializeTransporter();
  }

  private initializeTransporter() {
    // Check if email credentials are provided
    const emailHost = process.env.EMAIL_HOST;
    const emailPort = process.env.EMAIL_PORT;
    const emailUser = process.env.EMAIL_USER;
    const emailPass = process.env.EMAIL_PASS;

    if (emailHost && emailPort && emailUser && emailPass) {
      const config: EmailConfig = {
        host: emailHost,
        port: parseInt(emailPort),
        secure: parseInt(emailPort) === 465,
        auth: {
          user: emailUser,
          pass: emailPass,
        },
      };

      this.transporter = nodemailer.createTransport(config);
      this.isConfigured = true;
      console.log('Email service configured successfully');
    } else {
      console.log('Email service not configured - missing environment variables');
      // For development, create a test account
      this.createTestAccount();
    }
  }

  private async createTestAccount() {
    try {
      const testAccount = await nodemailer.createTestAccount();
      this.transporter = nodemailer.createTransport({
        host: 'smtp.ethereal.email',
        port: 587,
        secure: false,
        auth: {
          user: testAccount.user,
          pass: testAccount.pass,
        },
      });
      this.isConfigured = true;
      console.log('Test email account created:', testAccount.user);
    } catch (error) {
      console.error('Failed to create test email account:', error);
    }
  }

  generateVerificationToken(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  async sendVerificationEmail(email: string, token: string, displayName: string): Promise<boolean> {
    if (!this.isConfigured || !this.transporter) {
      console.log('Email service not configured, skipping email verification');
      return true; // Return true for development when email is not configured
    }

    const verificationUrl = `${process.env.FRONTEND_URL || 'http://localhost:5000'}/verify-email?token=${token}`;

    const mailOptions = {
      from: process.env.EMAIL_USER || 'noreply@skynote.com',
      to: email,
      subject: 'Verify Your Skynote Account',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9;">
          <div style="background-color: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
            <div style="text-align: center; margin-bottom: 30px;">
              <h1 style="color: #4F46E5; margin: 0; font-size: 28px;">Skynote</h1>
              <p style="color: #6B7280; margin: 5px 0 0 0;">Social Reading Platform</p>
            </div>
            
            <h2 style="color: #1F2937; margin-bottom: 20px;">Welcome to Skynote, ${displayName}!</h2>
            
            <p style="color: #4B5563; line-height: 1.6; margin-bottom: 25px;">
              Thank you for joining our community of book lovers. To complete your registration and start sharing your reading journey, please verify your email address by clicking the button below.
            </p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${verificationUrl}" 
                 style="background-color: #4F46E5; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
                Verify Email Address
              </a>
            </div>
            
            <p style="color: #6B7280; font-size: 14px; margin-top: 25px;">
              If the button doesn't work, copy and paste this link into your browser:<br>
              <a href="${verificationUrl}" style="color: #4F46E5; word-break: break-all;">${verificationUrl}</a>
            </p>
            
            <div style="border-top: 1px solid #E5E7EB; margin-top: 30px; padding-top: 20px; text-align: center;">
              <p style="color: #9CA3AF; font-size: 12px; margin: 0;">
                This verification link will expire in 24 hours. If you didn't create an account with Skynote, please ignore this email.
              </p>
            </div>
          </div>
        </div>
      `,
      text: `
        Welcome to Skynote, ${displayName}!
        
        Thank you for joining our community of book lovers. To complete your registration and start sharing your reading journey, please verify your email address by visiting the following link:
        
        ${verificationUrl}
        
        This verification link will expire in 24 hours. If you didn't create an account with Skynote, please ignore this email.
      `,
    };

    try {
      const info = await this.transporter.sendMail(mailOptions);
      console.log('Verification email sent:', info.messageId);
      
      // For test accounts, log the preview URL
      if (process.env.NODE_ENV === 'development') {
        console.log('Preview URL:', nodemailer.getTestMessageUrl(info));
      }
      
      return true;
    } catch (error) {
      console.error('Failed to send verification email:', error);
      return false;
    }
  }

  async sendPasswordResetEmail(email: string, token: string, displayName: string): Promise<boolean> {
    if (!this.isConfigured || !this.transporter) {
      console.log('Email service not configured, skipping password reset email');
      return true;
    }

    const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:5000'}/reset-password?token=${token}`;

    const mailOptions = {
      from: process.env.EMAIL_USER || 'noreply@skynote.com',
      to: email,
      subject: 'Reset Your Skynote Password',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9;">
          <div style="background-color: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
            <div style="text-align: center; margin-bottom: 30px;">
              <h1 style="color: #4F46E5; margin: 0; font-size: 28px;">Skynote</h1>
              <p style="color: #6B7280; margin: 5px 0 0 0;">Social Reading Platform</p>
            </div>
            
            <h2 style="color: #1F2937; margin-bottom: 20px;">Password Reset Request</h2>
            
            <p style="color: #4B5563; line-height: 1.6; margin-bottom: 25px;">
              Hi ${displayName}, we received a request to reset your password for your Skynote account. Click the button below to create a new password.
            </p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${resetUrl}" 
                 style="background-color: #EF4444; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
                Reset Password
              </a>
            </div>
            
            <p style="color: #6B7280; font-size: 14px; margin-top: 25px;">
              If the button doesn't work, copy and paste this link into your browser:<br>
              <a href="${resetUrl}" style="color: #EF4444; word-break: break-all;">${resetUrl}</a>
            </p>
            
            <div style="border-top: 1px solid #E5E7EB; margin-top: 30px; padding-top: 20px; text-align: center;">
              <p style="color: #9CA3AF; font-size: 12px; margin: 0;">
                This password reset link will expire in 1 hour. If you didn't request this reset, please ignore this email.
              </p>
            </div>
          </div>
        </div>
      `,
    };

    try {
      const info = await this.transporter.sendMail(mailOptions);
      console.log('Password reset email sent:', info.messageId);
      return true;
    } catch (error) {
      console.error('Failed to send password reset email:', error);
      return false;
    }
  }
}

export const emailService = new EmailService();