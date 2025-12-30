import { Router } from 'express';
import { WorkoutController } from '../controllers/workoutController';
import { authenticate } from '../middleware/auth';

const router = Router();

// Apply authentication middleware to all routes
router.use(authenticate);

/**
 * @route   POST /api/v1/workouts/generate
 * @desc    Generate personalized workout routine
 * @access  Private (User)
 */
router.post('/generate', WorkoutController.generatePersonalizedRoutine);

/**
 * @route   GET /api/v1/workouts/progress
 * @desc    Get workout progress analytics
 * @access  Private (User)
 */
router.get('/progress', WorkoutController.getWorkoutProgress);

/**
 * @route   GET /api/v1/workouts/recommendations
 * @desc    Get exercise recommendations
 * @access  Private (User)
 */
router.get('/recommendations', WorkoutController.getExerciseRecommendations);

/**
 * @route   POST /api/v1/workouts/adjust-intensity
 * @desc    Adjust workout intensity based on progress
 * @access  Private (User)
 */
router.post('/adjust-intensity', WorkoutController.adjustWorkoutIntensity);

/**
 * @route   GET /api/v1/workouts/statistics
 * @desc    Get workout statistics
 * @access  Private (User)
 */
router.get('/statistics', WorkoutController.getWorkoutStatistics);

/**
 * @route   POST /api/v1/workouts/reset-progress
 * @desc    Reset workout progress
 * @access  Private (User)
 */
router.post('/reset-progress', WorkoutController.resetWorkoutProgress);

/**
 * @route   GET /api/v1/workouts
 * @desc    Get all workout plans for user
 * @access  Private (User)
 */
router.get('/', WorkoutController.getAllWorkouts);

/**
 * @route   GET /api/v1/workouts/:day
 * @desc    Get workout plan for specific day
 * @access  Private (User)
 */
router.get('/:day', WorkoutController.getWorkoutByDay);

/**
 * @route   PUT /api/v1/workouts/:day
 * @desc    Update workout plan for specific day
 * @access  Private (User)
 */
router.put('/:day', WorkoutController.updateWorkoutPlan);

/**
 * @route   DELETE /api/v1/workouts/:day
 * @desc    Delete workout plan for specific day
 * @access  Private (User)
 */
router.delete('/:day', WorkoutController.deleteWorkoutPlan);

/**
 * @route   POST /api/v1/workouts/:day/complete-exercise
 * @desc    Mark exercise as completed/incomplete
 * @access  Private (User)
 */
router.post('/:day/complete-exercise', WorkoutController.markExerciseCompleted);

export default router;