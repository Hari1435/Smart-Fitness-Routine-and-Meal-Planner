import dotenv from 'dotenv';
import { AppConfig } from '../types';

// Load environment variables
dotenv.config();

export const config: AppConfig = {
  port: parseInt(process.env.PORT || '3000'),
  nodeEnv: process.env.NODE_ENV || 'development',
  apiVersion: process.env.API_VERSION || 'v1',
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:4200',
  corsCredentials: process.env.CORS_CREDENTIALS === 'true',
  jwtSecret: process.env.JWT_SECRET || 'your_super_secret_jwt_key_here',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  jwtRefreshSecret: process.env.JWT_REFRESH_SECRET || 'your_refresh_token_secret_key_here',
  jwtRefreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '30d',
  bcryptSaltRounds: parseInt(process.env.BCRYPT_SALT_ROUNDS || '12'),
  rateLimitWindowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'), // 15 minutes
  rateLimitMaxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100'),
  maxFileSize: parseInt(process.env.MAX_FILE_SIZE || '5242880'), // 5MB
  uploadPath: process.env.UPLOAD_PATH || 'uploads/',
  frontendUrl: process.env.FRONTEND_URL!,
};

// Validate required environment variables
const requiredEnvVars = ['JWT_SECRET', 'JWT_REFRESH_SECRET'];

export const validateConfig = (): void => {
  const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
  
  if (missingVars.length > 0) {
    throw new Error(`Missing required environment variables: ${missingVars.join(', ')}`);
  }
  
  // ✅ CRITICAL: Validate frontend URL in production
  if (!config.frontendUrl) {
    throw new Error('FRONTEND_URL environment variable is required');
  }
  
  // Validate frontend URL format
  if (config.nodeEnv === 'production' && !config.frontendUrl.startsWith('https://')) {
    throw new Error('FRONTEND_URL must use HTTPS in production');
  }
  
  if (config.nodeEnv === 'production') {
    const productionRequiredVars = ['DB_PASSWORD', 'DB_HOST', 'DB_NAME', 'FRONTEND_URL'];
    const missingProdVars = productionRequiredVars.filter(varName => !process.env[varName]);
    
    if (missingProdVars.length > 0) {
      throw new Error(`Missing required production environment variables: ${missingProdVars.join(', ')}`);
    }
    
    // Check email service configuration
    const hasResend = !!process.env.RESEND_API_KEY;
    const hasGmail = !!(process.env.EMAIL_USER && process.env.EMAIL_PASS);
    
    if (!hasResend && !hasGmail) {
      console.warn('⚠️  WARNING: No email service configured. Set RESEND_API_KEY (recommended) or EMAIL_USER/EMAIL_PASS');
    } else if (hasResend) {
      console.log('✅ Email service: Resend API configured');
    } else if (hasGmail) {
      console.log('⚠️  Email service: Gmail SMTP configured (may fail on cloud platforms)');
    }
  }
};