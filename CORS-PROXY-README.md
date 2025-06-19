# ComfyUI CORS Proxy Server

This proxy server solves CORS issues when accessing ComfyUI instances from web applications deployed on different domains.

## Problem

ComfyUI instances don't include CORS headers, so web applications hosted on domains like `examples.comput3.ai` can't directly access ComfyUI instances at `ui-*.comput3.ai` due to browser CORS policy.

## Solution

A simple Express.js proxy server that:
1. Accepts requests from the web application
2. Forwards them to ComfyUI instances 
3. Adds proper CORS headers to responses
4. Handles authentication headers properly

## Setup

### 1. Install Dependencies

```bash
# Copy the proxy files to a new directory
mkdir comfyui-cors-proxy
cd comfyui-cors-proxy

# Copy the files
cp ../proxy-server.js .
cp ../proxy-package.json package.json

# Install dependencies
npm install
```

### 2. Run Locally

```bash
# Start the proxy server
npm start

# Or for development with auto-restart
npm run dev
```

The server will run on port 8081 by default.

### 3. Test the Proxy

```bash
# Health check
curl http://localhost:8081/health

# Test ComfyUI proxy (replace with actual node URL)
curl http://localhost:8081/comfyui/ui-truly-sadly-close-gpu.comput3.ai/queue \
  -H "X-C3-API-Key: your-api-key-here"
```

## Deployment Options

### Option 1: Deploy to Vercel/Netlify Functions

The proxy server can be adapted to work as serverless functions.

### Option 2: Deploy to Railway/Render/Heroku

```bash
# Set environment variables
export PORT=8081

# Deploy using your preferred platform
```

### Option 3: Deploy to your own VPS

```bash
# Use PM2 for production
npm install -g pm2
pm2 start proxy-server.js --name comfyui-proxy
pm2 startup
pm2 save
```

## Configuration

### Environment Variables

- `PORT`: Server port (default: 8081)
- Add more as needed for your deployment

### Update the Web Application

In your `.env` file for the media generator:

```bash
# For production deployment
VITE_COMFYUI_PROXY=https://your-proxy-domain.com

# For local development
VITE_COMFYUI_PROXY=http://localhost:8081
```

## URL Structure

The proxy expects URLs in this format:
```
https://your-proxy-domain.com/comfyui/{node-url}/{comfyui-path}
```

Examples:
- `https://proxy.com/comfyui/ui-example.comput3.ai/queue`
- `https://proxy.com/comfyui/ui-example.comput3.ai/prompt`
- `https://proxy.com/comfyui/ui-example.comput3.ai/api/view?filename=image.png`

## Security Notes

1. The proxy forwards authentication headers to ComfyUI
2. CORS is configured for specific origins (update as needed)
3. Consider rate limiting for production use
4. Monitor logs for potential abuse

## Alternative Solutions

If you can't deploy a proxy server, consider:

1. **Netlify Redirects**: Add CORS proxy rules to `_redirects`
2. **Browser Extension**: CORS Unblock for development
3. **ComfyUI Configuration**: If you control the ComfyUI instances, add CORS headers

## Troubleshooting

### Common Issues

1. **404 Errors**: Check the node URL format
2. **CORS Still Blocked**: Verify proxy origin configuration
3. **Authentication Fails**: Ensure API key headers are forwarded
4. **Timeout**: Check ComfyUI instance availability

### Debug Logs

The proxy server logs all requests:
```bash
npm start
# Watch the console for request/response logs
``` 