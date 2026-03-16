const mongoose = require('mongoose');

const activityLogSchema = new mongoose.Schema({
  user:        { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  action:      { type: String, required: true },
  category:    { type: String, enum: ['auth', 'kyc', 'transaction', 'profile', 'admin', 'security', 'system'], required: true },
  description: { type: String, required: true },
  status:      { type: String, enum: ['success', 'failed', 'warning'], default: 'success' },

  // Request Info
  ipAddress:  { type: String, default: null },
  userAgent:  { type: String, default: null },
  method:     { type: String, default: null },
  endpoint:   { type: String, default: null },

  // Extra metadata
  metadata:   { type: mongoose.Schema.Types.Mixed, default: {} },
  errorMessage: { type: String, default: null }
}, {
  timestamps: true
});

activityLogSchema.index({ user: 1, createdAt: -1 });
activityLogSchema.index({ category: 1 });
activityLogSchema.index({ action: 1 });
activityLogSchema.index({ createdAt: -1 });
// Auto-delete logs after 90 days
activityLogSchema.index({ createdAt: 1 }, { expireAfterSeconds: 7776000 });

module.exports = mongoose.model('ActivityLog', activityLogSchema);
