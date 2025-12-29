const express = require('express');
const router = express.Router();
const textController = require('../controllers/text.controller');
const { upload, handleUploadError } = require('../middleware/upload');
const { validateProcessText, handleValidationErrors } = require('../middleware/validation');

// @route   POST /api/text/upload
// @desc    Upload text file for processing
// @access  Private
router.post('/upload',
  upload.single('file'),
  handleUploadError,
  textController.uploadFile
);

// @route   POST /api/text/process
// @desc    Process text directly (without file)
// @access  Private
router.post('/process',
  validateProcessText,
  handleValidationErrors,
  textController.processText
);

// @route   POST /api/text/batch
// @desc    Process multiple files in batch
// @access  Private
router.post('/batch',
  upload.array('files', 5),
  handleUploadError,
  textController.processBatch
);

// @route   GET /api/text/status/:jobId
// @desc    Get processing status
// @access  Private
router.get('/status/:jobId', textController.getStatus);

// @route   GET /api/text/results/:jobId
// @desc    Get processing results
// @access  Private
router.get('/results/:jobId', textController.getResults);

// @route   DELETE /api/text/cancel/:jobId
// @desc    Cancel processing job
// @access  Private
router.delete('/cancel/:jobId', textController.cancelJob);

module.exports = router;