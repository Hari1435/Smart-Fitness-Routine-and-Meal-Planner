import { Request, Response } from 'express';
import { WorkoutService } from '../services/workoutService';
import { WorkoutMealPlanModel } from '../models/WorkoutMealPlan';
import { logger } from '../utils/logger';
import { asyncHandler, AppError } from '../middleware/errorHandler';
import { ApiResponse, AuthenticatedRequest } from '../types';

export class WorkoutController {
  /**
   * Generate personalized workout routine for user
   */
  static generatePersonalizedRoutine = asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const userId = req.user!.userId;

    const workoutPlans = await WorkoutService.generatePersonalizedWorkout(userId);

    const response: ApiResponse = {
      success: true,
      message: 'Personalized workout routine generated successfully',
      data: { plans: workoutPlans },
    };

    res.status(200).json(response);
  });

  /**
   * Get workout progress analytics
   */
  static getWorkoutProgress = asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const userId = req.user!.userId;

    const progress = await WorkoutService.getWorkoutProgress(userId);

    const response: ApiResponse = {
      success: true,
      message: 'Workout progress retrieved successfully',
      data: { progress },
    };

    res.status(200).json(response);
  });

  /**
   * Mark exercise as completed
   */
  static markExerciseCompleted = asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const userId = req.user!.userId;
    const { day } = req.params;
    const { exercise_id, completed } = req.body;

    if (!exercise_id || typeof completed !== 'boolean') {
      throw new AppError('Exercise ID and completed status are required', 400, 'INVALID_INPUT');
    }

    const validDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    if (!validDays.includes(day)) {
      throw new AppError('Invalid day. Must be one of: ' + validDays.join(', '), 400, 'INVALID_DAY');
    }

    const updatedPlan = await WorkoutService.markExerciseCompleted(userId, day, exercise_id, completed);

    const response: ApiResponse = {
      success: true,
      message: `Exercise ${completed ? 'completed' : 'marked as incomplete'}`,
      data: { plan: updatedPlan },
    };

    res.status(200).json(response);
  });

  /**
   * Get exercise recommendations
   */
  static getExerciseRecommendations = asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const userId = req.user!.userId;

    const recommendations = await WorkoutService.getExerciseRecommendations(userId);

    const response: ApiResponse = {
      success: true,
      message: 'Exercise recommendations retrieved successfully',
      data: { recommendations },
    };

    res.status(200).json(response);
  });

  /**
   * Adjust workout intensity based on progress
   */
  static adjustWorkoutIntensity = asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const userId = req.user!.userId;

    const adjustedPlans = await WorkoutService.adjustWorkoutIntensity(userId);

    const response: ApiResponse = {
      success: true,
      message: 'Workout intensity adjusted successfully',
      data: { plans: adjustedPlans },
    };

    res.status(200).json(response);
  });

  /**
   * Get workout plan for specific day
   */
  static getWorkoutByDay = asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const userId = req.user!.userId;
    const { day } = req.params;

    const validDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    if (!validDays.includes(day)) {
      throw new AppError('Invalid day. Must be one of: ' + validDays.join(', '), 400, 'INVALID_DAY');
    }

    const plan = await WorkoutMealPlanModel.findByUserAndDay(userId, day);
    if (!plan) {
      throw new AppError('No workout plan found for this day', 404, 'PLAN_NOT_FOUND');
    }

    // Extract only workout-related data
    const workoutData = {
      id: plan.id,
      day: plan.day,
      exercises: plan.exercises,
      completed_status: {
        exercises: plan.completed_status.exercises,
        date_completed: plan.completed_status.date_completed,
      },
      created_at: plan.created_at,
      updated_at: plan.updated_at,
    };

    const response: ApiResponse = {
      success: true,
      message: 'Workout plan retrieved successfully',
      data: { workout: workoutData },
    };

    res.status(200).json(response);
  });

  /**
   * Get all workout plans for user
   */
  static getAllWorkouts = asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const userId = req.user!.userId;

    const plans = await WorkoutMealPlanModel.findByUserId(userId);

    // Extract only workout-related data
    const workouts = plans.map(plan => ({
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

    const response: ApiResponse = {
      success: true,
      message: 'Workout plans retrieved successfully',
      data: { plans: workouts }, // Changed from 'workouts' to 'plans' to match frontend expectation
    };

    res.status(200).json(response);
  });

  /**
   * Update workout plan for specific day
   */
  static updateWorkoutPlan = asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const userId = req.user!.userId;
    const { day } = req.params;
    const { exercises } = req.body;

    const validDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    if (!validDays.includes(day)) {
      throw new AppError('Invalid day. Must be one of: ' + validDays.join(', '), 400, 'INVALID_DAY');
    }

    if (!exercises || !Array.isArray(exercises)) {
      throw new AppError('Exercises array is required', 400, 'INVALID_INPUT');
    }

    // Get existing plan to preserve meals
    const existingPlan = await WorkoutMealPlanModel.findByUserAndDay(userId, day);
    const meals = existingPlan ? existingPlan.meals : [];

    const updatedPlan = await WorkoutMealPlanModel.createOrUpdate(userId, {
      day: day as any,
      exercises,
      meals,
    });

    const response: ApiResponse = {
      success: true,
      message: 'Workout plan updated successfully',
      data: { plan: updatedPlan },
    };

    res.status(200).json(response);
  });

  /**
   * Delete workout plan for specific day
   */
  static deleteWorkoutPlan = asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const userId = req.user!.userId;
    const { day } = req.params;

    const validDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    if (!validDays.includes(day)) {
      throw new AppError('Invalid day. Must be one of: ' + validDays.join(', '), 400, 'INVALID_DAY');
    }

    const plan = await WorkoutMealPlanModel.findByUserAndDay(userId, day);
    if (!plan) {
      throw new AppError('No workout plan found for this day', 404, 'PLAN_NOT_FOUND');
    }

    await WorkoutMealPlanModel.delete(plan.id, userId);

    const response: ApiResponse = {
      success: true,
      message: 'Workout plan deleted successfully',
    };

    res.status(200).json(response);
  });

  /**
   * Get workout statistics (for analytics)
   */
  static getWorkoutStatistics = asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const userId = req.user!.userId;

    const progress = await WorkoutService.getWorkoutProgress(userId);
    const plans = await WorkoutMealPlanModel.findByUserId(userId);

    // Calculate additional statistics
    const muscleGroupStats: { [key: string]: number } = {};
    let totalDuration = 0;

    plans.forEach(plan => {
      plan.exercises.forEach(exercise => {
        const muscleGroup = exercise.muscle_group || 'other';
        muscleGroupStats[muscleGroup] = (muscleGroupStats[muscleGroup] || 0) + 1;
        if (exercise.duration) {
          totalDuration += exercise.duration;
        }
      });
    });

    const statistics = {
      ...progress,
      muscleGroupDistribution: muscleGroupStats,
      totalWorkoutDuration: totalDuration,
      averageWorkoutDuration: plans.length > 0 ? Math.round(totalDuration / plans.length) : 0,
      workoutFrequency: progress.completedDays,
    };

    const response: ApiResponse = {
      success: true,
      message: 'Workout statistics retrieved successfully',
      data: { statistics },
    };

    res.status(200).json(response);
  });

  /**
   * Reset workout progress (start fresh)
   */
  static resetWorkoutProgress = asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const userId = req.user!.userId;

    // Get all plans and reset their completion status
    const plans = await WorkoutMealPlanModel.findByUserId(userId);

    for (const plan of plans) {
      const resetStatus = {
        exercises: {},
        meals: plan.completed_status.meals, // Keep meal status
        date_completed: undefined,
      };

      await WorkoutMealPlanModel.updateCompletedStatus(userId, plan.day, {
        exercise_id: '', // This will be ignored
        completed: false,
      });
    }

    const response: ApiResponse = {
      success: true,
      message: 'Workout progress reset successfully',
    };

    res.status(200).json(response);
  });
}