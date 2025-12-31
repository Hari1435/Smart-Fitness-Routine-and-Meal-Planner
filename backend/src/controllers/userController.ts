import { Request, Response } from 'express';
import { UserModel } from '../models/User';
import { logger } from '../utils/logger';
import { asyncHandler, AppError } from '../middleware/errorHandler';
import { ApiResponse, AuthenticatedRequest } from '../types';

export class UserController {
  /**
   * Get user by ID (own profile only)
   */
  static getUserById = asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const userId = parseInt(req.params.id);
    const currentUserId = req.user!.userId;

    // Users can only access their own profile
    if (currentUserId !== userId) {
      throw new AppError('Access denied', 403, 'ACCESS_DENIED');
    }

    const user = await UserModel.findByIdSafe(userId);
    if (!user) {
      throw new AppError('User not found', 404, 'USER_NOT_FOUND');
    }

    const response: ApiResponse = {
      success: true,
      message: 'User retrieved successfully',
      data: { user },
    };

    res.status(200).json(response);
  });

  /**
   * Update user (own profile only)
   */
  static updateUser = asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const userId = parseInt(req.params.id);
    const currentUserId = req.user!.userId;
    const updateData = req.body;

    // Users can only update their own profile
    if (currentUserId !== userId) {
      throw new AppError('Access denied', 403, 'ACCESS_DENIED');
    }

    // Remove role from update data (users cannot change their role)
    if (updateData.role) {
      delete updateData.role;
    }

    const updatedUser = await UserModel.updateProfile(userId, updateData);
    const { password, ...safeUser } = updatedUser;

    const response: ApiResponse = {
      success: true,
      message: 'User updated successfully',
      data: { user: safeUser },
    };

    res.status(200).json(response);
  });

  /**
   * Delete user (own profile only)
   */
  static deleteUser = asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const userId = parseInt(req.params.id);
    const currentUserId = req.user!.userId;

    // Users can only delete their own profile
    if (currentUserId !== userId) {
      throw new AppError('Access denied', 403, 'ACCESS_DENIED');
    }

    await UserModel.delete(userId);

    const response: ApiResponse = {
      success: true,
      message: 'User deleted successfully',
    };

    logger.info(`User deleted: ${userId}`);
    res.status(200).json(response);
  });

  /**
   * Check if email exists
   */
  static checkEmailExists = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { email } = req.query;
    const excludeUserId = req.query.excludeUserId ? parseInt(req.query.excludeUserId as string) : undefined;

    if (!email || typeof email !== 'string') {
      throw new AppError('Email is required', 400, 'EMAIL_REQUIRED');
    }

    const exists = await UserModel.emailExists(email, excludeUserId);

    const response: ApiResponse = {
      success: true,
      message: 'Email availability checked',
      data: { exists },
    };

    res.status(200).json(response);
  });
}