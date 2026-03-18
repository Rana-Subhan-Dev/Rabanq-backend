/**
 * @file routes/index.js
 * @description Central route aggregator for Rabanq backend.
 *              All domain routers are registered here and exported
 *              as a single mountable Express router.
 *              Mount this in src/index.js with: app.use('/api', routes)
 *
 * @routes summary:
 *   /api/auth          → Authentication (register, login, logout, refresh)
 *   /api/users         → User profile management
 *   /api/kyc           → KYC document submission and admin review
 *   /api/transactions  → Financial transfers and history
 *   /api/accounts      → Bank account management
 *   /api/activity      → Activity / audit log
 *   /api/upload        → AWS S3 file upload
 *   /api/admin         → Admin dashboard and user management
 */

import { Router } from 'express';
import authRoutes from './auth.routes.js';
import userRoutes from './user.routes.js';
import kycRoutes from './kyc.routes.js';
import transactionRoutes from './transaction.routes.js';
import accountRoutes from './account.routes.js';
import activityRoutes from './activity.routes.js';
import uploadRoutes from './upload.routes.js';
import adminRoutes from './admin.routes.js';

const router = Router();

// ─── MOUNT ALL DOMAIN ROUTES ──────────────────────────────────────────────────
router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/kyc', kycRoutes);
router.use('/transactions', transactionRoutes);
router.use('/accounts', accountRoutes);
router.use('/activity', activityRoutes);
router.use('/upload', uploadRoutes);
router.use('/admin', adminRoutes);

export default router;
