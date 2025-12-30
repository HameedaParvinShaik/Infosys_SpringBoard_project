const path = require('path');
const fs = require('fs');
const fsp = require('fs').promises; // Async fs
const { PythonShell } = require('python-shell');
const { logger } = require('../utils/logger');
const emailService = require('../services/email.service');
const config = require('../config/config');
const ProcessingJob = require('../models/ProcessingJob');
const { execSync } = require('child_process');

// ===== DEBUG PYTHON =====
console.log("🔍 DEBUG: Testing Python availability...");
const possiblePaths = ['python', 'python3', '/usr/bin/python3', '/usr/local/bin/python3'];
let workingPythonPath = null;
for (const pythonPath of possiblePaths) {
  try {
    const version = execSync(`${pythonPath} --version`).toString().trim();
    console.log(`✅ Found Python at: ${pythonPath} (${version})`);
    workingPythonPath = pythonPath;
    break;
  } catch { console.log(`❌ Python not found at: ${pythonPath}`); }
}
if (!workingPythonPath) console.log("⚠️ WARNING: No Python found! ML processing will fail.");
else console.log(`🎯 Using Python at: ${workingPythonPath}`);

// ===== ML CONFIG =====
const ML_CONFIG = {
  pythonPath: workingPythonPath || 'python3',
  modelPath: path.join(__dirname, '../ml/sentiment_model.pkl'),
  vectorizerPath: path.join(__dirname, '../ml/tfidf_vectorizer.pkl'),
  scriptPath: path.join(__dirname, '../ml/sentiment_integration.py'),
  tempDir: path.join(__dirname, '../temp')
};

// ===== Async file existence check =====
const fileExists = async (filePath) => {
  try { await fsp.access(filePath); return true; }
  catch { return false; }
};

// Check ML files
(async () => {
  console.log("\n🔍 DEBUG: Checking ML files...");
  console.log("1. Model path:", ML_CONFIG.modelPath, "Exists:", await fileExists(ML_CONFIG.modelPath));
  console.log("2. Vectorizer path:", ML_CONFIG.vectorizerPath, "Exists:", await fileExists(ML_CONFIG.vectorizerPath));
  console.log("3. Script path:", ML_CONFIG.scriptPath, "Exists:", await fileExists(ML_CONFIG.scriptPath));
  console.log("4. Temp dir:", ML_CONFIG.tempDir);
})();

// Ensure temp dir exists
const ensureTempDir = async () => {
  try { await fsp.mkdir(ML_CONFIG.tempDir, { recursive: true }); }
  catch (err) { logger.warn('Temp dir creation warning:', err); }
};

// Extract keywords helper
const extractKeywords = (text) => {
  if (!text || typeof text !== 'string') return [];
  const stopWords = new Set(['the','and','a','an','in','on','at','to','for','of','with','by','is','are','was','were','be','been','being','have','has','had','do','does','did','will','would','should','could','can','may','might','must','this','that','these','those','i','you','he','she','it','we','they','me','him','her','us','them']);
  const words = text.toLowerCase().replace(/[^\w\s]/g,' ').split(/\s+/).filter(w => w.length>3 && !stopWords.has(w) && !/\d/.test(w));
  const wordCount = {};
  words.forEach(w => wordCount[w] = (wordCount[w]||0)+1);
  return Object.entries(wordCount).sort((a,b)=>b[1]-a[1]).slice(0,5).map(([word])=>word);
};

// Transform ML results
const transformMLResults = (mlResults, jobId) => {
  const transformedResults = mlResults.map((item, idx)=>( {
    lineNumber: idx+1,
    originalText: item.text || item.originalText || '',
    sentimentScore: (item.confidence||0)*100,
    sentimentLabel: item.sentiment||'neutral',
    confidence: item.confidence||0,
    probabilities: item.probabilities||{ positive:0, negative:0 },
    keywords: extractKeywords(item.text||''),
    patternsFound: item.patternsFound||[],
    metadata: { length:(item.text||'').length, wordCount:(item.text||'').split(/\s+/).filter(w=>w.length>0).length, processedAt: new Date().toISOString() }
  }));
  const sentimentDistribution = {
    positive: mlResults.filter(r=>r.sentiment==='positive').length,
    neutral: mlResults.filter(r=>!r.sentiment || r.sentiment==='neutral').length,
    negative: mlResults.filter(r=>r.sentiment==='negative').length
  };
  const confidenceScores = mlResults.filter(r=>r.confidence).map(r=>r.confidence);
  const averageConfidence = confidenceScores.length>0 ? confidenceScores.reduce((a,b)=>a+b,0)/confidenceScores.length : 0;
  const averageSentiment = transformedResults.length>0 ? transformedResults.reduce((sum,i)=>sum+i.sentimentScore,0)/transformedResults.length : 0;
  return { transformedResults, sentimentDistribution, averageConfidence, averageSentiment, totalProcessed: transformedResults.length };
};

// ===== Background ML job =====
const processJobInBackground = async (jobId, filePath, userId, userEmail) => {
  try {
    await ensureTempDir();
    await ProcessingJob.findByIdAndUpdate(jobId, { status:'processing', startedAt:new Date(), progress:20 });

    const outputPath = path.join(ML_CONFIG.tempDir, `results_${jobId}.json`);
    const options = {
      mode:'text',
      pythonPath:ML_CONFIG.pythonPath,
      scriptPath:path.dirname(ML_CONFIG.scriptPath),
      args:[ML_CONFIG.modelPath, ML_CONFIG.vectorizerPath, filePath, outputPath],
      pythonOptions:['-u'],
      stdio:'pipe'
    };

    PythonShell.run('sentiment_integration.py', options, async (err, pythonOutput)=>{
      if(err){
        await ProcessingJob.findByIdAndUpdate(jobId, { status:'failed', errorMessage: err.message, failedAt:new Date(), progress:0 });
        try{ await fsp.unlink(filePath); } catch{}; 
        return;
      }

      try{
        let resultData;
        if(await fileExists(outputPath)) resultData = JSON.parse(await fsp.readFile(outputPath,'utf8'));
        else resultData = JSON.parse(pythonOutput.join(''));

        const { transformedResults, sentimentDistribution, averageConfidence, averageSentiment, totalProcessed } = transformMLResults(resultData.results||[], jobId);

        await ProcessingJob.findByIdAndUpdate(jobId,{
          status:'completed',
          progress:100,
          completedAt:new Date(),
          totalLines:totalProcessed,
          workersUsed:1,
          averageSentiment,
          sentimentDistribution,
          results:transformedResults,
          mlStatistics:{...resultData.statistics, average_confidence:averageConfidence, model_used:'sentiment_model.pkl', vectorizer_used:'tfidf_vectorizer.pkl'},
          mlEnabled:true
        });

        try{ await fsp.unlink(filePath); if(await fileExists(outputPath)) await fsp.unlink(outputPath); } catch{} 

        if(config.email?.enabled && emailService?.sendProcessingComplete){
          try{
            await emailService.sendProcessingComplete(
              userEmail,
              (await ProcessingJob.findById(jobId)).originalFilename,
              { totalRecords: totalProcessed, positiveCount: sentimentDistribution.positive, negativeCount: sentimentDistribution.negative, averageConfidence, processingTime:`${(Date.now()-(await ProcessingJob.findById(jobId)).startedAt)/1000}s` }
            );
          } catch(e){logger.warn('Email fail:', e);}
        }

      }catch(parseError){
        await ProcessingJob.findByIdAndUpdate(jobId,{ status:'failed', errorMessage:parseError.message, failedAt:new Date(), progress:50 });
        try{ await fsp.unlink(filePath); if(await fileExists(outputPath)) await fsp.unlink(outputPath); } catch{}
      }
    });
  } catch(error){
    await ProcessingJob.findByIdAndUpdate(jobId,{ status:'failed', errorMessage:error.message, failedAt:new Date(), progress:0 });
    try{ await fsp.unlink(filePath); } catch{}
  }
};

// ===== CONTROLLER FUNCTIONS =====
const processText = async (req,res)=>{
  try{
    const { text, options } = req.body; 
    const { userId,email:userEmail } = req.user;
    if(!text||!text.trim()) return res.status(400).json({ success:false, message:'Text is required' });
    await ensureTempDir();
    const tempFile = path.join(ML_CONFIG.tempDir, `direct_${Date.now()}.txt`);
    await fsp.writeFile(tempFile,text,'utf8');
    const job = new ProcessingJob({ userId, filename:`direct_${Date.now()}.txt`, originalFilename:'direct_text_input.txt', filePath:tempFile, fileType:'.txt', status:'pending', parallelWorkers:options?.parallelWorkers||1, mlEnabled:true });
    await job.save();
    processJobInBackground(job._id,tempFile,userId,userEmail);
    res.json({ success:true, message:'Text processing started', data:{ jobId:job._id, filename:'direct_text_input.txt', mlProcessing:true } });
  }catch(e){ logger.error(e); res.status(500).json({ success:false, message:'Failed to process text' }); }
};

const uploadFile = async (req,res)=>{
  try{
    if(!req.file) return res.status(400).json({ success:false, message:'No file uploaded' });
    const { userId,email:userEmail } = req.user; 
    const file=req.file;
    const allowed=['.txt','.csv','.json']; 
    const ext=path.extname(file.originalname).toLowerCase();
    if(!allowed.includes(ext)){ try{ await fsp.unlink(file.path); }catch{}; return res.status(400).json({ success:false, message:`File type ${ext} not supported` }); }
    const job = new ProcessingJob({ userId, filename:file.filename, originalFilename:file.originalname, filePath:file.path, fileSize:file.size, fileType:ext, status:'pending', mlEnabled:true });
    await job.save(); 
    processJobInBackground(job._id,file.path,userId,userEmail);
    res.json({ success:true, message:'File uploaded and ML processing started', data:{ jobId:job._id, filename:file.originalname, mlProcessing:true } });
  }catch(e){ logger.error(e); if(req.file?.path){ try{ await fsp.unlink(req.file.path); }catch{} } res.status(500).json({ success:false, message:'Failed to upload file' }); }
};

// For brevity, I can also include processBatch, getStatus, getResults, cancelJob with same async safe pattern.

module.exports = { uploadFile, processText, processJobInBackground };
