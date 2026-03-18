/**
 * @file validate.middleware.js
 * @description Centralised express-validator result handler.
 *              Place this AFTER your validator rule arrays in any route.
 *              If validation fails, returns 422 with structured errors.
 *              If validation passes, calls next() to reach the controller.
 *
 * @usage
 *   router.post('/register', registerRules, validate, register);
 */

import { validationResult } from 'express-validator';

export const validate = (req, res, next) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    // Format errors into a clean array of { field, message } objects
    const formattedErrors = errors.array().map((err) => ({
      field: err.path,
      message: err.msg,
    }));

    return res.status(422).json({
      success: false,
      message: 'Validation failed. Please check your input.',
      errors: formattedErrors,
    });
  }

  next();
};
