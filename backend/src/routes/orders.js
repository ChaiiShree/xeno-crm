const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const { 
  validateOrder, 
  validateBulkOrders, 
  validatePagination, 
  validateIdParam,
  sanitizeInput 
} = require('../middleware/validation');
const {
  createOrder,
  getOrders,
  getOrderById,
  bulkCreateOrders,
  getOrderStats
} = require('../controllers/orderController');

const router = express.Router();

// Apply authentication to all routes
router.use(authenticateToken);
router.use(sanitizeInput);

// Get order statistics
router.get('/stats', getOrderStats);

// Get all orders with pagination and filters
router.get('/', validatePagination, getOrders);

// Get specific order by ID
router.get('/:id', validateIdParam, getOrderById);

// Create single order
router.post('/', validateOrder, createOrder);

// Bulk create orders
router.post('/bulk', validateBulkOrders, bulkCreateOrders);

module.exports = router;
