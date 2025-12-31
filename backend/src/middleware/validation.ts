import { Request, Response, NextFunction } from 'express';
import Joi from 'joi';
import { ApiResponse, ValidationError } from '../types';
import { logger } from '../utils/logger';

/**
 * Validation middleware factory
 */
export const validate = (schema: Joi.ObjectSchema, property: 'body' | 'query' | 'params' = 'body') => {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      const { error, value } = schema.validate(req[property], {
        abortEarly: false,
        allowUnknown: false,
        stripUnknown: true,
      });

      if (error) {
        const validationErrors: ValidationError[] = error.details.map(detail => ({
          field: detail.path.join('.'),
          message: detail.message,
        }));

        const response: ApiResponse = {
          success: false,
          message: 'Validation failed',
          error: 'VALIDATION_ERROR',
          errors: validationErrors,
        };

        res.status(400).json(response);
        return;
      }

      // Replace the original data with validated and sanitized data
      req[property] = value;
      next();
    } catch (error) {
      logger.error('Validation middleware error:', error);
      const response: ApiResponse = {
        success: false,
        message: 'Validation error occurred',
        error: 'VALIDATION_ERROR',
      };
      res.status(500).json(response);
    }
  };
};

/**
 * Sanitize input data
 */
export const sanitizeInput = (req: Request, res: Response, next: NextFunction): void => {
  try {
    // Sanitize body
    if (req.body && typeof req.body === 'object') {
      req.body = sanitizeObject(req.body);
    }

    // Sanitize query parameters
    if (req.query && typeof req.query === 'object') {
      req.query = sanitizeObject(req.query);
    }

    // Sanitize params
    if (req.params && typeof req.params === 'object') {
      req.params = sanitizeObject(req.params);
    }

    next();
  } catch (error) {
    logger.error('Input sanitization error:', error);
    next(); // Continue without sanitization if there's an error
  }
};

/**
 * Sanitize object recursively
 */
const sanitizeObject = (obj: any): any => {
  if (obj === null || obj === undefined) {
    return obj;
  }

  if (typeof obj === 'string') {
    return sanitizeString(obj);
  }

  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeObject(item));
  }

  if (typeof obj === 'object') {
    const sanitized: any = {};
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        sanitized[key] = sanitizeObject(obj[key]);
      }
    }
    return sanitized;
  }

  return obj;
};

/**
 * Sanitize string input
 */
const sanitizeString = (str: string): string => {
  if (typeof str !== 'string') {
    return str;
  }

  return str
    .trim()
    // Remove potential XSS patterns
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+\s*=/gi, '')
    // Remove potential SQL injection patterns
    .replace(/('|(\\')|(;)|(\\)|(--)|(\s+or\s+)|(union\s+select))/gi, '');
};

/**
 * Validate pagination parameters
 */
export const validatePagination = (req: Request, res: Response, next: NextFunction): void => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;

    // Validate page
    if (page < 1) {
      const response: ApiResponse = {
        success: false,
        message: 'Page number must be greater than 0',
        error: 'INVALID_PAGE',
      };
      res.status(400).json(response);
      return;
    }

    // Validate limit
    if (limit < 1 || limit > 100) {
      const response: ApiResponse = {
        success: false,
        message: 'Limit must be between 1 and 100',
        error: 'INVALID_LIMIT',
      };
      res.status(400).json(response);
      return;
    }

    // Add pagination info to request
    req.pagination = {
      page,
      limit,
      offset: (page - 1) * limit,
    };

    next();
  } catch (error) {
    logger.error('Pagination validation error:', error);
    const response: ApiResponse = {
      success: false,
      message: 'Pagination validation failed',
      error: 'PAGINATION_ERROR',
    };
    res.status(500).json(response);
  }
};

// Extend Request interface to include pagination
declare global {
  namespace Express {
    interface Request {
      pagination?: {
        page: number;
        limit: number;
        offset: number;
      };
    }
  }
}