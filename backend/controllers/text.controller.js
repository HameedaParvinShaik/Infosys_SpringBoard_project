const path = require('path');
const fs = require('fs').promises;
const { PythonShell } = require('python-shell');
const { logger } = require('../utils/logger');
const emailService = require('../services/email.service');
const config = require('../config/config');
const ProcessingJob = require('../models/ProcessingJob');

// ========== DEBUG: ADD THESE LINES AT THE TOP ==========
console.log("🔍 DEBUG: Testing Python availability...");
const { execSync } = require('child_process');

// Try different Python paths
const possiblePaths = ['python', 'python3', '/usr/bin/python3', '/usr/local/bin/python3'];

let workingPythonPath = null;
for (const pythonPath of possiblePaths) {
  try {
    const version = execSync(`${pythonPath} --version`).toString().trim();
    console.log(`✅ Found Python at: ${pythonPath} (${version})`);
    workingPythonPath = pythonPath;
    break;
  } catch (error) {
    console.log(`❌ Python not found at: ${pythonPath}`);
  }
}

if (!workingPythonPath) {
  console.log("⚠️ WARNING: No Python found! ML processing will fail.");
} else {
  console.log(`🎯 Using Python at: ${workingPythonPath}`);
}
// ========== END DEBUG ==========

// Add Python ML configuration
const ML_CONFIG = {
  pythonPath: workingPythonPath || 'python3', // Use the detected Python path
  modelPath: path.join(__dirname, '../ml/sentiment_model.pkl'),
  vectorizerPath: path.join(__dirname, '../ml/tfidf_vectorizer.pkl'),
  scriptPath: path.join(__dirname, '../ml/sentiment_integration.py'),
  tempDir: path.join(__dirname, '../temp')
};

// ========== ADD MORE DEBUG ==========
console.log("\n🔍 DEBUG: Checking ML files...");
console.log("1. Model path:", ML_CONFIG.modelPath);
console.log("   Exists:", fs.existsSync(ML_CONFIG.modelPath));
console.log("2. Vectorizer path:", ML_CONFIG.vectorizerPath);
console.log("   Exists:", fs.existsSync(ML_CONFIG.vectorizerPath));
console.log("3. Script path:", ML_CONFIG.scriptPath);
console.log("   Exists:", fs.existsSync(ML_CONFIG.scriptPath));
console.log("4. Temp dir:", ML_CONFIG.tempDir);
// ========== END DEBUG ==========

// Ensure temp directory exists
const ensureTempDir = async () => {
  try {
    await fs.mkdir(ML_CONFIG.tempDir, { recursive: true });
    console.log("✅ Temp directory ready:", ML_CONFIG.tempDir);
  } catch (error) {
    logger.warn('Temp directory creation warning:', error);
  }
};

/**
 * Extract keywords from text (simple implementation)
 */
const extractKeywords = (text) => {
  if (!text || typeof text !== 'string') return [];
  
  const stopWords = new Set([
    'the', 'and', 'a', 'an', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by',
    'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had',
    'do', 'does', 'did', 'will', 'would', 'should', 'could', 'can', 'may',
    'might', 'must', 'this', 'that', 'these', 'those', 'i', 'you', 'he', 'she',
    'it', 'we', 'they', 'me', 'him', 'her', 'us', 'them'
  ]);
  
  const words = text.toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter(word => 
      word.length > 3 && 
      !stopWords.has(word) &&
      !/\d/.test(word)
    );
  
  // Count word frequency
  const wordCount = {};
  words.forEach(word => {
    wordCount[word] = (wordCount[word] || 0) + 1;
  });
  
  // Sort by frequency and return top 5
  return Object.entries(wordCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([word]) => word);
};

/**
 * Transform ML results to match ProcessingJob schema
 */
const transformMLResults = (mlResults, jobId) => {
  const transformedResults = mlResults.map((item, index) => ({
    lineNumber: index + 1,
    originalText: item.text || item.originalText || '',
    sentimentScore: (item.confidence || 0) * 100, // Convert to 0-100 scale
    sentimentLabel: item.sentiment || 'neutral',
    confidence: item.confidence || 0,
    probabilities: item.probabilities || { positive: 0, negative: 0 },
    keywords: extractKeywords(item.text || ''),
    patternsFound: item.patternsFound || [],
    metadata: {
      length: (item.text || '').length,
      wordCount: (item.text || '').split(/\s+/).filter(w => w.length > 0).length,
      processedAt: new Date().toISOString()
    }
  }));
  
  // Calculate statistics
  const sentimentDistribution = {
    positive: mlResults.filter(r => r.sentiment === 'positive').length,
    neutral: mlResults.filter(r => r.sentiment === 'neutral' || !r.sentiment).length,
    negative: mlResults.filter(r => r.sentiment === 'negative').length
  };
  
  const confidenceScores = mlResults
    .filter(r => r.confidence)
    .map(r => r.confidence);
  
  const averageConfidence = confidenceScores.length > 0 
    ? confidenceScores.reduce((a, b) => a + b, 0) / confidenceScores.length
    : 0;
  
  const averageSentiment = transformedResults.length > 0
    ? transformedResults.reduce((sum, item) => sum + item.sentimentScore, 0) / transformedResults.length
    : 0;
  
  return {
    transformedResults,
    sentimentDistribution,
    averageConfidence,
    averageSentiment,
    totalProcessed: transformedResults.length
  };
};

/**
 * Background job processor with ACTUAL ML processing
 */
const processJobInBackground = async (jobId, filePath, userId, userEmail) => {
  try {
    console.log(`\n🚀 STARTING ML PROCESSING for job ${jobId}`);
    console.log(`   File: ${filePath}`);
    console.log(`   User: ${userId}`);
    
    // Ensure temp directory exists
    await ensureTempDir();
    
    // Update job status to processing
    await ProcessingJob.findByIdAndUpdate(jobId, {
      status: 'processing',
      startedAt: new Date(),
      progress: 20
    });
    
    logger.info(`Starting ML processing for job ${jobId}, file: ${filePath}`);
    
    // Prepare output file path
    const outputPath = path.join(ML_CONFIG.tempDir, `results_${jobId}.json`);
    console.log(`   Output path: ${outputPath}`);
    
    // Prepare Python script options
    const options = {
      mode: 'text',
      pythonPath: ML_CONFIG.pythonPath,
      scriptPath: path.dirname(ML_CONFIG.scriptPath),
      args: [
        ML_CONFIG.modelPath,
        ML_CONFIG.vectorizerPath,
        filePath,
        outputPath
      ],
      pythonOptions: ['-u'], // Unbuffered output
      stdio: 'pipe' // Capture all output
    };
    
    console.log(`   Python command: ${ML_CONFIG.pythonPath}`);
    console.log(`   Script: sentiment_integration.py`);
    console.log(`   Args: ${options.args.join(' ')}`);
    
    // Run Python ML analysis
    PythonShell.run('sentiment_integration.py', options, async (err, pythonOutput) => {
      console.log("\n📊 PYTHON SHELL COMPLETED");
      console.log("   Error:", err ? err.message : "None");
      console.log("   Output length:", pythonOutput ? pythonOutput.length : 0);
      
      if (err) {
        console.log("❌ PYTHON ERROR DETAILS:", err);
        logger.error('Python ML processing error:', err);
        
        await ProcessingJob.findByIdAndUpdate(jobId, {
          status: 'failed',
          errorMessage: `ML Processing Error: ${err.message}`,
          failedAt: new Date(),
          progress: 0
        });
        
        // Clean up file
        try {
          await fs.unlink(filePath);
        } catch (unlinkError) {
          logger.warn(`Could not delete file ${filePath}:`, unlinkError);
        }
        
        return;
      }
      
      try {
        // Read results from output file
        let resultData;
        try {
          console.log("   Looking for output file:", outputPath);
          if (fs.existsSync(outputPath)) {
            const resultContent = await fs.readFile(outputPath, 'utf8');
            console.log("   Found output file, parsing...");
            resultData = JSON.parse(resultContent);
          } else {
            console.log("   Output file not found, checking python output...");
            // Try to get results from python output
            if (pythonOutput && pythonOutput.length > 0) {
              console.log("   Python output available, parsing...");
              try {
                resultData = JSON.parse(pythonOutput.join(''));
              } catch (parseError) {
                console.log("   Failed to parse python output:", parseError.message);
                throw new Error(`Failed to parse results: ${parseError.message}`);
              }
            } else {
              console.log("   No python output either");
              throw new Error(`No results file or output`);
            }
          }
        } catch (readError) {
          console.log("   Read error:", readError.message);
          throw readError;
        }
        
        console.log("   Result success:", resultData.success);
        
        if (!resultData.success) {
          console.log("   ML processing failed:", resultData.error);
          throw new Error(resultData.error || 'ML processing failed');
        }
        
        // Transform results
        const {
          transformedResults,
          sentimentDistribution,
          averageConfidence,
          averageSentiment,
          totalProcessed
        } = transformMLResults(resultData.results || [], jobId);
        
        const processingTimeMs = Date.now() - (await ProcessingJob.findById(jobId)).startedAt;
        
        console.log(`   Processed ${totalProcessed} records`);
        console.log(`   Positive: ${sentimentDistribution.positive}`);
        console.log(`   Negative: ${sentimentDistribution.negative}`);
        console.log(`   Average confidence: ${averageConfidence}`);
        
        // Update job with ML results
        await ProcessingJob.findByIdAndUpdate(jobId, {
          status: 'completed',
          progress: 100,
          completedAt: new Date(),
          totalLines: totalProcessed,
          processingTimeMs: processingTimeMs,
          workersUsed: 1, // ML processing is single-threaded in Python
          averageSentiment: averageSentiment,
          sentimentDistribution: sentimentDistribution,
          results: transformedResults,
          mlStatistics: {
            ...resultData.statistics,
            average_confidence: averageConfidence,
            model_used: 'sentiment_model.pkl',
            vectorizer_used: 'tfidf_vectorizer.pkl'
          },
          mlEnabled: true
        });
        
        console.log(`✅ JOB ${jobId} COMPLETED with ML analysis`);
        logger.info(`Job ${jobId} completed with ML analysis. Processed ${totalProcessed} records.`);
        
        // Clean up files
        try {
          await fs.unlink(filePath);
          if (fs.existsSync(outputPath)) {
            await fs.unlink(outputPath);
          }
          console.log("   Cleaned up temporary files");
        } catch (cleanupError) {
          console.log("   Cleanup warning:", cleanupError.message);
          logger.warn('Cleanup error:', cleanupError);
        }
        
        // Send email notification if enabled
        if (config.email?.enabled && emailService && emailService.sendProcessingComplete) {
          try {
            await emailService.sendProcessingComplete(
              userEmail,
              (await ProcessingJob.findById(jobId)).originalFilename,
              {
                totalRecords: totalProcessed,
                positiveCount: sentimentDistribution.positive,
                negativeCount: sentimentDistribution.negative,
                averageConfidence: averageConfidence,
                processingTime: `${(processingTimeMs / 1000).toFixed(2)}s`
              }
            );
          } catch (emailError) {
            logger.warn('Email notification failed:', emailError);
          }
        }
        
      } catch (parseError) {
        console.log("❌ RESULTS PARSING ERROR:", parseError);
        logger.error('Results parsing/processing error:', parseError);
        
        await ProcessingJob.findByIdAndUpdate(jobId, {
          status: 'failed',
          errorMessage: `Results processing error: ${parseError.message}`,
          failedAt: new Date(),
          progress: 50
        });
        
        // Clean up files on error
        try {
          await fs.unlink(filePath);
          if (fs.existsSync(outputPath)) {
            await fs.unlink(outputPath);
          }
        } catch (cleanupError) {
          logger.warn('Error cleanup failed:', cleanupError);
        }
      }
    });
    
  } catch (error) {
    console.log("❌ BACKGROUND PROCESSING SETUP ERROR:", error);
    logger.error('Background processing setup error:', error);
    
    try {
      await ProcessingJob.findByIdAndUpdate(jobId, {
        status: 'failed',
        errorMessage: `Setup error: ${error.message}`,
        failedAt: new Date(),
        progress: 0
      });
      
      // Clean up file on setup error
      try {
        await fs.unlink(filePath);
      } catch (unlinkError) {
        logger.warn(`Could not delete file ${filePath}:`, unlinkError);
      }
    } catch (dbError) {
      logger.error('Failed to update job status on error:', dbError);
    }
  }
};

/**
 * Process text directly with ML - WITH MONGODB
 */
const processText = async (req, res) => {
  try {
    const { text, options } = req.body;
    const { userId, email: userEmail } = req.user;
    
    if (!text || text.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Text is required for processing'
      });
    }

    // Create temporary file with the text
    const tempDir = path.join(__dirname, '../temp');
    await fs.mkdir(tempDir, { recursive: true });
    
    const tempFilePath = path.join(tempDir, `direct_input_${Date.now()}.txt`);
    await fs.writeFile(tempFilePath, text, 'utf8');
    
    // Create job in MongoDB for direct text processing
    const job = new ProcessingJob({
      userId,
      filename: `direct_${Date.now()}.txt`,
      originalFilename: 'direct_text_input.txt',
      filePath: tempFilePath,
      fileType: '.txt',
      status: 'pending',
      parallelWorkers: options?.parallelWorkers || 1,
      mlEnabled: true
    });
    
    await job.save();
    
    logger.info(`Direct text processing started for user ${userId}, job: ${job._id}`);
    
    // Start ML processing in background
    processJobInBackground(job._id, tempFilePath, userId, userEmail);
    
    res.json({
      success: true,
      message: 'Text processing started with ML analysis',
      data: { 
        jobId: job._id,
        filename: 'direct_text_input.txt',
        estimatedTime: 'Processing with ML model...',
        mlProcessing: true
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
 * Upload file for processing - WITH MONGODB AND ML
 */
const uploadFile = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded'
      });
    }

    const { userId, email: userEmail } = req.user;
    const file = req.file;
    
    // Validate file type for ML processing
    const allowedTypes = ['.txt', '.csv', '.json'];
    const fileExt = path.extname(file.originalname).toLowerCase();
    
    if (!allowedTypes.includes(fileExt)) {
      // Delete the uploaded file
      try {
        await fs.unlink(file.path);
      } catch (unlinkError) {
        logger.warn(`Could not delete file ${file.path}:`, unlinkError);
      }
      
      return res.status(400).json({
        success: false,
        message: `File type ${fileExt} not supported for ML processing. Use: ${allowedTypes.join(', ')}`
      });
    }
    
    // Create job in MongoDB
    const job = new ProcessingJob({
      userId,
      filename: file.filename,
      originalFilename: file.originalname,
      filePath: file.path,
      fileSize: file.size,
      fileType: fileExt,
      status: 'pending',
      mlEnabled: true
    });
    
    await job.save();
    
    console.log(`\n📁 FILE UPLOADED for ML processing:`);
    console.log(`   User: ${userId}`);
    console.log(`   File: ${file.originalname}`);
    console.log(`   Job ID: ${job._id}`);
    console.log(`   Path: ${file.path}`);
    
    logger.info(`File uploaded for ML processing: ${file.originalname} by user ${userId}, Job ID: ${job._id}`);

    // Start ML processing in background
    processJobInBackground(job._id, file.path, userId, userEmail);
    
    res.json({
      success: true,
      message: 'File uploaded and ML processing started',
      data: {
        jobId: job._id,
        filename: file.originalname,
        status: 'pending',
        mlProcessing: true,
        estimatedTime: 'Processing with sentiment analysis model...'
      }
    });
  } catch (error) {
    logger.error('File upload error:', error);
    
    // Clean up file on error
    if (req.file && req.file.path) {
      try {
        await fs.unlink(req.file.path);
      } catch (unlinkError) {
        logger.warn(`Could not delete file ${req.file.path}:`, unlinkError);
      }
    }
    
    res.status(500).json({
      success: false,
      message: 'Failed to upload file'
    });
  }
};

/**
 * Process batch of files with ML
 */
const processBatch = async (req, res) => {
  try {
    const { userId, email: userEmail } = req.user;
    
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No files uploaded'
      });
    }

    logger.info(`Batch ML processing started for ${req.files.length} files by user ${userId}`);
    
    const batchId = `batch_ml_${Date.now()}_${userId}`;
    const batchJobs = [];
    
    // Process each file individually with ML
    for (const file of req.files) {
      const fileExt = path.extname(file.originalname).toLowerCase();
      const allowedTypes = ['.txt', '.csv', '.json'];
      
      if (!allowedTypes.includes(fileExt)) {
        logger.warn(`Skipping file ${file.originalname} - unsupported type for ML`);
        continue;
      }
      
      // Create job for each file
      const job = new ProcessingJob({
        userId,
        filename: file.filename,
        originalFilename: file.originalname,
        filePath: file.path,
        fileSize: file.size,
        fileType: fileExt,
        status: 'pending',
        batchId: batchId,
        mlEnabled: true
      });
      
      await job.save();
      batchJobs.push({
        jobId: job._id,
        filename: file.originalname,
        status: 'pending'
      });
      
      // Start ML processing for this file
      processJobInBackground(job._id, file.path, userId, userEmail);
    }
    
    if (batchJobs.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No valid files for ML processing'
      });
    }
    
    res.json({
      success: true,
      message: 'Batch ML processing started',
      data: {
        batchId,
        totalFiles: batchJobs.length,
        jobs: batchJobs,
        note: 'Each file is being processed with sentiment analysis ML model'
      }
    });
  } catch (error) {
    logger.error('Batch processing error:', error);
    
    // Clean up uploaded files on error
    if (req.files) {
      for (const file of req.files) {
        try {
          await fs.unlink(file.path);
        } catch (unlinkError) {
          logger.warn(`Could not delete file ${file.path}:`, unlinkError);
        }
      }
    }
    
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
    }).select('_id originalFilename status progress createdAt startedAt completedAt failedAt errorMessage mlEnabled');
    
    if (!job) {
      return res.status(404).json({
        success: false,
        message: 'Job not found'
      });
    }
    
    const response = {
      success: true,
      data: {
        jobId: job._id,
        filename: job.originalFilename,
        status: job.status,
        progress: job.progress || 0,
        mlProcessing: job.mlEnabled || false,
        createdAt: job.createdAt,
        startedAt: job.startedAt,
        ...(job.completedAt && { completedAt: job.completedAt }),
        ...(job.failedAt && { 
          failedAt: job.failedAt, 
          error: job.errorMessage,
          mlError: job.mlEnabled ? 'ML processing failed' : null
        })
      }
    };
    
    // Add estimated time if processing
    if (job.status === 'processing' && job.mlEnabled) {
      response.data.estimatedTime = 'ML analysis in progress...';
      response.data.currentStage = 'Running sentiment analysis model';
    }
    
    res.json(response);
  } catch (error) {
    logger.error('Status check error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get job status'
    });
  }
};

/**
 * Get processing results - WITH MONGODB AND ML
 */
const getResults = async (req, res) => {
  try {
    const { jobId } = req.params;
    const { userId } = req.user;
    const { limit = 50, page = 1, detailed = false } = req.query;
    
    // Find job with results in MongoDB
    const job = await ProcessingJob.findOne({
      _id: jobId,
      userId
    }).select('filename originalFilename status results totalLines processingTimeMs averageSentiment sentimentDistribution mlStatistics createdAt completedAt mlEnabled');
    
    if (!job) {
      return res.status(404).json({
        success: false,
        message: 'Job not found'
      });
    }
    
    if (job.status !== 'completed') {
      return res.status(400).json({
        success: false,
        message: 'Job is not completed yet',
        data: {
          status: job.status,
          progress: 'ML processing in progress' 
        }
      });
    }
    
    // Paginate results
    const skip = (page - 1) * limit;
    const paginatedResults = job.results 
      ? job.results.slice(skip, skip + parseInt(limit))
      : [];
    
    const response = {
      success: true,
      data: {
        jobId: job._id,
        filename: job.originalFilename,
        status: job.status,
        mlProcessed: job.mlEnabled || false,
        statistics: {
          totalLines: job.totalLines,
          processingTimeMs: job.processingTimeMs,
          averageSentiment: job.averageSentiment,
          sentimentDistribution: job.sentimentDistribution,
          mlStatistics: job.mlStatistics || {}
        },
        results: paginatedResults,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: job.results ? job.results.length : 0,
          totalPages: job.results ? Math.ceil(job.results.length / limit) : 0
        },
        createdAt: job.createdAt,
        completedAt: job.completedAt
      }
    };
    
    // Add ML-specific info if processed with ML
    if (job.mlEnabled && job.mlStatistics) {
      response.data.mlDetails = {
        modelUsed: job.mlStatistics.model_used || 'sentiment_model.pkl',
        confidence: job.mlStatistics.average_confidence 
          ? Math.round(job.mlStatistics.average_confidence * 100) + '%'
          : 'N/A',
        accuracy: job.mlStatistics.accuracy || 'N/A'
      };
    }
    
    res.json(response);
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
        progress: 0,
        errorMessage: 'Cancelled by user'
      },
      { new: true }
    );
    
    if (!job) {
      return res.status(404).json({
        success: false,
        message: 'Job not found or cannot be cancelled'
      });
    }
    
    // Try to clean up files
    if (job.filePath) {
      try {
        await fs.unlink(job.filePath);
      } catch (unlinkError) {
        logger.warn(`Could not delete file ${job.filePath}:`, unlinkError);
      }
    }
    
    // Clean up temp result file if exists
    const resultPath = path.join(ML_CONFIG.tempDir, `results_${jobId}.json`);
    try {
      if (await fs.access(resultPath).then(() => true).catch(() => false)) {
        await fs.unlink(resultPath);
      }
    } catch (cleanupError) {
      logger.warn(`Could not delete result file ${resultPath}:`, cleanupError);
    }
    
    res.json({
      success: true,
      message: 'Job cancelled successfully',
      data: {
        jobId: job._id,
        status: 'cancelled',
        mlCancelled: job.mlEnabled || false
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

// EXPORT ALL FUNCTIONS
module.exports = {
  uploadFile,
  processText,
  processBatch,
  getStatus,
  getResults,
  cancelJob
};
