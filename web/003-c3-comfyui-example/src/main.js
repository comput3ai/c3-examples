import './style.css'

// API Configuration
const API_URL = import.meta.env.VITE_API_URL || 'https://api.comput3.ai/api/v0';
const CORS_PROXY = import.meta.env.VITE_CORS_PROXY || 'http://localhost:8080';
const POLLING_INTERVAL = 5000; // 5 seconds between status checks

// Default ComfyUI workflow template
const DEFAULT_WORKFLOW = {
  "13": {
    "inputs": {
      "frame_rate": [
        "31",
        1
      ],
      "loop_count": 0,
      "filename_prefix": "Video",
      "format": "video/h264-mp4",
      "pix_fmt": "yuv420p",
      "crf": 19,
      "save_metadata": true,
      "trim_to_audio": true,  // Set to true to ensure audio length matches video
      "pingpong": false,
      "save_output": true,
      "images": [
        "31",
        0
      ],
      "audio": [
        "26",
        0
      ]
    },
    "class_type": "VHS_VideoCombine",
    "_meta": {
      "title": "Video Combine 🎥🅥🅗🅢"
    }
  },
  "18": {
    "inputs": {
      "image": "placeholder.png"  // Will be replaced with uploaded image
    },
    "class_type": "LoadImage",
    "_meta": {
      "title": "Load a portrait Image (Face Closeup)"
    }
  },
  "21": {
    "inputs": {
      "images": [
        "58",
        0
      ]
    },
    "class_type": "PreviewImage",
    "_meta": {
      "title": "Preview Image after Resize"
    }
  },
  "26": {
    "inputs": {
      "audio": "placeholder.mp3",  // Will be replaced with uploaded audio
      "audioUI": ""
    },
    "class_type": "LoadAudio",
    "_meta": {
      "title": "LoadAudio"
    }
  },
  "31": {
    "inputs": {
      "seed": 2054408119,  // Random seed for generation
      "inference_steps": 25,
      "dynamic_scale": 1,
      "fps": 24,
      "model": [
        "34",
        0
      ],
      "data_dict": [
        "35",
        0
      ]
    },
    "class_type": "SONICSampler",
    "_meta": {
      "title": "SONICSampler"
    }
  },
  "32": {
    "inputs": {
      "ckpt_name": "svd_xt.safetensors"
    },
    "class_type": "ImageOnlyCheckpointLoader",
    "_meta": {
      "title": "Image Only Checkpoint Loader (img2vid model)"
    }
  },
  "33": {
    "inputs": {
      "min_resolution": 576,
      "duration": 11,  // Will be set based on audio duration + safety margin
      "expand_ratio": 1,
      "clip_vision": [
        "32",
        1
      ],
      "vae": [
        "32",
        2
      ],
      "audio": [
        "26",
        0
      ],
      "image": [
        "58",
        0
      ],
      "weight_dtype": [
        "34",
        1
      ]
    },
    "class_type": "SONIC_PreData",
    "_meta": {
      "title": "SONIC_PreData"
    }
  },
  "34": {
    "inputs": {
      "sonic_unet": "unet.pth",
      "ip_audio_scale": 1,
      "use_interframe": true,
      "dtype": "bf16",
      "model": [
        "32",
        0
      ]
    },
    "class_type": "SONICTLoader",
    "_meta": {
      "title": "SONICTLoader"
    }
  },
  "35": {
    "inputs": {
      "anything": [
        "33",
        0
      ]
    },
    "class_type": "easy cleanGpuUsed",
    "_meta": {
      "title": "Clean VRAM Used"
    }
  },
  "58": {
    "inputs": {
      "width": 512,  // Will be dynamically calculated to maintain aspect ratio
      "height": 512, // Will be dynamically calculated to maintain aspect ratio
      "interpolation": "nearest",
      "method": "stretch",
      "condition": "always",
      "multiple_of": 0,
      "image": [
        "18",
        0
      ]
    },
    "class_type": "ImageResize+",
    "_meta": {
      "title": "🔧 Image Resize"
    }
  }
};

// Function to build API URL with CORS proxy if needed
function buildApiUrl(endpoint) {
  if (import.meta.env.DEV && CORS_PROXY) {
    // In development, use the CORS proxy
    return `${CORS_PROXY}/${API_URL}${endpoint}`;
  } else {
    // In production, use the direct API URL
    return `${API_URL}${endpoint}`;
  }
}

// Function to build ComfyUI URL with CORS proxy if needed
function buildComfyUIUrl(nodeHostname) {
  const comfyuiHostname = getComfyUIHostname(nodeHostname);
  const baseUrl = `https://${comfyuiHostname}`;
  
  if (import.meta.env.DEV && CORS_PROXY) {
    // In development, use the CORS proxy
    return `${CORS_PROXY}/${baseUrl}`;
  } else {
    // In production, use the direct URL
    return baseUrl;
  }
}

// Generate a unique ID
function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0, 
          v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

document.querySelector('#app').innerHTML = `
  <div class="upload-container">
    <div class="header">
      <h1>ComfyUI Workflow</h1>
      <div class="api-key-container">
        <input type="text" id="api-key" placeholder="Enter your Comput3 API key (or set VITE_C3_API_KEY in .env)" />
      </div>
    </div>
    
    <div class="instance-status">
      <span id="instance-status-message">No ComfyUI instance connected</span>
      <div class="instance-actions">
        <button id="check-instance-button">Check Instances</button>
        <button id="launch-instance-button" disabled>Launch Instance</button>
        <button id="stop-instance-button" disabled>Stop Instance</button>
      </div>
    </div>
    
    <div class="dropzones-container">
      <div class="dropzone" id="image-dropzone">
        <div class="dropzone-content">
          <svg xmlns="http://www.w3.org/2000/svg" width="50" height="50" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
            <circle cx="8.5" cy="8.5" r="1.5"></circle>
            <polyline points="21 15 16 10 5 21"></polyline>
          </svg>
          <p>Drag & drop portrait image here<br>or click to browse</p>
          <input type="file" id="image-input" accept="image/*" hidden />
        </div>
        <div class="file-preview" id="image-preview" hidden>
          <img id="image-preview-content" src="" alt="Preview" />
          <button class="remove-btn" id="remove-image">×</button>
        </div>
      </div>
      
      <div class="dropzone" id="audio-dropzone">
        <div class="dropzone-content">
          <svg xmlns="http://www.w3.org/2000/svg" width="50" height="50" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M9 18V5l12-2v13"></path>
            <circle cx="6" cy="18" r="3"></circle>
            <circle cx="18" cy="16" r="3"></circle>
          </svg>
          <p>Drag & drop audio here<br>or click to browse</p>
          <input type="file" id="audio-input" accept="audio/*" hidden />
        </div>
        <div class="file-preview" id="audio-preview" hidden>
          <audio id="audio-preview-content" controls></audio>
          <button class="remove-btn" id="remove-audio">×</button>
        </div>
      </div>
    </div>
    
    <div class="workflow-info">
      <h3>Using SONIC Workflow:</h3>
      <p>This workflow will generate a synchronized video animation from your portrait image and audio using the SONIC model.</p>
      <p>The SONIC model will analyze your audio and animate your portrait image to create lip-sync and natural movement.</p>
    </div>
    
    <div class="action-area">
      <button id="process-button" disabled>Generate Video</button>
      <div id="progress-container" class="progress-container" hidden>
        <div class="progress-bar">
          <div id="progress-bar-fill" class="progress-bar-fill"></div>
        </div>
        <div id="progress-status" class="progress-status">Initializing...</div>
      </div>
      <div id="status-message"></div>
      <div id="result-container" class="result-container" hidden>
        <h3>Generated Video</h3>
        <div id="filename-display" class="filename-display"></div>
        <video id="result-video" controls></video>
        <a id="download-link" class="download-button" download>Download Video</a>
      </div>
    </div>
  </div>
`

// File management functionality
const apiKeyInput = document.getElementById('api-key');
const imageDropzone = document.getElementById('image-dropzone');
const audioDropzone = document.getElementById('audio-dropzone');
const imageInput = document.getElementById('image-input');
const audioInput = document.getElementById('audio-input');
const imagePreview = document.getElementById('image-preview');
const audioPreview = document.getElementById('audio-preview');
const imagePreviewContent = document.getElementById('image-preview-content');
const audioPreviewContent = document.getElementById('audio-preview-content');
const removeImageBtn = document.getElementById('remove-image');
const removeAudioBtn = document.getElementById('remove-audio');
const processButton = document.getElementById('process-button');
const statusMessage = document.getElementById('status-message');
const instanceStatusMessage = document.getElementById('instance-status-message');
const checkInstanceButton = document.getElementById('check-instance-button');
const launchInstanceButton = document.getElementById('launch-instance-button');
const stopInstanceButton = document.getElementById('stop-instance-button');
const resultContainer = document.getElementById('result-container');
const resultVideo = document.getElementById('result-video');
const downloadLink = document.getElementById('download-link');
const progressContainer = document.getElementById('progress-container');
const progressBarFill = document.getElementById('progress-bar-fill');
const progressStatus = document.getElementById('progress-status');

// Current instance information
let currentInstance = null;
let promptId = null;
let generationCancelled = false;

// Set API key from environment variable if available
if (import.meta.env.VITE_C3_API_KEY) {
  apiKeyInput.value = import.meta.env.VITE_C3_API_KEY;
  apiKeyInput.type = 'password';
  apiKeyInput.placeholder = 'API key set from environment variable';
  
  // Enable launch button if API key is available
  launchInstanceButton.disabled = false;
  
  // Check for instance automatically if API key is available
  setTimeout(() => checkForRunningInstance(), 500);
}

// Update API key event listener
apiKeyInput.addEventListener('input', () => {
  launchInstanceButton.disabled = !apiKeyInput.value.trim();
});

// Store file objects
let imageFile = null;
let audioFile = null;

// Update process button status
function updateProcessButtonState() {
  processButton.disabled = !(imageFile && audioFile && currentInstance);
  stopInstanceButton.disabled = !currentInstance;
}

// Calculate default expiry time (1 hour from now)
function getDefaultExpiry() {
  return Math.floor(Date.now() / 1000) + 3600;
}

// Show progress updates
function updateProgress(percentage, statusText, isProcessing = false) {
  progressContainer.hidden = false;
  progressBarFill.style.width = `${percentage}%`;
  progressStatus.textContent = statusText;
  
  // Add or remove the processing class based on current state
  if (isProcessing) {
    progressStatus.classList.add('processing');
  } else {
    progressStatus.classList.remove('processing');
  }
}

// Check for running ComfyUI instances
async function checkForRunningInstance() {
  const apiKey = apiKeyInput.value.trim() || import.meta.env.VITE_C3_API_KEY;
  
  if (!apiKey) {
    instanceStatusMessage.textContent = "Please enter your API key to check for instances";
    return;
  }
  
  instanceStatusMessage.textContent = "Checking for running instances...";
  instanceStatusMessage.className = "loading";
  checkInstanceButton.disabled = true;
  
  try {
    const response = await fetch(buildApiUrl('/workloads'), {
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
      throw new Error(`Failed to check instances: ${response.statusText}`);
    }
    
    const instances = await response.json();
    const mediaFastInstance = instances.find(instance => instance.type === 'media:fast' && instance.status === 'running');
    
    if (mediaFastInstance) {
      currentInstance = mediaFastInstance;
      const expiresIn = Math.floor((mediaFastInstance.expires - Date.now()/1000) / 60);
      instanceStatusMessage.textContent = `Connected to ComfyUI on ${mediaFastInstance.node} (expires in ~${expiresIn} minutes)`;
      instanceStatusMessage.className = "connected";
    } else {
      currentInstance = null;
      instanceStatusMessage.textContent = "No running ComfyUI instances found. Launch a new instance to proceed.";
      instanceStatusMessage.className = "";
    }
    
  } catch (error) {
    console.error('Error checking instances:', error);
    instanceStatusMessage.textContent = `Error: ${error.message}`;
    instanceStatusMessage.className = "error";
    currentInstance = null;
  } finally {
    checkInstanceButton.disabled = false;
    updateProcessButtonState();
  }
}

// Launch a new ComfyUI instance
async function launchNewInstance() {
  const apiKey = apiKeyInput.value.trim() || import.meta.env.VITE_C3_API_KEY;
  
  if (!apiKey) {
    instanceStatusMessage.textContent = "Please enter your API key to launch an instance";
    instanceStatusMessage.className = "error";
    return;
  }
  
  instanceStatusMessage.textContent = "Launching ComfyUI instance...";
  instanceStatusMessage.className = "loading";
  launchInstanceButton.disabled = true;
  
  try {
    const expiryTime = getDefaultExpiry();
    
    const response = await fetch(buildApiUrl('/launch'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-C3-API-KEY': apiKey
      },
      body: JSON.stringify({
        type: 'media:fast',
        expires: expiryTime
      })
    });
    
    if (!response.ok) {
      throw new Error(`Failed to launch instance: ${response.statusText}`);
    }
    
    const instanceData = await response.json();
    console.log("Launched instance:", instanceData);
    
    // Store instance data and update UI
    // Recheck instances to get full instance details
    setTimeout(() => checkForRunningInstance(), 5000); // Give instance time to start up
    
    instanceStatusMessage.textContent = `Launched ComfyUI on ${instanceData.node}`;
    instanceStatusMessage.className = "connected";
    
  } catch (error) {
    console.error('Error launching instance:', error);
    instanceStatusMessage.textContent = `Error: ${error.message}`;
    instanceStatusMessage.className = "error";
  } finally {
    launchInstanceButton.disabled = false;
  }
}

// Stop the current instance
async function stopInstance() {
  if (!currentInstance) {
    instanceStatusMessage.textContent = "No instance to stop";
    return;
  }
  
  const apiKey = apiKeyInput.value.trim() || import.meta.env.VITE_C3_API_KEY;
  
  instanceStatusMessage.textContent = "Stopping instance...";
  instanceStatusMessage.className = "loading";
  stopInstanceButton.disabled = true;
  
  try {
    const response = await fetch(buildApiUrl('/stop'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-C3-API-KEY': apiKey
      },
      body: JSON.stringify({
        workload: currentInstance.workload
      })
    });
    
    if (!response.ok) {
      throw new Error(`Failed to stop instance: ${response.statusText}`);
    }
    
    const stopData = await response.json();
    console.log("Stopped instance:", stopData);
    
    // Clear current instance and update UI
    currentInstance = null;
    instanceStatusMessage.textContent = "Instance stopped successfully";
    instanceStatusMessage.className = "";
    
  } catch (error) {
    console.error('Error stopping instance:', error);
    instanceStatusMessage.textContent = `Error: ${error.message}`;
    instanceStatusMessage.className = "error";
  } finally {
    stopInstanceButton.disabled = !currentInstance;
    updateProcessButtonState();
  }
}

// Handle file selection for image
function handleImageSelect(file) {
  if (file && file.type.startsWith('image/')) {
    imageFile = file;
    
    const reader = new FileReader();
    reader.onload = (e) => {
      imagePreviewContent.src = e.target.result;
      imagePreview.hidden = false;
      imageDropzone.querySelector('.dropzone-content').hidden = true;
    };
    reader.readAsDataURL(file);
    
    updateProcessButtonState();
  }
}

// Handle file selection for audio
function handleAudioSelect(file) {
  if (file && file.type.startsWith('audio/')) {
    audioFile = file;
    
    const reader = new FileReader();
    reader.onload = (e) => {
      audioPreviewContent.src = e.target.result;
      audioPreview.hidden = false;
      audioDropzone.querySelector('.dropzone-content').hidden = true;
    };
    reader.readAsDataURL(file);
    
    updateProcessButtonState();
  }
}

// Get the proper ComfyUI hostname from instance hostname
function getComfyUIHostname(nodeHostname) {
  // ComfyUI is hosted at ui-{node_hostname} according to the Python code
  return `ui-${nodeHostname}`;
}

// Cancel the current workflow generation
function cancelGeneration() {
  if (!promptId || !currentInstance) return;
  
  generationCancelled = true;
  const apiKey = apiKeyInput.value.trim() || import.meta.env.VITE_C3_API_KEY;
  
  try {
    const comfyuiUrl = buildComfyUIUrl(currentInstance.node);
    
    fetch(`${comfyuiUrl}/cancel`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-C3-API-KEY': apiKey
      },
      body: JSON.stringify({
        prompt_id: promptId
      })
    });
    
    statusMessage.textContent = "Generation cancelled";
    statusMessage.className = "error";
    progressContainer.hidden = true;
  } catch (error) {
    console.error('Error cancelling generation:', error);
  }
}

// First upload the files then run the workflow
async function processFiles() {
  const apiKey = apiKeyInput.value.trim() || import.meta.env.VITE_C3_API_KEY;
  
  if (!apiKey) {
    statusMessage.textContent = "Please enter your Comput3 API key";
    statusMessage.className = "error";
    return;
  }
  
  if (!imageFile || !audioFile) {
    statusMessage.textContent = "Please upload both image and audio files";
    statusMessage.className = "error";
    return;
  }
  
  if (!currentInstance) {
    statusMessage.textContent = "No ComfyUI instance connected. Please launch an instance first.";
    statusMessage.className = "error";
    return;
  }
  
  // Reset cancellation flag
  generationCancelled = false;
  
  // Hide previous results if any
  resultContainer.hidden = true;
  
  // Reset and show progress container
  progressContainer.hidden = false;
  updateProgress(5, "Preparing files...", true);
  
  // Disable the process button and show loading status
  processButton.disabled = true;
  statusMessage.textContent = "Processing...";
  statusMessage.className = "loading";
  
  try {
    // Get ComfyUI endpoint
    const comfyuiUrl = buildComfyUIUrl(currentInstance.node);
    
    // Check if ComfyUI is ready by checking system_stats
    updateProgress(10, "Verifying ComfyUI is ready...", true);
    try {
      const statsResponse = await fetch(`${comfyuiUrl}/system_stats`, {
        headers: {
          'X-C3-API-KEY': apiKey
        },
        timeout: 10000
      });
      
      if (!statsResponse.ok) {
        throw new Error(`ComfyUI not ready: ${statsResponse.statusText}`);
      }
      
      console.log("ComfyUI is ready");
    } catch (error) {
      console.warn("Failed to verify ComfyUI readiness:", error);
      // Continue anyway, as the instance might still work
    }
    
    // Upload image file
    updateProgress(20, "Uploading image...", true);
    const imageFormData = new FormData();
    imageFormData.append('image', imageFile, imageFile.name);
    
    const imageUploadResponse = await fetch(`${comfyuiUrl}/upload/image`, {
      method: 'POST',
      headers: {
        'X-C3-API-KEY': apiKey
      },
      body: imageFormData
    });
    
    if (!imageUploadResponse.ok) {
      throw new Error(`Failed to upload image: ${imageUploadResponse.statusText}`);
    }
    
    const imageData = await imageUploadResponse.json();
    console.log("Image uploaded:", imageData);
    const uploadedImageName = imageData.name;
    
    // Upload audio file
    updateProgress(30, "Uploading audio...", true);
    // According to the Python code, we need to use /upload/image endpoint for audio too
    const audioFormData = new FormData();
    audioFormData.append('image', audioFile, audioFile.name);
    
    const audioUploadResponse = await fetch(`${comfyuiUrl}/upload/image`, {
      method: 'POST',
      headers: {
        'X-C3-API-KEY': apiKey
      },
      body: audioFormData
    });
    
    if (!audioUploadResponse.ok) {
      throw new Error(`Failed to upload audio: ${audioUploadResponse.statusText}`);
    }
    
    const audioData = await audioUploadResponse.json();
    console.log("Audio uploaded:", audioData);
    const uploadedAudioName = audioData.name;
    
    // Get image dimensions for resizing
    updateProgress(40, "Processing image dimensions...", true);
    let width = 512;
    let height = 512;
    let audioDuration = 10;
    
    try {
      // Create a temporary image to get dimensions
      const img = new Image();
      img.src = URL.createObjectURL(imageFile);
      await new Promise((resolve, reject) => {
        img.onload = () => {
          // Get original dimensions
          const origWidth = img.width;
          const origHeight = img.height;
          console.log(`Original image dimensions: ${origWidth}x${origHeight}`);
          
          // Calculate scale to maintain aspect ratio within 1280x720
          const widthScale = 1280 / origWidth;
          const heightScale = 720 / origHeight;
          const scale = Math.min(widthScale, heightScale);
          
          // Apply scale to get final dimensions
          width = Math.round(origWidth * scale);
          height = Math.round(origHeight * scale);
          console.log(`Scaled dimensions: ${width}x${height}`);
          
          URL.revokeObjectURL(img.src);
          resolve();
        };
        img.onerror = () => {
          reject(new Error("Failed to load image to calculate dimensions"));
        };
      });
      
      // Try to get audio duration if possible
      if (audioFile.type.startsWith('audio/')) {
        const audio = document.createElement('audio');
        audio.src = URL.createObjectURL(audioFile);
        await new Promise((resolve) => {
          audio.addEventListener('loadedmetadata', () => {
            audioDuration = Math.ceil(audio.duration) + 3; // Round up and add safety margin
            console.log(`Audio duration: ${audio.duration}s → ${audioDuration}s (rounded up + 3s safety margin)`);
            URL.revokeObjectURL(audio.src);
            resolve();
          });
          audio.addEventListener('error', () => {
            console.warn("Failed to get audio duration, using default");
            resolve();
          });
        });
      }
    } catch (error) {
      console.warn("Error calculating dimensions or duration, using defaults:", error);
    }
    
    // Create a workflow with our updated values
    updateProgress(50, "Preparing workflow...", true);
    const workflow = JSON.parse(JSON.stringify(DEFAULT_WORKFLOW)); // Deep clone
    
    // Update workflow with our values
    workflow["18"].inputs.image = uploadedImageName;
    workflow["26"].inputs.audio = uploadedAudioName;
    workflow["33"].inputs.duration = audioDuration;
    workflow["58"].inputs.width = width;
    workflow["58"].inputs.height = height;
    
    // Generate a unique client ID
    const clientId = generateUUID();
    
    // Queue the workflow
    updateProgress(60, "Queueing workflow...", true);
    const promptPayload = {
      prompt: workflow,
      client_id: clientId
    };
    
    console.log("Sending workflow:", promptPayload);
    
    const promptResponse = await fetch(`${comfyuiUrl}/prompt`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-C3-API-KEY': apiKey
      },
      body: JSON.stringify(promptPayload)
    });
    
    if (!promptResponse.ok) {
      throw new Error(`Failed to queue workflow: ${promptResponse.statusText}`);
    }
    
    const promptData = await promptResponse.json();
    promptId = promptData.prompt_id;
    console.log("Workflow queued with ID:", promptId);
    
    // Poll for job completion
    updateProgress(70, "Processing video (this may take a while)...", true);
    
    let isComplete = false;
    let outputFilename = null;
    let pollCount = 0;
    
    while (!isComplete && !generationCancelled) {
      pollCount++;
      
      // Check workflow history
      const historyResponse = await fetch(`${comfyuiUrl}/history/${promptId}`, {
        headers: {
          'X-C3-API-KEY': apiKey
        }
      });
      
      if (historyResponse.ok) {
        const historyData = await historyResponse.json();
        
        // If the response is an empty object, the job is still running
        if (Object.keys(historyData).length === 0) {
          console.log("Job still running...");
          updateProgress(75 + (pollCount % 5), `Processing video (${pollCount} checks)...`, true);
        } else {
          console.log("Got history response:", historyData);
          
          // Handle two possible response formats:
          // 1. Direct format: { outputs: {...}, status: {...} }
          // 2. Nested format: { [promptId]: { outputs: {...}, status: {...} } }
          
          let jobData = historyData;
          
          // Check if it's the nested format with promptId as key
          if (historyData[promptId]) {
            jobData = historyData[promptId];
          }
          
          // Check for errors
          if (jobData.status && jobData.status.status_str === "error") {
            let errorMessage = "Workflow execution failed";
            
            // Try to get detailed error info
            if (jobData.status.messages) {
              for (const msg of jobData.status.messages) {
                if (msg[0] === "execution_error" && msg.length > 1) {
                  const errorDetails = msg[1];
                  errorMessage = `Error in node ${errorDetails.node_id} (${errorDetails.node_type}): ${errorDetails.exception_message}`;
                  break;
                }
              }
            }
            
            throw new Error(errorMessage);
          }
          
          // Check for success status
          const isSuccess = jobData.status && 
                           (jobData.status.status_str === "success" || 
                            jobData.status.completed === true);
          
          // Check for completion - Look for node 13 output (VHS_VideoCombine)
          if (jobData.outputs && jobData.outputs["13"]) {
            const node13Output = jobData.outputs["13"];
            
            // Check for output in 'gifs' field (primary location for VHS_VideoCombine)
            if (node13Output.gifs && node13Output.gifs.length > 0) {
              isComplete = true;
              outputFilename = node13Output.gifs[0].filename;
              console.log("Found output video in 'gifs':", outputFilename);
            }
            // Or check for output in 'videos' field (alternative location)
            else if (node13Output.videos && node13Output.videos.length > 0) {
              isComplete = true;
              outputFilename = node13Output.videos[0].filename;
              console.log("Found output video in 'videos':", outputFilename);
            }
          }
          
          // If we have a success status but couldn't find the output file,
          // try to parse the detailed outputs structure
          if (isSuccess && !outputFilename && jobData.outputs) {
            console.log("Job completed successfully but couldn't find output file directly, checking outputs structure");
            
            // Try to find any MP4 file in the outputs
            const findMp4 = (obj) => {
              if (!obj) return null;
              
              // If it's an object with a filename ending in .mp4
              if (obj.filename && obj.filename.endsWith('.mp4')) {
                return obj.filename;
              }
              
              // Recursively check all object properties
              if (typeof obj === 'object') {
                for (const key in obj) {
                  const result = findMp4(obj[key]);
                  if (result) return result;
                }
              }
              
              return null;
            };
            
            outputFilename = findMp4(jobData.outputs);
            if (outputFilename) {
              isComplete = true;
              console.log("Found MP4 file through deep search:", outputFilename);
            }
          }
        }
      } else {
        console.warn(`Failed to check history: ${historyResponse.status} ${historyResponse.statusText}`);
      }
      
      if (isComplete) break;
      
      // Wait before checking again
      await new Promise(resolve => setTimeout(resolve, POLLING_INTERVAL));
    }
    
    // Check if cancelled
    if (generationCancelled) {
      throw new Error("Generation was cancelled");
    }
    
    // If we have a result file, download it
    if (outputFilename) {
      updateProgress(95, "Downloading result video...", true);
      
      // Form the view URL
      const viewUrl = `${comfyuiUrl}/view?filename=${encodeURIComponent(outputFilename)}`;
      
      // Display the video in the UI
      displayVideo(viewUrl, outputFilename, apiKey);
      
      // Show success message
      updateProgress(100, "Video generated successfully!", false);
      statusMessage.textContent = "Video generated successfully! Click the download button if it doesn't download automatically.";
      statusMessage.className = "success";
      
      // Hide progress bar after a moment
      setTimeout(() => {
        progressContainer.hidden = true;
      }, 2000);
    } else {
      throw new Error("No output file was found after workflow completed");
    }
    
  } catch (error) {
    console.error('Error:', error);
    statusMessage.textContent = `Error: ${error.message}`;
    statusMessage.className = "error";
    progressContainer.hidden = true;
  } finally {
    processButton.disabled = false;
  }
}

// Display the downloaded video in the UI
function displayVideo(url, filename, apiKey) {
  // Set up the video source with proper access headers
  // For the video tag, we need to manually fetch the video and create a blob URL
  fetchVideoWithHeaders(url, apiKey)
    .then(blobUrl => {
      // Once we have the blob URL, set it as the video source
      resultVideo.src = blobUrl;
      resultVideo.muted = true;
      
      // Try to autoplay when loaded
      resultVideo.onloadeddata = () => {
        resultVideo.play().catch(err => console.log('Autoplay prevented:', err));
      };
      
      // Add event listener to clean up blob URL when no longer needed
      resultVideo.onended = () => {
        // Keep the URL for a while in case user wants to replay
        setTimeout(() => {
          URL.revokeObjectURL(blobUrl);
        }, 60000); // Clean up after 1 minute
      };
    })
    .catch(error => {
      console.error("Error loading video:", error);
      resultVideo.src = "";
      resultVideo.style.display = "none";
      
      // Show error message in place of video
      const errorMsg = document.createElement('div');
      errorMsg.className = 'video-error';
      errorMsg.textContent = `Error loading video. Please use the download button instead.`;
      if (!document.querySelector('.video-error')) {
        resultVideo.insertAdjacentElement('afterend', errorMsg);
      }
    });
  
  // Update the download link - this will require user to click with proper headers
  downloadLink.href = url;
  downloadLink.download = filename;
  downloadLink.textContent = `Download ${filename}`;
  // Add event listener to handle download with headers
  downloadLink.removeEventListener('click', handleDownloadClick);
  downloadLink.addEventListener('click', handleDownloadClick);
  downloadLink.setAttribute('data-url', url);
  downloadLink.setAttribute('data-filename', filename);
  downloadLink.setAttribute('data-api-key', apiKey);
  
  // Show filename in the UI
  const filenameElement = document.getElementById('filename-display');
  filenameElement.textContent = `📹 ${filename}`;
  
  // Make container visible and scroll to it
  resultContainer.hidden = false;
  resultContainer.scrollIntoView({ behavior: 'smooth' });
}

// Handle download link click with proper headers
function handleDownloadClick(event) {
  event.preventDefault();
  const url = this.getAttribute('data-url');
  const filename = this.getAttribute('data-filename');
  const apiKey = this.getAttribute('data-api-key');
  
  fetchVideoWithHeaders(url, apiKey)
    .then(blobUrl => {
      // Create a temporary link for downloading
      const tempLink = document.createElement('a');
      tempLink.href = blobUrl;
      tempLink.download = filename;
      document.body.appendChild(tempLink);
      tempLink.click();
      document.body.removeChild(tempLink);
      
      // Clean up blob URL after download initiated
      setTimeout(() => {
        URL.revokeObjectURL(blobUrl);
      }, 5000);
    })
    .catch(error => {
      console.error("Error downloading file:", error);
      alert(`Error downloading file: ${error.message}`);
    });
}

// Fetch video with proper headers and return a blob URL
async function fetchVideoWithHeaders(url, apiKey) {
  // Add CORS proxy if needed
  let fetchUrl = url;
  if (import.meta.env.DEV && CORS_PROXY && !url.includes(CORS_PROXY)) {
    fetchUrl = `${CORS_PROXY}/${url}`;
  }
  
  // Fetch with proper headers
  const response = await fetch(fetchUrl, {
    headers: {
      'X-C3-API-KEY': apiKey,
      'Origin': window.location.origin,
      'X-Requested-With': 'XMLHttpRequest'
    }
  });
  
  if (!response.ok) {
    throw new Error(`Failed to fetch video: ${response.status} ${response.statusText}`);
  }
  
  const blob = await response.blob();
  return URL.createObjectURL(blob);
}

// Event listeners
imageDropzone.addEventListener('click', () => {
  if (!imageFile) imageInput.click();
});

audioDropzone.addEventListener('click', () => {
  if (!audioFile) audioInput.click();
});

imageInput.addEventListener('change', (e) => {
  if (e.target.files.length > 0) {
    handleImageSelect(e.target.files[0]);
  }
});

audioInput.addEventListener('change', (e) => {
  if (e.target.files.length > 0) {
    handleAudioSelect(e.target.files[0]);
  }
});

removeImageBtn.addEventListener('click', (e) => {
  e.stopPropagation();
  imageFile = null;
  imagePreviewContent.src = '';
  imagePreview.hidden = true;
  imageDropzone.querySelector('.dropzone-content').hidden = false;
  updateProcessButtonState();
});

removeAudioBtn.addEventListener('click', (e) => {
  e.stopPropagation();
  audioFile = null;
  audioPreviewContent.src = '';
  audioPreview.hidden = true;
  audioDropzone.querySelector('.dropzone-content').hidden = false;
  updateProcessButtonState();
});

processButton.addEventListener('click', processFiles);
checkInstanceButton.addEventListener('click', checkForRunningInstance);
launchInstanceButton.addEventListener('click', launchNewInstance);
stopInstanceButton.addEventListener('click', stopInstance);

// Drag and drop handling
function setupDragDrop(dropzone, handler) {
  ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
    dropzone.addEventListener(eventName, preventDefaults, false);
  });
  
  function preventDefaults(e) {
    e.preventDefault();
    e.stopPropagation();
  }
  
  ['dragenter', 'dragover'].forEach(eventName => {
    dropzone.addEventListener(eventName, highlight, false);
  });
  
  ['dragleave', 'drop'].forEach(eventName => {
    dropzone.addEventListener(eventName, unhighlight, false);
  });
  
  function highlight() {
    dropzone.classList.add('highlight');
  }
  
  function unhighlight() {
    dropzone.classList.remove('highlight');
  }
  
  dropzone.addEventListener('drop', (e) => {
    const dt = e.dataTransfer;
    const file = dt.files[0];
    handler(file);
  }, false);
}

setupDragDrop(imageDropzone, handleImageSelect);
setupDragDrop(audioDropzone, handleAudioSelect);
