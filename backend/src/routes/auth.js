// File: routes/auth.js

const express = require('express');
const passport = require('passport');
const { authenticateToken, optionalAuth } = require('../middleware/auth');
const { 
  googleCallback, 
  getCurrentUser, 
  logout, 
  checkAuth 
} = require('../controllers/authController');

const router = express.Router();

// Google OAuth routes
// This route starts the Google login process
router.get('/google', 
  passport.authenticate('google', { 
    scope: ['profile', 'email'] 
  })
);

// Google redirects the user back to this route after they log in
router.get('/google/callback',
  // FIX: Added `session: false` to disable session creation.
  // We will handle authentication with a JWT instead.
  passport.authenticate('google', { 
    failureRedirect: '/auth/failure', 
    session: false 
  }),
  googleCallback // The controller now creates and sends the JWT
);

// Auth failure redirect
router.get('/failure', (req, res) => {
  res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:5173'}/login?error=auth_failed`);
});

// Get current authenticated user
router.get('/me', authenticateToken, getCurrentUser);

// Check authentication status (optional auth)
router.get('/check', optionalAuth, checkAuth);

// Logout
router.post('/logout', authenticateToken, logout);

// Alternative logout route (GET for easier frontend integration)
router.get('/logout', authenticateToken, logout);

module.exports = router;