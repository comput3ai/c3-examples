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

document.querySelector('#app').innerHTML = `
  <div class="chat-container">
    <div class="chat-header">
      <h1>C3 Chat</h1>
      <div class="api-key-container">
        <input type="text" id="api-key" placeholder="Enter your Comput3 API key (auto-detected from cookie if available)" />
        <select id="model-select">
          <option value="llama3:70b">Llama3:70B (Free)</option>
          <option value="hermes3:70b">Hermes3:70B (Premium)</option>
          <option value="kimi-k2">Kimi-K2</option>
          <option value="qwen3-coder:480b">Qwen3-Coder:480B</option>
        </select>
      </div>
    </div>
    
    <div class="messages-container" id="messages-container">
      <div class="message system-message">
        <div class="message-content">
          <p>Hello! I'm powered by Comput3's API. Your API key will be automatically detected from the c3_api_key cookie if available, or you can enter it manually.</p>
          <p>You can use <strong>markdown</strong> in your messages and I'll respond with formatted text!</p>
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

// Function to get cookie value by name
function getCookie(name) {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop().split(';').shift();
  return null;
}

// Function to set cookie value
function setCookie(name, value, days = 365) {
  const date = new Date();
  date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
  const expires = `expires=${date.toUTCString()}`;
  document.cookie = `${name}=${value};${expires};path=/;SameSite=Lax`;
}

// Check for API key in this order: cookie, environment variable
const cookieApiKey = getCookie('c3_api_key');
if (cookieApiKey) {
  apiKeyInput.value = cookieApiKey;
  apiKeyInput.type = 'password';
  apiKeyInput.placeholder = 'API key set from cookie';
} else if (import.meta.env.VITE_C3_API_KEY) {
  apiKeyInput.value = import.meta.env.VITE_C3_API_KEY;
  apiKeyInput.type = 'password';
  apiKeyInput.placeholder = 'API key set from environment variable';
}

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

// Function to get response from Comput3 API with streaming
async function* getAIResponseStream(userMessage) {
  // Get API key from input field, cookie, or environment variable
  const apiKey = apiKeyInput.value.trim() || getCookie('c3_api_key') || import.meta.env.VITE_C3_API_KEY;
  const model = modelSelect.value;
  
  if (!apiKey) {
    yield "Please enter your Comput3 API key in the field above, or ensure it's set as a cookie (c3_api_key) or in your .env file (VITE_C3_API_KEY).";
    return;
  }

  // Build messages array for chat completions format
  const messages = [];
  
  // Add conversation history
  conversationHistory.forEach(msg => {
    messages.push({
      role: msg.role,
      content: msg.content
    });
  });
  
  // Current message is already in history from addMessage() call
  // No need to add it again
  
  try {
    console.log("Sending streaming request to Comput3 API:", {
      model: model,
      messages: messages
    });
    
    const response = await fetch('https://api.comput3.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: model,
        messages: messages,
        temperature: 0.7,
        max_tokens: 1000,
        stream: true
      })
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error("API error response:", errorData);
      throw new Error(errorData.message || `Error ${response.status}: ${response.statusText}`);
    }
    
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    
    while (true) {
      const { done, value } = await reader.read();
      
      if (done) break;
      
      buffer += decoder.decode(value, { stream: true });
      
      // Process complete SSE messages
      const lines = buffer.split('\n');
      buffer = lines.pop() || ''; // Keep incomplete line in buffer
      
      for (const line of lines) {
        if (line.trim() === '') continue;
        if (line.startsWith('data: ')) {
          const data = line.slice(6);
          
          if (data === '[DONE]') {
            return;
          }
          
          try {
            const parsed = JSON.parse(data);
            if (parsed.choices && parsed.choices[0].delta && parsed.choices[0].delta.content) {
              yield parsed.choices[0].delta.content;
            }
          } catch (e) {
            console.error('Error parsing SSE data:', e);
          }
        }
      }
    }
  } catch (error) {
    console.error('API error:', error);
    yield `Error: ${error.message || 'Failed to connect to API'}`;
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
    
    // Create a new message for streaming response
    const messageDiv = document.createElement('div');
    messageDiv.className = 'message assistant-message';
    
    const contentDiv = document.createElement('div');
    contentDiv.className = 'message-content';
    messageDiv.appendChild(contentDiv);
    messagesContainer.appendChild(messageDiv);
    
    // Scroll to the bottom
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
    
    let fullResponse = '';
    
    try {
      // Get streaming AI response
      for await (const chunk of getAIResponseStream(message)) {
        fullResponse += chunk;
        
        // Convert markdown to HTML and update the content
        const htmlContent = sanitizeHTML(marked.parse(fullResponse));
        contentDiv.innerHTML = htmlContent;
        
        // Keep scrolling to bottom as content streams in
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
      }
      
      // Add the complete response to conversation history
      conversationHistory.push({
        role: 'assistant',
        content: fullResponse
      });
      
    } catch (error) {
      // Update the message with error
      fullResponse = `Error: ${error.message}`;
      contentDiv.innerHTML = fullResponse;
      
      // Add error to conversation history
      conversationHistory.push({
        role: 'assistant',
        content: fullResponse
      });
    }
  }
}

// Event listeners
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

// Save API key to cookie when it changes
apiKeyInput.addEventListener('input', (e) => {
  const apiKey = e.target.value.trim();
  if (apiKey) {
    setCookie('c3_api_key', apiKey);
    apiKeyInput.type = 'password';
    apiKeyInput.placeholder = 'API key saved to cookie';
  }
});
