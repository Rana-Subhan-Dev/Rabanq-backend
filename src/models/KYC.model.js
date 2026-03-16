const mongoose = require('mongoose');

const documentSchema = new mongoose.Schema({
  type:        { type: String, enum: ['national_id', 'passport', 'drivers_license', 'proof_of_address', 'selfie'], required: true },
  s3Key:       { type: String, required: true },
  s3Url:       { type: String, required: true },
  originalName:{ type: String },
  mimeType:    { type: String },
  fileSize:    { type: Number },
  uploadedAt:  { type: Date, default: Date.now }
}, { _id: true });

const kycSchema = new mongoose.Schema({
  user:    { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  status:  { type: String, enum: ['pending', 'under_review', 'verified', 'rejected', 'resubmission_required'], default: 'pending' },

  // Personal Info (from form)
  personalInfo: {
    firstName:   { type: String },
    lastName:    { type: String },
    dateOfBirth: { type: Date },
    nationality: { type: String },
    idNumber:    { type: String },
    address: {
      street:  { type: String },
      city:    { type: String },
      state:   { type: String },
      country: { type: String },
      zipCode: { type: String }
    }
  },

  // Uploaded Documents (S3 URLs)
  documents: [documentSchema],

  // Admin Review
  reviewedBy:    { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  reviewedAt:    { type: Date, default: null },
  rejectionReason: { type: String, default: null },
  adminNotes:    { type: String, default: null },

  // Submission tracking
  submittedAt:       { type: Date, default: Date.now },
  resubmissionCount: { type: Number, default: 0 },
  resubmissionNotes: { type: String, default: null },

  // Risk Assessment
  riskLevel: { type: String, enum: ['low', 'medium', 'high'], default: 'low' },
  riskNotes: { type: String, default: null }
}, {
  timestamps: true
});

kycSchema.index({ user: 1 });
kycSchema.index({ status: 1 });
kycSchema.index({ submittedAt: -1 });

module.exports = mongoose.model('KYC', kycSchema);
