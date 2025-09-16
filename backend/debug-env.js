// debug-env.js
require('dotenv').config();

console.log('🔍 Environment Debug:');
console.log('Working Directory:', process.cwd());
console.log('GEMINI_API_KEY exists:', !!process.env.GEMINI_API_KEY);
console.log('GEMINI_API_KEY value:', process.env.GEMINI_API_KEY ? process.env.GEMINI_API_KEY.substring(0, 15) + '...' : 'UNDEFINED');
console.log('GEMINI_MODEL:', process.env.GEMINI_MODEL || 'UNDEFINED');
console.log('All GEMINI vars:', Object.keys(process.env).filter(key => key.includes('GEMINI')));
