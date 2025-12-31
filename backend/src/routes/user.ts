import { Router } from 'express';
import { UserController } from '../controllers/userController';
import { authenticate, checkResourceOwnership } from '../middleware/auth';
import { validate } from '../middleware/validation';
import { updateProfileSchema } from '../validators/auth';

const router = Router();

/**
 * @route   GET /api/v1/users/check-email
 * @desc    Check if email exists
 * @access  Public
 */
router.get('/check-email', UserController.checkEmailExists);

/**
 * @route   GET /api/v1/users/:id
 * @desc    Get user by ID (own profile only)
 * @access  Private
 */
router.get('/:id', authenticate, checkResourceOwnership('id'), UserController.getUserById);

/**
 * @route   PUT /api/v1/users/:id
 * @desc    Update user (own profile only)
 * @access  Private
 */
router.put('/:id', authenticate, checkResourceOwnership('id'), validate(updateProfileSchema), UserController.updateUser);

/**
 * @route   DELETE /api/v1/users/:id
 * @desc    Delete user (own profile only)
 * @access  Private
 */
router.delete('/:id', authenticate, checkResourceOwnership('id'), UserController.deleteUser);

export default router;