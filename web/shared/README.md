# Shared Web Resources

This directory contains shared resources for all web examples.

## 📁 Contents

### `config.js`
Centralized configuration for accessing Comput3 APIs:

```javascript
import { config } from '../shared/config.js';

// Use the config
const response = await fetch(config.buildUrl(`${config.apiUrl}/workloads`), {
  headers: config.getHeaders(userApiKey)
});
```

Features:
- Automatic CORS proxy handling in development
- Centralized API endpoints
- Helper functions for common tasks

## 🔧 Usage in Examples

1. Import the shared config:
```javascript
import { config } from '../../shared/config.js';
```

2. Use the buildUrl helper for API calls:
```javascript
// In development: adds CORS proxy prefix
// In production: returns URL as-is
const url = config.buildUrl(`${config.apiUrl}/endpoint`);
```

3. API key management:
```javascript
// API keys are managed client-side
const apiKey = localStorage.getItem('c3-api-key');
const headers = config.getHeaders(apiKey);
```

## 📝 Environment Variables

All examples share these environment variables:
- `VITE_API_URL`: Comput3 API base URL
- `VITE_LB_URL`: Comput3 load balancer URL  
- `VITE_CORS_PROXY`: CORS proxy for development (not used in production)

These are set in:
- Development: `web/.env` (copy from `.env.example`)
- Production: `web/netlify.toml`