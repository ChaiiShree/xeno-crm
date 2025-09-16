const express = require('express');
const router = express.Router();
const aiController = require('../controllers/aiController');
const { authenticateToken } = require('../middleware/auth'); // DESTRUCTURE the function!

// All AI routes require authentication
router.use(authenticateToken); // Use the specific function

// Natural Language Segmentation
router.post('/segments/generate', aiController.generateSegment);

// Message Generation
router.post('/messages/generate', aiController.generateMessage);

// Campaign Insights
router.get('/campaigns/:campaignId/insights', aiController.getCampaignInsights);

module.exports = router;
