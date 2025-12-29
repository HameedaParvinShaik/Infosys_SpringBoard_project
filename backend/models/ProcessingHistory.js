const mongoose = require('mongoose');

const ProcessingHistorySchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  jobId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ProcessingJob',
    required: true
  },
  action: {
    type: String,
    enum: ['upload', 'process', 'complete', 'fail', 'cancel', 'view', 'export'],
    required: true
  },
  details: mongoose.Schema.Types.Mixed,
  timestamp: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: { createdAt: 'timestamp' }
});

ProcessingHistorySchema.index({ userId: 1, timestamp: -1 });
ProcessingHistorySchema.index({ jobId: 1 });

module.exports = mongoose.model('ProcessingHistory', ProcessingHistorySchema);