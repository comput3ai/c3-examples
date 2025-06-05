import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { AppStep } from '../types/index'

interface AppStore {
  // Global state
  apiKey: string | null
  isInitialized: boolean
  currentStep: AppStep
  error: string | null
  
  // Actions
  setApiKey: (key: string) => void
  setCurrentStep: (step: AppStep) => void
  setError: (error: string | null) => void
  nextStep: () => void
  previousStep: () => void
  reset: () => void
  initialize: () => void
  shouldUseDynamicSystem: () => boolean
}

const stepOrder: AppStep[] = ['setup', 'upload', 'mapping', 'workloads', 'generation', 'results']

export const useAppStore = create<AppStore>()(
  persist(
    (set, get) => ({
      // Initial state
      apiKey: null,
      isInitialized: false,
      currentStep: 'setup',
      error: null,

      // Actions
      setApiKey: (key: string) => {
        set({ apiKey: key })
        localStorage.setItem('c3_api_key', key)
      },

      setCurrentStep: (step: AppStep) => {
        set({ currentStep: step, error: null })
      },

      setError: (error: string | null) => {
        set({ error })
      },

      nextStep: () => {
        const { currentStep } = get()
        const currentIndex = stepOrder.indexOf(currentStep)
        
        if (currentIndex < stepOrder.length - 1) {
          let nextStep = stepOrder[currentIndex + 1]
          
          // Skip mapping step if using dynamic CSV system
          if (nextStep === 'mapping') {
            // Check if we're using dynamic system from localStorage or CSV store
            const useDynamicSystem = get().shouldUseDynamicSystem()
            if (useDynamicSystem) {
              // Skip to workloads step
              nextStep = 'workloads'
            }
          }
          
          set({ currentStep: nextStep, error: null })
        }
      },

      previousStep: () => {
        const { currentStep } = get()
        const currentIndex = stepOrder.indexOf(currentStep)
        
        if (currentIndex > 0) {
          let prevStep = stepOrder[currentIndex - 1]
          
          // Skip mapping step when going backwards if using dynamic system
          if (prevStep === 'mapping' && currentStep === 'workloads') {
            const useDynamicSystem = get().shouldUseDynamicSystem()
            if (useDynamicSystem) {
              // Go back to upload step
              prevStep = 'upload'
            }
          }
          
          set({ currentStep: prevStep, error: null })
        }
      },

      // Helper method to check if dynamic system should be used
      shouldUseDynamicSystem: () => {
        try {
          // Check if there's dynamic analysis data in localStorage indicating we're using the new system
          const csvStoreData = localStorage.getItem('csv-store')
          if (csvStoreData) {
            const parsed = JSON.parse(csvStoreData)
            return parsed?.state?.useDynamicSystem !== false
          }
          return true // Default to dynamic system
        } catch {
          return true // Default to dynamic system if can't parse
        }
      },

      reset: () => {
        set({
          currentStep: 'setup',
          error: null,
          isInitialized: false
        })
        localStorage.removeItem('c3_api_key')
      },

      initialize: () => {
        const storedApiKey = localStorage.getItem('c3_api_key')
        if (storedApiKey) {
          set({ 
            apiKey: storedApiKey, 
            isInitialized: true,
            currentStep: 'upload'
          })
        } else {
          set({ isInitialized: true })
        }
      },
    }),
    {
      name: 'card-generator-app',
      partialize: (state) => ({
        apiKey: state.apiKey,
      }),
    }
  )
) 