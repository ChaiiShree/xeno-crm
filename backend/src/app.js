const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 7860;

// Middleware
app.use(helmet({
  contentSecurityPolicy: false
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
      auth: '/auth/google',
      api: '/api',
      test: '/api/test'
    }
  });
});

// **GOOGLE OAUTH ROUTES** (Fix for login issue)
app.get('/auth/google', (req, res) => {
  // For now, return a demo user - replace with actual Google OAuth later
  res.json({
    success: true,
    message: 'Google OAuth endpoint working',
    user: {
      id: 'demo-user-123',
      name: 'Demo User',
      email: 'demo@xeno.com',
      avatar: 'https://via.placeholder.com/100'
    },
    token: 'demo-jwt-token-12345',
    redirect_url: process.env.FRONTEND_URL + '/dashboard'
  });
});

app.post('/auth/google', (req, res) => {
  // Handle Google OAuth callback
  res.json({
    success: true,
    message: 'Google OAuth login successful',
    user: {
      id: 'demo-user-123',
      name: 'Demo User', 
      email: 'demo@xeno.com',
      avatar: 'https://via.placeholder.com/100'
    },
    token: 'demo-jwt-token-12345'
  });
});

app.get('/auth/google/callback', (req, res) => {
  // Google OAuth callback endpoint
  const frontendUrl = process.env.FRONTEND_URL || 'https://frontend-ix7tjnt2l-chaitanya-jayants-projects.vercel.app';
  res.redirect(`${frontendUrl}/dashboard?auth=success&token=demo-jwt-token-12345`);
});

// **API ENDPOINTS**
app.get('/api/test', (req, res) => {
  res.json({
    message: 'Xeno CRM Backend API is working!',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    frontend_connected: true
  });
});

// Customer endpoints
app.get('/api/customers', (req, res) => {
  res.json({
    customers: [
      {
        id: 1,
        name: 'John Doe',
        email: 'john@example.com',
        total_spending: 1200,
        visits: 5,
        last_visit: '2025-09-15'
      },
      {
        id: 2,
        name: 'Jane Smith',
        email: 'jane@example.com', 
        total_spending: 800,
        visits: 3,
        last_visit: '2025-09-14'
      }
    ],
    count: 2,
    timestamp: new Date().toISOString()
  });
});

app.post('/api/customers', (req, res) => {
  res.json({
    success: true,
    message: 'Customer created successfully',
    customer: req.body,
    timestamp: new Date().toISOString()
  });
});

// Segment endpoints
app.get('/api/segments', (req, res) => {
  res.json({
    segments: [
      {
        id: 1,
        name: 'High Value Customers',
        criteria: 'total_spending > 1000',
        count: 25
      },
      {
        id: 2,
        name: 'Recent Visitors',
        criteria: 'last_visit < 7 days',
        count: 12
      }
    ],
    count: 2,
    timestamp: new Date().toISOString()
  });
});

// Campaign endpoints
app.get('/api/campaigns', (req, res) => {
  res.json({
    campaigns: [
      {
        id: 1,
        name: 'Welcome Campaign',
        status: 'active',
        sent: 150,
        opened: 75,
        clicked: 23
      }
    ],
    count: 1,
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

// 404 handler for auth routes
app.use('/auth/*', (req, res) => {
  res.status(404).json({
    error: 'Auth endpoint not found',
    path: req.path,
    message: 'This auth endpoint is not yet implemented',
    available_endpoints: ['/auth/google']
  });
});

// General 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Route not found',
    path: req.path,
    message: 'Please use /health, /auth/*, or /api/* endpoints'
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
  console.log(`🔒 Auth endpoint: http://localhost:${PORT}/auth/google`);
  console.log(`🔗 Frontend: ${process.env.FRONTEND_URL || 'https://frontend-ix7tjnt2l-chaitanya-jayants-projects.vercel.app'}`);
  console.log(`📡 API: http://localhost:${PORT}/api/test`);
});

module.exports = app;
