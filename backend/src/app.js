const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 7860;

// Middleware
app.use(helmet({
  contentSecurityPolicy: false // Disable for development
}));

app.use(cors({
  origin: [
    'https://frontend-ix7tjnt2l-chaitanya-jayants-projects.vercel.app',
    'https://frontend-mocha-five-37.vercel.app',
    'http://localhost:5173',
    'http://localhost:3000'
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(morgan('combined'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Health check endpoint (REQUIRED for HF Spaces)
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    service: 'Xeno CRM API',
    version: '1.0.0',
    port: PORT,
    environment: process.env.NODE_ENV || 'production',
    frontend: process.env.FRONTEND_URL || 'https://frontend-ix7tjnt2l-chaitanya-jayants-projects.vercel.app'
  });
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'Xeno CRM Backend API',
    version: '1.0.0',
    status: 'running',
    endpoints: {
      health: '/health',
      api: '/api',
      test: '/api/test'
    }
  });
});

// API Test endpoint
app.get('/api/test', (req, res) => {
  res.json({
    message: 'Xeno CRM Backend is running successfully!',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    frontend_connected: true
  });
});

// Basic API endpoints (placeholders for future development)
app.get('/api/customers', (req, res) => {
  res.json({
    customers: [],
    message: 'Customers endpoint working',
    count: 0,
    timestamp: new Date().toISOString()
  });
});

app.get('/api/segments', (req, res) => {
  res.json({
    segments: [],
    message: 'Segments endpoint working',
    count: 0,
    timestamp: new Date().toISOString()
  });
});

app.get('/api/campaigns', (req, res) => {
  res.json({
    campaigns: [],
    message: 'Campaigns endpoint working',
    count: 0,
    timestamp: new Date().toISOString()
  });
});

// 404 handler for API routes
app.use('/api/*', (req, res) => {
  res.status(404).json({
    error: 'API endpoint not found',
    path: req.path,
    message: 'This endpoint is not yet implemented',
    available_endpoints: ['/api/test', '/api/customers', '/api/segments', '/api/campaigns']
  });
});

// General 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Route not found',
    path: req.path,
    message: 'Please use /health or /api/* endpoints'
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Error:', err.stack);
  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong!',
    timestamp: new Date().toISOString()
  });
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Xeno CRM Backend running on port ${PORT}`);
  console.log(`📊 Environment: ${process.env.NODE_ENV || 'production'}`);
  console.log(`🌐 Health check: http://localhost:${PORT}/health`);
  console.log(`🔗 Frontend: ${process.env.FRONTEND_URL || 'https://frontend-ix7tjnt2l-chaitanya-jayants-projects.vercel.app'}`);
  console.log(`📡 API: http://localhost:${PORT}/api/test`);
});

module.exports = app;
