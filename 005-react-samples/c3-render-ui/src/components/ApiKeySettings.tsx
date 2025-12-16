import React, { useState, useEffect } from 'react';
import { setApiKey, clearApiKey } from '../services/api';
import Button from './ui/Button';
import FormField from './ui/FormField';

interface ApiKeySettingsProps {
  onClose?: () => void;
}

const ApiKeySettings: React.FC<ApiKeySettingsProps> = ({ onClose }) => {
  const [apiKey, setApiKeyState] = useState<string>('');
  const [isSaved, setIsSaved] = useState<boolean>(false);

  // Load saved API key from localStorage on component mount
  useEffect(() => {
    const savedApiKey = localStorage.getItem('c3_render_api_key');
    if (savedApiKey) {
      setApiKeyState(savedApiKey);
      setIsSaved(true);
    }
  }, []);

  const handleSaveApiKey = () => {
    if (apiKey.trim()) {
      setApiKey(apiKey.trim());
      setIsSaved(true);
      if (onClose) {
        setTimeout(onClose, 1500);
      }
    }
  };

  const handleClearApiKey = () => {
    clearApiKey();
    setApiKeyState('');
    setIsSaved(false);
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-xl font-semibold text-gray-800 mb-4">API Key Settings</h2>
      <p className="text-gray-600 mb-4">
        Enter your C3 Render API key to connect to the API. This key will be stored in your browser's local storage.
      </p>

      <FormField
        label="API Key"
        name="apiKey"
        type="password"
        value={apiKey}
        onChange={(e) => setApiKeyState(e.target.value)}
        placeholder="Enter your C3 Render API key"
        className="mb-4"
      />

      {isSaved && (
        <div className="mb-4 p-2 bg-green-50 text-green-700 rounded-md">
          ✓ API key has been saved successfully.
        </div>
      )}

      <div className="flex justify-end space-x-3">
        <Button
          variant="outline"
          type="button"
          onClick={handleClearApiKey}
          disabled={!apiKey}
        >
          Clear API Key
        </Button>
        <Button
          type="button"
          onClick={handleSaveApiKey}
          disabled={!apiKey.trim()}
        >
          Save API Key
        </Button>
      </div>
    </div>
  );
};

export default ApiKeySettings; 