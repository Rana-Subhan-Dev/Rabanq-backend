// const ActivityLog = require('../models/ActivityLog.model');
// const logger = require('../config/logger');

import logger from "../config/logger.js";
import ActivityLog from "../models/ActivityLog.model.js";

export const logActivity = async ({
  userId = null,
  action,
  category,
  description,
  status = 'success',
  ipAddress = null,
  userAgent = null,
  method = null,
  endpoint = null,
  metadata = {},
  errorMessage = null
}) => {
  try {
    await ActivityLog.create({
      user: userId,
      action,
      category,
      description,
      status,
      ipAddress,
      userAgent,
      method,
      endpoint,
      metadata,
      errorMessage
    });
  } catch (err) {
    logger.error(`Failed to log activity: ${err.message}`);
  }
};


