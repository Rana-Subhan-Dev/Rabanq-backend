/**
 * @file transaction.controller.js
 * @description Handles all financial transaction operations.
 *              Supports transfers between accounts, transaction history,
 *              and admin-level transaction management.
 *              Uses atomic MongoDB session operations to prevent partial transfers.
 * @routes
 *   POST   /api/transactions              → Initiate a transfer
 *   GET    /api/transactions/me           → Get current user's transactions
 *   GET    /api/transactions/:id          → Get single transaction
 *   GET    /api/transactions              → Admin: get all transactions
 *   PUT    /api/transactions/:id/status   → Admin: update transaction status
 */

import Transaction from '../models/Transaction.model.js';
import Account from '../models/Account.model.js';
import ActivityLog from '../models/ActivityLog.model.js';
import mongoose from 'mongoose';
//import logger from '../utils/logger.util.js';

// ─────────────────────────────────────────────
// @desc    Create a new transaction (transfer funds)
// @access  Private (user)
// ─────────────────────────────────────────────
export const createTransaction = async (req, res, next) => {
  // Start a Mongoose session for atomic operations
  // If anything fails mid-transfer, the entire operation is rolled back
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { toAccountNumber, amount, description, type } = req.body;

    // Validate minimum transfer amount
    if (amount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Transfer amount must be greater than zero.',
      });
    }

    // Find sender's account
    const senderAccount = await Account.findOne({ user: req.user._id }).session(session);
    if (!senderAccount) {
      await session.abortTransaction();
      return res.status(404).json({
        success: false,
        message: 'Sender account not found.',
      });
    }

    // Check sufficient balance
    if (senderAccount.balance < amount) {
      await session.abortTransaction();
      return res.status(400).json({
        success: false,
        message: 'Insufficient balance.',
      });
    }

    // Find receiver's account by account number
    const receiverAccount = await Account.findOne({ accountNumber: toAccountNumber }).session(session);
    if (!receiverAccount) {
      await session.abortTransaction();
      return res.status(404).json({
        success: false,
        message: 'Recipient account not found.',
      });
    }

    // Prevent self-transfers
    if (senderAccount._id.equals(receiverAccount._id)) {
      await session.abortTransaction();
      return res.status(400).json({
        success: false,
        message: 'Cannot transfer to your own account.',
      });
    }

    // Debit sender — atomic
    senderAccount.balance -= amount;
    await senderAccount.save({ session });

    // Credit receiver — atomic
    receiverAccount.balance += amount;
    await receiverAccount.save({ session });

    // Record the transaction
    const transaction = await Transaction.create(
      [{
        fromAccount: senderAccount._id,
        toAccount: receiverAccount._id,
        fromUser: req.user._id,
        toUser: receiverAccount.user,
        amount,
        type: type || 'transfer',
        description: description || 'Fund transfer',
        status: 'completed',
        balanceAfter: senderAccount.balance,
      }],
      { session }
    );

    // Commit the atomic transaction — only now are all changes saved
    await session.commitTransaction();

    await ActivityLog.create({
      user: req.user._id,
      action: 'TRANSACTION_CREATED',
      description: `Transferred ${amount} to account ${toAccountNumber}`,
      ipAddress: req.ip,
    });

    logger.info(`Transaction completed: ${req.user._id} -> ${toAccountNumber} | Amount: ${amount}`);

    return res.status(201).json({
      success: true,
      message: 'Transaction completed successfully.',
      data: { transaction: transaction[0] },
    });
  } catch (error) {
    // Rollback everything if any step failed
    await session.abortTransaction();
    logger.error(`createTransaction error: ${error.message}`);
    next(error);
  } finally {
    // Always end the session
    session.endSession();
  }
};

// ─────────────────────────────────────────────
// @desc    Get current user's transaction history
// @access  Private (user)
// ─────────────────────────────────────────────
export const getMyTransactions = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, type, status } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    // Build filter — find all transactions where user is sender or receiver
    const filter = {
      $or: [{ fromUser: req.user._id }, { toUser: req.user._id }],
    };

    if (type) filter.type = type;
    if (status) filter.status = status;

    const [transactions, total] = await Promise.all([
      Transaction.find(filter)
        .populate('fromAccount', 'accountNumber')
        .populate('toAccount', 'accountNumber')
        .populate('fromUser', 'firstName lastName')
        .populate('toUser', 'firstName lastName')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit)),
      Transaction.countDocuments(filter),
    ]);

    return res.status(200).json({
      success: true,
      data: {
        transactions,
        pagination: {
          total,
          page: Number(page),
          limit: Number(limit),
          totalPages: Math.ceil(total / Number(limit)),
        },
      },
    });
  } catch (error) {
    logger.error(`getMyTransactions error: ${error.message}`);
    next(error);
  }
};

// ─────────────────────────────────────────────
// @desc    Get a single transaction by ID
// @access  Private (user — own transactions only)
// ─────────────────────────────────────────────
export const getTransactionById = async (req, res, next) => {
  try {
    const transaction = await Transaction.findById(req.params.id)
      .populate('fromAccount', 'accountNumber')
      .populate('toAccount', 'accountNumber')
      .populate('fromUser', 'firstName lastName email')
      .populate('toUser', 'firstName lastName email');

    if (!transaction) {
      return res.status(404).json({
        success: false,
        message: 'Transaction not found.',
      });
    }

    // Security check — user can only see their own transactions
    const isOwner =
      transaction.fromUser._id.equals(req.user._id) ||
      transaction.toUser._id.equals(req.user._id);

    if (!isOwner && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied.',
      });
    }

    return res.status(200).json({
      success: true,
      data: { transaction },
    });
  } catch (error) {
    logger.error(`getTransactionById error: ${error.message}`);
    next(error);
  }
};

// ─────────────────────────────────────────────
// @desc    Admin: Get all transactions with filters
// @access  Private (admin)
// ─────────────────────────────────────────────
export const getAllTransactions = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, type, status, userId } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const filter = {};
    if (type) filter.type = type;
    if (status) filter.status = status;
    if (userId) filter.$or = [{ fromUser: userId }, { toUser: userId }];

    const [transactions, total] = await Promise.all([
      Transaction.find(filter)
        .populate('fromUser', 'firstName lastName email')
        .populate('toUser', 'firstName lastName email')
        .populate('fromAccount', 'accountNumber')
        .populate('toAccount', 'accountNumber')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit)),
      Transaction.countDocuments(filter),
    ]);

    return res.status(200).json({
      success: true,
      data: {
        transactions,
        pagination: {
          total,
          page: Number(page),
          limit: Number(limit),
          totalPages: Math.ceil(total / Number(limit)),
        },
      },
    });
  } catch (error) {
    logger.error(`getAllTransactions error: ${error.message}`);
    next(error);
  }
};

// ─────────────────────────────────────────────
// @desc    Admin: Update transaction status (e.g. flag, reverse)
// @access  Private (admin)
// ─────────────────────────────────────────────
export const updateTransactionStatus = async (req, res, next) => {
  try {
    const { status, adminNote } = req.body;

    const validStatuses = ['pending', 'completed', 'failed', 'reversed', 'flagged'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status. Must be one of: ${validStatuses.join(', ')}`,
      });
    }

    const transaction = await Transaction.findByIdAndUpdate(
      req.params.id,
      { status, adminNote, updatedBy: req.user._id },
      { new: true, runValidators: true }
    );

    if (!transaction) {
      return res.status(404).json({
        success: false,
        message: 'Transaction not found.',
      });
    }

    await ActivityLog.create({
      user: req.user._id,
      action: 'TRANSACTION_STATUS_UPDATED',
      description: `Admin updated transaction ${req.params.id} to ${status}`,
      ipAddress: req.ip,
    });

    logger.info(`Transaction ${req.params.id} status updated to ${status} by admin ${req.user._id}`);

    return res.status(200).json({
      success: true,
      message: 'Transaction status updated.',
      data: { transaction },
    });
  } catch (error) {
    logger.error(`updateTransactionStatus error: ${error.message}`);
    next(error);
  }
};
