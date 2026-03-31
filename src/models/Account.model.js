/**
 * @file account.model.js
 * @description Mongoose schema for a bank Account in the Rabanq application.
 *              Each account belongs to a User and represents one financial account
 *              (e.g., Checking, Savings, Wallet). Designed to fully support the
 *              account controller operations:
 *                - Create account (openAccount)
 *                - Get account(s) by user
 *                - Get account by accountNumber
 *                - Deposit / Withdraw (balance mutations)
 *                - Freeze / Unfreeze account
 *                - Close account (soft delete)
 *
 * @dependencies mongoose, crypto (Node built-in for account number generation)
 */

import mongoose from 'mongoose';

// ─────────────────────────────────────────────
// SUB-SCHEMA: Transaction History Snapshot
// Lightweight embedded record of every balance
// mutation directly on the account document.
// Full Transaction detail lives in Transaction model.
// ─────────────────────────────────────────────
const transactionSnapshotSchema = new mongoose.Schema(
  {
    // Reference to the full Transaction document
    transactionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Transaction',
      required: true,
    },

    // Type of mutation for quick filtering
    type: {
      type: String,
      enum: ['credit', 'debit'],
      required: true,
    },

    // Amount involved in this snapshot entry
    amount: {
      type: Number,
      required: true,
      min: [0.01, 'Transaction amount must be greater than zero'],
    },

    // Balance AFTER this transaction was applied
    balanceAfter: {
      type: Number,
      required: true,
    },

    // Human-readable note e.g. "Deposit via ATM", "Transfer to ACC-XXXX"
    description: {
      type: String,
      trim: true,
      maxlength: [200, 'Description cannot exceed 200 characters'],
    },

    // When this snapshot was recorded
    date: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false } // No separate _id for embedded snapshots
);

// ─────────────────────────────────────────────
// MAIN SCHEMA: Account
// ─────────────────────────────────────────────
const accountSchema = new mongoose.Schema(
  {
    // ── OWNERSHIP ──────────────────────────────
    // The user this account belongs to
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Account must belong to a user'],
      index: true, // Frequent lookup: get all accounts by user
    },

    // ── IDENTIFICATION ─────────────────────────
    // Unique 16-digit account number — auto-generated on creation
    // Format: RBNQ-XXXX-XXXX-XXXX  (stored without dashes in DB)
    accountNumber: {
      type: String,
      unique: true,
      required: true,
      trim: true,
      match: [
        /^[0-9]{16}$/,
        'Account number must be exactly 16 digits',
      ],
      index: true, // Frequent lookup: find account by accountNumber
    },

    // Human-readable account nickname (optional, user can set)
    accountName: {
      type: String,
      trim: true,
      maxlength: [60, 'Account name cannot exceed 60 characters'],
      default: '',
    },

    // ── ACCOUNT TYPE ───────────────────────────
    accountType: {
      type: String,
      enum: {
        values: ['checking', 'savings', 'wallet', 'business'],
        message: 'Account type must be checking, savings, wallet, or business',
      },
      required: [true, 'Account type is required'],
      default: 'checking',
    },

    // ── CURRENCY ───────────────────────────────
    currency: {
      type: String,
      enum: {
        values: ['USD', 'EUR', 'GBP', 'PKR', 'AED', 'SAR'],
        message: 'Currency must be one of USD, EUR, GBP, PKR, AED, SAR',
      },
      required: [true, 'Currency is required'],
      default: 'USD',
    },

    // ── BALANCE ────────────────────────────────
    // Current available balance
    balance: {
      type: Number,
      required: true,
      default: 0.0,
      min: [0, 'Balance cannot go below zero'], // enforced at model level
      set: (val) => Math.round(val * 100) / 100, // Always store max 2 decimal places
    },

    // Total amount ever deposited (lifetime stat)
    totalDeposited: {
      type: Number,
      default: 0.0,
      min: 0,
      set: (val) => Math.round(val * 100) / 100,
    },

    // Total amount ever withdrawn (lifetime stat)
    totalWithdrawn: {
      type: Number,
      default: 0.0,
      min: 0,
      set: (val) => Math.round(val * 100) / 100,
    },

    // ── LIMITS ─────────────────────────────────
    // Daily transfer/withdrawal limit — admin or user configurable
    dailyLimit: {
      type: Number,
      default: 5000.0,
      min: [0, 'Daily limit cannot be negative'],
      set: (val) => Math.round(val * 100) / 100,
    },

    // How much of the daily limit has been used today
    dailyUsed: {
      type: Number,
      default: 0.0,
      min: 0,
      set: (val) => Math.round(val * 100) / 100,
    },

    // Timestamp of the last day the dailyUsed counter was reset
    // Controller checks this to reset dailyUsed each new calendar day
    dailyLimitResetAt: {
      type: Date,
      default: Date.now,
    },

    // ── STATUS ─────────────────────────────────
    status: {
      type: String,
      enum: {
        values: ['active', 'frozen', 'closed', 'pending'],
        message: 'Status must be active, frozen, closed, or pending',
      },
      default: 'active',
      index: true,
    },

    // Reason admin or system froze / closed the account
    statusReason: {
      type: String,
      trim: true,
      maxlength: [300, 'Status reason cannot exceed 300 characters'],
      default: '',
    },

    // Date the account was officially closed (soft delete)
    closedAt: {
      type: Date,
      default: null,
    },

    // ── INTEREST (for savings accounts) ────────
    interestRate: {
      type: Number,
      default: 0.0,
      min: [0, 'Interest rate cannot be negative'],
      max: [100, 'Interest rate cannot exceed 100%'],
    },

    // Date interest was last applied
    lastInterestAppliedAt: {
      type: Date,
      default: null,
    },

    // ── TRANSACTION HISTORY (snapshot) ─────────
    // Lightweight embedded snapshots — last 50 kept for quick access
    // Full history is in Transaction collection
    recentTransactions: {
      type: [transactionSnapshotSchema],
      default: [],
    },

    // ── METADATA ───────────────────────────────
    // Branch or region this account was opened from
    openedFrom: {
      type: String,
      trim: true,
      default: 'online',
      maxlength: [100, 'openedFrom cannot exceed 100 characters'],
    },

    // IBAN — generated if applicable (optional for wallet type)
    iban: {
      type: String,
      trim: true,
      uppercase: true,
      default: '',
      maxlength: [34, 'IBAN cannot exceed 34 characters'],
    },

    // Whether the account is the user's primary/default account
    isPrimary: {
      type: Boolean,
      default: false,
    },
  },
  {
    // Automatically add createdAt and updatedAt fields
    timestamps: true,

    // Allow virtual fields to show in JSON responses
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// ─────────────────────────────────────────────
// VIRTUALS
// ─────────────────────────────────────────────

/**
 * @virtual formattedAccountNumber
 * @description Returns account number in display format: RBNQ-XXXX-XXXX-XXXX
 * Used by frontend to display account number in a readable way.
 */
accountSchema.virtual('formattedAccountNumber').get(function () {
  if (!this.accountNumber) return '';
  // Split 16 digits into 4 groups of 4
  const n = this.accountNumber;
  return `RBNQ-${n.slice(0, 4)}-${n.slice(4, 8)}-${n.slice(8, 12)}-${n.slice(12, 16)}`;
});

/**
 * @virtual availableBalance
 * @description Balance available for transactions.
 * Accounts for any pending holds in future (currently mirrors balance).
 */
accountSchema.virtual('availableBalance').get(function () {
  return this.balance;
});

/**
 * @virtual isActive
 * @description Quick boolean check — controller uses this before any mutation.
 */
accountSchema.virtual('isActive').get(function () {
  return this.status === 'active';
});

// ─────────────────────────────────────────────
// INDEXES — Compound indexes for frequent queries
// ─────────────────────────────────────────────

// Get all accounts for a user filtered by status
accountSchema.index({ user: 1, status: 1 });

// Get all accounts for a user filtered by type
accountSchema.index({ user: 1, accountType: 1 });

// ─────────────────────────────────────────────
// INSTANCE METHODS
// ─────────────────────────────────────────────

/**
 * @method canTransact
 * @description Checks whether this account is allowed to perform a transaction.
 * Called by the account controller before any deposit / withdrawal / transfer.
 * @returns {{ allowed: boolean, reason: string }}
 */
accountSchema.methods.canTransact = function () {
  if (this.status === 'frozen') {
    return { allowed: false, reason: 'Account is frozen. Contact support.' };
  }
  if (this.status === 'closed') {
    return { allowed: false, reason: 'Account is closed and cannot be used.' };
  }
  if (this.status === 'pending') {
    return { allowed: false, reason: 'Account is pending activation.' };
  }
  return { allowed: true, reason: '' };
};

/**
 * @method resetDailyLimitIfNewDay
 * @description Resets dailyUsed to 0 if the last reset was on a previous calendar day.
 * Called by the controller at the start of every withdrawal/transfer operation.
 * Mutates the document — caller must save() after calling this.
 */
accountSchema.methods.resetDailyLimitIfNewDay = function () {
  const now = new Date();
  const lastReset = new Date(this.dailyLimitResetAt);

  // Check if we're on a new calendar day
  const isNewDay =
    now.getUTCFullYear() !== lastReset.getUTCFullYear() ||
    now.getUTCMonth() !== lastReset.getUTCMonth() ||
    now.getUTCDate() !== lastReset.getUTCDate();

  if (isNewDay) {
    this.dailyUsed = 0;
    this.dailyLimitResetAt = now;
  }
};

/**
 * @method addTransactionSnapshot
 * @description Appends a lightweight snapshot to recentTransactions.
 * Keeps only the latest 50 entries to prevent unbounded array growth.
 * Called by the controller after every successful deposit/withdrawal/transfer.
 *
 * @param {Object} snapshot - { transactionId, type, amount, balanceAfter, description }
 */
accountSchema.methods.addTransactionSnapshot = function (snapshot) {
  this.recentTransactions.push(snapshot);

  // Keep only the last 50 snapshots — older ones live in Transaction collection
  if (this.recentTransactions.length > 50) {
    this.recentTransactions = this.recentTransactions.slice(-50);
  }
};

// ─────────────────────────────────────────────
// STATIC METHODS
// ─────────────────────────────────────────────

/**
 * @static generateAccountNumber
 * @description Generates a unique 16-digit numeric account number.
 * Uses Date.now() + random padding to ensure uniqueness.
 * Called by the account controller's openAccount function before save().
 * @returns {string} 16-digit numeric string
 */
accountSchema.statics.generateAccountNumber = function () {
  const timestamp = Date.now().toString(); // 13 digits
  const random = Math.floor(Math.random() * 1000)
    .toString()
    .padStart(3, '0'); // 3 digits
  // Combine and take last 16 digits
  return (timestamp + random).slice(-16);
};

/**
 * @static findByAccountNumber
 * @description Convenience static to find an account by its 16-digit number.
 * Supports both raw (1234567890123456) and formatted (RBNQ-1234-5678-9012-3456) input.
 * @param {string} accountNumber
 * @returns {Promise<Account|null>}
 */
accountSchema.statics.findByAccountNumber = function (accountNumber) {
  // Strip any non-digit characters (handles formatted input)
  const clean = accountNumber.replace(/\D/g, '');
  return this.findOne({ accountNumber: clean });
};

// ─────────────────────────────────────────────
// PRE-SAVE HOOKS
// ─────────────────────────────────────────────

/**
 * @pre save
 * @description Auto-generate accountNumber if not already set.
 * This ensures every account has a number even if the controller
 * forgets to call generateAccountNumber() manually.
 */
accountSchema.pre('save', function (next) {
  if (!this.accountNumber) {
    this.accountNumber = this.constructor.generateAccountNumber();
  }
  next();
});

// ─────────────────────────────────────────────
// MODEL EXPORT
// ─────────────────────────────────────────────
const Account = mongoose.model('Account', accountSchema);

export default Account;
