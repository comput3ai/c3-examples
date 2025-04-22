const path = require('path');
require('dotenv').config();

// Comput3 API configuration
const C3_API_KEY = process.env.C3_API_KEY;
const C3_API_URL = 'https://api.comput3.ai/api/v0/workloads';

// Default paths
const DEFAULT_OUTPUT_DIR = path.join(process.cwd(), 'output');
const WORKFLOW_TEMPLATE_PATH = path.join(process.cwd(), 'workflows', 'avatar_generator.json');

// ComfyUI configuration
const DEFAULT_TIMEOUT_MINUTES = 30;
const CHECK_INTERVAL_SECONDS = 30;
const INITIAL_WAIT_SECONDS = 5;

module.exports = {
  C3_API_KEY,
  C3_API_URL,
  DEFAULT_OUTPUT_DIR,
  WORKFLOW_TEMPLATE_PATH,
  DEFAULT_TIMEOUT_MINUTES,
  CHECK_INTERVAL_SECONDS,
  INITIAL_WAIT_SECONDS
}; 