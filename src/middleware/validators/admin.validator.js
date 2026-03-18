/**
 * @file admin.validator.js
 * @description Validation rules for admin user management actions.
 */

import { body } from 'express-validator';

export const updateUserRoleRules = [
  body('role')
    .notEmpty().withMessage('Role is required.')
    .isIn(['user', 'admin', 'support']).withMessage(
      'Role must be user, admin, or support.'
    ),
];

export const updateUserStatusRules = [
  body('status')
    .notEmpty().withMessage('Status is required.')
    .isIn(['active', 'suspended', 'banned']).withMessage(
      'Status must be active, suspended, or banned.'
    ),

  body('reason')
    .optional()
    .trim()
    .isLength({ max: 300 }).withMessage('Reason cannot exceed 300 characters.'),
];
