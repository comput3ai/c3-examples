# Web Examples from C3-Examples

This directory contains Vite React landing page examples showcasing Comput3's AI capabilities through interactive web applications.

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
Copy the example environment file:
```bash
cp .env.example .env
```

Environment variables:
- `VITE_CORS_PROXY`: CORS proxy for local development (e.g., `http://localhost:8080`)
- `VITE_LB_URL`: Comput3 load balancer URL
- `VITE_API_URL`: Comput3 API base URL

**Note**: The C3 API key will be managed client-side for security, not through environment variables.

### Production Setup
Production environment variables are configured in `netlify.toml`. No CORS proxy is needed in production as the APIs support CORS for the deployed domain.

## 🚀 Development

### Working on the Index Page
```bash
cd web
npm install
npm run dev
```

### Working on Individual Examples
```bash
cd web/example-name
npm install
npm run dev
```

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
2. Build each example project
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