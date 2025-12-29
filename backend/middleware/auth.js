const jwt = require('jsonwebtoken');
const config = require('../config/config');

// Authentication middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Get token after "Bearer"

  if (!token) {
    return res.status(401).json({ 
      success: false, 
      message: 'Access token required' 
    });
  }

  try {
    // Verify token
    const decoded = jwt.verify(token, config.jwt.secret);
    
    // Add user info to request
    req.user = {
      userId: decoded.userId,
      email: decoded.email
    };
    
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Token has expired'
      });
    }
    
    return res.status(403).json({ 
      success: false, 
      message: 'Invalid or malformed token' 
    });
  }
};

// Generate JWT token
const generateToken = (userId, email) => {
  return jwt.sign(
    { userId, email },
    config.jwt.secret,
    { expiresIn: config.jwt.expiresIn }
  );
};

module.exports = {
  authenticateToken,
  generateToken
};