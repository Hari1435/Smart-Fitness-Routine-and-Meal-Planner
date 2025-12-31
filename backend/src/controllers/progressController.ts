import { Request, Response } from 'express';
import { ProgressService } from '../services/progressService';
import { logger } from '../utils/logger';
import { asyncHandler, AppError } from '../middleware/errorHandler';
import { ApiResponse, AuthenticatedRequest } from '../types';

export class ProgressController {
  /**
   * Get comprehensive progress metrics
   */
  static getProgressMetrics = asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const userId = req.user!.userId;

    const metrics = await ProgressService.getProgressMetrics(userId);

    const response: ApiResponse = {
      success: true,
      message: 'Progress metrics retrieved successfully',
      data: { metrics },
    };

    res.status(200).json(response);
  });

  /**
   * Generate weekly progress report
   */
  static generateWeeklyReport = asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const userId = req.user!.userId;

    const report = await ProgressService.generateWeeklyReport(userId);

    const response: ApiResponse = {
      success: true,
      message: 'Weekly report generated successfully',
      data: { report },
    };

    res.status(200).json(response);
  });

  /**
   * Get progress comparison between periods
   */
  static getProgressComparison = asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const userId = req.user!.userId;
    const { start_date, end_date } = req.query;

    let startDate = new Date();
    let endDate = new Date();

    if (start_date && typeof start_date === 'string') {
      startDate = new Date(start_date);
      if (isNaN(startDate.getTime())) {
        throw new AppError('Invalid start date format', 400, 'INVALID_DATE');
      }
    }

    if (end_date && typeof end_date === 'string') {
      endDate = new Date(end_date);
      if (isNaN(endDate.getTime())) {
        throw new AppError('Invalid end date format', 400, 'INVALID_DATE');
      }
    }

    const comparison = await ProgressService.getProgressComparison(userId, startDate, endDate);

    const response: ApiResponse = {
      success: true,
      message: 'Progress comparison retrieved successfully',
      data: { comparison },
    };

    res.status(200).json(response);
  });

  /**
   * Track exercise completion
   */
  static trackExerciseCompletion = asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const userId = req.user!.userId;
    const { exercise_id, day, completion_time } = req.body;

    if (!exercise_id || !day) {
      throw new AppError('Exercise ID and day are required', 400, 'INVALID_INPUT');
    }

    const completionTime = completion_time ? new Date(completion_time) : new Date();

    await ProgressService.trackExerciseCompletion(userId, exercise_id, day, completionTime);

    const response: ApiResponse = {
      success: true,
      message: 'Exercise completion tracked successfully',
    };

    res.status(200).json(response);
  });

  /**
   * Get progress dashboard data
   */
  static getProgressDashboard = asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const userId = req.user!.userId;

    // Get both metrics and weekly report for dashboard
    const [metrics, report] = await Promise.all([
      ProgressService.getProgressMetrics(userId),
      ProgressService.generateWeeklyReport(userId),
    ]);

    // Create dashboard summary
    const dashboard = {
      overview: {
        completionRate: metrics.workoutProgress.completionRate,
        currentStreak: metrics.workoutProgress.currentStreak,
        totalExercises: metrics.exerciseProgress.totalExercises,
        completedExercises: metrics.exerciseProgress.completedExercises,
      },
      weeklyStats: {
        completedWorkouts: report.completedWorkouts,
        totalWorkouts: report.totalWorkouts,
        totalWorkoutTime: report.totalWorkoutTime,
        achievements: report.achievements,
      },
      goalProgress: metrics.goalProgress,
      muscleGroupProgress: metrics.exerciseProgress.muscleGroupProgress,
      recommendations: metrics.goalProgress.recommendations,
      nextWeekGoals: report.nextWeekGoals,
    };

    const response: ApiResponse = {
      success: true,
      message: 'Progress dashboard data retrieved successfully',
      data: { dashboard },
    };

    res.status(200).json(response);
  });

  /**
   * Get workout streak information
   */
  static getWorkoutStreak = asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const userId = req.user!.userId;

    const metrics = await ProgressService.getProgressMetrics(userId);

    const streakInfo = {
      currentStreak: metrics.workoutProgress.currentStreak,
      longestStreak: metrics.workoutProgress.longestStreak,
      weeklyCompletion: metrics.workoutProgress.weeklyCompletion,
      streakGoal: Math.max(7, metrics.workoutProgress.longestStreak + 1),
      daysUntilGoal: Math.max(0, 7 - metrics.workoutProgress.currentStreak),
    };

    const response: ApiResponse = {
      success: true,
      message: 'Workout streak information retrieved successfully',
      data: { streak: streakInfo },
    };

    res.status(200).json(response);
  });

  /**
   * Get muscle group progress breakdown
   */
  static getMuscleGroupProgress = asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const userId = req.user!.userId;

    const metrics = await ProgressService.getProgressMetrics(userId);

    // Calculate percentages for each muscle group
    const muscleGroupBreakdown = Object.entries(metrics.exerciseProgress.muscleGroupProgress).map(([group, progress]) => ({
      muscleGroup: group,
      completed: progress.completed,
      total: progress.total,
      percentage: progress.total > 0 ? Math.round((progress.completed / progress.total) * 100) : 0,
      status: progress.total > 0 ? 
        (progress.completed / progress.total >= 0.8 ? 'excellent' :
         progress.completed / progress.total >= 0.6 ? 'good' :
         progress.completed / progress.total >= 0.4 ? 'fair' : 'needs_improvement') : 'no_data'
    }));

    const response: ApiResponse = {
      success: true,
      message: 'Muscle group progress retrieved successfully',
      data: { muscleGroups: muscleGroupBreakdown },
    };

    res.status(200).json(response);
  });

  /**
   * Get time-based analytics
   */
  static getTimeAnalytics = asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const userId = req.user!.userId;

    const metrics = await ProgressService.getProgressMetrics(userId);

    const timeAnalytics = {
      totalWorkoutTime: metrics.timeProgress.totalWorkoutTime,
      averageWorkoutTime: metrics.timeProgress.averageWorkoutTime,
      workoutFrequency: metrics.timeProgress.workoutFrequency,
      timePerDay: metrics.timeProgress.totalWorkoutTime / 7, // Average per day
      efficiency: metrics.exerciseProgress.completionRate / 100, // Completion rate as efficiency
      recommendations: this.generateTimeRecommendations(metrics.timeProgress),
    };

    const response: ApiResponse = {
      success: true,
      message: 'Time analytics retrieved successfully',
      data: { analytics: timeAnalytics },
    };

    res.status(200).json(response);
  });

  /**
   * Generate time-based recommendations
   */
  private static generateTimeRecommendations(timeProgress: any): string[] {
    const recommendations: string[] = [];

    if (timeProgress.averageWorkoutTime < 1800) { // Less than 30 minutes
      recommendations.push('Consider extending workout duration for better results');
    } else if (timeProgress.averageWorkoutTime > 5400) { // More than 90 minutes
      recommendations.push('Consider shorter, more focused workout sessions');
    }

    if (timeProgress.workoutFrequency < 3) {
      recommendations.push('Aim for at least 3-4 workout sessions per week');
    } else if (timeProgress.workoutFrequency > 6) {
      recommendations.push('Great consistency! Consider adding rest days for recovery');
    }

    if (recommendations.length === 0) {
      recommendations.push('Your workout timing and frequency look great!');
    }

    return recommendations;
  }
}