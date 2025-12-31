import { Request, Response, NextFunction } from 'express';
import { AuthenticatedRequest, ApiResponse, JWTPayload } from '../types';
import { JWTUtils } from '../utils/jwt';
import { logger } from '../utils/logger';

/**
 * Authentication middleware to verify JWT tokens
 */
export const authenticate = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    const token = JWTUtils.extractTokenFromHeader(authHeader);

    if (!token) {
      const response: ApiResponse = {
        success: false,
        message: 'Access token is required',
        error: 'MISSING_TOKEN',
      };
      res.status(401).json(response);
      return;
    }

    try {
      const decoded = JWTUtils.verifyAccessToken(token);
      req.user = decoded;
      next();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Invalid token';
      const response: ApiResponse = {
        success: false,
        message: errorMessage,
        error: 'INVALID_TOKEN',
      };
      res.status(401).json(response);
      return;
    }
  } catch (error) {
    logger.error('Authentication middleware error:', error);
    const response: ApiResponse = {
      success: false,
      message: 'Authentication failed',
      error: 'AUTH_ERROR',
    };
    res.status(500).json(response);
  }
};

/**
 * Authorization middleware to check user roles
 */
export const authorize = (...roles: string[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    try {
      if (!req.user) {
        const response: ApiResponse = {
          success: false,
          message: 'User not authenticated',
          error: 'NOT_AUTHENTICATED',
        };
        res.status(401).json(response);
        return;
      }

      if (!roles.includes(req.user.role)) {
        const response: ApiResponse = {
          success: false,
          message: 'Insufficient permissions',
          error: 'INSUFFICIENT_PERMISSIONS',
        };
        res.status(403).json(response);
        return;
      }

      next();
    } catch (error) {
      logger.error('Authorization middleware error:', error);
      const response: ApiResponse = {
        success: false,
        message: 'Authorization failed',
        error: 'AUTH_ERROR',
      };
      res.status(500).json(response);
    }
  };
};

/**
 * Optional authentication middleware - doesn't fail if no token provided
 */
export const optionalAuthenticate = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    const token = JWTUtils.extractTokenFromHeader(authHeader);

    if (token) {
      try {
        const decoded = JWTUtils.verifyAccessToken(token);
        req.user = decoded;
      } catch (error) {
        // Token is invalid, but we don't fail the request
        logger.debug('Optional authentication failed:', error);
      }
    }

    next();
  } catch (error) {
    logger.error('Optional authentication middleware error:', error);
    next(); // Continue even if there's an error
  }
};

/**
 * Middleware to check if user owns the resource
 */
export const checkResourceOwnership = (userIdParam: string = 'userId') => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    try {
      if (!req.user) {
        const response: ApiResponse = {
          success: false,
          message: 'User not authenticated',
          error: 'NOT_AUTHENTICATED',
        };
        res.status(401).json(response);
        return;
      }

      const resourceUserId = parseInt(req.params[userIdParam]);
      const currentUserId = req.user.userId;

      // Allow if user owns the resource
      if (currentUserId === resourceUserId) {
        next();
        return;
      }

      const response: ApiResponse = {
        success: false,
        message: 'Access denied to this resource',
        error: 'ACCESS_DENIED',
      };
      res.status(403).json(response);
    } catch (error) {
      logger.error('Resource ownership check error:', error);
      const response: ApiResponse = {
        success: false,
        message: 'Authorization failed',
        error: 'AUTH_ERROR',
      };
      res.status(500).json(response);
    }
  };
};