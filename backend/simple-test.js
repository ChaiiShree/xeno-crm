// simple-test.js
require('dotenv').config();
const { GoogleGenerativeAI } = require('@google/generative-ai');

async function simpleTest() {
  try {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: 'gemini-pro' });
    
    console.log('🧪 Testing with simple prompt...');
    const result = await model.generateContent('Say hello in JSON format: {"message": "your message"}');
    const response = await result.response;
    const text = response.text();
    
    console.log('✅ SUCCESS:', text);
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

simpleTest();
