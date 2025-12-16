require('dotenv').config();
const fs = require('fs');
const path = require('path');
const yargs = require('yargs/yargs');
const { hideBin } = require('yargs/helpers');

const Comput3API = require('./comput3Api');
const VisionAnalyzer = require('./visionAnalyzer');

/**
 * Main function to run the script
 */
async function main() {
  console.log("Script starting...");
  
  // Parse command line arguments
  const argv = yargs(hideBin(process.argv))
    .option('image', {
      alias: 'i',
      description: 'Path to the image file for analysis',
      type: 'string',
      demandOption: true
    })
    .help()
    .alias('help', 'h')
    .argv;
  
  // Validate image path
  if (!fs.existsSync(argv.image)) {
    console.error(`❌ Image file not found: ${argv.image}`);
    process.exit(1);
  }
  
  // Get API key from environment
  const apiKey = process.env.C3_API_KEY;
  if (!apiKey) {
    console.error("❌ C3_API_KEY not found in environment variables or .env file");
    process.exit(1);
  }
  
  // Initialize Comput3 API client
  const c3Client = new Comput3API(apiKey);
  
  // Check for fast GPU instance
  console.info("🔍 Looking for available fast GPU instances...");
  const fastInstance = await c3Client.getFastInstance();
  
  if (!fastInstance) {
    console.error("❌ No fast GPU instances found. Please launch a fast instance on Comput3.");
    process.exit(1);
  }
  
  // Extract node index from instance information
  const nodeIndex = fastInstance.index;
  console.info(`✅ Found fast GPU instance at node index: ${nodeIndex}`);
  
  // Initialize the vision analyzer
  const analyzer = new VisionAnalyzer(nodeIndex, apiKey);
  
  // Analyze the image
  console.info(`🖼️ Analyzing image: ${argv.image}`);
  const analysisResult = await analyzer.analyzeImage(argv.image);
  
  if (!analysisResult) {
    console.error("❌ Failed to analyze image");
    process.exit(1);
  }
  
  // Save results to file
  const outputFile = analyzer.saveAnalysisToFile(analysisResult, argv.image);
  
  if (outputFile) {
    console.info(`✅ Analysis complete! Results saved to: ${outputFile}`);
  } else {
    console.error("❌ Failed to save analysis results");
    process.exit(1);
  }
}

// Run the main function and handle any unhandled promise rejections
main().catch(error => {
  console.error(`❌ Unhandled error: ${error.message}`);
  process.exit(1);
}); 