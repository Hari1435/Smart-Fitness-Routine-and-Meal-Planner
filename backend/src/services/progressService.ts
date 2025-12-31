import { WorkoutMealPlanModel } from '../models/WorkoutMealPlan';
import { UserModel } from '../models/User';
import { WorkoutMealPlan, User } from '../types';
import { logger } from '../utils/logger';
import { AppError } from '../middleware/errorHandler';

export interface ProgressMetrics {
  workoutProgress: {
    totalWorkouts: number;
    completedWorkouts: number;
    completionRate: number;
    currentStreak: number;
    longestStreak: number;
    weeklyCompletion: { [day: string]: boolean };
  };
  exerciseProgress: {
    totalExercises: number;
    completedExercises: number;
    completionRate: number;
    muscleGroupProgress: { [group: string]: { completed: number; total: number } };
  };
  timeProgress: {
    totalWorkoutTime: number;
    averageWorkoutTime: number;
    workoutFrequency: number;
  };
  goalProgress: {
    goalType: string;
    progressTowardsGoal: number;
    estimatedTimeToGoal: number;
    recommendations: string[];
  };
}

export interface WeeklyReport {
  weekStartDate: string;
  weekEndDate: string;
  totalWorkouts: number;
  completedWorkouts: number;
  totalExercises: number;
  completedExercises: number;
  totalWorkoutTime: number;
  achievements: string[];
  improvements: string[];
  nextWeekGoals: string[];
}

export class ProgressService {
  /**
   * Get comprehensive progress metrics for a user
   */
  static async getProgressMetrics(userId: number): Promise<ProgressMetrics> {
    try {
      const user = await UserModel.findById(userId);
      if (!user) {
        throw new AppError('User not found', 404, 'USER_NOT_FOUND');
      }

      const plans = await WorkoutMealPlanModel.findByUserId(userId);
      
      const workoutProgress = this.calculateWorkoutProgress(plans);
      const exerciseProgress = this.calculateExerciseProgress(plans);
      const timeProgress = this.calculateTimeProgress(plans);
      const goalProgress = this.calculateGoalProgress(user, plans);

      return {
        workoutProgress,
        exerciseProgress,
        timeProgress,
        goalProgress,
      };
    } catch (error) {
      logger.error('Error getting progress metrics:', error);
      throw error;
    }
  }

  /**
   * Generate weekly progress report
   */
  static async generateWeeklyReport(userId: number): Promise<WeeklyReport> {
    try {
      const user = await UserModel.findById(userId);
      if (!user) {
        throw new AppError('User not found', 404, 'USER_NOT_FOUND');
      }

      const plans = await WorkoutMealPlanModel.findByUserId(userId);
      const metrics = await this.getProgressMetrics(userId);

      const weekStartDate = this.getWeekStartDate();
      const weekEndDate = this.getWeekEndDate();

      const achievements = this.generateAchievements(metrics);
      const improvements = this.generateImprovements(metrics);
      const nextWeekGoals = this.generateNextWeekGoals(user, metrics);

      return {
        weekStartDate: weekStartDate.toISOString().split('T')[0],
        weekEndDate: weekEndDate.toISOString().split('T')[0],
        totalWorkouts: metrics.workoutProgress.totalWorkouts,
        completedWorkouts: metrics.workoutProgress.completedWorkouts,
        totalExercises: metrics.exerciseProgress.totalExercises,
        completedExercises: metrics.exerciseProgress.completedExercises,
        totalWorkoutTime: metrics.timeProgress.totalWorkoutTime,
        achievements,
        improvements,
        nextWeekGoals,
      };
    } catch (error) {
      logger.error('Error generating weekly report:', error);
      throw error;
    }
  }

  /**
   * Track exercise completion over time
   */
  static async trackExerciseCompletion(
    userId: number,
    exerciseId: string,
    day: string,
    completionTime: Date
  ): Promise<void> {
    try {
      // This would typically store detailed completion data
      // For now, we'll just log it
      logger.info(`Exercise completion tracked: User ${userId}, Exercise ${exerciseId}, Day ${day}, Time ${completionTime}`);
      
      // In a real implementation, you might store this in a separate tracking table
      // or add more detailed timestamps to the existing structure
    } catch (error) {
      logger.error('Error tracking exercise completion:', error);
      throw error;
    }
  }

  /**
   * Get progress comparison between time periods
   */
  static async getProgressComparison(
    userId: number,
    startDate: Date,
    endDate: Date
  ): Promise<{
    currentPeriod: ProgressMetrics;
    previousPeriod: ProgressMetrics;
    improvement: { [key: string]: number };
  }> {
    try {
      // This is a simplified version - in a real app, you'd filter by date ranges
      const currentMetrics = await this.getProgressMetrics(userId);
      
      // For demo purposes, create a "previous period" with slightly lower values
      const previousMetrics: ProgressMetrics = {
        ...currentMetrics,
        workoutProgress: {
          ...currentMetrics.workoutProgress,
          completionRate: Math.max(0, currentMetrics.workoutProgress.completionRate - 10),
          currentStreak: Math.max(0, currentMetrics.workoutProgress.currentStreak - 1),
        },
        exerciseProgress: {
          ...currentMetrics.exerciseProgress,
          completionRate: Math.max(0, currentMetrics.exerciseProgress.completionRate - 15),
        },
      };

      const improvement = {
        workoutCompletionRate: currentMetrics.workoutProgress.completionRate - previousMetrics.workoutProgress.completionRate,
        exerciseCompletionRate: currentMetrics.exerciseProgress.completionRate - previousMetrics.exerciseProgress.completionRate,
        streakImprovement: currentMetrics.workoutProgress.currentStreak - previousMetrics.workoutProgress.currentStreak,
      };

      return {
        currentPeriod: currentMetrics,
        previousPeriod: previousMetrics,
        improvement,
      };
    } catch (error) {
      logger.error('Error getting progress comparison:', error);
      throw error;
    }
  }

  /**
   * Calculate workout progress metrics
   */
  private static calculateWorkoutProgress(plans: WorkoutMealPlan[]): ProgressMetrics['workoutProgress'] {
    const totalWorkouts = plans.length;
    let completedWorkouts = 0;
    const weeklyCompletion: { [day: string]: boolean } = {};

    plans.forEach(plan => {
      const isCompleted = plan.exercises.every(ex => plan.completed_status.exercises[ex.id]);
      if (isCompleted) {
        completedWorkouts++;
      }
      weeklyCompletion[plan.day] = isCompleted;
    });

    const completionRate = totalWorkouts > 0 ? Math.round((completedWorkouts / totalWorkouts) * 100) : 0;
    const { currentStreak, longestStreak } = this.calculateStreaks(weeklyCompletion);

    return {
      totalWorkouts,
      completedWorkouts,
      completionRate,
      currentStreak,
      longestStreak,
      weeklyCompletion,
    };
  }

  /**
   * Calculate exercise progress metrics
   */
  private static calculateExerciseProgress(plans: WorkoutMealPlan[]): ProgressMetrics['exerciseProgress'] {
    let totalExercises = 0;
    let completedExercises = 0;
    const muscleGroupProgress: { [group: string]: { completed: number; total: number } } = {};

    plans.forEach(plan => {
      plan.exercises.forEach(exercise => {
        totalExercises++;
        
        const group = exercise.muscle_group || 'other';
        if (!muscleGroupProgress[group]) {
          muscleGroupProgress[group] = { completed: 0, total: 0 };
        }
        muscleGroupProgress[group].total++;

        if (plan.completed_status.exercises[exercise.id]) {
          completedExercises++;
          muscleGroupProgress[group].completed++;
        }
      });
    });

    const completionRate = totalExercises > 0 ? Math.round((completedExercises / totalExercises) * 100) : 0;

    return {
      totalExercises,
      completedExercises,
      completionRate,
      muscleGroupProgress,
    };
  }

  /**
   * Calculate time-based progress metrics
   */
  private static calculateTimeProgress(plans: WorkoutMealPlan[]): ProgressMetrics['timeProgress'] {
    let totalWorkoutTime = 0;
    let workoutCount = 0;

    plans.forEach(plan => {
      let planTime = 0;
      plan.exercises.forEach(exercise => {
        if (exercise.duration) {
          planTime += exercise.duration;
        } else {
          // Estimate time based on sets and reps (assuming 2 seconds per rep + 30 seconds rest per set)
          planTime += (exercise.sets * exercise.reps * 2) + (exercise.sets * 30);
        }
      });
      
      if (planTime > 0) {
        totalWorkoutTime += planTime;
        workoutCount++;
      }
    });

    const averageWorkoutTime = workoutCount > 0 ? Math.round(totalWorkoutTime / workoutCount) : 0;
    const workoutFrequency = plans.filter(plan => 
      plan.exercises.some(ex => plan.completed_status.exercises[ex.id])
    ).length;

    return {
      totalWorkoutTime,
      averageWorkoutTime,
      workoutFrequency,
    };
  }

  /**
   * Calculate goal-specific progress
   */
  private static calculateGoalProgress(user: User, plans: WorkoutMealPlan[]): ProgressMetrics['goalProgress'] {
    const goalType = user.goal || 'maintenance';
    
    // Calculate progress based on completion rates and consistency
    const workoutProgress = this.calculateWorkoutProgress(plans);
    const exerciseProgress = this.calculateExerciseProgress(plans);
    
    let progressTowardsGoal = 0;
    let estimatedTimeToGoal = 0;
    const recommendations: string[] = [];

    switch (goalType) {
      case 'weight_loss':
        progressTowardsGoal = Math.min(100, (workoutProgress.completionRate + exerciseProgress.completionRate) / 2);
        estimatedTimeToGoal = progressTowardsGoal > 0 ? Math.max(1, 12 - (progressTowardsGoal / 10)) : 12;
        
        if (workoutProgress.completionRate < 70) {
          recommendations.push('Increase cardio workout frequency');
        }
        if (exerciseProgress.completionRate < 60) {
          recommendations.push('Focus on completing high-intensity exercises');
        }
        break;

      case 'muscle_gain':
        progressTowardsGoal = Math.min(100, exerciseProgress.completionRate);
        estimatedTimeToGoal = progressTowardsGoal > 0 ? Math.max(2, 16 - (progressTowardsGoal / 8)) : 16;
        
        if (workoutProgress.currentStreak < 3) {
          recommendations.push('Maintain consistent workout schedule');
        }
        if (exerciseProgress.muscleGroupProgress['chest']?.completed < exerciseProgress.muscleGroupProgress['chest']?.total * 0.7) {
          recommendations.push('Focus on strength training exercises');
        }
        break;

      case 'maintenance':
        progressTowardsGoal = Math.min(100, workoutProgress.completionRate);
        estimatedTimeToGoal = 0; // Maintenance is ongoing
        
        if (workoutProgress.completionRate < 50) {
          recommendations.push('Maintain regular exercise routine');
        }
        recommendations.push('Continue balanced approach to fitness');
        break;
    }

    return {
      goalType,
      progressTowardsGoal: Math.round(progressTowardsGoal),
      estimatedTimeToGoal: Math.round(estimatedTimeToGoal),
      recommendations,
    };
  }

  /**
   * Calculate current and longest streaks
   */
  private static calculateStreaks(weeklyCompletion: { [day: string]: boolean }): { currentStreak: number; longestStreak: number } {
    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    const completedDays = days.map(day => weeklyCompletion[day] || false);

    let currentStreak = 0;
    let longestStreak = 0;
    let tempStreak = 0;

    // Calculate from the end (most recent days)
    for (let i = completedDays.length - 1; i >= 0; i--) {
      if (completedDays[i]) {
        tempStreak++;
        if (i === completedDays.length - 1 || currentStreak === 0) {
          currentStreak = tempStreak;
        }
      } else {
        if (tempStreak > longestStreak) {
          longestStreak = tempStreak;
        }
        tempStreak = 0;
      }
    }

    if (tempStreak > longestStreak) {
      longestStreak = tempStreak;
    }

    return { currentStreak, longestStreak };
  }

  /**
   * Generate achievements based on metrics
   */
  private static generateAchievements(metrics: ProgressMetrics): string[] {
    const achievements: string[] = [];

    if (metrics.workoutProgress.completionRate >= 100) {
      achievements.push('Perfect Week! Completed all workouts');
    } else if (metrics.workoutProgress.completionRate >= 80) {
      achievements.push('Excellent Progress! Completed most workouts');
    }

    if (metrics.workoutProgress.currentStreak >= 5) {
      achievements.push(`Amazing Streak! ${metrics.workoutProgress.currentStreak} days in a row`);
    }

    if (metrics.exerciseProgress.completionRate >= 90) {
      achievements.push('Exercise Master! Completed almost all exercises');
    }

    if (achievements.length === 0) {
      achievements.push('Keep going! Every step counts towards your goal');
    }

    return achievements;
  }

  /**
   * Generate improvement suggestions
   */
  private static generateImprovements(metrics: ProgressMetrics): string[] {
    const improvements: string[] = [];

    if (metrics.workoutProgress.completionRate < 50) {
      improvements.push('Try to complete at least 4 workouts per week');
    }

    if (metrics.exerciseProgress.completionRate < 60) {
      improvements.push('Focus on completing individual exercises within workouts');
    }

    if (metrics.workoutProgress.currentStreak < 2) {
      improvements.push('Aim for consecutive workout days to build momentum');
    }

    // Check muscle group balance
    const muscleGroups = Object.keys(metrics.exerciseProgress.muscleGroupProgress);
    const imbalancedGroups = muscleGroups.filter(group => {
      const progress = metrics.exerciseProgress.muscleGroupProgress[group];
      return progress.total > 0 && (progress.completed / progress.total) < 0.5;
    });

    if (imbalancedGroups.length > 0) {
      improvements.push(`Focus more on: ${imbalancedGroups.join(', ')} exercises`);
    }

    return improvements;
  }

  /**
   * Generate next week goals
   */
  private static generateNextWeekGoals(user: User, metrics: ProgressMetrics): string[] {
    const goals: string[] = [];

    // Base goals on current performance
    const currentRate = metrics.workoutProgress.completionRate;
    const targetRate = Math.min(100, currentRate + 20);

    goals.push(`Achieve ${targetRate}% workout completion rate`);

    if (metrics.workoutProgress.currentStreak < 3) {
      goals.push('Build a 3-day workout streak');
    } else {
      goals.push(`Extend current streak to ${metrics.workoutProgress.currentStreak + 2} days`);
    }

    // Goal-specific targets
    switch (user.goal) {
      case 'weight_loss':
        goals.push('Complete all cardio exercises');
        goals.push('Maintain consistent daily activity');
        break;
      case 'muscle_gain':
        goals.push('Focus on strength training consistency');
        goals.push('Complete all resistance exercises');
        break;
      case 'maintenance':
        goals.push('Maintain balanced workout routine');
        goals.push('Include flexibility exercises');
        break;
    }

    return goals;
  }

  /**
   * Get week start date (Monday)
   */
  private static getWeekStartDate(): Date {
    const today = new Date();
    const day = today.getDay();
    const diff = today.getDate() - day + (day === 0 ? -6 : 1); // Adjust when day is Sunday
    return new Date(today.setDate(diff));
  }

  /**
   * Get week end date (Sunday)
   */
  private static getWeekEndDate(): Date {
    const weekStart = this.getWeekStartDate();
    return new Date(weekStart.getTime() + 6 * 24 * 60 * 60 * 1000);
  }
}