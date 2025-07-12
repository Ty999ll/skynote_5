import nodemailer from 'nodemailer';

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
      // Gmail SMTP configuration
      const config: EmailConfig = {
        host: 'smtp.gmail.com',
        port: 587,
        secure: false,
        auth: {
          user: 'kimathityrell@gmail.com',
          pass: 'mmpy ejls crdw xxss',
        },
      };

      this.transporter = nodemailer.createTransport(config);
      this.isConfigured = true;
      console.log('Gmail SMTP email service configured successfully');
    } catch (error) {
      console.error('Failed to initialize Gmail SMTP:', error);
    }
  }

  generateVerificationToken(): string {
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
  }

  async sendVerificationEmail(email: string, token: string, displayName: string): Promise<boolean> {
    if (!this.transporter || !this.isConfigured) {
      console.error('Email service not configured');
      return false;
    }

    try {
      const verificationUrl = `${process.env.FRONTEND_URL || 'http://localhost:5000'}/verify-email?token=${token}`;
      
      const mailOptions = {
        from: '"Skynote" <kimathityrell@gmail.com>',
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
      console.error('Email service not configured');
      return false;
    }

    try {
      const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:5000'}/reset-password?token=${token}`;
      
      const mailOptions = {
        from: '"Skynote" <kimathityrell@gmail.com>',
        to: email,
        subject: 'Reset Your Skynote Password',
        html: `
          <div style="max-width: 600px; margin: 0 auto; padding: 20px; font-family: Arial, sans-serif;">
            <h2 style="color: #4f46e5; text-align: center;">Password Reset Request</h2>
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