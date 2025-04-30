import React, { useState } from 'react';
import axios from 'axios';
import Button from './ui/Button';
import FormField from './ui/FormField';
import TextareaField from './ui/TextareaField';
import SelectField from './ui/SelectField';

// Enable debug mode from environment variables
const DEBUG_MODE = process.env.REACT_APP_DEBUG === 'true';

// Determine if we're using a proxy (development mode)
const isUsingProxy = process.env.NODE_ENV === 'development';

const ApiTester: React.FC = () => {
  const [endpoint, setEndpoint] = useState<string>('/status');
  const [method, setMethod] = useState<string>('GET');
  const [requestBody, setRequestBody] = useState<string>('');
  const [response, setResponse] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [requestId, setRequestId] = useState<string>('');

  // When using proxy in development, use relative URLs
  const apiBaseUrl = isUsingProxy ? '' : (process.env.REACT_APP_API_BASE_URL || 'http://localhost:5000');
  const apiKey = localStorage.getItem('c3_render_api_key') || '';

  const methodOptions = [
    { value: 'GET', label: 'GET' },
    { value: 'POST', label: 'POST' },
  ];

  const endpointOptions = [
    { value: '/status', label: 'Status (GET /status/{id})' },
    { value: '/result', label: 'Result (GET /result/{id})' },
    { value: '/csm', label: 'CSM (POST /csm)' },
    { value: '/whisper', label: 'Whisper (POST /whisper)' },
    { value: '/portrait', label: 'Portrait (POST /portrait)' },
    { value: '/analyze', label: 'Analyze (POST /analyze)' },
  ];

  const handleSendRequest = async () => {
    setIsLoading(true);
    setResponse('');
    setError('');

    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      if (apiKey) {
        headers['X-C3-RENDER-KEY'] = apiKey;
      }

      let finalEndpoint = endpoint;
      if ((endpoint === '/status' || endpoint === '/result') && requestId) {
        finalEndpoint = `${endpoint}/${requestId}`;
      }

      const config = {
        method,
        url: `${apiBaseUrl}${finalEndpoint}`,
        headers,
        data: method === 'POST' && requestBody ? JSON.parse(requestBody) : undefined,
      };

      // Log request in debug mode
      if (DEBUG_MODE) {
        console.log('API Request:', {
          ...config,
          headers: { ...config.headers, 'X-C3-RENDER-KEY': apiKey ? '********' : undefined }
        });
      }

      const result = await axios(config);
      
      // Log response in debug mode
      if (DEBUG_MODE) {
        console.log('API Response:', result.data);
      }
      
      setResponse(JSON.stringify(result.data, null, 2));
    } catch (err: any) {
      // Log error in debug mode
      if (DEBUG_MODE) {
        console.error('API Error:', err);
      }
      
      setError(
        err.response
          ? `Error ${err.response.status}: ${JSON.stringify(err.response.data, null, 2)}`
          : err.message
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-xl font-semibold text-gray-800 mb-4">API Tester</h2>
      <p className="text-gray-600 mb-4">
        Use this tool to test the C3 Render API with your configured API key.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <SelectField
          label="HTTP Method"
          name="method"
          options={methodOptions}
          value={method}
          onChange={(e) => setMethod(e.target.value)}
        />

        <SelectField
          label="Endpoint"
          name="endpoint"
          options={endpointOptions}
          value={endpoint}
          onChange={(e) => setEndpoint(e.target.value)}
        />
      </div>

      {(endpoint === '/status' || endpoint === '/result') && (
        <FormField
          label="Request ID"
          name="requestId"
          value={requestId}
          onChange={(e) => setRequestId(e.target.value)}
          placeholder="Enter the job ID"
          className="mb-4"
        />
      )}

      {method === 'POST' && (
        <TextareaField
          label="Request Body (JSON)"
          name="requestBody"
          value={requestBody}
          onChange={(e) => setRequestBody(e.target.value)}
          rows={8}
          placeholder='{ "key": "value" }'
          className="mb-4 font-mono"
        />
      )}

      <div className="mb-4">
        <Button onClick={handleSendRequest} isLoading={isLoading} disabled={isLoading}>
          Send Request
        </Button>
      </div>

      {response && (
        <div className="mb-4">
          <h3 className="text-lg font-medium text-gray-800 mb-2">Response:</h3>
          <div className="p-3 bg-gray-50 border border-gray-200 rounded-md overflow-auto max-h-60">
            <pre className="text-sm text-gray-800 font-mono whitespace-pre-wrap">{response}</pre>
          </div>
        </div>
      )}

      {error && (
        <div className="mb-4">
          <h3 className="text-lg font-medium text-red-600 mb-2">Error:</h3>
          <div className="p-3 bg-red-50 border border-red-200 rounded-md overflow-auto max-h-60">
            <pre className="text-sm text-red-600 font-mono whitespace-pre-wrap">{error}</pre>
          </div>
        </div>
      )}
    </div>
  );
};

export default ApiTester; 