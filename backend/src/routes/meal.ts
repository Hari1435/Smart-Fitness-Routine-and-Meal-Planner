import { Router } from 'express';
import { MealController } from '../controllers/mealController';
import { authenticate } from '../middleware/auth';

const router = Router();

// Apply authentication middleware to all routes
router.use(authenticate);

/**
 * @route   POST /api/v1/meals/generate
 * @desc    Generate personalized meal plan
 * @access  Private (User)
 */
router.post('/generate', MealController.generatePersonalizedMealPlan);

/**
 * @route   GET /api/v1/meals/progress
 * @desc    Get meal progress analytics
 * @access  Private (User)
 */
router.get('/progress', MealController.getMealProgress);

/**
 * @route   GET /api/v1/meals/nutrition-goals
 * @desc    Get nutrition goals for user
 * @access  Private (User)
 */
router.get('/nutrition-goals', MealController.getNutritionGoals);

/**
 * @route   GET /api/v1/meals/statistics
 * @desc    Get meal statistics
 * @access  Private (User)
 */
router.get('/statistics', MealController.getMealStatistics);

/**
 * @route   GET /api/v1/meals
 * @desc    Get all meal plans for user
 * @access  Private (User)
 */
router.get('/', MealController.getAllMealPlans);

/**
 * @route   GET /api/v1/meals/:day
 * @desc    Get meal plan for specific day
 * @access  Private (User)
 */
router.get('/:day', MealController.getMealPlanByDay);

/**
 * @route   GET /api/v1/meals/:day/recommendations
 * @desc    Get meal recommendations for specific day
 * @access  Private (User)
 */
router.get('/:day/recommendations', MealController.getMealRecommendations);

/**
 * @route   POST /api/v1/meals/:day/consume
 * @desc    Mark meal as consumed/not consumed
 * @access  Private (User)
 */
router.post('/:day/consume', MealController.markMealConsumed);

/**
 * @route   POST /api/v1/meals/:day
 * @desc    Add new meal to specific day
 * @access  Private (User)
 */
router.post('/:day', MealController.addMeal);

/**
 * @route   PUT /api/v1/meals/:day/:mealId
 * @desc    Update meal for specific day
 * @access  Private (User)
 */
router.put('/:day/:mealId', MealController.updateMeal);

/**
 * @route   DELETE /api/v1/meals/:day/:mealId
 * @desc    Delete meal from specific day
 * @access  Private (User)
 */
router.delete('/:day/:mealId', MealController.deleteMeal);

export default router;