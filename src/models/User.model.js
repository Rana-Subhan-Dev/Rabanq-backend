const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  firstName: { type: String, required: [true, 'First name is required'], trim: true, maxlength: 50 },
  lastName:  { type: String, required: [true, 'Last name is required'], trim: true, maxlength: 50 },
  email:     { type: String, required: [true, 'Email is required'], unique: true, lowercase: true, trim: true },
  phone:     { type: String, required: [true, 'Phone is required'], unique: true, trim: true },
  password:  { type: String, required: [true, 'Password is required'], minlength: 8, select: false },
  role:      { type: String, enum: ['sender', 'admin'], default: 'sender' },

  // Profile
  avatar:       { type: String, default: null },
  dateOfBirth:  { type: Date, default: null },
  address: {
    street:  { type: String, default: null },
    city:    { type: String, default: null },
    state:   { type: String, default: null },
    country: { type: String, default: null },
    zipCode: { type: String, default: null }
  },

  // Account Status
  isEmailVerified: { type: Boolean, default: false },
  isPhoneVerified: { type: Boolean, default: false },
  isActive:        { type: Boolean, default: true },
  isSuspended:     { type: Boolean, default: false },
  suspendedReason: { type: String, default: null },

  // KYC
  kycStatus: { type: String, enum: ['not_submitted', 'pending', 'verified', 'rejected'], default: 'not_submitted' },
  kycRef:    { type: mongoose.Schema.Types.ObjectId, ref: 'KYC', default: null },

  // Wallet
  balance:  { type: Number, default: 0, min: 0 },
  currency: { type: String, default: 'USD' },

  // 2FA
  twoFactorEnabled: { type: Boolean, default: false },
  twoFactorSecret:  { type: String, select: false, default: null },

  // Security
  passwordResetToken:   { type: String, select: false },
  passwordResetExpires: { type: Date, select: false },
  emailVerifyToken:     { type: String, select: false },
  emailVerifyExpires:   { type: Date, select: false },
  loginAttempts:        { type: Number, default: 0 },
  lockUntil:            { type: Date, default: null },

  // Activity Tracking
  lastActivity: { type: Date, default: Date.now },
  lastLogin:    { type: Date, default: null },
  lastLogout:   { type: Date, default: null },
  isOnline:     { type: Boolean, default: false },
  fcmToken:     { type: String, default: null }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtuals
userSchema.virtual('fullName').get(function () {
  return `${this.firstName} ${this.lastName}`;
});

userSchema.virtual('isLocked').get(function () {
  return !!(this.lockUntil && this.lockUntil > Date.now());
});

// Pre-save: Hash password
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, parseInt(process.env.BCRYPT_SALT_ROUNDS) || 12);
  next();
});

// Compare password
userSchema.methods.comparePassword = async function (candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Increment login attempts
userSchema.methods.incrementLoginAttempts = async function () {
  if (this.lockUntil && this.lockUntil < Date.now()) {
    this.loginAttempts = 1;
    this.lockUntil = undefined;
  } else {
    this.loginAttempts += 1;
    if (this.loginAttempts >= 5) {
      this.lockUntil = new Date(Date.now() + 2 * 60 * 60 * 1000); // 2 hours
    }
  }
  await this.save();
};

// Reset login attempts
userSchema.methods.resetLoginAttempts = async function () {
  this.loginAttempts = 0;
  this.lockUntil = undefined;
  await this.save();
};

// Indexes
userSchema.index({ email: 1 });
userSchema.index({ phone: 1 });
userSchema.index({ kycStatus: 1 });
userSchema.index({ role: 1 });
userSchema.index({ lastActivity: 1 });

module.exports = mongoose.model('User', userSchema);
