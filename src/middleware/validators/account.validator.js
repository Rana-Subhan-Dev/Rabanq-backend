/**
 * @file account.validator.js
 * @description Validation rules for account status updates (admin only).
 */

import { body } from 'express-validator';

export const updateAccountStatusRules = [
  body('status')
    .notEmpty().withMessage('Status is required.')
    .isIn(['active', 'frozen', 'suspended', 'closed']).withMessage(
      'Status must be active, frozen, suspended, or closed.'
    ),

  body('reason')
    .optional()
    .trim()
    .isLength({ max: 300 }).withMessage('Reason cannot exceed 300 characters.'),
];
