import './style.css'
import { marked } from 'marked'

// Configure marked options
marked.setOptions({
  breaks: true,       // Add <br> on a single line break
  gfm: true,          // Use GitHub Flavored Markdown
  headerIds: false,   // Don't add IDs to headers for security reasons
  mangle: false,      // Don't mangle email addresses
  sanitize: false,    // Don't sanitize since we're using DOMPurify
  silent: true        // Don't throw parsing errors
});

// API URL configuration - using environment variable or default
const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8080/https://api.comput3.ai/api/v0";
const COMPLETIONS_URL = import.meta.env.VITE_COMPLETIONS_URL || "https://api.comput3.ai/v1/completions";
// CORS proxy prefix for node URLs - only use if explicitly set
const CORS_PREFIX = import.meta.env.VITE_CORS_PREFIX ? import.meta.env.VITE_CORS_PREFIX.trim() : "";
// Load balancer URL for chat queries - if set, this will be used instead of direct node connection
const LB_URL = import.meta.env.VITE_LB_URL || "https://app.comput3.ai/tags/all/v1";
// Flag to use load balancer instead of direct node connection
const USE_LOAD_BALANCER = import.meta.env.VITE_LB_URL !== undefined;

// Track the active node for inferencing
let activeNodeUrl = null;
let activeNodeHostname = null;
// API URL to use for chat (either direct node URL or load balancer URL)
let chatApiUrl = null;

document.querySelector('#app').innerHTML = `
  <div class="chat-container">
    <div class="chat-header">
      <h1>C3 Chat</h1>
      <div class="api-key-container">
        <input type="text" id="api-key" placeholder="Enter your Comput3 API key (or set VITE_C3_API_KEY in .env)" />
        <select id="model-select">
          <option value="llama3:70b">Llama3:70B (Free)</option>
          <option value="hermes3:70b">Hermes3:70B (Premium)</option>
        </select>
      </div>
      <div class="gpu-controls">
        <select id="gpu-type-select">
          <option value="ollama_webui:large">Ollama WebUI (Large)</option>
        </select>
        <button id="launch-gpu-btn">Launch GPU</button>
        <button id="check-gpu-btn">Check GPU Status</button>
        <button id="stop-gpu-btn" disabled>Stop GPU</button>
        <div id="gpu-status">No active GPU workloads</div>
      </div>
    </div>
    
    <div class="messages-container" id="messages-container">
      <div class="message system-message">
        <div class="message-content">
          <p>Hello! I'm powered by Comput3's API. Enter your API key or set VITE_C3_API_KEY in your .env file to start chatting with real LLM technology.</p>
          <p>You can use <strong>markdown</strong> in your messages and I'll respond with formatted text!</p>
          <p>When you launch a GPU, I'll automatically switch to using that GPU's OpenAI-compatible API for chat inferencing.</p>
        </div>
      </div>
    </div>
    
    <div class="input-area">
      <textarea id="user-input" placeholder="Type your message here... (Markdown supported)" rows="1"></textarea>
      <button id="send-button">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
          <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"></path>
        </svg>
      </button>
    </div>
  </div>
`

// Handle chat functionality
const messagesContainer = document.getElementById('messages-container');
const userInput = document.getElementById('user-input');
const sendButton = document.getElementById('send-button');
const apiKeyInput = document.getElementById('api-key');
const modelSelect = document.getElementById('model-select');

// GPU management elements
const gpuTypeSelect = document.getElementById('gpu-type-select');
const launchGpuBtn = document.getElementById('launch-gpu-btn');
const checkGpuBtn = document.getElementById('check-gpu-btn');
const stopGpuBtn = document.getElementById('stop-gpu-btn');
const gpuStatusDiv = document.getElementById('gpu-status');

// Store current active workload ID
let activeWorkloadId = null;

// Set API key from environment variable if available
if (import.meta.env.VITE_C3_API_KEY) {
  apiKeyInput.value = import.meta.env.VITE_C3_API_KEY;
  apiKeyInput.type = 'password';
  apiKeyInput.placeholder = 'API key set from environment variable';
}

// Disable chat input initially until a GPU is launched
userInput.disabled = true;
sendButton.disabled = true;
userInput.placeholder = "Launch a GPU first to enable chat...";

// Clear previous system messages and add initial message
messagesContainer.innerHTML = '';
const initialMessageDiv = document.createElement('div');
initialMessageDiv.className = "message system-message";
const initialContentDiv = document.createElement('div');
initialContentDiv.className = "message-content";
initialContentDiv.innerHTML = `
  <p>Welcome to C3 Chat! You must launch a GPU to start chatting.</p>
  <p>Enter your API key above, then click "Launch GPU" to start.</p>
  <p>Once a GPU is active, you'll be able to chat using its OpenAI-compatible API.</p>
  <p>CORS Proxy: ${CORS_PREFIX ? `<strong>${CORS_PREFIX}</strong>` : '<strong>None</strong>'} (configurable via VITE_CORS_PREFIX)</p>
  <p>API Mode: ${USE_LOAD_BALANCER ? `<strong>Load Balancer</strong> (${LB_URL})` : '<strong>Direct Node Connection</strong>'} (configurable via VITE_LB_URL)</p>
`;
initialMessageDiv.appendChild(initialContentDiv);
messagesContainer.appendChild(initialMessageDiv);

// Keep track of conversation history for context
let conversationHistory = [];

// Simple HTML sanitizer (basic protection against XSS)
function sanitizeHTML(html) {
  // This is a simple sanitizer. For production, consider using DOMPurify
  return html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/onerror|onclick|onload|onmouseover|onfocus|onblur/gi, '');
}

// Function to add a new message to the chat
function addMessage(text, isUser = false, isLoading = false) {
  const messageDiv = document.createElement('div');
  messageDiv.className = `message ${isUser ? 'user-message' : 'assistant-message'}`;
  
  const contentDiv = document.createElement('div');
  contentDiv.className = 'message-content';
  
  if (isLoading) {
    contentDiv.innerHTML = '<div class="loading-indicator"><div></div><div></div><div></div></div>';
  } else {
    // Store the original text for conversation history
    const originalText = text;
    
    if (isUser) {
      // For user messages, basic formatting with line breaks only
      contentDiv.innerHTML = text.replace(/\n/g, '<br>');
    } else {
      // For assistant messages, convert markdown to HTML and sanitize
      const htmlContent = sanitizeHTML(marked.parse(text));
      contentDiv.innerHTML = htmlContent;
    }
    
    // Add to conversation history if not loading
    conversationHistory.push({
      role: isUser ? 'user' : 'assistant',
      content: originalText // Store the raw text, not the HTML
    });
  }
  
  messageDiv.appendChild(contentDiv);
  messagesContainer.appendChild(messageDiv);
  
  // Scroll to the bottom of the messages container
  messagesContainer.scrollTop = messagesContainer.scrollHeight;
  
  return messageDiv;
}

// Function to get response from Comput3 API
async function getAIResponse(userMessage) {
  // Get API key from input field or environment variable
  const apiKey = apiKeyInput.value.trim() || import.meta.env.VITE_C3_API_KEY;
  const model = modelSelect.value;
  
  if (!apiKey) {
    return "Please enter your Comput3 API key in the field above or set VITE_C3_API_KEY in your .env file.";
  }
  
  // Require an active node for inferencing (even if using load balancer)
  if (!activeNodeUrl) {
    return "Error: No active GPU. Please launch a GPU first to use chat functionality.";
  }
  
  // Format for OpenAI-compatible chat API
  let messages = [];
  conversationHistory.forEach(msg => {
    messages.push({
      role: msg.role === 'user' ? 'user' : 'assistant',
      content: msg.content
    });
  });
  
  // Add current message if not already in history
  if (conversationHistory.length === 0 || 
      conversationHistory[conversationHistory.length - 1].content !== userMessage) {
    messages.push({
      role: 'user',
      content: userMessage
    });
  }
  
  try {
    // OpenAI-compatible API request
    console.log("Sending request to API:", {
      model: model,
      messages: messages,
      endpoint: chatApiUrl
    });
    
    const requestBody = JSON.stringify({
      model: model,
      messages: messages,
      max_tokens: 1000,
      temperature: 0.7
    });
    
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    };
    
    const response = await fetch(`${chatApiUrl}/chat/completions`, {
      method: 'POST',
      headers: headers,
      body: requestBody
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error("API error response:", errorData);
      throw new Error(errorData.message || `Error ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    console.log("API response:", data);
    
    // Parse response from OpenAI-compatible API
    if (data.choices && data.choices.length > 0 && data.choices[0].message) {
      return data.choices[0].message.content.trim();
    } else {
      throw new Error("Unexpected response format from node API");
    }
  } catch (error) {
    console.error('API error:', error);
    return `Error: ${error.message || 'Failed to connect to API'}`;
  }
}

// Function to handle sending a message
async function sendMessage() {
  const message = userInput.value.trim();
  if (message) {
    // Add user message
    addMessage(message, true);
    
    // Clear input
    userInput.value = '';
    userInput.style.height = 'auto';
    
    // Show loading indicator
    const loadingMessage = addMessage('', false, true);
    
    try {
      // Get AI response
      const aiResponse = await getAIResponse(message);
      
      // Replace loading message with actual response
      messagesContainer.removeChild(loadingMessage);
      addMessage(aiResponse, false);
    } catch (error) {
      // Replace loading message with error
      messagesContainer.removeChild(loadingMessage);
      addMessage(`Error: ${error.message}`, false);
    }
  }
}

// GPU Management Functions

// Launch a GPU
async function launchGPU() {
  const apiKey = apiKeyInput.value.trim() || import.meta.env.VITE_C3_API_KEY;
  if (!apiKey) {
    gpuStatusDiv.textContent = "Error: API key is required";
    gpuStatusDiv.className = "gpu-status-error";
    return;
  }

  const gpuType = gpuTypeSelect.value;
  const expiresTimestamp = Math.floor(Date.now() / 1000) + 3600; // Expires in 1 hour

  try {
    gpuStatusDiv.textContent = "Launching GPU...";
    gpuStatusDiv.className = "gpu-status-loading";
    
    // Disable all buttons during launch
    launchGpuBtn.disabled = true;
    checkGpuBtn.disabled = true;
    
    const response = await fetch(`${API_BASE_URL}/launch`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-C3-API-KEY': apiKey
      },
      body: JSON.stringify({
        type: gpuType,
        expires: expiresTimestamp
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `Error ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    console.log("GPU Launch response:", data);
    
    if (data.workload) {
      activeWorkloadId = data.workload;
      gpuStatusDiv.textContent = `GPU launched successfully! Workload ID: ${activeWorkloadId}`;
      gpuStatusDiv.className = "gpu-status-success";
      stopGpuBtn.disabled = false;
      
      // Re-enable buttons
      checkGpuBtn.disabled = false;
      
      // Check status to get the node URL for chat
      await checkGpuStatus();
    } else {
      throw new Error("Failed to launch GPU: No workload ID received");
    }
  } catch (error) {
    console.error('GPU launch error:', error);
    gpuStatusDiv.textContent = `Error launching GPU: ${error.message || 'Unknown error'}`;
    gpuStatusDiv.className = "gpu-status-error";
    
    // Re-enable buttons
    launchGpuBtn.disabled = false;
    checkGpuBtn.disabled = false;
  }
}

// Check GPU status
async function checkGpuStatus() {
  const apiKey = apiKeyInput.value.trim() || import.meta.env.VITE_C3_API_KEY;
  if (!apiKey) {
    gpuStatusDiv.textContent = "Error: API key is required";
    gpuStatusDiv.className = "gpu-status-error";
    return;
  }

  try {
    gpuStatusDiv.textContent = "Checking GPU status...";
    gpuStatusDiv.className = "gpu-status-loading";
    
    const response = await fetch(`${API_BASE_URL}/workloads`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-C3-API-KEY': apiKey
      },
      body: JSON.stringify({
        running: true
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `Error ${response.status}: ${response.statusText}`);
    }

    const workloads = await response.json();
    console.log("GPU Workloads:", workloads);
    
    if (workloads && workloads.length > 0) {
      const workload = workloads[0];
      activeWorkloadId = workload.workload;
      
      // Set the active node URL for inferencing
      if (workload.node) {
        // Store the raw node hostname
        activeNodeHostname = workload.node;
        
        // Apply CORS prefix to the node URL if needed
        if (CORS_PREFIX) {
          // Format: CORS_PREFIX/https://nodename/v1
          activeNodeUrl = `${CORS_PREFIX}/https://${activeNodeHostname}/v1`;
        } else {
          // Direct connection: https://nodename/v1
          activeNodeUrl = `https://${activeNodeHostname}/v1`;
        }
        
        // Set the chat API URL based on configuration
        if (USE_LOAD_BALANCER) {
          chatApiUrl = LB_URL;
          console.log("Using load balancer for inferencing:", chatApiUrl);
        } else {
          chatApiUrl = activeNodeUrl;
          console.log("Using direct node connection for inferencing:", chatApiUrl);
        }
        
        // Enable chat functionality
        userInput.disabled = false;
        sendButton.disabled = false;
        userInput.placeholder = "Type your message here... (Markdown supported)";
        
        // Re-enable buttons
        checkGpuBtn.disabled = false;
        stopGpuBtn.disabled = false;
        launchGpuBtn.disabled = true;
        
        const expireTime = new Date(workload.expires * 1000).toLocaleTimeString();
        gpuStatusDiv.textContent = `Active GPU: ${workload.type} at ${activeNodeHostname} (expires: ${expireTime})`;
        gpuStatusDiv.className = "gpu-status-success";
        
        // Add a system message about the active GPU
        const messageDiv = document.createElement('div');
        messageDiv.className = "message system-message";
        const contentDiv = document.createElement('div');
        contentDiv.className = "message-content";
        contentDiv.innerHTML = `
          <p>GPU is active and ready! Using node: <strong>${activeNodeHostname}</strong></p>
          <p>CORS Proxy: ${CORS_PREFIX ? `<strong>${CORS_PREFIX}</strong>` : '<strong>None</strong>'}</p>
          <p>API Mode: ${USE_LOAD_BALANCER ? 
                         `<strong>Load Balancer</strong> (${LB_URL})` : 
                         `<strong>Direct Node Connection</strong> (${activeNodeUrl})`}</p>
          <p>You can now start chatting using the GPU's resources.</p>
        `;
        messageDiv.appendChild(contentDiv);
        messagesContainer.appendChild(messageDiv);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
      } else {
        activeNodeUrl = null;
        activeNodeHostname = null;
        chatApiUrl = null;
        gpuStatusDiv.textContent = "Error: GPU workload found but no node hostname provided";
        gpuStatusDiv.className = "gpu-status-error";
        
        // Disable chat functionality
        userInput.disabled = true;
        sendButton.disabled = true;
        userInput.placeholder = "Launch a GPU first to enable chat...";
        
        // Enable launch button
        launchGpuBtn.disabled = false;
      }
    } else {
      activeWorkloadId = null;
      activeNodeUrl = null;
      activeNodeHostname = null;
      chatApiUrl = null;
      gpuStatusDiv.textContent = "No active GPU workloads found";
      gpuStatusDiv.className = "gpu-status-info";
      stopGpuBtn.disabled = true;
      launchGpuBtn.disabled = false;
      
      // Disable chat functionality
      userInput.disabled = true;
      sendButton.disabled = true;
      userInput.placeholder = "Launch a GPU first to enable chat...";
    }
  } catch (error) {
    console.error('Check GPU status error:', error);
    gpuStatusDiv.textContent = `Error checking GPU status: ${error.message || 'Unknown error'}`;
    gpuStatusDiv.className = "gpu-status-error";
    activeNodeUrl = null;
    activeNodeHostname = null;
    chatApiUrl = null;
    
    // Disable chat functionality
    userInput.disabled = true;
    sendButton.disabled = true;
    userInput.placeholder = "Launch a GPU first to enable chat...";
    
    // Re-enable buttons
    launchGpuBtn.disabled = false;
    checkGpuBtn.disabled = false;
  }
}

// Stop a GPU
async function stopGPU() {
  const apiKey = apiKeyInput.value.trim() || import.meta.env.VITE_C3_API_KEY;
  if (!apiKey) {
    gpuStatusDiv.textContent = "Error: API key is required";
    gpuStatusDiv.className = "gpu-status-error";
    return;
  }

  if (!activeWorkloadId) {
    gpuStatusDiv.textContent = "Error: No active workload to stop";
    gpuStatusDiv.className = "gpu-status-error";
    return;
  }

  try {
    gpuStatusDiv.textContent = "Stopping GPU...";
    gpuStatusDiv.className = "gpu-status-loading";
    
    const response = await fetch(`${API_BASE_URL}/stop`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-C3-API-KEY': apiKey
      },
      body: JSON.stringify({
        workload: activeWorkloadId
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `Error ${response.status}: ${response.statusText}`);
    }

    console.log("GPU Stop response:", await response.json());
    
    gpuStatusDiv.textContent = "GPU stopped successfully";
    gpuStatusDiv.className = "gpu-status-info";
    activeWorkloadId = null;
    activeNodeUrl = null;
    activeNodeHostname = null;
    chatApiUrl = null;
    stopGpuBtn.disabled = true;
    launchGpuBtn.disabled = false;
    
    // Disable chat functionality
    userInput.disabled = true;
    sendButton.disabled = true;
    userInput.placeholder = "Launch a GPU first to enable chat...";
    
    // Add a system message about the stopped GPU
    const messageDiv = document.createElement('div');
    messageDiv.className = "message system-message";
    const contentDiv = document.createElement('div');
    contentDiv.className = "message-content";
    contentDiv.innerHTML = "<p>GPU has been stopped. Launch a new GPU to continue chatting.</p>";
    messageDiv.appendChild(contentDiv);
    messagesContainer.appendChild(messageDiv);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
  } catch (error) {
    console.error('Stop GPU error:', error);
    gpuStatusDiv.textContent = `Error stopping GPU: ${error.message || 'Unknown error'}`;
    gpuStatusDiv.className = "gpu-status-error";
  }
}

// Event listeners for chat
sendButton.addEventListener('click', sendMessage);
userInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    sendMessage();
  }
});

// Auto-resize the textarea as the user types
userInput.addEventListener('input', () => {
  userInput.style.height = 'auto';
  userInput.style.height = userInput.scrollHeight + 'px';
});

// Event listeners for GPU management
launchGpuBtn.addEventListener('click', launchGPU);
checkGpuBtn.addEventListener('click', checkGpuStatus);
stopGpuBtn.addEventListener('click', stopGPU);

// Check for active workloads on page load
window.addEventListener('load', () => {
  // Only check if API key is available
  if (apiKeyInput.value.trim() || import.meta.env.VITE_C3_API_KEY) {
    checkGpuStatus();
  }
});
