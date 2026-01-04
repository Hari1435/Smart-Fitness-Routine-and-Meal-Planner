import express, { Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';
import rateLimit from 'express-rate-limit';

import { config, validateConfig } from './config/app';
import { testConnection, initializeDatabase, closeDatabase } from './config/database';
import { logger } from './utils/logger';
import { EmailService } from './services/emailService';
import { errorHandler, notFoundHandler, handleUncaughtException, handleUnhandledRejection, handleGracefulShutdown } from './middleware/errorHandler';
import { sanitizeInput } from './middleware/validation';

// Import routes
import authRoutes from './routes/auth';
import userRoutes from './routes/user';
import workoutMealPlanRoutes from './routes/workoutMealPlan';
import workoutRoutes from './routes/workout';
import progressRoutes from './routes/progress';
import mealRoutes from './routes/meal';
import foodRoutes from './routes/food';

class Server {
  private app: express.Application;
  private server: any;

  constructor() {
    this.app = express();
    this.setupGlobalErrorHandlers();
    this.validateEnvironment();
    this.setupMiddleware();
    this.setupRoutes();
    this.setupErrorHandling();
  }

  /**
   * Setup global error handlers
   */
  private setupGlobalErrorHandlers(): void {
    handleUncaughtException();
    handleUnhandledRejection();
  }

  /**
   * Validate environment configuration
   */
  private validateEnvironment(): void {
    try {
      validateConfig();
      logger.info('Environment configuration validated successfully');
    } catch (error) {
      logger.error('Environment validation failed:', error);
      process.exit(1);
    }
  }

  /**
   * Setup middleware
   */
  private setupMiddleware(): void {
    // Trust proxy for cloud deployment (Render, Heroku, etc.)
    this.app.set('trust proxy', true);
    
    // Security middleware
    this.app.use(helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          scriptSrc: ["'self'"],
          imgSrc: ["'self'", "data:", "https:"],
        },
      },
      crossOriginEmbedderPolicy: false,
    }));

    // CORS configuration
    this.app.use(cors({
      origin: config.corsOrigin,
      credentials: config.corsCredentials,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    }));

    // Rate limiting
    const limiter = rateLimit({
      windowMs: config.rateLimitWindowMs,
      max: config.rateLimitMaxRequests,
      message: {
        success: false,
        message: 'Too many requests from this IP, please try again later.',
        error: 'RATE_LIMIT_EXCEEDED',
      },
      standardHeaders: true,
      legacyHeaders: false,
    });
    this.app.use('/api', limiter);

    // Compression
    this.app.use(compression());

    // Logging
    if (config.nodeEnv === 'development') {
      this.app.use(morgan('dev'));
    } else {
      this.app.use(morgan('combined'));
    }

    // Body parsing
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));

    // Input sanitization
    this.app.use(sanitizeInput);

    // Health check endpoint
    this.app.get('/health', (req: Request, res: Response) => {
      res.status(200).json({
        success: true,
        message: 'Server is healthy',
        data: {
          timestamp: new Date().toISOString(),
          uptime: process.uptime(),
          environment: config.nodeEnv,
          version: process.env.npm_package_version || '1.0.0',
        },
      });
    });

    // Debug endpoint to check database content
    this.app.get('/debug/workouts', async (req: Request, res: Response) => {
      try {
        const { pool } = require('./config/database');
        const connection = await pool.getConnection();
        const [rows] = await connection.execute('SELECT id, user_id, day, JSON_LENGTH(exercises) as exercise_count, JSON_LENGTH(meals) as meal_count, created_at FROM workoutmealplans LIMIT 10');
        connection.release();
        
        res.status(200).json({
          success: true,
          message: 'Debug workout data',
          data: { workouts: rows },
        });
      } catch (error: any) {
        res.status(500).json({
          success: false,
          message: 'Debug error',
          error: error.message,
        });
      }
    });

    // Debug endpoint to check users
    this.app.get('/debug/users', async (req: Request, res: Response) => {
      try {
        const { pool } = require('./config/database');
        const connection = await pool.getConnection();
        const [rows] = await connection.execute('SELECT id, name, email, goal, created_at FROM users LIMIT 10');
        connection.release();
        
        res.status(200).json({
          success: true,
          message: 'Debug user data',
          data: { users: rows },
        });
      } catch (error: any) {
        res.status(500).json({
          success: false,
          message: 'Debug error',
          error: error.message,
        });
      }
    });

    // Debug endpoint to test workout API response structure
    this.app.get('/debug/workout-api/:userId', async (req: any, res: any) => {
      try {
        const { WorkoutMealPlanModel } = require('./models/WorkoutMealPlan');
        const userId = parseInt(req.params.userId);
        
        const plans = await WorkoutMealPlanModel.findByUserId(userId);
        
        // Extract only workout-related data (same as WorkoutController.getAllWorkouts)
        const workouts = plans.map((plan: any) => ({
          id: plan.id,
          day: plan.day,
          exercises: plan.exercises,
          completed_status: {
            exercises: plan.completed_status.exercises,
            date_completed: plan.completed_status.date_completed,
          },
          created_at: plan.created_at,
          updated_at: plan.updated_at,
        }));

        const response = {
          success: true,
          message: 'Workout plans retrieved successfully',
          data: { plans: workouts },
        };
        
        res.status(200).json(response);
      } catch (error: any) {
        res.status(500).json({
          success: false,
          message: 'Debug error',
          error: error.message,
        });
      }
    });
  }

  /**
   * Setup API routes
   */
  private setupRoutes(): void {
    const apiRouter = express.Router();

    // API routes
    apiRouter.use('/auth', authRoutes);
    apiRouter.use('/users', userRoutes);
    apiRouter.use('/workout-meal-plans', workoutMealPlanRoutes);
    apiRouter.use('/workouts', workoutRoutes);
    apiRouter.use('/progress', progressRoutes);
    apiRouter.use('/meals', mealRoutes);
    apiRouter.use('/foods', foodRoutes);

    // Mount API router
    this.app.use(`/api/${config.apiVersion}`, apiRouter);

    // Root endpoint
    this.app.get('/', (req: Request, res: Response) => {
      res.status(200).json({
        success: true,
        message: 'Smart Fitness Planner API',
        data: {
          version: config.apiVersion,
          environment: config.nodeEnv,
          documentation: '/api/docs',
          health: '/health',
        },
      });
    });
  }

  /**
   * Setup error handling
   */
  private setupErrorHandling(): void {
    // 404 handler
    this.app.use(notFoundHandler);

    // Global error handler
    this.app.use(errorHandler);
  }

  /**
   * Initialize database connection
   */
  private async initializeDatabase(): Promise<void> {
    try {
      await testConnection();
      await initializeDatabase();
      logger.info('Database initialized successfully');
    } catch (error) {
      logger.error('Database initialization failed:', error);
      throw error;
    }
  }

  /**
   * Initialize email service
   */
  private async initializeEmailService(): Promise<void> {
    try {
      EmailService.initialize();
      await EmailService.verifyConnection();
      logger.info('Email service initialized successfully');
    } catch (error) {
      logger.warn('Email service initialization failed (continuing without email):', error);
      // Don't throw error - email is not critical for basic functionality
    }
  }

  /**
   * Start the server
   */
  public async start(): Promise<void> {
    try {
      // Initialize database
      await this.initializeDatabase();

      // Initialize email service
      await this.initializeEmailService();

      // Start server
      this.server = this.app.listen(config.port, () => {
        if (config.nodeEnv === 'development') {
          logger.info(`🚀 Server running on port ${config.port}`);
          logger.info(`📱 Environment: ${config.nodeEnv}`);
          logger.info(`🌐 API Base URL: http://localhost:${config.port}/api/${config.apiVersion}`);
          logger.info(`💚 Health Check: http://localhost:${config.port}/health`);
          logger.info(`🔧 CORS Origin: ${config.corsOrigin}`);
        } else {
          logger.info(`Server running on port ${config.port}`);
        }
      });

      // Setup graceful shutdown
      handleGracefulShutdown(this.server);

    } catch (error) {
      logger.error('Failed to start server:', error);
      process.exit(1);
    }
  }

  /**
   * Stop the server
   */
  public async stop(): Promise<void> {
    try {
      if (this.server) {
        await new Promise<void>((resolve) => {
          this.server.close(() => {
            logger.info('Server stopped');
            resolve();
          });
        });
      }

      await closeDatabase();
      logger.info('Application shutdown complete');
    } catch (error) {
      logger.error('Error during server shutdown:', error);
      throw error;
    }
  }

  /**
   * Get Express app instance
   */
  public getApp(): express.Application {
    return this.app;
  }
}

// Create and start server
const server = new Server();

// Start server if this file is run directly
if (require.main === module) {
  server.start().catch((error) => {
    logger.error('Failed to start application:', error);
    process.exit(1);
  });
}

export default server;