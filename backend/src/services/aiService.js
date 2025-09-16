// Load environment variables at the top
require('dotenv').config();

const { GoogleGenerativeAI } = require('@google/generative-ai');

class AIService {
  constructor() {
    // Debug logging
    console.log('🔑 AIService initializing...');
    console.log('API Key exists:', !!process.env.GEMINI_API_KEY);
    console.log('Model:', process.env.GEMINI_MODEL);
    
    if (!process.env.GEMINI_API_KEY) {
      throw new Error('GEMINI_API_KEY not found in environment variables');
    }
    
    this.genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    this.model = this.genAI.getGenerativeModel({ 
      model: process.env.GEMINI_MODEL || 'gemini-1.5-flash' 
    });
    
    console.log('✅ AIService initialized successfully');
  }

  // Natural Language Customer Segmentation
  async generateSegmentFromNLP(naturalLanguageQuery, customerData) {
    const prompt = `
    Based on this customer data structure: ${JSON.stringify(customerData.sample || {}, null, 2)}
    
    Convert this natural language query into a customer segmentation rule:
    "${naturalLanguageQuery}"
    
    Return ONLY a valid JSON object with:
    - conditions: array of {field, operator, value}
    - explanation: human-readable explanation
    - estimatedAudience: rough audience size estimate
    - suggestedName: suggested segment name
    `;

    try {
      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();
      
      // Clean up response to ensure valid JSON
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      throw new Error('Invalid JSON response');
    } catch (error) {
      console.error('Gemini API error:', error);
      throw error;
    }
  }

  // AI Message Generation for Campaigns
  async generateCampaignMessage(campaignType, audience, tone = 'professional') {
    console.log('🤖 Generating message with model:', process.env.GEMINI_MODEL);
    
    const prompt = `
    Generate a personalized marketing message for:
    - Campaign Type: ${campaignType}
    - Target Audience: ${JSON.stringify(audience)}
    - Tone: ${tone}
    
    Return ONLY a valid JSON object with:
    - subject: email subject line (under 50 characters)
    - message: main message body (under 200 words)
    - cta: call-to-action text (under 20 characters)
    `;

    try {
      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();
      
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      throw new Error('Invalid JSON response');
    } catch (error) {
      console.error('Gemini API error:', error);
      throw error;
    }
  }

  // Campaign Performance Insights
  async generateCampaignInsights(campaignData) {
    const prompt = `
    Analyze this campaign performance data and provide actionable insights:
    ${JSON.stringify(campaignData, null, 2)}
    
    Return ONLY a valid JSON object with:
    - insights: array of 3-5 key insights (strings)
    - recommendations: array of 3-5 improvement suggestions (strings)
    - nextSteps: array of 3-5 recommended next actions (strings)
    `;

    try {
      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();
      
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      throw new Error('Invalid JSON response');
    } catch (error) {
      console.error('Gemini API error:', error);
      throw error;
    }
  }
}

module.exports = new AIService();
