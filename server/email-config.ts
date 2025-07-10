import nodemailer from 'nodemailer';
import dotenv from 'dotenv'; 
// Load environment variables from .env file
dotenv.config(); 

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
    try {
      // Retrieve configuration from environment variables
      const config: EmailConfig = {
        host: process.env.SMTP_HOST || 'smtp.gmail.com', // Use env var, fallback to Gmail
        port: parseInt(process.env.SMTP_PORT || '587'), // Use env var, fallback
        secure: process.env.SMTP_SECURE === 'true',
        auth: {
          user: process.env.SMTP_USER!, // Use env var, assert non-null
          pass: process.env.SMTP_PASS!, // Use env var, assert non-null
        },
      };

      // Basic validation for critical email config
      if (!config.auth.user || !config.auth.pass) {
        console.error('SMTP_USER or SMTP_PASS environment variables are not set in .env or are empty.');
        this.isConfigured = false;
        return; // Prevent transporter creation with missing creds
      }

      this.transporter = nodemailer.createTransport(config);
      this.isConfigured = true;
      console.log('Email service configured successfully using environment variables.');
    } catch (error) {
      console.error('Failed to initialize email service:', error);
      this.isConfigured = false;
    }
  }

  generateVerificationToken(): string {
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
  }

  async sendVerificationEmail(email: string, token: string, displayName: string): Promise<boolean> {
    if (!this.transporter || !this.isConfigured) {
      console.error('Email service not configured. Cannot send verification email.');
      return false;
    }

    try {
      // Ensure FRONTEND_URL is used from environment for the verification link
      const verificationUrl = `${process.env.FRONTEND_URL || 'http://localhost:5000'}/verify-email?token=${token}`;

      const mailOptions = {
        from: `"${process.env.EMAIL_FROM_NAME || 'Skynote'}" <${process.env.SMTP_USER}>`,
        to: email,
        subject: 'Verify Your Skynote Account',
        html: `
          <div style="max-width: 600px; margin: 0 auto; padding: 20px; font-family: Arial, sans-serif;">
            <h2 style="color: #4f46e5; text-align: center;">Welcome to Skynote!</h2>
            <p>Hi ${displayName},</p>
            <p>Thank you for joining Skynote, the social reading platform. To complete your registration, please verify your email address by clicking the button below:</p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${verificationUrl}" style="background-color: #4f46e5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">Verify Email Address</a>
            </div>
            <p>If the button doesn't work, you can copy and paste this link into your browser:</p>
            <p style="word-break: break-all; color: #6b7280;">${verificationUrl}</p>
            <p>This link will expire in 24 hours for security reasons.</p>
            <hr style="margin: 30px 0; border: none; border-top: 1px solid #e5e7eb;">
            <p style="color: #6b7280; font-size: 14px;">If you didn't create a Skynote account, you can safely ignore this email.</p>
          </div>
        `,
      };

      await this.transporter.sendMail(mailOptions);
      console.log(`Verification email sent to ${email}`);
      return true;
    } catch (error) {
      console.error('Error sending verification email:', error);
      return false;
    }
  }

  async sendPasswordResetEmail(email: string, token: string, displayName: string): Promise<boolean> {
    if (!this.transporter || !this.isConfigured) {
      console.error('Email service not configured. Cannot send password reset email.');
      return false;
    }

    try {
      // Ensure FRONTEND_URL is used from environment for the reset link
      const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:5000'}/reset-password?token=${token}`;

      const mailOptions = {
        from: `"${process.env.EMAIL_FROM_NAME || 'Skynote'}" <${process.env.SMTP_USER}>`,
        to: email,
        subject: 'Reset Your Skynote Password',
        html: `
          <div style="max-width: 600px; margin: 0 auto; padding: 20px; font-family: Arial, sans-serif;">
            <h2 style="color: #dc2626; text-align: center;">Password Reset Request</h2>
            <p>Hi ${displayName},</p>
            <p>We received a request to reset your Skynote account password. Click the button below to create a new password:</p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${resetUrl}" style="background-color: #dc2626; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">Reset Password</a>
            </div>
            <p>If the button doesn't work, you can copy and paste this link into your browser:</p>
            <p style="word-break: break-all; color: #6b7280;">${resetUrl}</p>
            <p>This link will expire in 1 hour for security reasons.</p>
            <hr style="margin: 30px 0; border: none; border-top: 1px solid #e5e7eb;">
            <p style="color: #6b7280; font-size: 14px;">If you didn't request a password reset, you can safely ignore this email. Your password will remain unchanged.</p>
          </div>
        `,
      };

      await this.transporter.sendMail(mailOptions);
      console.log(`Password reset email sent to ${email}`);
      return true;
    } catch (error) {
      console.error('Error sending password reset email:', error);
      return false;
    }
  }
}

export const emailService = new EmailService();