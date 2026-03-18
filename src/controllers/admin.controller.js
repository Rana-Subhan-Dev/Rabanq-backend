/**
 * @file admin.controller.js
 * @description Admin-only operations for platform management.
 *              Covers dashboard statistics, user management,
 *              and platform health overview.
 * @routes
 *   GET  /api/admin/dashboard         → Platform overview stats
 *   GET  /api/admin/users             → Get all users
 *   GET  /api/admin/users/:id         → Get user by ID
 *   PUT  /api/admin/users/:id/role    → Update user role
 *   PUT  /api/admin/users/:id/status  → Update user status
 *   DELETE /api/admin/users/:id       → Hard delete user (admin only)
 */

import User from '../models/User.model.js';
import Account from '../models/Account.model.js';
import Transaction from '../models/Transaction.model.js';
import KYC from '../models/KYC.model.js';
import ActivityLog from '../models/ActivityLog.model.js';
import logger from '../utils/logger.util.js';

// ─────────────────────────────────────────────
// @desc    Get platform dashboard statistics
// @access  Private (admin)
// ─────────────────────────────────────────────
export const getDashboardStats = async (req, res, next) => {
  try {
    // Run all stat queries in parallel for performance
    const [
      totalUsers,
      activeUsers,
      totalTransactions,
      totalTransactionVolume,
      pendingKYC,
      approvedKYC,
      rejectedKYC,
      totalAccounts,
      frozenAccounts,
    ] = await Promise.all([
      User.countDocuments({ status: { $ne: 'deleted' } }),
      User.countDocuments({ status: 'active' }),
      Transaction.countDocuments(),
      Transaction.aggregate([
        { $match: { status: 'completed' } },
        { $group: { _id: null, total: { $sum: '$amount' } } },
      ]),
      KYC.countDocuments({ status: 'pending' }),
      KYC.countDocuments({ status: 'approved' }),
      KYC.countDocuments({ status: 'rejected' }),
      Account.countDocuments(),
      Account.countDocuments({ status: 'frozen' }),
    ]);

    return res.status(200).json({
      success: true,
      data: {
        users: { total: totalUsers, active: activeUsers },
        transactions: {
          total: totalTransactions,
          volume: totalTransactionVolume[0]?.total || 0,
        },
        kyc: { pending: pendingKYC, approved: approvedKYC, rejected: rejectedKYC },
        accounts: { total: totalAccounts, frozen: frozenAccounts },
      },
    });
  } catch (error) {
    logger.error(`getDashboardStats error: ${error.message}`);
    next(error);
  }
};

// ─────────────────────────────────────────────
// @desc    Admin: Get all users with pagination and filters
// @access  Private (admin)
// ─────────────────────────────────────────────
export const getAllUsers = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, status, role, search } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const filter = { status: { $ne: 'deleted' } };
    if (status) filter.status = status;
    if (role) filter.role = role;

    // Search by name or email
    if (search) {
      filter.$or = [
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
      ];
    }

    const [users, total] = await Promise.all([
      User.find(filter)
        .select('-password -refreshToken')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit)),
      User.countDocuments(filter),
    ]);

    return res.status(200).json({
      success: true,
      data: {
        users,
        pagination: {
          total,
          page: Number(page),
          limit: Number(limit),
          totalPages: Math.ceil(total / Number(limit)),
        },
      },
    });
  } catch (error) {
    logger.error(`getAllUsers error: ${error.message}`);
    next(error);
  }
};

// ─────────────────────────────────────────────
// @desc    Admin: Get a single user with their account and KYC
// @access  Private (admin)
// ─────────────────────────────────────────────
export const getUserById = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id).select('-password -refreshToken');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found.',
      });
    }

    // Fetch linked account and KYC in parallel
    const [account, kyc] = await Promise.all([
      Account.findOne({ user: user._id }),
      KYC.findOne({ user: user._id }),
    ]);

    return res.status(200).json({
      success: true,
      data: { user, account, kyc },
    });
  } catch (error) {
    logger.error(`getUserById error: ${error.message}`);
    next(error);
  }
};

// ─────────────────────────────────────────────
// @desc    Admin: Update a user's role
// @access  Private (admin)
// ─────────────────────────────────────────────
export const updateUserRole = async (req, res, next) => {
  try {
    const { role } = req.body;

    const validRoles = ['user', 'admin', 'support'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({
        success: false,
        message: `Invalid role. Must be one of: ${validRoles.join(', ')}`,
      });
    }

    // Prevent admin from changing their own role
    if (req.params.id === req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'You cannot change your own role.',
      });
    }

    const user = await User.findByIdAndUpdate(
      req.params.id,
      { role },
      { new: true }
    ).select('-password -refreshToken');

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    await ActivityLog.create({
      user: req.user._id,
      action: 'USER_ROLE_UPDATED',
      description: `Admin updated user ${req.params.id} role to ${role}`,
      ipAddress: req.ip,
    });

    logger.info(`User ${req.params.id} role updated to ${role} by admin ${req.user._id}`);

    return res.status(200).json({
      success: true,
      message: 'User role updated.',
      data: { user },
    });
  } catch (error) {
    logger.error(`updateUserRole error: ${error.message}`);
    next(error);
  }
};

// ─────────────────────────────────────────────
// @desc    Admin: Update a user's status (suspend, ban, activate)
// @access  Private (admin)
// ─────────────────────────────────────────────
export const updateUserStatus = async (req, res, next) => {
  try {
    const { status, reason } = req.body;

    const validStatuses = ['active', 'suspended', 'banned'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status. Must be one of: ${validStatuses.join(', ')}`,
      });
    }

    if (req.params.id === req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'You cannot change your own status.',
      });
    }

    const user = await User.findByIdAndUpdate(
      req.params.id,
      { status, statusReason: reason || null },
      { new: true }
    ).select('-password -refreshToken');

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    await ActivityLog.create({
      user: req.user._id,
      action: `USER_${status.toUpperCase()}`,
      description: `Admin set user ${req.params.id} status to ${status}. Reason: ${reason || 'None'}`,
      ipAddress: req.ip,
    });

    logger.info(`User ${req.params.id} status updated to ${status} by admin ${req.user._id}`);

    return res.status(200).json({
      success: true,
      message: `User ${status} successfully.`,
      data: { user },
    });
  } catch (error) {
    logger.error(`updateUserStatus error: ${error.message}`);
    next(error);
  }
};

// ─────────────────────────────────────────────
// @desc    Admin: Hard delete a user record
// @access  Private (admin)
// ─────────────────────────────────────────────
export const deleteUser = async (req, res, next) => {
  try {
    if (req.params.id === req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'You cannot delete your own account.',
      });
    }

    const user = await User.findByIdAndDelete(req.params.id);

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    await ActivityLog.create({
      user: req.user._id,
      action: 'USER_DELETED',
      description: `Admin hard-deleted user ${req.params.id} (${user.email})`,
      ipAddress: req.ip,
    });

    logger.warn(`User ${req.params.id} hard-deleted by admin ${req.user._id}`);

    return res.status(200).json({
      success: true,
      message: 'User deleted successfully.',
    });
  } catch (error) {
    logger.error(`deleteUser error: ${error.message}`);
    next(error);
  }
};
