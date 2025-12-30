import { Router } from 'express';
import { FoodController } from '../controllers/foodController';
import { authenticate } from '../middleware/auth';

const router = Router();

/**
 * @route   GET /api/v1/foods/search
 * @desc    Search for foods in USDA database
 * @access  Public (no auth required for food search)
 */
router.get('/search', FoodController.searchFoods);

/**
 * @route   GET /api/v1/foods/search/indian
 * @desc    Search for Indian/South Asian foods
 * @access  Public
 */
router.get('/search/indian', FoodController.searchIndianFoods);

/**
 * @route   GET /api/v1/foods/popular/indian
 * @desc    Get popular Indian foods for quick access
 * @access  Public
 */
router.get('/popular/indian', FoodController.getPopularIndianFoods);

/**
 * @route   GET /api/v1/foods/validate-api
 * @desc    Validate USDA API key configuration
 * @access  Public (for admin/debugging)
 */
router.get('/validate-api', FoodController.validateApiKey);

/**
 * @route   GET /api/v1/foods/:fdcId
 * @desc    Get detailed food information by FDC ID
 * @access  Public
 */
router.get('/:fdcId', FoodController.getFoodById);

/**
 * @route   GET /api/v1/foods/:fdcId/nutrition
 * @desc    Get nutrition data for specific serving size
 * @access  Public
 */
router.get('/:fdcId/nutrition', FoodController.getNutritionData);

/**
 * @route   POST /api/v1/foods/batch
 * @desc    Get multiple foods by FDC IDs
 * @access  Public
 */
router.post('/batch', FoodController.getFoodsByIds);

// Protected routes (require authentication)

/**
 * @route   POST /api/v1/foods/recommendations
 * @desc    Get personalized nutrition recommendations
 * @access  Private (User)
 */
router.post('/recommendations', authenticate, FoodController.getNutritionRecommendations);

export default router;