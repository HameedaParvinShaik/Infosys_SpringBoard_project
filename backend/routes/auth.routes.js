const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');
const { authenticateToken } = require('../middleware/auth'); // ← ADD THIS
const { validateRegister, validateLogin, handleValidationErrors } = require('../middleware/validation');

// @route   POST /api/auth/register
// @desc    Register new user
// @access  Public
router.post('/register', 
  validateRegister,
  handleValidationErrors,
  authController.register
);

// @route   POST /api/auth/login
// @desc    Authenticate user & get token
// @access  Public
router.post('/login',
  validateLogin,
  handleValidationErrors,
  authController.login
);

// @route   POST /api/auth/logout
// @desc    Logout user
// @access  Private
router.post('/logout', authenticateToken, authController.logout); // ← Add here too

// @route   GET /api/auth/me
// @desc    Get current user profile
// @access  Private
router.get('/me', authenticateToken, authController.getProfile); // ← ADD HERE

module.exports = router;