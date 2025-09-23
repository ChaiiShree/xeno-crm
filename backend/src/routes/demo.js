const express = require('express');
const jwt = require('jsonwebtoken');
const { pool } = require('../config/database');
const router = express.Router();

router.post('/login', async (req, res) => {
  try {
    // Get the demo user
    const result = await pool.query(
      'SELECT * FROM users WHERE email = $1',
      ['demo@xeno.com']
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Demo user not found'
      });
    }
    
    const demoUser = result.rows[0];
    
    // Generate JWT token
    const token = jwt.sign(
      { 
        id: demoUser.id,
        email: demoUser.email,
        name: demoUser.name 
      },
      process.env.JWT_SECRET || 'your-jwt-secret',
      { expiresIn: '7d' }
    );
    
    res.json({
      success: true,
      token,
      user: {
        id: demoUser.id,
        email: demoUser.email,
        name: demoUser.name,
        profilePicture: demoUser.profile_picture
      }
    });
  } catch (error) {
    console.error('Demo login error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to login demo user'
    });
  }
});

module.exports = router;
