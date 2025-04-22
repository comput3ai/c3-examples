import React from 'react';
import { Link } from 'react-router-dom';
import Button from './ui/Button';

const AnalyzeForm: React.FC = () => {
  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-800 mb-2">Image Analysis</h1>
      <p className="text-gray-600 mb-8">Analyze images using a vision model to extract information and insights.</p>
      
      <div className="bg-white rounded-lg shadow p-6">
        <div className="p-8 text-center">
          <p className="text-gray-500 mb-6">
            This feature is coming soon. Currently, only the CSM (Text-to-Speech) functionality is implemented.
          </p>
          <Link to="/">
            <Button variant="primary">
              Back to Services
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default AnalyzeForm; 