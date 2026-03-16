const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

const transactionSchema = new mongoose.Schema({
  reference:   { type: String, unique: true, default: () => `TXN-${uuidv4().split('-')[0].toUpperCase()}` },
  type:        { type: String, enum: ['send', 'receive', 'deposit', 'withdrawal', 'refund', 'fee'], required: true },
  status:      { type: String, enum: ['pending', 'processing', 'completed', 'failed', 'cancelled', 'reversed'], default: 'pending' },

  // Parties
  sender:    { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  receiver:  { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  receiverEmail: { type: String, default: null },
  receiverPhone: { type: String, default: null },

  // Amounts
  amount:          { type: Number, required: true, min: 0.01 },
  fee:             { type: Number, default: 0 },
  netAmount:       { type: Number },
  currency:        { type: String, default: 'USD' },
  exchangeRate:    { type: Number, default: 1 },
  convertedAmount: { type: Number, default: null },
  receiverCurrency:{ type: String, default: 'USD' },

  // Details
  description:     { type: String, trim: true, maxlength: 255, default: '' },
  category:        { type: String, enum: ['personal', 'business', 'bill_payment', 'investment', 'other'], default: 'personal' },
  note:            { type: String, default: null },

  // Balance Snapshots
  senderBalanceBefore:   { type: Number },
  senderBalanceAfter:    { type: Number },
  receiverBalanceBefore: { type: Number },
  receiverBalanceAfter:  { type: Number },

  // Admin
  processedBy:   { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  processedAt:   { type: Date, default: null },
  failureReason: { type: String, default: null },
  reversedAt:    { type: Date, default: null },
  reversalReason:{ type: String, default: null },

  // Metadata
  ipAddress:  { type: String, default: null },
  userAgent:  { type: String, default: null },
  deviceInfo: { type: String, default: null }
}, {
  timestamps: true
});

// Pre-save: calculate netAmount
transactionSchema.pre('save', function (next) {
  if (this.isModified('amount') || this.isModified('fee')) {
    this.netAmount = this.amount - (this.fee || 0);
  }
  next();
});

transactionSchema.index({ sender: 1, createdAt: -1 });
transactionSchema.index({ receiver: 1, createdAt: -1 });
transactionSchema.index({ reference: 1 });
transactionSchema.index({ status: 1 });
transactionSchema.index({ type: 1 });
transactionSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Transaction', transactionSchema);
