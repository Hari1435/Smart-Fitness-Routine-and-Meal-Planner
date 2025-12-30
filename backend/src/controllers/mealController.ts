import { Request, Response } from 'express';
import { MealService } from '../services/mealService';
import { WorkoutMealPlanModel } from '../models/WorkoutMealPlan';
import { logger } from '../utils/logger';
import { asyncHandler, AppError } from '../middleware/errorHandler';
import { ApiResponse, AuthenticatedRequest } from '../types';

export class MealController {
  /**
   * Generate personalized meal plan for user
   */
  static generatePersonalizedMealPlan = asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const userId = req.user!.userId;

    const mealPlans = await MealService.generatePersonalizedMealPlan(userId);

    const response: ApiResponse = {
      success: true,
      message: 'Personalized meal plan generated successfully',
      data: { plans: mealPlans },
    };

    res.status(200).json(response);
  });

  /**
   * Get meal progress analytics
   */
  static getMealProgress = asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const userId = req.user!.userId;

    const progress = await MealService.getMealProgress(userId);

    const response: ApiResponse = {
      success: true,
      message: 'Meal progress retrieved successfully',
      data: { progress },
    };

    res.status(200).json(response);
  });

  /**
   * Mark meal as consumed
   */
  static markMealConsumed = asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const userId = req.user!.userId;
    const { day } = req.params;
    const { meal_id, consumed } = req.body;

    if (!meal_id || typeof consumed !== 'boolean') {
      throw new AppError('Meal ID and consumed status are required', 400, 'INVALID_INPUT');
    }

    const validDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    if (!validDays.includes(day)) {
      throw new AppError('Invalid day. Must be one of: ' + validDays.join(', '), 400, 'INVALID_DAY');
    }

    const updatedPlan = await MealService.markMealConsumed(userId, day, meal_id, consumed);

    const response: ApiResponse = {
      success: true,
      message: `Meal ${consumed ? 'marked as consumed' : 'marked as not consumed'}`,
      data: { plan: updatedPlan },
    };

    res.status(200).json(response);
  });

  /**
   * Get all meal plans for user
   */
  static getAllMealPlans = asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const userId = req.user!.userId;

    const plans = await WorkoutMealPlanModel.findByUserId(userId);

    // Extract only meal-related data
    const mealPlans = plans.map(plan => ({
      id: plan.id,
      day: plan.day,
      meals: plan.meals,
      completed_status: {
        meals: plan.completed_status.meals,
        date_completed: plan.completed_status.date_completed,
      },
      created_at: plan.created_at,
      updated_at: plan.updated_at,
    }));

    const response: ApiResponse = {
      success: true,
      message: 'Meal plans retrieved successfully',
      data: { plans: mealPlans },
    };

    res.status(200).json(response);
  });

  /**
   * Get meal plan for specific day
   */
  static getMealPlanByDay = asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const userId = req.user!.userId;
    const { day } = req.params;

    const validDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    if (!validDays.includes(day)) {
      throw new AppError('Invalid day. Must be one of: ' + validDays.join(', '), 400, 'INVALID_DAY');
    }

    const plan = await WorkoutMealPlanModel.findByUserAndDay(userId, day);
    if (!plan) {
      throw new AppError('No meal plan found for this day', 404, 'PLAN_NOT_FOUND');
    }

    // Extract only meal-related data
    const mealData = {
      id: plan.id,
      day: plan.day,
      meals: plan.meals,
      completed_status: {
        meals: plan.completed_status.meals,
        date_completed: plan.completed_status.date_completed,
      },
      created_at: plan.created_at,
      updated_at: plan.updated_at,
    };

    const response: ApiResponse = {
      success: true,
      message: 'Meal plan retrieved successfully',
      data: { mealPlan: mealData },
    };

    res.status(200).json(response);
  });

  /**
   * Update meal for specific day
   */
  static updateMeal = asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const userId = req.user!.userId;
    const { day, mealId } = req.params;
    const mealData = req.body;

    const validDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    if (!validDays.includes(day)) {
      throw new AppError('Invalid day. Must be one of: ' + validDays.join(', '), 400, 'INVALID_DAY');
    }

    if (!mealData.name || !mealData.type || typeof mealData.calories !== 'number') {
      throw new AppError('Meal name, type, and calories are required', 400, 'INVALID_INPUT');
    }

    const updatedPlan = await MealService.updateMeal(userId, day, mealId, mealData);

    const response: ApiResponse = {
      success: true,
      message: 'Meal updated successfully',
      data: { plan: updatedPlan },
    };

    res.status(200).json(response);
  });

  /**
   * Add new meal to specific day
   */
  static addMeal = asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const userId = req.user!.userId;
    const { day } = req.params;
    const mealData = req.body;

    const validDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    if (!validDays.includes(day)) {
      throw new AppError('Invalid day. Must be one of: ' + validDays.join(', '), 400, 'INVALID_DAY');
    }

    if (!mealData.name || !mealData.type || typeof mealData.calories !== 'number') {
      throw new AppError('Meal name, type, and calories are required', 400, 'INVALID_INPUT');
    }

    const validTypes = ['breakfast', 'lunch', 'dinner', 'snack'];
    if (!validTypes.includes(mealData.type)) {
      throw new AppError('Invalid meal type. Must be one of: ' + validTypes.join(', '), 400, 'INVALID_MEAL_TYPE');
    }

    const updatedPlan = await MealService.addMeal(userId, day, mealData);

    const response: ApiResponse = {
      success: true,
      message: 'Meal added successfully',
      data: { plan: updatedPlan },
    };

    res.status(201).json(response);
  });

  /**
   * Delete meal from specific day
   */
  static deleteMeal = asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const userId = req.user!.userId;
    const { day, mealId } = req.params;

    const validDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    if (!validDays.includes(day)) {
      throw new AppError('Invalid day. Must be one of: ' + validDays.join(', '), 400, 'INVALID_DAY');
    }

    const updatedPlan = await MealService.deleteMeal(userId, day, mealId);

    const response: ApiResponse = {
      success: true,
      message: 'Meal deleted successfully',
      data: { plan: updatedPlan },
    };

    res.status(200).json(response);
  });

  /**
   * Get nutrition goals for user
   */
  static getNutritionGoals = asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const userId = req.user!.userId;

    const nutritionGoals = await MealService.getNutritionGoals(userId);

    const response: ApiResponse = {
      success: true,
      message: 'Nutrition goals retrieved successfully',
      data: { nutritionGoals },
    };

    res.status(200).json(response);
  });

  /**
   * Get meal statistics (for analytics)
   */
  static getMealStatistics = asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const userId = req.user!.userId;

    const progress = await MealService.getMealProgress(userId);
    const nutritionGoals = await MealService.getNutritionGoals(userId);

    // Calculate additional statistics
    const calorieDeficit = nutritionGoals.calories - progress.consumedCalories;
    const proteinDeficit = nutritionGoals.protein - progress.nutritionBreakdown.protein.consumed;
    const carbsDeficit = nutritionGoals.carbs - progress.nutritionBreakdown.carbs.consumed;
    const fatDeficit = nutritionGoals.fat - progress.nutritionBreakdown.fat.consumed;

    const statistics = {
      ...progress,
      nutritionGoals,
      deficits: {
        calories: calorieDeficit,
        protein: proteinDeficit,
        carbs: carbsDeficit,
        fat: fatDeficit,
      },
      adherenceScore: Math.round((progress.consumptionPercentage + 
        (progress.nutritionBreakdown.protein.consumed / nutritionGoals.protein * 100) +
        (progress.nutritionBreakdown.carbs.consumed / nutritionGoals.carbs * 100) +
        (progress.nutritionBreakdown.fat.consumed / nutritionGoals.fat * 100)) / 4),
    };

    const response: ApiResponse = {
      success: true,
      message: 'Meal statistics retrieved successfully',
      data: { statistics },
    };

    res.status(200).json(response);
  });

  /**
   * Get meal recommendations based on remaining calories/macros
   */
  static getMealRecommendations = asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const userId = req.user!.userId;
    const { day } = req.params;

    const validDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    if (!validDays.includes(day)) {
      throw new AppError('Invalid day. Must be one of: ' + validDays.join(', '), 400, 'INVALID_DAY');
    }

    const progress = await MealService.getMealProgress(userId);
    const nutritionGoals = await MealService.getNutritionGoals(userId);
    const dayStats = progress.dailyStats[day];

    if (!dayStats) {
      throw new AppError('No meal data found for this day', 404, 'NO_DATA');
    }

    // Calculate remaining macros for the day
    const remainingCalories = nutritionGoals.calories - dayStats.consumedCalories;
    const remainingProtein = nutritionGoals.protein - progress.nutritionBreakdown.protein.consumed;
    const remainingCarbs = nutritionGoals.carbs - progress.nutritionBreakdown.carbs.consumed;
    const remainingFat = nutritionGoals.fat - progress.nutritionBreakdown.fat.consumed;

    // Generate simple recommendations
    const recommendations = [];

    if (remainingCalories > 100) {
      if (remainingProtein > 10) {
        recommendations.push({
          type: 'snack',
          name: 'Protein Snack',
          calories: Math.min(remainingCalories, 200),
          protein: Math.min(remainingProtein, 20),
          suggestion: 'Greek yogurt with nuts or protein shake',
        });
      }
      
      if (remainingCarbs > 15) {
        recommendations.push({
          type: 'snack',
          name: 'Energy Snack',
          calories: Math.min(remainingCalories, 150),
          carbs: Math.min(remainingCarbs, 30),
          suggestion: 'Banana with peanut butter or oatmeal',
        });
      }
    }

    const response: ApiResponse = {
      success: true,
      message: 'Meal recommendations retrieved successfully',
      data: { 
        recommendations,
        remaining: {
          calories: remainingCalories,
          protein: remainingProtein,
          carbs: remainingCarbs,
          fat: remainingFat,
        },
      },
    };

    res.status(200).json(response);
  });
}