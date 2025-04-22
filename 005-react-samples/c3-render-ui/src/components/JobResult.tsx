import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { CheckCircleIcon, XCircleIcon, ClockIcon, ArrowPathIcon, ClipboardDocumentIcon } from '@heroicons/react/24/outline';
import Button from './ui/Button';
import api from '../services/api';
import { useJobContext } from '../context/JobContext';

// Define status component props for reuse
interface StatusComponentProps {
  status: 'queued' | 'running' | 'success' | 'failed';
  errorMessage?: string;
}

// Status indicators for different job states
const StatusIndicator: React.FC<StatusComponentProps> = ({ status, errorMessage }) => {
  const statusConfig = {
    queued: {
      icon: <ClockIcon className="w-8 h-8 text-yellow-500" />,
      title: 'Job Queued',
      description: 'Your job is waiting to be processed',
      color: 'text-yellow-500'
    },
    running: {
      icon: <ArrowPathIcon className="w-8 h-8 text-blue-500 animate-spin" />,
      title: 'Job Running',
      description: 'Your job is currently being processed',
      color: 'text-blue-500'
    },
    success: {
      icon: <CheckCircleIcon className="w-8 h-8 text-green-500" />,
      title: 'Job Completed',
      description: 'Your job has been successfully completed',
      color: 'text-green-500'
    },
    failed: {
      icon: <XCircleIcon className="w-8 h-8 text-red-500" />,
      title: 'Job Failed',
      description: errorMessage || 'An error occurred during processing',
      color: 'text-red-500'
    }
  };

  const config = statusConfig[status];

  return (
    <div className="flex items-start">
      <div className="mr-4">
        {config.icon}
      </div>
      <div>
        <h2 className={`text-lg font-medium ${config.color}`}>{config.title}</h2>
        <p className="text-gray-600">{config.description}</p>
      </div>
    </div>
  );
};

// Audio player for CSM job results
const AudioPlayer: React.FC<{ url: string }> = ({ url }) => {
  return (
    <div className="mt-6 p-4 bg-gray-50 rounded-lg">
      <h3 className="text-lg font-medium text-gray-800 mb-3">Generated Audio</h3>
      <audio controls className="w-full" src={url}>
        Your browser does not support the audio element.
      </audio>
    </div>
  );
};

// Text result display for text-based jobs (Whisper, Analyze)
const TextResult: React.FC<{ text: string; jobType: 'whisper' | 'analyze' }> = ({ text, jobType }) => {
  return (
    <div className="mt-6 p-4 bg-gray-50 rounded-lg">
      <h3 className="text-lg font-medium text-gray-800 mb-3">
        {jobType === 'whisper' ? 'Transcription Result' : 'Analysis Result'}
      </h3>
      <div className="p-4 bg-white border border-gray-200 rounded-md whitespace-pre-wrap">
        {text}
      </div>
      
      {jobType === 'whisper' && (
        <div className="mt-4 flex justify-end">
          <Button
            variant="outline"
            onClick={() => {
              navigator.clipboard.writeText(text);
              alert('Transcription copied to clipboard!');
            }}
          >
            Copy Text
          </Button>
        </div>
      )}
    </div>
  );
};

// Video player for Portrait job results
const VideoPlayer: React.FC<{ url: string }> = ({ url }) => {
  return (
    <div className="mt-6 p-4 bg-gray-50 rounded-lg">
      <h3 className="text-lg font-medium text-gray-800 mb-3">Generated Video</h3>
      <video controls className="w-full rounded-md" src={url}>
        Your browser does not support the video element.
      </video>
    </div>
  );
};

// Get polling interval from environment variables or use default (5000ms)
const POLL_INTERVAL = parseInt(process.env.REACT_APP_POLL_INTERVAL || '5000', 10);

const JobResult: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { getJob, updateJob } = useJobContext();
  const [isLoading, setIsLoading] = useState(false);
  const [isCheckingResult, setIsCheckingResult] = useState(false);
  
  // Get job from context
  const job = id ? getJob(id) : undefined;
  
  // Function to check job status
  const checkStatus = async () => {
    if (!id) return;
    
    setIsLoading(true);
    try {
      const response = await api.getJobStatus(id);
      if (job) {
        updateJob(id, { status: response.status as 'queued' | 'running' | 'success' | 'failed' });
      }
    } catch (error) {
      console.error("Error checking job status:", error);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Function to fetch job result
  const fetchResult = async () => {
    if (!id || !job || job.status !== 'success') return;
    
    setIsCheckingResult(true);
    try {
      const result = await api.getJobResult(id);
      updateJob(id, { result });
    } catch (error) {
      console.error("Error fetching job result:", error);
    } finally {
      setIsCheckingResult(false);
    }
  };
  
  // Check status on mount and when job becomes successful
  useEffect(() => {
    checkStatus();
    
    // Set up polling for non-completed jobs
    if (job && (job.status === 'queued' || job.status === 'running')) {
      const interval = setInterval(checkStatus, POLL_INTERVAL);
      return () => clearInterval(interval);
    }
  }, [id, job?.status]);
  
  // Fetch result when job status becomes success
  useEffect(() => {
    if (job?.status === 'success' && !job.result) {
      fetchResult();
    }
  }, [job?.status]);
  
  // If job doesn't exist, show error
  if (!job) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <h1 className="text-xl font-semibold text-red-600 mb-2">Job Not Found</h1>
        <p className="text-gray-600 mb-6">The requested job could not be found. It may have been removed or the ID is incorrect.</p>
        <Link to="/" className="text-indigo-600 hover:text-indigo-500">
          Return to Home
        </Link>
      </div>
    );
  }
  
  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex justify-between items-start mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 mb-2">
            {job.type === 'csm' && 'Text to Speech Result'}
            {job.type === 'whisper' && 'Speech to Text Result'}
            {job.type === 'portrait' && 'Portrait Video Result'}
            {job.type === 'analyze' && 'Image Analysis Result'}
          </h1>
          <p className="text-gray-500 mb-1">Job ID: {job.id}</p>
          <p className="text-gray-500">Created: {job.createdAt.toLocaleString()}</p>
        </div>
        
        <div>
          <Button
            variant="outline"
            onClick={checkStatus}
            isLoading={isLoading}
            disabled={isLoading}
          >
            Refresh Status
          </Button>
        </div>
      </div>
      
      <div className="border-t border-gray-200 pt-6">
        <StatusIndicator status={job.status} errorMessage={job.error} />
      </div>
      
      {/* Result section - only shown for successful jobs */}
      {job.status === 'success' && job.result && (
        <>
          {/* For CSM jobs with audio result */}
          {job.type === 'csm' && job.result.result_url && (
            <AudioPlayer url={job.result.result_url} />
          )}
          
          {/* For Whisper or Analyze jobs with text result */}
          {(job.type === 'whisper' || job.type === 'analyze') && job.result?.text && (
            <TextResult text={job.result.text} jobType={job.type} />
          )}
          
          {/* For Portrait jobs with video result */}
          {job.type === 'portrait' && job.result.result_url && (
            <VideoPlayer url={job.result.result_url} />
          )}
        </>
      )}
      
      {/* Loading indicator for result fetching */}
      {job.status === 'success' && !job.result && isCheckingResult && (
        <div className="mt-6 text-center py-8">
          <ArrowPathIcon className="w-8 h-8 text-indigo-500 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading results...</p>
        </div>
      )}
      
      <div className="mt-8 pt-4 border-t border-gray-200">
        <Link to="/" className="text-indigo-600 hover:text-indigo-500">
          Back to Services
        </Link>
      </div>
    </div>
  );
};

export default JobResult; 