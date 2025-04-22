const fs = require('fs');
const path = require('path');
const axios = require('axios');
const FormData = require('form-data');
const { v4: uuidv4 } = require('uuid');
const sharp = require('sharp');
const mm = require('music-metadata');

class ComfyUIClient {
  /**
   * Client for interacting with ComfyUI API through Comput3
   * @param {string} serverUrl - ComfyUI server URL
   * @param {string} apiKey - Comput3 API key
   */
  constructor(serverUrl, apiKey) {
    this.serverUrl = serverUrl.endsWith('/') ? serverUrl.slice(0, -1) : serverUrl;
    this.apiKey = apiKey;
    this.clientId = this._getClientId();
    console.log(`🔌 Initialized ComfyUIClient with server URL: ${this.serverUrl}`);
  }
  
  /**
   * Get a client ID from the server or generate one if the endpoint doesn't exist
   * @returns {string} Client ID
   */
  _getClientId() {
    try {
      // For simplicity in Node.js implementation, we'll generate our own client ID
      return uuidv4();
    } catch (error) {
      console.warn(`⚠️ Failed to get client ID: ${error.message}`);
      return uuidv4();
    }
  }
  
  /**
   * Get headers with Comput3 API key
   * @returns {Object} Headers
   */
  _getHeaders() {
    return {
      'X-C3-API-KEY': this.apiKey
    };
  }
  
  /**
   * Upload a file to the ComfyUI server
   * @param {string} filePath - Path to file
   * @param {string} fileType - Type of file (input, output, etc.)
   * @returns {Promise<string|null>} Uploaded file name or null if upload failed
   */
  async uploadFile(filePath, fileType = 'input') {
    if (!fs.existsSync(filePath)) {
      console.error(`❌ File not found: ${filePath}`);
      return null;
    }
    
    const filename = path.basename(filePath);
    console.log(`📤 Uploading file: ${filename}`);
    
    // Always use the /upload/image endpoint since there's no /upload/audio
    const uploadUrl = `${this.serverUrl}/upload/image`;
    
    try {
      const formData = new FormData();
      formData.append('image', fs.createReadStream(filePath));
      formData.append('type', fileType);
      
      const response = await axios.post(uploadUrl, formData, {
        headers: {
          ...this._getHeaders(),
          ...formData.getHeaders()
        }
      });
      
      if (response.status === 200) {
        const responseData = response.data;
        console.log(`✅ File uploaded successfully: ${responseData.name}`);
        return responseData.name;
      } else {
        console.error(`❌ Upload failed: ${response.status} - ${response.data}`);
        return null;
      }
    } catch (error) {
      console.error(`❌ Exception during upload: ${error.message}`);
      return null;
    }
  }
  
  /**
   * Load a workflow from a JSON file
   * @param {string} workflowPath - Path to workflow file
   * @returns {Object} Workflow JSON
   */
  loadWorkflow(workflowPath) {
    try {
      const workflow = JSON.parse(fs.readFileSync(workflowPath, 'utf8'));
      return workflow;
    } catch (error) {
      console.error(`❌ Error loading workflow from ${workflowPath}: ${error.message}`);
      throw error;
    }
  }
  
  /**
   * Get the duration of an audio file in seconds, with proper rounding
   * @param {string} audioPath - Path to audio file
   * @returns {Promise<number>} Audio duration in seconds
   */
  async getAudioDuration(audioPath) {
    try {
      const metadata = await mm.parseFile(audioPath);
      if (!metadata) {
        console.warn(`⚠️ Could not load audio file: ${audioPath}`);
        return 5; // Default fallback duration
      }
      
      // Get the raw duration in seconds
      const rawDuration = metadata.format.duration;
      
      // Round up to the next second
      const roundedDuration = Math.ceil(rawDuration);
      
      // Add 1 second safety margin
      const finalDuration = roundedDuration + 1;
      
      console.log(`⏱️ Audio duration: ${rawDuration.toFixed(2)}s → ${finalDuration}s (rounded up + safety margin)`);
      return finalDuration;
    } catch (error) {
      console.error(`❌ Error getting audio duration: ${error.message}`);
      return 5; // Default duration if we can't read the file
    }
  }
  
  /**
   * Determine optimal dimensions for the image based on aspect ratio
   * @param {string} imagePath - Path to image file
   * @returns {Promise<{width: number, height: number}>} Optimal dimensions
   */
  async getOptimalDimensions(imagePath) {
    try {
      const metadata = await sharp(imagePath).metadata();
      const { width, height } = metadata;
      const aspectRatio = width / height;
      console.log(`📐 Original image dimensions: ${width}x${height}, aspect ratio: ${aspectRatio.toFixed(2)}`);

      // Define target formats
      const LANDSCAPE = { width: 1024, height: 576 };  // 16:9
      const PORTRAIT = { width: 576, height: 1024 };   // 9:16
      const SQUARE = { width: 576, height: 576 };      // 1:1

      // Calculate differences from target ratios
      const landscapeDiff = Math.abs(aspectRatio - (16/9));
      const portraitDiff = Math.abs(aspectRatio - (9/16));
      const squareDiff = Math.abs(aspectRatio - 1);

      if (landscapeDiff <= Math.min(portraitDiff, squareDiff)) {
        console.log("🖼️ Selected landscape format (16:9)");
        return LANDSCAPE;
      } else if (portraitDiff <= Math.min(landscapeDiff, squareDiff)) {
        console.log("🖼️ Selected portrait format (9:16)");
        return PORTRAIT;
      } else {
        console.log("🖼️ Selected square format (1:1)");
        return SQUARE;
      }
    } catch (error) {
      console.error(`❌ Error determining optimal dimensions: ${error.message}`);
      return { width: 576, height: 576 }; // Default to square if we can't process the image
    }
  }
  
  /**
   * Update the workflow with image and audio information
   * @param {Object} workflow - Workflow JSON
   * @param {string} imageName - Uploaded image name
   * @param {string} audioPath - Path to audio file
   * @returns {Promise<Object>} Updated workflow
   */
  async updateWorkflow(workflow, imageName, audioPath) {
    // Make a copy of the workflow to avoid modifying the original
    const updatedWorkflow = JSON.parse(JSON.stringify(workflow));
    
    // Get audio duration
    const audioDuration = await this.getAudioDuration(audioPath);
    
    // Get the actual image path from the uploaded image name
    // First check if the image was uploaded from a local path
    let originalImagePath = audioPath.replace(path.basename(audioPath), imageName);
    
    // If originalImagePath doesn't exist, try using the imageName directly
    if (!fs.existsSync(originalImagePath)) {
      // Try checking in the input directory
      const inputDir = path.join(process.cwd(), 'input');
      if (fs.existsSync(inputDir)) {
        const possiblePath = path.join(inputDir, imageName);
        if (fs.existsSync(possiblePath)) {
          originalImagePath = possiblePath;
        }
      }
    }
    
    // Get optimal dimensions for the image if the file exists
    let optimalWidth, optimalHeight;
    if (fs.existsSync(originalImagePath)) {
      const dimensions = await this.getOptimalDimensions(originalImagePath);
      optimalWidth = dimensions.width;
      optimalHeight = dimensions.height;
      console.log(`🔍 Determined optimal dimensions for image: ${optimalWidth}x${optimalHeight}`);
    } else {
      // Default dimensions if we can't find the image
      optimalWidth = 576;
      optimalHeight = 576;
      console.warn(`⚠️ Could not find original image to determine dimensions, using default: ${optimalWidth}x${optimalHeight}`);
    }
    
    // Update the workflow nodes
    for (const nodeId in updatedWorkflow) {
      const node = updatedWorkflow[nodeId];
      
      // Update LoadImage node
      if (node.class_type === 'LoadImage') {
        node.inputs.image = imageName;
        console.log(`🖼️ Updated LoadImage node with image: ${imageName}`);
      }
      
      // Update Image Resize node
      if (node.class_type === 'Image Resize') {
        // Save original dimensions for logging
        const originalWidth = node.inputs.resize_width || 576;
        const originalHeight = node.inputs.resize_height || 576;
        
        // Update with optimal dimensions
        node.inputs.resize_width = optimalWidth;
        node.inputs.resize_height = optimalHeight;
        
        console.log(`📐 Updated Image Resize dimensions from ${originalWidth}x${originalHeight} to ${optimalWidth}x${optimalHeight}`);
      }
      
      // Update the LoadAudio or VHS_LoadAudio node with the audio path
      if (['LoadAudio', 'VHS_LoadAudio'].includes(node.class_type)) {
        // Handle different node structures
        if ('audio' in node.inputs) {
          node.inputs.audio = path.basename(audioPath);
        } else if ('audio_file' in node.inputs) {
          node.inputs.audio_file = `input/${path.basename(audioPath)}`;
        }
        console.log(`🔊 Updated audio node with: ${path.basename(audioPath)}`);
      }
      
      // Update the SONIC_PreData node with the duration
      if (node.class_type === 'SONIC_PreData' && 'duration' in node.inputs) {
        node.inputs.duration = audioDuration;
        console.log(`⏱️ Set animation duration to ${audioDuration} seconds`);
      }
      
      // Specifically target node 33 (SONIC_PreData) if it exists
      if (nodeId === '33' && node.class_type === 'SONIC_PreData') {
        node.inputs.duration = audioDuration;
        console.log(`⏱️ Set node 33 (SONIC_PreData) duration to ${audioDuration} seconds`);
      }
    }
    
    return updatedWorkflow;
  }
  
  /**
   * Queue a workflow for execution
   * @param {Object} workflow - Workflow JSON
   * @returns {Promise<string|null>} Prompt ID or null if queueing failed
   */
  async queueWorkflow(workflow) {
    try {
      console.log('🚀 Queueing workflow');
      
      // Structure the payload
      const payload = {
        prompt: workflow,
        client_id: this.clientId
      };
      
      const response = await axios.post(
        `${this.serverUrl}/prompt`,
        payload,
        { headers: this._getHeaders() }
      );
      
      if (response.status === 200) {
        const result = response.data;
        const promptId = result.prompt_id;
        console.log(`✅ Workflow queued with ID: ${promptId}`);
        return promptId;
      } else {
        console.error(`❌ Failed to queue workflow: ${response.status} - ${response.data}`);
        return null;
      }
    } catch (error) {
      //console.log(error);
      console.log(error.response?.data)
      console.error(`❌ Error queueing workflow: ${error.message}`);
      return null;
    }
  }
  
  /**
   * Get execution history for a prompt
   * @param {string} promptId - Prompt ID
   * @returns {Promise<Object|null>} Execution history or null if not found
   */
  async getHistory(promptId) {
    try {
      const response = await axios.get(
        `${this.serverUrl}/history`,
        { headers: this._getHeaders() }
      );
      
      if (response.status === 200) {
        const history = response.data;
        
        // Find the history item with the matching prompt ID
        for (const item of Object.values(history)) {
          if (item.prompt_id === promptId) {
            return item;
          }
        }
        
        console.warn(`⚠️ No history found for prompt ID: ${promptId}`);
        return null;
      } else {
        console.error(`❌ Failed to get history: ${response.status} - ${response.data}`);
        return null;
      }
    } catch (error) {
      console.error(`❌ Error getting history: ${error.message}`);
      return null;
    }
  }
  
  /**
   * Check workflow status
   * @param {string} promptId - Prompt ID
   * @returns {Promise<{completed: boolean, history: Object|null, error: string|null}>} Status result
   */
  async checkWorkflowStatus(promptId) {
    try {
      // Get history for the prompt
      const history = await this.getHistory(promptId);
      
      if (!history) {
        return { completed: false, history: null, error: 'History not found' };
      }
      
      // Check if execution is complete
      if (history.status?.completed === true) {
        console.log('✅ Workflow execution completed');
        return { completed: true, history, error: null };
      }
      
      // Check for errors
      if (history.status?.error) {
        const errorMessage = history.status.error;
        console.error(`❌ Workflow execution failed with error: ${errorMessage}`);
        return { completed: true, history, error: errorMessage };
      }
      
      // Execution is still in progress
      const progress = history.status?.processing ? 
        history.status.processing_message || 'Processing...' : 
        'Waiting in queue...';
      
      console.log(`⏳ Workflow execution in progress: ${progress}`);
      return { completed: false, history, error: null };
    } catch (error) {
      console.error(`❌ Error checking workflow status: ${error.message}`);
      return { completed: false, history: null, error: error.message };
    }
  }
  
  /**
   * Get output files for a completed workflow
   * @param {string} promptId - Prompt ID
   * @returns {Promise<Array|null>} Output files or null if not found
   */
  async getOutputFiles(promptId) {
    try {
      const history = await this.getHistory(promptId);
      
      if (!history) {
        console.error(`❌ No history found for prompt ID: ${promptId}`);
        return null;
      }
      
      if (!history.outputs) {
        console.error(`❌ No outputs found in history for prompt ID: ${promptId}`);
        return null;
      }
      
      const outputFiles = [];
      
      // Process outputs from all nodes
      for (const nodeId in history.outputs) {
        const nodeOutputs = history.outputs[nodeId];
        
        for (const output of nodeOutputs) {
          const { type, filename, subfolder } = output;
          outputFiles.push({
            node_id: nodeId,
            type,
            filename,
            subfolder: subfolder || ''
          });
        }
      }
      
      console.log(`🔍 Found ${outputFiles.length} output files`);
      return outputFiles;
    } catch (error) {
      console.error(`❌ Error getting output files: ${error.message}`);
      return null;
    }
  }
  
  /**
   * Download a file from the ComfyUI server
   * @param {string} filename - File name
   * @param {string} outputDir - Output directory
   * @param {string} subfolder - Subfolder where the file is stored
   * @returns {Promise<string|null>} Downloaded file path or null if download failed
   */
  async downloadFile(filename, outputDir, subfolder = '') {
    try {
      // Create output directory if it doesn't exist
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }
      
      // Build URL
      let url = `${this.serverUrl}/view`;
      if (subfolder) {
        url += `?subfolder=${encodeURIComponent(subfolder)}&filename=${encodeURIComponent(filename)}`;
      } else {
        url += `?filename=${encodeURIComponent(filename)}`;
      }
      
      // Download file
      console.log(`📥 Downloading file: ${filename}`);
      const response = await axios.get(url, {
        headers: this._getHeaders(),
        responseType: 'arraybuffer'
      });
      
      if (response.status === 200) {
        const outputPath = path.join(outputDir, filename);
        fs.writeFileSync(outputPath, response.data);
        console.log(`✅ File downloaded to: ${outputPath}`);
        return outputPath;
      } else {
        console.error(`❌ File download failed: ${response.status} - ${response.statusText}`);
        return null;
      }
    } catch (error) {
      console.error(`❌ Error downloading file: ${error.message}`);
      return null;
    }
  }
  
  /**
   * Wait for workflow completion
   * @param {string} promptId - Prompt ID
   * @param {number} timeoutMinutes - Timeout in minutes
   * @returns {Promise<boolean>} True if workflow completed successfully, false otherwise
   */
  async waitForWorkflowCompletion(promptId, timeoutMinutes = 15) {
    const startTime = Date.now();
    const timeoutMs = timeoutMinutes * 60 * 1000;
    
    console.log(`⏳ Waiting for workflow completion (max ${timeoutMinutes} minutes)...`);
    
    // Initial wait for workflow to be picked up
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    while (Date.now() - startTime < timeoutMs) {
      const { completed, history, error } = await this.checkWorkflowStatus(promptId);
      
      if (completed) {
        // Check if there was an error
        if (error) {
          console.error(`❌ Workflow completed with error: ${error}`);
          return false;
        }
        
        // Successfully completed
        return true;
      }
      
      // Wait before checking again
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
    
    console.error(`❌ Workflow timed out after ${timeoutMinutes} minutes`);
    return false;
  }
}

module.exports = ComfyUIClient; 