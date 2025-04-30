import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Cog6ToothIcon, BeakerIcon } from '@heroicons/react/24/outline';
import ApiKeySettings from './ApiKeySettings';

const Header: React.FC = () => {
  const [showSettings, setShowSettings] = useState(false);

  return (
    <header className="bg-white shadow">
      <div className="container mx-auto px-4 py-6">
        <div className="flex justify-between items-center">
          <Link to="/" className="text-xl font-bold text-indigo-600">
            Comput3 Render UI
          </Link>
          <nav className="flex items-center">
            <ul className="flex space-x-6 mr-4">
              <li>
                <Link to="/api-tester" className="text-gray-600 hover:text-indigo-600 flex items-center">
                  <BeakerIcon className="w-4 h-4 mr-1" />
                  API Tester
                </Link>
              </li>
            </ul>
            <button 
              onClick={() => setShowSettings(!showSettings)}
              className="p-2 rounded-md hover:bg-gray-100"
              title="API Settings"
            >
              <Cog6ToothIcon className="w-6 h-6 text-gray-600" />
            </button>
          </nav>
        </div>
      </div>
      
      {/* Settings Dialog */}
      {showSettings && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
          <div className="w-full max-w-md mx-auto">
            <div className="relative">
              <button 
                onClick={() => setShowSettings(false)} 
                className="absolute right-4 top-4 text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
              <ApiKeySettings onClose={() => setShowSettings(false)} />
            </div>
          </div>
        </div>
      )}
    </header>
  );
};

export default Header; 