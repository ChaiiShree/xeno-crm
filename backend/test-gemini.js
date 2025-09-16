// test-gemini.js
require('dotenv').config();

console.log('🔍 Test Environment Check:');
console.log('GEMINI_API_KEY loaded:', !!process.env.GEMINI_API_KEY);
console.log('GEMINI_MODEL:', process.env.GEMINI_MODEL);

const aiService = require('./src/services/aiService');

async function testGemini() {
  try {
    console.log('🧪 Testing Gemini API...');
    
    // Test message generation
    const message = await aiService.generateCampaignMessage(
      'promotional', 
      { segment: 'high-value customers' }, 
      'friendly'
    );
    
    console.log('✅ Message generated:', message);
    console.log('🎉 Gemini integration working!');
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

testGemini();
