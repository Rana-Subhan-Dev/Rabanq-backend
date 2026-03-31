import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema({
  user:     { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  title:    { type: String, required: true },
  message:  { type: String, required: true },
  type:     { type: String, enum: ['transaction', 'kyc', 'security', 'system', 'promotion'], default: 'system' },
  isRead:   { type: Boolean, default: false },
  readAt:   { type: Date, default: null },
  data:     { type: mongoose.Schema.Types.Mixed, default: {} }
}, {
  timestamps: true
});

notificationSchema.index({ user: 1, isRead: 1 });
notificationSchema.index({ user: 1, createdAt: -1 });
// Auto-delete notifications after 30 days
notificationSchema.index({ createdAt: 1 }, { expireAfterSeconds: 2592000 });


const Notification = mongoose.model('Notification', notificationSchema);

export default Notification;