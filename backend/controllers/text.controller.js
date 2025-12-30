// controllers/text.controller.js
const pythonService = require('../services/pythonService');
const path = require('path');
const fs = require('fs-extra');
const { v4: uuidv4 } = require('uuid');

// Store processing jobs (in production, use Redis or database)
const processingJobs = new Map();

class TextController {
  // Upload and process file
  async uploadFile(req, res) {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          error: 'No file uploaded'
        });
      }

      const jobId = uuidv4();
      
      // Start processing in background
      processingJobs.set(jobId, {
        status: 'processing',
        filename: req.file.filename,
        startedAt: new Date()
      });

      // Process in background
      this.processFileAsync(jobId, req.file.path, req.body);

      return res.json({
        success: true,
        jobId: jobId,
        message: 'File uploaded and processing started',
        filename: req.file.filename
      });

    } catch (error) {
      console.error('Upload error:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to upload file'
      });
    }
  }

  // Async file processing
  async processFileAsync(jobId, filePath, options = {}) {
    try {
      const textColumn = options.textColumn || null;
      const maxTexts = options.maxTexts || 1000;

      // Call Python service
      const result = await pythonService.analyzeFile(filePath, textColumn, maxTexts);

      // Update job status
      processingJobs.set(jobId, {
        ...processingJobs.get(jobId),
        status: 'completed',
        completedAt: new Date(),
        result: result
      });

      // Clean up file
      try {
        await fs.unlink(filePath);
      } catch (cleanupError) {
        console.warn('Failed to cleanup file:', cleanupError);
      }

    } catch (error) {
      console.error('Processing error:', error);
      
      processingJobs.set(jobId, {
        ...processingJobs.get(jobId),
        status: 'failed',
        completedAt: new Date(),
        error: error.message
      });

      // Clean up file on error
      try {
        await fs.unlink(filePath);
      } catch (cleanupError) {
        console.warn('Failed to cleanup file on error:', cleanupError);
      }
    }
  }

  // Process direct text
  async processText(req, res) {
    try {
      const { text } = req.body;

      if (!text) {
        return res.status(400).json({
          success: false,
          error: 'Text is required'
        });
      }

      const result = await pythonService.analyzeText(text);

      return res.json({
        success: true,
        ...result
      });

    } catch (error) {
      console.error('Text processing error:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to process text'
      });
    }
  }

  // Process batch files
  async processBatch(req, res) {
    try {
      if (!req.files || req.files.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'No files uploaded'
        });
      }

      const jobId = uuidv4();
      const files = req.files;

      processingJobs.set(jobId, {
        status: 'processing',
        fileCount: files.length,
        startedAt: new Date(),
        files: files.map(f => f.filename)
      });

      // Process in background
      this.processBatchAsync(jobId, files, req.body);

      return res.json({
        success: true,
        jobId: jobId,
        message: `Processing ${files.length} files`,
        fileCount: files.length
      });

    } catch (error) {
      console.error('Batch processing error:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to process batch'
      });
    }
  }

  // Async batch processing
  async processBatchAsync(jobId, files, options = {}) {
    try {
      const results = [];
      const textColumn = options.textColumn || null;
      const maxTexts = options.maxTexts || 1000;

      for (const file of files) {
        try {
          const result = await pythonService.analyzeFile(file.path, textColumn, maxTexts);
          results.push({
            filename: file.filename,
            success: true,
            result: result
          });
        } catch (fileError) {
          results.push({
            filename: file.filename,
            success: false,
            error: fileError.message
          });
        }

        // Clean up file
        try {
          await fs.unlink(file.path);
        } catch (cleanupError) {
          console.warn(`Failed to cleanup ${file.filename}:`, cleanupError);
        }
      }

      // Update job status
      processingJobs.set(jobId, {
        ...processingJobs.get(jobId),
        status: 'completed',
        completedAt: new Date(),
        results: results
      });

    } catch (error) {
      console.error('Batch async error:', error);
      
      processingJobs.set(jobId, {
        ...processingJobs.get(jobId),
        status: 'failed',
        completedAt: new Date(),
        error: error.message
      });
    }
  }

  // Get job status
  async getStatus(req, res) {
    try {
      const { jobId } = req.params;
      
      if (!processingJobs.has(jobId)) {
        return res.status(404).json({
          success: false,
          error: 'Job not found'
        });
      }

      const job = processingJobs.get(jobId);
      
      return res.json({
        success: true,
        jobId: jobId,
        status: job.status,
        startedAt: job.startedAt,
        completedAt: job.completedAt,
        filename: job.filename,
        fileCount: job.fileCount
      });

    } catch (error) {
      console.error('Status check error:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to check status'
      });
    }
  }

  // Get results
  async getResults(req, res) {
    try {
      const { jobId } = req.params;
      
      if (!processingJobs.has(jobId)) {
        return res.status(404).json({
          success: false,
          error: 'Job not found'
        });
      }

      const job = processingJobs.get(jobId);
      
      if (job.status === 'processing') {
        return res.json({
          success: true,
          status: 'processing',
          message: 'Job is still processing'
        });
      }

      if (job.status === 'failed') {
        return res.json({
          success: false,
          status: 'failed',
          error: job.error
        });
      }

      return res.json({
        success: true,
        status: 'completed',
        result: job.result,
        results: job.results,
        startedAt: job.startedAt,
        completedAt: job.completedAt
      });

    } catch (error) {
      console.error('Results error:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to get results'
      });
    }
  }

  // Cancel job
  async cancelJob(req, res) {
    try {
      const { jobId } = req.params;
      
      if (!processingJobs.has(jobId)) {
        return res.status(404).json({
          success: false,
          error: 'Job not found'
        });
      }

      const job = processingJobs.get(jobId);
      
      if (job.status === 'completed' || job.status === 'failed') {
        return res.json({
          success: false,
          error: 'Job already completed'
        });
      }

      // Update status
      processingJobs.set(jobId, {
        ...job,
        status: 'cancelled',
        cancelledAt: new Date()
      });

      return res.json({
        success: true,
        message: 'Job cancelled successfully'
      });

    } catch (error) {
      console.error('Cancel error:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to cancel job'
      });
    }
  }

  // Get supported formats
  async getSupportedFormats(req, res) {
    try {
      const formats = await pythonService.getSupportedFormats();
      return res.json(formats);
    } catch (error) {
      console.error('Formats error:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to get supported formats'
      });
    }
  }
}

module.exports = new TextController();
