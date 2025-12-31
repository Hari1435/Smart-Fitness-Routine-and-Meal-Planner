import { Request, Response } from 'express';
import { UserModel } from '../models/User';
import { logger } from '../utils/logger';
import { asyncHandler, AppError } from '../middleware/errorHandler';
import { ApiResponse, AuthenticatedRequest, PaginatedResponse } from '../types';

export class UserController {
  /**
   * Get all users (Admin only)
   */
  static getAllUsers = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const page = req.pagination?.page || 1;
    const limit = req.pagination?.limit || 10;

    const { users, total } = await UserModel.findAll(page, limit);

    // Remove passwords from response
    const safeUsers = users.map(user => {
      const { password, ...safeUser } = user;
      return safeUser;
    });

    const totalPages = Math.ceil(total / limit);

    const response: ApiResponse<PaginatedResponse<typeof safeUsers[0]>> = {
      success: true,
      message: 'Users retrieved successfully',
      data: {
        data: safeUsers,
        pagination: {
          page,
          limit,
          total,
          totalPages,
          hasNext: page < totalPages,
          hasPrev: page > 1,
        },
      },
    };

    res.status(200).json(response);
  });

  /**
   * Get user by ID (Admin only or own profile)
   */
  static getUserById = asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const userId = parseInt(req.params.id);
    const currentUserId = req.user!.userId;
    const currentUserRole = req.user!.role;

    // Check if user can access this profile
    if (currentUserRole !== 'admin' && currentUserId !== userId) {
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
   * Update user (Admin only or own profile)
   */
  static updateUser = asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const userId = parseInt(req.params.id);
    const currentUserId = req.user!.userId;
    const currentUserRole = req.user!.role;
    const updateData = req.body;

    // Check if user can update this profile
    if (currentUserRole !== 'admin' && currentUserId !== userId) {
      throw new AppError('Access denied', 403, 'ACCESS_DENIED');
    }

    // Prevent non-admin users from changing role
    if (currentUserRole !== 'admin' && updateData.role) {
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
   * Delete user (Admin only or own profile)
   */
  static deleteUser = asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const userId = parseInt(req.params.id);
    const currentUserId = req.user!.userId;
    const currentUserRole = req.user!.role;

    // Check if user can delete this profile
    if (currentUserRole !== 'admin' && currentUserId !== userId) {
      throw new AppError('Access denied', 403, 'ACCESS_DENIED');
    }

    // Prevent admin from deleting themselves
    if (currentUserRole === 'admin' && currentUserId === userId) {
      throw new AppError('Cannot delete your own admin account', 400, 'CANNOT_DELETE_SELF');
    }

    await UserModel.delete(userId);

    const response: ApiResponse = {
      success: true,
      message: 'User deleted successfully',
    };

    logger.info(`User deleted: ${userId} by ${currentUserId}`);
    res.status(200).json(response);
  });

  /**
   * Get user statistics (Admin only)
   */
  static getUserStatistics = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const statistics = await UserModel.getStatistics();

    const response: ApiResponse = {
      success: true,
      message: 'User statistics retrieved successfully',
      data: statistics,
    };

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

  /**
   * Search users (Admin only)
   */
  static searchUsers = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { query, role, goal } = req.query;
    const page = req.pagination?.page || 1;
    const limit = req.pagination?.limit || 10;

    // This is a simplified search - in a real application, you might want to use full-text search
    let searchQuery = 'SELECT * FROM users WHERE 1=1';
    const params: any[] = [];

    if (query && typeof query === 'string') {
      searchQuery += ' AND (name LIKE ? OR email LIKE ?)';
      params.push(`%${query}%`, `%${query}%`);
    }

    if (role && typeof role === 'string') {
      searchQuery += ' AND role = ?';
      params.push(role);
    }

    if (goal && typeof goal === 'string') {
      searchQuery += ' AND goal = ?';
      params.push(goal);
    }

    searchQuery += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    params.push(limit, (page - 1) * limit);

    // For now, return empty results - implement actual search logic as needed
    const response: ApiResponse = {
      success: true,
      message: 'User search completed',
      data: {
        data: [],
        pagination: {
          page,
          limit,
          total: 0,
          totalPages: 0,
          hasNext: false,
          hasPrev: false,
        },
      },
    };

    res.status(200).json(response);
  });
}