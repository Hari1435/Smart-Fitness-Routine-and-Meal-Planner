import { Request, Response } from 'express';
import { USDAFoodService } from '../services/usdaFoodService';
import { logger } from '../utils/logger';
import { asyncHandler, AppError } from '../middleware/errorHandler';
import { ApiResponse, AuthenticatedRequest } from '../types';

export class FoodController {
  /**
   * Search for foods using USDA database
   */
  static searchFoods = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { query, pageSize = 25, pageNumber = 1, dataType } = req.query;

    if (!query || typeof query !== 'string') {
      throw new AppError('Search query is required', 400, 'INVALID_QUERY');
    }

    const dataTypes = dataType ? (Array.isArray(dataType) ? dataType as string[] : [dataType as string]) : undefined;

    const searchResult = await USDAFoodService.searchFoods(
      query,
      parseInt(pageSize as string) || 25,
      parseInt(pageNumber as string) || 1,
      dataTypes
    );

    const response: ApiResponse = {
      success: true,
      message: 'Food search completed successfully',
      data: {
        searchResult,
        query,
        pagination: {
          currentPage: searchResult.currentPage,
          totalPages: searchResult.totalPages,
          totalHits: searchResult.totalHits,
          pageSize: parseInt(pageSize as string) || 25
        }
      },
    };

    res.status(200).json(response);
  });

  /**
   * Get detailed food information by FDC ID
   */
  static getFoodById = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { fdcId } = req.params;
    const { nutrients } = req.query;

    if (!fdcId || isNaN(parseInt(fdcId))) {
      throw new AppError('Valid FDC ID is required', 400, 'INVALID_FDC_ID');
    }

    const nutrientIds = nutrients ? 
      (Array.isArray(nutrients) ? nutrients.map(n => parseInt(n as string)) : [parseInt(nutrients as string)]) 
      : undefined;

    const food = await USDAFoodService.getFoodById(parseInt(fdcId), nutrientIds);

    const response: ApiResponse = {
      success: true,
      message: 'Food details retrieved successfully',
      data: { food },
    };

    res.status(200).json(response);
  });

  /**
   * Get multiple foods by FDC IDs
   */
  static getFoodsByIds = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { fdcIds, nutrients } = req.body;

    if (!fdcIds || !Array.isArray(fdcIds) || fdcIds.length === 0) {
      throw new AppError('Array of FDC IDs is required', 400, 'INVALID_FDC_IDS');
    }

    const validIds = fdcIds.filter(id => !isNaN(parseInt(id))).map(id => parseInt(id));
    
    if (validIds.length === 0) {
      throw new AppError('No valid FDC IDs provided', 400, 'NO_VALID_IDS');
    }

    const nutrientIds = nutrients && Array.isArray(nutrients) ? 
      nutrients.filter(n => !isNaN(parseInt(n))).map(n => parseInt(n)) : undefined;

    const foods = await USDAFoodService.getFoodsByIds(validIds, nutrientIds);

    const response: ApiResponse = {
      success: true,
      message: 'Foods retrieved successfully',
      data: { foods, requestedCount: validIds.length, returnedCount: foods.length },
    };

    res.status(200).json(response);
  });

  /**
   * Extract nutrition data from USDA food
   */
  static getNutritionData = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { fdcId } = req.params;
    const { servingSize = 100 } = req.query;

    if (!fdcId || isNaN(parseInt(fdcId))) {
      throw new AppError('Valid FDC ID is required', 400, 'INVALID_FDC_ID');
    }

    const serving = parseFloat(servingSize as string) || 100;
    
    if (serving <= 0 || serving > 10000) {
      throw new AppError('Serving size must be between 0 and 10000 grams', 400, 'INVALID_SERVING_SIZE');
    }

    const food = await USDAFoodService.getFoodById(parseInt(fdcId));
    const nutritionData = USDAFoodService.extractNutritionData(food, serving);

    const response: ApiResponse = {
      success: true,
      message: 'Nutrition data extracted successfully',
      data: {
        nutritionData,
        foodInfo: {
          fdcId: food.fdcId,
          description: food.description,
          servingSize: serving,
          servingSizeUnit: 'g'
        }
      },
    };

    res.status(200).json(response);
  });

  /**
   * Search for Indian/South Asian foods
   */
  static searchIndianFoods = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { query, pageSize = 25 } = req.query;

    if (!query || typeof query !== 'string') {
      throw new AppError('Search query is required', 400, 'INVALID_QUERY');
    }

    const searchResult = await USDAFoodService.searchIndianFoods(
      query,
      parseInt(pageSize as string) || 25
    );

    const response: ApiResponse = {
      success: true,
      message: 'Indian food search completed successfully',
      data: {
        searchResult,
        query,
        enhancedForIndianCuisine: true
      },
    };

    res.status(200).json(response);
  });

  /**
   * Get nutrition recommendations based on current intake and goals
   */
  static getNutritionRecommendations = asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const { currentNutrition, goal, targetCalories } = req.body;

    if (!currentNutrition || !goal || !targetCalories) {
      throw new AppError('Current nutrition data, goal, and target calories are required', 400, 'MISSING_DATA');
    }

    if (!['weight_loss', 'muscle_gain', 'maintenance'].includes(goal)) {
      throw new AppError('Goal must be weight_loss, muscle_gain, or maintenance', 400, 'INVALID_GOAL');
    }

    const recommendations = USDAFoodService.getNutritionRecommendations(
      goal,
      currentNutrition,
      targetCalories
    );

    // Get food suggestions for missing nutrients
    const foodSuggestions = await USDAFoodService.suggestFoodAlternatives(
      recommendations.missingNutrients
    );

    const response: ApiResponse = {
      success: true,
      message: 'Nutrition recommendations generated successfully',
      data: {
        recommendations: recommendations.recommendations,
        missingNutrients: recommendations.missingNutrients,
        excessNutrients: recommendations.excessNutrients,
        foodSuggestions,
        goal,
        targetCalories
      },
    };

    res.status(200).json(response);
  });

  /**
   * Validate USDA API configuration
   */
  static validateApiKey = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const isValid = await USDAFoodService.validateApiKey();

    const response: ApiResponse = {
      success: isValid,
      message: isValid ? 'USDA API key is valid and working' : 'USDA API key is invalid or not configured',
      data: {
        apiKeyValid: isValid,
        apiConfigured: !!process.env.USDA_API_KEY
      },
    };

    res.status(isValid ? 200 : 400).json(response);
  });

  /**
   * Get popular Indian foods for quick access
   */
  static getPopularIndianFoods = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const popularFoods = [
      'basmati rice', 'dal lentils', 'chicken curry', 'paneer', 'roti chapati',
      'biryani', 'samosa', 'tandoori chicken', 'naan bread', 'ghee',
      'turmeric', 'cumin seeds', 'coriander', 'garam masala', 'coconut oil'
    ];

    const foodResults: any[] = [];

    // Search for a few popular foods (limit to avoid API rate limits)
    for (const foodQuery of popularFoods.slice(0, 5)) {
      try {
        const searchResult = await USDAFoodService.searchFoods(foodQuery, 3);
        if (searchResult.foods.length > 0) {
          foodResults.push({
            query: foodQuery,
            foods: searchResult.foods.slice(0, 2) // Top 2 results per food
          });
        }
      } catch (error) {
        logger.warn(`Failed to search for popular food ${foodQuery}:`, error);
      }
    }

    const response: ApiResponse = {
      success: true,
      message: 'Popular Indian foods retrieved successfully',
      data: {
        popularFoods: foodResults,
        totalQueries: popularFoods.slice(0, 5).length,
        note: 'Limited to 5 queries to avoid API rate limits'
      },
    };

    res.status(200).json(response);
  });
}