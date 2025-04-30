const axios = require('axios');

class Comput3API {
  /**
   * Initialize with Comput3 API key
   * @param {string} apiKey - The Comput3 API key
   */
  constructor(apiKey) {
    this.apiKey = apiKey;
    this.apiUrl = 'https://api.comput3.ai/api/v0/workloads';
    
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
      'accept': '/',
      'accept-language': 'en,en-US;q=0.9',
      'content-type': 'application/json',
      'origin': 'https://launch.comput3.ai',
      'referer': 'https://launch.comput3.ai/',
      'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Safari/537.36',
      'x-c3-api-key': this.apiKey
    };
  }

  /**
   * Get all running workloads from Comput3 API
   * @returns {Promise<Array>} - The list of running workloads
   */
  async getRunningWorkloads() {
    if (!this.apiKey) {
      console.error('❌ Cannot get workloads: C3 API key is missing');
      return [];
    }
    
    try {
      const response = await axios.post(
        this.apiUrl,
        { running: true },
        { headers: this.getHeaders() }
      );
      
      if (response.status !== 200) {
        console.error(`❌ Failed to get workloads: ${response.status} - ${response.statusText}`);
        return [];
      }
      
      const workloads = response.data;
      console.log(`🔍 Found ${workloads.length} running workloads`);
      return workloads;
    } catch (error) {
      console.error(`❌ Error getting workloads: ${error.message}`);
      return [];
    }
  }

  /**
   * Get a running fast instance if available
   * @returns {Promise<Object|null>} - The fast instance workload with its index or null if not found
   */
  async getFastInstance() {
    const workloads = await this.getRunningWorkloads();

    for (let index = 0; index < workloads.length; index++) {
      const workload = workloads[index];
      if (workload.type && workload.type.endsWith('fast')) {
        console.log(`✅ Found fast instance at index ${index}: ${workload.node} (type: ${workload.type})`);
        // Attach the index to the workload object
        workload.index = index;
        return workload;
      }
    }

    console.warn('⚠️ No running fast instances found');
    return null;
  }
}

module.exports = Comput3API; 