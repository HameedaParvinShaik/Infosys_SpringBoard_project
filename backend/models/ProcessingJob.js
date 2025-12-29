const mongoose = require('mongoose');

const ProcessingJobSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  filename: {
    type: String,
    required: true
  },
  originalFilename: {
    type: String,
    required: true
  },
  filePath: String,
  fileSize: Number,
  fileType: String,
  status: {
    type: String,
    enum: ['pending', 'processing', 'completed', 'failed', 'cancelled'],
    default: 'pending'
  },
  progress: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  },
  errorMessage: String,
  
  // Processing configuration
  parallelWorkers: {
    type: Number,
    default: 4
  },
  batchSize: {
    type: Number,
    default: 1000
  },
  
  // Processing results
  totalLines: Number,
  processingTimeMs: Number,
  workersUsed: Number,
  averageSentiment: Number,
  sentimentDistribution: {
    positive: Number,
    neutral: Number,
    negative: Number
  },
  
  // Results (embedded documents for better performance)
  results: [{
    lineNumber: Number,
    originalText: String,
    sentimentScore: Number,
    sentimentLabel: {
      type: String,
      enum: ['positive', 'neutral', 'negative']
    },
    keywords: [String],
    patternsFound: [String],
    metadata: mongoose.Schema.Types.Mixed
  }],
  
  // Timestamps
  createdAt: {
    type: Date,
    default: Date.now
  },
  startedAt: Date,
  completedAt: Date,
  failedAt: Date,
  cancelledAt: Date
}, {
  timestamps: { createdAt: 'createdAt', updatedAt: 'updatedAt' }
});

// Indexes for faster queries
ProcessingJobSchema.index({ userId: 1, createdAt: -1 });
ProcessingJobSchema.index({ status: 1 });
ProcessingJobSchema.index({ 'createdAt': -1 });

module.exports = mongoose.model('ProcessingJob', ProcessingJobSchema);