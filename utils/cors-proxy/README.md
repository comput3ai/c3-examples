# 🌐 CORS Proxy for Local Development

A simple CORS proxy server to bypass CORS restrictions during local development with the C3 Examples.

## 🎯 What is this?

When developing locally, web browsers enforce CORS (Cross-Origin Resource Sharing) policies that can block API requests to external domains like `api.comput3.ai`. This proxy server acts as an intermediary that:

1. **Receives your API requests** from localhost
2. **Forwards them** to the actual API server
3. **Adds proper CORS headers** to the response
4. **Returns the data** to your application

## 🚀 Quick Start

### 1. Install Dependencies
```bash
cd utils/cors-proxy
npm install
```

### 2. Start the Proxy
```bash
# Option 1: Using npm script
npm start

# Option 2: Direct node command
node server.js
```

The proxy will start on `http://localhost:8080` by default.

### 3. Configure Your Application
Add the proxy URL to your `.env` file in the `/web` directory:

```bash
# In web/.env
VITE_CORS_PROXY=http://localhost:8080
```

## ⚙️ Configuration

### Environment Variables

- **`HOST`** (default: `0.0.0.0`): The host to bind the server to
- **`PORT`** (default: `8080`): The port to run the proxy on

### Custom Port Example
```bash
PORT=3000 node server.js
```

Then update your `.env`:
```bash
VITE_CORS_PROXY=http://localhost:3000
```

## 🔧 How It Works

The proxy is built using [cors-anywhere](https://github.com/Rob--W/cors-anywhere) and works by:

1. **Accepting all origins** (`originWhitelist: []`)
2. **Requiring basic headers** for security
3. **Removing sensitive cookies** before forwarding
4. **Adding CORS headers** to all responses

### Example Request Flow
```
Your App (localhost:5173)
    ↓ fetch('http://localhost:8080/https://api.comput3.ai/api/v0/workloads')
CORS Proxy (localhost:8080)
    ↓ forwards to https://api.comput3.ai/api/v0/workloads
C3 API Server
    ↓ response
CORS Proxy
    ↓ response + CORS headers
Your App ✅
```

## 🛡️ Security Notes

- **Only for development**: Never use this in production
- **No authentication**: The proxy itself doesn't handle API keys (they're passed through)
- **Open proxy**: Allows requests to any URL (fine for local development)

## 🎯 When Do You Need This?

### ✅ You NEED the proxy when:
- Developing locally with `npm run dev`
- Getting CORS errors in browser console
- API requests to `api.comput3.ai` are blocked

### ❌ You DON'T need the proxy when:
- Running on `examples.comput3.ai` (CORS already configured)
- Using the built production version
- Working with the load balancer API (`app.comput3.ai` - has open CORS)

## 🚀 Usage in Different Examples

### C3 Media Generator
The app automatically detects if `VITE_CORS_PROXY` is set and uses it for API calls:

```javascript
// Automatically handled in comput3.ts
const response = await fetch(
  customCorsProxy 
    ? `${customCorsProxy}/${apiUrl}` 
    : apiUrl
)
```

### Other Examples
Any example that makes direct API calls to `api.comput3.ai` can benefit from this proxy.

## 📝 Example `.env` Configuration

```bash
# In web/.env file

# CORS proxy for local development (optional)
# Only needed if you encounter CORS errors with api.comput3.ai
VITE_CORS_PROXY=http://localhost:8080

# Comput3 API endpoints (optional - defaults are usually fine)
VITE_LB_URL=https://app.comput3.ai/tags/all/v1
VITE_API_URL=https://api.comput3.ai/api/v0
```

## 🐛 Troubleshooting

### Proxy won't start
```bash
# Check if port is already in use
lsof -i :8080

# Use a different port
PORT=3001 node server.js
```

### Still getting CORS errors
1. Verify proxy is running: `curl http://localhost:8080`
2. Check `.env` file is in `/web` directory
3. Restart your development server after changing `.env`
4. Verify the proxy URL in your environment: `console.log(import.meta.env.VITE_CORS_PROXY)`

### API calls still failing
- The proxy forwards requests, but API authentication still matters
- Make sure your C3 API key is valid
- Check the actual API response in proxy logs

## 📖 Related Documentation

- [cors-anywhere Documentation](https://github.com/Rob--W/cors-anywhere)
- [MDN CORS Guide](https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS)
- [Main Web Examples README](../README.md)

---

**💡 Pro Tip**: The proxy is only needed for direct API calls to `api.comput3.ai`. The load balancer endpoint (`app.comput3.ai`) already has CORS enabled and doesn't need a proxy! 