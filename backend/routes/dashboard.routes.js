const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboard.controller');

// @route   GET /api/dashboard/stats
// @desc    Get dashboard statistics
// @access  Private
router.get('/stats', dashboardController.getStats);

// @route   GET /api/dashboard/recent
// @desc    Get recent processing jobs
// @access  Private
router.get('/recent', dashboardController.getRecentJobs);

// @route   GET /api/dashboard/quick-stats
// @desc    Get quick overview stats
// @access  Private
router.get('/quick-stats', dashboardController.getQuickStats);

module.exports = router;