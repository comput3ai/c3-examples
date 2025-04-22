import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronDownIcon, ChevronRightIcon } from '@heroicons/react/24/outline';
import FormField from './ui/FormField';
import SelectField from './ui/SelectField';
import Button from './ui/Button';
import api, { WhisperRequest } from '../services/api';
import { useJobContext } from '../context/JobContext';

interface FormErrors {
  audio_url?: string;
  model?: string;
  language?: string;
}

const modelOptions = [
  { value: 'tiny', label: 'Tiny (faster, less accurate)' },
  { value: 'base', label: 'Base' },
  { value: 'small', label: 'Small' },
  { value: 'medium', label: 'Medium (default)' },
  { value: 'large', label: 'Large' },
  { value: 'large-v2', label: 'Large v2' },
  { value: 'large-v3', label: 'Large v3 (slower, most accurate)' },
];

const taskOptions = [
  { value: 'transcribe', label: 'Transcribe (default)' },
  { value: 'translate', label: 'Translate to English' },
];

const languageOptions = [
  { value: '', label: 'Auto-detect (recommended)' },
  { value: 'en', label: 'English' },
  { value: 'es', label: 'Spanish' },
  { value: 'fr', label: 'French' },
  { value: 'de', label: 'German' },
  { value: 'it', label: 'Italian' },
  { value: 'pt', label: 'Portuguese' },
  { value: 'nl', label: 'Dutch' },
  { value: 'ja', label: 'Japanese' },
  { value: 'zh', label: 'Chinese' },
  { value: 'ru', label: 'Russian' },
  { value: 'ar', label: 'Arabic' },
];

const WhisperForm: React.FC = () => {
  const navigate = useNavigate();
  const { addJob } = useJobContext();
  
  const [formData, setFormData] = useState<WhisperRequest>({
    audio_url: '',
    model: 'medium',
    task: 'transcribe',
    language: '',
  });
  
  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showApiReference, setShowApiReference] = useState(false);
  
  // Sample audio URLs for testing
  const sampleUrls = [
    { label: 'TED Talk (English)', url: 'https://download.ted.com/talks/KateDarling_2018S-950k.mp4' },
    { label: 'NASA Briefing', url: 'https://www.nasa.gov/wp-content/uploads/2023/04/sls_engine_test_for_artemis_ii_mission.mp3' },
  ];

  const setSampleUrl = (url: string) => {
    setFormData(prev => ({ ...prev, audio_url: url }));
    // Clear any errors
    if (errors.audio_url) {
      setErrors(prev => ({ ...prev, audio_url: undefined }));
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    // Clear error for this field
    if (errors[name as keyof FormErrors]) {
      setErrors(prev => ({ ...prev, [name]: undefined }));
    }
  };
  
  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};
    
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
      const response = await api.createWhisper(formData);
      
      // Add job to context
      addJob({
        id: response.id,
        type: 'whisper',
        status: 'queued'
      });
      
      // Navigate to result page
      navigate(`/result/${response.id}`);
    } catch (error) {
      console.error("Error submitting Whisper request:", error);
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // Sample JSON for API reference
  const sampleJson = JSON.stringify({
    audio_url: "https://example.com/audio.mp3",
    model: "medium",
    task: "transcribe",
    language: "",
    notify_url: "https://your-webhook-endpoint.com/callback",
    max_time: 1200,
    complete_in: 3600
  }, null, 2);
  
  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-800 mb-2">Speech to Text (Whisper)</h1>
      <p className="text-gray-600 mb-8">Transcribe audio to text with high accuracy using the Whisper model.</p>
      
      <div className="bg-white rounded-lg shadow p-6">
        <form onSubmit={handleSubmit}>
          <div className="mb-6">
            <FormField
              label="Audio URL"
              name="audio_url"
              type="url"
              value={formData.audio_url}
              onChange={handleChange}
              error={errors.audio_url}
              helpText="URL to the audio file you want to transcribe (MP3, WAV, M4A, etc.)"
              placeholder="https://example.com/audio.mp3"
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
          
          <div className="mt-6 bg-gray-50 p-4 rounded-md">
            <h4 className="font-medium text-gray-700 mb-3">Model Settings</h4>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <SelectField
                label="Whisper Model"
                name="model"
                value={formData.model}
                options={modelOptions}
                onChange={handleChange}
                helpText="Larger models are more accurate but slower"
              />
              
              <SelectField
                label="Task"
                name="task"
                value={formData.task}
                options={taskOptions}
                onChange={handleChange}
                helpText="Transcribe in original language or translate to English"
              />
              
              <SelectField
                label="Language (Optional)"
                name="language"
                value={formData.language}
                options={languageOptions}
                onChange={handleChange}
                helpText="Auto-detection works well in most cases"
              />
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
                  API endpoint: <code className="bg-gray-100 px-1 py-0.5 rounded">POST /whisper</code>
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
              Transcribe Audio
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default WhisperForm; 