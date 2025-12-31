import { Router } from 'express';
import { WorkoutMealPlanController } from '../controllers/workoutMealPlanController';
import { authenticate, authorize } from '../middleware/auth';
import { validate } from '../middleware/validation';
import Joi from 'joi';

const router = Router();

// Validation schemas for workout meal plans
const createWorkoutMealPlanSchema = Joi.object({
  day: Joi.string()
    .valid('Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday')
    .required()
    .messages({
      'any.only': 'Day must be one of: Monday, Tuesday, Wednesday, Thursday, Friday, Saturday, Sunday',
      'string.empty': 'Day is required',
    }),
  
  exercises: Joi.array()
    .items(
      Joi.object({
        id: Joi.string().required(),
        name: Joi.string().required(),
        sets: Joi.number().integer().min(1).required(),
        reps: Joi.number().integer().min(1).required(),
        weight: Joi.number().min(0).optional(),
        duration: Joi.number().integer().min(1).optional(),
        instructions: Joi.string().optional(),
        muscle_group: Joi.string().optional(),
      })
    )
    .required()
    .messages({
      'array.base': 'Exercises must be an array',
    }),
  
  meals: Joi.array()
    .items(
      Joi.object({
        id: Joi.string().required(),
        name: Joi.string().required(),
        type: Joi.string().valid('breakfast', 'lunch', 'dinner', 'snack').required(),
        calories: Joi.number().min(0).required(),
        protein: Joi.number().min(0).optional(),
        carbs: Joi.number().min(0).optional(),
        fat: Joi.number().min(0).optional(),
        foods: Joi.array()
          .items(
            Joi.object({
              name: Joi.string().required(),
              quantity: Joi.number().min(0).required(),
              unit: Joi.string().required(),
              calories: Joi.number().min(0).required(),
            })
          )
          .required(),
      })
    )
    .required()
    .messages({
      'array.base': 'Meals must be an array',
    }),
});

const updateCompletedStatusSchema = Joi.object({
  exercise_id: Joi.string().optional(),
  meal_id: Joi.string().optional(),
  completed: Joi.boolean().required(),
}).or('exercise_id', 'meal_id').messages({
  'object.missing': 'Either exercise_id or meal_id must be provided',
});

const generateDefaultPlansSchema = Joi.object({
  goal: Joi.string()
    .valid('weight_loss', 'muscle_gain', 'maintenance')
    .required()
    .messages({
      'any.only': 'Goal must be one of: weight_loss, muscle_gain, maintenance',
      'string.empty': 'Goal is required',
    }),
});

/**
 * @route   GET /api/v1/workout-meal-plans
 * @desc    Get all workout meal plans for current user
 * @access  Private
 */
router.get('/', authenticate, WorkoutMealPlanController.getUserPlans);

/**
 * @route   GET /api/v1/workout-meal-plans/progress
 * @desc    Get weekly progress for current user
 * @access  Private
 */
router.get('/progress', authenticate, WorkoutMealPlanController.getWeeklyProgress);

/**
 * @route   GET /api/v1/workout-meal-plans/statistics
 * @desc    Get plan statistics (User only)
 * @access  Private (User)
 */
router.get('/statistics', authenticate, WorkoutMealPlanController.getPlanStatistics);

/**
 * @route   GET /api/v1/workout-meal-plans/goal/:goal
 * @desc    Get plans by goal (User only)
 * @access  Private (User)
 */
router.get('/goal/:goal', authenticate, WorkoutMealPlanController.getPlansByGoal);

/**
 * @route   POST /api/v1/workout-meal-plans
 * @desc    Create or update workout meal plan
 * @access  Private
 */
router.post('/', authenticate, validate(createWorkoutMealPlanSchema), WorkoutMealPlanController.createOrUpdatePlan);

/**
 * @route   POST /api/v1/workout-meal-plans/generate-default
 * @desc    Generate default workout meal plans based on goal
 * @access  Private
 */
router.post('/generate-default', authenticate, validate(generateDefaultPlansSchema), WorkoutMealPlanController.generateDefaultPlans);

/**
 * @route   GET /api/v1/workout-meal-plans/:day
 * @desc    Get workout meal plan for specific day
 * @access  Private
 */
router.get('/:day', authenticate, WorkoutMealPlanController.getPlanByDay);

/**
 * @route   PUT /api/v1/workout-meal-plans/:day/completed
 * @desc    Update completed status for exercises or meals
 * @access  Private
 */
router.put('/:day/completed', authenticate, validate(updateCompletedStatusSchema), WorkoutMealPlanController.updateCompletedStatus);

/**
 * @route   DELETE /api/v1/workout-meal-plans/:day
 * @desc    Delete workout meal plan for specific day
 * @access  Private
 */
router.delete('/:day', authenticate, WorkoutMealPlanController.deletePlan);

export default router;