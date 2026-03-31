/**
 * @file activity.routes.js
 * @description Routes for activity/audit log retrieval.
 *              Users can view their own activity trail.
 *              Admins can query all platform activity with filters.
 * @prefix /api/activity
 */

import { Router } from 'express';
import {
  getMyActivity,
  getAllActivity,
} from '../controllers/activity.controller.js';
import { protect, restrictTo } from '../middleware/auth.js';

const router = Router();

router.use(protect);

// GET /api/activity/me
router.get('/me', getMyActivity);

// GET /api/activity   (admin only)
router.get('/', restrictTo('admin', 'support'), getAllActivity);

export default router
