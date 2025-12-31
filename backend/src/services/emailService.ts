import nodemailer from 'nodemailer';
import { logger } from '../utils/logger';
import { config } from '../config/app';

export interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export class EmailService {
  private static transporter: nodemailer.Transporter;

  /**
   * Initialize email transporter
   */
  static initialize(): void {
    try {
      // Check if we have Gmail credentials configured
      const emailUser = process.env.EMAIL_USER;
      const emailPass = process.env.EMAIL_PASS;
      
      if (emailUser && emailPass && emailUser.includes('@gmail.com')) {
        // Use Gmail SMTP
        this.transporter = nodemailer.createTransport({
          service: 'gmail',
          auth: {
            user: emailUser,
            pass: emailPass
          }
        });
        logger.info('Email service initialized with Gmail SMTP');
      } else if (config.nodeEnv === 'development') {
        // For development without Gmail, use Ethereal Email (fake SMTP service)
        this.transporter = nodemailer.createTransport({
          host: 'smtp.ethereal.email',
          port: 587,
          auth: {
            user: 'ethereal.user@ethereal.email',
            pass: 'ethereal.pass'
          }
        });
        logger.info('Email service initialized with Ethereal Email for development');
      } else {
        // For production, use real SMTP service
        this.transporter = nodemailer.createTransport({
          service: 'gmail',
          auth: {
            user: process.env.EMAIL_USER || 'your-email@gmail.com',
            pass: process.env.EMAIL_PASS || 'your-app-password'
          }
        });
        logger.info('Email service initialized with production SMTP');
      }
    } catch (error) {
      logger.error('Failed to initialize email service:', error);
      // Create a mock transporter for fallback
      this.transporter = nodemailer.createTransport({
        streamTransport: true,
        newline: 'unix',
        buffer: true
      });
    }
  }

  /**
   * Send password reset email
   */
  static async sendPasswordResetEmail(email: string, resetToken: string, userName: string): Promise<boolean> {
    try {
      const resetUrl = `${config.frontendUrl}/reset-password?token=${resetToken}`;
      
      const emailOptions: EmailOptions = {
        to: email,
        subject: 'Reset Your FitPlanner Password',
        html: this.getPasswordResetEmailTemplate(userName, resetUrl, email),
        text: this.getPasswordResetEmailText(userName, resetUrl)
      };

      const result = await this.sendEmail(emailOptions);
      
      if (result) {
        logger.info(`Password reset email sent to: ${email}`);
        return true;
      } else {
        logger.error(`Failed to send password reset email to: ${email}`);
        return false;
      }
    } catch (error) {
      logger.error('Error sending password reset email:', error);
      // In development, we'll return true to not block the flow
      if (config.nodeEnv === 'development') {
        logger.info(`Development mode: Simulating email sent to ${email}`);
        logger.info(`Reset URL would be: ${config.frontendUrl}/reset-password?token=${resetToken}`);
        return true;
      }
      return false;
    }
  }

  /**
   * Send generic email
   */
  static async sendEmail(options: EmailOptions): Promise<boolean> {
    try {
      if (!this.transporter) {
        this.initialize();
      }

      const mailOptions = {
        from: `"FitPlanner Support" <${process.env.EMAIL_FROM || 'noreply@fitplanner.com'}>`,
        to: options.to,
        subject: options.subject,
        html: options.html,
        text: options.text || options.html.replace(/<[^>]*>/g, '') // Strip HTML for text version
      };

      const info = await this.transporter.sendMail(mailOptions);
      
      // Log preview URL for development
      if (config.nodeEnv === 'development') {
        const previewUrl = nodemailer.getTestMessageUrl(info);
        if (previewUrl) {
          logger.info('Email preview URL:', previewUrl);
        }
      }

      return true;
    } catch (error: any) {
      logger.error('Error sending email:', error);
      
      // In development mode, log the error but don't fail the request
      if (config.nodeEnv === 'development') {
        logger.warn('Development mode: Email sending failed, but continuing...');
        if (error.code === 'EAUTH') {
          logger.warn('Gmail authentication failed. Please check EMAIL_USER and EMAIL_PASS in .env file.');
          logger.warn('Make sure you are using an App Password, not your regular Gmail password.');
        }
        return true; // Return true in development to not block the flow
      }
      
      return false;
    }
  }

  /**
   * Get password reset email HTML template
   */
  private static getPasswordResetEmailTemplate(userName: string, resetUrl: string, email: string): string {
    return `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Reset Your Password</title>
        <style>
          body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
            background-color: #f4f4f4;
          }
          .container {
            background: white;
            padding: 40px;
            border-radius: 10px;
            box-shadow: 0 0 20px rgba(0,0,0,0.1);
          }
          .header {
            text-align: center;
            margin-bottom: 30px;
          }
          .logo {
            font-size: 28px;
            font-weight: bold;
            color: #667eea;
            margin-bottom: 10px;
          }
          .title {
            color: #333;
            margin-bottom: 20px;
          }
          .content {
            margin-bottom: 30px;
          }
          .reset-button {
            display: inline-block;
            background: linear-gradient(135deg, #667eea, #764ba2);
            color: white;
            padding: 15px 30px;
            text-decoration: none;
            border-radius: 25px;
            font-weight: bold;
            margin: 20px 0;
          }
          .reset-button:hover {
            background: linear-gradient(135deg, #5a6fd8, #6a4190);
          }
          .warning {
            background-color: #fff3cd;
            border: 1px solid #ffeaa7;
            color: #856404;
            padding: 15px;
            border-radius: 5px;
            margin: 20px 0;
          }
          .footer {
            text-align: center;
            margin-top: 30px;
            padding-top: 20px;
            border-top: 1px solid #eee;
            color: #666;
            font-size: 14px;
          }
          .link {
            color: #667eea;
            word-break: break-all;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="logo">🏋️ FitPlanner</div>
            <h1 class="title">Reset Your Password</h1>
          </div>
          
          <div class="content">
            <p>Hi ${userName},</p>
            
            <p>We received a request to reset your password for your FitPlanner account. If you made this request, click the button below to reset your password:</p>
            
            <div style="text-align: center;">
              <a href="${resetUrl}" class="reset-button">Reset My Password</a>
            </div>
            
            <p>Or copy and paste this link into your browser:</p>
            <p><a href="${resetUrl}" class="link">${resetUrl}</a></p>
            
            <div class="warning">
              <strong>⚠️ Important:</strong>
              <ul>
                <li>This link will expire in 1 hour for security reasons</li>
                <li>If you didn't request this password reset, please ignore this email</li>
                <li>Your password will remain unchanged until you create a new one</li>
              </ul>
            </div>
            
            <p>If you're having trouble with the button above, copy and paste the URL into your web browser.</p>
            
            <p>Need help? Contact our support team at support@fitplanner.com</p>
            
            <p>Best regards,<br>The FitPlanner Team</p>
          </div>
          
          <div class="footer">
            <p>This email was sent to ${email} because a password reset was requested for your FitPlanner account.</p>
            <p>© 2024 FitPlanner. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  /**
   * Get password reset email text version
   */
  private static getPasswordResetEmailText(userName: string, resetUrl: string): string {
    return `
Hi ${userName},

We received a request to reset your password for your FitPlanner account.

To reset your password, please visit the following link:
${resetUrl}

IMPORTANT:
- This link will expire in 1 hour for security reasons
- If you didn't request this password reset, please ignore this email
- Your password will remain unchanged until you create a new one

Need help? Contact our support team at support@fitplanner.com

Best regards,
The FitPlanner Team

© 2024 FitPlanner. All rights reserved.
    `;
  }

  /**
   * Verify email service configuration
   */
  static async verifyConnection(): Promise<boolean> {
    try {
      if (!this.transporter) {
        this.initialize();
      }
      
      await this.transporter.verify();
      logger.info('Email service connection verified');
      return true;
    } catch (error) {
      logger.error('Email service connection failed:', error);
      return false;
    }
  }
}