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
router.get('/google', 
  passport.authenticate('google', { 
    scope: ['profile', 'email'] 
  })
);

router.get('/google/callback',
  passport.authenticate('google', { failureRedirect: '/auth/failure' }),
  googleCallback
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
