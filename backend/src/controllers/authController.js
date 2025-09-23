// backend/src/controllers/authController.js

const jwt = require('jsonwebtoken');
const { pool } = require('../config/database'); // Ensure you have this import

const googleCallback = async (req, res) => {
  try {
    if (!req.user) {
      console.log('❌ OAuth failed - Passport did not return a user.');
      return res.redirect(`${process.env.FRONTEND_URL}/login?error=auth_failed`);
    }

    const token = jwt.sign(
      { userId: req.user.id, email: req.user.email, name: req.user.name, role: req.user.role },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );
    
    res.redirect(`${process.env.FRONTEND_URL}/auth/callback?token=${token}`);
    
  } catch (error) {
    console.error('❌ Auth callback controller error:', error);
    res.redirect(`${process.env.FRONTEND_URL}/login?error=server_error`);
  }
};

/**
 * NEW: Demo Login Function
 * Finds the pre-configured demo user and issues a valid JWT.
 */
const demoLogin = async (req, res) => {
  try {
    // This email must match the user you created in your Neon database.
    const demoUserEmail = 'demo@xeno.com';
    const demoUserResult = await pool.query(
      'SELECT * FROM users WHERE email = $1',
      [demoUserEmail]
    );

    if (demoUserResult.rows.length === 0) {
      console.error(`❌ Demo login failed: User with email ${demoUserEmail} not found in the database.`);
      return res.status(404).json({
        success: false,
        error: 'Demo user account not found. Please ensure it has been created.'
      });
    }

    const demoUser = demoUserResult.rows[0];

    const token = jwt.sign(
      { userId: demoUser.id, email: demoUser.email, name: demoUser.name, role: demoUser.role },
      process.env.JWT_SECRET,
      { expiresIn: '1h' } // Shorter expiry for demo sessions is a good practice
    );
    
    res.json({
      success: true,
      token,
      user: { // Send user info back immediately for a faster UI update
        id: demoUser.id,
        email: demoUser.email,
        name: demoUser.name,
        profilePicture: demoUser.profile_picture
      }
    });

  } catch (error) {
    console.error('❌ Demo login server error:', error);
    res.status(500).json({
      success: false,
      error: 'Demo login failed due to a server error.'
    });
  }
};


const getCurrentUser = async (req, res) => {
  try {
    const user = {
      id: req.user.id,
      email: req.user.email,
      name: req.user.name,
      profilePicture: req.user.profile_picture,
      role: req.user.role
    };
    res.json({ success: true, user });
  } catch (error) {
    console.error('❌ Get current user error:', error);
    res.status(500).json({ success: false, error: 'Failed to get user info' });
  }
};

const logout = async (req, res) => {
  try {
    console.log(`👋 User logged out: ${req.user.email}`);
    res.json({ success: true, message: 'Logged out successfully' });
  } catch (error) {
    console.error('❌ Logout error:', error);
    res.status(500).json({ success: false, error: 'Logout failed' });
  }
};

const checkAuth = async (req, res) => {
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
      res.json({ success: true, authenticated: false });
    }
};

module.exports = {
  googleCallback,
  getCurrentUser,
  logout,
  checkAuth,
  demoLogin // Export the new function
};
