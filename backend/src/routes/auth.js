// backend/src/routes/auth.js

const express = require('express');
const passport = require('passport');
const { authenticateToken, optionalAuth } = require('../middleware/auth');
const { 
  googleCallback, 
  getCurrentUser, 
  logout, 
  checkAuth,
  demoLogin // Import the new controller
} = require('../controllers/authController');

const router = express.Router();

// Google OAuth routes
router.get('/google', 
  passport.authenticate('google', { 
    scope: ['profile', 'email'] 
  })
);

router.get('/google/callback',
  passport.authenticate('google', { 
    failureRedirect: '/auth/failure', 
    session: false 
  }),
  googleCallback
);

router.get('/failure', (req, res) => {
  res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:5173'}/login?error=auth_failed`);
});

// NEW: Add the route for demo login
router.post('/demo', demoLogin);

// Get current authenticated user
router.get('/me', authenticateToken, getCurrentUser);

// Check authentication status
router.get('/check', optionalAuth, checkAuth);

// Logout
router.post('/logout', authenticateToken, logout);
router.get('/logout', authenticateToken, logout); // Keep for easier integration

module.exports = router;
