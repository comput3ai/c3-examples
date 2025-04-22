import axios from 'axios';

// API base URL - for development, use localhost
// In production, this would be the actual API endpoint
const API_BASE_URL = 'http://localhost:5000';

// Add your API key for production environments
const API_KEY = '';

// Create axios instance with default configuration
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
    // Only add API key in production
    ...(API_KEY ? { 'X-C3-RENDER-KEY': API_KEY } : {})
  },
});

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