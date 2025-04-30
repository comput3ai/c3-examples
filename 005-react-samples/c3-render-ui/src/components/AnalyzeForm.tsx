import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronDownIcon, ChevronRightIcon } from '@heroicons/react/24/outline';
import FormField from './ui/FormField';
import Button from './ui/Button';
import api, { AnalyzeRequest } from '../services/api';
import { useJobContext } from '../context/JobContext';

interface FormErrors {
  image_url?: string;
}

const AnalyzeForm: React.FC = () => {
  const navigate = useNavigate();
  const { addJob } = useJobContext();
  
  const [formData, setFormData] = useState<AnalyzeRequest>({
    image_url: '',
  });
  
  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showApiReference, setShowApiReference] = useState(false);
  
  // Sample image URLs for testing
  const sampleUrls = [
    { label: 'Sample Image 1', url: 'https://comput3.ai/media/female-ghibli.jpg' },
    { label: 'Sample Image 2', url: 'https://comput3.ai/media/female.jpg' },
  ];

  const setSampleUrl = (url: string) => {
    setFormData(prev => ({ ...prev, image_url: url }));
    // Clear any errors
    if (errors.image_url) {
      setErrors(prev => ({ ...prev, image_url: undefined }));
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    // Clear error for this field
    if (errors[name as keyof FormErrors]) {
      setErrors(prev => ({ ...prev, [name]: undefined }));
    }
  };
  
  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};
    
    // Validate image URL
    if (!formData.image_url || formData.image_url.trim() === '') {
      newErrors.image_url = "Image URL is required";
    } else if (!isValidUrl(formData.image_url)) {
      newErrors.image_url = "Please enter a valid URL";
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };
  
  const isValidUrl = (url: string): boolean => {
    try {
      new URL(url);
      return true;
    } catch (e) {
      return false;
    }
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      const response = await api.analyzeImage(formData);
      
      // Add job to context
      addJob({
        id: response.id,
        type: 'analyze',
        status: 'queued'
      });
      
      // Navigate to result page
      navigate(`/result/${response.id}`);
    } catch (error) {
      console.error("Error submitting image analysis request:", error);
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // Sample JSON for API reference
  const sampleJson = JSON.stringify({
    image_url: "https://example.com/image.jpg",
    notify_url: "https://your-webhook-endpoint.com/callback",
    max_time: 300,
    complete_in: 1800
  }, null, 2);
  
  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-800 mb-2">Image Analysis</h1>
      <p className="text-gray-600 mb-8">Analyze images using a vision model to extract information and insights.</p>
      
      <div className="bg-white rounded-lg shadow p-6">
        <form onSubmit={handleSubmit}>
          <div className="mb-6">
            <FormField
              label="Image URL"
              name="image_url"
              type="url"
              value={formData.image_url}
              onChange={handleChange}
              error={errors.image_url}
              helpText="URL to the image you want to analyze (JPG, PNG, etc.)"
              placeholder="https://example.com/image.jpg"
            />
            
            <div className="mt-2">
              <p className="text-sm text-gray-500 mb-2">Or use a sample URL for testing:</p>
              <div className="flex flex-wrap gap-2">
                {sampleUrls.map((sample, index) => (
                  <button
                    key={index}
                    type="button"
                    onClick={() => setSampleUrl(sample.url)}
                    className="text-xs px-2 py-1 bg-indigo-50 text-indigo-700 rounded hover:bg-indigo-100"
                  >
                    {sample.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
          
          <div className="mt-6">
            <button
              type="button"
              className="flex items-center text-sm text-gray-600 hover:text-indigo-600"
              onClick={() => setShowApiReference(!showApiReference)}
            >
              {showApiReference ? (
                <ChevronDownIcon className="w-4 h-4 mr-1" />
              ) : (
                <ChevronRightIcon className="w-4 h-4 mr-1" />
              )}
              API Reference
            </button>
            
            {showApiReference && (
              <div className="mt-2 p-3 bg-gray-50 rounded-md border border-gray-200">
                <p className="text-sm text-gray-600 mb-2">
                  API endpoint: <code className="bg-gray-100 px-1 py-0.5 rounded">POST /analyze</code>
                </p>
                <p className="text-sm text-gray-600 mb-2">Sample JSON payload:</p>
                <pre className="text-xs bg-gray-100 p-2 rounded overflow-auto">
                  {sampleJson}
                </pre>
              </div>
            )}
          </div>
          
          <div className="mt-6 flex justify-end">
            <Button
              type="button"
              variant="outline"
              className="mr-4"
              onClick={() => navigate('/')}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              isLoading={isSubmitting}
              disabled={isSubmitting}
            >
              Analyze Image
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AnalyzeForm; 