import { Request, Response } from 'express';
import { UserModel } from '../models/User';
import { WorkoutMealPlanModel } from '../models/WorkoutMealPlan';
import { JWTUtils } from '../utils/jwt';
import { PasswordUtils } from '../utils/password';
import { logger } from '../utils/logger';
import { asyncHandler, AppError } from '../middleware/errorHandler';
import { ApiResponse, AuthResponse, CreateUserRequest, LoginRequest, AuthenticatedRequest } from '../types';

export class AuthController {
  /**
   * Register a new user
   */
  static register = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const userData: CreateUserRequest = req.body;

    // Check if user already exists
    const existingUser = await UserModel.findByEmail(userData.email);
    if (existingUser) {
      throw new AppError('Email already registered', 409, 'EMAIL_EXISTS');
    }

    // Create user
    const user = await UserModel.create(userData);

    // Generate default workout meal plans based on user goal (if provided)
    if (user.goal) {
      await WorkoutMealPlanModel.generateDefaultPlan(user.id, user.goal);
    }

    // Generate tokens
    const accessToken = JWTUtils.generateAccessToken({
      userId: user.id,
      email: user.email,
      role: user.role,
    });

    const refreshToken = JWTUtils.generateRefreshToken({
      userId: user.id,
      email: user.email,
      role: user.role,
    });

    // Remove password from response
    const { password, ...safeUser } = user;

    const response: ApiResponse<AuthResponse> = {
      success: true,
      message: 'User registered successfully',
      data: {
        user: safeUser,
        accessToken,
        refreshToken,
        expiresIn: '7d',
      },
    };

    logger.info(`User registered: ${user.email}`);
    res.status(201).json(response);
  });

  /**
   * Login user
   */
  static login = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { email, password }: LoginRequest = req.body;

    // Find user by email
    const user = await UserModel.findByEmail(email);
    if (!user) {
      throw new AppError('Invalid email or password', 401, 'INVALID_CREDENTIALS');
    }

    // Verify password
    const isPasswordValid = await PasswordUtils.comparePassword(password, user.password);
    if (!isPasswordValid) {
      throw new AppError('Invalid email or password', 401, 'INVALID_CREDENTIALS');
    }

    // Generate tokens
    const accessToken = JWTUtils.generateAccessToken({
      userId: user.id,
      email: user.email,
      role: user.role,
    });

    const refreshToken = JWTUtils.generateRefreshToken({
      userId: user.id,
      email: user.email,
      role: user.role,
    });

    // Remove password from response
    const { password: userPassword, ...safeUser } = user;

    const response: ApiResponse<AuthResponse> = {
      success: true,
      message: 'Login successful',
      data: {
        user: safeUser,
        accessToken,
        refreshToken,
        expiresIn: '7d',
      },
    };

    logger.info(`User logged in: ${user.email}`);
    res.status(200).json(response);
  });

  /**
   * Refresh access token
   */
  static refreshToken = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      throw new AppError('Refresh token is required', 400, 'MISSING_REFRESH_TOKEN');
    }

    try {
      // Verify refresh token
      const decoded = JWTUtils.verifyRefreshToken(refreshToken);

      // Check if user still exists
      const user = await UserModel.findById(decoded.userId);
      if (!user) {
        throw new AppError('User not found', 404, 'USER_NOT_FOUND');
      }

      // Generate new access token
      const newAccessToken = JWTUtils.generateAccessToken({
        userId: user.id,
        email: user.email,
        role: user.role,
      });

      const response: ApiResponse = {
        success: true,
        message: 'Token refreshed successfully',
        data: {
          accessToken: newAccessToken,
          expiresIn: '7d',
        },
      };

      res.status(200).json(response);
    } catch (error) {
      throw new AppError('Invalid refresh token', 401, 'INVALID_REFRESH_TOKEN');
    }
  });

  /**
   * Get current user profile
   */
  static getProfile = asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const userId = req.user!.userId;

    const user = await UserModel.findByIdSafe(userId);
    if (!user) {
      throw new AppError('User not found', 404, 'USER_NOT_FOUND');
    }

    const response: ApiResponse = {
      success: true,
      message: 'Profile retrieved successfully',
      data: { user },
    };

    res.status(200).json(response);
  });

  /**
   * Update user profile
   */
  static updateProfile = asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const userId = req.user!.userId;
    const profileData = req.body;

    const updatedUser = await UserModel.updateProfile(userId, profileData);
    const { password, ...safeUser } = updatedUser;

    const response: ApiResponse = {
      success: true,
      message: 'Profile updated successfully',
      data: { user: safeUser },
    };

    res.status(200).json(response);
  });

  /**
   * Update user fitness goals
   */
  static updateGoals = asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const userId = req.user!.userId;
    const goalsData = req.body;

    const updatedUser = await UserModel.updateGoals(userId, goalsData);
    const { password, ...safeUser } = updatedUser;

    // Generate new default workout meal plans if goal changed
    if (goalsData.goal) {
      await WorkoutMealPlanModel.generateDefaultPlan(userId, goalsData.goal);
    }

    const response: ApiResponse = {
      success: true,
      message: 'Goals updated successfully',
      data: { user: safeUser },
    };

    res.status(200).json(response);
  });

  /**
   * Change password
   */
  static changePassword = asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const userId = req.user!.userId;
    const { currentPassword, newPassword } = req.body;

    // Get current user
    const user = await UserModel.findById(userId);
    if (!user) {
      throw new AppError('User not found', 404, 'USER_NOT_FOUND');
    }

    // Verify current password
    const isCurrentPasswordValid = await PasswordUtils.comparePassword(currentPassword, user.password);
    if (!isCurrentPasswordValid) {
      throw new AppError('Current password is incorrect', 400, 'INVALID_CURRENT_PASSWORD');
    }

    // Validate new password strength
    const passwordValidation = PasswordUtils.validatePasswordStrength(newPassword);
    if (!passwordValidation.isValid) {
      throw new AppError('Password does not meet security requirements', 400, 'WEAK_PASSWORD');
    }

    // Update password
    await UserModel.updatePassword(userId, newPassword);

    const response: ApiResponse = {
      success: true,
      message: 'Password changed successfully',
    };

    logger.info(`Password changed for user: ${user.email}`);
    res.status(200).json(response);
  });

  /**
   * Logout user (client-side token removal)
   */
  static logout = asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const response: ApiResponse = {
      success: true,
      message: 'Logged out successfully',
    };

    logger.info(`User logged out: ${req.user!.email}`);
    res.status(200).json(response);
  });

  /**
   * Validate token (for client-side token verification)
   */
  static validateToken = asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const response: ApiResponse = {
      success: true,
      message: 'Token is valid',
      data: {
        user: {
          userId: req.user!.userId,
          email: req.user!.email,
          role: req.user!.role,
        },
      },
    };

    res.status(200).json(response);
  });
}