# CORS Proxy Setup Guide

## Why Do You Need a CORS Proxy?

ComfyUI instances don't typically have CORS (Cross-Origin Resource Sharing) headers configured, which means browsers block direct requests from web applications. A CORS proxy acts as an intermediary that adds the necessary headers.

## Centralized Netlify Proxy (Recommended)

**New in v1.3.1**: AI Media Studio now includes a centralized CORS proxy configuration in the main `netlify.toml` file.

### **Automatic Configuration**
- **Environment Variable**: `VITE_COMFYUI_PROXY=netlify` (set in main netlify.toml)
- **Proxy Routes**: `/api/comfyui/*` automatically handles CORS for all ComfyUI instances
- **HTTPS Support**: `/api/comfyui/https/*` for explicit HTTPS reconstruction
- **No Setup Required**: Works automatically when deployed to Netlify

### **How It Works**
```
ComfyUI Request: https://your-comfyui-instance.com/prompt
↓
Netlify Proxy: /api/comfyui/your-comfyui-instance.com/prompt
↓
Actual Request: https://your-comfyui-instance.com/prompt (with CORS headers)
```

### **Benefits**
- ✅ **No external dependencies** - uses Netlify's built-in redirects
- ✅ **Automatic scaling** - handles traffic spikes seamlessly  
- ✅ **Zero configuration** - works out of the box in production
- ✅ **Reliable uptime** - backed by Netlify's infrastructure
- ✅ **Cost effective** - no additional proxy service fees

## Quick Solutions

### 1. Public Proxies (Easy Setup)

**CORS Anywhere (Recommended for testing):**
- URL: `https://cors-anywhere.herokuapp.com`
- Free but has rate limits
- May require requesting access

**AllOrigins:**
- URL: `https://api.allorigins.win/raw?url=`
- Alternative public proxy
- Different URL format

### 2. Deploy Your Own (Recommended for Production)

#### Option A: Deploy to Railway

1. **Fork the CORS Anywhere repository:**
   ```bash
   git clone https://github.com/Rob--W/cors-anywhere.git
   cd cors-anywhere
   ```

2. **Create a Railway account** at [railway.app](https://railway.app)

3. **Deploy to Railway:**
   - Connect your GitHub account
   - Import the cors-anywhere repository
   - Deploy with default settings
   - Note your Railway URL (e.g., `https://your-app.railway.app`)

#### Option B: Deploy to Render

1. **Create a Render account** at [render.com](https://render.com)

2. **Create a new Web Service:**
   - Connect GitHub and select cors-anywhere
   - Set build command: `npm install`
   - Set start command: `node server.js`
   - Deploy

#### Option C: Deploy to Vercel

1. **Create vercel.json:**
   ```json
   {
     "functions": {
       "api/proxy.js": {
         "maxDuration": 30
       }
     }
   }
   ```

2. **Create api/proxy.js:**
   ```javascript
   const corsAnywhere = require('cors-anywhere');
   
   const host = '0.0.0.0';
   const port = process.env.PORT || 8080;
   
   corsAnywhere.createServer({
     originWhitelist: [],
     requireHeader: ['origin', 'x-requested-with'],
     removeHeaders: ['cookie', 'cookie2']
   }).listen(port, host, function() {
     console.log('Running CORS Anywhere on ' + host + ':' + port);
   });
   ```

3. **Deploy to Vercel:**
   ```bash
   npm install -g vercel
   vercel --prod
   ```

## Configuration in AI Media Studio

1. **Access Setup:** Go to the first step of AI Media Studio
2. **CORS Proxy Section:** Select "Custom Proxy"
3. **Enter URL:** Input your deployed proxy URL
4. **Test:** Validate your API key to test the connection

## Environment Variables (Alternative)

You can also set CORS proxy via environment variables:

```bash
# For development
VITE_CORS_PROXY=http://localhost:8080

# For production deployment
VITE_COMFYUI_PROXY=https://your-cors-proxy.com
```

## Security Considerations

- **Public proxies** may log requests and have rate limits
- **Own proxy** gives you full control and better reliability
- **Whitelist origins** in your proxy configuration for security
- **Monitor usage** to prevent abuse

## Troubleshooting

### Proxy not working?
1. Check if the proxy URL is accessible directly
2. Verify CORS headers are being added
3. Test with a simple GET request first

### 404 errors?
1. Ensure the proxy is deployed and running
2. Check the proxy logs for errors
3. Verify the ComfyUI instance URL is correct

### Rate limiting?
1. Deploy your own proxy instance
2. Use multiple proxy instances with load balancing
3. Implement proper retry logic in your application

## Example Proxy URLs

```
✅ Correct format:
https://cors-anywhere.herokuapp.com
https://your-proxy.railway.app
https://api.allorigins.win/raw?url=

❌ Incorrect format:
https://cors-anywhere.herokuapp.com/
http://unsecured-proxy.com
```

## Need Help?

- Check the [CORS Anywhere documentation](https://github.com/Rob--W/cors-anywhere)
- Review browser developer tools for specific error messages
- Test your proxy with curl or Postman first 