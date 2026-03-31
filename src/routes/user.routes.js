/**
 * @file user.routes.js
 * @description Routes for authenticated user profile management.
 *              All routes require a valid JWT access token.
 * @prefix /api/users
 */

import { Router } from 'express';
import {
  getMe,
  updateProfile,
  changePassword,
  deleteAccount,
} from '../controllers/user.controller.js';
import { protect } from '../middleware/auth.js';
import { validate } from '../middleware/validate.middleware.js';
import {
  updateProfileRules,
  changePasswordRules,
} from '../middleware/validators/user.validator.js';

const router = Router();

// All user routes are protected — apply protect middleware at router level
router.use(protect);

// GET  /api/users/me
router.get('/me', getMe);

// PUT  /api/users/me
router.put('/me', updateProfileRules, validate, updateProfile);

// PUT  /api/users/me/change-password
router.put('/me/change-password', changePasswordRules, validate, changePassword);

// DELETE /api/users/me
router.delete('/me', deleteAccount);

export default router
