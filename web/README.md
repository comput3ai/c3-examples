# Web Examples from C3-Examples

This directory contains Vite React landing page examples showcasing Comput3's AI capabilities through interactive web applications.

## 🚀 Quick Start

```bash
cd web
npm install
npm run install-all
npm run build-all
npm run serve
```

Then open http://localhost:4173 to see all examples.

**Note**: This setup doesn't support hot reloading. After making changes, run `npm run build-all` again.

## 🏗️ Structure

```
web/
├── index.html          # Main hub page listing all examples
├── package.json        # Root package with build scripts
├── vite.config.js      # Vite config for the main index
├── netlify.toml        # Netlify deployment configuration
├── scripts/            # Build and utility scripts
│   ├── build-all.js    # Builds all examples
│   └── install-all.js  # Installs dependencies for all examples
└── [example-name]/     # Individual Vite React projects
    ├── package.json
    ├── vite.config.js
    ├── index.html
    ├── src/
    └── dist/           # Built output
```

## 🔧 Environment Variables

### Development Setup
Create a `.env` file in the `/web` directory:
```bash
cd web
cp env.sample .env  # or create manually
```

Example `.env` content:
```env
# CORS proxy for local development (optional)
# Only needed if you encounter CORS errors
VITE_CORS_PROXY=http://localhost:3000

# Comput3 API endpoints (optional - defaults are usually fine)
VITE_LB_URL=https://app.comput3.ai/tags/all/v1
VITE_API_URL=https://api.comput3.ai/api/v0
```

Environment variables:
- `VITE_CORS_PROXY`: CORS proxy for local development (only set if needed)
- `VITE_LB_URL`: Comput3 load balancer URL (has open CORS, proxy not needed)
- `VITE_API_URL`: Comput3 API base URL (may need CORS proxy in development)

**Important Notes**:
- The C3 API key is managed client-side through cookies, not environment variables
- When using `npm run build-all`, environment variables from `/web/.env` are passed to all examples
- The load balancer (`app.comput3.ai`) has open CORS and doesn't need a proxy
- Direct API calls to `api.comput3.ai` may need a CORS proxy in local development

### Production Setup
Production environment variables are configured in `netlify.toml`. No CORS proxy is needed in production as the APIs support CORS for the deployed domain.

## 🚀 Development

### Recommended Development Workflow

For local development with all examples accessible from a single server:

```bash
cd web
npm install          # Install root dependencies
npm run install-all  # Install dependencies for all examples
npm run build-all    # Build all examples
npm run serve        # Serve built files on http://localhost:4173
```

This approach:
- ✅ Serves all examples from a single server with proper routing
- ✅ Respects environment variables from `/web/.env` across all examples
- ✅ Mimics production behavior on Netlify
- ⚠️ **Does NOT support hot module reloading** - you must rebuild after changes

To see changes during development:
1. Make your code changes
2. Run `npm run build-all` again
3. Refresh your browser

### Alternative: Individual Example Development

For faster development with hot reloading on a single example:

```bash
cd web/001-c3-chat-example
npm install
npm run dev  # Hot reloading enabled on http://localhost:5173
```

Note: When developing individually, environment variables from `/web/.env` won't be available unless you copy them to the example directory.

### Installing All Dependencies
```bash
cd web
npm run install-all
```

### Building Everything for Deployment
```bash
cd web
npm run build-all
```

This will:
1. Build the main index page
2. Build each example project with parent environment variables
3. Copy all built files to `web/dist/` with proper paths

## 📦 Adding a New Example

1. Create a new directory in `web/`:
```bash
cd web
npm create vite@latest my-example -- --template react
```

2. Update the example's `package.json`:
```json
{
  "name": "my-example",
  "displayName": "My Example Title",
  "description": "Description for the index page",
  ...
}
```

3. Configure the example's `vite.config.js`:
```javascript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: '/my-example/'  // Important for subdirectory deployment
})
```

4. Use the shared configuration for API calls:
```javascript
import { config } from '../../shared/config.js';

// Example API call
const fetchData = async (apiKey) => {
  const response = await fetch(
    config.buildUrl(`${config.apiUrl}/workloads`),
    { headers: config.getHeaders(apiKey) }
  );
  return response.json();
};
```

5. Build and test:
```bash
cd web
npm run build-all
npm run preview
```

## 🚀 Deployment

The project is configured for Netlify deployment:

1. Connect your repository to Netlify
2. Set build settings:
   - Base directory: `web`
   - Build command: `npm run build-all`
   - Publish directory: `web/dist`

The `netlify.toml` file handles:
- Build configuration
- Redirect rules for SPA routing
- Node version specification

## 🔧 Individual vs Unified Builds

### Individual Development
Each example can be developed independently:
```bash
cd web/my-example
npm run dev    # Development server
npm run build  # Build to my-example/dist/
```

### Unified Build
The root build script handles everything:
```bash
cd web
npm run build-all  # Builds index + all examples to web/dist/
```

## 📝 Notes

- Each example should be a complete, self-contained Vite React project
- Examples are automatically discovered by checking for `package.json` files
- The main index page is automatically updated with example metadata during build
- All examples are served from subdirectories (e.g., `/example-name/`)
- Make sure to set the `base` option in each example's `vite.config.js`