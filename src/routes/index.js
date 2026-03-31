/**
 * @file routes/index.js
 * Central route aggregator
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

router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/kyc', kycRoutes);
router.use('/transactions', transactionRoutes);
router.use('/accounts', accountRoutes);
router.use('/activity', activityRoutes);
router.use('/upload', uploadRoutes);
router.use('/admin', adminRoutes);

export default router;