/**
 * @file auth.controller.js
 * @description Handles all authentication flows for Rabanq fintech platform.
 *              Covers registration, login, logout, and JWT refresh token rotation.
 *              Passwords are hashed with bcrypt. Tokens are signed with JWT.
 * @routes
 *   POST /api/auth/register
 *   POST /api/auth/login
 *   POST /api/auth/logout
 *   POST /api/auth/refresh-token
 */

import User from '../models/User.model.js';
import Account from '../models/Account.model.js';
import ActivityLog from '../models/ActivityLog.model.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
//import { JWT_SECRET, JWT_EXPIRES_IN, JWT_REFRESH_SECRET, JWT_REFRESH_EXPIRES_IN } from '../config/constants.js';
//import { generateAccessToken, generateRefreshToken } from '../utils/token.util.js';
//import logger from '../utils/logger.util.js';

// ─────────────────────────────────────────────
// @desc    Register a new user + auto-create account
// @access  Public
// ─────────────────────────────────────────────
export const register = async (req, res, next) => {
  try {
    const { firstName, lastName, email, password, phone } = req.body;

    // Check if user already exists with this email
    const existingUser = await User.findOne({ email: email.toLowerCase().trim() });
    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: 'An account with this email already exists.',
      });
    }

    // Hash the password before saving — never store plain text
    const hashedPassword = await bcrypt.hash(password, 12);

    // Create the user record
    const user = await User.create({
      firstName,
      lastName,
      email: email.toLowerCase().trim(),
      password: hashedPassword,
      phone,
    });

    // Auto-create a linked bank account for the new user
    await Account.create({
      user: user._id,
      accountNumber: generateAccountNumber(),
      balance: 0,
      currency: 'USD',
      status: 'active',
    });

    // Log the registration activity
    await ActivityLog.create({
      user: user._id,
      action: 'USER_REGISTERED',
      description: 'New user registered successfully.',
      ipAddress: req.ip,
    });

    // Generate tokens
    const accessToken = generateAccessToken(user._id);
    const refreshToken = generateRefreshToken(user._id);

    // Save refresh token hash to user document for rotation validation
    user.refreshToken = refreshToken;
    await user.save();

    logger.info(`New user registered: ${user.email}`);

    return res.status(201).json({
      success: true,
      message: 'Registration successful.',
      data: {
        user: sanitizeUser(user),
        accessToken,
        refreshToken,
      },
    });
  } catch (error) {
    logger.error(`Register error: ${error.message}`);
    next(error);
  }
};

// ─────────────────────────────────────────────
// @desc    Login user and return JWT tokens
// @access  Public
// ─────────────────────────────────────────────
export const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    // Find user and explicitly select password field (excluded by default in model)
    const user = await User.findOne({ email: email.toLowerCase().trim() }).select('+password +refreshToken');
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password.',
      });
    }

    // Check if the account is active
    if (user.status === 'suspended' || user.status === 'banned') {
      return res.status(403).json({
        success: false,
        message: `Your account has been ${user.status}. Please contact support.`,
      });
    }

    // Compare plain password with stored hash
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password.',
      });
    }

    // Generate fresh tokens
    const accessToken = generateAccessToken(user._id);
    const refreshToken = generateRefreshToken(user._id);

    // Rotate refresh token on every login
    user.refreshToken = refreshToken;
    user.lastLogin = new Date();
    await user.save();

    // Log the login activity
    await ActivityLog.create({
      user: user._id,
      action: 'USER_LOGIN',
      description: 'User logged in successfully.',
      ipAddress: req.ip,
    });

    logger.info(`User logged in: ${user.email}`);

    return res.status(200).json({
      success: true,
      message: 'Login successful.',
      data: {
        user: sanitizeUser(user),
        accessToken,
        refreshToken,
      },
    });
  } catch (error) {
    logger.error(`Login error: ${error.message}`);
    next(error);
  }
};

// ─────────────────────────────────────────────
// @desc    Logout user — invalidate refresh token
// @access  Private
// ─────────────────────────────────────────────
export const logout = async (req, res, next) => {
  try {
    // Clear the stored refresh token so it can never be reused
    await User.findByIdAndUpdate(req.user._id, { refreshToken: null });

    await ActivityLog.create({
      user: req.user._id,
      action: 'USER_LOGOUT',
      description: 'User logged out.',
      ipAddress: req.ip,
    });

    logger.info(`User logged out: ${req.user.email}`);

    return res.status(200).json({
      success: true,
      message: 'Logged out successfully.',
    });
  } catch (error) {
    logger.error(`Logout error: ${error.message}`);
    next(error);
  }
};

// ─────────────────────────────────────────────
// @desc    Refresh access token using refresh token
// @access  Public (requires valid refresh token)
// ─────────────────────────────────────────────
export const refreshToken = async (req, res, next) => {
  try {
    const { refreshToken: token } = req.body;

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Refresh token is required.',
      });
    }

    // Verify the refresh token signature
    let decoded;
    try {
      decoded = jwt.verify(token, JWT_REFRESH_SECRET);
    } catch {
      return res.status(401).json({
        success: false,
        message: 'Invalid or expired refresh token.',
      });
    }

    // Verify the token matches what we stored (rotation check)
    const user = await User.findById(decoded.id).select('+refreshToken');
    if (!user || user.refreshToken !== token) {
      return res.status(401).json({
        success: false,
        message: 'Refresh token has been revoked.',
      });
    }

    // Issue new token pair (rotation — old refresh token is now invalid)
    const newAccessToken = generateAccessToken(user._id);
    const newRefreshToken = generateRefreshToken(user._id);

    user.refreshToken = newRefreshToken;
    await user.save();

    return res.status(200).json({
      success: true,
      message: 'Token refreshed successfully.',
      data: {
        accessToken: newAccessToken,
        refreshToken: newRefreshToken,
      },
    });
  } catch (error) {
    logger.error(`Refresh token error: ${error.message}`);
    next(error);
  }
};

// ─────────────────────────────────────────────
// PRIVATE HELPERS
// ─────────────────────────────────────────────

// Strip sensitive fields before sending user in response
const sanitizeUser = (user) => ({
  _id: user._id,
  firstName: user.firstName,
  lastName: user.lastName,
  email: user.email,
  phone: user.phone,
  role: user.role,
  status: user.status,
  createdAt: user.createdAt,
});

// Generate a random 10-digit account number
const generateAccountNumber = () => {
  return Math.floor(1000000000 + Math.random() * 9000000000).toString();
};
