// backend/update_jobs.js
const mongoose = require('mongoose');
const ProcessingJob = require('./models/ProcessingJob');

// Connect to MongoDB
mongoose.connect('mongodb://localhost:27017/text_processor', {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

async function updateExistingJobs() {
  console.log("🔧 UPDATING EXISTING JOBS...");
  console.log("================================");
  
  try {
    // Step 1: Check how many jobs need updating
    const jobsWithoutML = await ProcessingJob.countDocuments({
      $or: [
        { mlEnabled: { $exists: false } },
        { mlStatistics: { $exists: false } }
      ]
    });
    
    console.log(`Found ${jobsWithoutML} jobs that need ML fields`);
    
    if (jobsWithoutML === 0) {
      console.log("✅ All jobs already have ML fields!");
      return;
    }
    
    // Step 2: Add missing fields to ALL jobs
    const updateResult = await ProcessingJob.updateMany(
      {}, // Update ALL documents
      {
        $set: {
          mlEnabled: false,
          mlStatistics: {},
          // Also add these fields if they don't exist
          confidence: { $ifNull: ["$confidence", 0] },
          probabilities: { $ifNull: ["$probabilities", { positive: 0, negative: 0 }] }
        }
      }
    );
    
    console.log(`✅ Updated ${updateResult.modifiedCount} jobs`);
    
    // Step 3: Verify the update
    const sampleJobs = await ProcessingJob.find().limit(3);
    console.log("\n📊 SAMPLE JOBS AFTER UPDATE:");
    sampleJobs.forEach((job, index) => {
      console.log(`\nJob ${index + 1}: ${job.originalFilename}`);
      console.log(`   Status: ${job.status}`);
      console.log(`   ML Enabled: ${job.mlEnabled}`);
      console.log(`   Has ML Stats: ${Object.keys(job.mlStatistics || {}).length > 0}`);
      console.log(`   Created: ${job.createdAt.toLocaleDateString()}`);
    });
    
    // Step 4: Count ML vs non-ML jobs
    const mlJobs = await ProcessingJob.countDocuments({ mlEnabled: true });
    const nonMlJobs = await ProcessingJob.countDocuments({ mlEnabled: false });
    
    console.log("\n📈 FINAL STATISTICS:");
    console.log(`   Total jobs in database: ${await ProcessingJob.countDocuments()}`);
    console.log(`   ML Enabled jobs: ${mlJobs}`);
    console.log(`   Non-ML jobs: ${nonMlJobs}`);
    
  } catch (error) {
    console.error("❌ Error updating jobs:", error);
  } finally {
    await mongoose.disconnect();
    console.log("\n🔌 Disconnected from MongoDB");
    console.log("\n✅ UPDATE COMPLETE!");
    console.log("================================");
  }
}

// Run the update
updateExistingJobs();
