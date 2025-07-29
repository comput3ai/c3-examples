import type { ComfyUIClient } from '../api/comfyui'

// Types for workflow analysis
export interface ConfigurableParameter {
  nodeId: string
  inputName: string
  paramType: 'prompt' | 'dimension' | 'seed' | 'steps' | 'cfg' | 'sampler' | 'scheduler' | 'model' | 'other'
  displayName: string
  description?: string
  currentValue: any
  valueType: 'string' | 'number' | 'boolean' | 'enum'
  enumOptions?: string[]
  min?: number
  max?: number
  step?: number
  isRequired: boolean
}

export interface WorkflowAnalysis {
  name: string
  description?: string
  nodeCount: number
  configurableParams: ConfigurableParameter[]
  textNodes: Array<{
    nodeId: string
    inputName: string
    currentText: string
    isPositivePrompt: boolean
    isNegativePrompt: boolean
  }>
  hasValidStructure: boolean
  errors: string[]
  warnings: string[]
}

export interface WorkflowTemplate {
  id: string
  name: string
  description: string
  category: 'text-to-image' | 'image-to-image' | 'controlnet' | 'upscaling' | 'custom'
  workflowUrl?: string
  workflowData?: any
  configurableParams: ConfigurableParameter[]
  previewImageUrl?: string
  tags: string[]
  author?: string
  version: string
  requirements?: string[]
}

export class WorkflowAnalyzer {
  
  /**
   * Analyze a ComfyUI workflow to extract configurable parameters
   */
  analyzeWorkflow(workflowData: any, name?: string): WorkflowAnalysis {
    const errors: string[] = []
    const warnings: string[] = []
    
    if (!workflowData || !workflowData.nodes) {
      errors.push('Invalid workflow: missing nodes')
      return {
        name: name || 'Unknown Workflow',
        nodeCount: 0,
        configurableParams: [],
        textNodes: [],
        hasValidStructure: false,
        errors,
        warnings
      }
    }

    const nodes = workflowData.nodes
    const configurableParams: ConfigurableParameter[] = []
    const textNodes: Array<{
      nodeId: string
      inputName: string
      currentText: string
      isPositivePrompt: boolean
      isNegativePrompt: boolean
    }> = []

    // Analyze each node
    for (const node of nodes) {
      this.analyzeNode(node, configurableParams, textNodes, warnings)
    }

    return {
      name: name || this.extractWorkflowName(workflowData) || 'Analyzed Workflow',
      description: this.extractWorkflowDescription(workflowData),
      nodeCount: nodes.length,
      configurableParams,
      textNodes,
      hasValidStructure: errors.length === 0,
      errors,
      warnings
    }
  }

  private analyzeNode(
    node: any, 
    configurableParams: ConfigurableParameter[], 
    textNodes: any[], 
    warnings: string[]
  ): void {
    const nodeId = String(node.id)
    const nodeType = node.type
    const title = node.title || node._meta?.title || nodeType

    // Analyze based on node type
    switch (nodeType) {
      case 'CLIPTextEncode':
        this.analyzeCLIPTextNode(node, configurableParams, textNodes)
        break
      
      // WanVideo text encoding nodes
      case 'WanVideoTextEncode':
        this.analyzeWanVideoTextEncode(node, configurableParams, textNodes)
        break
      
      case 'KSampler':
      case 'SONICSampler':
        this.analyzeSamplerNode(node, configurableParams)
        break
      
      case 'EmptyLatentImage':
      case 'EmptySD3LatentImage':
        this.analyzeLatentImageNode(node, configurableParams)
        break
      
      case 'UNETLoader':
      case 'CheckpointLoaderSimple':
        this.analyzeModelLoaderNode(node, configurableParams)
        break
      
      case 'VAELoader':
        this.analyzeVAELoaderNode(node, configurableParams)
        break
      
      case 'ControlNetLoader':
      case 'ControlNetApply':
        this.analyzeControlNetNode(node, configurableParams)
        break
      
      // Video workflow nodes
      case 'WanVideoEmptyEmbeds':
        this.analyzeWanVideoEmptyEmbeds(node, configurableParams)
        break
      
      case 'WanVideoDecode':
        this.analyzeWanVideoDecode(node, configurableParams)
        break
      
      case 'LoadWanVideoT5TextEncoder':
      case 'LoadWanVideoUnet':
      case 'LoadWanVideoVae':
        this.analyzeWanVideoLoader(node, configurableParams)
        break
      
      // SONIC nodes for avatar generation
      case 'SONICTLoader':
      case 'SONICModel':
        this.analyzeSONICNode(node, configurableParams)
        break
      
      case 'SONIC_PreData':
        this.analyzeSONICPreData(node, configurableParams)
        break
      
      // Image input nodes
      case 'LoadImage':
        this.analyzeLoadImageNode(node, configurableParams)
        break
      
      // Video Helper Suite nodes
      case 'VHS_VideoCombine':
        this.analyzeVideoCombineNode(node, configurableParams)
        break
      
      // SD3 specific nodes
      case 'ModelSamplingSD3':
        this.analyzeModelSamplingSD3(node, configurableParams)
        break
      
      // Easy Use nodes
      case 'easy cleanGpuUsed':
        // These nodes typically don't have configurable parameters
        break
      
      default:
        // Generic analysis for unknown node types
        this.analyzeGenericNode(node, configurableParams, warnings)
        break
    }
  }

  private analyzeCLIPTextNode(node: any, configurableParams: ConfigurableParameter[], textNodes: any[]): void {
    const nodeId = String(node.id)
    const title = node.title || node._meta?.title || ''
    const currentText = node.widgets_values?.[0] || ''
    
    // Enhanced prompt detection
    const isPositivePrompt = title.toLowerCase().includes('positive') || 
                            title.toLowerCase().includes('prompt') && !title.toLowerCase().includes('negative')
    const isNegativePrompt = title.toLowerCase().includes('negative')
    
    // Analyze text content for prompt type detection
    const textLower = currentText.toLowerCase()
    const hasNegativeKeywords = /\b(blurry|low quality|bad|worst|ugly|deformed|distorted|artifacts|watermark|text|signature)\b/.test(textLower)
    const hasPositiveKeywords = /\b(high quality|detailed|beautiful|masterpiece|best quality|ultra|hd|4k|professional)\b/.test(textLower)
    
    // Determine prompt type based on context
    let promptType: 'positive' | 'negative' | 'unknown' = 'unknown'
    if (isPositivePrompt || (hasPositiveKeywords && !hasNegativeKeywords)) {
      promptType = 'positive'
    } else if (isNegativePrompt || hasNegativeKeywords) {
      promptType = 'negative'
    } else if (currentText.length > 10) {
      // Assume longer text is positive prompt
      promptType = 'positive'
    }
    
    textNodes.push({
      nodeId,
      inputName: 'text',
      currentText,
      isPositivePrompt: promptType === 'positive',
      isNegativePrompt: promptType === 'negative'
    })

    const displayName = promptType === 'positive' ? '🟢 Positive Prompt' :
                       promptType === 'negative' ? '🔴 Negative Prompt' :
                       title || 'Text Prompt'

    configurableParams.push({
      nodeId,
      inputName: 'text',
      paramType: 'prompt',
      displayName,
      description: promptType === 'positive' ? 'Main description of what to generate' :
                  promptType === 'negative' ? 'What to avoid in the generation' :
                  'Text input for generation',
      currentValue: currentText,
      valueType: 'string',
      isRequired: true
    })
  }

  private analyzeSamplerNode(node: any, configurableParams: ConfigurableParameter[]): void {
    const nodeId = String(node.id)
    const widgets = node.widgets_values || []
    
    // Common sampler parameters based on typical ComfyUI workflows
    const paramMap = [
      { index: 0, name: 'seed', type: 'seed', displayName: 'Seed', valueType: 'number' as const },
      { index: 1, name: 'control', type: 'other', displayName: 'Seed Control', valueType: 'enum' as const },
      { index: 2, name: 'steps', type: 'steps', displayName: 'Steps', valueType: 'number' as const },
      { index: 3, name: 'cfg', type: 'cfg', displayName: 'CFG Scale', valueType: 'number' as const },
      { index: 4, name: 'sampler_name', type: 'sampler', displayName: 'Sampler', valueType: 'enum' as const },
      { index: 5, name: 'scheduler', type: 'scheduler', displayName: 'Scheduler', valueType: 'enum' as const },
      { index: 6, name: 'denoise', type: 'other', displayName: 'Denoise', valueType: 'number' as const }
    ]

    paramMap.forEach(param => {
      if (widgets.length > param.index) {
        configurableParams.push({
          nodeId,
          inputName: param.name,
          paramType: param.type as 'prompt' | 'dimension' | 'seed' | 'steps' | 'cfg' | 'sampler' | 'scheduler' | 'model' | 'other',
          displayName: param.displayName,
          currentValue: widgets[param.index],
          valueType: param.valueType,
          isRequired: param.type === 'steps' || param.type === 'cfg',
          ...(param.valueType === 'number' && {
            min: param.type === 'steps' ? 1 : param.type === 'cfg' ? 0.1 : undefined,
            max: param.type === 'steps' ? 150 : param.type === 'cfg' ? 30 : undefined,
            step: param.type === 'cfg' ? 0.1 : 1
          })
        })
      }
    })
  }

  private analyzeLatentImageNode(node: any, configurableParams: ConfigurableParameter[]): void {
    const nodeId = String(node.id)
    const widgets = node.widgets_values || []
    
    if (widgets.length >= 2) {
      configurableParams.push(
        {
          nodeId,
          inputName: 'width',
          paramType: 'dimension',
          displayName: 'Width',
          currentValue: widgets[0],
          valueType: 'number',
          min: 256,
          max: 2048,
          step: 64,
          isRequired: true
        },
        {
          nodeId,
          inputName: 'height',
          paramType: 'dimension',
          displayName: 'Height',
          currentValue: widgets[1],
          valueType: 'number',
          min: 256,
          max: 2048,
          step: 64,
          isRequired: true
        }
      )
    }

    if (widgets.length >= 3) {
      configurableParams.push({
        nodeId,
        inputName: 'batch_size',
        paramType: 'other',
        displayName: 'Batch Size',
        currentValue: widgets[2],
        valueType: 'number',
        min: 1,
        max: 16,
        step: 1,
        isRequired: false
      })
    }
  }

  private analyzeModelLoaderNode(node: any, configurableParams: ConfigurableParameter[]): void {
    const nodeId = String(node.id)
    const nodeType = node.type
    const widgets = node.widgets_values || []
    
    if (nodeType === 'UNETLoader') {
      // Handle UNETLoader specifically
      if (widgets.length > 0) {
        // First parameter: unet_name (model selection)
        const currentModel = widgets[0]
        const isHiDreamModel = currentModel && currentModel.includes('HiDream/')
        
        configurableParams.push({
          nodeId,
          inputName: 'unet_name',
          paramType: 'model',
          displayName: 'UNET Model',
          description: 'Select the diffusion model to use for generation',
          currentValue: currentModel,
          valueType: 'enum',
          enumOptions: isHiDreamModel ? [
            'HiDream/hidream_i1_dev_fp8.safetensors',
            'HiDream/hidream_i1_fast_fp8.safetensors',
            'HiDream/hidream_i1_full_fp8.safetensors'
          ] : [currentModel], // Fallback to current value if not HiDream
          isRequired: true
        })
      }
      
      if (widgets.length > 1) {
        // Second parameter: weight_dtype
        configurableParams.push({
          nodeId,
          inputName: 'weight_dtype',
          paramType: 'other',
          displayName: 'Weight Data Type',
          description: 'Data type for model weights',
          currentValue: widgets[1],
          valueType: 'enum',
          enumOptions: ['default', 'fp8_e4m3fn', 'fp8_e5m2', 'fp16', 'bf16'],
          isRequired: false
        })
      }
    } else if (nodeType === 'CheckpointLoaderSimple') {
      // Handle CheckpointLoaderSimple
      if (widgets.length > 0) {
        configurableParams.push({
          nodeId,
          inputName: 'ckpt_name',
          paramType: 'model',
          displayName: 'Checkpoint',
          description: 'Select the checkpoint model to load',
          currentValue: widgets[0],
          valueType: 'string', // Could be enum if we knew the available checkpoints
          isRequired: true
        })
      }
    } else {
      // Fallback for other model loader types
      if (widgets.length > 0) {
        configurableParams.push({
          nodeId,
          inputName: 'model_name',
          paramType: 'model',
          displayName: 'Model',
          currentValue: widgets[0],
          valueType: 'string',
          isRequired: true
        })
      }
    }
  }

  private analyzeVAELoaderNode(node: any, configurableParams: ConfigurableParameter[]): void {
    const nodeId = String(node.id)
    const widgets = node.widgets_values || []
    
    if (widgets.length > 0) {
      configurableParams.push({
        nodeId,
        inputName: 'vae_name',
        paramType: 'model',
        displayName: 'VAE',
        currentValue: widgets[0],
        valueType: 'string',
        isRequired: false
      })
    }
  }

  private analyzeControlNetNode(node: any, configurableParams: ConfigurableParameter[]): void {
    const nodeId = String(node.id)
    const widgets = node.widgets_values || []
    
    // ControlNet nodes vary significantly, so we'll do basic analysis
    widgets.forEach((widget: any, index: number) => {
      if (typeof widget === 'string' && widget.includes('.')) {
        // Likely a model file
        configurableParams.push({
          nodeId,
          inputName: `param_${index}`,
          paramType: 'model',
          displayName: `ControlNet Model ${index + 1}`,
          currentValue: widget,
          valueType: 'string',
          isRequired: false
        })
      } else if (typeof widget === 'number') {
        configurableParams.push({
          nodeId,
          inputName: `param_${index}`,
          paramType: 'other',
          displayName: `Parameter ${index + 1}`,
          currentValue: widget,
          valueType: 'number',
          isRequired: false
        })
      }
    })
  }

  private analyzeGenericNode(node: any, configurableParams: ConfigurableParameter[], warnings: string[]): void {
    const nodeId = String(node.id)
    const nodeType = node.type
    const widgets = node.widgets_values || []
    
    // For unknown nodes, analyze widgets_values generically
    // Ensure widgets is an array before using forEach
    if (Array.isArray(widgets)) {
      widgets.forEach((widget: any, index: number) => {
        if (widget !== null && widget !== undefined) {
          const valueType = typeof widget === 'number' ? 'number' : 
                           typeof widget === 'boolean' ? 'boolean' : 'string'
          
          configurableParams.push({
            nodeId,
            inputName: `widget_${index}`,
            paramType: 'other',
            displayName: `${nodeType} Parameter ${index + 1}`,
            description: `Widget value ${index} of ${nodeType} node`,
            currentValue: widget,
            valueType,
            isRequired: false
          })
        }
      })

      if (widgets.length > 0) {
        warnings.push(`Unknown node type '${nodeType}' analyzed generically`)
      }
    } else if (widgets !== null && widgets !== undefined) {
      // widgets_values exists but is not an array
      warnings.push(`Node '${nodeType}' has non-array widgets_values: ${typeof widgets}`)
    }
  }

  // New analyzer methods for video and SONIC workflows
  private analyzeWanVideoEmptyEmbeds(node: any, configurableParams: ConfigurableParameter[]): void {
    const nodeId = String(node.id)
    const widgets = node.widgets_values || []
    
    if (widgets.length >= 3) {
      configurableParams.push(
        {
          nodeId,
          inputName: 'width',
          paramType: 'dimension',
          displayName: 'Video Width',
          currentValue: widgets[0],
          valueType: 'number',
          min: 256,
          max: 2048,
          step: 32,
          isRequired: true
        },
        {
          nodeId,
          inputName: 'height',
          paramType: 'dimension',
          displayName: 'Video Height',
          currentValue: widgets[1],
          valueType: 'number',
          min: 256,
          max: 2048,
          step: 32,
          isRequired: true
        },
        {
          nodeId,
          inputName: 'frames',
          paramType: 'other',
          displayName: 'Frame Count',
          currentValue: widgets[2],
          valueType: 'number',
          min: 1,
          max: 240,
          step: 1,
          isRequired: true
        }
      )
    }
  }

  private analyzeWanVideoDecode(node: any, configurableParams: ConfigurableParameter[]): void {
    const nodeId = String(node.id)
    const widgets = node.widgets_values || []
    
    // Ensure widgets is an array before using forEach
    if (Array.isArray(widgets) && widgets.length > 0) {
      widgets.forEach((widget: any, index: number) => {
        if (typeof widget === 'number') {
          configurableParams.push({
            nodeId,
            inputName: `decode_param_${index}`,
            paramType: 'other',
            displayName: `Decode Parameter ${index + 1}`,
            currentValue: widget,
            valueType: 'number',
            isRequired: false
          })
        } else if (typeof widget === 'boolean') {
          configurableParams.push({
            nodeId,
            inputName: `decode_bool_${index}`,
            paramType: 'other',
            displayName: `Decode Option ${index + 1}`,
            currentValue: widget,
            valueType: 'boolean',
            isRequired: false
          })
        }
      })
    }
  }

  private analyzeWanVideoLoader(node: any, configurableParams: ConfigurableParameter[]): void {
    const nodeId = String(node.id)
    const widgets = node.widgets_values || []
    
    // Ensure widgets is an array before accessing
    if (Array.isArray(widgets) && widgets.length > 0) {
      // First widget is usually the model name
      configurableParams.push({
        nodeId,
        inputName: 'model_name',
        paramType: 'model',
        displayName: `${node.type} Model`,
        currentValue: widgets[0],
        valueType: 'string',
        isRequired: true
      })
      
      // Additional parameters
      widgets.slice(1).forEach((widget: any, index: number) => {
        if (widget !== null && widget !== undefined) {
          configurableParams.push({
            nodeId,
            inputName: `param_${index + 1}`,
            paramType: 'other',
            displayName: `Parameter ${index + 2}`,
            currentValue: widget,
            valueType: typeof widget === 'number' ? 'number' : 'string',
            isRequired: false
          })
        }
      })
    }
  }

  private analyzeSONICNode(node: any, configurableParams: ConfigurableParameter[]): void {
    const nodeId = String(node.id)
    const widgets = node.widgets_values || []
    
    // Ensure widgets is an array before using forEach
    if (Array.isArray(widgets)) {
      widgets.forEach((widget: any, index: number) => {
        if (widget !== null && widget !== undefined) {
          configurableParams.push({
            nodeId,
            inputName: `sonic_param_${index}`,
            paramType: 'other',
            displayName: `SONIC Parameter ${index + 1}`,
            currentValue: widget,
            valueType: typeof widget === 'number' ? 'number' : 'string',
            isRequired: false
          })
        }
      })
    }
  }

  private analyzeSONICPreData(node: any, configurableParams: ConfigurableParameter[]): void {
    const nodeId = String(node.id)
    const widgets = node.widgets_values || []
    
    // Ensure widgets is an array before using forEach
    if (Array.isArray(widgets)) {
      // SONIC PreData typically has duration and other audio-related parameters
      widgets.forEach((widget: any, index: number) => {
        if (typeof widget === 'number') {
          const displayName = index === 0 ? 'Duration (seconds)' : `Audio Parameter ${index + 1}`
          configurableParams.push({
            nodeId,
            inputName: `audio_param_${index}`,
            paramType: 'other',
            displayName,
            currentValue: widget,
            valueType: 'number',
            isRequired: index === 0, // Duration is typically required
            ...(index === 0 && { min: 0.1, max: 60, step: 0.1 })
          })
        }
      })
    }
  }

  private analyzeLoadImageNode(node: any, configurableParams: ConfigurableParameter[]): void {
    const nodeId = String(node.id)
    const widgets = node.widgets_values || []
    
    if (widgets.length > 0) {
      configurableParams.push({
        nodeId,
        inputName: 'image_path',
        paramType: 'other',
        displayName: 'Image File',
        currentValue: widgets[0],
        valueType: 'string',
        isRequired: true
      })
    }
  }

  private analyzeVideoCombineNode(node: any, configurableParams: ConfigurableParameter[]): void {
    const nodeId = String(node.id)
    const widgets = node.widgets_values || []
    
    // Ensure widgets is an array before using forEach
    if (Array.isArray(widgets)) {
      widgets.forEach((widget: any, index: number) => {
        if (widget !== null && widget !== undefined) {
          const valueType = typeof widget === 'number' ? 'number' : 
                           typeof widget === 'boolean' ? 'boolean' : 'string'
          
          configurableParams.push({
            nodeId,
            inputName: `video_param_${index}`,
            paramType: 'other',
            displayName: `Video Parameter ${index + 1}`,
            currentValue: widget,
            valueType,
            isRequired: false
          })
        }
      })
    }
  }

  private analyzeModelSamplingSD3(node: any, configurableParams: ConfigurableParameter[]): void {
    const nodeId = String(node.id)
    const widgets = node.widgets_values || []
    
    if (widgets.length > 0) {
      configurableParams.push({
        nodeId,
        inputName: 'shift',
        paramType: 'other',
        displayName: 'SD3 Shift Value',
        description: 'Controls the sampling shift for Stable Diffusion 3',
        currentValue: widgets[0],
        valueType: 'number',
        min: 0.1,
        max: 10.0,
        step: 0.1,
        isRequired: false
      })
    }
  }

  private extractWorkflowName(workflowData: any): string | null {
    // Try to extract name from metadata
    if (workflowData.extra?.frontendVersion) {
      return 'ComfyUI Workflow'
    }
    if (workflowData.title) {
      return workflowData.title
    }
    return null
  }

  private extractWorkflowDescription(workflowData: any): string | undefined {
    // Try to extract description from various sources
    if (workflowData.description) {
      return workflowData.description
    }
    if (workflowData.extra?.description) {
      return workflowData.extra.description
    }
    return undefined
  }

  /**
   * Create a workflow template from analyzed workflow
   */
  createWorkflowTemplate(
    analysis: WorkflowAnalysis, 
    workflowData: any,
    metadata: {
      category?: WorkflowTemplate['category']
      author?: string
      tags?: string[]
      workflowUrl?: string
    } = {}
  ): WorkflowTemplate {
    return {
      id: `workflow_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name: analysis.name,
      description: analysis.description || `Workflow with ${analysis.nodeCount} nodes`,
      category: metadata.category || 'custom',
      workflowData,
      workflowUrl: metadata.workflowUrl,
      configurableParams: analysis.configurableParams,
      tags: metadata.tags || [],
      author: metadata.author,
      version: '1.0.0',
      requirements: this.extractRequirements(analysis)
    }
  }

  private extractRequirements(analysis: WorkflowAnalysis): string[] {
    const requirements: string[] = []
    
    // Analyze configurable params to suggest requirements
    const hasControlNet = analysis.configurableParams.some(p => 
      p.displayName.toLowerCase().includes('controlnet')
    )
    if (hasControlNet) {
      requirements.push('ControlNet extension')
    }

    const hasSpecialSamplers = analysis.configurableParams.some(p => 
      p.currentValue && String(p.currentValue).includes('sonic')
    )
    if (hasSpecialSamplers) {
      requirements.push('SONIC Sampler extension')
    }

    return requirements
  }

  /**
   * Update workflow with new parameter values
   */
  updateWorkflowParameters(
    workflowData: any, 
    parameterUpdates: Record<string, any>
  ): any {
    const updatedWorkflow = JSON.parse(JSON.stringify(workflowData))
    
    console.log(`🔧 Applying ${Object.keys(parameterUpdates).length} parameter updates to workflow:`)
    console.log(parameterUpdates)
    
    let appliedCount = 0
    let skippedCount = 0
    
    for (const node of updatedWorkflow.nodes) {
      const nodeId = String(node.id)
      
      // Check if this node has parameter updates
      for (const [paramKey, newValue] of Object.entries(parameterUpdates)) {
        if (paramKey.startsWith(`${nodeId}.`)) {
          const inputName = paramKey.split('.')[1]
          const originalValue = this.getNodeParameterValue(node, inputName)
          
          console.log(`📝 Updating ${paramKey}: ${originalValue} → ${newValue}`)
          const success = this.updateNodeParameter(node, inputName, newValue)
          
          if (success) {
            appliedCount++
          } else {
            skippedCount++
          }
        }
      }
    }
    
    console.log(`✅ Applied ${appliedCount} parameters, skipped ${skippedCount} parameters`)
    
    return updatedWorkflow
  }

  private updateNodeParameter(node: any, inputName: string, newValue: any): boolean {
    // Handle different input types based on node analysis
    const nodeType = node.type || node.class_type
    
    // For prompt/text parameters
    if (inputName === 'text' && node.widgets_values) {
      node.widgets_values[0] = newValue
      return true
    }
    
    // Handle parameters based on node type and input name
    if (nodeType === 'KSampler' && node.widgets_values) {
      const ksamplerMap: Record<string, number> = {
        'seed': 0,
        'control': 1,
        'steps': 2,
        'cfg': 3,
        'sampler_name': 4,
        'scheduler': 5,
        'denoise': 6
      }
      
      if (inputName in ksamplerMap) {
        node.widgets_values[ksamplerMap[inputName]] = newValue
        return true
      }
    }
    
    if (nodeType === 'SONICSampler' && node.widgets_values) {
      const sonicSamplerMap: Record<string, number> = {
        'seed': 0,
        'steps': 1,
        'cfg': 2,
        'sampler_name': 3,
        'scheduler': 4,
        'denoise': 5
      }
      
      if (inputName in sonicSamplerMap) {
        node.widgets_values[sonicSamplerMap[inputName]] = newValue
        return true
      }
    }
    
    if ((nodeType === 'EmptyLatentImage' || nodeType === 'EmptySD3LatentImage') && node.widgets_values) {
      const latentMap: Record<string, number> = {
        'width': 0,
        'height': 1,
        'batch_size': 2
      }
      
      if (inputName in latentMap) {
        node.widgets_values[latentMap[inputName]] = newValue
        return true
      }
    }
    
    if (nodeType === 'SaveImage' && node.widgets_values) {
      if (inputName === 'filename_prefix') {
        node.widgets_values[0] = newValue
        return true
      }
    }
    
    if (nodeType === 'VAELoader' && node.widgets_values) {
      if (inputName === 'vae_name') {
        node.widgets_values[0] = newValue
        return true
      }
    }
    
    if (nodeType === 'UNETLoader' && node.widgets_values) {
      const unetMap: Record<string, number> = {
        'unet_name': 0,
        'weight_dtype': 1
      }
      
      if (inputName in unetMap) {
        node.widgets_values[unetMap[inputName]] = newValue
        return true
      }
    }
    
    if (nodeType === 'QuadrupleCLIPLoader' && node.widgets_values) {
      const clipMap: Record<string, number> = {
        'clip_name1': 0,
        'clip_name2': 1,
        'clip_name3': 2,
        'clip_name4': 3
      }
      
      if (inputName in clipMap) {
        node.widgets_values[clipMap[inputName]] = newValue
        return true
      }
    }
    
    if (nodeType === 'ModelSamplingSD3' && node.widgets_values) {
      if (inputName === 'shift') {
        node.widgets_values[0] = newValue
        return true
      }
    }
    
    // Video workflow node types
    if (nodeType === 'WanVideoTextEncode' && node.widgets_values) {
      const videoTextMap: Record<string, number> = {
        'positive_prompt': 0,
        'negative_prompt': 1,
        'enable_text_conditioning': 2
      }
      
      if (inputName in videoTextMap) {
        node.widgets_values[videoTextMap[inputName]] = newValue
        return true
      }
    }
    
    if (nodeType === 'WanVideoSampler' && node.widgets_values) {
      const videoSamplerMap: Record<string, number> = {
        'steps': 0,
        'cfg': 1,
        'shift': 2,
        'seed': 3,
        'sampler_name': 4,
        'force_offload': 5,
        'scheduler': 6,
        'riflex_freq_index': 7
      }
      
      if (inputName in videoSamplerMap) {
        node.widgets_values[videoSamplerMap[inputName]] = newValue
        return true
      }
    }
    
    if (nodeType === 'WanVideoEmptyEmbeds' && node.widgets_values) {
      const videoEmbedsMap: Record<string, number> = {
        'width': 0,
        'height': 1,
        'num_frames': 2
      }
      
      if (inputName in videoEmbedsMap) {
        node.widgets_values[videoEmbedsMap[inputName]] = newValue
        return true
      }
    }
    
    if (nodeType === 'WanVideoModelLoader' && node.widgets_values) {
      const videoModelMap: Record<string, number> = {
        'model': 0,
        'base_precision': 1,
        'quantization': 2,
        'load_device': 3
      }
      
      if (inputName in videoModelMap) {
        node.widgets_values[videoModelMap[inputName]] = newValue
        return true
      }
    }
    
    if (nodeType === 'WanVideoVAELoader' && node.widgets_values) {
      const videoVAEMap: Record<string, number> = {
        'model_name': 0,
        'precision': 1
      }
      
      if (inputName in videoVAEMap) {
        node.widgets_values[videoVAEMap[inputName]] = newValue
        return true
      }
    }
    
    if (nodeType === 'LoadWanVideoT5TextEncoder' && node.widgets_values) {
      const videoT5Map: Record<string, number> = {
        'model_name': 0,
        'precision': 1
      }
      
      if (inputName in videoT5Map) {
        node.widgets_values[videoT5Map[inputName]] = newValue
        return true
      }
    }
    
    if (nodeType === 'WanVideoDecode' && node.widgets_values) {
      const videoDecodeMap: Record<string, number> = {
        'enable_vae_tiling': 0,
        'tile_x': 1,
        'tile_y': 2,
        'tile_stride_x': 3,
        'tile_stride_y': 4
      }
      
      if (inputName in videoDecodeMap) {
        node.widgets_values[videoDecodeMap[inputName]] = newValue
        return true
      }
    }
    
    if (nodeType === 'WanVideoTorchCompileSettings' && node.widgets_values) {
      const torchCompileMap: Record<string, number> = {
        'mode': 0,
        'backend': 1,
        'dynamic': 2,
        'fullgraph': 3,
        'compile_transformer_blocks_only': 4,
        'dynamo_cache_size_limit': 5
      }
      
      if (inputName in torchCompileMap) {
        node.widgets_values[torchCompileMap[inputName]] = newValue
        return true
      }
    }
    
    if (nodeType === 'WanVideoBlockSwap' && node.widgets_values) {
      const blockSwapMap: Record<string, number> = {
        'blocks_to_swap': 0,
        'offload_txt_emb': 1,
        'offload_img_emb': 2,
        'batch_offload': 3,
        'blocks_to_keep': 4
      }
      
      if (inputName in blockSwapMap) {
        node.widgets_values[blockSwapMap[inputName]] = newValue
        return true
      }
    }
    
    if (nodeType === 'WanVideoTeaCache' && node.widgets_values) {
      const teaCacheMap: Record<string, number> = {
        'rel_l1_thresh': 0,
        'start_step': 1,
        'end_step': 2,
        'cache_device': 3,
        'use_coefficients': 4,
        'coefficient_type': 5
      }
      
      if (inputName in teaCacheMap) {
        node.widgets_values[teaCacheMap[inputName]] = newValue
        return true
      }
    }
    
    if (nodeType === 'WanVideoEnhanceAVideo' && node.widgets_values) {
      const enhanceVideoMap: Record<string, number> = {
        'weight': 0,
        'start_percent': 1,
        'end_percent': 2
      }
      
      if (inputName in enhanceVideoMap) {
        node.widgets_values[enhanceVideoMap[inputName]] = newValue
        return true
      }
    }
    
    if (nodeType === 'VHS_VideoCombine' && node.widgets_values) {
      // Handle object format for VHS_VideoCombine
      if (typeof node.widgets_values === 'object' && !Array.isArray(node.widgets_values)) {
        node.widgets_values[inputName] = newValue
        return true
      }
      
      // Handle array format as fallback
      const videoCombineMap: Record<string, number> = {
        'frame_rate': 0,
        'loop_count': 1,
        'filename_prefix': 2,
        'format': 3,
        'pingpong': 4,
        'save_output': 5
      }
      
      if (inputName in videoCombineMap && Array.isArray(node.widgets_values)) {
        node.widgets_values[videoCombineMap[inputName]] = newValue
        return true
      }
    }
    
    // Generic widget index fallback (for widget_0, widget_1, etc.)
    if (inputName.startsWith('widget_') && node.widgets_values) {
      const index = parseInt(inputName.replace('widget_', ''))
      if (!isNaN(index) && index < node.widgets_values.length) {
        node.widgets_values[index] = newValue
        return true
      }
    }
    
    // If no specific mapping found, try to find the parameter in the node's widget values by position
    // This is a fallback for unmapped parameters
    console.warn(`⚠️ No parameter mapping found for ${nodeType}.${inputName}, value not applied`)
    return false
  }

  private getNodeParameterValue(node: any, inputName: string): any {
    const nodeType = node.type || node.class_type
    
    // For prompt/text parameters
    if (inputName === 'text' && node.widgets_values) {
      return node.widgets_values[0]
    }
    
    // Handle parameters based on node type and input name
    if (nodeType === 'KSampler' && node.widgets_values) {
      const ksamplerMap: Record<string, number> = {
        'seed': 0,
        'control': 1,
        'steps': 2,
        'cfg': 3,
        'sampler_name': 4,
        'scheduler': 5,
        'denoise': 6
      }
      
      if (inputName in ksamplerMap) {
        return node.widgets_values[ksamplerMap[inputName]]
      }
    }
    
    if (nodeType === 'SONICSampler' && node.widgets_values) {
      const sonicSamplerMap: Record<string, number> = {
        'seed': 0,
        'steps': 1,
        'cfg': 2,
        'sampler_name': 3,
        'scheduler': 4,
        'denoise': 5
      }
      
      if (inputName in sonicSamplerMap) {
        return node.widgets_values[sonicSamplerMap[inputName]]
      }
    }
    
    if ((nodeType === 'EmptyLatentImage' || nodeType === 'EmptySD3LatentImage') && node.widgets_values) {
      const latentMap: Record<string, number> = {
        'width': 0,
        'height': 1,
        'batch_size': 2
      }
      
      if (inputName in latentMap) {
        return node.widgets_values[latentMap[inputName]]
      }
    }
    
    // Add more mappings as needed for other node types...
    
    // Generic widget index fallback
    if (inputName.startsWith('widget_') && node.widgets_values) {
      const index = parseInt(inputName.replace('widget_', ''))
      if (!isNaN(index) && index < node.widgets_values.length) {
        return node.widgets_values[index]
      }
    }
    
    return undefined
  }

  // Enhanced analysis for WanVideo text encoding nodes
  private analyzeWanVideoTextEncode(node: any, configurableParams: ConfigurableParameter[], textNodes: any[]): void {
    const nodeId = String(node.id)
    const widgets = node.widgets_values || []
    
    if (Array.isArray(widgets) && widgets.length > 0) {
      widgets.forEach((widget: any, index: number) => {
        if (typeof widget === 'string' && widget.length > 0) {
          // Analyze text content for prompt type
          const textLower = widget.toLowerCase()
          const hasNegativeKeywords = /\b(blurry|low quality|bad|worst|ugly|deformed|distorted|artifacts|watermark|text|signature|nsfw)\b/.test(textLower)
          const hasPositiveKeywords = /\b(high quality|detailed|beautiful|masterpiece|best quality|ultra|hd|4k|professional|cinematic)\b/.test(textLower)
          const hasChinese = /[\u4e00-\u9fff]/.test(widget)
          
          // Smart prompt type detection
          let promptType: 'positive' | 'negative' | 'unknown' = 'unknown'
          let displayName = `WanVideo Text ${index + 1}`
          
          if (hasNegativeKeywords || (widget.length < 50 && !hasPositiveKeywords)) {
            promptType = 'negative'
            displayName = '🔴 Negative Prompt (WanVideo)'
          } else if (hasPositiveKeywords || widget.length > 50 || (!hasChinese && index === 0)) {
            promptType = 'positive' 
            displayName = '🟢 Positive Prompt (WanVideo)'
          } else if (hasChinese && index === 1) {
            // Chinese text often used as negative prompts in some workflows
            promptType = 'negative'
            displayName = '🔴 Negative Prompt (Chinese)'
          }
          
          textNodes.push({
            nodeId,
            inputName: `text_${index}`,
            currentText: widget,
            isPositivePrompt: promptType === 'positive',
            isNegativePrompt: promptType === 'negative'
          })

          configurableParams.push({
            nodeId,
            inputName: `text_${index}`,
            paramType: 'prompt',
            displayName,
            description: promptType === 'positive' ? 'Main video description (will be replaced with CSV data)' :
                        promptType === 'negative' ? 'What to avoid in video generation' :
                        'Text input for video generation',
            currentValue: widget,
            valueType: 'string',
            isRequired: promptType === 'positive' // Positive prompts are required
          })
        }
      })
    }
  }
} 