import Joi from 'joi';
import { CreateUserRequest, LoginRequest, UpdateProfileRequest, UpdateGoalsRequest } from '../types';

// User registration validation schema
export const registerSchema = Joi.object<CreateUserRequest>({
  name: Joi.string()
    .min(2)
    .max(100)
    .trim()
    .required()
    .messages({
      'string.empty': 'Name is required',
      'string.min': 'Name must be at least 2 characters long',
      'string.max': 'Name must be less than 100 characters long',
    }),
  
  email: Joi.string()
    .email()
    .lowercase()
    .trim()
    .required()
    .messages({
      'string.empty': 'Email address is required',
      'string.email': 'Please enter a valid email address (e.g., user@example.com)',
    }),
  
  password: Joi.string()
    .min(8)
    .max(128)
    .required()
    .messages({
      'string.empty': 'Password is required',
      'string.min': 'Password must be at least 8 characters long',
      'string.max': 'Password must be less than 128 characters long',
    }),
  
  role: Joi.string()
    .valid('user', 'trainer')
    .default('user')
    .messages({
      'any.only': 'Role must be either user or trainer',
    }),
});

// User login validation schema
export const loginSchema = Joi.object<LoginRequest>({
  email: Joi.string()
    .email()
    .lowercase()
    .trim()
    .required()
    .messages({
      'string.empty': 'Email address is required',
      'string.email': 'Please enter a valid email address (e.g., user@example.com)',
    }),
  
  password: Joi.string()
    .required()
    .messages({
      'string.empty': 'Password is required',
    }),
});

// Profile update validation schema (simplified)
export const updateProfileSchema = Joi.object<UpdateProfileRequest>({
  name: Joi.string()
    .min(2)
    .max(100)
    .trim()
    .optional()
    .messages({
      'string.min': 'Name must be at least 2 characters long',
      'string.max': 'Name must be less than 100 characters long',
    }),
  
  age: Joi.number()
    .integer()
    .min(13)
    .max(120)
    .optional()
    .messages({
      'number.base': 'Age must be a number',
      'number.integer': 'Age must be a whole number',
      'number.min': 'Age must be at least 13',
      'number.max': 'Age must be less than 120',
    }),
  
  gender: Joi.string()
    .valid('male', 'female', 'other')
    .optional()
    .messages({
      'any.only': 'Gender must be male, female, or other',
    }),
  
  height: Joi.number()
    .min(100)
    .max(250)
    .optional()
    .messages({
      'number.base': 'Height must be a number',
      'number.min': 'Height must be at least 100 cm',
      'number.max': 'Height must be less than 250 cm',
    }),
  
  weight: Joi.number()
    .min(30)
    .max(300)
    .optional()
    .messages({
      'number.base': 'Weight must be a number',
      'number.min': 'Weight must be at least 30 kg',
      'number.max': 'Weight must be less than 300 kg',
    }),
});

// Goals update validation schema (simplified)
export const updateGoalsSchema = Joi.object<UpdateGoalsRequest>({
  goal: Joi.string()
    .valid('weight_loss', 'muscle_gain', 'maintenance')
    .required()
    .messages({
      'string.empty': 'Fitness goal is required',
      'any.only': 'Goal must be weight_loss, muscle_gain, or maintenance',
    }),
});

// Email validation schema
export const emailSchema = Joi.object({
  email: Joi.string()
    .email()
    .lowercase()
    .trim()
    .required()
    .messages({
      'string.empty': 'Email is required',
      'string.email': 'Please provide a valid email address',
    }),
});

// Password reset validation schema
export const resetPasswordSchema = Joi.object({
  token: Joi.string()
    .required()
    .messages({
      'string.empty': 'Reset token is required',
    }),
  
  password: Joi.string()
    .min(8)
    .max(128)
    .required()
    .messages({
      'string.empty': 'New password is required',
      'string.min': 'Password must be at least 8 characters long',
      'string.max': 'Password must be less than 128 characters long',
    }),
});

// Change password validation schema
export const changePasswordSchema = Joi.object({
  currentPassword: Joi.string()
    .required()
    .messages({
      'string.empty': 'Current password is required',
    }),
  
  newPassword: Joi.string()
    .min(8)
    .max(128)
    .required()
    .messages({
      'string.empty': 'New password is required',
      'string.min': 'New password must be at least 8 characters long',
      'string.max': 'New password must be less than 128 characters long',
    }),
});

// Refresh token validation schema
export const refreshTokenSchema = Joi.object({
  refreshToken: Joi.string()
    .required()
    .messages({
      'string.empty': 'Refresh token is required',
    }),
});

// Forgot password validation schema
export const forgotPasswordSchema = Joi.object({
  email: Joi.string()
    .email()
    .lowercase()
    .trim()
    .required()
    .messages({
      'string.empty': 'Email address is required',
      'string.email': 'Please enter a valid email address (e.g., user@example.com)',
    }),
});