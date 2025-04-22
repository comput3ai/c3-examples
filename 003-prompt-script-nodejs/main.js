#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const yargs = require('yargs/yargs');
const { hideBin } = require('yargs/helpers');
const dotenv = require('dotenv');

const PromptClient = require('./promptClient');

// Load environment variables from .env
dotenv.config();

/**
 * Read prompts from a text file
 * @param {string} filePath - The path to the file
 * @returns {Array<string>} - The list of prompts
 */
function readPromptsFromFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    // Split by lines and filter out empty lines
    const prompts = content.split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0);
    return prompts;
  } catch (error) {
    console.error(`❌ Error reading prompts from file: ${error.message}`);
    return [];
  }
}

/**
 * Main function to process prompts
 */
async function main() {
  console.log('Script starting...');
  
  // Parse command line arguments
  const argv = yargs(hideBin(process.argv))
    .option('prompt-file', {
      alias: 'p',
      describe: 'Path to the text file containing prompts',
      type: 'string',
      demandOption: true
    })
    .option('model', {
      alias: 'm',
      describe: 'Model name to use',
      type: 'string',
      default: 'llama3:70b'
    })
    .option('output-dir', {
      alias: 'o',
      describe: 'Directory to save responses',
      type: 'string',
      default: './results'
    })
    .help()
    .alias('help', 'h')
    .argv;
  
  // Validate prompt file path
  if (!fs.existsSync(argv.promptFile)) {
    console.error(`❌ Prompt file not found: ${argv.promptFile}`);
    process.exit(1);
  }
  
  // Get API key from environment
  const apiKey = process.env.C3_API_KEY;
  if (!apiKey) {
    console.error('❌ C3_API_KEY not found in environment variables or .env file');
    process.exit(1);
  }
  
  // Read prompts from file
  console.log(`📄 Reading prompts from: ${argv.promptFile}`);
  const prompts = readPromptsFromFile(argv.promptFile);
  
  if (prompts.length === 0) {
    console.error('❌ No prompts found in the file or the file is empty');
    process.exit(1);
  }
  
  console.log(`✅ Found ${prompts.length} prompts to process`);
  
  // Initialize prompt client
  const promptClient = new PromptClient(apiKey);
  
  // Process each prompt
  for (let i = 0; i < prompts.length; i++) {
    const prompt = prompts[i];
    console.log(`🔄 Processing prompt ${i+1}/${prompts.length}`);
    
    // Send prompt to API
    const response = await promptClient.sendPrompt(prompt, argv.model);
    
    if (!response) {
      console.error(`❌ Failed to get response for prompt ${i+1}`);
      continue;
    }
    
    // Save response to file
    const outputFile = promptClient.saveResponseToFile(response, i+1, argv.outputDir);
    
    if (outputFile) {
      console.log(`✅ Response saved to: ${outputFile}`);
    } else {
      console.error(`❌ Failed to save response for prompt ${i+1}`);
    }
  }
  
  console.log(`🎉 All prompts processed! Responses saved to: ${argv.outputDir}`);
}

// Run the main function and handle any uncaught errors
main().catch(error => {
  console.error(`❌ Unhandled error: ${error.message}`);
  process.exit(1);
}); 