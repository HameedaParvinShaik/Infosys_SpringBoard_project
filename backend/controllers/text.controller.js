const path = require('path');
const fs = require('fs').promises;
const { logger } = require('../utils/logger');
const emailService = require('../services/email.service');
const config = require('../config/config');
const ProcessingJob = require('../models/ProcessingJob');
// Remove or comment out the Map:
// const processingJobs = new Map();

/**
 * Background job processor
 */
const processJobInBackground = async (jobId, filePath, userId, userEmail) => {
  try {
    // Update job status to processing
    await ProcessingJob.findByIdAndUpdate(jobId, {
      status: 'processing',
      startedAt: new Date(),
      progress: 10
    });
    
    // Read file content
    const fileContent = await fs.readFile(filePath, 'utf8');
    
    // Simulate processing (replace with Python integration later)
    const simulateProcessing = async () => {
      // Simulate processing delay
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // Use existing simulation logic
      const lines = fileContent.split('\n');
      const chunkSize = Math.ceil(lines.length / 4);
      const results = [];
      
      for (let i = 0; i < lines.length; i++) {
        results.push({
          lineNumber: i + 1,
          originalText: lines[i],
          sentimentScore: Math.floor(Math.random() * 100) - 50,
          sentimentLabel: Math.floor(Math.random() * 100) - 50 > 20 ? 'positive' : 
                         Math.floor(Math.random() * 100) - 50 < -20 ? 'negative' : 'neutral',
          keywords: lines[i].split(' ').slice(0, 3).filter(w => w.length > 2),
          patternsFound: [],
          metadata: {
            length: lines[i].length,
            wordCount: lines[i].split(' ').length
          }
        });
      }
      
      // Calculate statistics
      const sentimentScores = results.map(r => r.sentimentScore);
      const sentimentDistribution = {
        positive: results.filter(r => r.sentimentLabel === 'positive').length,
        neutral: results.filter(r => r.sentimentLabel === 'neutral').length,
        negative: results.filter(r => r.sentimentLabel === 'negative').length
      };
      
      return {
        totalLines: lines.length,
        processingTimeMs: 3000,
        workersUsed: 4,
        averageSentiment: sentimentScores.reduce((a, b) => a + b, 0) / sentimentScores.length,
        sentimentDistribution,
        results
      };
    };
    
    // Process the file
    const processingResults = await simulateProcessing();
    
    // Update job with results
    await ProcessingJob.findByIdAndUpdate(jobId, {
      status: 'completed',
      progress: 100,
      completedAt: new Date(),
      totalLines: processingResults.totalLines,
      processingTimeMs: processingResults.processingTimeMs,
      workersUsed: processingResults.workersUsed,
      averageSentiment: processingResults.averageSentiment,
      sentimentDistribution: processingResults.sentimentDistribution,
      results: processingResults.results
    });
    
    logger.info(`Job ${jobId} completed successfully`);
    
    // Send email notification
    const job = await ProcessingJob.findById(jobId);
    await emailService.sendProcessingComplete(
      userEmail,
      job.originalFilename,
      processingResults
    );
    
    // Clean up file after processing
    try {
      await fs.unlink(filePath);
    } catch (unlinkError) {
      logger.warn(`Could not delete file ${filePath}:`, unlinkError);
    }
    
  } catch (error) {
    logger.error('Background processing error:', error);
    
    // Update job as failed
    await ProcessingJob.findByIdAndUpdate(jobId, {
      status: 'failed',
      errorMessage: error.message,
      failedAt: new Date(),
      progress: 0
    });
  }
};

// // Add some test jobs for development
// processingJobs.set('test_job_123', {
//   id: 'test_job_123',
//   userId: 'user_001',
//   filename: 'test_file.txt',
//   status: 'completed',
//   progress: 100,
//   createdAt: new Date().toISOString(),
//   completedAt: new Date().toISOString(),
//   results: {
//     totalLines: 10,
//     processed: [
//       { text: 'Test line 1', sentimentScore: 50, keywords: ['test', 'line'], length: 12 },
//       { text: 'Test line 2', sentimentScore: -20, keywords: ['test', 'line'], length: 12 }
//     ],
//     workers: 2,
//     averageSentiment: 15
//   }
// });


/**
 * Simulate parallel text processing
 */
// const simulateParallelProcessing = async (fileContent, userId) => {
//   logger.info(`Simulating parallel processing for user ${userId}`);
  
//   const lines = fileContent.split('\n');
//   const chunkSize = Math.ceil(lines.length / config.processing.parallelWorkers);
//   const chunks = [];
  
//   for (let i = 0; i < config.processing.parallelWorkers; i++) {
//     const start = i * chunkSize;
//     const end = start + chunkSize;
//     chunks.push(lines.slice(start, end));
//   }
  
//   const processingPromises = chunks.map(async (chunk, index) => {
//     await new Promise(resolve => setTimeout(resolve, Math.random() * 1000 + 500));
    
//     const processedChunk = chunk.map(line => ({
//       text: line,
//       sentimentScore: Math.floor(Math.random() * 100) - 50,
//       keywords: line.split(' ').slice(0, 3),
//       length: line.length
//     }));
    
//     return {
//       workerId: index + 1,
//       processed: processedChunk,
//       linesProcessed: chunk.length
//     };
//   });
  
//   const results = await Promise.all(processingPromises);
  
//   const allProcessed = results.flatMap(r => r.processed);
//   const totalLines = results.reduce((sum, r) => sum + r.linesProcessed, 0);
  
//   return {
//     totalLines,
//     processed: allProcessed,
//     workers: results.length,
//     averageSentiment: allProcessed.reduce((sum, item) => sum + item.sentimentScore, 0) / allProcessed.length
//   };
// };

/**
 * Upload file for processing - WITH MONGODB
 */
const uploadFile = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded'
      });
    }

    const { userId } = req.user;
    const file = req.file;
    
    // Create job in MongoDB
    const job = new ProcessingJob({
      userId,
      filename: file.filename,
      originalFilename: file.originalname,
      filePath: file.path,
      fileSize: file.size,
      fileType: path.extname(file.originalname),
      status: 'pending'
    });
    
    await job.save();
    
    logger.info(`File uploaded: ${file.originalname} for user ${userId}, Job ID: ${job._id}`);

    // Start processing in background (non-blocking)
    processJobInBackground(job._id, file.path, userId, req.user.email);
    
    res.json({
      success: true,
      message: 'File uploaded and processing started',
      data: {
        jobId: job._id,
        filename: file.originalname,
        status: 'pending'
      }
    });
  } catch (error) {
    logger.error('File upload error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to upload file'
    });
  }
};

/**
 * Process text directly - WITH MONGODB
 */
const processText = async (req, res) => {
  try {
    const { text, options } = req.body;
    const { userId } = req.user;
    
    if (!text || text.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Text is required for processing'
      });
    }

    // Create job in MongoDB for direct text processing
    const job = new ProcessingJob({
      userId,
      filename: 'direct_text_input.txt',
      originalFilename: 'direct_text_input.txt',
      filePath: null,
      fileType: '.txt',
      status: 'pending',
      parallelWorkers: options?.parallelWorkers || 2
    });
    
    await job.save();
    
    // Process in background
    const processDirectText = async () => {
      const lines = text.split('\n');
      const results = [];
      
      for (let i = 0; i < lines.length; i++) {
        results.push({
          lineNumber: i + 1,
          originalText: lines[i],
          sentimentScore: Math.floor(Math.random() * 100) - 50,
          sentimentLabel: Math.floor(Math.random() * 100) - 50 > 20 ? 'positive' : 
                         Math.floor(Math.random() * 100) - 50 < -20 ? 'negative' : 'neutral',
          keywords: lines[i].split(' ').slice(0, 3).filter(w => w.length > 2),
          patternsFound: [],
          metadata: {
            length: lines[i].length,
            wordCount: lines[i].split(' ').length
          }
        });
      }
      
      const sentimentScores = results.map(r => r.sentimentScore);
      const sentimentDistribution = {
        positive: results.filter(r => r.sentimentLabel === 'positive').length,
        neutral: results.filter(r => r.sentimentLabel === 'neutral').length,
        negative: results.filter(r => r.sentimentLabel === 'negative').length
      };
      
      await ProcessingJob.findByIdAndUpdate(job._id, {
        status: 'completed',
        progress: 100,
        completedAt: new Date(),
        totalLines: lines.length,
        processingTimeMs: 2000,
        workersUsed: 2,
        averageSentiment: sentimentScores.reduce((a, b) => a + b, 0) / sentimentScores.length,
        sentimentDistribution,
        results
      });
    };
    
    // Start processing in background
    processDirectText();
    
    res.json({
      success: true,
      message: 'Text processing started',
      data: { 
        jobId: job._id,
        filename: 'direct_text_input.txt'
      }
    });
  } catch (error) {
    logger.error('Text processing error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to process text'
    });
  }
};

/**
 * Process batch of files
 */
const processBatch = async (req, res) => {
  try {
    const { userId } = req.user;
    
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No files uploaded'
      });
    }

    logger.info(`Batch processing started for ${req.files.length} files by user ${userId}`);
    
    const batchId = `batch_${Date.now()}_${userId}`;
    const fileResults = req.files.map((file, index) => ({
      filename: file.originalname,
      status: 'processing',
      progress: 0
    }));

    setTimeout(() => {
      logger.info(`Batch ${batchId} processing simulated as complete`);
    }, 5000);

    res.json({
      success: true,
      message: 'Batch processing started',
      data: {
        batchId,
        totalFiles: req.files.length,
        files: fileResults
      }
    });
  } catch (error) {
    logger.error('Batch processing error:', error);
    res.status(500).json({
      success: false,
      message: 'Batch processing failed'
    });
  }
};

/**
 * Get processing status - WITH MONGODB
 */
const getStatus = async (req, res) => {
  try {
    const { jobId } = req.params;
    const { userId } = req.user;
    
    // Find job in MongoDB
    const job = await ProcessingJob.findOne({
      _id: jobId,
      userId
    });
    
    if (!job) {
      return res.status(404).json({
        success: false,
        message: 'Job not found'
      });
    }
    
    res.json({
      success: true,
      data: {
        jobId: job._id,
        filename: job.originalFilename,
        status: job.status,
        progress: job.progress || 0,
        createdAt: job.createdAt,
        startedAt: job.startedAt,
        ...(job.completedAt && { completedAt: job.completedAt }),
        ...(job.failedAt && { failedAt: job.failedAt, error: job.errorMessage })
      }
    });
  } catch (error) {
    logger.error('Status check error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get job status'
    });
  }
};

/**
 * Get processing results - WITH MONGODB
 */
const getResults = async (req, res) => {
  try {
    const { jobId } = req.params;
    const { userId } = req.user;
    
    // Find job with results in MongoDB
    const job = await ProcessingJob.findOne({
      _id: jobId,
      userId
    }).select('filename originalFilename status results totalLines processingTimeMs averageSentiment sentimentDistribution createdAt completedAt');
    
    if (!job) {
      return res.status(404).json({
        success: false,
        message: 'Job not found'
      });
    }
    
    if (job.status !== 'completed') {
      return res.status(400).json({
        success: false,
        message: 'Job is not completed yet'
      });
    }
    
    res.json({
      success: true,
      data: {
        jobId: job._id,
        filename: job.originalFilename,
        status: job.status,
        results: job.results,
        statistics: {
          totalLines: job.totalLines,
          processingTimeMs: job.processingTimeMs,
          averageSentiment: job.averageSentiment,
          sentimentDistribution: job.sentimentDistribution
        },
        createdAt: job.createdAt,
        completedAt: job.completedAt
      }
    });
  } catch (error) {
    logger.error('Results fetch error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get results'
    });
  }
};

/**
 * Cancel processing job - WITH MONGODB
 */
const cancelJob = async (req, res) => {
  try {
    const { jobId } = req.params;
    const { userId } = req.user;
    
    logger.info(`Cancel requested for job ${jobId} by user ${userId}`);
    
    // Find and update job in MongoDB
    const job = await ProcessingJob.findOneAndUpdate(
      {
        _id: jobId,
        userId,
        status: { $in: ['pending', 'processing'] }
      },
      {
        status: 'cancelled',
        cancelledAt: new Date(),
        progress: 0
      },
      { new: true }
    );
    
    if (!job) {
      return res.status(404).json({
        success: false,
        message: 'Job not found or cannot be cancelled'
      });
    }
    
    res.json({
      success: true,
      message: 'Job cancelled successfully',
      data: {
        jobId: job._id,
        status: 'cancelled'
      }
    });
  } catch (error) {
    logger.error('Cancel job error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to cancel job'
    });
  }
};

// EXPORT ALL FUNCTIONS - MAKE SURE NAMES MATCH!
module.exports = {
  uploadFile,      // Make sure this matches the function name above
  processText,     // Make sure this matches
  processBatch,    // Make sure this matches  
  getStatus,       // Make sure this matches
  getResults,      // Make sure this matches
  cancelJob        // Make sure this matches
};