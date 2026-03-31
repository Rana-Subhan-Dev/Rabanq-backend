/**
 * @file account.routes.js
 * @description Routes for bank account management.
 *              Users can view their own account.
 *              Admins can list all accounts and change account status.
 * @prefix /api/accounts
 */

import { Router } from 'express';
import {
  getMyAccount,
  getAllAccounts,
  getAccountById,
  updateAccountStatus,
} from '../controllers/account.controller.js';
import { protect, restrictTo } from '../middleware/auth.js';
import { validate } from '../middleware/validate.middleware.js';
import { updateAccountStatusRules } from '../middleware/validators/account.validator.js';

const router = Router();

router.use(protect);

// ─── USER ACCOUNT ROUTES ──────────────────────────────────────────────────────

// GET /api/accounts/me
router.get('/me', getMyAccount);

// ─── ADMIN ACCOUNT ROUTES ─────────────────────────────────────────────────────

// GET /api/accounts             (admin only)
router.get('/', restrictTo('admin'), getAllAccounts);

// GET /api/accounts/:id         (admin only)
router.get('/:id', restrictTo('admin'), getAccountById);

// PUT /api/accounts/:id/status  (admin only)
router.put('/:id/status', restrictTo('admin'), updateAccountStatusRules, validate, updateAccountStatus);

export default router
