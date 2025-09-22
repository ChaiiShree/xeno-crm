const { body, param, query, validationResult } = require('express-validator');

const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      error: 'Validation failed',
      details: errors.array()
    });
  }
  next();
};

const validateCustomer = [
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Name is required')
    .isLength({ min: 2, max: 255 })
    .withMessage('Name must be between 2 and 255 characters'),
  body('email')
    .isEmail()
    .withMessage('Valid email is required')
    .normalizeEmail(),
  body('phone')
    .optional()
    .isMobilePhone()
    .withMessage('Valid phone number is required'),
  body('totalSpend')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Total spend must be a positive number'),
  body('visitCount')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Visit count must be a positive integer'),
  handleValidationErrors
];

const validateBulkCustomers = [
  body('customers')
    .isArray({ min: 1, max: 1000 })
    .withMessage('Customers array is required (max 1000 items)'),
  body('customers.*.name')
    .trim()
    .notEmpty()
    .withMessage('Name is required for all customers')
    .isLength({ min: 2, max: 255 })
    .withMessage('Name must be between 2 and 255 characters'),
  body('customers.*.email')
    .isEmail()
    .withMessage('Valid email is required for all customers')
    .normalizeEmail(),
  body('customers.*.phone')
    .optional()
    .isMobilePhone()
    .withMessage('Valid phone number is required'),
  body('customers.*.totalSpend')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Total spend must be a positive number'),
  body('customers.*.visitCount')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Visit count must be a positive integer'),
  handleValidationErrors
];

const validateOrder = [
  body('customerId')
    .isInt({ min: 1 })
    .withMessage('Valid customer ID is required'),
  body('amount')
    .isFloat({ min: 0.01 })
    .withMessage('Amount must be greater than 0'),
  body('orderDate')
    .optional()
    .isISO8601()
    .withMessage('Order date must be a valid ISO date'),
  body('status')
    .optional()
    .isIn(['pending', 'completed', 'cancelled', 'refunded'])
    .withMessage('Status must be one of: pending, completed, cancelled, refunded'),
  handleValidationErrors
];

const validateBulkOrders = [
  body('orders')
    .isArray({ min: 1, max: 1000 })
    .withMessage('Orders array is required (max 1000 items)'),
  body('orders.*.customerId')
    .isInt({ min: 1 })
    .withMessage('Valid customer ID is required for all orders'),
  body('orders.*.amount')
    .isFloat({ min: 0.01 })
    .withMessage('Amount must be greater than 0 for all orders'),
  body('orders.*.orderDate')
    .optional()
    .isISO8601()
    .withMessage('Order date must be a valid ISO date'),
  body('orders.*.status')
    .optional()
    .isIn(['pending', 'completed', 'cancelled', 'refunded'])
    .withMessage('Status must be one of: pending, completed, cancelled, refunded'),
  handleValidationErrors
];

// FIXED: Simplified segment validation - REMOVED the problematic rules validation
const validateSegment = [
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Segment name is required')
    .isLength({ min: 2, max: 255 })
    .withMessage('Name must be between 2 and 255 characters'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Description must not exceed 1000 characters'),
  body('nlpQuery')
    .optional()
    .trim()
    .isLength({ min: 5, max: 500 })
    .withMessage('NLP query must be between 5 and 500 characters'),
  // ONLY validate that either rules OR nlpQuery exists
  body()
    .custom((value) => {
      if (!value.rules && !value.nlpQuery) {
        throw new Error('Either rules or nlpQuery is required');
      }
      return true;
    }),
  handleValidationErrors
];

const validateCampaign = [
  body('segmentId')
    .isInt({ min: 1 })
    .withMessage('Valid segment ID is required'),
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Campaign name is required')
    .isLength({ min: 2, max: 255 })
    .withMessage('Name must be between 2 and 255 characters'),
  body('message')
    .optional()
    .trim()
    .isLength({ min: 10, max: 2000 })
    .withMessage('Message must be between 10 and 2000 characters'),
  body('useAI')
    .optional()
    .isBoolean()
    .withMessage('useAI must be a boolean'),
  body('campaignObjective')
    .optional()
    .trim()
    .isLength({ min: 5, max: 200 })
    .withMessage('Campaign objective must be between 5 and 200 characters'),
  body()
    .custom((value) => {
      if (!value.message && !value.useAI) {
        throw new Error('Either message or AI generation (useAI) is required');
      }
      if (value.useAI && !value.campaignObjective) {
        throw new Error('Campaign objective is required when using AI generation');
      }
      return true;
    }),
  handleValidationErrors
];

const validatePagination = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
  query('sortOrder')
    .optional()
    .isIn(['ASC', 'DESC', 'asc', 'desc'])
    .withMessage('Sort order must be ASC or DESC'),
  handleValidationErrors
];

const validateIdParam = [
  param('id')
    .isInt({ min: 1 })
    .withMessage('Valid ID is required'),
  handleValidationErrors
];

const validateDeliveryStatus = [
  body('campaignId')
    .isInt({ min: 1 })
    .withMessage('Valid campaign ID is required'),
  body('customerId')
    .isInt({ min: 1 })
    .withMessage('Valid customer ID is required'),
  body('status')
    .isIn(['pending', 'sent', 'failed', 'delivered'])
    .withMessage('Status must be one of: pending, sent, failed, delivered'),
  body('failedReason')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Failed reason must not exceed 500 characters'),
  handleValidationErrors
];

// FIXED: Simplified audience preview validation - REMOVED problematic rules validation
const validateAudiencePreview = [
  body()
    .custom((value) => {
      if (!value.rules && !value.nlpQuery) {
        throw new Error('Either rules or nlpQuery is required');
      }
      return true;
    }),
  body('nlpQuery')
    .optional()
    .trim()
    .isLength({ min: 5, max: 500 })
    .withMessage('NLP query must be between 5 and 500 characters'),
  handleValidationErrors
];

const sanitizeInput = (req, res, next) => {
  const sanitize = (obj) => {
    for (const key in obj) {
      if (typeof obj[key] === 'string') {
        // Remove HTML tags and trim whitespace
        obj[key] = obj[key].replace(/<[^>]*>/g, '').trim();
      } else if (typeof obj[key] === 'object' && obj[key] !== null) {
        sanitize(obj[key]);
      }
    }
  };

  if (req.body) sanitize(req.body);
  if (req.query) sanitize(req.query);
  if (req.params) sanitize(req.params);
  next();
};

module.exports = {
  handleValidationErrors,
  validateCustomer,
  validateBulkCustomers,
  validateOrder,
  validateBulkOrders,
  validateSegment,
  validateCampaign,
  validatePagination,
  validateIdParam,
  validateDeliveryStatus,
  validateAudiencePreview,
  sanitizeInput
};
