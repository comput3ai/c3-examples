const fs = require('fs');
const path = require('path');
const axios = require('axios');

class VisionAnalyzer {
  /**
   * Initialize with node index and API key
   * @param {number} nodeIndex - The node index
   * @param {string} apiKey - The API key
   */
  constructor(nodeIndex, apiKey) {
    this.nodeIndex = nodeIndex;
    this.apiKey = apiKey;
    this.apiUrl = `https://app.comput3.ai/${nodeIndex}/api/generate`;
  }

  /**
   * Encode an image file to base64
   * @param {string} imagePath - Path to the image file
   * @returns {Promise<string|null>} - Base64 encoded string or null on error
   */
  encodeImageToBase64(imagePath) {
    try {
      const imageBuffer = fs.readFileSync(imagePath);
      const base64Image = imageBuffer.toString('base64');
      console.info(`✅ Successfully encoded image: ${imagePath}`);
      return base64Image;
    } catch (error) {
      console.error(`❌ Error encoding image: ${error.message}`);
      return null;
    }
  }

  /**
   * Analyze an image using vision model on Comput3
   * @param {string} imagePath - Path to the image file
   * @param {string} [prompt] - Optional prompt for the model
   * @returns {Promise<Object|null>} - Analysis result or null on error
   */
  async analyzeImage(imagePath, prompt) {
    if (!prompt) {
      prompt = "Please analyze the image with as much detail as you can, provide detailed description of what you see. Including what you see in the background, the colours and the potential character(s) in the image.";
    }
    
    // Encode image to base64
    const base64Image = this.encodeImageToBase64(imagePath);
    if (!base64Image) {
      return null;
    }
    
    // Prepare payload
    const payload = {
      model: "llama3.2-vision:11b",
      prompt: prompt,
      stream: false,
      images: [base64Image]
    };
    
    // Prepare headers
    const headers = {
      Authorization: `Bearer ${this.apiKey}`,
      "Content-Type": "application/json"
    };
    
    try {
      console.info(`🔄 Sending analysis request to ${this.apiUrl}`);
      const response = await axios.post(
        this.apiUrl,
        payload,
        { headers }
      );
      
      if (response.status !== 200) {
        console.error(`❌ Failed to analyze image: ${response.status} - ${response.data}`);
        return null;
      }
      
      const result = response.data;
      console.info("✅ Successfully received analysis result");
      return result;
      
    } catch (error) {
      console.error(`❌ Error analyzing image: ${error.message}`);
      return null;
    }
  }

  /**
   * Save analysis result to a file in the output directory
   * @param {Object} analysisResult - The analysis result
   * @param {string} imagePath - Path to the original image
   * @returns {string|null} - Path to the output file or null on error
   */
  saveAnalysisToFile(analysisResult, imagePath) {
    // Create output directory if it doesn't exist
    const outputDir = path.join(__dirname, "output");
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    // Generate filename based on original image name and timestamp
    const imageName = path.basename(imagePath).split('.')[0];
    const timestamp = new Date().toISOString().replace(/[-:]/g, "").replace("T", "_").split(".")[0];
    const outputFile = path.join(outputDir, `${imageName}_analysis_${timestamp}.txt`);
    
    try {
      let content = "";
      if (analysisResult.response) {
        content = analysisResult.response;
      } else {
        content = JSON.stringify(analysisResult, null, 2);
      }
      
      fs.writeFileSync(outputFile, content);
      console.info(`✅ Analysis saved to: ${outputFile}`);
      return outputFile;
      
    } catch (error) {
      console.error(`❌ Error saving analysis: ${error.message}`);
      return null;
    }
  }
}

module.exports = VisionAnalyzer; 