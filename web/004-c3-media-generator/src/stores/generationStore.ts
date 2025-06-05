import { create } from 'zustand'
import { ComfyUIClient } from '../lib/api/comfyui'
import { createPromptForCard } from '../lib/core/promptBuilder'
import { useAppStore } from './appStore'
import { useTemplateStore } from './templateStore'
import { imageCache, type CachedImage, type BatchInfo } from '../lib/core/imageCache'
import type { CardData, GenerationJob, GenerationParams, GenerationResult, GenerationError, Workload } from '../types/index'

interface GenerationStore {
  // State
  jobs: GenerationJob[]
  results: GenerationResult[]
  errors: GenerationError[]
  isGenerating: boolean
  currentBatchId: string | null
  progress: {
    total: number
    completed: number
    failed: number
    inProgress: number
  }
  
  // Workflow loading
  workflow: any | null
  workflowLoaded: boolean
  workflowError: string | null
  workflowConfig: any | null
  
  // Actions
  loadWorkflow: (workflowUrl: string) => Promise<void>
  startGeneration: (cards: CardData[], workloads: Workload[], params: GenerationParams, workflowConfig?: any) => Promise<void>
  stopGeneration: () => void
  retryFailedJobs: () => Promise<void>
  downloadResults: () => Promise<void>
  reset: () => void
  
  // Image caching actions
  getBatchHistory: () => Promise<BatchInfo[]>
  loadBatchImages: (batchId: string) => Promise<CachedImage[]>
  deleteBatch: (batchId: string) => Promise<void>
  
  // Internal
  processJob: (job: GenerationJob, workload: Workload, params: GenerationParams) => Promise<void>
  updateJobStatus: (jobId: string, status: GenerationJob['status'], error?: string) => void
  cacheCompletedImage: (job: GenerationJob, imageUrl: string, prompts: { positive: string; negative: string }, params: GenerationParams, seed: number) => Promise<void>
}

export const useGenerationStore = create<GenerationStore>((set, get) => ({
  // Initial state
  jobs: [],
  results: [],
  errors: [],
  isGenerating: false,
  currentBatchId: null,
  progress: {
    total: 0,
    completed: 0,
    failed: 0,
    inProgress: 0
  },
  
  // Workflow state
  workflow: null,
  workflowLoaded: false,
  workflowError: null,
  workflowConfig: null,

  updateJobStatus: (jobId: string, status: GenerationJob['status'], error?: string) => {
    set(state => {
      const jobs = state.jobs.map(job => 
        job.id === jobId ? { ...job, status, error } : job
      )
      
      const progress = {
        total: jobs.length,
        completed: jobs.filter(j => j.status === 'completed').length,
        failed: jobs.filter(j => j.status === 'failed').length,
        inProgress: jobs.filter(j => j.status === 'processing').length
      }
      
      return { jobs, progress }
    })
  },

  loadWorkflow: async (workflowUrl: string) => {
    try {
      set({ workflowLoaded: false, workflowError: null })
      console.log(`🔄 Loading workflow from: ${workflowUrl}`)
      
      // Create a temporary client to load the workflow
      const tempClient = new ComfyUIClient('https://example.com') // URL doesn't matter for loading
      const workflow = await tempClient.loadWorkflow(workflowUrl)
      
      // Validate the loaded workflow
      const validation = tempClient.validateWorkflow(workflow)
      if (!validation.valid) {
        throw new Error(`Invalid workflow: ${validation.errors.join(', ')}`)
      }
      
      if (validation.warnings.length > 0) {
        console.warn('⚠️ Workflow warnings:', validation.warnings.join(', '))
      }
      
      set({ 
        workflow, 
        workflowLoaded: true, 
        workflowError: null 
      })
      
      console.log('✅ Workflow loaded and validated successfully')
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      console.error('❌ Failed to load workflow:', errorMessage)
      set({ 
        workflow: null, 
        workflowLoaded: false, 
        workflowError: errorMessage 
      })
      throw error
    }
  },

  processJob: async (job: GenerationJob, workload: Workload, params: GenerationParams) => {
    const { updateJobStatus, workflow, workflowConfig } = get()
    
    try {
      updateJobStatus(job.id, 'processing')
      
      if (!workflow) {
        throw new Error('No workflow loaded')
      }
      
      // Get the API key from the app store
      const apiKey = useAppStore.getState().apiKey
      if (!apiKey) {
        throw new Error('No API key available. Please set your C3 API key in the setup step.')
      }
      
      // Create ComfyUI client for this workload with API key
      // For ComfyUI calls, we need to add "ui-" prefix to the node name
      const nodeUrl = `https://ui-${workload.node}`
      const client = new ComfyUIClient(nodeUrl, apiKey)
      
      console.log(`🔗 Connecting to ComfyUI at: ${nodeUrl}`)
      
      // Test connection first
      const isConnected = await client.testConnection()
      if (!isConnected) {
        throw new Error(`Cannot connect to ComfyUI on ui-${workload.node}`)
      }

      // Generate prompt for this card using the latest templates from the store
      const templateStore = useTemplateStore.getState()
      const currentTemplates = templateStore.getEffectiveTemplates()
      const promptData = createPromptForCard(job.card, params, currentTemplates, templateStore.conditionalEnhancements)
      
      console.log(`🚀 Starting generation for "${job.card.name}" on ui-${workload.node}`)
      console.log(`📝 Positive prompt: ${promptData.positive.slice(0, 100)}...`)
      console.log(`📝 Negative prompt: ${promptData.negative.slice(0, 100)}...`)
      
      let updatedWorkflow: any
      
      if (workflowConfig) {
        console.log(`🎬 Using custom workflow with prompt mapping`)
        console.log(`📋 Prompt mapping:`, workflowConfig.promptMapping)
        
        // Use custom workflow exactly as-is, only updating prompts based on mapping
        updatedWorkflow = JSON.parse(JSON.stringify(workflowConfig.workflow)) // Deep clone the original workflow
        
        // Apply prompt mapping from the workflow configuration
        if (workflowConfig.promptMapping && updatedWorkflow.nodes) {
          Object.entries(workflowConfig.promptMapping).forEach(([paramKey, mapping]) => {
            const [nodeId, inputName] = paramKey.split('.')
            
            // Find the node
            const node = updatedWorkflow.nodes.find((n: any) => String(n.id) === nodeId)
            if (node) {
              let promptText = ''
              
              // Determine which prompt to use based on mapping
              if (mapping === 'csv') {
                promptText = promptData.positive
              } else if (mapping === 'negative') {
                promptText = promptData.negative
              } else {
                // For 'static' mapping, keep the original value
                return
              }
              
              // Update the node based on its type
              if (node.type === 'CLIPTextEncode') {
                // For CLIPTextEncode nodes, update widgets_values[0]
                if (!node.widgets_values) node.widgets_values = ['']
                node.widgets_values[0] = promptText
                console.log(`🟢 Updated CLIPTextEncode node ${nodeId}.${inputName}: ${promptText.slice(0, 50)}...`)
              } else if (node.type === 'WanVideoTextEncode') {
                // For WanVideoTextEncode nodes, update the appropriate input
                if (!node.widgets_values) node.widgets_values = ['', '']
                if (inputName === 'positive_prompt') {
                  node.widgets_values[0] = promptText
                } else if (inputName === 'negative_prompt') {
                  node.widgets_values[1] = promptText
                }
                console.log(`🟢 Updated WanVideoTextEncode node ${nodeId}.${inputName}: ${promptText.slice(0, 50)}...`)
              }
            } else {
              console.warn(`⚠️ Node ${nodeId} not found in workflow`)
            }
          })
        }
        
        // Update seed in the appropriate sampler node
        if (updatedWorkflow.nodes) {
          // For video workflows, update WanVideoSampler (node 27)
          const videoSamplerNode = updatedWorkflow.nodes.find((n: any) => n.type === 'WanVideoSampler')
          if (videoSamplerNode && videoSamplerNode.widgets_values && videoSamplerNode.widgets_values.length > 3) {
            videoSamplerNode.widgets_values[3] = promptData.seed
            console.log(`🌱 Updated WanVideoSampler seed: ${promptData.seed}`)
          }
          
          // For image workflows, update KSampler (node 82)
          const imageSamplerNode = updatedWorkflow.nodes.find((n: any) => n.type === 'KSampler')
          if (imageSamplerNode && imageSamplerNode.widgets_values && imageSamplerNode.widgets_values.length > 0) {
            imageSamplerNode.widgets_values[0] = promptData.seed
            console.log(`🌱 Updated KSampler seed: ${promptData.seed}`)
          }
        }
        
        console.log(`🎯 Custom workflow updated with user prompts and parameters`)
        
      } else {
        // Detect workflow type to use appropriate update function
        const isVideoWorkflow = workflow.nodes?.some((node: any) => 
          ['WanVideoTextEncode', 'WanVideoSampler', 'WanVideoModelLoader', 'VHS_VideoCombine'].includes(node.type)
        )
        
        if (isVideoWorkflow) {
          console.log('🎬 Detected video workflow, using video-specific update function')
          // Use video workflow update with video-specific parameters
          updatedWorkflow = client.updateTextToVideoWorkflow(
            workflow,
            promptData.positive,
            promptData.negative,
            params.width || 832,    // Default video width
            params.height || 480,   // Default video height
            81,                     // Default frames
            promptData.seed,
            params.steps || 25,     // Default video steps
            params.guidance || 6,   // Default video CFG
            16                      // Default frame rate
          )
        } else {
          console.log('🖼️ Detected image workflow, using image-specific update function')
          // Use default text-to-image workflow update
          updatedWorkflow = client.updateTextToImageWorkflow(
            workflow,
            promptData.positive,
            promptData.negative,
            params.width,
            params.height,
            promptData.seed,
            params.steps
          )
        }
      }
      
      // Queue the workflow
      const promptId = await client.queueWorkflow(updatedWorkflow)
      
      // Update job with prompt ID
      set(state => ({
        jobs: state.jobs.map(j => 
          j.id === job.id ? { ...j, promptId } : j
        )
      }))

      console.log(`⏳ Waiting for completion: "${job.card.name}" (prompt ID: ${promptId})`)
      
      // Wait for workflow completion with status updates
      const success = await client.waitForWorkflowCompletion(
        promptId,
        15, // 15 minute timeout
        (status) => {
          // Update job status in real-time
          set(state => ({
            jobs: state.jobs.map(j => 
              j.id === job.id ? { ...j, statusMessage: status } : j
            )
          }))
        }
      )
      
      if (!success) {
        throw new Error('Workflow processing failed or timed out')
      }
      
      // Get output files
      const outputFiles = await client.getOutputFiles(promptId)
      
      if (outputFiles.length === 0) {
        throw new Error('No output files generated')
      }

      // Detect if this is a video workflow based on current workflow
      const isVideoWorkflow = workflow.nodes?.some((node: any) => 
        ['WanVideoTextEncode', 'WanVideoSampler', 'WanVideoModelLoader', 'VHS_VideoCombine'].includes(node.type)
      )
      
      let filesToProcess = []
      
      if (isVideoWorkflow) {
        // For video workflows, look for video files from VHS_VideoCombine (node 30)
        const videoFiles = outputFiles.filter(f => f.type === 'video' || f.filename.endsWith('.mp4'))
        const node30Videos = videoFiles.filter(f => f.node_id === '30')
        filesToProcess = node30Videos.length > 0 ? node30Videos : videoFiles
        
        if (filesToProcess.length === 0) {
          throw new Error('No video files found in output')
        }
        console.log(`🎬 Found ${filesToProcess.length} video output(s) for processing`)
      } else {
        // For image workflows, look for images from SaveImage (node 9)
        const imageFiles = outputFiles.filter(f => f.type === 'image')
        const node9Images = imageFiles.filter(f => f.node_id === '9')
        filesToProcess = node9Images.length > 0 ? node9Images : imageFiles
        
        if (filesToProcess.length === 0) {
          throw new Error('No images found in output')
        }
        console.log(`🖼️ Found ${filesToProcess.length} image output(s) for processing`)
      }
      
      // Process each output file (typically just one)
      for (const outputFile of filesToProcess) {
        try {
          // Download the file blob (image or video)
          const fileBlob = await client.getImage(outputFile.filename) // This method works for both images and videos
          const fileUrl = URL.createObjectURL(fileBlob)
          
          // Create result
          const result: GenerationResult = {
            jobId: job.id,
            cardName: job.card.name,
            imageUrl: fileUrl,     // For backward compatibility
            imageBlob: fileBlob,   // For backward compatibility  
            mediaUrl: fileUrl,     // New generic field
            mediaBlob: fileBlob,   // New generic field
            type: isVideoWorkflow ? 'video' : 'image',  // Indicate the media type
            prompt: promptData.positive,
            seed: promptData.seed,
            nodeId: outputFile.node_id,
            filename: outputFile.filename
          }
          
          // Add to results
          set(state => ({
            results: [...state.results, result]
          }))
          
          // Update job with file URL for preview
          set(state => ({
            jobs: state.jobs.map(j => 
              j.id === job.id ? { ...j, imageUrl: result.imageUrl } : j
            )
          }))
          
          console.log(`✅ Completed "${job.card.name}" on ui-${workload.node} - ${isVideoWorkflow ? 'Video' : 'Image'} generated`)
          updateJobStatus(job.id, 'completed')
          return // Success, exit early
          
        } catch (downloadError) {
          console.warn(`⚠️ Failed to download ${isVideoWorkflow ? 'video' : 'image'} ${outputFile.filename}:`, downloadError)
          // Continue to try other files if available
        }
      }
      
      // If we get here, all file downloads failed
      throw new Error(`Failed to download any generated ${isVideoWorkflow ? 'videos' : 'images'}`)
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      console.error(`❌ Failed "${job.card.name}" on ui-${workload.node}:`, errorMessage)
      
      // Add to errors
      const generationError: GenerationError = {
        jobId: job.id,
        cardName: job.card.name,
        error: errorMessage,
        retryCount: 0
      }
      
      set(state => ({
        errors: [...state.errors, generationError]
      }))
      
      updateJobStatus(job.id, 'failed', errorMessage)
    }
  },

  startGeneration: async (cards: CardData[], workloads: Workload[], params: GenerationParams, workflowConfig?: any) => {
    const { workflow, processJob } = get()
    
    // Use custom workflow if provided, otherwise fall back to default workflow
    const activeWorkflow = workflowConfig?.workflow || workflow
    const workflowName = workflowConfig ? workflowConfig.analysis.name : 'Default'
    
    if (!activeWorkflow) {
      throw new Error('No workflow loaded. Please load a workflow first.')
    }
    
    if (workloads.length === 0) {
      throw new Error('No workloads available for generation')
    }

    // Check if API key is available
    const apiKey = useAppStore.getState().apiKey
    if (!apiKey) {
      throw new Error('No API key available. Please set your C3 API key in the setup step.')
    }

    // Create batch ID for this generation session
    const batchId = `batch_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    const batchName = `Generation ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}`

    // Store the workflow config in the generation state for job processing
    set(state => ({ 
      ...state, 
      workflow: activeWorkflow,
      workflowConfig: workflowConfig || null 
    }))

    // Create jobs for each card
    const jobs: GenerationJob[] = cards.map((card, index) => ({
      id: `job_${Date.now()}_${index}`,
      card,
      workloadId: workloads[index % workloads.length].id, // Round-robin distribution
      status: 'pending',
      createdAt: Date.now()
    }))

    set({
      jobs,
      results: [],
      errors: [],
      isGenerating: true,
      currentBatchId: batchId,
      progress: {
        total: jobs.length,
        completed: 0,
        failed: 0,
        inProgress: 0
      }
    })

    // Create batch info for caching
    const batchInfo: BatchInfo = {
      id: batchId,
      name: batchName,
      timestamp: Date.now(),
      totalCards: jobs.length,
      completedCards: 0,
      images: [],
      status: 'partial'
    }

    // Save initial batch to cache
    await imageCache.saveBatch(batchInfo)

    console.log(`🚀 Starting generation of ${jobs.length} cards across ${workloads.length} GPUs`)
    console.log(`📋 Using workflow: ${workflowName} with ${activeWorkflow.nodes?.length || 'unknown'} nodes`)
    if (workflowConfig) {
      console.log(`🎬 Custom workflow prompt mapping:`, workflowConfig.promptMapping)
    }
    console.log(`🔑 Using API key: ${apiKey.slice(0, 8)}...`)
    console.log(`📦 Batch created: ${batchName} (${batchId})`)

    // Process jobs in parallel across workloads
    const promises: Promise<void>[] = []

    // Group jobs by workload for parallel processing
    const jobsByWorkload = new Map<string, GenerationJob[]>()
    jobs.forEach(job => {
      const workloadId = job.workloadId
      if (!jobsByWorkload.has(workloadId)) {
        jobsByWorkload.set(workloadId, [])
      }
      jobsByWorkload.get(workloadId)!.push(job)
    })

    // Start processing each workload's jobs
    for (const [workloadId, workloadJobs] of jobsByWorkload) {
      const workload = workloads.find(w => w.id === workloadId)
      if (!workload) continue

      // Process jobs sequentially on each workload to avoid overloading
      const workloadPromise = (async () => {
        for (const job of workloadJobs) {
          // Check if generation was stopped
          if (!get().isGenerating) {
            console.log(`🛑 Generation stopped, skipping remaining jobs for workload ${workload.node}`)
            break
          }
          
          await processJob(job, workload, params)
          
          // After processing, cache the image if successful
          const { results } = get()
          const result = results.find(r => r.jobId === job.id)
          if (result) {
            try {
              const templateStore = useTemplateStore.getState()
              const currentTemplates = templateStore.getEffectiveTemplates()
              const promptData = createPromptForCard(job.card, params, currentTemplates, templateStore.conditionalEnhancements)
              await get().cacheCompletedImage(job, result.imageUrl, {
                positive: promptData.positive,
                negative: promptData.negative
              }, params, promptData.seed)
              
              // Update batch progress
              const currentBatch = await imageCache.getBatches()
              const batch = currentBatch.find(b => b.id === batchId)
              if (batch) {
                batch.completedCards++
                batch.images.push(job.id)
                await imageCache.saveBatch(batch)
              }
            } catch (cacheError) {
              console.warn('⚠️ Failed to cache image:', cacheError)
            }
          }
        }
      })()

      promises.push(workloadPromise)
    }

    // Wait for all jobs to complete
    try {
      await Promise.allSettled(promises)
      
      // Update final batch status
      const { progress } = get()
      const finalBatch: BatchInfo = {
        ...batchInfo,
        completedCards: progress.completed,
        status: progress.failed > 0 ? 'partial' : 'completed'
      }
      await imageCache.saveBatch(finalBatch)
      
      console.log(`📦 Batch completed: ${progress.completed}/${progress.total} successful`)
    } finally {
      set({ isGenerating: false, currentBatchId: null })
      console.log('🏁 Generation batch completed')
    }
  },

  stopGeneration: () => {
    set({ isGenerating: false })
    console.log('🛑 Generation stopped by user')
  },

  retryFailedJobs: async () => {
    const { jobs, errors, processJob } = get()
    const { startGeneration } = get()
    
    // Get failed jobs
    const failedJobs = jobs.filter(job => job.status === 'failed')
    
    if (failedJobs.length === 0) {
      console.log('No failed jobs to retry')
      return
    }
    
    console.log(`🔄 Retrying ${failedJobs.length} failed jobs`)
    
    // Clear previous errors for these jobs
    set(state => ({
      errors: state.errors.filter(error => 
        !failedJobs.some(job => job.id === error.jobId)
      )
    }))
    
    // Reset job statuses to pending
    set(state => ({
      jobs: state.jobs.map(job => 
        failedJobs.some(failedJob => failedJob.id === job.id) 
          ? { ...job, status: 'pending' as const, error: undefined }
          : job
      )
    }))
    
    // Note: This is a simplified retry - in a real implementation,
    // you'd want to restart the generation process properly
    console.log('⚠️ Retry functionality needs full implementation')
  },

  downloadResults: async () => {
    const { results } = get()
    
    if (results.length === 0) {
      console.log('No results to download')
      return
    }
    
    console.log(`📥 Creating ZIP archive with ${results.length} results`)
    
    try {
      // Dynamic import of JSZip
      const JSZip = (await import('jszip')).default
      const zip = new JSZip()
      
      // Add each result to the ZIP
      for (const result of results) {
        try {
          if (result.mediaBlob || result.imageBlob) {
            const blob = result.mediaBlob || result.imageBlob
            const extension = result.type === 'video' ? 'mp4' : 'png'
            const filename = `${result.cardName.replace(/[^a-zA-Z0-9]/g, '_')}_${result.seed}.${extension}`
            zip.file(filename, blob)
            console.log(`✅ Added to ZIP: ${filename}`)
          }
        } catch (error) {
          console.error(`❌ Failed to add ${result.cardName} to ZIP:`, error)
        }
      }
      
      // Generate ZIP blob
      const zipBlob = await zip.generateAsync({ type: 'blob' })
      
      // Create download link
      const link = document.createElement('a')
      link.href = URL.createObjectURL(zipBlob)
      link.download = `generation_results_${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.zip`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      
      console.log('📥 ZIP download completed')
    } catch (error) {
      console.error('❌ Failed to create ZIP download:', error)
      
      // Fallback to individual downloads
      console.log('📥 Falling back to individual downloads')
      for (const result of results) {
        try {
          const link = document.createElement('a')
          link.href = result.imageUrl
          const extension = result.type === 'video' ? 'mp4' : 'png'
          link.download = `${result.cardName.replace(/[^a-zA-Z0-9]/g, '_')}_${result.seed}.${extension}`
          document.body.appendChild(link)
          link.click()
          document.body.removeChild(link)
          
          console.log(`✅ Downloaded: ${result.cardName}`)
        } catch (error) {
          console.error(`❌ Failed to download ${result.cardName}:`, error)
        }
      }
    }
  },

  reset: () => {
    set({
      jobs: [],
      results: [],
      errors: [],
      isGenerating: false,
      progress: {
        total: 0,
        completed: 0,
        failed: 0,
        inProgress: 0
      }
    })
    console.log('🔄 Generation store reset')
  },

  getBatchHistory: async () => {
    return imageCache.getBatches()
  },

  loadBatchImages: async (batchId: string) => {
    return imageCache.getBatchImages(batchId)
  },

  deleteBatch: async (batchId: string) => {
    return imageCache.deleteBatch(batchId)
  },

  cacheCompletedImage: async (job: GenerationJob, imageUrl: string, prompts: { positive: string; negative: string }, params: GenerationParams, seed: number) => {
    const { currentBatchId, results } = get()
    if (!currentBatchId) return

    // Find the result to get the media type
    const result = results.find(r => r.jobId === job.id)

    const cachedImage: CachedImage = {
      id: job.id,
      url: imageUrl,
      cardName: job.card.name,
      prompts,
      // Store complete original card data
      originalCard: job.card,
      // Store original job timing
      jobTiming: {
        createdAt: job.createdAt,
        completedAt: job.completedAt || Date.now()
      },
      metadata: {
        cardType: job.card.card_type,
        rarity: job.card.rarity,
        seed: seed,
        steps: params.steps,
        guidance: params.guidance,
        model: params.model,
        type: result?.type || 'image',  // Include media type
        timestamp: Date.now(),  // When cached, not when generated
        batchId: currentBatchId
      }
    }

    return imageCache.cacheImage(imageUrl, cachedImage)
  }
}))

export default useGenerationStore 