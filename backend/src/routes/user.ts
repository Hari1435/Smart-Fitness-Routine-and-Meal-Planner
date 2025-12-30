import { Router } from 'express';
import { UserController } from '../controllers/userController';
import { authenticate, authorize, checkResourceOwnership } from '../middleware/auth';
import { validate, validatePagination } from '../middleware/validation';
import { updateProfileSchema } from '../validators/auth';

const router = Router();

/**
 * @route   GET /api/v1/users
 * @desc    Get all users (Admin only)
 * @access  Private (Admin)
 */
router.get('/', authenticate, authorize('admin'), validatePagination, UserController.getAllUsers);

/**
 * @route   GET /api/v1/users/statistics
 * @desc    Get user statistics (Admin only)
 * @access  Private (Admin)
 */
router.get('/statistics', authenticate, authorize('admin'), UserController.getUserStatistics);

/**
 * @route   GET /api/v1/users/search
 * @desc    Search users (Admin only)
 * @access  Private (Admin)
 */
router.get('/search', authenticate, authorize('admin'), validatePagination, UserController.searchUsers);

/**
 * @route   GET /api/v1/users/check-email
 * @desc    Check if email exists
 * @access  Public
 */
router.get('/check-email', UserController.checkEmailExists);

/**
 * @route   GET /api/v1/users/:id
 * @desc    Get user by ID (Admin or own profile)
 * @access  Private
 */
router.get('/:id', authenticate, checkResourceOwnership('id'), UserController.getUserById);

/**
 * @route   PUT /api/v1/users/:id
 * @desc    Update user (Admin or own profile)
 * @access  Private
 */
router.put('/:id', authenticate, checkResourceOwnership('id'), validate(updateProfileSchema), UserController.updateUser);

/**
 * @route   DELETE /api/v1/users/:id
 * @desc    Delete user (Admin or own profile)
 * @access  Private
 */
router.delete('/:id', authenticate, checkResourceOwnership('id'), UserController.deleteUser);

export default router;