const jwt = require('jsonwebtoken');

const generateToken = (userId) => {
  return jwt.sign(
    { userId }, 
    process.env.JWT_SECRET || 'xeno-crm-jwt-secret', 
    { expiresIn: '7d' }
  );
};

const googleAuth = (req, res, next) => {
  console.log('🔐 Initiating Google OAuth');
  next();
};

const googleCallback = async (req, res) => {
  try {
    if (!req.user) {
      console.log('❌ OAuth failed - no user');
      return res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:5173'}/login?error=auth_failed`);
    }

    const token = generateToken(req.user.id);
    
    // --- THIS IS THE CHANGE ---
    // Instead of setting a cookie, redirect with the token in the query params.
    res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:5173'}/auth/callback?token=${token}`);
    // -------------------------
    
  } catch (error) {
    console.error('❌ Auth callback error:', error);
    res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:5173'}/login?error=server_error`);
  }
};

const getCurrentUser = async (req, res) => {
  try {
    const user = {
      id: req.user.id,
      email: req.user.email,
      name: req.user.name,
      profilePicture: req.user.profile_picture
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
  try {
    res.clearCookie('auth_token');
    
    req.logout((err) => {
      if (err) {
        console.error('❌ Logout error:', err);
        return res.status(500).json({ 
          success: false,
          error: 'Logout failed' 
        });
      }
      
      console.log('👋 User logged out successfully');
      res.json({ 
        success: true,
        message: 'Logged out successfully' 
      });
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
  try {
    if (req.user) {
      res.json({
        success: true,
        authenticated: true,
        user: {
          id: req.user.id,
          email: req.user.email,
          name: req.user.name,
          profilePicture: req.user.profile_picture
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
  googleAuth,
  googleCallback,
  getCurrentUser,
  logout,
  checkAuth
};
