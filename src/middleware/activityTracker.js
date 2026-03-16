const jwt = require('jsonwebtoken');
const User = require('../models/User.model');

exports.activityTracker = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (token) {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      if (decoded?.id) {
        await User.findByIdAndUpdate(decoded.id, { lastActivity: new Date() }, { timestamps: false });
      }
    }
  } catch (err) {
    // Silently fail - don't block request
  }
  next();
};
