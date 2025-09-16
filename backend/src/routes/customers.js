const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const { 
  validateCustomer, 
  validateBulkCustomers, 
  validatePagination, 
  validateIdParam,
  sanitizeInput 
} = require('../middleware/validation');
const {
  createCustomer,
  getCustomers,
  bulkCreateCustomers,
  updateCustomer,
  deleteCustomer,
  getCustomerStats
} = require('../controllers/customerController');

const router = express.Router();

// Apply authentication to all routes
router.use(authenticateToken);
router.use(sanitizeInput);

// Get customer statistics
router.get('/stats', getCustomerStats);

// Get all customers with pagination and search
router.get('/', validatePagination, getCustomers);

// Create single customer
router.post('/', validateCustomer, createCustomer);

// Bulk create customers
router.post('/bulk', validateBulkCustomers, bulkCreateCustomers);

// Update customer
router.put('/:id', validateIdParam, validateCustomer, updateCustomer);

// Delete customer
router.delete('/:id', validateIdParam, deleteCustomer);

module.exports = router;
