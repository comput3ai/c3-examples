# C3 Render UI

A modern React web application for interacting with the C3 Render API.

## Features

- Select from multiple rendering services (CSM, Whisper, Portrait, Image Analysis)
- Submit jobs to the C3 Render API
- Track job status and view results
- API Key management through the UI
- Built-in API testing tool

## Setup

### Prerequisites

- Node.js 16+ and npm
- Access to a C3 Render API endpoint (local or remote)

### Installation

1. Clone the repository
2. Install dependencies:

```bash
cd c3-render-ui
npm install
```

3. Set up environment variables:

```bash
# Copy example environment file
cp .env.example .env.local

# Edit .env.local to set your API endpoint
# Optionally set your API key for development
```

4. Start the development server:

```bash
npm start
```

## Environment Variables

The application uses the following environment variables:

| Variable | Description | Default |
|----------|-------------|---------|
| `REACT_APP_API_BASE_URL` | Base URL of the C3 Render API | `http://localhost:5000` |
| `REACT_APP_API_KEY` | Optional API key for development | - |
| `REACT_APP_POLL_INTERVAL` | Interval (ms) for polling job status | `5000` |
| `REACT_APP_DEBUG` | Enable debug logging | `false` |

### Environment Files

- `.env.development` - Used during development
- `.env.production` - Used for production builds
- `.env.local` - Override for local development (not committed to git)

## API Key Management

There are two ways to set an API key:

1. **Development**: Set `REACT_APP_API_KEY` in your `.env.local` file
2. **Production/UI**: Use the API Key Settings dialog in the UI

The API key is stored in browser localStorage and included in all API requests.

## Available Services

- **CSM (Text-to-Speech)**: Generate speech from text
- **Whisper (Speech-to-Text)**: Transcribe audio to text
- **Portrait**: Generate talking portrait videos
- **Analyze**: Analyze images with vision models

## Using the API Tester

The API Tester tool allows you to:

1. Select an API endpoint
2. Choose the HTTP method
3. Provide a request body (for POST requests)
4. Send requests and view responses

This is useful for debugging API issues and testing your API key.

## Building for Production

```bash
npm run build
```

This creates a production-ready build in the `build` folder.

## Development Notes

- The application uses React Router for navigation
- TailwindCSS is used for styling
- Axios is used for API requests
- API keys are stored in localStorage for persistence

## CORS Configuration

To avoid CORS issues during development, the application uses a proxy configuration in `package.json`:

```json
{
  "proxy": "https://render.comput3.ai"
}
```

This proxy setting automatically forwards API requests from the development server to the specified API endpoint, bypassing CORS restrictions. In development mode, the API service uses relative URLs to leverage this proxy.

### Important Notes:

1. The proxy only works in development mode (`npm start`)
2. For production builds, you must ensure proper CORS headers are set on your API server
3. If you change the proxy URL, you need to restart the development server

### Alternative CORS Solutions:

If the proxy doesn't work for your setup, consider:

1. Using a CORS browser extension (for testing only)
2. Setting up a dedicated proxy server
3. Configuring proper CORS headers on your API server (recommended for production)
