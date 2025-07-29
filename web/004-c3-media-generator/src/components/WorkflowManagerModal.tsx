import { useState, useRef, useEffect } from 'react'
import { useWorkflowStore } from '../stores/workflowStore'
import { X, Upload, Link, Settings, Play, Trash2, FileText, AlertCircle, CheckCircle, Tag, User, Calendar, Zap, Image as ImageIcon, Plus, ExternalLink, Check } from 'lucide-react'
import type { WorkflowTemplate, ConfigurableParameter } from '../lib/core/workflowAnalyzer'

interface WorkflowManagerModalProps {
  isOpen: boolean
  onClose: () => void
  onWorkflowReady?: (workflow: any) => void
}

export default function WorkflowManagerModal({ isOpen, onClose, onWorkflowReady }: WorkflowManagerModalProps) {
  const {
    availableWorkflows,
    selectedWorkflow,
    currentAnalysis,
    configuredParams,
    promptMapping,
    isLoading,
    error,
    loadBuiltinWorkflows,
    loadWorkflowFromUrl,
    uploadWorkflow,
    selectWorkflow,
    removeWorkflow,
    updateParameter,
    resetParameters,
    updatePromptMapping,
    getUpdatedWorkflow,
    validateCurrentWorkflow
  } = useWorkflowStore()
  
  const [activeTab, setActiveTab] = useState<'browse' | 'configure'>('browse')

  // Pre-configured workflow configurations for the two working workflows
  const BUILTIN_WORKFLOWS = [
    {
      id: 'text-to-image',
      name: 'Text to Image (HiDream)',
      description: 'Generate high-quality images from text prompts using Stabe Difussion with HiDream',
      category: 'text-to-image' as const,
      available: true,
      tags: ['image', 'text-to-image', 'HiDream', 'stable-diffusion'],
      promptMapping: {
        '16.text': 'csv',           // Positive prompt node
        '40.text': 'negative'       // Negative prompt node
      },
      configurableParams: {
        '82.steps': 35,           // KSampler steps
        '82.cfg': 5,              // KSampler CFG
        '87.width': 1024,         // EmptySD3LatentImage width
        '87.height': 1024,        // EmptySD3LatentImage height
        '69.unet_name': 'HiDream/hidream_i1_dev_fp8.safetensors'  // UNETLoader model
      }
    },
    {
      id: 'text-to-video',
      name: 'Text to Video (WanVideo)',
      description: 'Generate videos from text prompts using WanVideo technology',
      category: 'custom' as const,
      available: true,
      tags: ['video', 'text-to-video', 'wanvideo', 'animation'],
      promptMapping: {
        '16.positive_prompt': 'csv',      // Positive prompt in WanVideoTextEncode
        '16.negative_prompt': 'negative'  // Negative prompt in WanVideoTextEncode
      },
      configurableParams: {
        '27.steps': 25,           // WanVideoSampler steps
        '27.cfg': 6,              // WanVideoSampler CFG
        '37.width': 832,          // WanVideoEmptyEmbeds width
        '37.height': 480,         // WanVideoEmptyEmbeds height
        '37.num_frames': 81       // WanVideoEmptyEmbeds frames
      }
    }
  ]

  // Not available workflows
  const NOT_AVAILABLE_WORKFLOWS = [
    {
      id: 'image-to-image',
      name: 'Image to Image',
      description: 'Transform existing images with AI modifications',
      category: 'image-to-image' as const,
      available: false
    },
    {
      id: 'image-to-video',
      name: 'Image to Video',
      description: 'Animate static images into dynamic videos',
      category: 'custom' as const,
      available: false
    },
    {
      id: 'avatar',
      name: 'Avatar Generation',
      description: 'Create animated avatars with facial expressions',
      category: 'custom' as const,
      available: false
    },
    {
      id: 'upload-custom',
      name: 'Upload Custom Workflow',
      description: 'Upload your own ComfyUI workflow from a JSON file',
      category: 'custom' as const,
      available: false
    }
  ]

  // Handle built-in workflow selection with pre-configuration
  const handleBuiltinWorkflowSelect = async (builtinWorkflow: typeof BUILTIN_WORKFLOWS[0]) => {
    try {
      // Helper function to get the correct base path for workflow files
      const getWorkflowBasePath = (): string => {
        const currentPath = window.location.pathname
        const hasBasePath = currentPath.startsWith('/004-c3-media-generator/')
        
        if (import.meta.env.DEV && !hasBasePath) {
          return '/workflows/'
        } else {
          return '/004-c3-media-generator/workflows/'
        }
      }
      
      // Load the actual workflow data with correct base path
      const workflowBasePath = getWorkflowBasePath()
      const workflowUrl = builtinWorkflow.id === 'text-to-image' 
        ? `${workflowBasePath}text_to_image.json`
        : `${workflowBasePath}text-to-video.json`
      
      await loadWorkflowFromUrl(workflowUrl, {
        name: builtinWorkflow.name,
        description: builtinWorkflow.description,
        category: builtinWorkflow.category
      })

      // Apply pre-configured prompt mapping
      setTimeout(() => {
        Object.entries(builtinWorkflow.promptMapping).forEach(([paramKey, mapping]) => {
          updatePromptMapping(paramKey, mapping as 'csv' | 'static' | 'negative')
        })

        // Apply pre-configured parameters
        Object.entries(builtinWorkflow.configurableParams).forEach(([paramKey, value]) => {
          updateParameter(paramKey, value)
        })

        console.log(`🎯 Pre-configured ${builtinWorkflow.name}:`)
        console.log(`📋 Prompt mapping:`, builtinWorkflow.promptMapping)
        console.log(`⚙️ Parameters:`, builtinWorkflow.configurableParams)
      }, 100)

      setActiveTab('configure')
    } catch (error) {
      console.error('Failed to load built-in workflow:', error)
    }
  }

  const handleUseWorkflow = () => {
    const workflow = getUpdatedWorkflow()
    const validation = validateCurrentWorkflow()
    
    if (!validation.valid) {
      alert(`Workflow validation failed:\n${validation.errors.join('\n')}`)
      return
    }

    // Pass the workflow configuration with prompt mapping
    const workflowConfig = {
      workflow,
      analysis: currentAnalysis,
      promptMapping: promptMapping
    }

    console.log('🚀 Using workflow:', selectedWorkflow?.name)
    console.log('📋 Prompt mapping:', promptMapping)
    
    onWorkflowReady?.(workflowConfig)
    onClose()
  }

  const handleParameterChange = (param: ConfigurableParameter, value: any) => {
    const paramKey = `${param.nodeId}.${param.inputName}`
    updateParameter(paramKey, value)
  }

  const renderParameterInput = (param: ConfigurableParameter) => {
    const paramKey = `${param.nodeId}.${param.inputName}`
    const currentValue = configuredParams[paramKey] ?? param.currentValue

    switch (param.valueType) {
      case 'number':
        return (
          <input
            type="number"
            value={currentValue}
            onChange={(e) => handleParameterChange(param, parseFloat(e.target.value) || 0)}
            min={param.min}
            max={param.max}
            step={param.step}
            className="w-full px-3 py-2 border border-gray-600 bg-gray-700 text-white rounded text-sm focus:outline-none focus:ring-[#FF7E06] focus:border-[#FF7E06]"
            placeholder={String(param.currentValue)}
          />
        )
      
      case 'boolean':
        return (
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={Boolean(currentValue)}
              onChange={(e) => handleParameterChange(param, e.target.checked)}
              className="rounded border-gray-600 bg-gray-700 text-[#FF7E06] focus:ring-[#FF7E06]"
            />
            <span className="text-sm text-gray-300">Enable</span>
          </label>
        )
      
      case 'enum':
        return (
          <select
            value={currentValue}
            onChange={(e) => handleParameterChange(param, e.target.value)}
            className="w-full px-3 py-2 border border-gray-600 bg-gray-700 text-white rounded text-sm focus:outline-none focus:ring-[#FF7E06] focus:border-[#FF7E06]"
          >
            {param.enumOptions?.map(option => (
              <option key={option} value={option}>{option}</option>
            ))}
          </select>
        )
      
      default:
        return (
          <input
            type="text"
            value={currentValue}
            onChange={(e) => handleParameterChange(param, e.target.value)}
            className="w-full px-3 py-2 border border-gray-600 bg-gray-700 text-white rounded text-sm focus:outline-none focus:ring-[#FF7E06] focus:border-[#FF7E06]"
            placeholder={String(param.currentValue)}
          />
        )
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-gray-800 rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] overflow-hidden border border-gray-700">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-700 bg-gray-900">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 bg-[#FF7E06] text-white rounded-full">
              <Zap className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Workflow Manager</h2>
              <p className="text-sm text-gray-300">Select and configure ComfyUI workflows</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-700 rounded-full text-gray-300 hover:text-white transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex h-[calc(90vh-80px)]">
          {/* Left Sidebar - Tabs */}
          <div className="w-48 bg-gray-900 border-r border-gray-700 flex flex-col">
            <div className="p-4">
              <div className="space-y-1">
                <button
                  onClick={() => setActiveTab('browse')}
                  className={`w-full text-left px-3 py-2 rounded-lg transition-colors flex items-center gap-2 ${
                    activeTab === 'browse' 
                      ? 'bg-[#FF7E06] text-white' 
                      : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                  }`}
                >
                  <FileText className="h-4 w-4" />
                  Browse Workflows
                </button>
                <button
                  onClick={() => setActiveTab('configure')}
                  disabled={!selectedWorkflow}
                  className={`w-full text-left px-3 py-2 rounded-lg transition-colors flex items-center gap-2 ${
                    activeTab === 'configure' 
                      ? 'bg-[#FF7E06] text-white' 
                      : selectedWorkflow 
                        ? 'text-gray-300 hover:bg-gray-800 hover:text-white'
                        : 'text-gray-500 cursor-not-allowed'
                  }`}
                >
                  <Settings className="h-4 w-4" />
                  Configure Parameters
                </button>
              </div>
            </div>

            {/* Footer */}
            <div className="mt-auto p-4 border-t border-gray-700">
              <div className="text-xs text-gray-400">
                <div className="mb-2">
                  <span className="text-green-400">● 1 CSV prompts</span>
                </div>
                <div className="mb-3">
                  <span className="text-red-400">● 1 negative prompts</span>
                </div>
                {selectedWorkflow && (
                  <div className="mb-3">
                    <p className="font-medium text-white">Selected:</p>
                    <p className="truncate" title={selectedWorkflow.name}>
                      {selectedWorkflow.name}
                    </p>
                    {currentAnalysis && (
                      <p className="text-xs text-gray-500">
                        ({currentAnalysis.configurableParams?.length || 0} parameters)
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 p-6 overflow-y-auto bg-gray-800">
            {/* Loading/Error States */}
            {isLoading && (
              <div className="text-center py-8">
                <div className="animate-spin w-8 h-8 border-2 border-[#FF7E06] border-t-transparent rounded-full mx-auto mb-2"></div>
                <p className="text-gray-300">Loading workflows...</p>
              </div>
            )}

            {error && (
              <div className="bg-red-900/20 border border-red-600 rounded-lg p-4 mb-4">
                <div className="flex items-start gap-2">
                  <AlertCircle className="h-5 w-5 text-red-400 mt-0.5" />
                  <div>
                    <h3 className="font-medium text-red-300">Error</h3>
                    <p className="text-red-400 text-sm">{error}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Browse Tab */}
            {activeTab === 'browse' && !isLoading && (
              <div className="space-y-6">
                {/* Available Workflows */}
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-green-400">✅ Available Workflows</h3>
                    <div className="text-sm text-green-400">
                      {BUILTIN_WORKFLOWS.length} ready to use
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {BUILTIN_WORKFLOWS.map(workflow => (
                      <div
                        key={workflow.id}
                        className={`p-4 rounded-lg border cursor-pointer transition-all ${
                          selectedWorkflow?.name === workflow.name
                            ? 'border-[#FF7E06] bg-[#FF7E06]/10'
                            : 'border-green-600 hover:border-green-500 hover:bg-green-900/20 bg-gray-700'
                        }`}
                        onClick={() => handleBuiltinWorkflowSelect(workflow)}
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <div className="flex items-center justify-center w-8 h-8 bg-green-600 text-white rounded-full">
                              <Check className="h-5 w-5" />
                            </div>
                            <h3 className="font-semibold text-white">{workflow.name}</h3>
                          </div>
                        </div>
                        
                        <p className="text-gray-300 text-sm mb-3">{workflow.description}</p>
                        
                        <div className="flex flex-wrap gap-1 mb-3">
                          {workflow.tags.map(tag => (
                            <span key={tag} className="px-2 py-1 bg-purple-600 text-purple-100 text-xs rounded">
                              {tag}
                            </span>
                          ))}
                        </div>
                        
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-[#FF7E06] flex items-center gap-1">
                            <Zap className="h-4 w-4" />
                            Pre-configured prompts & parameters
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Not Available Workflows */}
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <h3 className="text-lg font-semibold text-gray-400">🚧 Coming Soon - Contribute now</h3>
                      <a 
                        href="https://github.com/c3-examples/" 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-[#FF7E06] hover:text-[#e06b00] underline inline-flex items-center gap-1 text-sm"
                      >
                        GitHub Repository
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    </div>
                    <div className="text-sm text-gray-400">
                      {NOT_AVAILABLE_WORKFLOWS.length} workflows in development
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {NOT_AVAILABLE_WORKFLOWS.map(workflow => (
                      <div
                        key={workflow.id}
                        className="p-4 rounded-lg border border-gray-600 bg-gray-700/50 opacity-75"
                      >
                        <div className="flex items-start justify-between mb-2">
                          <h4 className="font-medium text-gray-400">{workflow.name}</h4>
                          <AlertCircle className="h-5 w-5 text-gray-500" />
                        </div>
                        
                        <p className="text-sm text-gray-500 mb-3">{workflow.description}</p>
                        
                        <div className="flex items-center gap-2 mb-3">
                          <span className="text-xs px-2 py-1 bg-gray-600 text-gray-300 rounded">
                            {workflow.category}
                          </span>
                          <span className="text-xs px-2 py-1 bg-amber-900/50 text-amber-400 rounded">
                            Not Available Yet
                          </span>
                        </div>
                        
                        <div className="text-xs text-gray-400">
                          <span className="font-medium">Want to contribute?</span>
                          <a 
                            href="https://github.com/c3-examples/" 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="ml-2 text-[#FF7E06] hover:text-[#e06b00] underline inline-flex items-center gap-1"
                          >
                            GitHub Repository
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Configure Tab */}
            {activeTab === 'configure' && selectedWorkflow && currentAnalysis && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-white">{selectedWorkflow.name}</h3>
                    <p className="text-gray-300 text-sm">{selectedWorkflow.description}</p>
                  </div>
                  <button
                    onClick={resetParameters}
                    className="px-3 py-1 text-sm bg-gray-700 text-gray-200 rounded hover:bg-gray-600 transition-colors"
                  >
                    Reset All
                  </button>
                </div>

                {/* Prominent Use This Workflow Button */}
                <button
                  onClick={handleUseWorkflow}
                  className="w-full px-6 py-4 bg-[#FF7E06] text-white rounded-lg hover:bg-[#e06b00] transition-colors font-semibold text-lg flex items-center justify-center gap-3 shadow-lg"
                >
                  <Play className="h-6 w-6" />
                  Use This Workflow
                </button>

                {/* Prompt Mapping Section */}
                {currentAnalysis.configurableParams.some(p => p.paramType === 'prompt') && (
                  <div className="bg-green-900/20 border border-green-600 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <FileText className="h-5 w-5 text-green-400" />
                      <h4 className="font-medium text-green-300">Prompt Assignment</h4>
                      <span className="text-xs bg-green-600 text-green-100 px-2 py-1 rounded">Pre-configured</span>
                    </div>
                    
                    <div className="space-y-4">
                      <p className="text-sm text-green-300">
                        🎯 <strong>Prompt mapping has been pre-configured for this workflow.</strong>
                      </p>
                      
                      {/* Current Parameter Status */}
                      <div className="bg-gray-700 border border-gray-600 rounded p-3">
                        <h5 className="font-medium text-green-300 mb-2">Current Assignment:</h5>
                        <div className="space-y-2 text-sm">
                          {currentAnalysis.configurableParams
                            .filter(p => p.paramType === 'prompt')
                            .map(param => {
                              const paramKey = `${param.nodeId}.${param.inputName}`
                              const assignment = promptMapping[paramKey] || 'static'
                              return (
                                <div key={paramKey} className="flex justify-between items-center">
                                  <span className="text-green-200">
                                    {param.displayName} (Node {param.nodeId})
                                  </span>
                                  <span className={`px-2 py-1 rounded text-xs ${
                                    assignment === 'csv' ? 'bg-green-600 text-green-100' :
                                    assignment === 'negative' ? 'bg-red-600 text-red-100' :
                                    'bg-gray-600 text-gray-200'
                                  }`}>
                                    {assignment === 'csv' ? '🟢 Positive Prompt' :
                                     assignment === 'negative' ? '🔴 Negative Prompt' :
                                     '⚪ Keep Static'}
                                  </span>
                                </div>
                              )
                            })}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Parameters Configuration */}
                {currentAnalysis.configurableParams.length === 0 ? (
                  <div className="text-center py-8 text-gray-400">
                    <Settings className="h-12 w-12 mx-auto mb-2 text-gray-500" />
                    <p>No configurable parameters found</p>
                    <p className="text-sm">This workflow uses default settings</p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {/* Group parameters by type */}
                    {['dimension', 'steps', 'cfg', 'sampler', 'scheduler', 'model', 'other'].map(paramType => {
                      const params = currentAnalysis.configurableParams.filter(p => 
                        p.paramType === paramType || (paramType === 'other' && !['prompt', 'dimension', 'steps', 'cfg', 'sampler', 'scheduler', 'model'].includes(p.paramType))
                      )
                      if (params.length === 0) return null

                      return (
                        <div key={paramType} className="bg-gray-700 p-4 rounded-lg border border-gray-600">
                          <h4 className="font-medium text-white mb-3 capitalize flex items-center gap-2">
                            <Settings className="h-4 w-4" />
                            {paramType} Parameters
                          </h4>
                          
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {params.map(param => (
                              <div key={`${param.nodeId}.${param.inputName}`}>
                                <label className="block text-sm font-medium text-gray-200 mb-1">
                                  {param.displayName}
                                  {param.isRequired && <span className="text-red-400 ml-1">*</span>}
                                </label>
                                {param.description && (
                                  <p className="text-xs text-gray-400 mb-2">{param.description}</p>
                                )}
                                {renderParameterInput(param)}
                                <div className="mt-1 text-xs text-gray-400">
                                  Node: {param.nodeId} • Current: {configuredParams[`${param.nodeId}.${param.inputName}`] ?? param.currentValue}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
} 