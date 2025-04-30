import React, { useState, useEffect } from 'react';
import { ExclamationTriangleIcon } from '@heroicons/react/24/outline';

interface ApiKeyWarningProps {
  onSetupClick: () => void;
}

const ApiKeyWarning: React.FC<ApiKeyWarningProps> = ({ onSetupClick }) => {
  const [hasApiKey, setHasApiKey] = useState<boolean>(false);
  
  useEffect(() => {
    // Check if API key exists in localStorage
    const apiKey = localStorage.getItem('c3_render_api_key');
    setHasApiKey(!!apiKey);
    
    // Set up listener for localStorage changes
    const handleStorageChange = () => {
      const apiKey = localStorage.getItem('c3_render_api_key');
      setHasApiKey(!!apiKey);
    };
    
    window.addEventListener('storage', handleStorageChange);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);
  
  // If API key is set, don't show any warning
  if (hasApiKey) {
    return null;
  }
  
  return (
    <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-6">
      <div className="flex">
        <div className="flex-shrink-0">
          <ExclamationTriangleIcon className="h-5 w-5 text-yellow-400" aria-hidden="true" />
        </div>
        <div className="ml-3">
          <p className="text-sm text-yellow-700">
            No API key has been set. The application will use local development mode.
            {' '}
            <button
              type="button"
              className="font-medium text-yellow-700 underline hover:text-yellow-600"
              onClick={onSetupClick}
            >
              Set up API key
            </button>
          </p>
        </div>
      </div>
    </div>
  );
};

export default ApiKeyWarning; 