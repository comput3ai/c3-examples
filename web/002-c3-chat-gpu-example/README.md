# C3 Chat Example

A simple ChatGPT-style interface for talking to an LLM, built with vanilla JavaScript and Vite. This application uses Comput3's Inference API to connect to advanced language models.

## Features

- Clean, modern UI similar to ChatGPT/Claude interfaces
- Integration with Comput3's API for real LLM responses
- Support for both Llama3:70B (free) and Hermes3:70B (premium) models
- Responsive design that works on mobile and desktop
- Message history display with user and AI messages
- Auto-resizing text input area
- Loading indicators for better UX
- Environment variable support for API key

## Getting Started

### Prerequisites

- Node.js (v14 or later recommended)
- npm or yarn
- A Comput3 API key (Get one from [Launch.comput3.ai](https://launch.comput3.ai))

### Installation

1. Clone this repository or extract the files
2. Navigate to the project directory
3. Install dependencies:

```bash
npm install
```

### Setting Up Environment Variables (Optional)

For convenience and security, you can set up your API key as an environment variable:

1. Copy the `.env.sample` file to a new file named `.env`:

```bash
cp .env.sample .env
```

2. Edit the `.env` file and replace `your_api_key_here` with your actual Comput3 API key

```bash
VITE_C3_API_KEY=your_actual_api_key_from_comput3
```

3. Optionally, you can configure custom API endpoints:

```
# Custom API endpoint for GPU management
VITE_API_URL=http://localhost:8080/https://api.comput3.ai/api/v0

# Custom API endpoint for completions
VITE_COMPLETIONS_URL=https://api.comput3.ai/v1/completions

# CORS proxy prefix for node URLs (optional)
# If not set or empty, direct connection will be used without a proxy
VITE_CORS_PREFIX=https://localhost:8080

# Load balancer URL for chat queries (optional)
# If set, this will be used instead of direct node connection for queries
# A GPU must still be running for chat to work
VITE_LB_URL=https://app.comput3.ai/tags/all/v1
```

Note: The `.env` file is listed in `.gitignore` to prevent accidentally committing your API key to version control.

### Running the Development Server

Run the development server:

```bash
npm run dev
```

This will start the development server, typically at http://localhost:5173 or http://localhost:5174

### Using the Chat Interface

1. If you've set up the environment variable, your API key will be automatically loaded
2. Otherwise, enter your Comput3 API key in the input field at the top of the interface
3. Select the model you want to use (Llama3:70B is free for all registered users)
4. Type your message in the input field at the bottom
5. Press Enter or click the send button to send your message
6. The AI will respond using the Comput3 API

### Building for Production

To build the app for production:

```bash
npm run build
```

The build output will be in the `dist` directory.

## About Comput3 API

This application uses the Comput3 Inference API, which offers:

### Free Inference

- All registered users get limited free access to Llama3:70B
- Get your API key from [Launch.comput3.ai](https://launch.comput3.ai)

### Premium Inference

Users with sufficient token balances can access premium models like Hermes3:70B. Eligibility:
- 500+ AI16Z Tokens, OR
- 1+ Solana, OR
- 10,000+ Sendcoin
- 25K+ OPUS

To upgrade, use the "powerups" option in the top right of launch.comput3.ai.

## API Documentation

For more information about the Comput3 API, visit:
- Workload API Reference: https://api.comput3.ai/api/v0/apidocs/#/
- Example scripts: Check Comput3's Github repository

## Customization

You can easily customize this template by:

- Modifying the CSS variables in `style.css` to change colors and appearance
- Adding more features like chat history, model selection, etc.
- Extending the API integration with additional parameters

## License

MIT 