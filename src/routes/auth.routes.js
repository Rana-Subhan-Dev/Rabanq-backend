/**
 * @file auth.routes.js
 * @description Express routes for authentication flows.
 *              Public routes (register, login, refresh) require no token.
 *              Logout requires a valid access token.
 * @prefix /api/auth
 */

import { Router } from 'express';
import {
  register,
  login,
  logout,
  refreshToken,
} from '../controllers/auth.controller.js';
import { protect } from '../middleware/auth.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import { registerRules, loginRules, refreshTokenRules } from '../middleware/validators/auth.validator.js';

const router = Router();

// ─── PUBLIC ROUTES ────────────────────────────────────────────────────────────

// POST /api/auth/register
router.post('/register', registerRules, validate, register);

// POST /api/auth/login
router.post('/login', loginRules, validate, login);

// POST /api/auth/refresh-token
router.post('/refresh-token', refreshTokenRules, validate, refreshToken);

// ─── PROTECTED ROUTES ─────────────────────────────────────────────────────────

// POST /api/auth/logout  (requires valid access token)
router.post('/logout', protect, logout);

export default router;
