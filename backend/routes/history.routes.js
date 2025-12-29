const express = require('express');
const router = express.Router();
const historyController = require('../controllers/history.controller');

// @route   GET /api/history
// @desc    Get user's processing history
// @access  Private
router.get('/', historyController.getHistory);

// @route   GET /api/history/:id
// @desc    Get specific history record
// @access  Private
router.get('/:id', historyController.getHistoryById);

// @route   DELETE /api/history/:id
// @desc    Delete history record
// @access  Private
router.delete('/:id', historyController.deleteHistory);

// @route   GET /api/history/export/:id
// @desc    Export history as CSV
// @access  Private
router.get('/export/:id', historyController.exportHistory);

// @route   GET /api/history/search
// @desc    Search through history
// @access  Private
router.get('/search', historyController.searchHistory);

module.exports = router;