const { logger } = require('../utils/logger');
const ProcessingJob = require('../models/ProcessingJob');

/**
 * Get dashboard statistics - WITH MONGODB
 */
const getStats = async (req, res) => {
  try {
    const { userId } = req.user;
    
    // Get today's date for filtering
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Get this week's start (Monday)
    const thisWeek = new Date(today);
    thisWeek.setDate(today.getDate() - today.getDay() + 1); // Monday
    
    // Get this month's start
    const thisMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    
    // Fetch statistics from MongoDB in parallel
    const [
      totalJobs,
      completedJobs,
      totalLinesResult,
      todayStats,
      weekStats,
      monthStats,
      sentimentAggregation
    ] = await Promise.all([
      // Total jobs
      ProcessingJob.countDocuments({ userId }),
      
      // Completed jobs
      ProcessingJob.countDocuments({ 
        userId, 
        status: 'completed' 
      }),
      
      // Total lines analyzed
      ProcessingJob.aggregate([
        { 
          $match: { 
            userId, 
            status: 'completed',
            totalLines: { $gt: 0 }
          } 
        },
        { 
          $group: { 
            _id: null, 
            totalLines: { $sum: '$totalLines' } 
          } 
        }
      ]),
      
      // Today's stats
      ProcessingJob.aggregate([
        {
          $match: {
            userId,
            status: 'completed',
            completedAt: { $gte: today }
          }
        },
        {
          $group: {
            _id: null,
            filesProcessed: { $sum: 1 },
            totalLines: { $sum: '$totalLines' },
            avgSentiment: { $avg: '$averageSentiment' }
          }
        }
      ]),
      
      // This week's stats
      ProcessingJob.aggregate([
        {
          $match: {
            userId,
            status: 'completed',
            completedAt: { $gte: thisWeek }
          }
        },
        {
          $group: {
            _id: null,
            filesProcessed: { $sum: 1 },
            totalLines: { $sum: '$totalLines' },
            avgSentiment: { $avg: '$averageSentiment' }
          }
        }
      ]),
      
      // This month's stats
      ProcessingJob.aggregate([
        {
          $match: {
            userId,
            status: 'completed',
            completedAt: { $gte: thisMonth }
          }
        },
        {
          $group: {
            _id: null,
            filesProcessed: { $sum: 1 },
            totalLines: { $sum: '$totalLines' },
            avgSentiment: { $avg: '$averageSentiment' }
          }
        }
      ]),
      
      // Sentiment distribution from recent completed jobs
      ProcessingJob.aggregate([
        {
          $match: {
            userId,
            status: 'completed',
            'sentimentDistribution.positive': { $exists: true }
          }
        },
        {
          $sort: { completedAt: -1 }
        },
        {
          $limit: 20 // Last 20 jobs for sentiment calculation
        },
        {
          $group: {
            _id: null,
            totalPositive: { $sum: '$sentimentDistribution.positive' },
            totalNeutral: { $sum: '$sentimentDistribution.neutral' },
            totalNegative: { $sum: '$sentimentDistribution.negative' }
          }
        }
      ])
    ]);
    
    // Calculate success rate
    const successRate = totalJobs > 0 
      ? Math.round((completedJobs / totalJobs) * 100) 
      : 0;
    
    // Calculate sentiment distribution percentages
    let sentimentDistribution = { positive: 0, neutral: 0, negative: 0 };
    if (sentimentAggregation.length > 0 && sentimentAggregation[0]) {
      const { totalPositive, totalNeutral, totalNegative } = sentimentAggregation[0];
      const totalAll = totalPositive + totalNeutral + totalNegative;
      
      if (totalAll > 0) {
        sentimentDistribution = {
          positive: Math.round((totalPositive / totalAll) * 100),
          neutral: Math.round((totalNeutral / totalAll) * 100),
          negative: Math.round((totalNegative / totalAll) * 100)
        };
      }
    }
    
    // Prepare response
    const stats = {
      totalFilesProcessed: totalJobs,
      totalLinesAnalyzed: totalLinesResult[0]?.totalLines || 0,
      averageProcessingTime: 0, // You can calculate this if you store processing time
      successRate,
      storageUsed: 0, // Calculate if you track file sizes
      sentimentDistribution
    };
    
    // Add quick stats
    const quickStats = {
      today: {
        filesProcessed: todayStats[0]?.filesProcessed || 0,
        linesAnalyzed: todayStats[0]?.totalLines || 0,
        avgSentiment: Math.round(todayStats[0]?.avgSentiment || 0)
      },
      thisWeek: {
        filesProcessed: weekStats[0]?.filesProcessed || 0,
        linesAnalyzed: weekStats[0]?.totalLines || 0,
        avgSentiment: Math.round(weekStats[0]?.avgSentiment || 0)
      },
      thisMonth: {
        filesProcessed: monthStats[0]?.filesProcessed || 0,
        linesAnalyzed: monthStats[0]?.totalLines || 0,
        avgSentiment: Math.round(monthStats[0]?.avgSentiment || 0)
      }
    };
    
    res.json({
      success: true,
      data: {
        ...stats,
        quickStats
      }
    });
  } catch (error) {
    logger.error('Dashboard stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch dashboard statistics'
    });
  }
};

/**
 * Get recent processing jobs - WITH MONGODB
 */
const getRecentJobs = async (req, res) => {
  try {
    const { userId } = req.user;
    const { limit = 10 } = req.query;
    
    // Fetch recent jobs from MongoDB
    const recentJobs = await ProcessingJob.find({ userId })
      .select('filename originalFilename status totalLines averageSentiment processingTimeMs createdAt startedAt completedAt failedAt errorMessage')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .lean(); // Convert to plain objects for faster response
    
    // Format jobs for frontend
    const formattedJobs = recentJobs.map(job => ({
      id: job._id,
      filename: job.originalFilename,
      status: job.status,
      processedAt: job.completedAt || job.createdAt,
      lines: job.totalLines || 0,
      sentimentScore: job.averageSentiment,
      processingTime: job.processingTimeMs ? (job.processingTimeMs / 1000).toFixed(2) : null,
      error: job.errorMessage
    }));
    
    res.json({
      success: true,
      data: {
        jobs: formattedJobs,
        count: formattedJobs.length
      }
    });
  } catch (error) {
    logger.error('Recent jobs error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch recent jobs'
    });
  }
};

/**
 * Get quick overview stats - WITH MONGODB
 */
const getQuickStats = async (req, res) => {
  try {
    const { userId } = req.user;
    
    // Calculate date ranges
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    const thisWeek = new Date(today);
    thisWeek.setDate(today.getDate() - today.getDay() + 1); // Monday of this week
    
    const lastWeek = new Date(thisWeek);
    lastWeek.setDate(lastWeek.getDate() - 7);
    
    const thisMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    
    // Fetch all stats in parallel for efficiency
    const [
      todayStats,
      yesterdayStats,
      thisWeekStats,
      lastWeekStats,
      thisMonthStats,
      lastMonthStats
    ] = await Promise.all([
      // Today
      ProcessingJob.aggregate([
        {
          $match: {
            userId,
            status: 'completed',
            completedAt: { $gte: today }
          }
        },
        {
          $group: {
            _id: null,
            filesProcessed: { $sum: 1 },
            linesAnalyzed: { $sum: '$totalLines' },
            avgSentiment: { $avg: '$averageSentiment' }
          }
        }
      ]),
      
      // Yesterday
      ProcessingJob.aggregate([
        {
          $match: {
            userId,
            status: 'completed',
            completedAt: { $gte: yesterday, $lt: today }
          }
        },
        {
          $group: {
            _id: null,
            filesProcessed: { $sum: 1 },
            linesAnalyzed: { $sum: '$totalLines' },
            avgSentiment: { $avg: '$averageSentiment' }
          }
        }
      ]),
      
      // This Week
      ProcessingJob.aggregate([
        {
          $match: {
            userId,
            status: 'completed',
            completedAt: { $gte: thisWeek }
          }
        },
        {
          $group: {
            _id: null,
            filesProcessed: { $sum: 1 },
            linesAnalyzed: { $sum: '$totalLines' },
            avgSentiment: { $avg: '$averageSentiment' }
          }
        }
      ]),
      
      // Last Week
      ProcessingJob.aggregate([
        {
          $match: {
            userId,
            status: 'completed',
            completedAt: { $gte: lastWeek, $lt: thisWeek }
          }
        },
        {
          $group: {
            _id: null,
            filesProcessed: { $sum: 1 },
            linesAnalyzed: { $sum: '$totalLines' },
            avgSentiment: { $avg: '$averageSentiment' }
          }
        }
      ]),
      
      // This Month
      ProcessingJob.aggregate([
        {
          $match: {
            userId,
            status: 'completed',
            completedAt: { $gte: thisMonth }
          }
        },
        {
          $group: {
            _id: null,
            filesProcessed: { $sum: 1 },
            linesAnalyzed: { $sum: '$totalLines' },
            avgSentiment: { $avg: '$averageSentiment' }
          }
        }
      ]),
      
      // Last Month
      ProcessingJob.aggregate([
        {
          $match: {
            userId,
            status: 'completed',
            completedAt: { $gte: lastMonth, $lt: thisMonth }
          }
        },
        {
          $group: {
            _id: null,
            filesProcessed: { $sum: 1 },
            linesAnalyzed: { $sum: '$totalLines' },
            avgSentiment: { $avg: '$averageSentiment' }
          }
        }
      ])
    ]);
    
    // Format response
    const quickStats = {
      today: {
        filesProcessed: todayStats[0]?.filesProcessed || 0,
        linesAnalyzed: todayStats[0]?.linesAnalyzed || 0,
        avgSentiment: Math.round(todayStats[0]?.avgSentiment || 0),
        changeFromYesterday: calculateChange(
          todayStats[0]?.filesProcessed || 0,
          yesterdayStats[0]?.filesProcessed || 0
        )
      },
      thisWeek: {
        filesProcessed: thisWeekStats[0]?.filesProcessed || 0,
        linesAnalyzed: thisWeekStats[0]?.linesAnalyzed || 0,
        avgSentiment: Math.round(thisWeekStats[0]?.avgSentiment || 0),
        changeFromLastWeek: calculateChange(
          thisWeekStats[0]?.filesProcessed || 0,
          lastWeekStats[0]?.filesProcessed || 0
        )
      },
      thisMonth: {
        filesProcessed: thisMonthStats[0]?.filesProcessed || 0,
        linesAnalyzed: thisMonthStats[0]?.linesAnalyzed || 0,
        avgSentiment: Math.round(thisMonthStats[0]?.avgSentiment || 0),
        changeFromLastMonth: calculateChange(
          thisMonthStats[0]?.filesProcessed || 0,
          lastMonthStats[0]?.filesProcessed || 0
        )
      }
    };
    
    res.json({
      success: true,
      data: quickStats
    });
  } catch (error) {
    logger.error('Quick stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch quick statistics'
    });
  }
};

/**
 * Helper function to calculate percentage change
 */
const calculateChange = (current, previous) => {
  if (previous === 0) {
    return current > 0 ? 100 : 0;
  }
  return Math.round(((current - previous) / previous) * 100);
};

module.exports = {
  getStats,
  getRecentJobs,
  getQuickStats
};