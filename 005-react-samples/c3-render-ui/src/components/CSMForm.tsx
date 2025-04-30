import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import FormField from './ui/FormField';
import TextareaField from './ui/TextareaField';
import SelectField from './ui/SelectField';
import Button from './ui/Button';
import api, { CSMRequest } from '../services/api';
import { useJobContext } from '../context/JobContext';

interface FormErrors {
  text?: string;
  voice?: string;
  temperature?: string;
  topk?: string;
  max_audio_length?: string;
  pause_duration?: string;
  reference_audio_url?: string;
  reference_text?: string;
}

const voiceOptions = [
  { value: 'random', label: 'Random Voice' },
  { value: 'conversational_a', label: 'Conversational A' },
  { value: 'conversational_b', label: 'Conversational B' },
  { value: 'clone', label: 'Voice Cloning' },
];

const CSMForm: React.FC = () => {
  const navigate = useNavigate();
  const { addJob } = useJobContext();
  
  const [formData, setFormData] = useState<CSMRequest>({
    text: '',
    voice: 'random',
    temperature: 0.9,
    topk: 50,
    max_audio_length: 10000,
    pause_duration: 150,
  });
  
  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [useMonologue, setUseMonologue] = useState(false);
  
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    
    // Convert number fields to numbers
    if (['temperature', 'topk', 'max_audio_length', 'pause_duration'].includes(name)) {
      setFormData(prev => ({ ...prev, [name]: Number(value) }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
    
    // Clear error for this field
    if (errors[name as keyof FormErrors]) {
      setErrors(prev => ({ ...prev, [name]: undefined }));
    }
  };
  
  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};
    
    // Validate text
    if (useMonologue) {
      if (!formData.monologue || formData.monologue.length === 0) {
        newErrors.text = "Please enter at least one sentence for the monologue";
      }
    } else {
      if (!formData.text || formData.text.trim() === '') {
        newErrors.text = "Text is required";
      }
    }
    
    // Validate voice cloning specific fields
    if (formData.voice === 'clone') {
      if (!formData.reference_audio_url) {
        newErrors.reference_audio_url = "Reference audio URL is required for voice cloning";
      }
      if (!formData.reference_text) {
        newErrors.reference_text = "Reference text is required for voice cloning";
      }
    }
    
    // Validate number ranges
    if (formData.temperature !== undefined && (formData.temperature < 0 || formData.temperature > 2)) {
      newErrors.temperature = "Temperature must be between 0 and 2";
    }
    
    if (formData.topk !== undefined && (formData.topk < 1 || formData.topk > 100)) {
      newErrors.topk = "Top-k must be between 1 and 100";
    }
    
    if (formData.max_audio_length !== undefined && (formData.max_audio_length < 1000 || formData.max_audio_length > 30000)) {
      newErrors.max_audio_length = "Max audio length must be between 1000 and 30000 milliseconds";
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      // Process monologue if in use
      let requestData: CSMRequest = { ...formData };
      if (useMonologue && formData.text) {
        // Split text into sentences and set as monologue
        const sentences = formData.text
          .split(/[.!?]+/)
          .map(s => s.trim())
          .filter(s => s.length > 0);
        
        requestData = {
          ...formData,
          text: undefined,
          monologue: sentences
        };
      } else if (!useMonologue) {
        // Ensure monologue is not sent when not using it
        requestData = {
          ...formData,
          monologue: undefined
        };
      }
      
      const response = await api.createCSM(requestData);
      
      // Add job to context
      addJob({
        id: response.id,
        type: 'csm',
        status: 'queued'
      });
      
      // Navigate to result page
      navigate(`/result/${response.id}`);
    } catch (error) {
      console.error("Error submitting CSM request:", error);
      // Show error notification or message
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const toggleMonologueMode = () => {
    setUseMonologue(!useMonologue);
  };
  
  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-800 mb-2">Text to Speech (CSM)</h1>
      <p className="text-gray-600 mb-8">Generate natural-sounding speech from text using the CSM model.</p>
      
      <div className="bg-white rounded-lg shadow p-6">
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-medium">Input Text</h3>
              <button
                type="button"
                onClick={toggleMonologueMode}
                className="text-sm text-indigo-600 hover:text-indigo-500"
              >
                {useMonologue ? "Switch to Single Text" : "Switch to Sentence by Sentence"}
              </button>
            </div>
            
            <TextareaField
              label={useMonologue ? "Enter text (will be split into sentences)" : "Text to convert to speech"}
              name="text"
              value={formData.text || ''}
              onChange={handleChange}
              error={errors.text}
              helpText={useMonologue ? "Each sentence will be processed separately for better phrasing" : "Enter the text you want to convert to speech"}
              rows={5}
            />
          </div>
          
          <SelectField
            label="Voice Type"
            name="voice"
            value={formData.voice}
            options={voiceOptions}
            onChange={handleChange}
            error={errors.voice}
            helpText="Select the type of voice to use"
          />
          
          {formData.voice === 'clone' && (
            <div className="mt-4 p-4 border border-indigo-100 bg-indigo-50 rounded-md">
              <h4 className="font-medium text-indigo-800 mb-3">Voice Cloning Settings</h4>
              
              <FormField
                label="Reference Audio URL"
                name="reference_audio_url"
                type="url"
                value={formData.reference_audio_url || ''}
                onChange={handleChange}
                error={errors.reference_audio_url}
                helpText="URL to a reference audio file for voice cloning"
                placeholder="https://example.com/reference-voice.mp3"
              />
              
              <TextareaField
                label="Reference Text"
                name="reference_text"
                value={formData.reference_text || ''}
                onChange={handleChange}
                error={errors.reference_text}
                helpText="The exact text spoken in the reference audio"
                rows={3}
              />
            </div>
          )}
          
          <div className="mt-6 bg-gray-50 p-4 rounded-md">
            <h4 className="font-medium text-gray-700 mb-3">Advanced Settings</h4>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                label="Temperature"
                name="temperature"
                type="number"
                min="0"
                max="2"
                step="0.1"
                value={formData.temperature?.toString() || '0.9'}
                onChange={handleChange}
                error={errors.temperature}
                helpText="Controls randomness (0.0-2.0)"
              />
              
              <FormField
                label="Top-k"
                name="topk"
                type="number"
                min="1"
                max="100"
                value={formData.topk?.toString() || '50'}
                onChange={handleChange}
                error={errors.topk}
                helpText="Tokens to consider at generation"
              />
              
              <FormField
                label="Max Audio Length (ms)"
                name="max_audio_length"
                type="number"
                min="1000"
                max="30000"
                value={formData.max_audio_length?.toString() || '10000'}
                onChange={handleChange}
                error={errors.max_audio_length}
                helpText="Maximum length in milliseconds"
              />
              
              <FormField
                label="Pause Duration (ms)"
                name="pause_duration"
                type="number"
                min="0"
                max="1000"
                value={formData.pause_duration?.toString() || '150'}
                onChange={handleChange}
                error={errors.pause_duration}
                helpText="Pause between sentences"
              />
            </div>
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
              Generate Speech
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CSMForm; 