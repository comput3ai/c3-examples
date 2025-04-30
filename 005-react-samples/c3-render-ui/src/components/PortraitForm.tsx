import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronDownIcon, ChevronRightIcon } from '@heroicons/react/24/outline';
import FormField from './ui/FormField';
import Button from './ui/Button';
import api, { PortraitRequest } from '../services/api';
import { useJobContext } from '../context/JobContext';

interface FormErrors {
  image_url?: string;
  audio_url?: string;
}

const PortraitForm: React.FC = () => {
  const navigate = useNavigate();
  const { addJob } = useJobContext();
  
  const [formData, setFormData] = useState<PortraitRequest>({
    image_url: '',
    audio_url: '',
  });
  
  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showApiReference, setShowApiReference] = useState(false);
  
  // Sample image URLs for testing
  const sampleImageUrls = [
    { label: 'Portrait 1', url: 'https://comput3.ai/media/female.jpg' },
    { label: 'Portrait 2', url: 'https://comput3.ai/media/male.jpg' },
  ];

  // Sample audio URLs for testing
  const sampleAudioUrls = [
    { label: 'Female Voice', url: 'https://comput3.ai/media/female.mp3' },
    { label: 'TED Talk', url: 'https://download.ted.com/talks/KateDarling_2018S-950k.mp4' },
  ];

  const setSampleImageUrl = (url: string) => {
    setFormData(prev => ({ ...prev, image_url: url }));
    // Clear any errors
    if (errors.image_url) {
      setErrors(prev => ({ ...prev, image_url: undefined }));
    }
  };

  const setSampleAudioUrl = (url: string) => {
    setFormData(prev => ({ ...prev, audio_url: url }));
    // Clear any errors
    if (errors.audio_url) {
      setErrors(prev => ({ ...prev, audio_url: undefined }));
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
    
    // Validate audio URL
    if (!formData.audio_url || formData.audio_url.trim() === '') {
      newErrors.audio_url = "Audio URL is required";
    } else if (!isValidUrl(formData.audio_url)) {
      newErrors.audio_url = "Please enter a valid URL";
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
      const response = await api.createPortrait(formData);
      
      // Add job to context
      addJob({
        id: response.id,
        type: 'portrait',
        status: 'queued'
      });
      
      // Navigate to result page
      navigate(`/result/${response.id}`);
    } catch (error) {
      console.error("Error submitting portrait video request:", error);
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // Sample JSON for API reference
  const sampleJson = JSON.stringify({
    image_url: "https://example.com/portrait.jpg",
    audio_url: "https://example.com/speech.mp3",
    notify_url: "https://your-webhook-endpoint.com/callback",
    max_time: 1800,
    complete_in: 3600
  }, null, 2);
  
  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-800 mb-2">Portrait Video Generation</h1>
      <p className="text-gray-600 mb-8">Create a speaking portrait video from an image and audio.</p>
      
      <div className="bg-white rounded-lg shadow p-6">
        <form onSubmit={handleSubmit}>
          <div className="mb-6">
            <FormField
              label="Portrait Image URL"
              name="image_url"
              type="url"
              value={formData.image_url}
              onChange={handleChange}
              error={errors.image_url}
              helpText="URL to the portrait image with a face to animate (JPG, PNG)"
              placeholder="https://example.com/portrait.jpg"
            />
            
            <div className="mt-2">
              <p className="text-sm text-gray-500 mb-2">Or use a sample portrait image:</p>
              <div className="flex flex-wrap gap-2">
                {sampleImageUrls.map((sample, index) => (
                  <button
                    key={index}
                    type="button"
                    onClick={() => setSampleImageUrl(sample.url)}
                    className="text-xs px-2 py-1 bg-indigo-50 text-indigo-700 rounded hover:bg-indigo-100"
                  >
                    {sample.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
          
          <div className="mb-6">
            <FormField
              label="Audio URL"
              name="audio_url"
              type="url"
              value={formData.audio_url}
              onChange={handleChange}
              error={errors.audio_url}
              helpText="URL to the audio file that will drive the portrait animation (MP3, WAV, M4A)"
              placeholder="https://example.com/speech.mp3"
            />
            
            <div className="mt-2">
              <p className="text-sm text-gray-500 mb-2">Or use a sample audio file:</p>
              <div className="flex flex-wrap gap-2">
                {sampleAudioUrls.map((sample, index) => (
                  <button
                    key={index}
                    type="button"
                    onClick={() => setSampleAudioUrl(sample.url)}
                    className="text-xs px-2 py-1 bg-indigo-50 text-indigo-700 rounded hover:bg-indigo-100"
                  >
                    {sample.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
          
          <div className="mt-6 bg-gray-50 p-4 rounded-md">
            <h4 className="font-medium text-gray-700 mb-3">Important Notes</h4>
            <ul className="text-sm text-gray-600 list-disc pl-5 space-y-1">
              <li>The portrait image should clearly show a person's face</li>
              <li>Best results are achieved with front-facing, well-lit portraits</li>
              <li>Processing may take several minutes depending on audio length</li>
              <li>Audio files should be clear with minimal background noise</li>
            </ul>
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
                  API endpoint: <code className="bg-gray-100 px-1 py-0.5 rounded">POST /portrait</code>
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
              Generate Portrait Video
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default PortraitForm; 