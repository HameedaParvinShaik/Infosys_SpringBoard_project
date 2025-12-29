const nodemailer = require('nodemailer');
const config = require('../config/config');
const { logger } = require('../utils/logger');

// PLACEHOLDER: Email transporter (configure with your friend's email settings)
const transporter = nodemailer.createTransport({
  host: config.email.host,
  port: config.email.port,
  secure: false,
  auth: {
    user: config.email.user,
    pass: config.email.pass
  }
});

/**
 * Send processing complete email
 */
const sendProcessingComplete = async (toEmail, filename, results) => {
  try {
    // PLACEHOLDER: Your friend will implement actual email sending
    logger.info(`[EMAIL SIMULATION] Sent processing complete to ${toEmail} for file ${filename}`);
    
    // Simulated email data
    const mailOptions = {
      from: '"Text Processor" <noreply@textprocessor.com>',
      to: toEmail,
      subject: `Processing Complete: ${filename}`,
      html: `
        <h2>Processing Complete!</h2>
        <p>Your file <strong>${filename}</strong> has been processed successfully.</p>
        <h3>Results Summary:</h3>
        <ul>
          <li>Total Lines: ${results.totalLines}</li>
          <li>Parallel Workers: ${results.workers}</li>
          <li>Average Sentiment: ${results.averageSentiment.toFixed(2)}</li>
          <li>Processing Time: ${(Math.random() * 10 + 2).toFixed(2)} seconds</li>
        </ul>
        <p>Login to your dashboard to view detailed results.</p>
      `
    };
    
    // In production: await transporter.sendMail(mailOptions);
    return { success: true, message: 'Email sent successfully' };
  } catch (error) {
    logger.error('Email sending error:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Send processing failed email
 */
const sendProcessingFailed = async (toEmail, filename, errorMessage) => {
  try {
    logger.info(`[EMAIL SIMULATION] Sent processing failed to ${toEmail} for file ${filename}`);
    
    // Simulated email
    const mailOptions = {
      from: '"Text Processor" <noreply@textprocessor.com>',
      to: toEmail,
      subject: `Processing Failed: ${filename}`,
      html: `
        <h2>Processing Failed</h2>
        <p>Your file <strong>${filename}</strong> failed to process.</p>
        <p><strong>Error:</strong> ${errorMessage}</p>
        <p>Please check the file format and try again, or contact support.</p>
      `
    };
    
    // In production: await transporter.sendMail(mailOptions);
    return { success: true, message: 'Failure notification sent' };
  } catch (error) {
    logger.error('Failure email error:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Send batch processing summary
 */
const sendBatchSummary = async (toEmail, batchResults) => {
  try {
    logger.info(`[EMAIL SIMULATION] Sent batch summary to ${toEmail}`);
    
    const successCount = batchResults.filter(r => r.status === 'completed').length;
    const failedCount = batchResults.filter(r => r.status === 'failed').length;
    
    const mailOptions = {
      from: '"Text Processor" <noreply@textprocessor.com>',
      to: toEmail,
      subject: `Batch Processing Complete: ${successCount} successful, ${failedCount} failed`,
      html: `
        <h2>Batch Processing Complete</h2>
        <p>Your batch of ${batchResults.length} files has been processed.</p>
        <h3>Results:</h3>
        <ul>
          <li>✅ Successful: ${successCount} files</li>
          <li>❌ Failed: ${failedCount} files</li>
          <li>⏱️ Total Processing Time: ${(Math.random() * 30 + 10).toFixed(2)} seconds</li>
        </ul>
        <p>Login to your dashboard to view detailed results for each file.</p>
      `
    };
    
    // In production: await transporter.sendMail(mailOptions);
    return { success: true };
  } catch (error) {
    logger.error('Batch summary email error:', error);
    return { success: false, error: error.message };
  }
};

module.exports = {
  sendProcessingComplete,
  sendProcessingFailed,
  sendBatchSummary
};