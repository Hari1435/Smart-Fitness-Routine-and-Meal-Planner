import { WorkoutMealPlanModel } from '../models/WorkoutMealPlan';
import { UserModel } from '../models/User';
import { Meal, Food, WorkoutMealPlan, User } from '../types';
import { logger } from '../utils/logger';
import { AppError } from '../middleware/errorHandler';

export interface MealProgress {
  totalMeals: number;
  consumedMeals: number;
  totalCalories: number;
  consumedCalories: number;
  consumptionPercentage: number;
  dailyStats: {
    [day: string]: {
      totalCalories: number;
      consumedCalories: number;
      mealsConsumed: number;
      totalMeals: number;
      consumptionPercentage: number;
    };
  };
  nutritionBreakdown: {
    protein: { total: number; consumed: number };
    carbs: { total: number; consumed: number };
    fat: { total: number; consumed: number };
  };
}

export interface NutritionGoals {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

export class MealService {
  /**
   * Generate personalized meal plans based on user profile and goals
   */
  static async generatePersonalizedMealPlan(userId: number): Promise<WorkoutMealPlan[]> {
    try {
      // Get user profile
      const user = await UserModel.findById(userId);
      if (!user) {
        throw new AppError('User not found', 404, 'USER_NOT_FOUND');
      }

      // Get existing workout plans or create new ones
      let plans = await WorkoutMealPlanModel.findByUserId(userId);
      
      if (plans.length === 0) {
        // Create basic workout plans first
        await WorkoutMealPlanModel.generateDefaultPlan(userId, user.goal || 'maintenance');
        plans = await WorkoutMealPlanModel.findByUserId(userId);
      }

      // Generate meals for each day
      const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
      const updatedPlans: WorkoutMealPlan[] = [];

      for (const day of days) {
        const existingPlan = plans.find(p => p.day === day);
        const meals = this.generateDayMeals(user, day);

        const planData = {
          day: day as any,
          exercises: existingPlan?.exercises || [],
          meals,
        };

        const plan = await WorkoutMealPlanModel.createOrUpdate(userId, planData);
        updatedPlans.push(plan);
      }

      logger.info(`Personalized meal plan generated for user ${userId}`);
      return updatedPlans;
    } catch (error) {
      logger.error('Error generating personalized meal plan:', error);
      throw error;
    }
  }

  /**
   * Get meal progress analytics for a user
   */
  static async getMealProgress(userId: number): Promise<MealProgress> {
    try {
      const plans = await WorkoutMealPlanModel.findByUserId(userId);
      
      let totalMeals = 0;
      let consumedMeals = 0;
      let totalCalories = 0;
      let consumedCalories = 0;
      let totalProtein = 0;
      let consumedProtein = 0;
      let totalCarbs = 0;
      let consumedCarbs = 0;
      let totalFat = 0;
      let consumedFat = 0;

      const dailyStats: MealProgress['dailyStats'] = {};

      // Calculate statistics for each day
      plans.forEach(plan => {
        const dayMeals = plan.meals.length;
        const dayConsumedMeals = plan.meals.filter(meal => 
          plan.completed_status.meals[meal.id]
        ).length;

        const dayTotalCalories = plan.meals.reduce((sum, meal) => sum + meal.calories, 0);
        const dayConsumedCalories = plan.meals
          .filter(meal => plan.completed_status.meals[meal.id])
          .reduce((sum, meal) => sum + meal.calories, 0);

        totalMeals += dayMeals;
        consumedMeals += dayConsumedMeals;
        totalCalories += dayTotalCalories;
        consumedCalories += dayConsumedCalories;

        // Calculate nutrition totals
        plan.meals.forEach(meal => {
          totalProtein += meal.protein || 0;
          totalCarbs += meal.carbs || 0;
          totalFat += meal.fat || 0;

          if (plan.completed_status.meals[meal.id]) {
            consumedProtein += meal.protein || 0;
            consumedCarbs += meal.carbs || 0;
            consumedFat += meal.fat || 0;
          }
        });

        const dayConsumptionPercentage = dayTotalCalories > 0 ? 
          Math.round((dayConsumedCalories / dayTotalCalories) * 100) : 0;

        dailyStats[plan.day] = {
          totalCalories: dayTotalCalories,
          consumedCalories: dayConsumedCalories,
          mealsConsumed: dayConsumedMeals,
          totalMeals: dayMeals,
          consumptionPercentage: dayConsumptionPercentage,
        };
      });

      const consumptionPercentage = totalCalories > 0 ? 
        Math.round((consumedCalories / totalCalories) * 100) : 0;

      return {
        totalMeals,
        consumedMeals,
        totalCalories,
        consumedCalories,
        consumptionPercentage,
        dailyStats,
        nutritionBreakdown: {
          protein: { total: totalProtein, consumed: consumedProtein },
          carbs: { total: totalCarbs, consumed: consumedCarbs },
          fat: { total: totalFat, consumed: consumedFat },
        },
      };
    } catch (error) {
      logger.error('Error getting meal progress:', error);
      throw error;
    }
  }

  /**
   * Mark meal as consumed
   */
  static async markMealConsumed(
    userId: number, 
    day: string, 
    mealId: string, 
    consumed: boolean
  ): Promise<WorkoutMealPlan> {
    try {
      const updatedPlan = await WorkoutMealPlanModel.updateCompletedStatus(userId, day, {
        meal_id: mealId,
        completed: consumed,
      });

      logger.info(`Meal ${mealId} marked as ${consumed ? 'consumed' : 'not consumed'} for user ${userId} on ${day}`);
      return updatedPlan;
    } catch (error) {
      logger.error('Error marking meal as consumed:', error);
      throw error;
    }
  }

  /**
   * Update meal for a specific day
   */
  static async updateMeal(
    userId: number,
    day: string,
    mealId: string,
    mealData: Partial<Meal>
  ): Promise<WorkoutMealPlan> {
    try {
      const plan = await WorkoutMealPlanModel.findByUserAndDay(userId, day);
      if (!plan) {
        throw new AppError('Meal plan not found for this day', 404, 'PLAN_NOT_FOUND');
      }

      // Find and update the specific meal
      const mealIndex = plan.meals.findIndex(meal => meal.id === mealId);
      if (mealIndex === -1) {
        throw new AppError('Meal not found', 404, 'MEAL_NOT_FOUND');
      }

      // Update meal data
      plan.meals[mealIndex] = {
        ...plan.meals[mealIndex],
        ...mealData,
        id: mealId, // Ensure ID doesn't change
      };

      // Save updated plan
      const updatedPlan = await WorkoutMealPlanModel.createOrUpdate(userId, {
        day: day as any,
        exercises: plan.exercises,
        meals: plan.meals,
      });

      logger.info(`Meal ${mealId} updated for user ${userId} on ${day}`);
      return updatedPlan;
    } catch (error) {
      logger.error('Error updating meal:', error);
      throw error;
    }
  }

  /**
   * Add new meal to a day
   */
  static async addMeal(
    userId: number,
    day: string,
    mealData: Omit<Meal, 'id'>
  ): Promise<WorkoutMealPlan> {
    try {
      const plan = await WorkoutMealPlanModel.findByUserAndDay(userId, day);
      if (!plan) {
        throw new AppError('Meal plan not found for this day', 404, 'PLAN_NOT_FOUND');
      }

      // Create new meal with unique ID
      const newMeal: Meal = {
        ...mealData,
        id: `${day}-${mealData.type}-${Date.now()}`,
      };

      // Add meal to plan
      plan.meals.push(newMeal);

      // Save updated plan
      const updatedPlan = await WorkoutMealPlanModel.createOrUpdate(userId, {
        day: day as any,
        exercises: plan.exercises,
        meals: plan.meals,
      });

      logger.info(`New meal added for user ${userId} on ${day}`);
      return updatedPlan;
    } catch (error) {
      logger.error('Error adding meal:', error);
      throw error;
    }
  }

  /**
   * Delete meal from a day
   */
  static async deleteMeal(
    userId: number,
    day: string,
    mealId: string
  ): Promise<WorkoutMealPlan> {
    try {
      const plan = await WorkoutMealPlanModel.findByUserAndDay(userId, day);
      if (!plan) {
        throw new AppError('Meal plan not found for this day', 404, 'PLAN_NOT_FOUND');
      }

      // Remove meal from plan
      plan.meals = plan.meals.filter(meal => meal.id !== mealId);

      // Save updated plan
      const updatedPlan = await WorkoutMealPlanModel.createOrUpdate(userId, {
        day: day as any,
        exercises: plan.exercises,
        meals: plan.meals,
      });

      logger.info(`Meal ${mealId} deleted for user ${userId} on ${day}`);
      return updatedPlan;
    } catch (error) {
      logger.error('Error deleting meal:', error);
      throw error;
    }
  }

  /**
   * Get nutrition goals for user based on their profile
   */
  static async getNutritionGoals(userId: number): Promise<NutritionGoals> {
    try {
      const user = await UserModel.findById(userId);
      if (!user) {
        throw new AppError('User not found', 404, 'USER_NOT_FOUND');
      }

      const baseCalories = this.calculateBaseCalories(user);
      
      // Calculate macronutrient distribution based on goal
      let proteinPercentage = 0.25; // 25% protein
      let carbsPercentage = 0.45;   // 45% carbs
      let fatPercentage = 0.30;     // 30% fat

      switch (user.goal) {
        case 'weight_loss':
          proteinPercentage = 0.30; // Higher protein for satiety
          carbsPercentage = 0.35;   // Lower carbs
          fatPercentage = 0.35;     // Moderate fat
          break;
        case 'muscle_gain':
          proteinPercentage = 0.25; // Adequate protein
          carbsPercentage = 0.50;   // Higher carbs for energy
          fatPercentage = 0.25;     // Lower fat
          break;
        case 'maintenance':
          // Use default balanced ratios
          break;
      }

      return {
        calories: baseCalories,
        protein: Math.round((baseCalories * proteinPercentage) / 4), // 4 calories per gram
        carbs: Math.round((baseCalories * carbsPercentage) / 4),     // 4 calories per gram
        fat: Math.round((baseCalories * fatPercentage) / 9),         // 9 calories per gram
      };
    } catch (error) {
      logger.error('Error getting nutrition goals:', error);
      throw error;
    }
  }

  /**
   * Generate meals for a specific day based on user profile
   */
  private static generateDayMeals(user: User, day: string): Meal[] {
    const nutritionGoals = this.calculateNutritionGoals(user);
    
    // Distribute calories across meals
    const breakfastCalories = Math.round(nutritionGoals.calories * 0.25);
    const lunchCalories = Math.round(nutritionGoals.calories * 0.35);
    const dinnerCalories = Math.round(nutritionGoals.calories * 0.30);
    const snackCalories = Math.round(nutritionGoals.calories * 0.10);

    return [
      this.generateMeal('breakfast', day, breakfastCalories, user.goal || 'maintenance'),
      this.generateMeal('lunch', day, lunchCalories, user.goal || 'maintenance'),
      this.generateMeal('dinner', day, dinnerCalories, user.goal || 'maintenance'),
      this.generateMeal('snack', day, snackCalories, user.goal || 'maintenance'),
    ];
  }

  /**
   * Generate a single meal based on type and calorie target
   */
  private static generateMeal(
    type: 'breakfast' | 'lunch' | 'dinner' | 'snack',
    day: string,
    targetCalories: number,
    goal: string
  ): Meal {
    const mealTemplates = this.getMealTemplates();
    const goalTemplates = mealTemplates[goal as keyof typeof mealTemplates] || mealTemplates['maintenance'];
    
    // Get multiple variations for this meal type and select based on day
    const mealVariations = goalTemplates[type];
    const dayIndex = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].indexOf(day);
    
    // Select different variation based on day (cycle through available variations)
    const template = Array.isArray(mealVariations) 
      ? mealVariations[dayIndex % mealVariations.length]
      : mealVariations;

    // Scale the template to match target calories
    const scaleFactor = targetCalories / template.calories;

    return {
      id: `${day}-${type}-${Date.now()}`,
      name: template.name,
      type,
      calories: targetCalories,
      protein: Math.round(template.protein * scaleFactor),
      carbs: Math.round(template.carbs * scaleFactor),
      fat: Math.round(template.fat * scaleFactor),
      foods: template.foods.map(food => ({
        ...food,
        quantity: Math.round(food.quantity * scaleFactor * 10) / 10, // Round to 1 decimal
        calories: Math.round(food.calories * scaleFactor),
      })),
    };
  }

  /**
   * Get meal templates for different goals with multiple variations per meal type
   */
  private static getMealTemplates() {
    return {
      'weight_loss': {
        breakfast: [
          {
            name: 'Protein-Rich Greek Yogurt Bowl',
            calories: 300,
            protein: 25,
            carbs: 25,
            fat: 12,
            foods: [
              { name: 'Greek Yogurt', quantity: 150, unit: 'g', calories: 100, protein: 15, carbs: 6, fat: 0 },
              { name: 'Berries', quantity: 100, unit: 'g', calories: 50, protein: 1, carbs: 12, fat: 0 },
              { name: 'Almonds', quantity: 15, unit: 'g', calories: 90, protein: 3, carbs: 3, fat: 8 },
              { name: 'Honey', quantity: 10, unit: 'g', calories: 30, protein: 0, carbs: 8, fat: 0 },
            ],
          },
          {
            name: 'Veggie Scrambled Eggs',
            calories: 280,
            protein: 22,
            carbs: 15,
            fat: 18,
            foods: [
              { name: 'Eggs', quantity: 2, unit: 'pieces', calories: 140, protein: 12, carbs: 1, fat: 10 },
              { name: 'Spinach', quantity: 50, unit: 'g', calories: 10, protein: 2, carbs: 2, fat: 0 },
              { name: 'Mushrooms', quantity: 50, unit: 'g', calories: 10, protein: 2, carbs: 2, fat: 0 },
              { name: 'Olive Oil', quantity: 5, unit: 'ml', calories: 40, protein: 0, carbs: 0, fat: 5 },
              { name: 'Whole Grain Toast', quantity: 1, unit: 'slice', calories: 80, protein: 4, carbs: 15, fat: 1 },
            ],
          },
          {
            name: 'Protein Smoothie Bowl',
            calories: 320,
            protein: 28,
            carbs: 30,
            fat: 10,
            foods: [
              { name: 'Protein Powder', quantity: 30, unit: 'g', calories: 120 },
              { name: 'Banana', quantity: 0.5, unit: 'piece', calories: 50 },
              { name: 'Spinach', quantity: 30, unit: 'g', calories: 5 },
              { name: 'Almond Milk', quantity: 200, unit: 'ml', calories: 40 },
              { name: 'Chia Seeds', quantity: 10, unit: 'g', calories: 50 },
            ],
          },
          {
            name: 'Cottage Cheese & Fruit',
            calories: 290,
            protein: 24,
            carbs: 28,
            fat: 8,
            foods: [
              { name: 'Cottage Cheese', quantity: 150, unit: 'g', calories: 150 },
              { name: 'Apple', quantity: 1, unit: 'piece', calories: 80 },
              { name: 'Walnuts', quantity: 10, unit: 'g', calories: 65 },
            ],
          },
          {
            name: 'Avocado Toast Light',
            calories: 310,
            protein: 12,
            carbs: 25,
            fat: 20,
            foods: [
              { name: 'Ezekiel Bread', quantity: 1, unit: 'slice', calories: 80 },
              { name: 'Avocado', quantity: 60, unit: 'g', calories: 100 },
              { name: 'Egg White', quantity: 2, unit: 'pieces', calories: 35 },
              { name: 'Tomato', quantity: 50, unit: 'g', calories: 10 },
              { name: 'Everything Seasoning', quantity: 2, unit: 'g', calories: 5 },
            ],
          },
          {
            name: 'Overnight Oats Protein',
            calories: 295,
            protein: 20,
            carbs: 35,
            fat: 8,
            foods: [
              { name: 'Rolled Oats', quantity: 40, unit: 'g', calories: 150 },
              { name: 'Protein Powder', quantity: 15, unit: 'g', calories: 60 },
              { name: 'Almond Milk', quantity: 150, unit: 'ml', calories: 30 },
              { name: 'Strawberries', quantity: 80, unit: 'g', calories: 25 },
              { name: 'Flax Seeds', quantity: 5, unit: 'g', calories: 25 },
            ],
          },
          {
            name: 'Green Smoothie Power',
            calories: 285,
            protein: 18,
            carbs: 32,
            fat: 12,
            foods: [
              { name: 'Spinach', quantity: 60, unit: 'g', calories: 15 },
              { name: 'Banana', quantity: 1, unit: 'piece', calories: 100 },
              { name: 'Greek Yogurt', quantity: 100, unit: 'g', calories: 70 },
              { name: 'Almond Butter', quantity: 15, unit: 'g', calories: 90 },
              { name: 'Coconut Water', quantity: 150, unit: 'ml', calories: 10 },
            ],
          },
        ],
        lunch: [
          {
            name: 'Grilled Chicken Salad Bowl',
            calories: 400,
            protein: 30,
            carbs: 30,
            fat: 18,
            foods: [
              { name: 'Grilled Chicken', quantity: 120, unit: 'g', calories: 200, protein: 37, carbs: 0, fat: 4 },
              { name: 'Mixed Greens', quantity: 100, unit: 'g', calories: 20, protein: 2, carbs: 4, fat: 0 },
              { name: 'Cherry Tomatoes', quantity: 100, unit: 'g', calories: 18, protein: 1, carbs: 4, fat: 0 },
              { name: 'Avocado', quantity: 50, unit: 'g', calories: 80, protein: 1, carbs: 4, fat: 7 },
              { name: 'Olive Oil Dressing', quantity: 15, unit: 'ml', calories: 120, protein: 0, carbs: 0, fat: 14 },
            ],
          },
          {
            name: 'Turkey & Veggie Wrap',
            calories: 380,
            protein: 28,
            carbs: 35,
            fat: 15,
            foods: [
              { name: 'Whole Wheat Tortilla', quantity: 1, unit: 'piece', calories: 120 },
              { name: 'Sliced Turkey', quantity: 100, unit: 'g', calories: 120 },
              { name: 'Hummus', quantity: 30, unit: 'g', calories: 80 },
              { name: 'Cucumber', quantity: 50, unit: 'g', calories: 8 },
              { name: 'Bell Peppers', quantity: 50, unit: 'g', calories: 15 },
              { name: 'Lettuce', quantity: 30, unit: 'g', calories: 5 },
            ],
          },
          {
            name: 'Quinoa Buddha Bowl',
            calories: 420,
            protein: 18,
            carbs: 45,
            fat: 16,
            foods: [
              { name: 'Quinoa', quantity: 60, unit: 'g', calories: 220 },
              { name: 'Chickpeas', quantity: 80, unit: 'g', calories: 130 },
              { name: 'Roasted Vegetables', quantity: 150, unit: 'g', calories: 60 },
              { name: 'Tahini Dressing', quantity: 20, unit: 'g', calories: 120 },
            ],
          },
          {
            name: 'Tuna Salad Lettuce Wraps',
            calories: 350,
            protein: 32,
            carbs: 15,
            fat: 20,
            foods: [
              { name: 'Canned Tuna', quantity: 120, unit: 'g', calories: 150 },
              { name: 'Greek Yogurt', quantity: 50, unit: 'g', calories: 35 },
              { name: 'Celery', quantity: 50, unit: 'g', calories: 8 },
              { name: 'Butter Lettuce', quantity: 100, unit: 'g', calories: 15 },
              { name: 'Avocado', quantity: 40, unit: 'g', calories: 65 },
              { name: 'Lemon Juice', quantity: 10, unit: 'ml', calories: 2 },
            ],
          },
          {
            name: 'Veggie Soup & Protein',
            calories: 390,
            protein: 25,
            carbs: 40,
            fat: 14,
            foods: [
              { name: 'Vegetable Soup', quantity: 300, unit: 'ml', calories: 120 },
              { name: 'Grilled Tofu', quantity: 100, unit: 'g', calories: 150 },
              { name: 'Whole Grain Roll', quantity: 1, unit: 'piece', calories: 100 },
              { name: 'Side Salad', quantity: 80, unit: 'g', calories: 20 },
            ],
          },
          {
            name: 'Shrimp & Zucchini Noodles',
            calories: 370,
            protein: 35,
            carbs: 20,
            fat: 18,
            foods: [
              { name: 'Shrimp', quantity: 150, unit: 'g', calories: 180 },
              { name: 'Zucchini Noodles', quantity: 200, unit: 'g', calories: 40 },
              { name: 'Cherry Tomatoes', quantity: 100, unit: 'g', calories: 18 },
              { name: 'Olive Oil', quantity: 10, unit: 'ml', calories: 90 },
              { name: 'Garlic & Herbs', quantity: 5, unit: 'g', calories: 5 },
            ],
          },
          {
            name: 'Egg Salad Stuffed Avocado',
            calories: 410,
            protein: 20,
            carbs: 15,
            fat: 32,
            foods: [
              { name: 'Hard Boiled Eggs', quantity: 2, unit: 'pieces', calories: 140 },
              { name: 'Avocado', quantity: 1, unit: 'piece', calories: 200 },
              { name: 'Greek Yogurt', quantity: 30, unit: 'g', calories: 20 },
              { name: 'Mustard', quantity: 5, unit: 'g', calories: 3 },
              { name: 'Mixed Greens', quantity: 50, unit: 'g', calories: 10 },
            ],
          },
        ],
        dinner: [
          {
            name: 'Baked Cod with Vegetables',
            calories: 350,
            protein: 35,
            carbs: 25,
            fat: 15,
            foods: [
              { name: 'Cod Fillet', quantity: 150, unit: 'g', calories: 200 },
              { name: 'Steamed Broccoli', quantity: 150, unit: 'g', calories: 50 },
              { name: 'Quinoa', quantity: 50, unit: 'g', calories: 100 },
            ],
          },
          {
            name: 'Turkey Meatballs & Zoodles',
            calories: 340,
            protein: 32,
            carbs: 18,
            fat: 16,
            foods: [
              { name: 'Turkey Meatballs', quantity: 120, unit: 'g', calories: 180 },
              { name: 'Zucchini Noodles', quantity: 200, unit: 'g', calories: 40 },
              { name: 'Marinara Sauce', quantity: 80, unit: 'g', calories: 35 },
              { name: 'Parmesan Cheese', quantity: 15, unit: 'g', calories: 60 },
            ],
          },
          {
            name: 'Grilled Chicken & Sweet Potato',
            calories: 380,
            protein: 38,
            carbs: 30,
            fat: 12,
            foods: [
              { name: 'Grilled Chicken', quantity: 140, unit: 'g', calories: 230 },
              { name: 'Roasted Sweet Potato', quantity: 150, unit: 'g', calories: 130 },
              { name: 'Green Beans', quantity: 100, unit: 'g', calories: 35 },
            ],
          },
          {
            name: 'Salmon & Cauliflower Rice',
            calories: 360,
            protein: 30,
            carbs: 15,
            fat: 22,
            foods: [
              { name: 'Baked Salmon', quantity: 120, unit: 'g', calories: 250 },
              { name: 'Cauliflower Rice', quantity: 150, unit: 'g', calories: 40 },
              { name: 'Asparagus', quantity: 100, unit: 'g', calories: 25 },
              { name: 'Lemon Butter', quantity: 10, unit: 'g', calories: 75 },
            ],
          },
          {
            name: 'Lean Beef Stir-Fry',
            calories: 370,
            protein: 28,
            carbs: 25,
            fat: 18,
            foods: [
              { name: 'Lean Beef', quantity: 100, unit: 'g', calories: 180 },
              { name: 'Mixed Vegetables', quantity: 200, unit: 'g', calories: 60 },
              { name: 'Brown Rice', quantity: 50, unit: 'g', calories: 110 },
              { name: 'Sesame Oil', quantity: 5, unit: 'ml', calories: 45 },
            ],
          },
          {
            name: 'Stuffed Bell Peppers',
            calories: 355,
            protein: 25,
            carbs: 30,
            fat: 16,
            foods: [
              { name: 'Ground Turkey', quantity: 100, unit: 'g', calories: 150 },
              { name: 'Bell Peppers', quantity: 2, unit: 'pieces', calories: 60 },
              { name: 'Quinoa', quantity: 40, unit: 'g', calories: 150 },
              { name: 'Cheese', quantity: 20, unit: 'g', calories: 80 },
            ],
          },
          {
            name: 'White Fish & Roasted Veggies',
            calories: 345,
            protein: 33,
            carbs: 20,
            fat: 16,
            foods: [
              { name: 'White Fish', quantity: 140, unit: 'g', calories: 190 },
              { name: 'Roasted Brussels Sprouts', quantity: 150, unit: 'g', calories: 60 },
              { name: 'Sweet Potato', quantity: 100, unit: 'g', calories: 85 },
              { name: 'Olive Oil', quantity: 5, unit: 'ml', calories: 45 },
            ],
          },
        ],
        snack: [
          {
            name: 'Apple with Almond Butter',
            calories: 150,
            protein: 8,
            carbs: 15,
            fat: 8,
            foods: [
              { name: 'Apple', quantity: 1, unit: 'piece', calories: 80 },
              { name: 'Almond Butter', quantity: 12, unit: 'g', calories: 70 },
            ],
          },
          {
            name: 'Greek Yogurt & Berries',
            calories: 140,
            protein: 12,
            carbs: 18,
            fat: 3,
            foods: [
              { name: 'Greek Yogurt', quantity: 100, unit: 'g', calories: 70 },
              { name: 'Mixed Berries', quantity: 80, unit: 'g', calories: 40 },
              { name: 'Honey', quantity: 8, unit: 'g', calories: 25 },
            ],
          },
          {
            name: 'Veggie Sticks & Hummus',
            calories: 130,
            protein: 6,
            carbs: 15,
            fat: 6,
            foods: [
              { name: 'Carrot Sticks', quantity: 100, unit: 'g', calories: 40 },
              { name: 'Cucumber', quantity: 50, unit: 'g', calories: 8 },
              { name: 'Hummus', quantity: 30, unit: 'g', calories: 80 },
            ],
          },
          {
            name: 'Hard-Boiled Egg & Crackers',
            calories: 160,
            protein: 10,
            carbs: 12,
            fat: 8,
            foods: [
              { name: 'Hard-Boiled Egg', quantity: 1, unit: 'piece', calories: 70 },
              { name: 'Whole Grain Crackers', quantity: 5, unit: 'pieces', calories: 60 },
              { name: 'Cherry Tomatoes', quantity: 50, unit: 'g', calories: 9 },
            ],
          },
          {
            name: 'Protein Smoothie Mini',
            calories: 145,
            protein: 15,
            carbs: 12,
            fat: 5,
            foods: [
              { name: 'Protein Powder', quantity: 15, unit: 'g', calories: 60 },
              { name: 'Banana', quantity: 0.5, unit: 'piece', calories: 50 },
              { name: 'Almond Milk', quantity: 150, unit: 'ml', calories: 30 },
            ],
          },
          {
            name: 'Cottage Cheese Bowl',
            calories: 155,
            protein: 14,
            carbs: 10,
            fat: 6,
            foods: [
              { name: 'Cottage Cheese', quantity: 100, unit: 'g', calories: 100 },
              { name: 'Cucumber', quantity: 80, unit: 'g', calories: 12 },
              { name: 'Everything Seasoning', quantity: 2, unit: 'g', calories: 5 },
            ],
          },
          {
            name: 'Nuts & Seeds Mix',
            calories: 165,
            protein: 6,
            carbs: 8,
            fat: 14,
            foods: [
              { name: 'Almonds', quantity: 15, unit: 'g', calories: 90 },
              { name: 'Pumpkin Seeds', quantity: 10, unit: 'g', calories: 55 },
              { name: 'Dried Berries', quantity: 10, unit: 'g', calories: 30 },
            ],
          },
        ],
      },
      'muscle_gain': {
        breakfast: [
          {
            name: 'Power Oatmeal Bowl',
            calories: 500,
            protein: 35,
            carbs: 50,
            fat: 20,
            foods: [
              { name: 'Oatmeal', quantity: 80, unit: 'g', calories: 300, protein: 10, carbs: 54, fat: 6 },
              { name: 'Banana', quantity: 1, unit: 'piece', calories: 100, protein: 1, carbs: 27, fat: 0 },
              { name: 'Protein Powder', quantity: 30, unit: 'g', calories: 120, protein: 24, carbs: 2, fat: 1 },
              { name: 'Milk', quantity: 200, unit: 'ml', calories: 120, protein: 8, carbs: 12, fat: 3 },
            ],
          },
          {
            name: 'Muscle Builder Scramble',
            calories: 520,
            protein: 38,
            carbs: 35,
            fat: 25,
            foods: [
              { name: 'Whole Eggs', quantity: 3, unit: 'pieces', calories: 210 },
              { name: 'Whole Grain Toast', quantity: 2, unit: 'slices', calories: 160 },
              { name: 'Avocado', quantity: 60, unit: 'g', calories: 100 },
              { name: 'Cheese', quantity: 30, unit: 'g', calories: 120 },
            ],
          },
          {
            name: 'Protein Pancakes Stack',
            calories: 480,
            protein: 32,
            carbs: 45,
            fat: 18,
            foods: [
              { name: 'Protein Pancake Mix', quantity: 60, unit: 'g', calories: 240 },
              { name: 'Banana', quantity: 1, unit: 'piece', calories: 100 },
              { name: 'Greek Yogurt', quantity: 100, unit: 'g', calories: 70 },
              { name: 'Maple Syrup', quantity: 20, unit: 'ml', calories: 50 },
              { name: 'Nuts', quantity: 15, unit: 'g', calories: 90 },
            ],
          },
          {
            name: 'Breakfast Burrito Power',
            calories: 510,
            protein: 30,
            carbs: 40,
            fat: 24,
            foods: [
              { name: 'Whole Wheat Tortilla', quantity: 1, unit: 'large', calories: 150 },
              { name: 'Scrambled Eggs', quantity: 2, unit: 'pieces', calories: 140 },
              { name: 'Black Beans', quantity: 60, unit: 'g', calories: 80 },
              { name: 'Cheese', quantity: 40, unit: 'g', calories: 160 },
              { name: 'Salsa', quantity: 30, unit: 'g', calories: 10 },
            ],
          },
          {
            name: 'Muscle Smoothie Bowl',
            calories: 495,
            protein: 35,
            carbs: 48,
            fat: 16,
            foods: [
              { name: 'Protein Powder', quantity: 40, unit: 'g', calories: 160 },
              { name: 'Frozen Berries', quantity: 150, unit: 'g', calories: 80 },
              { name: 'Banana', quantity: 1, unit: 'piece', calories: 100 },
              { name: 'Granola', quantity: 40, unit: 'g', calories: 160 },
              { name: 'Almond Milk', quantity: 250, unit: 'ml', calories: 50 },
            ],
          },
          {
            name: 'Steak & Eggs Breakfast',
            calories: 530,
            protein: 42,
            carbs: 25,
            fat: 30,
            foods: [
              { name: 'Lean Steak', quantity: 100, unit: 'g', calories: 200 },
              { name: 'Eggs', quantity: 2, unit: 'pieces', calories: 140 },
              { name: 'Hash Browns', quantity: 100, unit: 'g', calories: 150 },
              { name: 'Spinach', quantity: 50, unit: 'g', calories: 10 },
            ],
          },
          {
            name: 'Quinoa Breakfast Bowl',
            calories: 485,
            protein: 28,
            carbs: 55,
            fat: 18,
            foods: [
              { name: 'Quinoa', quantity: 80, unit: 'g', calories: 300 },
              { name: 'Greek Yogurt', quantity: 150, unit: 'g', calories: 100 },
              { name: 'Mixed Nuts', quantity: 20, unit: 'g', calories: 120 },
              { name: 'Dried Fruit', quantity: 25, unit: 'g', calories: 75 },
            ],
          },
        ],
        lunch: [
          {
            name: 'Muscle Building Beef Bowl',
            calories: 600,
            protein: 45,
            carbs: 60,
            fat: 20,
            foods: [
              { name: 'Lean Beef', quantity: 150, unit: 'g', calories: 300 },
              { name: 'Brown Rice', quantity: 100, unit: 'g', calories: 350 },
              { name: 'Mixed Vegetables', quantity: 150, unit: 'g', calories: 60 },
            ],
          },
          {
            name: 'Chicken & Sweet Potato Power',
            calories: 580,
            protein: 42,
            carbs: 55,
            fat: 18,
            foods: [
              { name: 'Grilled Chicken', quantity: 150, unit: 'g', calories: 250 },
              { name: 'Roasted Sweet Potato', quantity: 200, unit: 'g', calories: 180 },
              { name: 'Quinoa', quantity: 60, unit: 'g', calories: 220 },
              { name: 'Broccoli', quantity: 100, unit: 'g', calories: 35 },
            ],
          },
          {
            name: 'Tuna & Pasta Power Bowl',
            calories: 620,
            protein: 38,
            carbs: 65,
            fat: 22,
            foods: [
              { name: 'Whole Wheat Pasta', quantity: 100, unit: 'g', calories: 350 },
              { name: 'Tuna', quantity: 120, unit: 'g', calories: 150 },
              { name: 'Olive Oil', quantity: 15, unit: 'ml', calories: 135 },
              { name: 'Vegetables', quantity: 100, unit: 'g', calories: 40 },
            ],
          },
          {
            name: 'Turkey & Rice Power Plate',
            calories: 590,
            protein: 40,
            carbs: 58,
            fat: 16,
            foods: [
              { name: 'Ground Turkey', quantity: 130, unit: 'g', calories: 200 },
              { name: 'Jasmine Rice', quantity: 100, unit: 'g', calories: 350 },
              { name: 'Black Beans', quantity: 80, unit: 'g', calories: 110 },
              { name: 'Peppers & Onions', quantity: 100, unit: 'g', calories: 30 },
            ],
          },
          {
            name: 'Salmon & Quinoa Bowl',
            calories: 610,
            protein: 35,
            carbs: 50,
            fat: 28,
            foods: [
              { name: 'Baked Salmon', quantity: 130, unit: 'g', calories: 270 },
              { name: 'Quinoa', quantity: 80, unit: 'g', calories: 300 },
              { name: 'Avocado', quantity: 60, unit: 'g', calories: 100 },
              { name: 'Roasted Vegetables', quantity: 120, unit: 'g', calories: 50 },
            ],
          },
          {
            name: 'Chicken Burrito Bowl',
            calories: 595,
            protein: 43,
            carbs: 52,
            fat: 20,
            foods: [
              { name: 'Grilled Chicken', quantity: 140, unit: 'g', calories: 230 },
              { name: 'Brown Rice', quantity: 80, unit: 'g', calories: 280 },
              { name: 'Black Beans', quantity: 60, unit: 'g', calories: 80 },
              { name: 'Cheese', quantity: 25, unit: 'g', calories: 100 },
              { name: 'Guacamole', quantity: 30, unit: 'g', calories: 50 },
            ],
          },
          {
            name: 'Protein Pasta Primavera',
            calories: 575,
            protein: 36,
            carbs: 62,
            fat: 18,
            foods: [
              { name: 'Whole Grain Pasta', quantity: 90, unit: 'g', calories: 320 },
              { name: 'Chicken Breast', quantity: 100, unit: 'g', calories: 165 },
              { name: 'Mixed Vegetables', quantity: 150, unit: 'g', calories: 60 },
              { name: 'Parmesan', quantity: 20, unit: 'g', calories: 80 },
            ],
          },
        ],
        dinner: [
          {
            name: 'Steak & Potato Power Dinner',
            calories: 550,
            protein: 40,
            carbs: 45,
            fat: 25,
            foods: [
              { name: 'Lean Steak', quantity: 130, unit: 'g', calories: 260 },
              { name: 'Baked Potato', quantity: 200, unit: 'g', calories: 160 },
              { name: 'Asparagus', quantity: 150, unit: 'g', calories: 30 },
              { name: 'Butter', quantity: 10, unit: 'g', calories: 75 },
            ],
          },
          {
            name: 'Salmon Recovery Dinner',
            calories: 570,
            protein: 38,
            carbs: 42,
            fat: 28,
            foods: [
              { name: 'Grilled Salmon', quantity: 140, unit: 'g', calories: 290 },
              { name: 'Sweet Potato', quantity: 180, unit: 'g', calories: 160 },
              { name: 'Green Beans', quantity: 120, unit: 'g', calories: 40 },
              { name: 'Olive Oil', quantity: 8, unit: 'ml', calories: 72 },
            ],
          },
          {
            name: 'Chicken & Rice Power Bowl',
            calories: 560,
            protein: 42,
            carbs: 48,
            fat: 20,
            foods: [
              { name: 'Grilled Chicken Thigh', quantity: 150, unit: 'g', calories: 280 },
              { name: 'Basmati Rice', quantity: 80, unit: 'g', calories: 280 },
              { name: 'Steamed Broccoli', quantity: 150, unit: 'g', calories: 50 },
            ],
          },
          {
            name: 'Turkey Meatball Pasta',
            calories: 545,
            protein: 35,
            carbs: 50,
            fat: 22,
            foods: [
              { name: 'Turkey Meatballs', quantity: 140, unit: 'g', calories: 210 },
              { name: 'Whole Wheat Pasta', quantity: 80, unit: 'g', calories: 280 },
              { name: 'Marinara Sauce', quantity: 100, unit: 'g', calories: 45 },
              { name: 'Mozzarella', quantity: 30, unit: 'g', calories: 85 },
            ],
          },
          {
            name: 'Pork Tenderloin & Quinoa',
            calories: 535,
            protein: 40,
            carbs: 40,
            fat: 22,
            foods: [
              { name: 'Pork Tenderloin', quantity: 130, unit: 'g', calories: 240 },
              { name: 'Quinoa', quantity: 70, unit: 'g', calories: 260 },
              { name: 'Roasted Vegetables', quantity: 150, unit: 'g', calories: 60 },
            ],
          },
          {
            name: 'Fish & Chips Healthy',
            calories: 555,
            protein: 36,
            carbs: 48,
            fat: 24,
            foods: [
              { name: 'Baked Cod', quantity: 150, unit: 'g', calories: 200 },
              { name: 'Sweet Potato Fries', quantity: 150, unit: 'g', calories: 200 },
              { name: 'Coleslaw', quantity: 100, unit: 'g', calories: 80 },
              { name: 'Tartar Sauce', quantity: 20, unit: 'g', calories: 60 },
            ],
          },
          {
            name: 'Beef Stir-Fry Power',
            calories: 540,
            protein: 38,
            carbs: 45,
            fat: 22,
            foods: [
              { name: 'Lean Beef Strips', quantity: 120, unit: 'g', calories: 220 },
              { name: 'Jasmine Rice', quantity: 80, unit: 'g', calories: 280 },
              { name: 'Stir-Fry Vegetables', quantity: 200, unit: 'g', calories: 80 },
              { name: 'Sesame Oil', quantity: 8, unit: 'ml', calories: 70 },
            ],
          },
        ],
        snack: [
          {
            name: 'Protein Power Shake',
            calories: 250,
            protein: 20,
            carbs: 20,
            fat: 10,
            foods: [
              { name: 'Protein Powder', quantity: 25, unit: 'g', calories: 100 },
              { name: 'Banana', quantity: 1, unit: 'piece', calories: 100 },
              { name: 'Peanut Butter', quantity: 15, unit: 'g', calories: 90 },
              { name: 'Milk', quantity: 150, unit: 'ml', calories: 90 },
            ],
          },
          {
            name: 'Trail Mix Power',
            calories: 240,
            protein: 8,
            carbs: 18,
            fat: 16,
            foods: [
              { name: 'Mixed Nuts', quantity: 25, unit: 'g', calories: 150 },
              { name: 'Dried Fruit', quantity: 20, unit: 'g', calories: 60 },
              { name: 'Dark Chocolate', quantity: 10, unit: 'g', calories: 50 },
            ],
          },
          {
            name: 'Greek Yogurt Parfait',
            calories: 230,
            protein: 18,
            carbs: 25,
            fat: 8,
            foods: [
              { name: 'Greek Yogurt', quantity: 150, unit: 'g', calories: 100 },
              { name: 'Granola', quantity: 30, unit: 'g', calories: 120 },
              { name: 'Berries', quantity: 80, unit: 'g', calories: 40 },
            ],
          },
          {
            name: 'Muscle Building Smoothie',
            calories: 260,
            protein: 22,
            carbs: 28,
            fat: 8,
            foods: [
              { name: 'Protein Powder', quantity: 25, unit: 'g', calories: 100 },
              { name: 'Oats', quantity: 30, unit: 'g', calories: 110 },
              { name: 'Berries', quantity: 100, unit: 'g', calories: 50 },
              { name: 'Almond Milk', quantity: 200, unit: 'ml', calories: 40 },
            ],
          },
          {
            name: 'Tuna & Crackers',
            calories: 220,
            protein: 20,
            carbs: 15,
            fat: 10,
            foods: [
              { name: 'Tuna Can', quantity: 80, unit: 'g', calories: 100 },
              { name: 'Whole Grain Crackers', quantity: 8, unit: 'pieces', calories: 96 },
              { name: 'Avocado', quantity: 30, unit: 'g', calories: 50 },
            ],
          },
          {
            name: 'Cottage Cheese Power Bowl',
            calories: 245,
            protein: 20,
            carbs: 15,
            fat: 12,
            foods: [
              { name: 'Cottage Cheese', quantity: 150, unit: 'g', calories: 150 },
              { name: 'Pineapple', quantity: 100, unit: 'g', calories: 50 },
              { name: 'Almonds', quantity: 15, unit: 'g', calories: 90 },
            ],
          },
          {
            name: 'Energy Balls',
            calories: 235,
            protein: 10,
            carbs: 22,
            fat: 14,
            foods: [
              { name: 'Oat Energy Balls', quantity: 3, unit: 'pieces', calories: 180 },
              { name: 'Protein Powder', quantity: 10, unit: 'g', calories: 40 },
              { name: 'Coconut Flakes', quantity: 5, unit: 'g', calories: 15 },
            ],
          },
        ],
      },
      'maintenance': {
        breakfast: [
          {
            name: 'Balanced Morning Bowl',
            calories: 400,
            protein: 20,
            carbs: 45,
            fat: 18,
            foods: [
              { name: 'Whole Grain Toast', quantity: 2, unit: 'slices', calories: 160, protein: 8, carbs: 30, fat: 2 },
              { name: 'Eggs', quantity: 2, unit: 'pieces', calories: 140, protein: 12, carbs: 1, fat: 10 },
              { name: 'Avocado', quantity: 50, unit: 'g', calories: 80, protein: 1, carbs: 4, fat: 7 },
              { name: 'Orange Juice', quantity: 150, unit: 'ml', calories: 60, protein: 1, carbs: 14, fat: 0 },
            ],
          },
          {
            name: 'Oatmeal & Fruit Delight',
            calories: 380,
            protein: 15,
            carbs: 55,
            fat: 12,
            foods: [
              { name: 'Rolled Oats', quantity: 60, unit: 'g', calories: 220 },
              { name: 'Mixed Berries', quantity: 100, unit: 'g', calories: 50 },
              { name: 'Almonds', quantity: 15, unit: 'g', calories: 90 },
              { name: 'Honey', quantity: 15, unit: 'g', calories: 45 },
            ],
          },
          {
            name: 'Smoothie Bowl Balance',
            calories: 420,
            protein: 22,
            carbs: 48,
            fat: 16,
            foods: [
              { name: 'Greek Yogurt', quantity: 150, unit: 'g', calories: 100 },
              { name: 'Banana', quantity: 1, unit: 'piece', calories: 100 },
              { name: 'Granola', quantity: 40, unit: 'g', calories: 160 },
              { name: 'Chia Seeds', quantity: 10, unit: 'g', calories: 50 },
            ],
          },
          {
            name: 'Whole Grain Pancakes',
            calories: 390,
            protein: 18,
            carbs: 52,
            fat: 14,
            foods: [
              { name: 'Whole Grain Pancakes', quantity: 2, unit: 'pieces', calories: 240 },
              { name: 'Greek Yogurt', quantity: 80, unit: 'g', calories: 55 },
              { name: 'Maple Syrup', quantity: 15, unit: 'ml', calories: 40 },
              { name: 'Strawberries', quantity: 100, unit: 'g', calories: 32 },
            ],
          },
          {
            name: 'Breakfast Wrap',
            calories: 410,
            protein: 24,
            carbs: 38,
            fat: 20,
            foods: [
              { name: 'Whole Wheat Tortilla', quantity: 1, unit: 'piece', calories: 120 },
              { name: 'Scrambled Eggs', quantity: 2, unit: 'pieces', calories: 140 },
              { name: 'Cheese', quantity: 25, unit: 'g', calories: 100 },
              { name: 'Spinach', quantity: 30, unit: 'g', calories: 7 },
              { name: 'Salsa', quantity: 30, unit: 'g', calories: 10 },
            ],
          },
          {
            name: 'Muesli & Yogurt',
            calories: 385,
            protein: 19,
            carbs: 50,
            fat: 13,
            foods: [
              { name: 'Muesli', quantity: 60, unit: 'g', calories: 220 },
              { name: 'Greek Yogurt', quantity: 120, unit: 'g', calories: 80 },
              { name: 'Apple', quantity: 1, unit: 'piece', calories: 80 },
              { name: 'Walnuts', quantity: 10, unit: 'g', calories: 65 },
            ],
          },
          {
            name: 'French Toast Light',
            calories: 395,
            protein: 16,
            carbs: 48,
            fat: 16,
            foods: [
              { name: 'Whole Grain Bread', quantity: 2, unit: 'slices', calories: 160 },
              { name: 'Egg', quantity: 1, unit: 'piece', calories: 70 },
              { name: 'Milk', quantity: 100, unit: 'ml', calories: 60 },
              { name: 'Butter', quantity: 8, unit: 'g', calories: 60 },
              { name: 'Berries', quantity: 80, unit: 'g', calories: 40 },
            ],
          },
        ],
        lunch: [
          {
            name: 'Mediterranean Bowl',
            calories: 450,
            protein: 25,
            carbs: 50,
            fat: 18,
            foods: [
              { name: 'Grilled Chicken', quantity: 100, unit: 'g', calories: 165 },
              { name: 'Quinoa Salad', quantity: 150, unit: 'g', calories: 200 },
              { name: 'Mixed Vegetables', quantity: 100, unit: 'g', calories: 40 },
              { name: 'Dressing', quantity: 15, unit: 'ml', calories: 45 },
            ],
          },
          {
            name: 'Turkey & Veggie Sandwich',
            calories: 430,
            protein: 28,
            carbs: 45,
            fat: 16,
            foods: [
              { name: 'Whole Grain Bread', quantity: 2, unit: 'slices', calories: 160 },
              { name: 'Sliced Turkey', quantity: 100, unit: 'g', calories: 120 },
              { name: 'Cheese', quantity: 20, unit: 'g', calories: 80 },
              { name: 'Vegetables', quantity: 80, unit: 'g', calories: 20 },
              { name: 'Mustard', quantity: 10, unit: 'g', calories: 5 },
            ],
          },
          {
            name: 'Pasta Primavera',
            calories: 470,
            protein: 20,
            carbs: 65,
            fat: 15,
            foods: [
              { name: 'Whole Wheat Pasta', quantity: 80, unit: 'g', calories: 280 },
              { name: 'Grilled Vegetables', quantity: 150, unit: 'g', calories: 60 },
              { name: 'Parmesan', quantity: 25, unit: 'g', calories: 100 },
              { name: 'Olive Oil', quantity: 8, unit: 'ml', calories: 72 },
            ],
          },
          {
            name: 'Asian Chicken Salad',
            calories: 440,
            protein: 30,
            carbs: 35,
            fat: 20,
            foods: [
              { name: 'Grilled Chicken', quantity: 110, unit: 'g', calories: 180 },
              { name: 'Mixed Asian Greens', quantity: 120, unit: 'g', calories: 25 },
              { name: 'Edamame', quantity: 60, unit: 'g', calories: 80 },
              { name: 'Sesame Dressing', quantity: 20, unit: 'ml', calories: 100 },
              { name: 'Sesame Seeds', quantity: 5, unit: 'g', calories: 30 },
            ],
          },
          {
            name: 'Fish Tacos',
            calories: 460,
            protein: 26,
            carbs: 48,
            fat: 18,
            foods: [
              { name: 'Corn Tortillas', quantity: 2, unit: 'pieces', calories: 120 },
              { name: 'Grilled Fish', quantity: 100, unit: 'g', calories: 130 },
              { name: 'Cabbage Slaw', quantity: 80, unit: 'g', calories: 20 },
              { name: 'Avocado', quantity: 50, unit: 'g', calories: 80 },
              { name: 'Lime Crema', quantity: 30, unit: 'g', calories: 60 },
            ],
          },
          {
            name: 'Veggie Burger Bowl',
            calories: 435,
            protein: 22,
            carbs: 52,
            fat: 16,
            foods: [
              { name: 'Veggie Burger Patty', quantity: 1, unit: 'piece', calories: 150 },
              { name: 'Quinoa', quantity: 80, unit: 'g', calories: 300 },
              { name: 'Roasted Vegetables', quantity: 120, unit: 'g', calories: 50 },
              { name: 'Tahini Sauce', quantity: 15, unit: 'g', calories: 90 },
            ],
          },
          {
            name: 'Chicken Caesar Wrap',
            calories: 455,
            protein: 32,
            carbs: 40,
            fat: 20,
            foods: [
              { name: 'Large Tortilla', quantity: 1, unit: 'piece', calories: 150 },
              { name: 'Grilled Chicken', quantity: 100, unit: 'g', calories: 165 },
              { name: 'Romaine Lettuce', quantity: 80, unit: 'g', calories: 15 },
              { name: 'Caesar Dressing', quantity: 25, unit: 'ml', calories: 125 },
              { name: 'Parmesan', quantity: 15, unit: 'g', calories: 60 },
            ],
          },
        ],
        dinner: [
          {
            name: 'Balanced Fish Dinner',
            calories: 400,
            protein: 30,
            carbs: 35,
            fat: 20,
            foods: [
              { name: 'Fish Fillet', quantity: 120, unit: 'g', calories: 180 },
              { name: 'Rice', quantity: 80, unit: 'g', calories: 130 },
              { name: 'Steamed Vegetables', quantity: 150, unit: 'g', calories: 50 },
              { name: 'Olive Oil', quantity: 5, unit: 'ml', calories: 40 },
            ],
          },
          {
            name: 'Chicken & Sweet Potato',
            calories: 420,
            protein: 32,
            carbs: 40,
            fat: 16,
            foods: [
              { name: 'Baked Chicken', quantity: 120, unit: 'g', calories: 200 },
              { name: 'Roasted Sweet Potato', quantity: 150, unit: 'g', calories: 130 },
              { name: 'Green Beans', quantity: 120, unit: 'g', calories: 40 },
              { name: 'Herb Butter', quantity: 8, unit: 'g', calories: 60 },
            ],
          },
          {
            name: 'Pork Tenderloin Dinner',
            calories: 410,
            protein: 28,
            carbs: 38,
            fat: 18,
            foods: [
              { name: 'Pork Tenderloin', quantity: 100, unit: 'g', calories: 185 },
              { name: 'Mashed Potatoes', quantity: 120, unit: 'g', calories: 110 },
              { name: 'Roasted Carrots', quantity: 100, unit: 'g', calories: 40 },
              { name: 'Gravy', quantity: 30, unit: 'ml', calories: 45 },
            ],
          },
          {
            name: 'Vegetarian Pasta',
            calories: 430,
            protein: 18,
            carbs: 58,
            fat: 16,
            foods: [
              { name: 'Whole Wheat Pasta', quantity: 85, unit: 'g', calories: 300 },
              { name: 'Marinara Sauce', quantity: 100, unit: 'g', calories: 45 },
              { name: 'Mozzarella', quantity: 30, unit: 'g', calories: 85 },
              { name: 'Basil & Vegetables', quantity: 80, unit: 'g', calories: 25 },
            ],
          },
          {
            name: 'Beef Stir-Fry',
            calories: 415,
            protein: 26,
            carbs: 42,
            fat: 18,
            foods: [
              { name: 'Lean Beef', quantity: 90, unit: 'g', calories: 165 },
              { name: 'Jasmine Rice', quantity: 70, unit: 'g', calories: 245 },
              { name: 'Stir-Fry Vegetables', quantity: 150, unit: 'g', calories: 45 },
              { name: 'Teriyaki Sauce', quantity: 20, unit: 'ml', calories: 30 },
            ],
          },
          {
            name: 'Turkey Meatloaf',
            calories: 395,
            protein: 30,
            carbs: 32,
            fat: 16,
            foods: [
              { name: 'Turkey Meatloaf', quantity: 120, unit: 'g', calories: 180 },
              { name: 'Baked Potato', quantity: 150, unit: 'g', calories: 120 },
              { name: 'Steamed Broccoli', quantity: 120, unit: 'g', calories: 40 },
              { name: 'Sour Cream', quantity: 20, unit: 'g', calories: 40 },
            ],
          },
          {
            name: 'Shrimp Scampi',
            calories: 425,
            protein: 28,
            carbs: 45,
            fat: 16,
            foods: [
              { name: 'Shrimp', quantity: 130, unit: 'g', calories: 155 },
              { name: 'Angel Hair Pasta', quantity: 75, unit: 'g', calories: 265 },
              { name: 'Garlic Butter Sauce', quantity: 15, unit: 'ml', calories: 90 },
              { name: 'Parsley & Lemon', quantity: 10, unit: 'g', calories: 3 },
            ],
          },
        ],
        snack: [
          {
            name: 'Mixed Nuts & Fruit',
            calories: 200,
            protein: 10,
            carbs: 25,
            fat: 8,
            foods: [
              { name: 'Mixed Nuts', quantity: 20, unit: 'g', calories: 120 },
              { name: 'Apple', quantity: 1, unit: 'piece', calories: 80 },
            ],
          },
          {
            name: 'Yogurt Parfait',
            calories: 180,
            protein: 12,
            carbs: 22,
            fat: 6,
            foods: [
              { name: 'Greek Yogurt', quantity: 120, unit: 'g', calories: 80 },
              { name: 'Granola', quantity: 25, unit: 'g', calories: 100 },
            ],
          },
          {
            name: 'Cheese & Crackers',
            calories: 190,
            protein: 8,
            carbs: 18,
            fat: 10,
            foods: [
              { name: 'Whole Grain Crackers', quantity: 6, unit: 'pieces', calories: 72 },
              { name: 'Cheese', quantity: 30, unit: 'g', calories: 120 },
            ],
          },
          {
            name: 'Smoothie Light',
            calories: 175,
            protein: 8,
            carbs: 28,
            fat: 4,
            foods: [
              { name: 'Banana', quantity: 1, unit: 'piece', calories: 100 },
              { name: 'Greek Yogurt', quantity: 80, unit: 'g', calories: 55 },
              { name: 'Honey', quantity: 10, unit: 'g', calories: 30 },
            ],
          },
          {
            name: 'Hummus & Veggies',
            calories: 165,
            protein: 7,
            carbs: 20,
            fat: 7,
            foods: [
              { name: 'Hummus', quantity: 40, unit: 'g', calories: 105 },
              { name: 'Carrot Sticks', quantity: 100, unit: 'g', calories: 40 },
              { name: 'Bell Pepper', quantity: 50, unit: 'g', calories: 15 },
            ],
          },
          {
            name: 'Popcorn & Fruit',
            calories: 185,
            protein: 5,
            carbs: 32,
            fat: 5,
            foods: [
              { name: 'Air-Popped Popcorn', quantity: 30, unit: 'g', calories: 110 },
              { name: 'Grapes', quantity: 100, unit: 'g', calories: 60 },
            ],
          },
          {
            name: 'Protein Bar Mini',
            calories: 195,
            protein: 12,
            carbs: 20,
            fat: 8,
            foods: [
              { name: 'Protein Bar', quantity: 0.5, unit: 'piece', calories: 120 },
              { name: 'Orange', quantity: 1, unit: 'piece', calories: 60 },
            ],
          },
        ],
      },
    };
  }

  /**
   * Calculate nutrition goals for user
   */
  private static calculateNutritionGoals(user: User): NutritionGoals {
    const baseCalories = this.calculateBaseCalories(user);
    
    let proteinPercentage = 0.25;
    let carbsPercentage = 0.45;
    let fatPercentage = 0.30;

    switch (user.goal) {
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
      calories: baseCalories,
      protein: Math.round((baseCalories * proteinPercentage) / 4),
      carbs: Math.round((baseCalories * carbsPercentage) / 4),
      fat: Math.round((baseCalories * fatPercentage) / 9),
    };
  }

  /**
   * Calculate base calories for user (same as workout service)
   */
  private static calculateBaseCalories(user: User): number {
    let bmr = 0;
    
    if (user.gender === 'male') {
      bmr = 88.362 + (13.397 * (user.weight || 70)) + (4.799 * (user.height || 175)) - (5.677 * (user.age || 25));
    } else {
      bmr = 447.593 + (9.247 * (user.weight || 60)) + (3.098 * (user.height || 165)) - (4.330 * (user.age || 25));
    }

    switch (user.goal) {
      case 'weight_loss':
        return Math.round(bmr * 1.2 - 300);
      case 'muscle_gain':
        return Math.round(bmr * 1.5 + 300);
      default:
        return Math.round(bmr * 1.3);
    }
  }
}