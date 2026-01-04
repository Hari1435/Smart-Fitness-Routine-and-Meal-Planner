import { Router } from 'express';
import { AuthController } from '../controllers/authController';
import { authenticate } from '../middleware/auth';
import { validate } from '../middleware/validation';
import {
  registerSchema,
  loginSchema,
  updateProfileSchema,
  updateGoalsSchema,
  changePasswordSchema,
  refreshTokenSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
} from '../validators/auth';

const router = Router();

/**
 * @route   POST /api/v1/auth/register
 * @desc    Register a new user
 * @access  Public
 */
router.post('/register', validate(registerSchema), AuthController.register);

/**
 * @route   POST /api/v1/auth/login
 * @desc    Login user
 * @access  Public
 */
router.post('/login', validate(loginSchema), AuthController.login);

/**
 * @route   POST /api/v1/auth/refresh-token
 * @desc    Refresh access token
 * @access  Public
 */
router.post('/refresh-token', validate(refreshTokenSchema), AuthController.refreshToken);

/**
 * @route   POST /api/v1/auth/logout
 * @desc    Logout user (client-side token removal)
 * @access  Private
 */
router.post('/logout', authenticate, AuthController.logout);

/**
 * @route   GET /api/v1/auth/profile
 * @desc    Get current user profile
 * @access  Private
 */
router.get('/profile', authenticate, AuthController.getProfile);

/**
 * @route   PUT /api/v1/auth/profile
 * @desc    Update user profile
 * @access  Private
 */
router.put('/profile', authenticate, validate(updateProfileSchema), AuthController.updateProfile);

/**
 * @route   PUT /api/v1/auth/goals
 * @desc    Update user fitness goals
 * @access  Private
 */
router.put('/goals', authenticate, validate(updateGoalsSchema), AuthController.updateGoals);

/**
 * @route   PUT /api/v1/auth/change-password
 * @desc    Change user password
 * @access  Private
 */
router.put('/change-password', authenticate, validate(changePasswordSchema), AuthController.changePassword);

/**
 * @route   GET /api/v1/auth/validate-token
 * @desc    Validate access token
 * @access  Private
 */
router.get('/validate-token', authenticate, AuthController.validateToken);

/**
 * @route   POST /api/v1/auth/forgot-password
 * @desc    Request password reset
 * @access  Public
 */
router.post('/forgot-password', validate(forgotPasswordSchema), AuthController.requestPasswordReset);

/**
 * @route   GET /api/v1/auth/verify-reset-token/:token
 * @desc    Verify password reset token
 * @access  Public
 */
router.get('/verify-reset-token/:token', AuthController.verifyResetToken);

/**
 * @route   POST /api/v1/auth/reset-password
 * @desc    Reset password with token
 * @access  Public
 */
router.post('/reset-password', validate(resetPasswordSchema), AuthController.resetPassword);

/**
 * @route   POST /api/v1/auth/test-email-config
 * @desc    Test email configuration (temporary debugging endpoint)
 * @access  Public
 */
router.post('/test-email-config', AuthController.testEmailConfig);

export default router;