import express from 'express';
import { AdminController } from '../controllers/adminController';
import { authenticate, authorize } from '../middleware/auth';

const router = express.Router();

// Apply authentication and admin role check to all routes
router.use(authenticate);
router.use(authorize('admin'));

// Dashboard Statistics
router.get('/stats', AdminController.getAdminStats);

// User Management Routes
router.get('/users', AdminController.getAllUsers);
router.get('/users/:id', AdminController.getUserById);
router.put('/users/:id', AdminController.updateUser);
router.delete('/users/:id', AdminController.deleteUser);

// Workout Rules Management
router.get('/workout-rules', AdminController.getWorkoutRules);
router.post('/workout-rules', AdminController.createWorkoutRule);
router.put('/workout-rules/:id', AdminController.updateWorkoutRule);
router.delete('/workout-rules/:id', AdminController.deleteWorkoutRule);

// Meal Rules Management
router.get('/meal-rules', AdminController.getMealRules);
router.post('/meal-rules', AdminController.createMealRule);
router.put('/meal-rules/:id', AdminController.updateMealRule);
router.delete('/meal-rules/:id', AdminController.deleteMealRule);

// Apply Rules to All Users
router.post('/apply-rules', AdminController.applyRulesToAllUsers);

export default router;