const axios = require('axios');
const fs = require('fs');
const path = require('path');

class PromptClient {
  /**
   * Initialize with Comput3 API key
   * @param {string} apiKey - The Comput3 API key
   */
  constructor(apiKey) {
    this.apiKey = apiKey;
    this.apiUrl = 'https://app.comput3.ai/0/api/generate';
    
    if (!apiKey) {
      console.error('🔑 C3 API key is not provided. Please set your C3_API_KEY in .env file.');
    }
  }

  /**
   * Get the headers for API requests
   * @returns {Object} - The headers for API requests
   */
  getHeaders() {
    return {
      'Authorization': `Bearer ${this.apiKey}`,
      'Content-Type': 'application/json'
    };
  }

  /**
   * Send a prompt to the C3 API and return the response
   * @param {string} prompt - The prompt to send
   * @param {string} model - The model to use (default: "llama3:70b")
   * @returns {Promise<Object|null>} - The API response or null if there was an error
   */
  async sendPrompt(prompt, model = 'llama3:70b') {
    if (!this.apiKey) {
      console.error('❌ Cannot send prompt: C3 API key is missing');
      return null;
    }
    
    try {
      const payload = {
        model: model,
        prompt: prompt,
        stream: false
      };
      
      console.log(`🚀 Sending prompt to model: ${model}`);
      
      const response = await axios.post(
        this.apiUrl,
        payload,
        { headers: this.getHeaders() }
      );
      
      if (response.status !== 200) {
        console.error(`❌ Failed to send prompt: ${response.status} - ${response.statusText}`);
        return null;
      }
      
      console.log('✅ Successfully received response from model');
      return response.data;
    } catch (error) {
      console.error(`❌ Error sending prompt: ${error.message}`);
      return null;
    }
  }

  /**
   * Save the model response to a file
   * @param {Object} response - The API response
   * @param {number} promptNum - The prompt number
   * @param {string} outputDir - The directory to save the response to (default: "./results")
   * @returns {string|null} - The path to the saved file or null if there was an error
   */
  saveResponseToFile(response, promptNum, outputDir = './results') {
    // Create output directory if it doesn't exist
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    try {
      // Create a filename based on prompt number
      const outputFile = path.join(outputDir, `response_${promptNum}.txt`);
      
      // Extract the response text from the API response
      const responseText = response.response || '';
      
      // Write to file
      fs.writeFileSync(outputFile, responseText, 'utf8');
      
      return outputFile;
    } catch (error) {
      console.error(`❌ Error saving response to file: ${error.message}`);
      return null;
    }
  }
}

module.exports = PromptClient; 