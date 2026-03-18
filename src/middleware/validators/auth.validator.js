/**
 * @file auth.validator.js
 * @description express-validator rule sets for authentication endpoints.
 *              These are used in routes before the controller runs.
 */

import { body } from 'express-validator';

export const registerRules = [
  body('firstName')
    .trim()
    .notEmpty().withMessage('First name is required.')
    .isLength({ min: 2, max: 50 }).withMessage('First name must be 2-50 characters.'),

  body('lastName')
    .trim()
    .notEmpty().withMessage('Last name is required.')
    .isLength({ min: 2, max: 50 }).withMessage('Last name must be 2-50 characters.'),

  body('email')
    .trim()
    .notEmpty().withMessage('Email is required.')
    .isEmail().withMessage('Please provide a valid email address.'),

  body('password')
    .notEmpty().withMessage('Password is required.')
    .isLength({ min: 8 }).withMessage('Password must be at least 8 characters.')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/).withMessage(
      'Password must contain at least one uppercase letter, one lowercase letter, and one number.'
    ),

  body('phone')
    .optional()
    .isMobilePhone().withMessage('Please provide a valid phone number.'),
];

export const loginRules = [
  body('email')
    .trim()
    .notEmpty().withMessage('Email is required.')
    .isEmail().withMessage('Please provide a valid email.'),

  body('password')
    .notEmpty().withMessage('Password is required.'),
];

export const refreshTokenRules = [
  body('refreshToken')
    .notEmpty().withMessage('Refresh token is required.'),
];
