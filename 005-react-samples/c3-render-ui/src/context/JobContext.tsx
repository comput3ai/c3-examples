import React, { createContext, useContext, useState, ReactNode } from 'react';

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

export const JobProvider: React.FC<JobProviderProps> = ({ children }) => {
  const [jobs, setJobs] = useState<Job[]>([]);

  const addJob = (job: Omit<Job, 'createdAt'>) => {
    setJobs(prevJobs => [
      ...prevJobs,
      { ...job, createdAt: new Date() }
    ]);
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