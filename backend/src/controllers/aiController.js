const aiService = require('../services/aiService');

const generateSegment = async (req, res) => {
  try {
    const { naturalLanguageQuery } = req.body;
    
    if (!naturalLanguageQuery) {
      return res.status(400).json({ 
        success: false, 
        error: 'naturalLanguageQuery is required' 
      });
    }
    
    // Mock customer data for context (since database queries aren't working)
    const sampleData = {
      sample: [
        {
          id: 1,
          totalSpent: 15000,
          lastOrderDate: '2024-01-15',
          orderCount: 5,
          customerSince: '2023-06-01'
        }
      ]
    };
    
    const segmentRules = await aiService.generateSegmentFromNLP(
      naturalLanguageQuery, 
      sampleData
    );
    
    res.json({ success: true, data: segmentRules });
  } catch (error) {
    console.error('Generate segment error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message || 'Failed to generate segment' 
    });
  }
};

const generateMessage = async (req, res) => {
  try {
    const { campaignType, audience, tone } = req.body;
    
    if (!campaignType || !audience) {
      return res.status(400).json({ 
        success: false, 
        error: 'campaignType and audience are required' 
      });
    }
    
    const message = await aiService.generateCampaignMessage(
      campaignType, 
      audience, 
      tone || 'professional'
    );
    
    res.json({ success: true, data: message });
  } catch (error) {
    console.error('Generate message error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message || 'Failed to generate message' 
    });
  }
};

const getCampaignInsights = async (req, res) => {
  try {
    const { campaignId } = req.params;
    
    if (!campaignId) {
      return res.status(400).json({ 
        success: false, 
        error: 'campaignId is required' 
      });
    }
    
    // Mock campaign data for now
    const mockCampaignData = {
      id: campaignId,
      name: 'Sample Campaign',
      totalSent: 1500,
      successfulSends: 1350,
      failedSends: 150,
      openRate: 0.25,
      clickRate: 0.05,
      conversionRate: 0.02
    };
    
    const insights = await aiService.generateCampaignInsights(mockCampaignData);
    
    res.json({ success: true, data: insights });
  } catch (error) {
    console.error('Get campaign insights error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message || 'Failed to get campaign insights' 
    });
  }
};

module.exports = {
  generateSegment,
  generateMessage,
  getCampaignInsights
};
