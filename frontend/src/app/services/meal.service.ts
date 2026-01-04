import { Injectable, Inject, PLATFORM_ID } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, BehaviorSubject } from 'rxjs';
import { isPlatformBrowser } from '@angular/common';
import { environment } from '../../environments/environment';

export interface Food {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  calories: number;
  protein?: number;
  carbs?: number;
  fat?: number;
  fiber?: number;
}

export interface Meal {
  id: string;
  name: string;
  type: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  foods: Food[];
  consumed: boolean;
  consumed_at?: Date;
  image?: string;
}

export interface DailyMealPlan {
  id: number;
  user_id: number;
  date: string;
  meals: Meal[];
  total_calories: number;
  total_protein: number;
  total_carbs: number;
  total_fat: number;
  total_fiber: number;
  target_calories: number;
  target_protein: number;
  target_carbs: number;
  target_fat: number;
  created_at: Date;
  updated_at: Date;
}

export interface NutritionTargets {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
}

export interface NutritionProgress {
  consumed: NutritionTargets;
  targets: NutritionTargets;
  percentages: NutritionTargets;
  remaining: NutritionTargets;
}

export interface WeeklyNutritionSummary {
  totalDays: number;
  averageCalories: number;
  averageProtein: number;
  averageCarbs: number;
  averageFat: number;
  calorieGoalDays: number;
  proteinGoalDays: number;
  streak: number;
}

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

export interface NutritionRecommendations {
  recommendations: string[];
  missingNutrients: string[];
  excessNutrients: string[];
  foodSuggestions: { [nutrient: string]: USDAFood[] };
  goal: string;
  targetCalories: number;
}

export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
  error?: string;
}

@Injectable({
  providedIn: 'root'
})
export class MealService {
  private apiUrl = environment.apiUrl;
  private currentMealPlanSubject = new BehaviorSubject<DailyMealPlan | null>(null);
  public currentMealPlan$ = this.currentMealPlanSubject.asObservable();

  constructor(
    private http: HttpClient,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {}

  private getHeaders(): HttpHeaders {
    let token = '';
    if (isPlatformBrowser(this.platformId)) {
      // Get the real JWT token from localStorage
      token = localStorage.getItem('accessToken') || '';
    }
    
    return new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    });
  }

  // Get meal plans for the week (using new backend API)
  getMealPlansForWeek(): Observable<ApiResponse<{ plans: any[] }>> {
    return this.http.get<ApiResponse<{ plans: any[] }>>(
      `${this.apiUrl}/meals`,
      { headers: this.getHeaders() }
    );
  }

  // Get meal plan for specific day (using new backend API)
  getMealPlanByDay(day: string): Observable<ApiResponse<{ mealPlan: any }>> {
    return this.http.get<ApiResponse<{ mealPlan: any }>>(
      `${this.apiUrl}/meals/${day}`,
      { headers: this.getHeaders() }
    );
  }

  // Generate personalized meal plan (using new backend API)
  generatePersonalizedMealPlan(): Observable<ApiResponse<{ plans: any[] }>> {
    return this.http.post<ApiResponse<{ plans: any[] }>>(
      `${this.apiUrl}/meals/generate`,
      {},
      { headers: this.getHeaders() }
    );
  }

  // Mark meal as consumed (using new backend API)
  markMealAsConsumed(day: string, mealId: string, consumed: boolean): Observable<ApiResponse<{ plan: any }>> {
    return this.http.post<ApiResponse<{ plan: any }>>(
      `${this.apiUrl}/meals/${day}/consume`,
      { meal_id: mealId, consumed },
      { headers: this.getHeaders() }
    );
  }

  // Get meal progress (using new backend API)
  getMealProgress(): Observable<ApiResponse<{ progress: any }>> {
    return this.http.get<ApiResponse<{ progress: any }>>(
      `${this.apiUrl}/meals/progress`,
      { headers: this.getHeaders() }
    );
  }

  // Get nutrition goals (using new backend API)
  getNutritionGoals(): Observable<ApiResponse<{ nutritionGoals: any }>> {
    return this.http.get<ApiResponse<{ nutritionGoals: any }>>(
      `${this.apiUrl}/meals/nutrition-goals`,
      { headers: this.getHeaders() }
    );
  }

  // Add meal to specific day (using new backend API)
  addMealToDay(day: string, mealData: any): Observable<ApiResponse<{ plan: any }>> {
    return this.http.post<ApiResponse<{ plan: any }>>(
      `${this.apiUrl}/meals/${day}`,
      mealData,
      { headers: this.getHeaders() }
    );
  }

  // Update meal (using new backend API)
  updateMeal(day: string, mealId: string, mealData: any): Observable<ApiResponse<{ plan: any }>> {
    return this.http.put<ApiResponse<{ plan: any }>>(
      `${this.apiUrl}/meals/${day}/${mealId}`,
      mealData,
      { headers: this.getHeaders() }
    );
  }

  // Delete meal (using new backend API)
  deleteMeal(day: string, mealId: string): Observable<ApiResponse<{ plan: any }>> {
    return this.http.delete<ApiResponse<{ plan: any }>>(
      `${this.apiUrl}/meals/${day}/${mealId}`,
      { headers: this.getHeaders() }
    );
  }

  // USDA Food API Integration Methods

  // Search for foods using USDA database
  searchFoods(query: string, pageSize: number = 25, pageNumber: number = 1, dataType?: string[]): Observable<ApiResponse<{ searchResult: USDASearchResult; query: string; pagination: any }>> {
    let params = `query=${encodeURIComponent(query)}&pageSize=${pageSize}&pageNumber=${pageNumber}`;
    if (dataType && dataType.length > 0) {
      params += `&dataType=${dataType.join(',')}`;
    }
    
    return this.http.get<ApiResponse<{ searchResult: USDASearchResult; query: string; pagination: any }>>(
      `${this.apiUrl}/foods/search?${params}`
    );
  }

  // Search for Indian/South Asian foods specifically
  searchIndianFoods(query: string, pageSize: number = 25): Observable<ApiResponse<{ searchResult: USDASearchResult; query: string; enhancedForIndianCuisine: boolean }>> {
    return this.http.get<ApiResponse<{ searchResult: USDASearchResult; query: string; enhancedForIndianCuisine: boolean }>>(
      `${this.apiUrl}/foods/search/indian?query=${encodeURIComponent(query)}&pageSize=${pageSize}`
    );
  }

  // Get detailed food information by FDC ID
  getFoodById(fdcId: number, nutrients?: number[]): Observable<ApiResponse<{ food: USDAFood }>> {
    let params = '';
    if (nutrients && nutrients.length > 0) {
      params = `?nutrients=${nutrients.join(',')}`;
    }
    
    return this.http.get<ApiResponse<{ food: USDAFood }>>(
      `${this.apiUrl}/foods/${fdcId}${params}`
    );
  }

  // Get nutrition data for specific serving size
  getNutritionData(fdcId: number, servingSize: number = 100): Observable<ApiResponse<{ nutritionData: NutritionData; foodInfo: any }>> {
    return this.http.get<ApiResponse<{ nutritionData: NutritionData; foodInfo: any }>>(
      `${this.apiUrl}/foods/${fdcId}/nutrition?servingSize=${servingSize}`
    );
  }

  // Get multiple foods by FDC IDs
  getFoodsByIds(fdcIds: number[], nutrients?: number[]): Observable<ApiResponse<{ foods: USDAFood[]; requestedCount: number; returnedCount: number }>> {
    const requestBody: any = { fdcIds };
    if (nutrients && nutrients.length > 0) {
      requestBody.nutrients = nutrients;
    }
    
    return this.http.post<ApiResponse<{ foods: USDAFood[]; requestedCount: number; returnedCount: number }>>(
      `${this.apiUrl}/foods/batch`,
      requestBody
    );
  }

  // Get personalized nutrition recommendations
  getNutritionRecommendations(currentNutrition: NutritionData, goal: 'weight_loss' | 'muscle_gain' | 'maintenance', targetCalories: number): Observable<ApiResponse<NutritionRecommendations>> {
    return this.http.post<ApiResponse<NutritionRecommendations>>(
      `${this.apiUrl}/foods/recommendations`,
      { currentNutrition, goal, targetCalories },
      { headers: this.getHeaders() }
    );
  }

  // Get popular Indian foods for quick access
  getPopularIndianFoods(): Observable<ApiResponse<{ popularFoods: any[]; totalQueries: number; note: string }>> {
    return this.http.get<ApiResponse<{ popularFoods: any[]; totalQueries: number; note: string }>>(
      `${this.apiUrl}/foods/popular/indian`
    );
  }

  // Validate USDA API configuration
  validateUSDAApiKey(): Observable<ApiResponse<{ apiKeyValid: boolean; apiConfigured: boolean }>> {
    return this.http.get<ApiResponse<{ apiKeyValid: boolean; apiConfigured: boolean }>>(
      `${this.apiUrl}/foods/validate-api`
    );
  }

  // Helper method to extract nutrition from USDA food
  extractNutritionFromUSDAFood(usdaFood: USDAFood, servingSize: number = 100): NutritionData {
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

  // Convert USDA food to our Food interface
  convertUSDAFoodToFood(usdaFood: USDAFood, quantity: number = 100, unit: string = 'g'): Food {
    const nutrition = this.extractNutritionFromUSDAFood(usdaFood, quantity);
    
    return {
      id: usdaFood.fdcId.toString(),
      name: usdaFood.description,
      quantity,
      unit,
      calories: nutrition.calories,
      protein: nutrition.protein,
      carbs: nutrition.carbs,
      fat: nutrition.fat,
      fiber: nutrition.fiber
    };
  }

  // Update local meal plan cache
  updateMealPlanCache(plan: DailyMealPlan): void {
    this.currentMealPlanSubject.next(plan);
  }

  // Get current meal plan from cache
  getCurrentMealPlan(): DailyMealPlan | null {
    return this.currentMealPlanSubject.value;
  }

  // Helper methods
  getTodayDate(): string {
    return new Date().toISOString().split('T')[0];
  }

  formatDate(date: Date): string {
    return date.toISOString().split('T')[0];
  }

  calculateMealCalories(meal: Meal): number {
    return meal.foods.reduce((total, food) => total + food.calories, 0);
  }

  calculateDayProgress(plan: DailyMealPlan): NutritionProgress {
    const consumed = {
      calories: Math.round(plan.meals.filter(m => m.consumed).reduce((total, meal) => total + meal.calories, 0)),
      protein: Math.round(plan.meals.filter(m => m.consumed).reduce((total, meal) => total + meal.protein, 0)),
      carbs: Math.round(plan.meals.filter(m => m.consumed).reduce((total, meal) => total + meal.carbs, 0)),
      fat: Math.round(plan.meals.filter(m => m.consumed).reduce((total, meal) => total + meal.fat, 0) * 10) / 10, // Round to 1 decimal
      fiber: Math.round(plan.meals.filter(m => m.consumed).reduce((total, meal) => total + meal.fiber, 0))
    };

    const targets = {
      calories: plan.target_calories,
      protein: plan.target_protein,
      carbs: plan.target_carbs,
      fat: plan.target_fat,
      fiber: 25 // Default fiber target
    };

    const percentages = {
      calories: targets.calories > 0 ? Math.round((consumed.calories / targets.calories) * 100) : 0,
      protein: targets.protein > 0 ? Math.round((consumed.protein / targets.protein) * 100) : 0,
      carbs: targets.carbs > 0 ? Math.round((consumed.carbs / targets.carbs) * 100) : 0,
      fat: targets.fat > 0 ? Math.round((consumed.fat / targets.fat) * 100) : 0,
      fiber: targets.fiber > 0 ? Math.round((consumed.fiber / targets.fiber) * 100) : 0
    };

    const remaining = {
      calories: Math.max(0, Math.round(targets.calories - consumed.calories)),
      protein: Math.max(0, Math.round(targets.protein - consumed.protein)),
      carbs: Math.max(0, Math.round(targets.carbs - consumed.carbs)),
      fat: Math.max(0, Math.round((targets.fat - consumed.fat) * 10) / 10), // Round to 1 decimal
      fiber: Math.max(0, Math.round(targets.fiber - consumed.fiber))
    };

    return { consumed, targets, percentages, remaining };
  }

  getMealTypeIcon(type: string): string {
    const icons: { [key: string]: string } = {
      'breakfast': 'wb_sunny',
      'lunch': 'wb_sunny',
      'dinner': 'nights_stay',
      'snack': 'local_cafe'
    };
    return icons[type] || 'restaurant';
  }

  getMealTypeColor(type: string): string {
    const colors: { [key: string]: string } = {
      'breakfast': '#FF9800',
      'lunch': '#4CAF50',
      'dinner': '#3F51B5',
      'snack': '#9C27B0'
    };
    return colors[type] || '#757575';
  }

  // Mock data generation for demo purposes
  generateMockMealPlan(date: string, goal: 'weight_loss' | 'muscle_gain' | 'maintenance'): DailyMealPlan {
    const baseCalories = goal === 'weight_loss' ? 1500 : goal === 'muscle_gain' ? 2500 : 2000;
    
    const mockMeals: Meal[] = [
      {
        id: '1',
        name: 'Healthy Breakfast Bowl',
        type: 'breakfast',
        calories: Math.round(baseCalories * 0.25),
        protein: 25,
        carbs: 45,
        fat: 12,
        fiber: 8,
        consumed: false,
        foods: [
          { id: '1', name: 'Oatmeal', quantity: 50, unit: 'g', calories: 150, protein: 5, carbs: 30, fat: 3 },
          { id: '2', name: 'Blueberries', quantity: 100, unit: 'g', calories: 80, protein: 1, carbs: 15, fat: 0 },
          { id: '3', name: 'Greek Yogurt', quantity: 100, unit: 'g', calories: 100, protein: 19, carbs: 0, fat: 9 }
        ]
      },
      {
        id: '2',
        name: 'Power Lunch',
        type: 'lunch',
        calories: Math.round(baseCalories * 0.35),
        protein: 35,
        carbs: 40,
        fat: 18,
        fiber: 10,
        consumed: false,
        foods: [
          { id: '4', name: 'Grilled Chicken', quantity: 150, unit: 'g', calories: 250, protein: 30, carbs: 0, fat: 14 },
          { id: '5', name: 'Quinoa', quantity: 80, unit: 'g', calories: 120, protein: 4, carbs: 22, fat: 2 },
          { id: '6', name: 'Mixed Vegetables', quantity: 200, unit: 'g', calories: 80, protein: 1, carbs: 18, fat: 2 }
        ]
      },
      {
        id: '3',
        name: 'Balanced Dinner',
        type: 'dinner',
        calories: Math.round(baseCalories * 0.3),
        protein: 30,
        carbs: 35,
        fat: 15,
        fiber: 8,
        consumed: false,
        foods: [
          { id: '7', name: 'Salmon', quantity: 120, unit: 'g', calories: 200, protein: 25, carbs: 0, fat: 12 },
          { id: '8', name: 'Sweet Potato', quantity: 150, unit: 'g', calories: 120, protein: 2, carbs: 28, fat: 0 },
          { id: '9', name: 'Broccoli', quantity: 150, unit: 'g', calories: 40, protein: 3, carbs: 7, fat: 3 }
        ]
      },
      {
        id: '4',
        name: 'Healthy Snack',
        type: 'snack',
        calories: Math.round(baseCalories * 0.1),
        protein: 8,
        carbs: 15,
        fat: 8,
        fiber: 4,
        consumed: false,
        foods: [
          { id: '10', name: 'Almonds', quantity: 20, unit: 'g', calories: 120, protein: 4, carbs: 5, fat: 8 },
          { id: '11', name: 'Apple', quantity: 1, unit: 'piece', calories: 80, protein: 4, carbs: 10, fat: 0 }
        ]
      }
    ];

    return {
      id: Date.now(),
      user_id: 1,
      date,
      meals: mockMeals,
      total_calories: mockMeals.reduce((total, meal) => total + meal.calories, 0),
      total_protein: mockMeals.reduce((total, meal) => total + meal.protein, 0),
      total_carbs: mockMeals.reduce((total, meal) => total + meal.carbs, 0),
      total_fat: mockMeals.reduce((total, meal) => total + meal.fat, 0),
      total_fiber: mockMeals.reduce((total, meal) => total + meal.fiber, 0),
      target_calories: baseCalories,
      target_protein: Math.round(baseCalories * 0.2 / 4),
      target_carbs: Math.round(baseCalories * 0.5 / 4),
      target_fat: Math.round(baseCalories * 0.3 / 9),
      created_at: new Date(),
      updated_at: new Date()
    };
  }
}