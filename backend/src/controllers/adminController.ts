import { Request, Response } from 'express';
import { AdminService, WorkoutRule, MealRule } from '../services/adminService';

export class AdminController {
  // Dashboard Statistics
  static async getAdminStats(req: Request, res: Response): Promise<void> {
    try {
      const stats = await AdminService.getAdminStats();
      
      res.json({
        success: true,
        data: { stats }
      });
    } catch (error) {
      console.error('Admin stats error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get admin statistics'
      });
    }
  }

  // User Management
  static async getAllUsers(req: Request, res: Response): Promise<void> {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      
      const result = await AdminService.getAllUsers(page, limit);
      
      res.json({
        success: true,
        data: {
          users: result.users,
          pagination: {
            page,
            limit,
            total: result.total,
            totalPages: Math.ceil(result.total / limit)
          }
        }
      });
    } catch (error) {
      console.error('Get users error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get users'
      });
    }
  }

  static async getUserById(req: Request, res: Response): Promise<void> {
    try {
      const userId = parseInt(req.params.id);
      
      if (!userId) {
        res.status(400).json({
          success: false,
          message: 'Invalid user ID'
        });
        return;
      }

      const user = await AdminService.getUserById(userId);
      
      if (!user) {
        res.status(404).json({
          success: false,
          message: 'User not found'
        });
        return;
      }

      res.json({
        success: true,
        data: { user }
      });
    } catch (error) {
      console.error('Get user error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get user'
      });
    }
  }

  static async updateUser(req: Request, res: Response): Promise<void> {
    try {
      const userId = parseInt(req.params.id);
      const userData = req.body;
      
      if (!userId) {
        res.status(400).json({
          success: false,
          message: 'Invalid user ID'
        });
        return;
      }

      const updated = await AdminService.updateUser(userId, userData);
      
      if (!updated) {
        res.status(404).json({
          success: false,
          message: 'User not found or no changes made'
        });
        return;
      }

      res.json({
        success: true,
        message: 'User updated successfully'
      });
    } catch (error) {
      console.error('Update user error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update user'
      });
    }
  }

  static async deleteUser(req: Request, res: Response): Promise<void> {
    try {
      const userId = parseInt(req.params.id);
      
      if (!userId) {
        res.status(400).json({
          success: false,
          message: 'Invalid user ID'
        });
        return;
      }

      const deleted = await AdminService.deleteUser(userId);
      
      if (!deleted) {
        res.status(404).json({
          success: false,
          message: 'User not found'
        });
        return;
      }

      res.json({
        success: true,
        message: 'User deleted successfully'
      });
    } catch (error) {
      console.error('Delete user error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to delete user'
      });
    }
  }

  // Workout Rules Management
  static async getWorkoutRules(req: Request, res: Response): Promise<void> {
    try {
      const rules = await AdminService.getWorkoutRules();
      
      res.json({
        success: true,
        data: { rules }
      });
    } catch (error) {
      console.error('Get workout rules error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get workout rules'
      });
    }
  }

  static async createWorkoutRule(req: Request, res: Response): Promise<void> {
    try {
      const ruleData: Omit<WorkoutRule, 'id' | 'created_at' | 'updated_at'> = req.body;
      
      // Validate required fields
      if (!ruleData.goal || !ruleData.day || !ruleData.exercises || !ruleData.difficulty_level) {
        res.status(400).json({
          success: false,
          message: 'Missing required fields: goal, day, exercises, difficulty_level'
        });
        return;
      }

      const ruleId = await AdminService.createWorkoutRule(ruleData);
      
      res.status(201).json({
        success: true,
        data: { ruleId },
        message: 'Workout rule created successfully'
      });
    } catch (error) {
      console.error('Create workout rule error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create workout rule'
      });
    }
  }

  static async updateWorkoutRule(req: Request, res: Response): Promise<void> {
    try {
      const ruleId = parseInt(req.params.id);
      const ruleData = req.body;
      
      if (!ruleId) {
        res.status(400).json({
          success: false,
          message: 'Invalid rule ID'
        });
        return;
      }

      const updated = await AdminService.updateWorkoutRule(ruleId, ruleData);
      
      if (!updated) {
        res.status(404).json({
          success: false,
          message: 'Workout rule not found or no changes made'
        });
        return;
      }

      res.json({
        success: true,
        message: 'Workout rule updated successfully'
      });
    } catch (error) {
      console.error('Update workout rule error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update workout rule'
      });
    }
  }

  static async deleteWorkoutRule(req: Request, res: Response): Promise<void> {
    try {
      const ruleId = parseInt(req.params.id);
      
      if (!ruleId) {
        res.status(400).json({
          success: false,
          message: 'Invalid rule ID'
        });
        return;
      }

      const deleted = await AdminService.deleteWorkoutRule(ruleId);
      
      if (!deleted) {
        res.status(404).json({
          success: false,
          message: 'Workout rule not found'
        });
        return;
      }

      res.json({
        success: true,
        message: 'Workout rule deleted successfully'
      });
    } catch (error) {
      console.error('Delete workout rule error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to delete workout rule'
      });
    }
  }

  // Meal Rules Management
  static async getMealRules(req: Request, res: Response): Promise<void> {
    try {
      const rules = await AdminService.getMealRules();
      
      res.json({
        success: true,
        data: { rules }
      });
    } catch (error) {
      console.error('Get meal rules error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get meal rules'
      });
    }
  }

  static async createMealRule(req: Request, res: Response): Promise<void> {
    try {
      const ruleData: Omit<MealRule, 'id' | 'created_at' | 'updated_at'> = req.body;
      
      // Validate required fields
      if (!ruleData.goal || !ruleData.meal_type || !ruleData.meals || !ruleData.calories_range) {
        res.status(400).json({
          success: false,
          message: 'Missing required fields: goal, meal_type, meals, calories_range'
        });
        return;
      }

      const ruleId = await AdminService.createMealRule(ruleData);
      
      res.status(201).json({
        success: true,
        data: { ruleId },
        message: 'Meal rule created successfully'
      });
    } catch (error) {
      console.error('Create meal rule error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create meal rule'
      });
    }
  }

  static async updateMealRule(req: Request, res: Response): Promise<void> {
    try {
      const ruleId = parseInt(req.params.id);
      const ruleData = req.body;
      
      if (!ruleId) {
        res.status(400).json({
          success: false,
          message: 'Invalid rule ID'
        });
        return;
      }

      const updated = await AdminService.updateMealRule(ruleId, ruleData);
      
      if (!updated) {
        res.status(404).json({
          success: false,
          message: 'Meal rule not found or no changes made'
        });
        return;
      }

      res.json({
        success: true,
        message: 'Meal rule updated successfully'
      });
    } catch (error) {
      console.error('Update meal rule error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update meal rule'
      });
    }
  }

  static async deleteMealRule(req: Request, res: Response): Promise<void> {
    try {
      const ruleId = parseInt(req.params.id);
      
      if (!ruleId) {
        res.status(400).json({
          success: false,
          message: 'Invalid rule ID'
        });
        return;
      }

      const deleted = await AdminService.deleteMealRule(ruleId);
      
      if (!deleted) {
        res.status(404).json({
          success: false,
          message: 'Meal rule not found'
        });
        return;
      }

      res.json({
        success: true,
        message: 'Meal rule deleted successfully'
      });
    } catch (error) {
      console.error('Delete meal rule error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to delete meal rule'
      });
    }
  }

  // Apply Rules
  static async applyRulesToAllUsers(req: Request, res: Response): Promise<void> {
    try {
      const success = await AdminService.regenerateAllUserPlans();
      
      if (!success) {
        res.status(500).json({
          success: false,
          message: 'Failed to apply rules to all users'
        });
        return;
      }

      res.json({
        success: true,
        message: 'Rules applied to all users successfully'
      });
    } catch (error) {
      console.error('Apply rules error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to apply rules to all users'
      });
    }
  }
}