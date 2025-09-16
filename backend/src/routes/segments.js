const express = require('express');
const { authenticateToken, rateLimitAuth } = require('../middleware/auth');
const { 
  validateSegment, 
  validatePagination, 
  validateIdParam,
  validateAudiencePreview,
  sanitizeInput 
} = require('../middleware/validation');
const {
  createSegment,
  getSegments,
  getSegmentById,
  previewAudience,
  updateSegment,
  deleteSegment,
  getSegmentStats
} = require('../controllers/segmentController');

const router = express.Router();

// Apply authentication to all routes
router.use(authenticateToken);
router.use(sanitizeInput);

// Get segment statistics
router.get('/stats', getSegmentStats);

// Preview audience for rules (with rate limiting for AI calls)
router.post('/preview', rateLimitAuth(20, 60000), validateAudiencePreview, previewAudience);

// Get all segments for current user
router.get('/', validatePagination, getSegments);

// Get specific segment by ID
router.get('/:id', validateIdParam, getSegmentById);

// Create new segment
router.post('/', rateLimitAuth(10, 60000), validateSegment, createSegment);

// Update segment
router.put('/:id', validateIdParam, validateSegment, updateSegment);

// Delete segment
router.delete('/:id', validateIdParam, deleteSegment);

module.exports = router;
