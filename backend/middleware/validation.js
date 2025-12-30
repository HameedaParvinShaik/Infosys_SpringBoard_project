// middleware/validation.js
const { body, param } = require('express-validator');

const validateProcessText = [
  body('text')
    .notEmpty()
    .withMessage('Text is required')
    .isString()
    .withMessage('Text must be a string')
    .trim()
    .isLength({ min: 1, max: 10000 })
    .withMessage('Text must be between 1 and 10,000 characters')
];

const validateBatchProcess = [
  body('textColumn')
    .optional()
    .isString()
    .withMessage('Text column must be a string'),
  body('maxTexts')
    .optional()
    .isInt({ min: 1, max: 10000 })
    .withMessage('Max texts must be between 1 and 10,000')
];

const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      errors: errors.array()
    });
  }
  next();
};

module.exports = {
  validateProcessText,
  validateBatchProcess,
  handleValidationErrors
};
