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

 // In AIService.js

async generateSegmentFromNLP(naturalLanguageQuery) {
    const prompt = `
    You are a helpful assistant for a Customer Relationship Management (CRM) system.
    Your task is to convert a user's natural language query into a structured JSON object for segmenting customers.

    The valid fields for conditions are:
    - "totalSpend": The customer's total spending (numeric).
    - "visitCount": The total number of visits (numeric).
    - "lastVisit": The date of the customer's last visit (date).

    The valid operators are: '>', '<', '>=', '<=', '=', '!='.

    For date-based queries like "in the last 6 months", convert them to a specific date format (YYYY-MM-DD). Assume today's date is ${new Date().toISOString().split('T')[0]}.

    Return ONLY a valid JSON object with the following structure:
    {
      "conditions": [
        {
          "field": "valid_field_name",
          "operator": "valid_operator",
          "value": "string or number"
        }
      ],
      "operator": "AND" | "OR",
      "explanation": "A human-readable explanation of the rules.",
      "suggestedName": "A short, descriptive name for the segment."
    }
    
    User Query: "${naturalLanguageQuery}"
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
      throw new Error('Invalid JSON response from AI');
    } catch (error) {
      console.error('Gemini API error in generateSegmentFromNLP:', error);
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
