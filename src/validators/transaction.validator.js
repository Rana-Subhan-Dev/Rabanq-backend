const { body } = require('express-validator');

exports.sendMoneyValidator = [
  body('amount').isFloat({ min: 0.01 }).withMessage('Amount must be at least 0.01'),
  body('receiverEmail').optional().isEmail().withMessage('Invalid receiver email'),
  body('receiverPhone').optional().isMobilePhone().withMessage('Invalid receiver phone'),
  body('description').optional().trim().isLength({ max: 255 }).withMessage('Description too long'),
  body('category').optional().isIn(['personal', 'business', 'bill_payment', 'investment', 'other'])
    .withMessage('Invalid category'),
  body('currency').optional().isLength({ min: 3, max: 3 }).withMessage('Invalid currency code')
].concat([  
  body().custom((value) => {
    if (!value.receiverEmail && !value.receiverPhone && !value.receiverId) {
      throw new Error('At least one receiver identifier (email, phone, or ID) is required');
    }
    return true;
  })
]);

exports.depositValidator = [
  body('amount').isFloat({ min: 1 }).withMessage('Minimum deposit is 1'),
  body('currency').optional().isLength({ min: 3, max: 3 }).withMessage('Invalid currency code')
];
