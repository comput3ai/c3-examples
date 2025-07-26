import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';

interface Job {
  id: string;
  type: 'csm' | 'whisper' | 'portrait' | 'analyze';
  status: 'queued' | 'running' | 'success' | 'failed';
  result?: {
    result_url?: string;
    text?: string;
  };
  error?: string;
  createdAt: Date;
}

interface JobContextType {
  jobs: Job[];
  addJob: (job: Omit<Job, 'createdAt'>) => void;
  updateJob: (id: string, updates: Partial<Job>) => void;
  getJob: (id: string) => Job | undefined;
}

const JobContext = createContext<JobContextType | undefined>(undefined);

export const useJobContext = () => {
  const context = useContext(JobContext);
  if (!context) {
    throw new Error('useJobContext must be used within a JobProvider');
  }
  return context;
};

interface JobProviderProps {
  children: ReactNode;
}

// Helper function to load jobs from localStorage
const loadJobsFromStorage = (): Job[] => {
  try {
    const storedJobs = localStorage.getItem('c3_render_jobs');
    if (storedJobs) {
      // Parse stored jobs and convert createdAt strings back to Date objects
      return JSON.parse(storedJobs).map((job: any) => ({
        ...job,
        createdAt: new Date(job.createdAt)
      }));
    }
  } catch (error) {
    console.error('Error loading jobs from localStorage:', error);
  }
  return [];
};

// Helper function to save jobs to localStorage
const saveJobsToStorage = (jobs: Job[]) => {
  try {
    localStorage.setItem('c3_render_jobs', JSON.stringify(jobs));
  } catch (error) {
    console.error('Error saving jobs to localStorage:', error);
  }
};

export const JobProvider: React.FC<JobProviderProps> = ({ children }) => {
  // Initialize jobs from localStorage
  const [jobs, setJobs] = useState<Job[]>(loadJobsFromStorage());

  // Save jobs to localStorage whenever they change
  useEffect(() => {
    saveJobsToStorage(jobs);
  }, [jobs]);

  const addJob = (job: Omit<Job, 'createdAt'>) => {
    const newJob = { ...job, createdAt: new Date() };
    setJobs(prevJobs => [...prevJobs, newJob]);
  };

  const updateJob = (id: string, updates: Partial<Job>) => {
    setJobs(prevJobs => 
      prevJobs.map(job => 
        job.id === id ? { ...job, ...updates } : job
      )
    );
  };

  const getJob = (id: string) => {
    return jobs.find(job => job.id === id);
  };

  return (
    <JobContext.Provider value={{ jobs, addJob, updateJob, getJob }}>
      {children}
    </JobContext.Provider>
  );
};

export default JobProvider; 