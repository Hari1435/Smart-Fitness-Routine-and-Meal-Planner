import { Request, Response } from 'express';
import { WorkoutMealPlanModel } from '../models/WorkoutMealPlan';
import { logger } from '../utils/logger';
import { asyncHandler, AppError } from '../middleware/errorHandler';
import { ApiResponse, AuthenticatedRequest, CreateWorkoutMealPlanRequest, UpdateCompletedStatusRequest } from '../types';

export class WorkoutMealPlanController {
  /**
   * Create or update workout meal plan for a specific day
   */
  static createOrUpdatePlan = asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const userId = req.user!.userId;
    const planData: CreateWorkoutMealPlanRequest = req.body;

    const plan = await WorkoutMealPlanModel.createOrUpdate(userId, planData);

    const response: ApiResponse = {
      success: true,
      message: 'Workout meal plan saved successfully',
      data: { plan },
    };

    res.status(200).json(response);
  });

  /**
   * Get all workout meal plans for current user
   */
  static getUserPlans = asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const userId = req.user!.userId;

    const plans = await WorkoutMealPlanModel.findByUserId(userId);

    const response: ApiResponse = {
      success: true,
      message: 'Workout meal plans retrieved successfully',
      data: { plans },
    };

    res.status(200).json(response);
  });

  /**
   * Get workout meal plan for a specific day
   */
  static getPlanByDay = asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const userId = req.user!.userId;
    const { day } = req.params;

    const validDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    if (!validDays.includes(day)) {
      throw new AppError('Invalid day. Must be one of: ' + validDays.join(', '), 400, 'INVALID_DAY');
    }

    const plan = await WorkoutMealPlanModel.findByUserAndDay(userId, day);
    if (!plan) {
      throw new AppError('No plan found for this day', 404, 'PLAN_NOT_FOUND');
    }

    const response: ApiResponse = {
      success: true,
      message: 'Workout meal plan retrieved successfully',
      data: { plan },
    };

    res.status(200).json(response);
  });

  /**
   * Update completed status for exercises or meals
   */
  static updateCompletedStatus = asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const userId = req.user!.userId;
    const { day } = req.params;
    const statusUpdate: UpdateCompletedStatusRequest = req.body;

    const validDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    if (!validDays.includes(day)) {
      throw new AppError('Invalid day. Must be one of: ' + validDays.join(', '), 400, 'INVALID_DAY');
    }

    const updatedPlan = await WorkoutMealPlanModel.updateCompletedStatus(userId, day, statusUpdate);

    const response: ApiResponse = {
      success: true,
      message: 'Completed status updated successfully',
      data: { plan: updatedPlan },
    };

    res.status(200).json(response);
  });

  /**
   * Get weekly progress for current user
   */
  static getWeeklyProgress = asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const userId = req.user!.userId;

    const progress = await WorkoutMealPlanModel.getWeeklyProgress(userId);

    const response: ApiResponse = {
      success: true,
      message: 'Weekly progress retrieved successfully',
      data: { progress },
    };

    res.status(200).json(response);
  });

  /**
   * Generate default workout meal plans based on user goal
   */
  static generateDefaultPlans = asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const userId = req.user!.userId;
    const { goal } = req.body;

    const validGoals = ['weight_loss', 'muscle_gain', 'maintenance'];
    if (!validGoals.includes(goal)) {
      throw new AppError('Invalid goal. Must be one of: ' + validGoals.join(', '), 400, 'INVALID_GOAL');
    }

    await WorkoutMealPlanModel.generateDefaultPlan(userId, goal);

    const response: ApiResponse = {
      success: true,
      message: 'Default workout meal plans generated successfully',
    };

    res.status(200).json(response);
  });

  /**
   * Delete workout meal plan for a specific day
   */
  static deletePlan = asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const userId = req.user!.userId;
    const { day } = req.params;

    const validDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    if (!validDays.includes(day)) {
      throw new AppError('Invalid day. Must be one of: ' + validDays.join(', '), 400, 'INVALID_DAY');
    }

    const plan = await WorkoutMealPlanModel.findByUserAndDay(userId, day);
    if (!plan) {
      throw new AppError('No plan found for this day', 404, 'PLAN_NOT_FOUND');
    }

    await WorkoutMealPlanModel.delete(plan.id, userId);

    const response: ApiResponse = {
      success: true,
      message: 'Workout meal plan deleted successfully',
    };

    res.status(200).json(response);
  });

  /**
   * Get plans by goal (Admin/Trainer only)
   */
  static getPlansByGoal = asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const { goal } = req.params;

    const validGoals = ['weight_loss', 'muscle_gain', 'maintenance'];
    if (!validGoals.includes(goal)) {
      throw new AppError('Invalid goal. Must be one of: ' + validGoals.join(', '), 400, 'INVALID_GOAL');
    }

    const plans = await WorkoutMealPlanModel.findByGoal(goal as any);

    const response: ApiResponse = {
      success: true,
      message: 'Plans retrieved successfully',
      data: { plans },
    };

    res.status(200).json(response);
  });

  /**
   * Get plan statistics (Admin/Trainer only)
   */
  static getPlanStatistics = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    // This would typically involve complex queries to get statistics
    // For now, return a simple response
    const response: ApiResponse = {
      success: true,
      message: 'Plan statistics retrieved successfully',
      data: {
        totalPlans: 0,
        completedPlans: 0,
        plansByGoal: {
          weight_loss: 0,
          muscle_gain: 0,
          maintenance: 0,
        },
        averageCompletionRate: 0,
      },
    };

    res.status(200).json(response);
  });
}