const express = require('express');
const { authenticateToken, rateLimitAuth } = require('../middleware/auth');
const { 
  validateCampaign, 
  validatePagination, 
  validateIdParam,
  validateDeliveryStatus,
  sanitizeInput 
} = require('../middleware/validation');
const {
  createCampaign,
  launchCampaign,
  getCampaigns,
  getCampaignById,
  generateAIMessages,
  getCampaignInsights,
  updateDeliveryStatus,
  getCampaignStats
} = require('../controllers/campaignController');

const router = express.Router();

// Apply authentication to all routes
router.use(authenticateToken);
router.use(sanitizeInput);

// Get campaign statistics
router.get('/stats', getCampaignStats);

// Generate AI messages for campaign (with rate limiting)
router.post('/ai-messages', rateLimitAuth(5, 60000), generateAIMessages);

// Update delivery status (webhook endpoint for vendor API)
router.post('/delivery-status', validateDeliveryStatus, updateDeliveryStatus);

// Get all campaigns for current user
router.get('/', validatePagination, getCampaigns);

// Get specific campaign by ID with delivery stats
router.get('/:id', validateIdParam, getCampaignById);

// Get AI-powered campaign insights
router.get('/:id/insights', validateIdParam, getCampaignInsights);

// Create new campaign
router.post('/', rateLimitAuth(10, 60000), validateCampaign, createCampaign);

// Launch campaign (start delivery)
router.post('/:id/launch', validateIdParam, launchCampaign);

module.exports = router;
