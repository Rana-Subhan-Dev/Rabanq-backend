const jwt = require('jsonwebtoken');
const crypto = require('crypto');

exports.generateAccessToken = (userId, role) => {
  return jwt.sign(
    { id: userId, role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
};

exports.generateRefreshToken = (userId) => {
  return jwt.sign(
    { id: userId },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '30d' }
  );
};

exports.generateRandomToken = () => crypto.randomBytes(32).toString('hex');

exports.hashToken = (token) => crypto.createHash('sha256').update(token).digest('hex');
