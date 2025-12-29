const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config();

// Import database connection
const connectDB = require('./config/database');
const mongoose=require('mongoose');

// Import routes
const authRoutes = require('./routes/auth.routes');
const textRoutes = require('./routes/text.routes');
const dashboardRoutes = require('./routes/dashboard.routes');
const historyRoutes = require('./routes/history.routes');

// Import middleware
const { authenticateToken } = require('./middleware/auth');
const { logger } = require('./utils/logger');

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 5000;

// Connect to MongoDB
connectDB();

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.url}`);
  next();
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  const dbStatus = mongoose.connection.readyState;
  const dbStatusText = {
    0: 'Disconnected',
    1: 'Connected',
    2: 'Connecting',
    3: 'Disconnecting'
  }[dbStatus] || 'Unknown';
  
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    service: 'Parallel Text Processor API',
    database: dbStatusText
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/text', authenticateToken, textRoutes);
app.use('/api/dashboard', authenticateToken, dashboardRoutes);
app.use('/api/history', authenticateToken, historyRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
  logger.error(err.stack);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal Server Error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'API endpoint not found'
  });
});

// Start server
app.listen(PORT, () => {
  logger.info(`🚀 Server running on port ${PORT}`);
  logger.info(`📝 API Documentation available at http://localhost:${PORT}/api/health`);
});

module.exports = app;