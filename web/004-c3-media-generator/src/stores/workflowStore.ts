import { create } from 'zustand'
import { WorkflowAnalyzer, type WorkflowTemplate, type WorkflowAnalysis, type ConfigurableParameter } from '../lib/core/workflowAnalyzer'

interface WorkflowStore {
  // Available workflows
  availableWorkflows: WorkflowTemplate[]
  
  // Currently selected workflow
  selectedWorkflow: WorkflowTemplate | null
  currentAnalysis: WorkflowAnalysis | null
  
  // User-configured parameters for current workflow
  configuredParams: Record<string, any>
  
  // Prompt mapping configuration
  promptMapping: Record<string, 'csv' | 'static' | 'negative'>
  
  // Loading state
  isLoading: boolean
  error: string | null
  
  // Actions
  loadBuiltinWorkflows: () => Promise<void>
  selectWorkflow: (workflowId: string) => void
  uploadWorkflow: (file: File, metadata?: { name?: string; description?: string; category?: WorkflowTemplate['category'] }) => Promise<void>
  loadWorkflowFromUrl: (url: string, metadata?: { name?: string; description?: string; category?: WorkflowTemplate['category'] }) => Promise<void>
  removeWorkflow: (workflowId: string) => void
  
  // Parameter configuration
  updateParameter: (paramKey: string, value: any) => void
  resetParameters: () => void
  getUpdatedWorkflow: () => any
  
  // Prompt mapping
  updatePromptMapping: (paramKey: string, mapping: 'csv' | 'static' | 'negative') => void
  getPromptMapping: () => Record<string, 'csv' | 'static' | 'negative'>
  savePromptMapping: () => void
  loadPromptMapping: (workflowId: string) => Record<string, 'csv' | 'static' | 'negative'>
  
  // Validation
  validateCurrentWorkflow: () => { valid: boolean; errors: string[]; warnings: string[] }
}

// Built-in workflow templates
const BUILTIN_WORKFLOWS: Array<{
  name: string
  description: string
  category: WorkflowTemplate['category']
  url: string
  tags: string[]
}> = [
  {
    name: 'Text to Image (HiDream)',
    description: 'Standard text-to-image generation using Stabe Diffusion with HiDream',
    category: 'text-to-image',
    url: '/workflows/text_to_image.json',
    tags: ['basic', 'sd3', 'text-to-image']
  },
  {
    name: 'Image to Image',
    description: 'Transform existing images with AI-powered modifications and style changes',
    category: 'image-to-image',
    url: '/workflows/image-to-image.json',
    tags: ['img2img', 'transformation', 'style-transfer']
  },
  {
    name: 'Text to Video',
    description: 'Generate videos from text prompts using the Wan2.1 model',
    category: 'custom',
    url: '/workflows/text-to-video.json',
    tags: ['video', 'text-to-video', 'wanvideo', 'animation']
  },
  {
    name: 'Image to Video',
    description: 'Animate static images into dynamic videos with AI',
    category: 'custom',
    url: '/workflows/image-to-video.json',
    tags: ['video', 'image-to-video', 'animation', 'motion']
  },
  {
    name: 'Avatar Generation',
    description: 'Create animated avatars with facial expressions and audio sync using SONIC',
    category: 'custom',
    url: '/workflows/avatar.json',
    tags: ['avatar', 'face', 'audio-sync', 'sonic', 'animation']
  }
]

export const useWorkflowStore = create<WorkflowStore>((set, get) => {
  const analyzer = new WorkflowAnalyzer()
  
  return {
    // Initial state
    availableWorkflows: [],
    selectedWorkflow: null,
    currentAnalysis: null,
    configuredParams: {},
    promptMapping: {},
    isLoading: false,
    error: null,

    loadBuiltinWorkflows: async () => {
      set({ isLoading: true, error: null })
      
      try {
        const workflows: WorkflowTemplate[] = []
        const loadErrors: string[] = []
        
        console.log(`🚀 Starting to load ${BUILTIN_WORKFLOWS.length} built-in workflows...`)
        
        for (const builtinConfig of BUILTIN_WORKFLOWS) {
          try {
            console.log(`🔄 Loading built-in workflow: ${builtinConfig.name} from ${builtinConfig.url}`)
            
            const response = await fetch(builtinConfig.url)
            if (!response.ok) {
              throw new Error(`HTTP ${response.status}: ${response.statusText}`)
            }
            
            const workflowData = await response.json()
            console.log(`📊 Analyzing workflow data for ${builtinConfig.name}...`)
            
            const analysis = analyzer.analyzeWorkflow(workflowData, builtinConfig.name)
            
            if (!analysis.hasValidStructure) {
              throw new Error(`Invalid structure: ${analysis.errors.join(', ')}`)
            }
            
            const template = analyzer.createWorkflowTemplate(analysis, workflowData, {
              category: builtinConfig.category,
              tags: builtinConfig.tags,
              workflowUrl: builtinConfig.url,
              author: 'Built-in'
            })
            
            template.name = builtinConfig.name
            template.description = builtinConfig.description
            
            workflows.push(template)
            console.log(`✅ Successfully loaded: ${builtinConfig.name} (${analysis.configurableParams.length} parameters, ${analysis.warnings.length} warnings)`)
            
            if (analysis.warnings.length > 0) {
              console.warn(`⚠️ Warnings for ${builtinConfig.name}:`, analysis.warnings)
            }
            
          } catch (error) {
            const errorMsg = `${builtinConfig.name}: ${error instanceof Error ? error.message : 'Unknown error'}`
            loadErrors.push(errorMsg)
            console.error(`❌ Failed to load ${builtinConfig.name}:`, error)
          }
        }
        
        console.log(`🎯 Workflow loading complete: ${workflows.length}/${BUILTIN_WORKFLOWS.length} successful`)
        if (loadErrors.length > 0) {
          console.warn(`⚠️ Failed workflows:`, loadErrors)
        }
        
        set({ 
          availableWorkflows: workflows,
          isLoading: false,
          error: loadErrors.length > 0 ? `Some workflows failed to load: ${loadErrors.join('; ')}` : null
        })
        
        // Auto-select first workflow if none selected
        if (workflows.length > 0 && !get().selectedWorkflow) {
          get().selectWorkflow(workflows[0].id)
        }
        
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error'
        console.error('❌ Critical failure in workflow loading:', errorMessage)
        set({ 
          isLoading: false, 
          error: `Critical failure: ${errorMessage}`
        })
      }
    },

    selectWorkflow: (workflowId: string) => {
      const { availableWorkflows } = get()
      const workflow = availableWorkflows.find(w => w.id === workflowId)
      
      if (workflow) {
        const analysis = analyzer.analyzeWorkflow(workflow.workflowData, workflow.name)
        
        // Initialize configured params with current values
        const configuredParams: Record<string, any> = {}
        analysis.configurableParams.forEach(param => {
          const paramKey = `${param.nodeId}.${param.inputName}`
          configuredParams[paramKey] = param.currentValue
        })
        
        // Load saved prompt mapping or initialize with auto-detection
        const savedMapping = get().loadPromptMapping(workflowId)
        let promptMapping = savedMapping
        
        if (Object.keys(savedMapping).length === 0) {
          // Auto-initialize prompt mapping for new workflows - start with all static
          promptMapping = {}
          analysis.configurableParams
            .filter(p => p.paramType === 'prompt')
            .forEach(param => {
              const paramKey = `${param.nodeId}.${param.inputName}`
              promptMapping[paramKey] = 'static'  // Default all to static, user can configure
            })
        }
        
        set({ 
          selectedWorkflow: workflow,
          currentAnalysis: analysis,
          configuredParams,
          promptMapping,
          error: null
        })
        
        console.log(`🎯 Selected workflow: ${workflow.name}`)
        console.log(`📋 Prompt mapping: ${Object.entries(promptMapping).map(([k, v]) => `${k}=${v}`).join(', ')}`)
      }
    },

    uploadWorkflow: async (file: File, metadata = {}) => {
      set({ isLoading: true, error: null })
      
      try {
        console.log(`📤 Uploading workflow file: ${file.name}`)
        
        const text = await file.text()
        const workflowData = JSON.parse(text)
        
        const analysis = analyzer.analyzeWorkflow(workflowData, metadata.name || file.name)
        
        if (!analysis.hasValidStructure) {
          throw new Error(`Invalid workflow: ${analysis.errors.join(', ')}`)
        }
        
        const template = analyzer.createWorkflowTemplate(analysis, workflowData, {
          category: metadata.category || 'custom',
          author: 'User Upload'
        })
        
        if (metadata.name) template.name = metadata.name
        if (metadata.description) template.description = metadata.description
        
        const { availableWorkflows } = get()
        const updatedWorkflows = [...availableWorkflows, template]
        
        set({ 
          availableWorkflows: updatedWorkflows,
          isLoading: false
        })
        
        // Auto-select the uploaded workflow
        get().selectWorkflow(template.id)
        
        console.log(`✅ Uploaded workflow: ${template.name} (${analysis.configurableParams.length} parameters)`)
        
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to upload workflow'
        console.error('❌ Upload failed:', errorMessage)
        set({ 
          isLoading: false, 
          error: errorMessage 
        })
        throw error
      }
    },

    loadWorkflowFromUrl: async (url: string, metadata = {}) => {
      set({ isLoading: true, error: null })
      
      try {
        console.log(`🌐 Loading workflow from URL: ${url}`)
        
        const response = await fetch(url)
        if (!response.ok) {
          throw new Error(`Failed to load workflow: ${response.status} - ${response.statusText}`)
        }
        
        const workflowData = await response.json()
        const analysis = analyzer.analyzeWorkflow(workflowData, metadata.name)
        
        if (!analysis.hasValidStructure) {
          throw new Error(`Invalid workflow: ${analysis.errors.join(', ')}`)
        }
        
        const template = analyzer.createWorkflowTemplate(analysis, workflowData, {
          category: metadata.category || 'custom',
          workflowUrl: url,
          author: 'External'
        })
        
        if (metadata.name) template.name = metadata.name
        if (metadata.description) template.description = metadata.description
        
        const { availableWorkflows } = get()
        const updatedWorkflows = [...availableWorkflows, template]
        
        set({ 
          availableWorkflows: updatedWorkflows,
          isLoading: false
        })
        
        // Auto-select the loaded workflow
        get().selectWorkflow(template.id)
        
        console.log(`✅ Loaded workflow from URL: ${template.name}`)
        
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to load workflow'
        console.error('❌ URL load failed:', errorMessage)
        set({ 
          isLoading: false, 
          error: errorMessage 
        })
        throw error
      }
    },

    removeWorkflow: (workflowId: string) => {
      const { availableWorkflows, selectedWorkflow } = get()
      const updatedWorkflows = availableWorkflows.filter(w => w.id !== workflowId)
      
      let newSelectedWorkflow = selectedWorkflow
      if (selectedWorkflow?.id === workflowId) {
        newSelectedWorkflow = updatedWorkflows.length > 0 ? updatedWorkflows[0] : null
      }
      
      set({ 
        availableWorkflows: updatedWorkflows,
        selectedWorkflow: newSelectedWorkflow
      })
      
      if (newSelectedWorkflow && newSelectedWorkflow.id !== workflowId) {
        get().selectWorkflow(newSelectedWorkflow.id)
      }
    },

    updateParameter: (paramKey: string, value: any) => {
      const { configuredParams } = get()
      set({
        configuredParams: {
          ...configuredParams,
          [paramKey]: value
        }
      })
    },

    resetParameters: () => {
      const { currentAnalysis } = get()
      if (!currentAnalysis) return
      
      const configuredParams: Record<string, any> = {}
      currentAnalysis.configurableParams.forEach(param => {
        const paramKey = `${param.nodeId}.${param.inputName}`
        configuredParams[paramKey] = param.currentValue
      })
      
      set({ configuredParams })
    },

    getUpdatedWorkflow: () => {
      const { selectedWorkflow, configuredParams } = get()
      if (!selectedWorkflow) return null
      
      return analyzer.updateWorkflowParameters(selectedWorkflow.workflowData, configuredParams)
    },

    validateCurrentWorkflow: () => {
      const { selectedWorkflow } = get()
      if (!selectedWorkflow) {
        return { valid: false, errors: ['No workflow selected'], warnings: [] }
      }
      
      const updatedWorkflow = get().getUpdatedWorkflow()
      if (!updatedWorkflow) {
        return { valid: false, errors: ['Failed to update workflow'], warnings: [] }
      }
      
      const analysis = analyzer.analyzeWorkflow(updatedWorkflow)
      return {
        valid: analysis.hasValidStructure,
        errors: analysis.errors,
        warnings: analysis.warnings
      }
    },

    updatePromptMapping: (paramKey: string, mapping: 'csv' | 'static' | 'negative') => {
      const { promptMapping } = get()
      const updatedMapping = {
        ...promptMapping,
        [paramKey]: mapping
      }
      
      set({
        promptMapping: updatedMapping
      })
      
      // Auto-save after update
      setTimeout(() => {
        get().savePromptMapping()
      }, 100)
    },

    getPromptMapping: () => {
      const { promptMapping } = get()
      return promptMapping
    },

    savePromptMapping: () => {
      const { selectedWorkflow, promptMapping } = get()
      if (!selectedWorkflow) return

      try {
        const key = `workflow-prompt-mapping-${selectedWorkflow.id}`
        localStorage.setItem(key, JSON.stringify(promptMapping))
        console.log(`💾 Saved prompt mapping for workflow: ${selectedWorkflow.name}`)
      } catch (error) {
        console.warn('⚠️ Failed to save prompt mapping:', error)
      }
    },

    loadPromptMapping: (workflowId: string) => {
      try {
        const key = `workflow-prompt-mapping-${workflowId}`
        const saved = localStorage.getItem(key)
        if (saved) {
          const promptMapping = JSON.parse(saved)
          set({ promptMapping })
          console.log(`📖 Loaded prompt mapping for workflow: ${workflowId}`)
          return promptMapping
        }
      } catch (error) {
        console.warn('⚠️ Failed to load prompt mapping:', error)
      }
      return {}
    }
  }
})

// Initialize workflows on store creation
useWorkflowStore.getState().loadBuiltinWorkflows() 