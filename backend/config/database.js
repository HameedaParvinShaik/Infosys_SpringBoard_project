const mongoose = require('mongoose');
const { logger } = require('../utils/logger');

const connectDB = async () => {
  try {
    // Remove deprecated options - Mongoose 6+ doesn't need them
    const conn = await mongoose.connect(
      'mongodb+srv://hameedaparvins_db_user:Hameeda06@cluster0.cl8rrt.mongodb.net/text_processor?retryWrites=true&w=majority'
      // No options needed for newer MongoDB driver
    );
    
    logger.info(`✅ MongoDB Connected: ${conn.connection.host}`);
    return conn;
  } catch (error) {
    logger.error(`❌ MongoDB connection error: ${error.message}`);
    
    // Don't exit immediately - log and try to continue
    logger.warn('⚠️  Continuing without database connection');
    
    // In production, you might want different behavior
    if (process.env.NODE_ENV === 'production') {
      process.exit(1);
    }
  }
};

module.exports = connectDB;