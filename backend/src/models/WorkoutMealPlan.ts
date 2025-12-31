import { RowDataPacket, ResultSetHeader } from 'mysql2';
import { pool } from '../config/database';
import { WorkoutMealPlan, CreateWorkoutMealPlanRequest, UpdateCompletedStatusRequest, Exercise, Meal, CompletedStatus } from '../types';
import { logger } from '../utils/logger';
import { AppError } from '../middleware/errorHandler';

export class WorkoutMealPlanModel {
  /**
   * Create or update a workout meal plan for a specific day
   */
  static async createOrUpdate(userId: number, planData: CreateWorkoutMealPlanRequest): Promise<WorkoutMealPlan> {
    const connection = await pool.getConnection();
    
    try {
      // Check if plan already exists for this user and day
      const existingPlan = await this.findByUserAndDay(userId, planData.day);
      
      const exercisesJson = JSON.stringify(planData.exercises);
      const mealsJson = JSON.stringify(planData.meals);
      const completedStatusJson = JSON.stringify({
        exercises: {},
        meals: {},
        date_completed: null
      });

      if (existingPlan) {
        // Update existing plan
        const [result] = await connection.execute<ResultSetHeader>(
          `UPDATE workoutmealplans SET exercises = ?, meals = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
          [exercisesJson, mealsJson, existingPlan.id]
        );

        if (result.affectedRows === 0) {
          throw new AppError('Failed to update workout meal plan', 500, 'UPDATE_FAILED');
        }

        logger.info(`Workout meal plan updated for user ${userId}, day ${planData.day}`);
        return await this.findById(existingPlan.id) as WorkoutMealPlan;
      } else {
        // Create new plan
        const [result] = await connection.execute<ResultSetHeader>(
          `INSERT INTO workoutmealplans (user_id, day, exercises, meals, completed_status) VALUES (?, ?, ?, ?, ?)`,
          [userId, planData.day, exercisesJson, mealsJson, completedStatusJson]
        );

        if (result.affectedRows === 0) {
          throw new AppError('Failed to create workout meal plan', 500, 'CREATION_FAILED');
        }

        logger.info(`Workout meal plan created for user ${userId}, day ${planData.day}`);
        return await this.findById(result.insertId) as WorkoutMealPlan;
      }
    } finally {
      connection.release();
    }
  }

  /**
   * Find workout meal plan by ID
   */
  static async findById(id: number): Promise<WorkoutMealPlan | null> {
    const connection = await pool.getConnection();
    
    try {
      const [rows] = await connection.execute<RowDataPacket[]>(
        `SELECT * FROM workoutmealplans WHERE id = ?`,
        [id]
      );

      if (rows.length === 0) {
        return null;
      }

      return this.mapRowToWorkoutMealPlan(rows[0]);
    } finally {
      connection.release();
    }
  }

  /**
   * Find workout meal plan by user and day
   */
  static async findByUserAndDay(userId: number, day: string): Promise<WorkoutMealPlan | null> {
    const connection = await pool.getConnection();
    
    try {
      const [rows] = await connection.execute<RowDataPacket[]>(
        `SELECT * FROM workoutmealplans WHERE user_id = ? AND day = ?`,
        [userId, day]
      );

      if (rows.length === 0) {
        return null;
      }

      return this.mapRowToWorkoutMealPlan(rows[0]);
    } finally {
      connection.release();
    }
  }

  /**
   * Get all workout meal plans for a user
   */
  static async findByUserId(userId: number): Promise<WorkoutMealPlan[]> {
    const connection = await pool.getConnection();
    
    try {
      const [rows] = await connection.execute<RowDataPacket[]>(
        `SELECT * FROM workoutmealplans WHERE user_id = ? ORDER BY 
         CASE day 
           WHEN 'Monday' THEN 1
           WHEN 'Tuesday' THEN 2
           WHEN 'Wednesday' THEN 3
           WHEN 'Thursday' THEN 4
           WHEN 'Friday' THEN 5
           WHEN 'Saturday' THEN 6
           WHEN 'Sunday' THEN 7
         END`,
        [userId]
      );

      return rows.map(row => this.mapRowToWorkoutMealPlan(row));
    } finally {
      connection.release();
    }
  }

  /**
   * Update completed status for exercises or meals
   */
  static async updateCompletedStatus(
    userId: number, 
    day: string, 
    statusUpdate: UpdateCompletedStatusRequest
  ): Promise<WorkoutMealPlan> {
    const connection = await pool.getConnection();
    
    try {
      // Get current plan
      const currentPlan = await this.findByUserAndDay(userId, day);
      if (!currentPlan) {
        throw new AppError('Workout meal plan not found', 404, 'PLAN_NOT_FOUND');
      }

      // Update completed status
      const updatedStatus = { ...currentPlan.completed_status };
      
      if (statusUpdate.exercise_id) {
        updatedStatus.exercises[statusUpdate.exercise_id] = statusUpdate.completed;
      }
      
      if (statusUpdate.meal_id) {
        updatedStatus.meals[statusUpdate.meal_id] = statusUpdate.completed;
      }

      // Check if all items are completed
      const allExercisesCompleted = currentPlan.exercises.every(ex => updatedStatus.exercises[ex.id]);
      const allMealsCompleted = currentPlan.meals.every(meal => updatedStatus.meals[meal.id]);
      
      if (allExercisesCompleted && allMealsCompleted) {
        updatedStatus.date_completed = new Date();
      } else {
        updatedStatus.date_completed = undefined;
      }

      const completedStatusJson = JSON.stringify(updatedStatus);

      const [result] = await connection.execute<ResultSetHeader>(
        `UPDATE workoutmealplans SET completed_status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
        [completedStatusJson, currentPlan.id]
      );

      if (result.affectedRows === 0) {
        throw new AppError('Failed to update completed status', 500, 'UPDATE_FAILED');
      }

      logger.info(`Completed status updated for user ${userId}, day ${day}`);
      return await this.findById(currentPlan.id) as WorkoutMealPlan;
    } finally {
      connection.release();
    }
  }

  /**
   * Delete workout meal plan
   */
  static async delete(id: number, userId: number): Promise<void> {
    const connection = await pool.getConnection();
    
    try {
      const [result] = await connection.execute<ResultSetHeader>(
        `DELETE FROM workoutmealplans WHERE id = ? AND user_id = ?`,
        [id, userId]
      );

      if (result.affectedRows === 0) {
        throw new AppError('Workout meal plan not found', 404, 'PLAN_NOT_FOUND');
      }

      logger.info(`Workout meal plan deleted: ${id}`);
    } finally {
      connection.release();
    }
  }

  /**
   * Get weekly progress for a user
   */
  static async getWeeklyProgress(userId: number): Promise<{
    totalDays: number;
    completedDays: number;
    completedExercises: number;
    completedMeals: number;
    totalExercises: number;
    totalMeals: number;
  }> {
    const connection = await pool.getConnection();
    
    try {
      const plans = await this.findByUserId(userId);
      
      let totalExercises = 0;
      let totalMeals = 0;
      let completedExercises = 0;
      let completedMeals = 0;
      let completedDays = 0;

      plans.forEach(plan => {
        totalExercises += plan.exercises.length;
        totalMeals += plan.meals.length;

        // Count completed exercises
        plan.exercises.forEach(exercise => {
          if (plan.completed_status.exercises[exercise.id]) {
            completedExercises++;
          }
        });

        // Count completed meals
        plan.meals.forEach(meal => {
          if (plan.completed_status.meals[meal.id]) {
            completedMeals++;
          }
        });

        // Check if day is completed
        if (plan.completed_status.date_completed) {
          completedDays++;
        }
      });

      return {
        totalDays: plans.length,
        completedDays,
        completedExercises,
        completedMeals,
        totalExercises,
        totalMeals,
      };
    } finally {
      connection.release();
    }
  }

  /**
   * Get plans by goal type
   */
  static async findByGoal(goal: 'weight_loss' | 'muscle_gain' | 'maintenance'): Promise<WorkoutMealPlan[]> {
    const connection = await pool.getConnection();
    
    try {
      const [rows] = await connection.execute<RowDataPacket[]>(
        `SELECT wmp.* FROM workoutmealplans wmp 
         JOIN users u ON wmp.user_id = u.id 
         WHERE u.goal = ?
         ORDER BY wmp.created_at DESC`,
        [goal]
      );

      return rows.map(row => this.mapRowToWorkoutMealPlan(row));
    } finally {
      connection.release();
    }
  }

  /**
   * Generate default workout meal plan based on user goal
   */
  static async generateDefaultPlan(userId: number, goal: 'weight_loss' | 'muscle_gain' | 'maintenance'): Promise<void> {
    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    
    for (const day of days) {
      const exercises = this.getDefaultExercises(goal, day);
      const meals = this.getDefaultMeals(goal, day);
      
      await this.createOrUpdate(userId, {
        day: day as any,
        exercises,
        meals,
      });
    }
    
    logger.info(`Default workout meal plan generated for user ${userId} with goal ${goal}`);
  }

  /**
   * Get default exercises based on goal and day
   */
  private static getDefaultExercises(goal: string, day: string): Exercise[] {
    const baseExercises: { [key: string]: Exercise[] } = {
      'weight_loss': [
        { id: '1', name: 'Cardio Warm-up', sets: 1, reps: 1, duration: 600, instructions: '10 minutes of light cardio', muscle_group: 'cardiovascular' },
        { id: '2', name: 'Jumping Jacks', sets: 3, reps: 20, instructions: 'Full body cardio exercise', muscle_group: 'full_body' },
        { id: '3', name: 'Burpees', sets: 3, reps: 10, instructions: 'High intensity full body exercise', muscle_group: 'full_body' },
        { id: '4', name: 'Mountain Climbers', sets: 3, reps: 15, instructions: 'Core and cardio exercise', muscle_group: 'core' },
      ],
      'muscle_gain': [
        { id: '1', name: 'Push-ups', sets: 3, reps: 12, instructions: 'Standard push-ups for chest and arms', muscle_group: 'chest' },
        { id: '2', name: 'Squats', sets: 3, reps: 15, instructions: 'Bodyweight squats for legs', muscle_group: 'legs' },
        { id: '3', name: 'Pull-ups', sets: 3, reps: 8, instructions: 'Upper body pulling exercise', muscle_group: 'back' },
        { id: '4', name: 'Planks', sets: 3, reps: 1, duration: 60, instructions: 'Core strengthening exercise', muscle_group: 'core' },
      ],
      'maintenance': [
        { id: '1', name: 'Light Cardio', sets: 1, reps: 1, duration: 900, instructions: '15 minutes of moderate cardio', muscle_group: 'cardiovascular' },
        { id: '2', name: 'Bodyweight Squats', sets: 2, reps: 12, instructions: 'Maintain leg strength', muscle_group: 'legs' },
        { id: '3', name: 'Modified Push-ups', sets: 2, reps: 10, instructions: 'Maintain upper body strength', muscle_group: 'chest' },
        { id: '4', name: 'Stretching', sets: 1, reps: 1, duration: 600, instructions: '10 minutes of full body stretching', muscle_group: 'flexibility' },
      ],
    };

    return baseExercises[goal] || baseExercises['maintenance'];
  }

  /**
   * Get default meals based on goal and day
   */
  private static getDefaultMeals(goal: string, day: string): Meal[] {
    const baseMeals: { [key: string]: Meal[] } = {
      'weight_loss': [
        {
          id: '1',
          name: 'Healthy Breakfast',
          type: 'breakfast',
          calories: 300,
          protein: 20,
          carbs: 30,
          fat: 10,
          foods: [
            { name: 'Oatmeal', quantity: 50, unit: 'g', calories: 150 },
            { name: 'Berries', quantity: 100, unit: 'g', calories: 50 },
            { name: 'Greek Yogurt', quantity: 100, unit: 'g', calories: 100 },
          ],
        },
        {
          id: '2',
          name: 'Light Lunch',
          type: 'lunch',
          calories: 400,
          protein: 25,
          carbs: 35,
          fat: 15,
          foods: [
            { name: 'Grilled Chicken', quantity: 100, unit: 'g', calories: 200 },
            { name: 'Mixed Salad', quantity: 150, unit: 'g', calories: 50 },
            { name: 'Quinoa', quantity: 50, unit: 'g', calories: 150 },
          ],
        },
        {
          id: '3',
          name: 'Lean Dinner',
          type: 'dinner',
          calories: 350,
          protein: 30,
          carbs: 25,
          fat: 12,
          foods: [
            { name: 'Grilled Fish', quantity: 120, unit: 'g', calories: 200 },
            { name: 'Steamed Vegetables', quantity: 200, unit: 'g', calories: 80 },
            { name: 'Brown Rice', quantity: 40, unit: 'g', calories: 70 },
          ],
        },
      ],
      'muscle_gain': [
        {
          id: '1',
          name: 'Protein-Rich Breakfast',
          type: 'breakfast',
          calories: 500,
          protein: 35,
          carbs: 45,
          fat: 18,
          foods: [
            { name: 'Eggs', quantity: 3, unit: 'pieces', calories: 210 },
            { name: 'Whole Grain Toast', quantity: 2, unit: 'slices', calories: 160 },
            { name: 'Avocado', quantity: 50, unit: 'g', calories: 80 },
            { name: 'Protein Shake', quantity: 1, unit: 'scoop', calories: 50 },
          ],
        },
        {
          id: '2',
          name: 'Power Lunch',
          type: 'lunch',
          calories: 600,
          protein: 40,
          carbs: 50,
          fat: 20,
          foods: [
            { name: 'Lean Beef', quantity: 150, unit: 'g', calories: 300 },
            { name: 'Sweet Potato', quantity: 200, unit: 'g', calories: 180 },
            { name: 'Green Vegetables', quantity: 150, unit: 'g', calories: 60 },
            { name: 'Nuts', quantity: 20, unit: 'g', calories: 60 },
          ],
        },
        {
          id: '3',
          name: 'Recovery Dinner',
          type: 'dinner',
          calories: 550,
          protein: 35,
          carbs: 40,
          fat: 22,
          foods: [
            { name: 'Salmon', quantity: 150, unit: 'g', calories: 250 },
            { name: 'Quinoa', quantity: 80, unit: 'g', calories: 120 },
            { name: 'Mixed Vegetables', quantity: 200, unit: 'g', calories: 80 },
            { name: 'Olive Oil', quantity: 10, unit: 'ml', calories: 100 },
          ],
        },
      ],
      'maintenance': [
        {
          id: '1',
          name: 'Balanced Breakfast',
          type: 'breakfast',
          calories: 400,
          protein: 25,
          carbs: 40,
          fat: 15,
          foods: [
            { name: 'Whole Grain Cereal', quantity: 60, unit: 'g', calories: 200 },
            { name: 'Milk', quantity: 200, unit: 'ml', calories: 120 },
            { name: 'Banana', quantity: 1, unit: 'piece', calories: 80 },
          ],
        },
        {
          id: '2',
          name: 'Moderate Lunch',
          type: 'lunch',
          calories: 450,
          protein: 28,
          carbs: 42,
          fat: 16,
          foods: [
            { name: 'Grilled Chicken', quantity: 100, unit: 'g', calories: 200 },
            { name: 'Brown Rice', quantity: 60, unit: 'g', calories: 120 },
            { name: 'Vegetables', quantity: 150, unit: 'g', calories: 60 },
            { name: 'Olive Oil', quantity: 8, unit: 'ml', calories: 70 },
          ],
        },
        {
          id: '3',
          name: 'Balanced Dinner',
          type: 'dinner',
          calories: 400,
          protein: 25,
          carbs: 35,
          fat: 18,
          foods: [
            { name: 'Fish', quantity: 120, unit: 'g', calories: 180 },
            { name: 'Pasta', quantity: 60, unit: 'g', calories: 120 },
            { name: 'Salad', quantity: 100, unit: 'g', calories: 30 },
            { name: 'Dressing', quantity: 15, unit: 'ml', calories: 70 },
          ],
        },
      ],
    };

    return baseMeals[goal] || baseMeals['maintenance'];
  }

  /**
   * Map database row to WorkoutMealPlan object
   */
  private static mapRowToWorkoutMealPlan(row: RowDataPacket): WorkoutMealPlan {
    // Helper function to safely parse JSON or return the object if already parsed
    const safeJsonParse = (value: any, defaultValue: any) => {
      if (typeof value === 'string') {
        try {
          return JSON.parse(value);
        } catch (error) {
          console.warn('Failed to parse JSON:', value);
          return defaultValue;
        }
      } else if (typeof value === 'object' && value !== null) {
        return value;
      }
      return defaultValue;
    };

    return {
      id: row.id,
      user_id: row.user_id,
      day: row.day,
      exercises: safeJsonParse(row.exercises, []),
      meals: safeJsonParse(row.meals, []),
      completed_status: safeJsonParse(row.completed_status, { exercises: {}, meals: {} }),
      created_at: row.created_at,
      updated_at: row.updated_at,
    };
  }
}