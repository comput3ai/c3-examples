# 🛠️ Utilities

This directory contains utility tools and services to support development and deployment of the C3 Examples.

## 📂 Contents

### `cors-proxy/`
A CORS proxy server for local development when working with C3 APIs.

- **Purpose**: Bypass CORS restrictions during local development
- **Usage**: See [cors-proxy/README.md](cors-proxy/README.md) for detailed setup instructions
- **When needed**: Only for local development when encountering CORS errors with `api.comput3.ai`

## 🚀 Quick Start

### CORS Proxy
```bash
cd utils/cors-proxy
npm install
npm start
```

Then add to your `web/.env`:
```env
VITE_CORS_PROXY=http://localhost:8080
```

## 📁 Directory Structure

```
utils/
├── README.md           # This file
└── cors-proxy/         # CORS proxy for local development
    ├── README.md       # Detailed proxy documentation
    ├── package.json    # Node.js dependencies
    ├── server.js       # Proxy server implementation
    └── package-lock.json
```

## 🎯 Adding New Utilities

When adding new utility tools:

1. Create a new subdirectory in `utils/`
2. Include a comprehensive README.md
3. Update this main utils README
4. Consider whether it needs integration with the web examples

## 📖 Related Documentation

- [Web Examples README](../web/README.md)
- [CORS Proxy Documentation](cors-proxy/README.md) 