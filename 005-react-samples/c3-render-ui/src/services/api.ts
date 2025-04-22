import axios from 'axios';

// Determine if we're using a proxy (development mode)
const isUsingProxy = process.env.NODE_ENV === 'development';

// API base URL - for development with proxy, use relative URLs
// In production, use the absolute URL from environment variable
const API_BASE_URL = isUsingProxy ? '' : (process.env.REACT_APP_API_BASE_URL || 'http://localhost:5000');

// Get API key from environment variable or local storage
const getApiKey = (): string => {
  // First try to get from environment variable (for development)
  const envApiKey = process.env.REACT_APP_API_KEY;
  if (envApiKey) return envApiKey;
  
  // Then try to get from local storage (for production)
  const storageApiKey = localStorage.getItem('c3_render_api_key');
  return storageApiKey || '';
};

// Function to set API key
export const setApiKey = (apiKey: string): void => {
  localStorage.setItem('c3_render_api_key', apiKey);
  // Update the Authorization header in the Axios instance
  updateAuthHeader(apiKey);
};

// Function to clear API key
export const clearApiKey = (): void => {
  localStorage.removeItem('c3_render_api_key');
  // Remove the Authorization header from the Axios instance
  apiClient.defaults.headers.common['X-C3-RENDER-KEY'] = undefined;
  apiClient.defaults.headers.common['Authorization'] = undefined;
};

// Create axios instance with default configuration
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Function to update Authorization header
const updateAuthHeader = (apiKey: string): void => {
  if (apiKey) {
    apiClient.defaults.headers.common['X-C3-RENDER-KEY'] = apiKey;
    // Also set Bearer token format as an alternative
    apiClient.defaults.headers.common['Authorization'] = `Bearer ${apiKey}`;
  }
};

// Initialize auth header with API key (if available)
updateAuthHeader(getApiKey());

// Type definitions for API requests and responses
export interface CSMRequest {
  text?: string;
  monologue?: string[];
  voice?: string;
  reference_audio_url?: string;
  reference_text?: string;
  temperature?: number;
  topk?: number;
  max_audio_length?: number;
  pause_duration?: number;
  notify_url?: string;
  max_time?: number;
  complete_in?: number;
}

export interface WhisperRequest {
  audio_url: string;
  model?: string;
  task?: string;
  language?: string;
  notify_url?: string;
  max_time?: number;
  complete_in?: number;
}

export interface PortraitRequest {
  image_url: string;
  audio_url: string;
  notify_url?: string;
  max_time?: number;
  complete_in?: number;
}

export interface AnalyzeRequest {
  image_url: string;
  notify_url?: string;
  max_time?: number;
  complete_in?: number;
}

export interface JobResponse {
  id: string;
  status: string;
}

export interface JobStatusResponse {
  status: string;
}

export interface JobResultResponse {
  result_url?: string;
  text?: string;
}

// API functions for different operations
const api = {
  // CSM (Text-to-Speech)
  createCSM: async (data: CSMRequest): Promise<JobResponse> => {
    const response = await apiClient.post('/csm', data);
    return response.data;
  },

  // Whisper (Speech-to-Text)
  createWhisper: async (data: WhisperRequest): Promise<JobResponse> => {
    const response = await apiClient.post('/whisper', data);
    return response.data;
  },

  // Portrait (Video Generation)
  createPortrait: async (data: PortraitRequest): Promise<JobResponse> => {
    const response = await apiClient.post('/portrait', data);
    return response.data;
  },

  // Image Analysis
  analyzeImage: async (data: AnalyzeRequest): Promise<JobResponse> => {
    const response = await apiClient.post('/analyze', data);
    return response.data;
  },

  // Check job status
  getJobStatus: async (id: string): Promise<JobStatusResponse> => {
    const response = await apiClient.get(`/status/${id}`);
    return response.data;
  },

  // Get job result
  getJobResult: async (id: string): Promise<JobResultResponse> => {
    const response = await apiClient.get(`/result/${id}`);
    return response.data;
  }
};

export default api; 