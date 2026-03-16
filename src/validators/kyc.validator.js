const { body } = require('express-validator');

exports.submitKycValidator = [
  body('firstName').trim().notEmpty().withMessage('First name is required'),
  body('lastName').trim().notEmpty().withMessage('Last name is required'),
  body('dateOfBirth').isISO8601().withMessage('Invalid date of birth').custom((val) => {
    const age = (Date.now() - new Date(val)) / (365.25 * 24 * 60 * 60 * 1000);
    if (age < 18) throw new Error('Must be at least 18 years old');
    return true;
  }),
  body('nationality').trim().notEmpty().withMessage('Nationality is required'),
  body('idNumber').trim().notEmpty().withMessage('ID number is required'),
  body('address.street').trim().notEmpty().withMessage('Street address is required'),
  body('address.city').trim().notEmpty().withMessage('City is required'),
  body('address.country').trim().notEmpty().withMessage('Country is required'),
  body('address.zipCode').trim().notEmpty().withMessage('Zip code is required')
];

exports.reviewKycValidator = [
  body('status').isIn(['verified', 'rejected', 'resubmission_required', 'under_review'])
    .withMessage('Invalid KYC status'),
  body('rejectionReason').if(body('status').isIn(['rejected', 'resubmission_required']))
    .notEmpty().withMessage('Rejection reason is required when rejecting KYC'),
  body('riskLevel').optional().isIn(['low', 'medium', 'high']).withMessage('Invalid risk level')
];
