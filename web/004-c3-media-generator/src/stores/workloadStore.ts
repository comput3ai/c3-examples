import { create } from 'zustand'
import { Comput3Client } from '../lib/api/comput3'
import type { Workload, WorkloadSummary } from '../types/index'

interface WorkloadStore {
  // State
  workloads: Workload[]
  isLoading: boolean
  error: string | null
  lastFetched: number | null
  
  // Computed state (updated when workloads change)
  healthyWorkloads: Workload[]
  mediaWorkloads: Workload[]
  
  // Actions
  fetchWorkloads: (apiKey: string) => Promise<void>
  launchWorkload: (apiKey: string, type?: string, duration?: number) => Promise<string>
  stopWorkload: (apiKey: string, workloadId: string) => Promise<void>
  getSummary: () => WorkloadSummary
  reset: () => void
  updateComputedValues: (workloads: Workload[]) => { healthyWorkloads: Workload[], mediaWorkloads: Workload[] }
}

export const useWorkloadStore = create<WorkloadStore>((set, get) => ({
  // Initial state
  workloads: [],
  isLoading: false,
  error: null,
  lastFetched: null,
  healthyWorkloads: [],
  mediaWorkloads: [],

  // Helper to update computed values
  updateComputedValues: (workloads: Workload[]) => {
    const healthyWorkloads = workloads.filter(w => w.status === 'healthy')
    const mediaWorkloads = workloads.filter(w => w.type?.startsWith('media'))
    
    return { healthyWorkloads, mediaWorkloads }
  },

  // Actions
  fetchWorkloads: async (apiKey: string) => {
    if (!apiKey) {
      set({ error: 'API key is required' })
      return
    }

    set({ isLoading: true, error: null })
    
    try {
      const client = new Comput3Client(apiKey)
      const workloads = await client.getRunningWorkloads()
      
      // Calculate computed values
      const { healthyWorkloads, mediaWorkloads } = get().updateComputedValues(workloads)
      
      set({ 
        workloads, 
        healthyWorkloads,
        mediaWorkloads,
        isLoading: false, 
        lastFetched: Date.now(),
        error: null 
      })
    } catch (error) {
      set({ 
        isLoading: false, 
        error: error instanceof Error ? error.message : 'Failed to fetch workloads'
      })
    }
  },

  launchWorkload: async (apiKey: string, type = 'media:fast', duration = 10) => {
    if (!apiKey) {
      throw new Error('API key is required')
    }

    set({ isLoading: true, error: null })
    
    try {
      const client = new Comput3Client(apiKey)
      const workloadId = await client.launchWorkload(type, duration)
      
      // Refresh workloads list
      await get().fetchWorkloads(apiKey)
      
      return workloadId
    } catch (error) {
      set({ 
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to launch workload'
      })
      throw error
    }
  },

  stopWorkload: async (apiKey: string, workloadId: string) => {
    if (!apiKey) {
      throw new Error('API key is required')
    }

    set({ isLoading: true, error: null })
    
    try {
      const client = new Comput3Client(apiKey)
      await client.stopWorkload(workloadId)
      
      // Refresh workloads list
      await get().fetchWorkloads(apiKey)
    } catch (error) {
      set({ 
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to stop workload'
      })
      throw error
    }
  },

  getSummary: () => {
    const { workloads, mediaWorkloads } = get()
    
    return {
      total_workloads: workloads.length,
      media_workloads: mediaWorkloads.length,
      media_details: mediaWorkloads.map(w => ({
        node: w.node,
        type: w.type,
        id: w.id
      }))
    }
  },

  reset: () => {
    set({
      workloads: [],
      healthyWorkloads: [],
      mediaWorkloads: [],
      isLoading: false,
      error: null,
      lastFetched: null
    })
  },
})) 