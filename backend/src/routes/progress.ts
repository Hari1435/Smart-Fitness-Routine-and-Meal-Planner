import { Router } from 'express';
import { ProgressController } from '../controllers/progressController';
import { authenticate } from '../middleware/auth';

const router = Router();

// Apply authentication middleware to all routes
router.use(authenticate);

/**
 * @route   GET /api/v1/progress/metrics
 * @desc    Get comprehensive progress metrics
 * @access  Private (User)
 */
router.get('/metrics', ProgressController.getProgressMetrics);

/**
 * @route   GET /api/v1/progress/dashboard
 * @desc    Get progress dashboard data
 * @access  Private (User)
 */
router.get('/dashboard', ProgressController.getProgressDashboard);

/**
 * @route   GET /api/v1/progress/weekly-report
 * @desc    Generate weekly progress report
 * @access  Private (User)
 */
router.get('/weekly-report', ProgressController.generateWeeklyReport);

/**
 * @route   GET /api/v1/progress/comparison
 * @desc    Get progress comparison between periods
 * @access  Private (User)
 * @query   start_date, end_date (optional)
 */
router.get('/comparison', ProgressController.getProgressComparison);

/**
 * @route   GET /api/v1/progress/streak
 * @desc    Get workout streak information
 * @access  Private (User)
 */
router.get('/streak', ProgressController.getWorkoutStreak);

/**
 * @route   GET /api/v1/progress/muscle-groups
 * @desc    Get muscle group progress breakdown
 * @access  Private (User)
 */
router.get('/muscle-groups', ProgressController.getMuscleGroupProgress);

/**
 * @route   GET /api/v1/progress/time-analytics
 * @desc    Get time-based analytics
 * @access  Private (User)
 */
router.get('/time-analytics', ProgressController.getTimeAnalytics);

/**
 * @route   POST /api/v1/progress/track-completion
 * @desc    Track exercise completion
 * @access  Private (User)
 */
router.post('/track-completion', ProgressController.trackExerciseCompletion);

export default router;