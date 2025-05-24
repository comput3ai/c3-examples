// Shared configuration for all web examples
// This file provides centralized access to environment variables

export const config = {
  // API endpoints
  apiUrl: import.meta.env.VITE_API_URL || 'https://api.comput3.ai/api/v0',
  lbUrl: import.meta.env.VITE_LB_URL || 'https://app.comput3.ai/tags/all/v1',
  
  // CORS proxy - only used in development
  corsProxy: import.meta.env.VITE_CORS_PROXY || '',
  
  // Helper to build URLs with CORS proxy in development
  buildUrl: (url) => {
    if (import.meta.env.DEV && config.corsProxy) {
      return `${config.corsProxy}/${url}`;
    }
    return url;
  },
  
  // Check if we're in development mode
  isDev: import.meta.env.DEV,
  
  // Helper to get API headers
  getHeaders: (apiKey) => {
    const headers = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };
    
    if (apiKey) {
      headers['x-c3-api-key'] = apiKey;
    }
    
    return headers;
  }
};

export default config;