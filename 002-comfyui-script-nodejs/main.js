#!/usr/bin/env node
/**
 * 🎬 Comput3 Avatar Generator
 *
 * This script generates talking head avatars using ComfyUI through the Comput3 platform.
 * It takes an image and an audio file as inputs and produces an animated video output.
 */

const fs = require('fs');
const path = require('path');
const yargs = require('yargs/yargs');
const { hideBin } = require('yargs/helpers');

const { C3_API_KEY, DEFAULT_OUTPUT_DIR, WORKFLOW_TEMPLATE_PATH } = require('./config');
const Comput3API = require('./comput3_api');
const ComfyUIClient = require('./comfyui_client');

/**
 * Parse command-line arguments
 * @returns {Object} Parsed arguments
 */
function parseArguments() {
  return yargs(hideBin(process.argv))
    .option('image', {
      alias: 'i',
      type: 'string',
      describe: 'Path to portrait image file',
      demandOption: true
    })
    .option('audio', {
      alias: 'a',
      type: 'string',
      describe: 'Path to audio file',
      demandOption: true
    })
    .option('output-dir', {
      alias: 'o',
      type: 'string',
      describe: 'Directory to save output files',
      default: DEFAULT_OUTPUT_DIR
    })
    .option('timeout', {
      alias: 't',
      type: 'number',
      describe: 'Timeout in minutes',
      default: 15
    })
    .option('verbose', {
      alias: 'v',
      type: 'boolean',
      describe: 'Enable verbose logging',
      default: false
    })
    .help()
    .argv;
}

/**
 * Setup logging configuration
 * @param {boolean} verbose - Enable verbose logging
 */
function setupLogging(verbose) {
  // Node.js doesn't need explicit logging setup like Python
  // We're using console.log, console.warn, console.error
  
  // Ensure output directory exists
  fs.mkdirSync(DEFAULT_OUTPUT_DIR, { recursive: true });
  
  console.log(`📝 Verbose logging: ${verbose ? 'enabled' : 'disabled'}`);
}

/**
 * Check if all requirements are met
 * @returns {boolean} True if all requirements are met, otherwise false
 */
function checkRequirements() {
  // Check for API key
  if (!C3_API_KEY) {
    console.error('🔑 C3 API key not found. Please set the C3_API_KEY environment variable or add it to .env file.');
    console.error('🌐 Get your API key from https://launch.comput3.ai');
    return false;
  }
  
  // Check if workflow template exists
  if (!fs.existsSync(WORKFLOW_TEMPLATE_PATH)) {
    console.error(`🔍 Workflow template not found at ${WORKFLOW_TEMPLATE_PATH}`);
    return false;
  }
  
  return true;
}

/**
 * Main entry point
 */
async function main() {
  // Parse arguments
  const args = parseArguments();
  setupLogging(args.verbose);
  
  console.log('='.repeat(60));
  console.log('🎬 Comput3 Avatar Generator');
  console.log('='.repeat(60));
  
  // Check requirements
  if (!checkRequirements()) {
    process.exit(1);
  }
  
  // Check if input files exist
  if (!fs.existsSync(args.image)) {
    console.error(`🖼️ Image file not found: ${args.image}`);
    process.exit(1);
  }
  
  if (!fs.existsSync(args.audio)) {
    console.error(`🔊 Audio file not found: ${args.audio}`);
    process.exit(1);
  }
  
  // Create output directory
  fs.mkdirSync(args.outputDir, { recursive: true });
  
  // Initialize Comput3 API client
  console.log('🚀 Initializing Comput3 API client...');
  const c3Client = new Comput3API(C3_API_KEY);
  
  // Get ComfyUI URL from running instance
  const comfyuiUrl = await c3Client.getComfyuiUrl();
  if (!comfyuiUrl) {
    console.error('❌ No running media instance found.');
    console.error('💡 Please launch a media instance first at https://launch.comput3.ai');
    process.exit(1);
  }
  
  console.log(`🖥️ Using ComfyUI instance at: ${comfyuiUrl}`);
  
  // Initialize ComfyUI client
  const comfyClient = new ComfyUIClient(comfyuiUrl, C3_API_KEY);
  
  // Step 1: Upload files
  console.log('📤 Uploading files...');
  
  // Upload image
  const imageName = await comfyClient.uploadFile(args.image, 'input');
  if (!imageName) {
    console.error('❌ Failed to upload image. Exiting.');
    process.exit(1);
  }
  
  // Upload audio
  const audioName = await comfyClient.uploadFile(args.audio, 'input');
  if (!audioName) {
    console.error('❌ Failed to upload audio. Exiting.');
    process.exit(1);
  }
  
  // Step 2: Load and update workflow
  console.log('📋 Loading workflow template...');
  let workflow;
  try {
    workflow = comfyClient.loadWorkflow(WORKFLOW_TEMPLATE_PATH);
  } catch (error) {
    console.error(`❌ Failed to load workflow template: ${error.message}`);
    process.exit(1);
  }
  
  // Update workflow with image and audio inputs
  console.log('🔄 Updating workflow with inputs...');
  const updatedWorkflow = await comfyClient.updateWorkflow(workflow, imageName, args.audio);
  
  // Step 3: Queue workflow
  console.log('🚀 Queueing workflow...');
  const promptId = await comfyClient.queueWorkflow(updatedWorkflow);
  
  if (!promptId) {
    console.error('❌ Failed to queue workflow. Exiting.');
    process.exit(1);
  }
  
  // Step 4: Wait for workflow to complete
  console.log(`⏳ Waiting for workflow to complete (max ${args.timeout} minutes)...`);
  const completed = await comfyClient.waitForWorkflowCompletion(promptId, args.timeout);
  
  if (!completed) {
    console.error('❌ Workflow processing failed or timed out.');
    console.error('💡 Common reasons for failure:');
    console.error('   • No face detected in the image (the model requires a clear portrait)');
    console.error('   • Server resources insufficient for processing');
    console.error('   • Server timeout or network issues');
    process.exit(1);
  }
  
  // Step 5: Get output files
  console.log('🔍 Getting output files...');
  const outputFiles = await comfyClient.getOutputFiles(promptId);
  
  if (!outputFiles) {
    console.error('❌ No output files found. Exiting.');
    process.exit(1);
  }
  
  // Get videos from outputs
  const videos = outputFiles.filter(f => f.type === 'video');
  
  if (videos.length === 0) {
    console.error('❌ No videos found in output.');
    process.exit(1);
  }
  
  // Step 6: Download output files
  console.log(`📥 Downloading output videos to: ${args.outputDir}`);
  
  // VHS_VideoCombine node output is typically in node 13
  const node13Videos = videos.filter(v => v.node_id === '13');
  
  if (node13Videos.length > 0) {
    // Download the most recent video (last in the list)
    const latestVideo = node13Videos[node13Videos.length - 1];
    console.log(`📹 Downloading video: ${latestVideo.filename}`);
    const outputPath = await comfyClient.downloadFile(
      latestVideo.filename,
      args.outputDir,
      latestVideo.subfolder
    );
    
    if (outputPath) {
      console.log('\n' + '='.repeat(60));
      console.log('✨ Avatar generation complete! ✨');
      console.log(`📁 Output saved to: ${outputPath}`);
      console.log('='.repeat(60));
    } else {
      console.error('❌ Failed to download video.');
      process.exit(1);
    }
  } else {
    // If no videos from node 13, try to download any videos found
    let success = false;
    for (const video of videos) {
      const outputPath = await comfyClient.downloadFile(
        video.filename,
        args.outputDir,
        video.subfolder
      );
      if (outputPath) {
        success = true;
        console.log('\n' + '='.repeat(60));
        console.log('✨ Avatar generation complete! ✨');
        console.log(`📁 Output saved to: ${outputPath}`);
        console.log('='.repeat(60));
        break;
      }
    }
    
    if (!success) {
      console.error('❌ Failed to download any videos.');
      process.exit(1);
    }
  }
  
  process.exit(0);
}

// Run the main function
main().catch(error => {
  console.error(`❌ Unhandled error: ${error.message}`);
  console.error(error.stack);
  process.exit(1);
}); 