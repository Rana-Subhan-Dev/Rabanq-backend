/**
 * @file kyc.controller.js
 * @description Manages the full KYC (Know Your Customer) lifecycle.
 *              Users submit documents for identity verification.
 *              Admins review, approve, or reject KYC submissions.
 *              Documents are stored in AWS S3 via the upload controller.
 * @routes
 *   POST   /api/kyc/submit           → User submits KYC
 *   GET    /api/kyc/me               → User gets their own KYC status
 *   PUT    /api/kyc/me               → User updates pending KYC
 *   GET    /api/kyc                  → Admin: get all KYC submissions
 *   GET    /api/kyc/:id              → Admin: get single KYC by ID
 *   PUT    /api/kyc/:id/review       → Admin: approve or reject KYC
 */

import KYC from '../models/KYC.model.js';
import User from '../models/User.model.js';
import ActivityLog from '../models/ActivityLog.model.js';
//import logger from '../utils/logger.util.js';

// ─────────────────────────────────────────────
// @desc    Submit KYC documents for verification
// @access  Private (user)
// ─────────────────────────────────────────────
export const submitKYC = async (req, res, next) => {
  try {
    // A user can only have one KYC record — check for existing
    const existingKYC = await KYC.findOne({ user: req.user._id });
    if (existingKYC) {
      // If already approved, don't allow re-submission
      if (existingKYC.status === 'approved') {
        return res.status(409).json({
          success: false,
          message: 'Your KYC has already been approved.',
        });
      }
      // If pending, direct user to update instead
      if (existingKYC.status === 'pending') {
        return res.status(409).json({
          success: false,
          message: 'You already have a pending KYC submission. Use the update endpoint.',
        });
      }
    }

    const {
      documentType,
      documentNumber,
      documentFrontUrl,
      documentBackUrl,
      selfieUrl,
      dateOfBirth,
      nationality,
      address,
    } = req.body;

    const kyc = await KYC.create({
      user: req.user._id,
      documentType,
      documentNumber,
      documentFrontUrl,
      documentBackUrl,
      selfieUrl,
      dateOfBirth,
      nationality,
      address,
      status: 'pending',
    });

    // Update user's KYC status to pending
    await User.findByIdAndUpdate(req.user._id, { kycStatus: 'pending' });

    await ActivityLog.create({
      user: req.user._id,
      action: 'KYC_SUBMITTED',
      description: `KYC submitted with document type: ${documentType}`,
      ipAddress: req.ip,
    });

    logger.info(`KYC submitted by user: ${req.user._id}`);

    return res.status(201).json({
      success: true,
      message: 'KYC submitted successfully. Under review.',
      data: { kyc },
    });
  } catch (error) {
    logger.error(`submitKYC error: ${error.message}`);
    next(error);
  }
};

// ─────────────────────────────────────────────
// @desc    Get current user's KYC record and status
// @access  Private (user)
// ─────────────────────────────────────────────
export const getMyKYC = async (req, res, next) => {
  try {
    const kyc = await KYC.findOne({ user: req.user._id });

    if (!kyc) {
      return res.status(404).json({
        success: false,
        message: 'No KYC record found. Please submit your documents.',
      });
    }

    return res.status(200).json({
      success: true,
      data: { kyc },
    });
  } catch (error) {
    logger.error(`getMyKYC error: ${error.message}`);
    next(error);
  }
};

// ─────────────────────────────────────────────
// @desc    Update a rejected or incomplete KYC
// @access  Private (user)
// ─────────────────────────────────────────────
export const updateMyKYC = async (req, res, next) => {
  try {
    const kyc = await KYC.findOne({ user: req.user._id });

    if (!kyc) {
      return res.status(404).json({
        success: false,
        message: 'No KYC record found.',
      });
    }

    // Only allow updates if KYC is rejected or needs re-submission
    if (kyc.status === 'approved') {
      return res.status(403).json({
        success: false,
        message: 'Approved KYC cannot be modified.',
      });
    }

    const allowedUpdates = [
      'documentType', 'documentNumber', 'documentFrontUrl',
      'documentBackUrl', 'selfieUrl', 'dateOfBirth', 'nationality', 'address',
    ];

    allowedUpdates.forEach((field) => {
      if (req.body[field] !== undefined) kyc[field] = req.body[field];
    });

    // Reset to pending after update so admin reviews again
    kyc.status = 'pending';
    kyc.reviewNote = null;
    await kyc.save();

    await ActivityLog.create({
      user: req.user._id,
      action: 'KYC_UPDATED',
      description: 'User re-submitted KYC documents.',
      ipAddress: req.ip,
    });

    logger.info(`KYC updated by user: ${req.user._id}`);

    return res.status(200).json({
      success: true,
      message: 'KYC updated and re-submitted for review.',
      data: { kyc },
    });
  } catch (error) {
    logger.error(`updateMyKYC error: ${error.message}`);
    next(error);
  }
};

// ─────────────────────────────────────────────
// @desc    Admin: Get all KYC submissions with filters
// @access  Private (admin)
// ─────────────────────────────────────────────
export const getAllKYC = async (req, res, next) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;

    const filter = {};
    // Filter by status if provided (pending, approved, rejected)
    if (status) filter.status = status;

    const skip = (Number(page) - 1) * Number(limit);

    const [kycs, total] = await Promise.all([
      KYC.find(filter)
        .populate('user', 'firstName lastName email phone')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit)),
      KYC.countDocuments(filter),
    ]);

    return res.status(200).json({
      success: true,
      data: {
        kycs,
        pagination: {
          total,
          page: Number(page),
          limit: Number(limit),
          totalPages: Math.ceil(total / Number(limit)),
        },
      },
    });
  } catch (error) {
    logger.error(`getAllKYC error: ${error.message}`);
    next(error);
  }
};

// ─────────────────────────────────────────────
// @desc    Admin: Get single KYC by ID
// @access  Private (admin)
// ─────────────────────────────────────────────
export const getKYCById = async (req, res, next) => {
  try {
    const kyc = await KYC.findById(req.params.id).populate('user', 'firstName lastName email phone');

    if (!kyc) {
      return res.status(404).json({
        success: false,
        message: 'KYC record not found.',
      });
    }

    return res.status(200).json({
      success: true,
      data: { kyc },
    });
  } catch (error) {
    logger.error(`getKYCById error: ${error.message}`);
    next(error);
  }
};

// ─────────────────────────────────────────────
// @desc    Admin: Approve or reject a KYC submission
// @access  Private (admin)
// ─────────────────────────────────────────────
export const reviewKYC = async (req, res, next) => {
  try {
    const { status, reviewNote } = req.body;

    // Only valid transitions
    if (!['approved', 'rejected'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Status must be either approved or rejected.',
      });
    }

    const kyc = await KYC.findById(req.params.id);
    if (!kyc) {
      return res.status(404).json({
        success: false,
        message: 'KYC record not found.',
      });
    }

    kyc.status = status;
    kyc.reviewNote = reviewNote || null;
    kyc.reviewedBy = req.user._id;
    kyc.reviewedAt = new Date();
    await kyc.save();

    // Sync the KYC status back to the user document
    await User.findByIdAndUpdate(kyc.user, { kycStatus: status });

    await ActivityLog.create({
      user: req.user._id,
      action: `KYC_${status.toUpperCase()}`,
      description: `Admin ${status} KYC for user ${kyc.user}. Note: ${reviewNote || 'None'}`,
      ipAddress: req.ip,
    });

    logger.info(`KYC ${status} by admin ${req.user._id} for user ${kyc.user}`);

    return res.status(200).json({
      success: true,
      message: `KYC ${status} successfully.`,
      data: { kyc },
    });
  } catch (error) {
    logger.error(`reviewKYC error: ${error.message}`);
    next(error);
  }
};
