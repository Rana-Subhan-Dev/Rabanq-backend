/**
 * @file activity.controller.js
 * @description Handles retrieval of activity/audit logs.
 *              Users can view their own activity trail.
 *              Admins can view all platform activity with filters.
 *              Activity logs are written by all other controllers automatically.
 * @routes
 *   GET /api/activity/me     → Current user's activity log
 *   GET /api/activity        → Admin: all activity logs
 */

import ActivityLog from '../models/ActivityLog.model.js';
import logger from '../utils/logger.util.js';

// ─────────────────────────────────────────────
// @desc    Get current user's activity history
// @access  Private (user)
// ─────────────────────────────────────────────
export const getMyActivity = async (req, res, next) => {
  try {
    const { page = 1, limit = 30, action } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const filter = { user: req.user._id };
    // Allow filtering by action type (e.g. TRANSACTION_CREATED, KYC_SUBMITTED)
    if (action) filter.action = action;

    const [logs, total] = await Promise.all([
      ActivityLog.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit)),
      ActivityLog.countDocuments(filter),
    ]);

    return res.status(200).json({
      success: true,
      data: {
        logs,
        pagination: {
          total,
          page: Number(page),
          limit: Number(limit),
          totalPages: Math.ceil(total / Number(limit)),
        },
      },
    });
  } catch (error) {
    logger.error(`getMyActivity error: ${error.message}`);
    next(error);
  }
};

// ─────────────────────────────────────────────
// @desc    Admin: Get all platform activity logs
// @access  Private (admin)
// ─────────────────────────────────────────────
export const getAllActivity = async (req, res, next) => {
  try {
    const { page = 1, limit = 50, action, userId, from, to } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const filter = {};
    if (action) filter.action = action;
    if (userId) filter.user = userId;

    // Date range filter for audit purposes
    if (from || to) {
      filter.createdAt = {};
      if (from) filter.createdAt.$gte = new Date(from);
      if (to) filter.createdAt.$lte = new Date(to);
    }

    const [logs, total] = await Promise.all([
      ActivityLog.find(filter)
        .populate('user', 'firstName lastName email role')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit)),
      ActivityLog.countDocuments(filter),
    ]);

    return res.status(200).json({
      success: true,
      data: {
        logs,
        pagination: {
          total,
          page: Number(page),
          limit: Number(limit),
          totalPages: Math.ceil(total / Number(limit)),
        },
      },
    });
  } catch (error) {
    logger.error(`getAllActivity error: ${error.message}`);
    next(error);
  }
};
