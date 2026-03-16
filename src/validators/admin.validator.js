const { body, param } = require('express-validator');

exports.updateUserStatusValidator = [
  param('id').isMongoId().withMessage('Invalid user ID'),
  body('action').isIn(['activate', 'deactivate', 'suspend', 'unsuspend'])
    .withMessage('Invalid action'),
  body('reason').if(body('action').isIn(['suspend', 'deactivate']))
    .notEmpty().withMessage('Reason is required for this action')
];

exports.reverseTransactionValidator = [
  param('id').isMongoId().withMessage('Invalid transaction ID'),
  body('reason').notEmpty().withMessage('Reversal reason is required')
];

exports.updateTransactionStatusValidator = [
  param('id').isMongoId().withMessage('Invalid transaction ID'),
  body('status').isIn(['completed', 'failed', 'cancelled', 'processing'])
    .withMessage('Invalid transaction status'),
  body('reason').optional().trim()
];
