// File: controllers/authController.js

const jwt = require('jsonwebtoken');

const googleCallback = async (req, res) => {
  try {
    if (!req.user) {
      console.log('❌ OAuth failed - Passport did not return a user.');
      return res.redirect(`${process.env.FRONTEND_URL}/login?error=auth_failed`);
    }

    // Passport has successfully authenticated the user; `req.user` is available.
    // Now, we create a JWT for our stateless API.
    const token = jwt.sign(
      { userId: req.user.id, email: req.user.email, name: req.user.name, role: req.user.role },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );
    
    // Redirect the user back to the frontend, passing the token in the URL.
    // The frontend will read this token from the URL and save it.
    res.redirect(`${process.env.FRONTEND_URL}/auth/callback?token=${token}`);
    
  } catch (error) {
    console.error('❌ Auth callback controller error:', error);
    res.redirect(`${process.env.FRONTEND_URL}/login?error=server_error`);
  }
};

const getCurrentUser = async (req, res) => {
  // The `authenticateToken` middleware has already validated the JWT
  // and attached the user's data to `req.user`.
  try {
    const user = {
      id: req.user.id,
      email: req.user.email,
      name: req.user.name,
      profilePicture: req.user.profile_picture,
      role: req.user.role
    };
    
    res.json({ 
      success: true,
      user 
    });
    
  } catch (error) {
    console.error('❌ Get current user error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to get user info' 
    });
  }
};

const logout = async (req, res) => {
  // FIX: For JWT authentication, logout is primarily a client-side responsibility
  // (i.e., deleting the token). This server endpoint is a courtesy.
  // The session-specific `req.logout()` is no longer needed.
  try {
    console.log(`👋 User logged out: ${req.user.email}`);
    res.json({ 
      success: true,
      message: 'Logged out successfully' 
    });
  } catch (error) {
    console.error('❌ Logout error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Logout failed' 
    });
  }
};

const checkAuth = async (req, res) => {
  // The `optionalAuth` middleware will add `req.user` if a valid token is present.
  try {
    if (req.user) {
      res.json({
        success: true,
        authenticated: true,
        user: {
          id: req.user.id,
          email: req.user.email,
          name: req.user.name,
          profilePicture: req.user.profile_picture,
          role: req.user.role
        }
      });
    } else {
      res.json({
        success: true,
        authenticated: false
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to check authentication'
    });
  }
};

module.exports = {
  googleCallback,
  getCurrentUser,
  logout,
  checkAuth
};