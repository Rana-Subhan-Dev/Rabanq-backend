/**
 * @file transaction.routes.js
 * @description Routes for financial transaction operations.
 *              Users can initiate and view their own transactions.
 *              Admins can view all transactions and update statuses.
 * @prefix /api/transactions
 */

import { Router } from 'express';
import {
  createTransaction,
  getMyTransactions,
  getTransactionById,
  getAllTransactions,
  updateTransactionStatus,
} from '../controllers/transaction.controller.js';
import { protect, restrictTo } from '../middleware/auth.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import {
  createTransactionRules,
  updateTransactionStatusRules,
} from '../middleware/validators/transaction.validator.js';

const router = Router();

// All transaction routes require authentication
router.use(protect);

// ─── USER TRANSACTION ROUTES ──────────────────────────────────────────────────

// POST /api/transactions
router.post('/', createTransactionRules, validate, createTransaction);

// GET  /api/transactions/me
router.get('/me', getMyTransactions);

// GET  /api/transactions/:id  (user can only access their own — enforced in controller)
router.get('/:id', getTransactionById);

// ─── ADMIN TRANSACTION ROUTES ─────────────────────────────────────────────────

// GET  /api/transactions      (admin only — all transactions)
router.get('/', restrictTo('admin'), getAllTransactions);

// PUT  /api/transactions/:id/status  (admin only)
router.put('/:id/status', restrictTo('admin'), updateTransactionStatusRules, validate, updateTransactionStatus);

export default router;
