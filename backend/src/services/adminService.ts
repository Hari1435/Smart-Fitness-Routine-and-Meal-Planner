import { RowDataPacket, ResultSetHeader } from 'mysql2';
import { pool } from '../config/database';

export interface AdminStats {
  totalUsers: number;
  activeUsers: number;
  totalWorkoutPlans: number;
  totalMealPlans: number;
  newUsersThisMonth: number;
}

export interface WorkoutRule {
  id?: number;
  goal: string;
  day: string;
  exercises: any[];
  difficulty_level: string;
  duration_minutes: number;
  created_at?: Date;
  updated_at?: Date;
}

export interface MealRule {
  id?: number;
  goal: string;
  meal_type: string;
  meals: any[];
  calories_range: string;
  created_at?: Date;
  updated_at?: Date;
}

export interface UserAccount {
  id: number;
  name: string;
  email: string;
  age: number;
  gender: string;
  height: number;
  weight: number;
  goal: string;
  role: string;
  created_at: Date;
  last_login?: Date;
  is_active: boolean;
}

export class AdminService {
  // Get admin dashboard statistics
  static async getAdminStats(): Promise<AdminStats> {
    try {
      const [totalUsersResult] = await pool.execute<RowDataPacket[]>(
        'SELECT COUNT(*) as count FROM users WHERE role = "user"'
      );

      const [activeUsersResult] = await pool.execute<RowDataPacket[]>(
        'SELECT COUNT(*) as count FROM users WHERE role = "user" AND created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)'
      );

      const [workoutPlansResult] = await pool.execute<RowDataPacket[]>(
        'SELECT COUNT(*) as count FROM workout_meal_plans WHERE exercises IS NOT NULL AND JSON_LENGTH(exercises) > 0'
      );

      const [mealPlansResult] = await pool.execute<RowDataPacket[]>(
        'SELECT COUNT(*) as count FROM workout_meal_plans WHERE meals IS NOT NULL AND JSON_LENGTH(meals) > 0'
      );

      const [newUsersResult] = await pool.execute<RowDataPacket[]>(
        'SELECT COUNT(*) as count FROM users WHERE role = "user" AND created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)'
      );

      return {
        totalUsers: totalUsersResult[0].count,
        activeUsers: activeUsersResult[0].count,
        totalWorkoutPlans: workoutPlansResult[0].count,
        totalMealPlans: mealPlansResult[0].count,
        newUsersThisMonth: newUsersResult[0].count
      };
    } catch (error) {
      console.error('Error getting admin stats:', error);
      throw new Error('Failed to get admin statistics');
    }
  }

  // User Management
  static async getAllUsers(page: number = 1, limit: number = 10): Promise<{ users: UserAccount[], total: number }> {
    try {
      const offset = (page - 1) * limit;
      
      const [users] = await pool.execute<RowDataPacket[]>(
        `SELECT id, name, email, age, gender, height, weight, goal, role, created_at, 
         CASE WHEN created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY) THEN 1 ELSE 0 END as is_active
         FROM users WHERE role = "user" 
         ORDER BY created_at DESC 
         LIMIT ? OFFSET ?`,
        [limit, offset]
      );

      const [totalResult] = await pool.execute<RowDataPacket[]>(
        'SELECT COUNT(*) as count FROM users WHERE role = "user"'
      );

      return {
        users: users as UserAccount[],
        total: totalResult[0].count
      };
    } catch (error) {
      console.error('Error getting users:', error);
      throw new Error('Failed to get users');
    }
  }

  static async getUserById(userId: number): Promise<UserAccount | null> {
    try {
      const [users] = await pool.execute<RowDataPacket[]>(
        `SELECT id, name, email, age, gender, height, weight, goal, role, created_at,
         CASE WHEN created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY) THEN 1 ELSE 0 END as is_active
         FROM users WHERE id = ?`,
        [userId]
      );

      return users.length > 0 ? users[0] as UserAccount : null;
    } catch (error) {
      console.error('Error getting user by ID:', error);
      throw new Error('Failed to get user');
    }
  }

  static async updateUser(userId: number, userData: Partial<UserAccount>): Promise<boolean> {
    try {
      const allowedFields = ['name', 'email', 'age', 'gender', 'height', 'weight', 'goal'];
      const updates: string[] = [];
      const values: any[] = [];

      Object.keys(userData).forEach(key => {
        if (allowedFields.includes(key) && userData[key as keyof UserAccount] !== undefined) {
          updates.push(`${key} = ?`);
          values.push(userData[key as keyof UserAccount]);
        }
      });

      if (updates.length === 0) {
        throw new Error('No valid fields to update');
      }

      values.push(userId);

      const [result] = await pool.execute<ResultSetHeader>(
        `UPDATE users SET ${updates.join(', ')} WHERE id = ?`,
        values
      );

      return result.affectedRows > 0;
    } catch (error) {
      console.error('Error updating user:', error);
      throw new Error('Failed to update user');
    }
  }

  static async deleteUser(userId: number): Promise<boolean> {
    try {
      // First delete user's workout/meal plans
      await pool.execute('DELETE FROM workout_meal_plans WHERE user_id = ?', [userId]);
      
      // Then delete the user
      const [result] = await pool.execute<ResultSetHeader>(
        'DELETE FROM users WHERE id = ? AND role = "user"',
        [userId]
      );

      return result.affectedRows > 0;
    } catch (error) {
      console.error('Error deleting user:', error);
      throw new Error('Failed to delete user');
    }
  }

  // Workout Rules Management
  static async getWorkoutRules(): Promise<WorkoutRule[]> {
    try {
      const [rules] = await pool.execute<RowDataPacket[]>(
        'SELECT * FROM workout_rules ORDER BY goal, day'
      );

      return rules.map(rule => ({
        ...rule,
        exercises: typeof rule.exercises === 'string' ? JSON.parse(rule.exercises) : rule.exercises
      })) as WorkoutRule[];
    } catch (error) {
      console.error('Error getting workout rules:', error);
      throw new Error('Failed to get workout rules');
    }
  }

  static async createWorkoutRule(rule: Omit<WorkoutRule, 'id' | 'created_at' | 'updated_at'>): Promise<number> {
    try {
      const [result] = await pool.execute<ResultSetHeader>(
        `INSERT INTO workout_rules (goal, day, exercises, difficulty_level, duration_minutes) 
         VALUES (?, ?, ?, ?, ?)`,
        [rule.goal, rule.day, JSON.stringify(rule.exercises), rule.difficulty_level, rule.duration_minutes]
      );

      return result.insertId;
    } catch (error) {
      console.error('Error creating workout rule:', error);
      throw new Error('Failed to create workout rule');
    }
  }

  static async updateWorkoutRule(id: number, rule: Partial<WorkoutRule>): Promise<boolean> {
    try {
      const allowedFields = ['goal', 'day', 'exercises', 'difficulty_level', 'duration_minutes'];
      const updates: string[] = [];
      const values: any[] = [];

      Object.keys(rule).forEach(key => {
        if (allowedFields.includes(key) && rule[key as keyof WorkoutRule] !== undefined) {
          if (key === 'exercises') {
            updates.push(`${key} = ?`);
            values.push(JSON.stringify(rule[key as keyof WorkoutRule]));
          } else {
            updates.push(`${key} = ?`);
            values.push(rule[key as keyof WorkoutRule]);
          }
        }
      });

      if (updates.length === 0) {
        throw new Error('No valid fields to update');
      }

      updates.push('updated_at = NOW()');
      values.push(id);

      const [result] = await pool.execute<ResultSetHeader>(
        `UPDATE workout_rules SET ${updates.join(', ')} WHERE id = ?`,
        values
      );

      return result.affectedRows > 0;
    } catch (error) {
      console.error('Error updating workout rule:', error);
      throw new Error('Failed to update workout rule');
    }
  }

  static async deleteWorkoutRule(id: number): Promise<boolean> {
    try {
      const [result] = await pool.execute<ResultSetHeader>(
        'DELETE FROM workout_rules WHERE id = ?',
        [id]
      );

      return result.affectedRows > 0;
    } catch (error) {
      console.error('Error deleting workout rule:', error);
      throw new Error('Failed to delete workout rule');
    }
  }

  // Meal Rules Management
  static async getMealRules(): Promise<MealRule[]> {
    try {
      const [rules] = await pool.execute<RowDataPacket[]>(
        'SELECT * FROM meal_rules ORDER BY goal, meal_type'
      );

      return rules.map(rule => ({
        ...rule,
        meals: typeof rule.meals === 'string' ? JSON.parse(rule.meals) : rule.meals
      })) as MealRule[];
    } catch (error) {
      console.error('Error getting meal rules:', error);
      throw new Error('Failed to get meal rules');
    }
  }

  static async createMealRule(rule: Omit<MealRule, 'id' | 'created_at' | 'updated_at'>): Promise<number> {
    try {
      const [result] = await pool.execute<ResultSetHeader>(
        `INSERT INTO meal_rules (goal, meal_type, meals, calories_range) 
         VALUES (?, ?, ?, ?)`,
        [rule.goal, rule.meal_type, JSON.stringify(rule.meals), rule.calories_range]
      );

      return result.insertId;
    } catch (error) {
      console.error('Error creating meal rule:', error);
      throw new Error('Failed to create meal rule');
    }
  }

  static async updateMealRule(id: number, rule: Partial<MealRule>): Promise<boolean> {
    try {
      const allowedFields = ['goal', 'meal_type', 'meals', 'calories_range'];
      const updates: string[] = [];
      const values: any[] = [];

      Object.keys(rule).forEach(key => {
        if (allowedFields.includes(key) && rule[key as keyof MealRule] !== undefined) {
          if (key === 'meals') {
            updates.push(`${key} = ?`);
            values.push(JSON.stringify(rule[key as keyof MealRule]));
          } else {
            updates.push(`${key} = ?`);
            values.push(rule[key as keyof MealRule]);
          }
        }
      });

      if (updates.length === 0) {
        throw new Error('No valid fields to update');
      }

      updates.push('updated_at = NOW()');
      values.push(id);

      const [result] = await pool.execute<ResultSetHeader>(
        `UPDATE meal_rules SET ${updates.join(', ')} WHERE id = ?`,
        values
      );

      return result.affectedRows > 0;
    } catch (error) {
      console.error('Error updating meal rule:', error);
      throw new Error('Failed to update meal rule');
    }
  }

  static async deleteMealRule(id: number): Promise<boolean> {
    try {
      const [result] = await pool.execute<ResultSetHeader>(
        'DELETE FROM meal_rules WHERE id = ?',
        [id]
      );

      return result.affectedRows > 0;
    } catch (error) {
      console.error('Error deleting meal rule:', error);
      throw new Error('Failed to delete meal rule');
    }
  }

  // Apply rules to regenerate all user plans
  static async regenerateAllUserPlans(): Promise<boolean> {
    try {
      // This would trigger regeneration of all user plans based on current rules
      // Implementation would depend on your specific business logic
      
      // For now, we'll just update a timestamp to indicate rules were applied
      await pool.execute(
        'UPDATE workout_rules SET updated_at = NOW()'
      );
      
      await pool.execute(
        'UPDATE meal_rules SET updated_at = NOW()'
      );

      return true;
    } catch (error) {
      console.error('Error regenerating user plans:', error);
      throw new Error('Failed to regenerate user plans');
    }
  }
}