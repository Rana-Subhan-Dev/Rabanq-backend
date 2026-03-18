/**
 * @file user.controller.js
 * @description Manages authenticated user profile operations.
 *              Covers fetching profile, updating personal info,
 *              changing password, and soft-deleting account.
 * @routes
 *   GET    /api/users/me
 *   PUT    /api/users/me
 *   PUT    /api/users/me/change-password
 *   DELETE /api/users/me
 */

import User from '../models/User.model.js';
import ActivityLog from '../models/ActivityLog.model.js';
import bcrypt from 'bcryptjs';
import logger from '../utils/logger.util.js';

// ─────────────────────────────────────────────
// @desc    Get current authenticated user profile
// @access  Private
// ─────────────────────────────────────────────
export const getMe = async (req, res, next) => {
  try {
    // req.user is attached by the auth middleware after token verification
    const user = await User.findById(req.user._id).select('-password -refreshToken');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found.',
      });
    }

    return res.status(200).json({
      success: true,
      data: { user },
    });
  } catch (error) {
    logger.error(`getMe error: ${error.message}`);
    next(error);
  }
};

// ─────────────────────────────────────────────
// @desc    Update current user's profile info
// @access  Private
// ─────────────────────────────────────────────
export const updateProfile = async (req, res, next) => {
  try {
    // Only allow safe fields to be updated — never email or role via this route
    const allowedFields = ['firstName', 'lastName', 'phone', 'address', 'dateOfBirth', 'profileImage'];
    const updates = {};

    allowedFields.forEach((field) => {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    });

    const user = await User.findByIdAndUpdate(
      req.user._id,
      { $set: updates },
      { new: true, runValidators: true }
    ).select('-password -refreshToken');

    await ActivityLog.create({
      user: req.user._id,
      action: 'PROFILE_UPDATED',
      description: `User updated profile fields: ${Object.keys(updates).join(', ')}`,
      ipAddress: req.ip,
    });

    logger.info(`Profile updated for user: ${req.user._id}`);

    return res.status(200).json({
      success: true,
      message: 'Profile updated successfully.',
      data: { user },
    });
  } catch (error) {
    logger.error(`updateProfile error: ${error.message}`);
    next(error);
  }
};

// ─────────────────────────────────────────────
// @desc    Change authenticated user's password
// @access  Private
// ─────────────────────────────────────────────
export const changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;

    // Fetch user with password field (excluded by default)
    const user = await User.findById(req.user._id).select('+password');

    // Verify the current password before allowing change
    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res.status(400).json({
        success: false,
        message: 'Current password is incorrect.',
      });
    }

    // Hash the new password
    user.password = await bcrypt.hash(newPassword, 12);
    await user.save();

    await ActivityLog.create({
      user: req.user._id,
      action: 'PASSWORD_CHANGED',
      description: 'User changed their password.',
      ipAddress: req.ip,
    });

    logger.info(`Password changed for user: ${req.user._id}`);

    return res.status(200).json({
      success: true,
      message: 'Password changed successfully.',
    });
  } catch (error) {
    logger.error(`changePassword error: ${error.message}`);
    next(error);
  }
};

// ─────────────────────────────────────────────
// @desc    Soft-delete current user account
// @access  Private
// ─────────────────────────────────────────────
export const deleteAccount = async (req, res, next) => {
  try {
    // Soft delete — mark as deleted instead of hard remove to preserve audit trail
    await User.findByIdAndUpdate(req.user._id, {
      status: 'deleted',
      deletedAt: new Date(),
      refreshToken: null,
    });

    await ActivityLog.create({
      user: req.user._id,
      action: 'ACCOUNT_DELETED',
      description: 'User deleted their account (soft delete).',
      ipAddress: req.ip,
    });

    logger.warn(`Account soft-deleted: ${req.user._id}`);

    return res.status(200).json({
      success: true,
      message: 'Account deleted successfully.',
    });
  } catch (error) {
    logger.error(`deleteAccount error: ${error.message}`);
    next(error);
  }
};
