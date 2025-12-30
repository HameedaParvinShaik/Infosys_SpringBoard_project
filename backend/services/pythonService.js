
// services/pythonService.js
const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');

class PythonService {
  constructor() {
    this.baseURL = process.env.PYTHON_SERVICE_URL || 'http://localhost:5001';
    this.client = axios.create({
      baseURL: this.baseURL,
      timeout: 30000, // 30 seconds timeout
    });
  }

  async checkHealth() {
    try {
      const response = await this.client.get('/health');
      return {
        healthy: true,
        data: response.data
      };
    } catch (error) {
      return {
        healthy: false,
        error: error.message
      };
    }
  }

  async analyzeText(text) {
    try {
      const response = await this.client.post('/analyze/text', {
        text: text
      });
      return response.data;
    } catch (error) {
      throw new Error(`Text analysis failed: ${error.message}`);
    }
  }

  async analyzeBatch(texts, maxTexts = 1000) {
    try {
      const response = await this.client.post('/analyze/batch', {
        texts: texts,
        max_texts: maxTexts
      });
      return response.data;
    } catch (error) {
      throw new Error(`Batch analysis failed: ${error.message}`);
    }
  }

  async analyzeFile(filePath, textColumn = null, maxTexts = 1000) {
    try {
      const formData = new FormData();
      
      // Read file and add to form data
      const fileStream = fs.createReadStream(filePath);
      const fileName = path.basename(filePath);
      
      formData.append('file', fileStream, fileName);
      
      if (textColumn) {
        formData.append('text_column', textColumn);
      }
      
      formData.append('max_texts', maxTexts.toString());

      const response = await this.client.post('/analyze/file', formData, {
        headers: {
          ...formData.getHeaders()
        },
        maxContentLength: Infinity,
        maxBodyLength: Infinity
      });

      return response.data;
    } catch (error) {
      throw new Error(`File analysis failed: ${error.message}`);
    }
  }

  async getSupportedFormats() {
    try {
      const response = await this.client.get('/formats');
      return response.data;
    } catch (error) {
      throw new Error(`Failed to get formats: ${error.message}`);
    }
  }
}

module.exports = new PythonService();
