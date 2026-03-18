/**
 * @file kyc.routes.js
 * @description Routes for KYC document submission and admin review.
 *              User routes: submit, view, and update own KYC.
 *              Admin routes: list all, view one, approve/reject.
 * @prefix /api/kyc
 */

import { Router } from 'express';
import {
  submitKYC,
  getMyKYC,
  updateMyKYC,
  getAllKYC,
  getKYCById,
  reviewKYC,
} from '../controllers/kyc.controller.js';
import { protect, restrictTo } from '../middleware/auth.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import { submitKYCRules, reviewKYCRules } from '../middleware/validators/kyc.validator.js';

const router = Router();

// All KYC routes require authentication
router.use(protect);

// ─── USER KYC ROUTES ──────────────────────────────────────────────────────────

// POST /api/kyc/submit
router.post('/submit', submitKYCRules, validate, submitKYC);

// GET  /api/kyc/me
router.get('/me', getMyKYC);

// PUT  /api/kyc/me
router.put('/me', submitKYCRules, validate, updateMyKYC);

// ─── ADMIN KYC ROUTES ─────────────────────────────────────────────────────────

// GET  /api/kyc             (admin only)
router.get('/', restrictTo('admin', 'support'), getAllKYC);

// GET  /api/kyc/:id         (admin only)
router.get('/:id', restrictTo('admin', 'support'), getKYCById);

// PUT  /api/kyc/:id/review  (admin only)
router.put('/:id/review', restrictTo('admin'), reviewKYCRules, validate, reviewKYC);

export default router;
