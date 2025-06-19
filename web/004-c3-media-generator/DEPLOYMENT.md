# AI Media Studio - Deployment Guide

## 🚀 Local Development

### Quick Start
```bash
# Navigate to the app directory
cd web/004-c3-media-generator

# Run the startup script
./start.sh

# OR manually
npm install
npm run dev
```

### Environment Configuration
Copy `.env.example` to `.env` and customize if needed:

```bash
# Development Mode (forces dev mode even on non-localhost)
VITE_FORCE_DEV_MODE=false

# Custom CORS Proxy (for development only)
VITE_CORS_PROXY=

# Example: Use a custom CORS proxy
# VITE_CORS_PROXY=https://your-cors-proxy.com
```

## 🌐 Production Deployment

### Netlify (Recommended)

The app is optimized for Netlify deployment with automatic CORS proxy handling.

**Setup:**
1. Fork the repository
2. Connect to Netlify
3. Configure build settings:
   - **Base directory**: `web`
   - **Build command**: `npm run build-all`
   - **Publish directory**: `dist`

**Features:**
- ✅ Automatic CORS proxy for ComfyUI instances
- ✅ Zero configuration required
- ✅ Environment variable management
- ✅ Custom redirects for SPA routing

### Other Hosting Providers

For deployment on other platforms:

1. **Build the app:**
   ```bash
   npm run build
   ```

2. **Configure CORS handling:**
   - Set up a CORS proxy service
   - Configure `VITE_CORS_PROXY` environment variable
   - Or ensure your hosting platform supports custom redirects

3. **SPA Routing:**
   Configure your hosting to redirect all routes to `index.html`

## 🔧 Configuration Details

### Network Handling

The app automatically detects the deployment environment:

- **Development**: Direct connection to APIs (localhost/127.0.0.1)
- **Production**: Uses appropriate proxy configuration

### CORS Proxy Routes (Netlify)

The following routes are automatically configured in `netlify.toml`:

```toml
# ComfyUI proxy with HTTPS support
/api/comfyui/https/* → https://*

# General ComfyUI proxy
/api/comfyui/* → *

# C3 API proxy
/api/comput3/* → https://api.comput3.ai/api/v0/*
```

### Security Headers

Production deployments include security headers:
- X-Frame-Options: DENY
- X-XSS-Protection: 1; mode=block
- X-Content-Type-Options: nosniff
- Referrer-Policy: strict-origin-when-cross-origin

## 🐛 Troubleshooting

### Common Issues

1. **CORS errors in development:**
   - Configure a custom CORS proxy in `.env`
   - Use the setup UI to configure proxy settings

2. **API connection failures:**
   - Verify your C3 API key is correct
   - Check network connectivity
   - Ensure ComfyUI instances are accessible

3. **Build failures:**
   - Run `npm run type-check` to verify TypeScript
   - Ensure all dependencies are installed
   - Check Node.js version (requires 18+)

### Debug Mode

Enable additional logging by setting:
```bash
VITE_FORCE_DEV_MODE=true
```

This forces development mode even in production environments for debugging.

## 📋 Version Information

- **Node.js**: 18.0.0 or higher
- **npm**: 8.0.0 or higher
- **Build Target**: ES2020
- **Framework**: React 18 + TypeScript + Vite 