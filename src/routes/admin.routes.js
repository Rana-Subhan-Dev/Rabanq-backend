/**
 * @file admin.routes.js
 * @description Admin-only routes for platform management.
 *              All routes in this file require admin role.
 *              Covers dashboard stats and full user management.
 * @prefix /api/admin
 */

import { Router } from 'express';
import {
  getDashboardStats,
  getAllUsers,
  getUserById,
  updateUserRole,
  updateUserStatus,
  deleteUser,
} from '../controllers/admin.controller.js';
import { protect, restrictTo } from '../middleware/auth.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import {
  updateUserRoleRules,
  updateUserStatusRules,
} from '../middleware/validators/admin.validator.js';

const router = Router();

// Lock entire admin router to admin role only
router.use(protect, restrictTo('admin'));

// GET  /api/admin/dashboard
router.get('/dashboard', getDashboardStats);

// GET  /api/admin/users
router.get('/users', getAllUsers);

// GET  /api/admin/users/:id
router.get('/users/:id', getUserById);

// PUT  /api/admin/users/:id/role
router.put('/users/:id/role', updateUserRoleRules, validate, updateUserRole);

// PUT  /api/admin/users/:id/status
router.put('/users/:id/status', updateUserStatusRules, validate, updateUserStatus);

// DELETE /api/admin/users/:id
router.delete('/users/:id', deleteUser);

export default router;
