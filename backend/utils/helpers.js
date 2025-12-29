/**
 * Generate a random ID
 */
const generateId = (prefix = '') => {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

/**
 * Validate email format
 */
const isValidEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * Format file size
 */
const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

/**
 * Calculate sentiment label from score
 */
const getSentimentLabel = (score) => {
  if (score > 20) return 'positive';
  if (score < -20) return 'negative';
  return 'neutral';
};

/**
 * Simulate delay (for testing)
 */
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

module.exports = {
  generateId,
  isValidEmail,
  formatFileSize,
  getSentimentLabel,
  delay
};