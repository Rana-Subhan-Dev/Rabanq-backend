/**
 * @file transaction.validator.js
 * @description Validation rules for transaction creation and admin status updates.
 */

import { body } from 'express-validator';

export const createTransactionRules = [
  body('toAccountNumber')
    .trim()
    .notEmpty().withMessage('Recipient account number is required.')
    .isLength({ min: 10, max: 10 }).withMessage('Account number must be exactly 10 digits.')
    .isNumeric().withMessage('Account number must contain only digits.'),

  body('amount')
    .notEmpty().withMessage('Amount is required.')
    .isFloat({ min: 0.01 }).withMessage('Amount must be greater than 0.'),

  body('description')
    .optional()
    .trim()
    .isLength({ max: 200 }).withMessage('Description cannot exceed 200 characters.'),

  body('type')
    .optional()
    .isIn(['transfer', 'deposit', 'withdrawal']).withMessage(
      'Type must be transfer, deposit, or withdrawal.'
    ),
];

export const updateTransactionStatusRules = [
  body('status')
    .notEmpty().withMessage('Status is required.')
    .isIn(['pending', 'completed', 'failed', 'reversed', 'flagged']).withMessage(
      'Invalid status value.'
    ),

  body('adminNote')
    .optional()
    .trim()
    .isLength({ max: 500 }).withMessage('Admin note cannot exceed 500 characters.'),
];
