/**
 * @file account.controller.js
 * @description Manages bank account operations for Rabanq users.
 *              Each user has one primary account auto-created on registration.
 *              Covers balance fetching, account details, and admin management.
 * @routes
 *   GET  /api/accounts/me              → Get current user's account
 *   GET  /api/accounts                 → Admin: get all accounts
 *   GET  /api/accounts/:id             → Admin: get account by ID
 *   PUT  /api/accounts/:id/status      → Admin: freeze or activate account
 */

import Account from '../models/Account.model.js';
import ActivityLog from '../models/ActivityLog.model.js';
import logger from '../utils/logger.util.js';

// ─────────────────────────────────────────────
// @desc    Get current user's account details + balance
// @access  Private (user)
// ─────────────────────────────────────────────
export const getMyAccount = async (req, res, next) => {
  try {
    const account = await Account.findOne({ user: req.user._id })
      .populate('user', 'firstName lastName email');

    if (!account) {
      return res.status(404).json({
        success: false,
        message: 'Account not found.',
      });
    }

    return res.status(200).json({
      success: true,
      data: { account },
    });
  } catch (error) {
    logger.error(`getMyAccount error: ${error.message}`);
    next(error);
  }
};

// ─────────────────────────────────────────────
// @desc    Admin: Get all accounts with pagination
// @access  Private (admin)
// ─────────────────────────────────────────────
export const getAllAccounts = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, status } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const filter = {};
    if (status) filter.status = status;

    const [accounts, total] = await Promise.all([
      Account.find(filter)
        .populate('user', 'firstName lastName email phone kycStatus')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit)),
      Account.countDocuments(filter),
    ]);

    return res.status(200).json({
      success: true,
      data: {
        accounts,
        pagination: {
          total,
          page: Number(page),
          limit: Number(limit),
          totalPages: Math.ceil(total / Number(limit)),
        },
      },
    });
  } catch (error) {
    logger.error(`getAllAccounts error: ${error.message}`);
    next(error);
  }
};

// ─────────────────────────────────────────────
// @desc    Admin: Get a single account by ID
// @access  Private (admin)
// ─────────────────────────────────────────────
export const getAccountById = async (req, res, next) => {
  try {
    const account = await Account.findById(req.params.id)
      .populate('user', 'firstName lastName email phone kycStatus status');

    if (!account) {
      return res.status(404).json({
        success: false,
        message: 'Account not found.',
      });
    }

    return res.status(200).json({
      success: true,
      data: { account },
    });
  } catch (error) {
    logger.error(`getAccountById error: ${error.message}`);
    next(error);
  }
};

// ─────────────────────────────────────────────
// @desc    Admin: Freeze or activate an account
// @access  Private (admin)
// ─────────────────────────────────────────────
export const updateAccountStatus = async (req, res, next) => {
  try {
    const { status, reason } = req.body;

    const validStatuses = ['active', 'frozen', 'suspended', 'closed'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status. Must be one of: ${validStatuses.join(', ')}`,
      });
    }

    const account = await Account.findByIdAndUpdate(
      req.params.id,
      { status, statusReason: reason || null, updatedBy: req.user._id },
      { new: true, runValidators: true }
    ).populate('user', 'firstName lastName email');

    if (!account) {
      return res.status(404).json({
        success: false,
        message: 'Account not found.',
      });
    }

    await ActivityLog.create({
      user: req.user._id,
      action: `ACCOUNT_${status.toUpperCase()}`,
      description: `Admin set account ${account._id} to ${status}. Reason: ${reason || 'None'}`,
      ipAddress: req.ip,
    });

    logger.info(`Account ${account._id} status updated to ${status} by admin ${req.user._id}`);

    return res.status(200).json({
      success: true,
      message: `Account ${status} successfully.`,
      data: { account },
    });
  } catch (error) {
    logger.error(`updateAccountStatus error: ${error.message}`);
    next(error);
  }
};
