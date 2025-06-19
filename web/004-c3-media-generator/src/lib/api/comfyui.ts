import type { ComfyUIPrompt, JobStatus } from '../../types/index'
import type { PromptData } from '../core/promptBuilder'

interface WorkflowValidation {
  valid: boolean
  errors: string[]
  warnings: string[]
}

interface OutputFile {
  node_id: string
  filename: string
  type: string
  subfolder: string
  url: string
}

export class ComfyUIClient {
  private baseUrl: string
  private clientId: string
  private apiKey: string | null = null
  private isProduction: boolean

  constructor(baseUrl: string, apiKey?: string) {
    this.clientId = this.generateClientId()
    this.apiKey = apiKey || null
    
    // Check for environment variable overrides
    const forceDevMode = import.meta.env.VITE_FORCE_DEV_MODE === 'true'
    const customCorsProxy = import.meta.env.VITE_CORS_PROXY
    
    // Use environment variables or auto-detect
    this.isProduction = forceDevMode ? false : (window.location.hostname !== 'localhost' && !window.location.hostname.includes('127.0.0.1'))
    
    if (this.isProduction) {
      // In production, we'll use the URL as provided since it should work through Netlify proxy
      this.baseUrl = baseUrl.replace(/\/$/, '')
    } else {
      // In development, use direct URL
      this.baseUrl = baseUrl.replace(/\/$/, '')
    }
    
    const environment = this.isProduction ? 'production' : 'development'
    const proxyInfo = customCorsProxy ? `custom proxy: ${customCorsProxy}` : 
                     this.isProduction ? 'Netlify proxy' : 'direct URL (requires CORS proxy)'
    
    console.log(`🌐 ComfyUI Client initialized for ${environment} - baseUrl: ${this.baseUrl} (${proxyInfo})`)
  }

  private generateClientId(): string {
    return `web_client_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  private buildUrl(endpoint: string): string {
    const fullUrl = `${this.baseUrl}${endpoint}`
    
    // Check for custom CORS proxy in development
    const customCorsProxy = import.meta.env.VITE_CORS_PROXY
    const forceDevMode = import.meta.env.VITE_FORCE_DEV_MODE === 'true'
    const isProduction = forceDevMode ? false : (window.location.hostname !== 'localhost' && !window.location.hostname.includes('127.0.0.1'))
    
    // Debug logging
    console.log(`🔍 buildUrl debug: hostname=${window.location.hostname}, forceDevMode=${forceDevMode}, isProduction=${isProduction}`)
    console.log(`🔍 Environment variables: VITE_CORS_PROXY=${customCorsProxy}, VITE_COMFYUI_PROXY=${import.meta.env.VITE_COMFYUI_PROXY}`)
    
    if (!isProduction && customCorsProxy) {
      // In development with custom CORS proxy, prefix the full URL with the proxy
      console.log(`🔍 Using development proxy: ${customCorsProxy}/${fullUrl}`)
      return `${customCorsProxy}/${fullUrl}`
    }
    
    if (isProduction) {
      // Check if we're on examples.comput3.ai or other Netlify deployment
      const isNetlifyDeployment = window.location.hostname.includes('netlify.app') || 
                                 window.location.hostname.includes('examples.comput3.ai') ||
                                 window.location.hostname.includes('.netlify.app')
      
      if (isNetlifyDeployment) {
        // Use centralized Netlify redirects for CORS proxy
        // Remove protocol and use /api/comfyui/ prefix
        const nodeUrl = this.baseUrl.replace(/^https?:\/\//, '')
        
        // Determine if we need explicit HTTPS reconstruction
        const needsHttpsPrefix = this.baseUrl.startsWith('https://')
        const netlifyProxyUrl = needsHttpsPrefix 
          ? `/api/comfyui/https/${nodeUrl}${endpoint}`
          : `/api/comfyui/${nodeUrl}${endpoint}`
          
        console.log(`🔍 Using Netlify redirects: ${netlifyProxyUrl}`)
        return netlifyProxyUrl
      }
      
      // Fallback to user-configured CORS proxy from localStorage
      const userCorsProxy = localStorage.getItem('CORS_PROXY')
      
      if (userCorsProxy && userCorsProxy.trim()) {
        // Handle different proxy formats
        if (userCorsProxy.includes('allorigins.win')) {
          // AllOrigins format: https://api.allorigins.win/raw?url=
          const proxyUrl = `${userCorsProxy}${encodeURIComponent(fullUrl)}`
          console.log(`🔍 Using AllOrigins proxy: ${proxyUrl}`)
          return proxyUrl
        } else {
          // Standard CORS proxy format (like cors-anywhere)
          const proxyUrl = `${userCorsProxy}/${fullUrl}`
          console.log(`🔍 Using user CORS proxy: ${proxyUrl}`)
          return proxyUrl
        }
      } else {
        // Direct connection (no proxy)
        console.log(`🔍 Using direct connection (no proxy): ${fullUrl}`)
        return fullUrl
      }
    }
    
    // In development without proxy, connect directly (will only work with local ComfyUI or proper CORS setup)
    console.log(`🔍 Using direct URL: ${fullUrl}`)
    return fullUrl
  }

  private async makeRequest(endpoint: string, options: RequestInit = {}): Promise<Response> {
    const url = this.buildUrl(endpoint)
    
    // Simplified headers to avoid CORS issues
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string> || {})
    }

    // Add C3 API key as cookie if available
    if (this.apiKey) {
      const c3Cookie = `c3_api_key=${this.apiKey}`
      
      // Primary method: Set Cookie header directly
      headers['Cookie'] = c3Cookie
      
      // Backup methods for different proxy configurations
      headers['X-C3-Cookie'] = c3Cookie
      headers['X-C3-API-Key'] = this.apiKey
    }
    
    const requestOptions: RequestInit = {
      ...options,
      mode: 'cors',
      headers
    }

    try {
      console.log(`🌐 ComfyUI request: ${requestOptions.method || 'GET'} ${url}`)
      
      const response = await fetch(url, requestOptions)
      console.log(`📡 Response: ${response.status} ${response.statusText}`)
      
      return response
    } catch (error) {
      console.error(`ComfyUI request failed to ${url}:`, error)
      throw error
    }
  }

  /**
   * Load a workflow from a remote URL (since we can't access filesystem in browser)
   * This expects the workflow to be served from a public URL
   */
  async loadWorkflow(workflowUrl: string): Promise<any> {
    try {
      const response = await fetch(workflowUrl)
      if (!response.ok) {
        throw new Error(`Failed to load workflow: ${response.status} - ${response.statusText}`)
      }
      const workflow = await response.json()
      console.log('✅ Workflow loaded successfully')
      return workflow
    } catch (error) {
      console.error('❌ Error loading workflow:', error)
      throw error
    }
  }

  /**
   * Validate workflow structure similar to Python implementation
   */
  validateWorkflow(workflow: any): WorkflowValidation {
    const errors: string[] = []
    const warnings: string[] = []

    if (!workflow) {
      errors.push('Workflow is null or undefined')
      return { valid: false, errors, warnings }
    }

    if (typeof workflow !== 'object') {
      errors.push(`Workflow is not an object: ${typeof workflow}`)
      return { valid: false, errors, warnings }
    }

    // Check if workflow has nodes array
    if (!workflow.nodes) {
      errors.push('Workflow is missing "nodes" property')
    } else if (!Array.isArray(workflow.nodes)) {
      errors.push(`Workflow "nodes" is not an array: ${typeof workflow.nodes}`)
    } else if (workflow.nodes.length === 0) {
      errors.push('Workflow "nodes" array is empty')
    }

    // If nodes exist, check for required node types
    if (workflow.nodes && Array.isArray(workflow.nodes)) {
      const nodeCounts = {
        positive_prompt: 0,
        negative_prompt: 0,
        sampler: 0,
        latent_image: 0,
        quadruple_clip: 0,
        model_sampling: 0,
        vae: 0,
        unet: 0
      }

      // Log node types for debugging
      const nodeTypes = workflow.nodes.map((node: any) => node.type || 'unknown')
      console.log('Workflow node types:', nodeTypes.join(', '))

      for (const node of workflow.nodes) {
        if (node.type === 'CLIPTextEncode') {
          if (node.title === 'Positive Prompt') {
            nodeCounts.positive_prompt++
          } else if (node.title === 'Negative Prompt') {
            nodeCounts.negative_prompt++
          }
        } else if (['KSampler', 'SONICSampler'].includes(node.type)) {
          nodeCounts.sampler++
        } else if (['EmptySD3LatentImage', 'EmptyLatentImage'].includes(node.type)) {
          nodeCounts.latent_image++
        } else if (node.type === 'QuadrupleCLIPLoader') {
          nodeCounts.quadruple_clip++
          // Validate QuadrupleCLIPLoader has required widget values
          if (node.widgets_values && node.widgets_values.length < 4) {
            errors.push(`QuadrupleCLIPLoader node ${node.id} missing required CLIP model values`)
          }
        } else if (node.type === 'ModelSamplingSD3') {
          nodeCounts.model_sampling++
          // Validate ModelSamplingSD3 has required widget values
          if (node.widgets_values && node.widgets_values.length < 1) {
            warnings.push(`ModelSamplingSD3 node ${node.id} missing shift value, will use default`)
          }
        } else if (node.type === 'VAELoader') {
          nodeCounts.vae++
        } else if (node.type === 'UNETLoader') {
          nodeCounts.unet++
        }
      }

      // Report missing required nodes
      if (nodeCounts.positive_prompt === 0) {
        errors.push('Missing positive prompt node (CLIPTextEncode with title "Positive Prompt")')
      }
      if (nodeCounts.negative_prompt === 0) {
        errors.push('Missing negative prompt node (CLIPTextEncode with title "Negative Prompt")')
      }
      if (nodeCounts.sampler === 0) {
        errors.push('Missing sampler node (KSampler or SONICSampler)')
      }
      if (nodeCounts.latent_image === 0) {
        errors.push('Missing latent image node (EmptySD3LatentImage or EmptyLatentImage)')
      }
      if (nodeCounts.quadruple_clip === 0) {
        errors.push('Missing QuadrupleCLIPLoader node')
      }
      if (nodeCounts.model_sampling === 0) {
        warnings.push('Missing ModelSamplingSD3 node (optional)')
      }
      if (nodeCounts.vae === 0) {
        errors.push('Missing VAELoader node')
      }
      if (nodeCounts.unet === 0) {
        errors.push('Missing UNETLoader node')
      }

      // Check for links array
      if (!workflow.links) {
        errors.push('Workflow is missing "links" array')
      } else if (!Array.isArray(workflow.links)) {
        errors.push(`Workflow "links" is not an array: ${typeof workflow.links}`)
      }

      console.log('Node counts:', nodeCounts)
    }

    const validation = {
      valid: errors.length === 0,
      errors,
      warnings
    }

    if (validation.valid) {
      console.log('✅ Workflow validation passed')
      if (warnings.length > 0) {
        console.warn('⚠️ Validation warnings:', warnings.join(', '))
      }
    } else {
      console.error('❌ Workflow validation failed:', errors.join(', '))
      if (warnings.length > 0) {
        console.warn('⚠️ Validation warnings:', warnings.join(', '))
      }
    }

    return validation
  }

  /**
   * Update workflow with text-to-image parameters similar to Python implementation
   */
  updateTextToImageWorkflow(
    workflow: any, 
    positivePrompt: string, 
    negativePrompt: string, 
    width: number = 1024, 
    height: number = 1024, 
    seed?: number, 
    steps: number = 35
  ): any {
    // Validate input workflow
    const validation = this.validateWorkflow(workflow)
    if (!validation.valid) {
      const errorMessage = `Invalid workflow: ${validation.errors.join(', ')}`
      console.error('❌', errorMessage)
      throw new Error(errorMessage)
    }

    console.log(`Updating workflow with parameters: prompt=${positivePrompt.slice(0, 20)}..., ` +
               `negativePrompt=${negativePrompt.slice(0, 20)}..., width=${width}, height=${height}, ` +
               `seed=${seed}, steps=${steps}`)

    // Make a copy of the workflow to avoid modifying the original
    const updatedWorkflow = JSON.parse(JSON.stringify(workflow))

    console.log(`Workflow contains ${updatedWorkflow.nodes.length} nodes`)

    // Track if we found and updated each required node
    const nodesUpdated = {
      positive_prompt: false,
      negative_prompt: false,
      sampler: false,
      latent: false
    }

    // Find and update nodes
    for (const node of updatedWorkflow.nodes) {
      console.log(`Inspecting node: id=${node.id}, type=${node.type}, title=${node.title || 'N/A'}`)

      // Update positive prompt
      if (node.type === 'CLIPTextEncode' && node.title === 'Positive Prompt') {
        if (node.widgets_values) {
          node.widgets_values[0] = positivePrompt
          console.log('✅ Updated positive prompt')
          nodesUpdated.positive_prompt = true
        }
      }
      // Update negative prompt
      else if (node.type === 'CLIPTextEncode' && node.title === 'Negative Prompt') {
        if (node.widgets_values) {
          node.widgets_values[0] = negativePrompt
          console.log('✅ Updated negative prompt')
          nodesUpdated.negative_prompt = true
        }
      }
      // Update KSampler settings
      else if (node.type === 'KSampler') {
        if (node.widgets_values) {
          console.log(`Found KSampler node with widgets:`, node.widgets_values)

          // Update seed if provided
          if (seed !== undefined && node.widgets_values.length > 0) {
            node.widgets_values[0] = seed
            console.log(`⚙️ Updated KSampler seed to ${seed}`)
          }

          // Update steps
          if (node.widgets_values.length > 2) {
            node.widgets_values[2] = steps
            console.log(`⚙️ Updated KSampler steps to ${steps}`)
          }

          nodesUpdated.sampler = true
        }
      }
      // Update SONICSampler settings (if present)
      else if (node.type === 'SONICSampler') {
        if (node.widgets_values) {
          console.log(`Found SONICSampler node with widgets:`, node.widgets_values)

          if (seed !== undefined) {
            const seedIndex = 0 // Adjust based on actual workflow
            if (node.widgets_values.length > seedIndex) {
              node.widgets_values[seedIndex] = seed
              console.log(`⚙️ Updated SONICSampler seed to ${seed}`)
            }
          }

          // Update steps
          const stepsIndex = 1 // Adjust based on actual workflow
          if (node.widgets_values.length > stepsIndex) {
            node.widgets_values[stepsIndex] = steps
            console.log(`⚙️ Updated SONICSampler steps to ${steps}`)
          }

          nodesUpdated.sampler = true
        }
      }
      // Update latent image dimensions
      else if (['EmptyLatentImage', 'EmptySD3LatentImage'].includes(node.type)) {
        if (node.widgets_values) {
          console.log(`Found latent image node with widgets:`, node.widgets_values)

          if (node.widgets_values.length >= 2) {
            node.widgets_values[0] = width
            node.widgets_values[1] = height
            console.log(`📐 Updated image dimensions to ${width}x${height}`)
            nodesUpdated.latent = true
          }
        }
      }
      // Update SaveImage node if present
      else if (node.type === 'SaveImage' && node.widgets_values) {
        // Generate a unique filename based on the prompt, timestamp, and client ID
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
        const promptSlug = positivePrompt.replace(/[^a-zA-Z0-9]/g, '_').slice(0, 20)
        const uniqueId = `${this.clientId.slice(0, 8)}_${Math.random().toString(36).substr(2, 6)}`
        const filename = `${promptSlug}_${timestamp}_${uniqueId}`

        // Update the filename widget value
        if (node.widgets_values.length > 0) {
          node.widgets_values[0] = filename
          console.log(`💾 Updated save filename to: ${filename}`)
        }
      }
    }

    // Log whether all required nodes were found and updated
    console.log(`Required nodes updated: positive=${nodesUpdated.positive_prompt}, ` +
               `negative=${nodesUpdated.negative_prompt}, ` +
               `sampler=${nodesUpdated.sampler}, ` +
               `latent=${nodesUpdated.latent}`)

    // Warn about any missing updates
    if (!nodesUpdated.positive_prompt) {
      console.warn('⚠️ Positive prompt node not found in workflow')
    }
    if (!nodesUpdated.negative_prompt) {
      console.warn('⚠️ Negative prompt node not found in workflow')
    }
    if (!nodesUpdated.sampler) {
      console.warn('⚠️ Sampler node (KSampler or SONICSampler) not found in workflow')
    }
    if (!nodesUpdated.latent) {
      console.warn('⚠️ Latent image node not found in workflow')
    }

    return updatedWorkflow
  }

  /**
   * Update text-to-video workflow with the provided parameters
   */
  updateTextToVideoWorkflow(
    workflow: any,
    positivePrompt: string,
    negativePrompt: string,
    width: number = 832,
    height: number = 480,
    frames: number = 81,
    seed?: number,
    steps: number = 25,
    cfg: number = 6,
    frameRate: number = 16
  ): any {
    console.log(`Updating video workflow with parameters: prompt=${positivePrompt.slice(0, 20)}..., ` +
               `negativePrompt=${negativePrompt.slice(0, 20)}..., width=${width}, height=${height}, ` +
               `frames=${frames}, seed=${seed}, steps=${steps}, cfg=${cfg}, frameRate=${frameRate}`)

    // Make a copy of the workflow to avoid modifying the original
    const updatedWorkflow = JSON.parse(JSON.stringify(workflow))

    console.log(`Video workflow contains ${updatedWorkflow.nodes.length} nodes`)

    // Track if we found and updated each required node
    const nodesUpdated = {
      text_encode: false,
      sampler: false,
      empty_embeds: false,
      model_loader: false,
      vae_loader: false,
      video_combine: false,
      decode: false,
      torch_compile: false,
      block_swap: false,
      tea_cache: false,
      enhance_video: false
    }

    // Find and update nodes
    for (const node of updatedWorkflow.nodes) {
      console.log(`Inspecting video node: id=${node.id}, type=${node.type}`)

      // Update WanVideoTextEncode (positive/negative prompts)
      if (node.type === 'WanVideoTextEncode') {
        if (node.widgets_values && node.widgets_values.length >= 2) {
          node.widgets_values[0] = positivePrompt  // Positive prompt
          node.widgets_values[1] = negativePrompt  // Negative prompt
          // Keep the third value (boolean) as is
          console.log('✅ Updated video text encoding prompts')
          nodesUpdated.text_encode = true
        }
      }
      // Update WanVideoSampler settings
      else if (node.type === 'WanVideoSampler') {
        if (node.widgets_values && node.widgets_values.length >= 6) {
          node.widgets_values[0] = steps        // Steps
          node.widgets_values[1] = cfg          // CFG scale
          // Keep shift (index 2) as default
          if (seed !== undefined) {
            node.widgets_values[3] = seed       // Seed
          }
          // Keep scheduler, force_offload, unipc settings as defaults
          console.log(`✅ Updated video sampler: steps=${steps}, cfg=${cfg}, seed=${seed}`)
          nodesUpdated.sampler = true
        }
      }
      // Update WanVideoEmptyEmbeds (video dimensions and frames)
      else if (node.type === 'WanVideoEmptyEmbeds') {
        if (node.widgets_values && node.widgets_values.length >= 3) {
          node.widgets_values[0] = width        // Width
          node.widgets_values[1] = height       // Height
          node.widgets_values[2] = frames       // Number of frames
          console.log(`✅ Updated video dimensions: ${width}x${height}, ${frames} frames`)
          nodesUpdated.empty_embeds = true
        }
      }
      // Update VHS_VideoCombine (output settings)
      else if (node.type === 'VHS_VideoCombine') {
        if (node.widgets_values && typeof node.widgets_values === 'object' && !Array.isArray(node.widgets_values)) {
          // Handle object format from text-to-video.json
          node.widgets_values.frame_rate = node.widgets_values.frame_rate || 16
          node.widgets_values.loop_count = node.widgets_values.loop_count || 0
          node.widgets_values.filename_prefix = node.widgets_values.filename_prefix || 'WanVideo2_1_T2V'
          node.widgets_values.format = node.widgets_values.format || 'video/h264-mp4'
          node.widgets_values.pix_fmt = node.widgets_values.pix_fmt || 'yuv420p'
          node.widgets_values.crf = node.widgets_values.crf || 19
          node.widgets_values.save_metadata = node.widgets_values.save_metadata !== undefined ? node.widgets_values.save_metadata : true
          node.widgets_values.trim_to_audio = node.widgets_values.trim_to_audio !== undefined ? node.widgets_values.trim_to_audio : false
          node.widgets_values.pingpong = node.widgets_values.pingpong !== undefined ? node.widgets_values.pingpong : false
          node.widgets_values.save_output = node.widgets_values.save_output !== undefined ? node.widgets_values.save_output : true
        } else if (Array.isArray(node.widgets_values) && node.widgets_values.length >= 6) {
          // Handle array format (fallback)
          node.widgets_values[0] = node.widgets_values[0] || 16
          node.widgets_values[1] = node.widgets_values[1] || 0
          node.widgets_values[2] = node.widgets_values[2] || 'WanVideo2_1_T2V'
          node.widgets_values[3] = node.widgets_values[3] || 'video/h264-mp4'
          node.widgets_values[4] = node.widgets_values[4] !== undefined ? node.widgets_values[4] : false
          node.widgets_values[5] = node.widgets_values[5] !== undefined ? node.widgets_values[5] : true
        }
      }
      // Update WanVideoModelLoader with default settings
      else if (node.type === 'WanVideoModelLoader') {
        if (!node.widgets_values || node.widgets_values.length < 4) {
          node.widgets_values = [
            "hunyuan_video_720_cfgdistill_fp8_e4m3fn.safetensors",  // model
            "auto",                    // load_device
            "auto",                    // base_precision
            "disabled"                 // quantization
          ]
          console.log('✅ Updated video model loader with defaults')
          nodesUpdated.model_loader = true
        }
      }
      // Update LoadWanVideoT5TextEncoder with default settings
      else if (node.type === 'LoadWanVideoT5TextEncoder') {
        if (!node.widgets_values || node.widgets_values.length < 2) {
          node.widgets_values = [
            "umt5-xxl-enc-bf16.safetensors",  // model_name
            "bf16"                            // precision
          ]
          console.log('✅ Updated video T5 text encoder with defaults')
        }
      }
      // Update WanVideoVAELoader with default settings
      else if (node.type === 'WanVideoVAELoader') {
        if (!node.widgets_values || node.widgets_values.length < 2) {
          node.widgets_values = [
            "hunyuan_video_vae_fp32.safetensors",  // model_name
            "bf16"                                // precision
          ]
          console.log('✅ Updated video VAE loader with defaults')
          nodesUpdated.vae_loader = true
        }
      }
      // Update WanVideoDecode with default settings
      else if (node.type === 'WanVideoDecode') {
        if (!node.widgets_values || node.widgets_values.length < 5) {
          node.widgets_values = [
            true,    // enable_vae_tiling
            272,     // tile_x
            272,     // tile_y
            144,     // tile_stride_x
            128      // tile_stride_y
          ]
          console.log('✅ Updated video decode with defaults')
          nodesUpdated.decode = true
        }
      }
      // Update WanVideoTorchCompileSettings with default settings
      else if (node.type === 'WanVideoTorchCompileSettings') {
        if (!node.widgets_values || node.widgets_values.length < 6) {
          node.widgets_values = [
            "disabled",    // mode
            "inductor",    // backend
            false,         // dynamic
            false,         // fullgraph
            true,          // compile_transformer_blocks_only
            16             // dynamo_cache_size_limit
          ]
          console.log('✅ Updated torch compile settings with defaults')
          nodesUpdated.torch_compile = true
        }
      }
      // Update WanVideoBlockSwap with default settings
      else if (node.type === 'WanVideoBlockSwap') {
        if (!node.widgets_values || node.widgets_values.length < 5) {
          node.widgets_values = [
            20,
            false,
            false,
            true,
            0
          ]
          console.log('✅ Updated block swap settings with defaults')
          nodesUpdated.block_swap = true
        }
      }
      // Update WanVideoTeaCache with default settings
      else if (node.type === 'WanVideoTeaCache') {
        if (node.widgets_values && node.widgets_values.length >= 6) {
          node.widgets_values[0] = 0.25
          node.widgets_values[1] = 1
          node.widgets_values[2] = -1
          node.widgets_values[3] = 'offload_device'
          node.widgets_values[4] = 'true'
          node.widgets_values[5] = 'e'
          console.log('✅ Updated tea cache settings with defaults')
          nodesUpdated.tea_cache = true
        }
      }
      // Update WanVideoEnhanceAVideo with default settings
      else if (node.type === 'WanVideoEnhanceAVideo') {
        if (!node.widgets_values || node.widgets_values.length < 3) {
          node.widgets_values = [
            2,
            0,
            1
          ]
          console.log('✅ Updated enhance video settings with defaults')
          nodesUpdated.enhance_video = true
        }
      }
    }

    // Log which nodes were updated
    console.log(`Video nodes updated:`, nodesUpdated)

    return updatedWorkflow
  }

  /**
   * Transform visual workflow format to API format like Python implementation
   */
  private transformWorkflowToApiFormat(workflow: any): any {
    // If it's already in API format, return as is
    if (!workflow.nodes) {
      if (workflow.prompt) {
        return workflow.prompt
      }
      return workflow
    }

    // Special handling for video workflows - they need simpler transformation
    const isVideoWorkflow = workflow.nodes?.some((node: any) => 
      ['WanVideoTextEncode', 'WanVideoSampler', 'WanVideoModelLoader', 'VHS_VideoCombine'].includes(node.type)
    )

    if (isVideoWorkflow) {
      console.log('🎬 Using simplified video workflow transformation')
      return this.transformVideoWorkflowToApiFormat(workflow)
    }

    const apiPrompt: any = {}

    // Process each node
    for (const node of workflow.nodes) {
      // Skip Note nodes as they're not supported by the API
      if (node.type === 'Note') {
        console.log(`Skipping Note node with ID ${node.id}`)
        continue
      }

      // Create the node configuration
      const nodeConfig: any = {
        class_type: node.class_type || node.type,
        inputs: {}
      }

      // Add title if present
      if (node.title) {
        nodeConfig._meta = { title: node.title }
      }

      // Process inputs from both connections and widget values
      this.processNodeInputs(node, nodeConfig, workflow)

      // Add to API prompt
      apiPrompt[String(node.id)] = nodeConfig
    }

    return apiPrompt
  }

  /**
   * Simplified transformation specifically for video workflows to avoid parameter mapping issues
   */
  private transformVideoWorkflowToApiFormat(workflow: any): any {
    const apiPrompt: any = {}

    // Process each node with minimal transformation
    for (const node of workflow.nodes) {
      // Skip Note nodes
      if (node.type === 'Note') {
        console.log(`Skipping Note node with ID ${node.id}`)
        continue
      }

      // Create basic node configuration
      const nodeConfig: any = {
        class_type: node.class_type || node.type,
        inputs: {}
      }

      // Process connections first
      if (node.inputs && workflow.links) {
        for (const inputData of node.inputs) {
          const inputName = inputData.name
          const linkId = inputData.link

          if (linkId !== null && linkId !== undefined) {
            // Find the corresponding link
            for (const link of workflow.links) {
              if (link[0] === linkId) { // link[0] is the link ID
                const sourceNodeId = String(link[1]) // link[1] is the source node ID
                const outputIndex = link[2] // link[2] is the output index
                nodeConfig.inputs[inputName] = [sourceNodeId, outputIndex]
                break
              }
            }
          }
        }
      }

      // Handle widget_values with special care for video nodes
      if (node.widgets_values) {
        const widgetValues = node.widgets_values

        // For these video node types, convert widget_values to inputs properly
        if (node.type === 'WanVideoBlockSwap') {
          // widget_values: [20, false, false, true, 0]
          if (widgetValues.length >= 5) {
            nodeConfig.inputs.blocks_to_swap = widgetValues[0] || 20
            nodeConfig.inputs.offload_txt_emb = widgetValues[1] !== undefined ? widgetValues[1] : false
            nodeConfig.inputs.offload_img_emb = widgetValues[2] !== undefined ? widgetValues[2] : false
            nodeConfig.inputs.batch_offload = widgetValues[3] !== undefined ? widgetValues[3] : true
            nodeConfig.inputs.blocks_to_keep = widgetValues[4] || 0
            // Add vace_blocks_to_swap parameter to prevent NoneType comparison error
            nodeConfig.inputs.vace_blocks_to_swap = 0
          }
          console.log(`📦 Converted WanVideoBlockSwap widget_values to inputs for node ${node.id}`)
          
        } else if (node.type === 'WanVideoTeaCache') {
          // widget_values: [0.25, 1, -1, "offload_device", "true", "e"]
          if (widgetValues.length >= 6) {
            nodeConfig.inputs.rel_l1_thresh = widgetValues[0] || 0.25
            nodeConfig.inputs.start_step = widgetValues[1] || 1
            nodeConfig.inputs.end_step = widgetValues[2] || -1
            nodeConfig.inputs.cache_device = widgetValues[3] || 'offload_device'
            nodeConfig.inputs.use_coefficients = widgetValues[4] || 'true'
            nodeConfig.inputs.coefficient_type = widgetValues[5] || 'e'
          }
          console.log(`📦 Converted WanVideoTeaCache widget_values to inputs for node ${node.id}`)
          
        } else if (node.type === 'WanVideoEnhanceAVideo') {
          // widget_values: [2, 0, 1]
          if (widgetValues.length >= 3) {
            nodeConfig.inputs.weight = widgetValues[0] || 2
            nodeConfig.inputs.start_percent = widgetValues[1] || 0
            nodeConfig.inputs.end_percent = widgetValues[2] || 1
          }
          console.log(`📦 Converted WanVideoEnhanceAVideo widget_values to inputs for node ${node.id}`)
          
        } else if (node.type === 'WanVideoTorchCompileSettings') {
          // widget_values: ["inductor", false, "default", false, 64, true, 128]
          if (widgetValues.length >= 7) {
            nodeConfig.inputs.backend = widgetValues[0] || 'inductor'
            nodeConfig.inputs.dynamic = widgetValues[1] !== undefined ? widgetValues[1] : false
            nodeConfig.inputs.mode = widgetValues[2] || 'default'
            nodeConfig.inputs.fullgraph = widgetValues[3] !== undefined ? widgetValues[3] : false
            nodeConfig.inputs.dynamo_cache_size_limit = widgetValues[4] || 64
            nodeConfig.inputs.compile_transformer_blocks_only = widgetValues[5] !== undefined ? widgetValues[5] : true
            nodeConfig.inputs.max_autotune_gemm_search_trials = widgetValues[6] || 128
          }
          console.log(`📦 Converted WanVideoTorchCompileSettings widget_values to inputs for node ${node.id}`)
          
        } else if (node.type === 'WanVideoTextEncode') {
          // Convert text encode to inputs format
          if (widgetValues.length >= 2) {
            nodeConfig.inputs.positive_prompt = widgetValues[0] || ''
            nodeConfig.inputs.negative_prompt = widgetValues[1] || ''
            if (widgetValues.length > 2) {
              nodeConfig.inputs.enable_text_conditioning = widgetValues[2] !== undefined ? widgetValues[2] : true
            }
          }
        } else if (node.type === 'VHS_VideoCombine') {
          // Handle the complex object structure
          if (widgetValues && typeof widgetValues === 'object' && !Array.isArray(widgetValues)) {
            nodeConfig.inputs.frame_rate = widgetValues.frame_rate || 16
            nodeConfig.inputs.loop_count = widgetValues.loop_count || 0
            nodeConfig.inputs.filename_prefix = widgetValues.filename_prefix || 'WanVideo2_1_T2V'
            nodeConfig.inputs.format = widgetValues.format || 'video/h264-mp4'
            nodeConfig.inputs.pingpong = widgetValues.pingpong !== undefined ? widgetValues.pingpong : false
            nodeConfig.inputs.save_output = widgetValues.save_output !== undefined ? widgetValues.save_output : true
          }
        } else {
          // For other video nodes, use the standard transformation but be more careful
          this.processNodeInputs(node, nodeConfig, workflow)
        }
      }

      // Add to API prompt
      apiPrompt[String(node.id)] = nodeConfig
    }

    return apiPrompt
  }

  /**
   * Process node inputs from both connections and widget values
   */
  private processNodeInputs(node: any, nodeConfig: any, workflow: any): void {
    // Process widget values first
    if (node.widgets_values) {
      const widgetValues = node.widgets_values

      // Handle different node types
      if (node.type === 'CLIPTextEncode') {
        if (node.title === 'Positive Prompt') {
          nodeConfig.inputs.text = widgetValues[0] || ''
        } else if (node.title === 'Negative Prompt') {
          nodeConfig.inputs.text = widgetValues[0] || ''
        }
      } else if (node.type === 'WanVideoTextEncode') {
        // WanVideo text encoding node
        if (widgetValues.length >= 2) {
          nodeConfig.inputs.positive_prompt = widgetValues[0] || ''
          nodeConfig.inputs.negative_prompt = widgetValues[1] || ''
        }
      } else if (node.type === 'WanVideoSampler') {
        // WanVideo sampler node
        if (widgetValues.length >= 7) {
          nodeConfig.inputs.steps = widgetValues[0]
          nodeConfig.inputs.cfg = widgetValues[1]
          nodeConfig.inputs.shift = widgetValues[2] || 5
          nodeConfig.inputs.seed = widgetValues[3]
          nodeConfig.inputs.scheduler = widgetValues[6] || 'unipc'
          nodeConfig.inputs.force_offload = widgetValues[5] !== undefined ? widgetValues[5] : true
          if (widgetValues.length > 7) {
            nodeConfig.inputs.riflex_freq_index = widgetValues[7] || 0
          }
        }
      } else if (node.type === 'WanVideoEmptyEmbeds') {
        // WanVideo empty embeds node for dimensions and frames
        if (widgetValues.length >= 3) {
          nodeConfig.inputs.width = widgetValues[0]
          nodeConfig.inputs.height = widgetValues[1]
          nodeConfig.inputs.num_frames = widgetValues[2]
        }
      } else if (node.type === 'LoadWanVideoT5TextEncoder') {
        // WanVideo T5 text encoder loader
        if (widgetValues.length >= 2) {
          nodeConfig.inputs.model_name = widgetValues[0] || 'umt5-xxl-enc-bf16.safetensors'
          nodeConfig.inputs.precision = widgetValues[1] || 'bf16'
        }
      } else if (node.type === 'WanVideoModelLoader') {
        // WanVideo model loader
        if (widgetValues.length >= 4) {
          nodeConfig.inputs.model = widgetValues[0]
          nodeConfig.inputs.load_device = widgetValues[3] || 'offload_device'
          nodeConfig.inputs.base_precision = widgetValues[1] || 'fp16'
          nodeConfig.inputs.quantization = widgetValues[2] || 'fp8_e4m3fn'
        }
      } else if (node.type === 'WanVideoVAELoader') {
        // WanVideo VAE loader
        if (widgetValues.length >= 2) {
          nodeConfig.inputs.model_name = widgetValues[0] || 'Wan2_1_VAE_bf16.safetensors'
          nodeConfig.inputs.precision = widgetValues[1] || 'bf16'
        }
      } else if (node.type === 'WanVideoDecode') {
        // WanVideo decode node
        if (widgetValues.length >= 5) {
          nodeConfig.inputs.enable_vae_tiling = widgetValues[0] !== undefined ? widgetValues[0] : true
          nodeConfig.inputs.tile_x = widgetValues[1] || 272
          nodeConfig.inputs.tile_y = widgetValues[2] || 272
          nodeConfig.inputs.tile_stride_x = widgetValues[3] || 144
          nodeConfig.inputs.tile_stride_y = widgetValues[4] || 128
        }
      } else if (node.type === 'WanVideoTorchCompileSettings') {
        // WanVideo torch compile settings
        if (widgetValues.length >= 6) {
          nodeConfig.inputs.backend = widgetValues[0] || 'inductor'
          nodeConfig.inputs.dynamic = widgetValues[1] !== undefined ? widgetValues[1] : false
          nodeConfig.inputs.mode = widgetValues[2] || 'default'
          nodeConfig.inputs.fullgraph = widgetValues[3] !== undefined ? widgetValues[3] : false
          nodeConfig.inputs.dynamo_cache_size_limit = widgetValues[4] || 64
          nodeConfig.inputs.compile_transformer_blocks_only = widgetValues[5] !== undefined ? widgetValues[5] : true
        }
      } else if (node.type === 'WanVideoBlockSwap') {
        // WanVideo block swap settings - map to correct parameter names
        if (widgetValues.length >= 5) {
          // Based on the widget_values: [20, false, false, true, 0]
          nodeConfig.inputs.blocks_to_swap = widgetValues[0] || 20
          nodeConfig.inputs.offload_txt_emb = widgetValues[1] !== undefined ? widgetValues[1] : false  
          nodeConfig.inputs.offload_img_emb = widgetValues[2] !== undefined ? widgetValues[2] : false
          nodeConfig.inputs.batch_offload = widgetValues[3] !== undefined ? widgetValues[3] : true
          nodeConfig.inputs.blocks_to_keep = widgetValues[4] || 0
          // Add vace_blocks_to_swap parameter to prevent NoneType comparison error
          nodeConfig.inputs.vace_blocks_to_swap = 0
        }
        console.log(`📦 Converted WanVideoBlockSwap widget_values to inputs for node ${node.id}`)
        
      } else if (node.type === 'WanVideoTeaCache') {
        // WanVideo tea cache settings
        if (widgetValues.length >= 6) {
          nodeConfig.inputs.rel_l1_thresh = widgetValues[0] || 0.25
          nodeConfig.inputs.start_step = widgetValues[1] || 1
          nodeConfig.inputs.end_step = widgetValues[2] || -1
          nodeConfig.inputs.cache_device = widgetValues[3] || 'offload_device'
          nodeConfig.inputs.use_coefficients = widgetValues[4] || 'true'
          nodeConfig.inputs.coefficient_type = widgetValues[5] || 'e'
        }
        console.log(`📦 Converted WanVideoTeaCache widget_values to inputs for node ${node.id}`)
        
      } else if (node.type === 'WanVideoEnhanceAVideo') {
        // WanVideo enhance a video settings
        if (widgetValues.length >= 3) {
          nodeConfig.inputs.weight = widgetValues[0] || 2
          nodeConfig.inputs.start_percent = widgetValues[1] || 0
          nodeConfig.inputs.end_percent = widgetValues[2] || 1
        }
        console.log(`📦 Converted WanVideoEnhanceAVideo widget_values to inputs for node ${node.id}`)
        
      } else if (node.type === 'VHS_VideoCombine') {
        // Video combine node for output
        if (widgetValues && typeof widgetValues === 'object' && !Array.isArray(widgetValues)) {
          // Handle object format from text-to-video.json
          nodeConfig.inputs.frame_rate = widgetValues.frame_rate || 16
          nodeConfig.inputs.loop_count = widgetValues.loop_count || 0
          nodeConfig.inputs.filename_prefix = widgetValues.filename_prefix || 'WanVideo2_1_T2V'
          nodeConfig.inputs.format = widgetValues.format || 'video/h264-mp4'
          nodeConfig.inputs.pix_fmt = widgetValues.pix_fmt || 'yuv420p'
          nodeConfig.inputs.crf = widgetValues.crf || 19
          nodeConfig.inputs.save_metadata = widgetValues.save_metadata !== undefined ? widgetValues.save_metadata : true
          nodeConfig.inputs.trim_to_audio = widgetValues.trim_to_audio !== undefined ? widgetValues.trim_to_audio : false
          nodeConfig.inputs.pingpong = widgetValues.pingpong !== undefined ? widgetValues.pingpong : false
          nodeConfig.inputs.save_output = widgetValues.save_output !== undefined ? widgetValues.save_output : true
        } else if (Array.isArray(widgetValues) && widgetValues.length >= 6) {
          // Handle array format (fallback)
          nodeConfig.inputs.frame_rate = widgetValues[0] || 16
          nodeConfig.inputs.loop_count = widgetValues[1] || 0
          nodeConfig.inputs.filename_prefix = widgetValues[2] || 'WanVideo2_1_T2V'
          nodeConfig.inputs.format = widgetValues[3] || 'video/h264-mp4'
          nodeConfig.inputs.pingpong = widgetValues[4] !== undefined ? widgetValues[4] : false
          nodeConfig.inputs.save_output = widgetValues[5] !== undefined ? widgetValues[5] : true
        }
      } else if (node.type === 'KSampler') {
        if (widgetValues.length >= 7) {
          nodeConfig.inputs = {
            ...nodeConfig.inputs,
            seed: widgetValues[0],
            steps: widgetValues[2],
            cfg: widgetValues[3],
            sampler_name: widgetValues[4],
            scheduler: widgetValues[5],
            denoise: widgetValues[6]
          }
        }
      } else if (['EmptyLatentImage', 'EmptySD3LatentImage'].includes(node.type)) {
        if (widgetValues.length >= 3) {
          nodeConfig.inputs = {
            ...nodeConfig.inputs,
            width: widgetValues[0],
            height: widgetValues[1],
            batch_size: widgetValues[2]
          }
        }
      } else if (node.type === 'SaveImage') {
        if (widgetValues.length > 0) {
          nodeConfig.inputs.filename_prefix = widgetValues[0]
        }
      } else if (node.type === 'VAELoader') {
        if (widgetValues.length > 0) {
          nodeConfig.inputs.vae_name = widgetValues[0]
        }
      } else if (node.type === 'UNETLoader') {
        if (widgetValues.length >= 2) {
          nodeConfig.inputs = {
            ...nodeConfig.inputs,
            unet_name: widgetValues[0],
            weight_dtype: widgetValues[1] || 'default'
          }
        }
      } else if (node.type === 'QuadrupleCLIPLoader') {
        if (widgetValues.length >= 4) {
          nodeConfig.inputs = {
            ...nodeConfig.inputs,
            clip_name1: widgetValues[0],
            clip_name2: widgetValues[1],
            clip_name3: widgetValues[2],
            clip_name4: widgetValues[3]
          }
          console.log('✅ Updated QuadrupleCLIPLoader with CLIP models')
        }
      } else if (node.type === 'ModelSamplingSD3') {
        const shiftValue = (widgetValues.length > 0) ? widgetValues[0] : 5
        nodeConfig.inputs.shift = shiftValue
        console.log(`✅ Updated ModelSamplingSD3 shift value: ${shiftValue}`)
      }
    }

    // Process connections/links
    if (node.inputs && workflow.links) {
      for (const inputData of node.inputs) {
        const inputName = inputData.name
        const linkId = inputData.link

        if (linkId !== null && linkId !== undefined) {
          // Find the corresponding link
          for (const link of workflow.links) {
            if (link[0] === linkId) { // link[0] is the link ID
              const sourceNodeId = String(link[1]) // link[1] is the source node ID
              const outputIndex = link[2] // link[2] is the output index
              nodeConfig.inputs[inputName] = [sourceNodeId, outputIndex]
              break
            }
          }
        }
      }
    }

    // Special handling for LoadImage nodes
    if (node.type === 'LoadImage') {
      if (!nodeConfig.inputs.image) {
        nodeConfig.inputs.image = 'example.png'
        console.warn(`LoadImage node ${node.id} missing image input, using default`)
      }
    }
  }

  /**
   * Queue a workflow for execution
   */
  async queueWorkflow(workflow: any): Promise<string> {
    try {
      console.log('🚀 Queueing workflow')

      // Transform workflow to API format
      const apiPrompt = this.transformWorkflowToApiFormat(workflow)

      // Create the final payload
      const payload: any = {
        prompt: apiPrompt,
        client_id: this.clientId
      }

      // If the original workflow had extra_data, include it
      if (workflow.extra_data) {
        payload.extra_data = workflow.extra_data
      }

      // Log the payload structure for debugging
      console.log(`Sending payload with ${Object.keys(apiPrompt).length} nodes`)
      console.log('Payload structure:', JSON.stringify(payload, null, 2))

      const response = await this.makeRequest('/prompt', {
        method: 'POST',
        body: JSON.stringify(payload)
      })

      if (!response.ok) {
        console.error(`❌ Failed to queue workflow: ${response.status} - ${response.statusText}`)
        const errorText = await response.text()
        console.error('Error details:', errorText)
        throw new Error(`Failed to queue workflow: ${response.status} - ${response.statusText}`)
      }

      const result = await response.json()
      const promptId = result.prompt_id
      console.log(`✅ Workflow queued with ID: ${promptId}`)
      return promptId
    } catch (error) {
      console.error('❌ Error queueing workflow:', error)
      throw error
    }
  }

  /**
   * Get the current queue status
   */
  async getQueueStatus(): Promise<any> {
    try {
      const response = await this.makeRequest('/queue')

      if (!response.ok) {
        console.warn(`⚠️ Failed to get queue status: ${response.status} - ${response.statusText}`)
        return null
      }

      return await response.json()
    } catch (error) {
      console.warn('⚠️ Error getting queue status:', error)
      return null
    }
  }

  /**
   * Check if a prompt is still in the queue
   */
  async isPromptInQueue(promptId: string): Promise<{ inQueue: boolean; status: string }> {
    const queueData = await this.getQueueStatus()

    if (!queueData) {
      return { inQueue: false, status: 'unknown' }
    }

    // Check running queue
    if (queueData.queue_running) {
      for (const job of queueData.queue_running) {
        if (job.length > 1 && job[1] === promptId) {
          return { inQueue: true, status: 'running' }
        }
      }
    }

    // Check pending queue
    if (queueData.queue_pending) {
      for (const job of queueData.queue_pending) {
        if (job.length > 1 && job[1] === promptId) {
          return { inQueue: true, status: 'pending' }
        }
      }
    }

    // Not found in queue, likely completed
    return { inQueue: false, status: 'not_found' }
  }

  /**
   * Get history directly
   */
  async getHistoryDirect(promptId: string): Promise<any> {
    try {
      const response = await this.makeRequest(`/history/${promptId}`)
      
      if (!response.ok) {
        console.warn(`⚠️ Failed to get direct history: ${response.status}`)
        return null
      }

      console.log('✅ Successfully retrieved history from direct endpoint')
      return await response.json()
    } catch (error) {
      console.warn('⚠️ Error getting direct history:', error)
      return null
    }
  }

  /**
   * Check workflow status comprehensively like Python implementation
   */
  async checkWorkflowStatus(promptId: string): Promise<{
    isComplete: boolean
    history?: any
    error?: string
  }> {
    try {
      // First check if the prompt is still in queue
      const { inQueue, status: queueStatus } = await this.isPromptInQueue(promptId)

      if (inQueue) {
        if (queueStatus === 'running') {
          return { isComplete: false, error: 'Still running in queue' }
        } else if (queueStatus === 'pending') {
          return { isComplete: false, error: 'Pending in queue' }
        } else {
          return { isComplete: false, error: `In queue with status: ${queueStatus}` }
        }
      }

      // Try direct history endpoint
      const directHistory = await this.getHistoryDirect(promptId)

      if (directHistory && directHistory[promptId]) {
        const promptData = directHistory[promptId]

        // Check if the workflow has completed successfully
        if (promptData.status && promptData.status.completed === true) {
          console.log('✅ Workflow completed according to direct history endpoint')

          // Check if there are outputs in the response
          if (promptData.outputs) {
            for (const [nodeId, nodeOutputs] of Object.entries(promptData.outputs)) {
              if (typeof nodeOutputs === 'object' && 
                  nodeOutputs !== null && 
                  'images' in nodeOutputs) {
                console.log(`✅ Found image outputs in node ${nodeId}`)
                return { isComplete: true, history: promptData }
              }
            }
          }

          return { isComplete: true, history: promptData }
        }

        // Check if there are status messages indicating success
        if (promptData.status && promptData.status.messages) {
          for (const msg of promptData.status.messages) {
            if (msg[0] === 'execution_success') {
              console.log('✅ Found execution_success message in status')
              return { isComplete: true, history: promptData }
            }
          }
        }
      }

      // If we get here, no outputs were found
      return { isComplete: false, error: 'No history found and not in queue' }
    } catch (error) {
      console.error('❌ Error checking workflow status:', error)
        return {
        isComplete: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }
    }
  }

  /**
   * Get a list of output files from a completed workflow
   */
  async getOutputFiles(promptId: string): Promise<OutputFile[]> {
    try {
      const outputFiles: OutputFile[] = []

      // Try direct history endpoint first
      const directHistory = await this.getHistoryDirect(promptId)

      if (directHistory && directHistory[promptId]) {
        const promptData = directHistory[promptId]

        if (promptData.outputs) {
          for (const [nodeId, nodeOutputs] of Object.entries(promptData.outputs)) {
            if (typeof nodeOutputs === 'object' && nodeOutputs !== null) {
              // Check for image outputs
              if ('images' in nodeOutputs) {
                const images = (nodeOutputs as any).images
                for (const img of images) {
                  const outputFile: OutputFile = {
                    node_id: nodeId,
                    filename: img.filename,
                    type: 'image',
                    subfolder: img.subfolder || '',
                    url: this.getImageUrl(img.filename, img.subfolder || '')
                  }
                  outputFiles.push(outputFile)
                }
              }
              
              // Check for video outputs (they come in "gifs" array even for mp4 files)
              if ('gifs' in nodeOutputs) {
                const videos = (nodeOutputs as any).gifs
                for (const video of videos) {
                  const outputFile: OutputFile = {
                    node_id: nodeId,
                    filename: video.filename,
                    type: 'video',
                    subfolder: video.subfolder || '',
                    url: this.getVideoUrl(
                      video.filename, 
                      video.subfolder || '', 
                      video.format || 'video/h264-mp4',
                      video.frame_rate || 16
                    )
                  }
                  outputFiles.push(outputFile)
                }
              }
            }
          }

          if (outputFiles.length > 0) {
            console.log(`📋 Found ${outputFiles.length} output files (${outputFiles.filter(f => f.type === 'image').length} images, ${outputFiles.filter(f => f.type === 'video').length} videos) using direct history endpoint`)
            return outputFiles
          }
        }
      }

      // If we get here, no outputs were found
      console.warn(`⚠️ No outputs found for prompt ID: ${promptId}`)
      return []
    } catch (error) {
      console.error('❌ Error getting output files:', error)
      return []
    }
  }

  /**
   * Get the direct URL for an image
   */
  getImageUrl(filename: string, subfolder: string = ''): string {
    const params = new URLSearchParams({
      filename: filename,
      type: 'output'
    })

    // Only add subfolder parameter if it's not empty
    if (subfolder) {
      params.set('subfolder', subfolder)
    }

    return `${this.baseUrl}/api/view?${params.toString()}`
  }

  /**
   * Get the direct URL for a video
   */
  getVideoUrl(filename: string, subfolder: string = '', format: string = 'video/h264-mp4', frameRate: number = 16): string {
    const params = new URLSearchParams({
      filename: filename,
      type: 'output',
      format: format,
      frame_rate: frameRate.toString()
    })

    // Only add subfolder parameter if it's not empty
    if (subfolder) {
      params.set('subfolder', subfolder)
    }

    return `${this.baseUrl}/api/viewvideo?${params.toString()}`
  }

  /**
   * Wait for workflow completion with timeout and polling
   */
  async waitForWorkflowCompletion(
    promptId: string, 
    timeoutMinutes: number = 15,
    statusCallback?: (status: string) => void
  ): Promise<boolean> {
    console.log(`⏳ Waiting for workflow to complete (max ${timeoutMinutes} minutes)...`)

    const timeoutMs = timeoutMinutes * 60 * 1000
    const startTime = Date.now()
    let checkInterval = 3000 // Start with 3 seconds between checks (reduced API load)

    // Wait 3 seconds before first check to avoid immediate polling
    await new Promise(resolve => setTimeout(resolve, 3000))

    while (true) {
      // Check for timeout
      const elapsedTime = Date.now() - startTime
      if (elapsedTime > timeoutMs) {
        console.error(`⏰ Workflow processing timed out after ${timeoutMinutes} minutes`)
        return false
      }

      // Calculate percentage completion based on time
      const percentComplete = Math.min(95, Math.floor((elapsedTime / timeoutMs) * 100))

      // First check if it's in queue
      const { inQueue, status: queueStatus } = await this.isPromptInQueue(promptId)

      if (inQueue) {
        let queueStatusMsg = ''
        if (queueStatus === 'running') {
          queueStatusMsg = `Running (${percentComplete}% time elapsed)`
        } else if (queueStatus === 'pending') {
          queueStatusMsg = `Pending in queue (${percentComplete}% time elapsed)`
        } else {
          queueStatusMsg = `In queue: ${queueStatus} (${percentComplete}% time elapsed)`
        }

        if (statusCallback) {
          statusCallback(queueStatusMsg)
        }

        // Wait before checking again
        await new Promise(resolve => setTimeout(resolve, checkInterval))
        continue
      }

      // Check if the workflow has completed
      const { isComplete, history, error } = await this.checkWorkflowStatus(promptId)

      // Generate a more detailed status message
      let statusMsg = 'No outputs yet'
      if (isComplete) {
        statusMsg = 'Complete'
      } else if (error) {
        statusMsg = error
      }

      // If there's a callback, call it
      if (statusCallback) {
        const status = `${percentComplete}% - ${statusMsg}`
        statusCallback(status)
      }

      // If complete, return success
      if (isComplete) {
        if (statusCallback) {
          statusCallback('100% - Complete')
        }
        console.log('✅ Workflow completed successfully')
        return true
      }

      // If there's an error, return failure
      if (error && error.includes('Error:')) {
        console.error(`❌ Workflow failed: ${error}`)
        return false
      }

      // Gradually increase interval to reduce API load (3s -> 6s -> 9s -> 12s -> 15s max)
      checkInterval = Math.min(15000, checkInterval + 3000)
      await new Promise(resolve => setTimeout(resolve, checkInterval))
    }
  }

  // Legacy methods for backward compatibility
  async queuePrompt(promptData: PromptData, width: number = 1024, height: number = 1024, steps: number = 35): Promise<string> {
    console.warn('⚠️ queuePrompt is deprecated, use the new workflow-based methods instead')
    
    // For now, fall back to the simple workflow
    const workflow = this.createSimpleWorkflow(promptData, width, height, steps)
    return this.queueWorkflow(workflow)
  }

  async getStatus(promptId: string): Promise<JobStatus> {
    console.warn('⚠️ getStatus is deprecated, use checkWorkflowStatus instead')
    
    const { isComplete, history, error } = await this.checkWorkflowStatus(promptId)
    
    if (isComplete && history) {
      const outputFiles = await this.getOutputFiles(promptId)
      const images = outputFiles.filter(f => f.type === 'image').map(f => ({
        filename: f.filename,
        type: f.type
      }))
      const videos = outputFiles.filter(f => f.type === 'video').map(f => ({
        filename: f.filename,
        type: f.type
      }))
      
      return {
        status: 'completed',
        result: { images, videos }
      }
    } else if (error) {
      const { inQueue } = await this.isPromptInQueue(promptId)
      if (inQueue) {
        return { status: 'running' }
      } else {
        return { status: 'failed', error }
      }
    } else {
      return { status: 'pending' }
    }
  }

  async getImage(filename: string): Promise<Blob> {
    try {
      const response = await this.makeRequest(`/api/view?filename=${encodeURIComponent(filename)}&type=output`)
      
      if (!response.ok) {
        throw new Error(`Failed to get image: ${response.status} - ${response.statusText}`)
      }

      return await response.blob()
    } catch (error) {
      console.error('Error getting image:', error)
      throw error
    }
  }

  async getVideo(filename: string, format: string = 'video/h264-mp4', frameRate: number = 16): Promise<Blob> {
    try {
      const params = new URLSearchParams({
        filename: encodeURIComponent(filename),
        type: 'output',
        format: format,
        frame_rate: frameRate.toString()
      })
      
      const response = await this.makeRequest(`/api/viewvideo?${params.toString()}`)
      
      if (!response.ok) {
        throw new Error(`Failed to get video: ${response.status} - ${response.statusText}`)
      }

      return await response.blob()
    } catch (error) {
      console.error('Error getting video:', error)
      throw error
    }
  }

  async testConnection(): Promise<boolean> {
    try {
      const response = await this.makeRequest('/queue')
      const isSuccess = response.status >= 200 && response.status < 400
      
      if (isSuccess) {
        console.log('✅ ComfyUI connection successful')
      } else {
        console.warn(`⚠️ ComfyUI connection failed: ${response.status} ${response.statusText}`)
      }
      
      return isSuccess
    } catch (error) {
      console.error('❌ ComfyUI connection failed:', error)
      return false
    }
  }

  private createSimpleWorkflow(promptData: PromptData, width: number, height: number, steps: number): any {
    // Basic ComfyUI workflow structure for text-to-image generation
    // This is a fallback for the legacy queuePrompt method
    return {
      "3": {
        "inputs": {
          "seed": promptData.seed,
          "steps": steps,
          "cfg": 7.0,
          "sampler_name": "euler",
          "scheduler": "normal",
          "denoise": 1.0,
          "model": ["4", 0],
          "positive": ["6", 0],
          "negative": ["7", 0],
          "latent_image": ["5", 0]
        },
        "class_type": "KSampler"
      },
      "4": {
        "inputs": {
          "ckpt_name": "sd_xl_base_1.0.safetensors"
        },
        "class_type": "CheckpointLoaderSimple"
      },
      "5": {
        "inputs": {
          "width": width,
          "height": height,
          "batch_size": 1
        },
        "class_type": "EmptyLatentImage"
      },
      "6": {
        "inputs": {
          "text": promptData.positive,
          "clip": ["4", 1]
        },
        "class_type": "CLIPTextEncode"
      },
      "7": {
        "inputs": {
          "text": promptData.negative,
          "clip": ["4", 1]
        },
        "class_type": "CLIPTextEncode"
      },
      "8": {
        "inputs": {
          "samples": ["3", 0],
          "vae": ["4", 2]
        },
        "class_type": "VAEDecode"
      },
      "9": {
        "inputs": {
          "filename_prefix": "card_generation",
          "images": ["8", 0]
        },
        "class_type": "SaveImage"
      }
    }
  }
} 