const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 8081;

// Enable CORS for all routes
app.use(cors({
  origin: ['http://localhost:3003', 'https://examples.comput3.ai', 'http://localhost:5173'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-C3-API-Key', 'X-C3-Cookie', 'Cookie']
}));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'ComfyUI Proxy Server is running' });
});

// Proxy middleware for ComfyUI instances
app.use('/comfyui/:nodeUrl/*', (req, res, next) => {
  const nodeUrl = req.params.nodeUrl;
  const path = req.params[0];
  
  // Reconstruct the full ComfyUI URL
  const targetUrl = `https://${nodeUrl}`;
  
  console.log(`Proxying request to: ${targetUrl}/${path}`);
  
  // Create proxy middleware
  const proxy = createProxyMiddleware({
    target: targetUrl,
    changeOrigin: true,
    pathRewrite: {
      [`^/comfyui/${nodeUrl}`]: ''
    },
    onProxyReq: (proxyReq, req, res) => {
      // Forward the API key headers
      if (req.headers['x-c3-api-key']) {
        proxyReq.setHeader('X-C3-API-Key', req.headers['x-c3-api-key']);
      }
      if (req.headers['x-c3-cookie']) {
        proxyReq.setHeader('X-C3-Cookie', req.headers['x-c3-cookie']);
      }
      if (req.headers['cookie']) {
        proxyReq.setHeader('Cookie', req.headers['cookie']);
      }
      
      console.log(`Forwarding headers: X-C3-API-Key=${req.headers['x-c3-api-key'] ? 'present' : 'missing'}`);
    },
    onProxyRes: (proxyRes, req, res) => {
      // Add CORS headers to the response
      proxyRes.headers['Access-Control-Allow-Origin'] = req.headers.origin || '*';
      proxyRes.headers['Access-Control-Allow-Credentials'] = 'true';
      proxyRes.headers['Access-Control-Allow-Methods'] = 'GET, POST, PUT, DELETE, OPTIONS';
      proxyRes.headers['Access-Control-Allow-Headers'] = 'Content-Type, Authorization, X-C3-API-Key, X-C3-Cookie, Cookie';
    },
    onError: (err, req, res) => {
      console.error('Proxy error:', err.message);
      res.status(500).json({ 
        error: 'Proxy error', 
        message: err.message,
        target: targetUrl
      });
    }
  });
  
  proxy(req, res, next);
});

// Catch-all for other routes
app.use('*', (req, res) => {
  res.status(404).json({ 
    error: 'Not found', 
    message: 'Use /comfyui/{node-url}/{path} to proxy to ComfyUI instances' 
  });
});

app.listen(PORT, () => {
  console.log(`🚀 ComfyUI Proxy Server running on port ${PORT}`);
  console.log(`📡 Health check: http://localhost:${PORT}/health`);
  console.log(`🔗 Proxy ComfyUI: http://localhost:${PORT}/comfyui/{node-url}/{path}`);
  console.log(`📋 Example: http://localhost:${PORT}/comfyui/ui-truly-sadly-close-gpu.comput3.ai/queue`);
}); 