/**
 * @file kyc.validator.js
 * @description Validation rules for KYC submission and admin review.
 */

import { body } from 'express-validator';

export const submitKYCRules = [
  body('documentType')
    .notEmpty().withMessage('Document type is required.')
    .isIn(['passport', 'national_id', 'driving_license']).withMessage(
      'Document type must be passport, national_id, or driving_license.'
    ),

  body('documentNumber')
    .trim()
    .notEmpty().withMessage('Document number is required.'),

  body('documentFrontUrl')
    .notEmpty().withMessage('Document front image URL is required.')
    .isURL().withMessage('documentFrontUrl must be a valid URL.'),

  body('selfieUrl')
    .notEmpty().withMessage('Selfie image URL is required.')
    .isURL().withMessage('selfieUrl must be a valid URL.'),

  body('dateOfBirth')
    .notEmpty().withMessage('Date of birth is required.')
    .isISO8601().withMessage('Date of birth must be a valid date (YYYY-MM-DD).'),

  body('nationality')
    .trim()
    .notEmpty().withMessage('Nationality is required.'),
];

export const reviewKYCRules = [
  body('status')
    .notEmpty().withMessage('Review status is required.')
    .isIn(['approved', 'rejected']).withMessage('Status must be approved or rejected.'),

  body('reviewNote')
    .optional()
    .trim()
    .isLength({ max: 500 }).withMessage('Review note cannot exceed 500 characters.'),
];
