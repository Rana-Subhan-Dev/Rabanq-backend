/**
 * @file user.validator.js
 * @description Validation rules for user profile update and password change.
 */

import { body } from 'express-validator';

export const updateProfileRules = [
  body('firstName')
    .optional()
    .trim()
    .isLength({ min: 2, max: 50 }).withMessage('First name must be 2-50 characters.'),

  body('lastName')
    .optional()
    .trim()
    .isLength({ min: 2, max: 50 }).withMessage('Last name must be 2-50 characters.'),

  body('phone')
    .optional()
    .isMobilePhone().withMessage('Please provide a valid phone number.'),

  body('dateOfBirth')
    .optional()
    .isISO8601().withMessage('Date of birth must be a valid date (YYYY-MM-DD).'),
];

export const changePasswordRules = [
  body('currentPassword')
    .notEmpty().withMessage('Current password is required.'),

  body('newPassword')
    .notEmpty().withMessage('New password is required.')
    .isLength({ min: 8 }).withMessage('New password must be at least 8 characters.')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/).withMessage(
      'New password must contain at least one uppercase letter, one lowercase letter, and one number.'
    ),
];
