import mongoose from 'mongoose';

const sessionSchema = new mongoose.Schema({
  user:         { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  refreshToken: { type: String, required: true, select: false },
  ipAddress:    { type: String },
  userAgent:    { type: String },
  deviceInfo:   { type: String },
  isActive:     { type: Boolean, default: true },
  lastActivity: { type: Date, default: Date.now },
  expiresAt:    { type: Date, required: true }
}, {
  timestamps: true
});

// Indexes
sessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
sessionSchema.index({ user: 1 });
sessionSchema.index({ refreshToken: 1 });

const Session = mongoose.model('Session', sessionSchema);

export default Session;