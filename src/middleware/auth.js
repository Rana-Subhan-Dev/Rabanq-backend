import jwt from 'jsonwebtoken';
import User from '../models/User.model.js';
import Session from '../models/Session.model.js';
import AppError from '../utils/AppError.js';
import { logActivity } from '../utils/logActivity.js';
import catchAsync from '../utils/catchAsync.js';

const INACTIVITY_TIMEOUT = (parseInt(process.env.INACTIVITY_TIMEOUT_MINUTES) || 15) * 60 * 1000;

export const protect = catchAsync(async (req, res, next) => {
  let token;

  if (req.headers.authorization?.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) throw new AppError('Access denied. Please log in.', 401);

  // Verify token
  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET);
  } catch (err) {
    if (err.name === 'TokenExpiredError') throw new AppError('Session expired. Please log in again.', 401);
    throw new AppError('Invalid token. Please log in again.', 401);
  }

  // Find user
  const user = await User.findById(decoded.id).select('+twoFactorSecret');
  if (!user) throw new AppError('User no longer exists.', 401);
  if (!user.isActive) throw new AppError('Account has been deactivated. Contact support.', 401);
  if (user.isSuspended) throw new AppError(`Account suspended: ${user.suspendedReason}`, 403);
  if (user.isLocked) throw new AppError('Account temporarily locked due to multiple failed login attempts.', 423);

  // Check inactivity timeout
  const lastActivity = new Date(user.lastActivity).getTime();
  const now = Date.now();
  if (now - lastActivity > INACTIVITY_TIMEOUT) {
    // Auto-logout: deactivate sessions
    await Session.updateMany({ user: user._id, isActive: true }, { isActive: false });
    await User.findByIdAndUpdate(user._id, { isOnline: false, lastLogout: new Date() });
    await logActivity({
      userId: user._id,
      action: 'AUTO_LOGOUT',
      category: 'auth',
      description: 'User automatically logged out due to inactivity',
      status: 'warning',
      ipAddress: req.ip,
      userAgent: req.headers['user-agent']
    });
    throw new AppError('Session expired due to inactivity. Please log in again.', 401);
  }

  // Update last activity
  await User.findByIdAndUpdate(user._id, { lastActivity: new Date() });

  req.user = user;
  next();
});

export const restrictTo = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return next(new AppError('You do not have permission to perform this action.', 403));
    }
    next();
  };
};
