import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { CheckCircleIcon, XCircleIcon, ClockIcon, ArrowPathIcon } from '@heroicons/react/24/outline';
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
      <div className="flex justify-center">
        <audio controls className="w-full max-w-[500px]" src={url}>
          Your browser does not support the audio element.
        </audio>
      </div>
      <div className="mt-2 text-sm text-gray-500 break-all">
        <p>Audio URL: <a href={url} target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:underline">{url}</a></p>
      </div>
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
      <div className="flex justify-center">
        <video controls className="w-full max-w-[500px] rounded-md" src={url}>
          Your browser does not support the video element.
        </video>
      </div>
      <div className="mt-2 text-sm text-gray-500 break-all">
        <p>Video URL: <a href={url} target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:underline">{url}</a></p>
      </div>
    </div>
  );
};

// Get polling interval from environment variables or use default (5000ms)
const POLL_INTERVAL = parseInt(process.env.REACT_APP_POLL_INTERVAL || '15000', 10);

// Function to detect media type from URL
const detectMediaType = (url: string): 'video' | 'audio' | 'text' => {
  if (!url) return 'text';
  
  const lowerUrl = url.toLowerCase();
  if (lowerUrl.endsWith('.mp4') || lowerUrl.endsWith('.webm') || lowerUrl.endsWith('.mov') || 
      lowerUrl.includes('portrait') || lowerUrl.includes('video')) {
    return 'video';
  }
  
  if (lowerUrl.endsWith('.mp3') || lowerUrl.endsWith('.wav') || lowerUrl.endsWith('.ogg') || 
      lowerUrl.endsWith('.m4a')) {
    return 'audio';
  }
  
  // For signed URLs that don't have a clear extension, check for hints in the URL
  if (lowerUrl.includes('.mp4?')) {
    return 'video';
  }
  
  if (lowerUrl.includes('.mp3?')) {
    return 'audio';
  }
  
  // Default to audio for other cases as it's the more common case
  return 'audio';
};

const JobResult: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { getJob, updateJob, addJob } = useJobContext();
  const [isLoading, setIsLoading] = useState(false);
  const [isCheckingResult, setIsCheckingResult] = useState(false);
  const [isInitializing, setIsInitializing] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const [shouldPoll, setShouldPoll] = useState(true);
  const isMounted = React.useRef(true);
  
  // Track component mount status to prevent memory leaks
  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);
  
  // Get job from context
  const job = id ? getJob(id) : undefined;
  
  // Function to check job status
  const checkStatus = useCallback(async () => {
    if (!id || !shouldPoll || !isMounted.current) return;
    
    setIsLoading(true);
    try {
      const response = await api.getJobStatus(id);
      const newStatus = response.status as 'queued' | 'running' | 'success' | 'failed';
      
      // If job is complete, stop polling
      if (newStatus === 'success' || newStatus === 'failed') {
        setShouldPoll(false);
      }
      
      if (job) {
        updateJob(id, { status: newStatus });
      } else if (!notFound) {
        // If job was found in API but not in context, create a new entry
        // This handles page refreshes where the job context was reset
        console.log(`Job ${id} found in API but not in context, creating new entry`);
        addJob({
          id,
          // We don't know the type, but we'll use 'csm' as default
          // It will be updated when we fetch the result
          type: 'csm',
          status: newStatus
        });
      }
    } catch (error) {
      console.error("Error checking job status:", error);
      setNotFound(true);
      setShouldPoll(false);
    } finally {
      if (isMounted.current) {
        setIsLoading(false);
      }
    }
  }, [id, job, updateJob, addJob, notFound, shouldPoll]);
  
  // Function to fetch job result
  const fetchResult = useCallback(async () => {
    if (!id || !job || (job.status !== 'success' && job.result) || !isMounted.current) return;
    
    setIsCheckingResult(true);
    try {
      const result = await api.getJobResult(id);
      
      // Only continue if component is still mounted
      if (!isMounted.current) return;
      
      // Determine job type from result if we're restoring from API
      let type = job.type;
      if (job.type === 'csm' && !job.result) {  // Only change if we're unsure about the type
        if (result.text) {
          // Text result indicates whisper or analyze job
          // For now, we'll assume whisper since it's more common
          type = 'whisper';
        } else if (result.result_url) {
          // Use the media detection helper to determine job type
          const mediaType = detectMediaType(result.result_url);
          if (mediaType === 'video') {
            type = 'portrait';
          } else if (mediaType === 'audio') {
            type = 'csm';
          }
        }
      }
      
      updateJob(id, { result, type: type as any });
    } catch (error) {
      console.error("Error fetching job result:", error);
    } finally {
      if (isMounted.current) {
        setIsCheckingResult(false);
      }
    }
  }, [id, job, updateJob, isMounted]);
  
  // Initialize job if not found in context
  useEffect(() => {
    if (!job && id && !notFound && !isInitializing) {
      setIsInitializing(true);
      checkStatus().finally(() => {
        if (isMounted.current) {
          setIsInitializing(false);
        }
      });
    }
  }, [job, id, notFound, isInitializing, checkStatus]);
  
  // Check status on mount and set up polling if necessary
  useEffect(() => {
    // Skip if no job or no id
    if (!job || !id) return;
    
    // Determine if we should poll based on job status
    const isJobComplete = job.status === 'success' || job.status === 'failed';
    
    // Update polling state if different
    if (shouldPoll !== !isJobComplete) {
      setShouldPoll(!isJobComplete);
    }
    
    // Initial status check when job changes
    checkStatus();
    
    // Only set up polling for non-completed jobs
    if (!isJobComplete) {
      const interval = setInterval(checkStatus, POLL_INTERVAL);
      return () => clearInterval(interval);
    }
  }, [job, id, checkStatus, shouldPoll]);
  
  // Fetch result when job status becomes success
  useEffect(() => {
    if (job?.status === 'success' && !job.result) {
      fetchResult();
    }
  }, [job?.status, job?.result, fetchResult]);
  
  // Show loading state while initializing
  if (isInitializing) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="text-center py-8">
          <ArrowPathIcon className="w-8 h-8 text-indigo-500 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading job information...</p>
        </div>
      </div>
    );
  }
  
  // If job doesn't exist after initialization, show error
  if (!job && notFound) {
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
  
  // If job is still loading or not found yet, show loading
  if (!job) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="text-center py-8">
          <ArrowPathIcon className="w-8 h-8 text-indigo-500 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading job information...</p>
        </div>
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
          {/* For Whisper or Analyze jobs with text result */}
          {(job.type === 'whisper' || job.type === 'analyze') && job.result?.text && (
            <TextResult text={job.result.text} jobType={job.type} />
          )}
          
          {/* For media URLs, detect the media type and use the appropriate player */}
          {job.result.result_url && (
            <>
              {detectMediaType(job.result.result_url) === 'video' && (
                <VideoPlayer url={job.result.result_url} />
              )}
              
              {detectMediaType(job.result.result_url) === 'audio' && (
                <AudioPlayer url={job.result.result_url} />
              )}
            </>
          )}
          
          {/* Fallback warning for unexpected formats */}
          {job.result.result_url && 
           !job.result.text && 
           detectMediaType(job.result.result_url) === 'text' && (
            <div className="mt-6 p-4 bg-yellow-50 rounded-lg">
              <p className="text-yellow-700">
                Unexpected result format. <a href={job.result.result_url} target="_blank" rel="noopener noreferrer" className="underline">Open the result directly</a>.
              </p>
            </div>
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