import axios from 'axios';
import { logger } from '../utils/logger';
import { AppError } from '../middleware/errorHandler';

export interface USDAFood {
  fdcId: number;
  description: string;
  dataType: string;
  brandOwner?: string;
  brandName?: string;
  ingredients?: string;
  servingSize?: number;
  servingSizeUnit?: string;
  householdServingFullText?: string;
  foodNutrients: USDANutrient[];
  foodCategory?: {
    id: number;
    code: string;
    description: string;
  };
}

export interface USDANutrient {
  nutrientId: number;
  nutrientName: string;
  nutrientNumber: string;
  unitName: string;
  value: number;
  rank?: number;
  indentLevel?: number;
  foodNutrientDerivation?: {
    id: number;
    code: string;
    description: string;
  };
}

export interface USDASearchResult {
  totalHits: number;
  currentPage: number;
  totalPages: number;
  foods: USDAFood[];
}

export interface NutritionData {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  sugar: number;
  sodium: number;
  calcium: number;
  iron: number;
  vitaminC: number;
  vitaminD: number;
}

export class USDAFoodService {
  private static readonly API_BASE_URL = process.env.USDA_API_BASE_URL || 'https://api.nal.usda.gov/fdc/v1';
  private static readonly API_KEY = process.env.USDA_API_KEY;

  /**
   * Search for foods in USDA database
   */
  static async searchFoods(
    query: string, 
    pageSize: number = 25, 
    pageNumber: number = 1,
    dataType?: string[]
  ): Promise<USDASearchResult> {
    try {
      if (!this.API_KEY) {
        throw new AppError('USDA API key not configured', 500, 'API_KEY_MISSING');
      }

      const params: any = {
        api_key: this.API_KEY,
        query: query.trim(),
        pageSize: Math.min(pageSize, 200), // USDA max is 200
        pageNumber: Math.max(pageNumber, 1),
        sortBy: 'dataType.keyword',
        sortOrder: 'asc'
      };

      // Filter by data types if specified
      if (dataType && dataType.length > 0) {
        params.dataType = dataType;
      }

      const response = await axios.get(`${this.API_BASE_URL}/foods/search`, { params });
      const data = response.data as any;

      logger.info(`USDA food search: "${query}" returned ${data.totalHits} results`);

      return {
        totalHits: data.totalHits || 0,
        currentPage: data.currentPage || 1,
        totalPages: data.totalPages || 1,
        foods: data.foods || []
      };
    } catch (error: any) {
      logger.error('USDA food search error:', error);
      
      if (error.response?.status === 400) {
        throw new AppError('Invalid search parameters', 400, 'INVALID_SEARCH');
      } else if (error.response?.status === 403) {
        throw new AppError('USDA API access denied - check API key', 403, 'API_ACCESS_DENIED');
      } else if (error.response?.status === 429) {
        throw new AppError('USDA API rate limit exceeded', 429, 'RATE_LIMIT_EXCEEDED');
      }
      
      throw new AppError('Food search service unavailable', 503, 'SERVICE_UNAVAILABLE');
    }
  }

  /**
   * Get detailed food information by FDC ID
   */
  static async getFoodById(fdcId: number, nutrients?: number[]): Promise<USDAFood> {
    try {
      if (!this.API_KEY) {
        throw new AppError('USDA API key not configured', 500, 'API_KEY_MISSING');
      }

      const params: any = {
        api_key: this.API_KEY,
        format: 'full'
      };

      // Filter specific nutrients if requested
      if (nutrients && nutrients.length > 0) {
        params.nutrients = nutrients;
      }

      const response = await axios.get(`${this.API_BASE_URL}/food/${fdcId}`, { params });

      logger.info(`USDA food details retrieved for FDC ID: ${fdcId}`);

      return response.data as USDAFood;
    } catch (error: any) {
      logger.error(`USDA food details error for ID ${fdcId}:`, error);
      
      if (error.response?.status === 404) {
        throw new AppError('Food not found', 404, 'FOOD_NOT_FOUND');
      } else if (error.response?.status === 403) {
        throw new AppError('USDA API access denied - check API key', 403, 'API_ACCESS_DENIED');
      }
      
      throw new AppError('Food details service unavailable', 503, 'SERVICE_UNAVAILABLE');
    }
  }

  /**
   * Get multiple foods by FDC IDs
   */
  static async getFoodsByIds(fdcIds: number[], nutrients?: number[]): Promise<USDAFood[]> {
    try {
      if (!this.API_KEY) {
        throw new AppError('USDA API key not configured', 500, 'API_KEY_MISSING');
      }

      const requestBody: any = {
        fdcIds: fdcIds.slice(0, 20), // USDA max is 20 per request
        format: 'full'
      };

      // Filter specific nutrients if requested
      if (nutrients && nutrients.length > 0) {
        requestBody.nutrients = nutrients;
      }

      const response = await axios.post(
        `${this.API_BASE_URL}/foods`,
        requestBody,
        {
          headers: {
            'Content-Type': 'application/json'
          },
          params: {
            api_key: this.API_KEY
          }
        }
      );

      logger.info(`USDA multiple foods retrieved for ${fdcIds.length} IDs`);

      return (response.data as USDAFood[]) || [];
    } catch (error: any) {
      logger.error('USDA multiple foods error:', error);
      
      if (error.response?.status === 403) {
        throw new AppError('USDA API access denied - check API key', 403, 'API_ACCESS_DENIED');
      }
      
      throw new AppError('Foods details service unavailable', 503, 'SERVICE_UNAVAILABLE');
    }
  }

  /**
   * Extract nutrition data from USDA food
   */
  static extractNutritionData(usdaFood: USDAFood, servingSize: number = 100): NutritionData {
    const nutrients = usdaFood.foodNutrients || [];
    
    // USDA Nutrient IDs (standardized)
    const nutrientMap: { [key: string]: number } = {
      calories: 1008,    // Energy (kcal)
      protein: 1003,     // Protein (g)
      carbs: 1005,       // Carbohydrate, by difference (g)
      fat: 1004,         // Total lipid (fat) (g)
      fiber: 1079,       // Fiber, total dietary (g)
      sugar: 2000,       // Sugars, total including NLEA (g)
      sodium: 1093,      // Sodium, Na (mg)
      calcium: 1087,     // Calcium, Ca (mg)
      iron: 1089,        // Iron, Fe (mg)
      vitaminC: 1162,    // Vitamin C, total ascorbic acid (mg)
      vitaminD: 1114     // Vitamin D (D2 + D3) (µg)
    };

    const nutritionData: NutritionData = {
      calories: 0,
      protein: 0,
      carbs: 0,
      fat: 0,
      fiber: 0,
      sugar: 0,
      sodium: 0,
      calcium: 0,
      iron: 0,
      vitaminC: 0,
      vitaminD: 0
    };

    // Extract nutrition values
    Object.entries(nutrientMap).forEach(([key, nutrientId]) => {
      const nutrient = nutrients.find(n => n.nutrientId === nutrientId);
      if (nutrient && nutrient.value !== undefined) {
        // Scale to serving size (USDA data is per 100g)
        const scaledValue = (nutrient.value * servingSize) / 100;
        (nutritionData as any)[key] = Math.round(scaledValue * 100) / 100; // Round to 2 decimals
      }
    });

    return nutritionData;
  }

  /**
   * Search for Indian/South Asian foods specifically
   */
  static async searchIndianFoods(query: string, pageSize: number = 25): Promise<USDASearchResult> {
    const indianKeywords = [
      'indian', 'curry', 'dal', 'rice', 'roti', 'chapati', 'naan', 
      'samosa', 'biryani', 'tandoori', 'masala', 'paneer', 'ghee',
      'turmeric', 'cumin', 'coriander', 'cardamom', 'garam masala'
    ];

    // Enhance query with Indian food context
    const enhancedQuery = `${query} ${indianKeywords.some(keyword => 
      query.toLowerCase().includes(keyword)) ? '' : 'indian'}`.trim();

    return this.searchFoods(enhancedQuery, pageSize);
  }

  /**
   * Get nutrition recommendations based on goal
   */
  static getNutritionRecommendations(
    goal: 'weight_loss' | 'muscle_gain' | 'maintenance',
    currentNutrition: NutritionData,
    targetCalories: number
  ): {
    recommendations: string[];
    missingNutrients: string[];
    excessNutrients: string[];
  } {
    const recommendations: string[] = [];
    const missingNutrients: string[] = [];
    const excessNutrients: string[] = [];

    // Calculate target macros based on goal
    const targets = this.calculateNutritionTargets(goal, targetCalories);

    // Check protein
    if (currentNutrition.protein < targets.protein * 0.8) {
      missingNutrients.push('protein');
      recommendations.push(`Add more protein-rich foods (target: ${targets.protein}g, current: ${currentNutrition.protein}g)`);
    }

    // Check fiber
    if (currentNutrition.fiber < 25) {
      missingNutrients.push('fiber');
      recommendations.push(`Increase fiber intake with vegetables, fruits, and whole grains (target: 25g, current: ${currentNutrition.fiber}g)`);
    }

    // Check sodium
    if (currentNutrition.sodium > 2300) {
      excessNutrients.push('sodium');
      recommendations.push(`Reduce sodium intake (limit: 2300mg, current: ${currentNutrition.sodium}mg)`);
    }

    // Check calcium
    if (currentNutrition.calcium < 1000) {
      missingNutrients.push('calcium');
      recommendations.push(`Include more calcium-rich foods like dairy, leafy greens (target: 1000mg, current: ${currentNutrition.calcium}mg)`);
    }

    // Check iron
    if (currentNutrition.iron < 18) {
      missingNutrients.push('iron');
      recommendations.push(`Add iron-rich foods like spinach, lentils, lean meat (target: 18mg, current: ${currentNutrition.iron}mg)`);
    }

    // Check vitamin C
    if (currentNutrition.vitaminC < 90) {
      missingNutrients.push('vitamin C');
      recommendations.push(`Include vitamin C sources like citrus fruits, bell peppers (target: 90mg, current: ${currentNutrition.vitaminC}mg)`);
    }

    return { recommendations, missingNutrients, excessNutrients };
  }

  /**
   * Calculate nutrition targets based on goal and calories
   */
  private static calculateNutritionTargets(
    goal: 'weight_loss' | 'muscle_gain' | 'maintenance',
    calories: number
  ): NutritionData {
    let proteinPercentage = 0.25;
    let carbsPercentage = 0.45;
    let fatPercentage = 0.30;

    switch (goal) {
      case 'weight_loss':
        proteinPercentage = 0.30;
        carbsPercentage = 0.35;
        fatPercentage = 0.35;
        break;
      case 'muscle_gain':
        proteinPercentage = 0.25;
        carbsPercentage = 0.50;
        fatPercentage = 0.25;
        break;
    }

    return {
      calories,
      protein: Math.round((calories * proteinPercentage) / 4), // 4 cal/g
      carbs: Math.round((calories * carbsPercentage) / 4),     // 4 cal/g
      fat: Math.round((calories * fatPercentage) / 9),         // 9 cal/g
      fiber: 25, // Standard recommendation
      sugar: Math.round(calories * 0.10 / 4), // Max 10% of calories
      sodium: 2300, // Standard limit (mg)
      calcium: 1000, // Standard recommendation (mg)
      iron: 18, // Standard recommendation (mg)
      vitaminC: 90, // Standard recommendation (mg)
      vitaminD: 20 // Standard recommendation (µg)
    };
  }

  /**
   * Suggest food alternatives based on nutrition gaps
   */
  static async suggestFoodAlternatives(
    missingNutrients: string[]
  ): Promise<{ [nutrient: string]: USDAFood[] }> {
    const suggestions: { [nutrient: string]: USDAFood[] } = {};

    const nutrientFoodMap: { [key: string]: string[] } = {
      protein: ['chicken breast', 'salmon', 'eggs', 'greek yogurt', 'lentils', 'paneer'],
      fiber: ['oats', 'quinoa', 'broccoli', 'apple', 'beans', 'brown rice'],
      calcium: ['milk', 'cheese', 'yogurt', 'spinach', 'almonds', 'sesame seeds'],
      iron: ['spinach', 'lentils', 'beef', 'tofu', 'pumpkin seeds', 'chickpeas'],
      'vitamin C': ['orange', 'bell pepper', 'strawberry', 'kiwi', 'tomato', 'lemon']
    };

    for (const nutrient of missingNutrients) {
      if (nutrientFoodMap[nutrient]) {
        const foods: USDAFood[] = [];
        
        for (const foodQuery of nutrientFoodMap[nutrient].slice(0, 3)) {
          try {
            const searchResult = await this.searchFoods(foodQuery, 5);
            if (searchResult.foods.length > 0) {
              foods.push(searchResult.foods[0]); // Take the first result
            }
          } catch (error) {
            logger.warn(`Failed to search for ${foodQuery}:`, error);
          }
        }
        
        suggestions[nutrient] = foods;
      }
    }

    return suggestions;
  }

  /**
   * Validate API key
   */
  static async validateApiKey(): Promise<boolean> {
    try {
      if (!this.API_KEY) {
        return false;
      }

      // Test with a simple search
      await this.searchFoods('apple', 1);
      return true;
    } catch (error) {
      logger.error('USDA API key validation failed:', error);
      return false;
    }
  }
}