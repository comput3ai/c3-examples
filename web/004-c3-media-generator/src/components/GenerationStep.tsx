import { useEffect, useState } from 'react'
import { useAppStore } from '../stores/appStore'
import { useCSVStore } from '../stores/csvStore'
import { useWorkloadStore } from '../stores/workloadStore'
import { useGenerationStore } from '../stores/generationStore'
import { useTemplateStore } from '../stores/templateStore'
import { createPromptForCard } from '../lib/core/promptBuilder'
import { Play, Square, RefreshCw, Download, Loader2, FileText, AlertCircle, CheckCircle, Eye, Sparkles, History, Info, X, ExternalLink, Calendar, Clock, Zap, Settings, Upload, Database, UploadCloud } from 'lucide-react'
import PromptTemplateModal from './PromptTemplateModal'
import PromptPreviewModal from './PromptPreviewModal'
import BatchManagementModal from './BatchManagementModal'
import ConditionalEnhancementModal from './ConditionalEnhancementModal'
import WorkflowManagerModal from './WorkflowManagerModal'
import { ExampleCSVLoader, type CSVExample } from '../lib/api/exampleCSVLoader'
import type { GenerationParams, GenerationJob, GenerationResult } from '../types/index'

// Job Details Modal Component
interface JobDetailsModalProps {
  isOpen: boolean
  onClose: () => void
  job: GenerationJob
  result?: GenerationResult
  params: GenerationParams
}

function JobDetailsModal({ isOpen, onClose, job, result, params }: JobDetailsModalProps) {
  const { getEffectiveTemplates, conditionalEnhancements } = useTemplateStore()
  
  if (!isOpen) return null

  // Generate the prompts used for this job
  const templates = getEffectiveTemplates()
  const promptData = createPromptForCard(job.card, params, templates, conditionalEnhancements)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-gray-800 rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-700">
          <div className="flex items-center gap-3">
            <div className={`w-4 h-4 rounded-full ${
              job.status === 'completed' ? 'bg-green-500' :
              job.status === 'failed' ? 'bg-red-500' :
              job.status === 'processing' ? 'bg-[#FF7E06]' : 'bg-gray-400'
            }`} />
            <div>
              <h2 className="text-xl font-bold text-white">{job.card.name}</h2>
              <p className="text-gray-300 text-sm">Generation Job Details</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-700 rounded-full text-gray-300 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 max-h-[70vh] overflow-y-auto space-y-6">
          {/* Job Status & Timing */}
          <div className="bg-gray-700 p-4 rounded-lg">
            <h3 className="font-semibold text-white mb-3 flex items-center gap-2">
              <Info className="h-4 w-4" />
              Job Information
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <div className="text-gray-300">Status</div>
                <div className={`font-medium ${
                  job.status === 'completed' ? 'text-green-400' :
                  job.status === 'failed' ? 'text-red-400' :
                  job.status === 'processing' ? 'text-[#FF7E06]' : 'text-gray-400'
                }`}>
                  {job.status.charAt(0).toUpperCase() + job.status.slice(1)}
                </div>
              </div>
              <div>
                <div className="text-gray-300">Created</div>
                <div className="font-medium text-white">{new Date(job.createdAt).toLocaleTimeString()}</div>
              </div>
              {job.promptId && (
                <div>
                  <div className="text-gray-300">Prompt ID</div>
                  <div className="font-mono text-xs bg-gray-600 text-gray-200 px-2 py-1 rounded">
                    {job.promptId.slice(0, 12)}...
                  </div>
                </div>
              )}
              {result && (
                <div>
                  <div className="text-gray-300">Seed</div>
                  <div className="font-mono text-xs text-white">{result.seed}</div>
                </div>
              )}
            </div>
          </div>

          {/* Card Details */}
          <div className="bg-[#FF7E06]/10 border border-[#FF7E06]/30 p-4 rounded-lg">
            <h3 className="font-semibold text-[#FF7E06] mb-3">Card Details</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <div className="text-sm text-gray-200">
                  <div><strong>Name:</strong> {job.card.name}</div>
                  <div><strong>Type:</strong> {job.card.card_type}</div>
                  <div><strong>Rarity:</strong> {job.card.rarity}</div>
                </div>
              </div>
              <div>
                <div className="text-sm text-gray-200">
                  <div><strong>Description:</strong></div>
                  <div className="text-gray-300 mt-1">{job.card.description}</div>
                </div>
              </div>
            </div>
            {job.card.flavor_text && (
              <div className="mt-3 text-sm text-gray-200">
                <div><strong>Flavor Text:</strong></div>
                <div className="text-gray-300 italic mt-1">"{job.card.flavor_text}"</div>
              </div>
            )}
          </div>

          {/* Generated Prompts */}
          <div className="space-y-4">
            <h3 className="font-semibold text-white">Generated Prompts</h3>
            
            <div>
              <h4 className="font-medium text-green-400 mb-2 flex items-center gap-2">
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                Positive Prompt
              </h4>
              <div className="bg-green-900/20 border border-green-500/30 p-4 rounded-lg">
                <div className="text-sm text-green-200 font-mono whitespace-pre-wrap break-words">
                  {promptData.positive}
                </div>
              </div>
            </div>

            <div>
              <h4 className="font-medium text-red-400 mb-2 flex items-center gap-2">
                <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                Negative Prompt
              </h4>
              <div className="bg-red-900/20 border border-red-500/30 p-4 rounded-lg">
                <div className="text-sm text-red-200 font-mono break-words">
                  {promptData.negative}
                </div>
              </div>
            </div>
          </div>

          {/* Generation Parameters */}
          <div className="bg-purple-900/20 border border-purple-500/30 p-4 rounded-lg">
            <h3 className="font-semibold text-purple-300 mb-3">Generation Parameters</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
              <div>
                <div className="text-purple-200">Size</div>
                <div className="font-medium text-white">{params.width} × {params.height}</div>
              </div>
              <div>
                <div className="text-purple-200">Steps</div>
                <div className="font-medium text-white">{params.steps}</div>
              </div>
              <div>
                <div className="text-purple-200">Guidance</div>
                <div className="font-medium text-white">{params.guidance}</div>
              </div>
              <div>
                <div className="text-purple-200">Model</div>
                <div className="font-medium text-white">{params.model}</div>
              </div>
              <div>
                <div className="text-purple-200">Seed</div>
                <div className="font-mono text-xs text-white">{promptData.seed}</div>
              </div>
            </div>
          </div>

          {/* Status Messages */}
          {job.statusMessage && (
            <div className="bg-[#FF7E06]/10 border border-[#FF7E06]/30 p-4 rounded-lg">
              <h3 className="font-semibold text-[#FF7E06] mb-2">Status Updates</h3>
              <div className="text-sm text-gray-200">{job.statusMessage}</div>
            </div>
          )}

          {/* Error Details */}
          {job.error && (
            <div className="bg-red-900/20 border border-red-500/30 p-4 rounded-lg">
              <h3 className="font-semibold text-red-400 mb-2">Error Details</h3>
              <div className="text-sm text-red-200 font-mono">{job.error}</div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-700 bg-gray-750">
          <div className="flex justify-between items-center">
            <div className="text-sm text-gray-300">
              💡 <strong>Tip:</strong> These are the exact prompts used for generation
            </div>
            <div className="flex gap-2">
              {result?.imageUrl && (
                <button
                  onClick={() => window.open(result.imageUrl, '_blank')}
                  className="px-4 py-2 bg-[#FF7E06] text-white rounded-lg hover:bg-[#e06b00] flex items-center gap-2"
                >
                  <ExternalLink className="h-4 w-4" />
                  Open {result.type === 'video' ? 'Video' : 'Image'}
                </button>
              )}
              <button
                onClick={onClose}
                className="px-4 py-2 bg-gray-600 text-gray-200 rounded-lg hover:bg-gray-500"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// Media Preview Component - handles both images and videos
interface MediaPreviewProps {
  url: string
  type: 'image' | 'video'
  alt: string
  className?: string
  onClick?: () => void
  title?: string
}

function MediaPreview({ url, type, alt, className, onClick, title }: MediaPreviewProps) {
  if (type === 'video') {
    return (
      <video
        src={url}
        className={className}
        title={title}
        onClick={onClick}
        muted
        loop
        preload="metadata"
        style={{ cursor: onClick ? 'pointer' : 'default' }}
      >
        Your browser does not support the video tag.
      </video>
    )
  } else {
    return (
      <img
        src={url}
        alt={alt}
        className={className}
        title={title}
        onClick={onClick}
      />
    )
  }
}

// Image/Video Enlargement Modal Component - handles both images and videos
interface MediaModalProps {
  isOpen: boolean
  onClose: () => void
  mediaUrl: string
  mediaType: 'image' | 'video'
  cardName: string
}

function MediaModal({ isOpen, onClose, mediaUrl, mediaType, cardName }: MediaModalProps) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-90" onClick={onClose}>
      <div className="relative max-w-[95vw] max-h-[95vh]" onClick={(e) => e.stopPropagation()}>
        <button
          onClick={onClose}
          className="absolute -top-12 right-0 text-white hover:text-gray-300 transition-colors"
        >
          <X className="h-8 w-8" />
        </button>
        
        {mediaType === 'video' ? (
          <video
            src={mediaUrl}
            className="max-w-full max-h-full object-contain rounded-lg shadow-2xl"
            controls
            autoPlay
            loop
            muted
          >
            Your browser does not support the video tag.
          </video>
        ) : (
          <img
            src={mediaUrl}
            alt={`Generated ${cardName}`}
            className="max-w-full max-h-full object-contain rounded-lg shadow-2xl"
          />
        )}
        
        <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-50 text-white p-4 rounded-b-lg">
          <h3 className="font-medium">{cardName}</h3>
          <p className="text-sm text-gray-300">
            {mediaType === 'video' ? 'Video controls available • ' : ''}
            Click outside to close • Right-click to save
          </p>
        </div>
      </div>
    </div>
  )
}

// Image Enlargement Modal Component (legacy - deprecated)
interface ImageModalProps {
  isOpen: boolean
  onClose: () => void
  imageUrl: string
  cardName: string
}

function ImageModal({ isOpen, onClose, imageUrl, cardName }: ImageModalProps) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-90" onClick={onClose}>
      <div className="relative max-w-[95vw] max-h-[95vh]" onClick={(e) => e.stopPropagation()}>
        <button
          onClick={onClose}
          className="absolute -top-12 right-0 text-white hover:text-gray-300 transition-colors"
        >
          <X className="h-8 w-8" />
        </button>
        <img
          src={imageUrl}
          alt={`Generated ${cardName}`}
          className="max-w-full max-h-full object-contain rounded-lg shadow-2xl"
        />
        <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-50 text-white p-4 rounded-b-lg">
          <h3 className="font-medium">{cardName}</h3>
          <p className="text-sm text-gray-300">Click outside to close • Right-click to save</p>
        </div>
      </div>
    </div>
  )
}

// CSV Switcher Component
interface CSVSwitcherProps {
  onClose: () => void
}

function CSVSwitcher({ onClose }: CSVSwitcherProps) {
  const { uploadCSV, loadExample, isProcessing, fileName } = useCSVStore()
  const { setError } = useAppStore()
  const [dragActive, setDragActive] = useState(false)
  const [examples, setExamples] = useState<CSVExample[]>([])
  const [isLoadingExamples, setIsLoadingExamples] = useState(false)
  const [showAllExamples, setShowAllExamples] = useState(false)

  const loadExamples = async () => {
    if (examples.length > 0) return // Already loaded
    
    setIsLoadingExamples(true)
    try {
      const loader = new ExampleCSVLoader()
      const loadedExamples = await loader.loadExamples()
      setExamples(loadedExamples)
    } catch (error) {
      console.error('Failed to load examples:', error)
    } finally {
      setIsLoadingExamples(false)
    }
  }

  // Load examples on component mount
  useEffect(() => {
    loadExamples()
  }, [])

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0])
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault()
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0])
    }
  }

  const handleFile = async (file: File) => {
    if (!file.name.toLowerCase().endsWith('.csv')) {
      setError('Please upload a CSV file')
      return
    }

    try {
      await uploadCSV(file)
      onClose()
    } catch (error) {
      setError('Failed to process CSV file: ' + (error instanceof Error ? error.message : 'Unknown error'))
    }
  }

  const handleSelectExample = async (example: CSVExample) => {
    try {
      await loadExample(example)
      onClose()
    } catch (err) {
      setError(`Failed to load example: ${err instanceof Error ? err.message : 'Unknown error'}`)
    }
  }

  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-gray-800 rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-700">
          <div className="flex items-center gap-3">
            <Upload className="h-6 w-6 text-[#FF7E06]" />
            <h2 className="text-xl font-bold text-white">Switch CSV File</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-700 rounded-full text-gray-300 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6 max-h-[70vh] overflow-y-auto space-y-6">
          {/* Current File Status */}
          {fileName && (
            <div className="bg-[#FF7E06]/10 border border-[#FF7E06]/30 rounded-lg p-4">
              <div className="flex items-center">
                <FileText className="w-5 h-5 text-[#FF7E06] mr-2" />
                <div>
                  <p className="font-medium text-[#FF7E06]">Current CSV File</p>
                  <p className="text-sm text-gray-300">{fileName}</p>
                </div>
              </div>
            </div>
          )}

          {/* Upload Area */}
          <div>
            <h3 className="text-lg font-semibold mb-3 text-white">Upload New CSV</h3>
            <div
              className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
                dragActive
                  ? 'border-[#FF7E06] bg-[#FF7E06]/10'
                  : isProcessing
                  ? 'border-gray-600 bg-gray-700'
                  : 'border-gray-600 hover:border-gray-500'
              }`}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
            >
              {isProcessing ? (
                <div className="space-y-4">
                  <div className="animate-spin h-8 w-8 border-4 border-[#FF7E06] border-t-transparent rounded-full mx-auto"></div>
                  <p className="text-gray-300">Processing CSV file...</p>
                </div>
              ) : (
                <div className="space-y-4">
                  <UploadCloud className="h-8 w-8 text-gray-400 mx-auto" />
                  <div>
                    <p className="text-lg font-medium text-white">Drop your CSV file here</p>
                    <p className="text-gray-300">or click to browse</p>
                  </div>
                  <input
                    type="file"
                    accept=".csv"
                    onChange={handleChange}
                    className="hidden"
                    id="csv-upload-switcher"
                  />
                  <label
                    htmlFor="csv-upload-switcher"
                    className="inline-flex items-center px-4 py-2 bg-[#FF7E06] text-white rounded-md hover:bg-[#e06b00] transition-colors cursor-pointer"
                  >
                    Choose File
                  </label>
                </div>
              )}
            </div>
          </div>

          {/* Examples Section */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-medium text-white">Or choose from examples</h3>
              {examples.length > 1 && (
                <button
                  onClick={() => setShowAllExamples(!showAllExamples)}
                  className="text-[#FF7E06] hover:text-[#e06b00] text-sm"
                >
                  {showAllExamples ? 'Show Less' : `Show More (${examples.length - 1} more)`}
                </button>
              )}
            </div>

            <div className="space-y-3 max-h-80 overflow-y-auto">
              {isLoadingExamples ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-5 h-5 animate-spin text-[#FF7E06] mr-2" />
                  <span className="text-gray-300">Loading examples...</span>
                </div>
              ) : examples.length === 0 ? (
                <div className="text-center py-8 text-gray-400">
                  <Database className="w-8 h-8 mx-auto mb-2 text-gray-500" />
                  <p>No examples available</p>
                </div>
              ) : (
                (showAllExamples ? examples : examples.slice(0, 1)).map((example, index) => (
                  <div 
                    key={`${example.fileName}-${index}`}
                    className="border border-gray-600 rounded-lg p-4 hover:border-[#FF7E06]/50 transition-colors bg-gray-700"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <Database className="w-5 h-5 text-[#FF7E06]" />
                        <div>
                          <h4 className="font-medium text-white">{example.name}</h4>
                          <p className="text-sm text-gray-300">{example.description}</p>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-3">
                        <span className="text-xs text-gray-400">
                          {example.totalRows} rows
                        </span>
                        <button
                          onClick={() => handleSelectExample(example)}
                          disabled={isProcessing}
                          className="px-3 py-1 bg-[#FF7E06] text-white text-sm rounded hover:bg-[#e06b00] disabled:opacity-50 transition-colors"
                        >
                          {isProcessing ? 'Loading...' : 'Use this'}
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function GenerationStep() {
  const { nextStep, previousStep } = useAppStore()
  const { validatedCards, fileName } = useCSVStore()
  const { workloads } = useWorkloadStore()
  const { savedTemplates } = useTemplateStore()
  const { 
    jobs, 
    results, 
    errors, 
    isGenerating, 
    progress,
    workflow,
    workflowLoaded,
    workflowError,
    loadWorkflow,
    startGeneration, 
    stopGeneration, 
    retryFailedJobs, 
    downloadResults
  } = useGenerationStore()

  const [workflowUrl, setWorkflowUrl] = useState('workflows/text_to_image.json')
  const [selectedCardCount, setSelectedCardCount] = useState(5) // Default to 5 cards
  const [startIndex, setStartIndex] = useState(0) // Which card to start from
  const [selectedWorkflowConfig, setSelectedWorkflowConfig] = useState<any>(null) // Store selected workflow config
  
  // Create params from workflow config or use defaults
  const params: GenerationParams = {
    width: selectedWorkflowConfig?.analysis?.dimensions?.width || workflow?.params?.width || 1024,
    height: selectedWorkflowConfig?.analysis?.dimensions?.height || workflow?.params?.height || 1024,
    steps: selectedWorkflowConfig?.analysis?.steps || workflow?.params?.steps || 35,
    guidance: selectedWorkflowConfig?.analysis?.guidance || workflow?.params?.guidance || 7.5,
    model: selectedWorkflowConfig?.analysis?.type || workflow?.type || 'text-to-image'
  }
  
  // Modal states
  const [showTemplateModal, setShowTemplateModal] = useState(false)
  const [showPreviewModal, setShowPreviewModal] = useState(false)
  const [showBatchModal, setShowBatchModal] = useState(false)
  const [showConditionalModal, setShowConditionalModal] = useState(false)
  const [showWorkflowModal, setShowWorkflowModal] = useState(false)
  const [showCSVSwitcher, setShowCSVSwitcher] = useState(false)
  const [selectedJob, setSelectedJob] = useState<GenerationJob | null>(null)
  const [enlargedImage, setEnlargedImage] = useState<{ url: string; name: string; type: 'image' | 'video' } | null>(null)

  // Load workflow on component mount
  useEffect(() => {
    if (!workflowLoaded && !workflowError && !selectedWorkflowConfig) {
      handleLoadWorkflow()
    }
  }, [])

  // Update selected card count when validated cards change
  useEffect(() => {
    if (validatedCards.length > 0) {
      setSelectedCardCount(Math.min(5, validatedCards.length))
      setStartIndex(0)
    }
  }, [validatedCards.length])

  const handleLoadWorkflow = async () => {
    try {
      await loadWorkflow(workflowUrl)
    } catch (error) {
      console.error('Failed to load workflow:', error)
    }
  }

  const handleWorkflowReady = (workflowConfig: any) => {
    console.log('📋 Received workflow configuration:', workflowConfig)
    setSelectedWorkflowConfig(workflowConfig)
    // The workflow is now ready to use for generation
  }

  const handleStartGeneration = async () => {
    // Check if we have a workflow (either custom or default)
    const hasWorkflow = selectedWorkflowConfig || workflowLoaded
    if (!hasWorkflow) {
      alert('Please load a workflow first')
      return
    }
    
    if (validatedCards.length === 0) {
      alert('No validated data available')
      return
    }
    
    if (workloads.length === 0) {
      alert('No workloads available. Please set up workloads first.')
      return
    }

    // Check if user has customized templates using the template store
    const hasCustomTemplates = (
      savedTemplates.positive !== "{name}, {description}, detailed digital art, fantasy style, high quality, use {rarity} as main styling color" ||
      savedTemplates.negative !== "blurry, low quality, distorted, deformed, text, watermark"
    )
    
    if (!hasCustomTemplates) {
      const shouldProceed = confirm(
        '⚠️ You haven\'t customized your prompt templates yet!\n\n' +
        'The default templates are generic and may not match your desired art style.\n\n' +
        'Would you like to:\n' +
        '• Click "Cancel" to review and edit your templates first (recommended)\n' +
        '• Click "OK" to continue with default templates'
      )
      
      if (!shouldProceed) {
        setShowTemplateModal(true)
        return
      }
    }

    // Select the subset of cards to process
    const endIndex = Math.min(startIndex + selectedCardCount, validatedCards.length)
    const cardsToGenerate = validatedCards.slice(startIndex, endIndex)
    
    if (cardsToGenerate.length === 0) {
      alert('No items in the selected range')
      return
    }

    try {
      console.log(`🎯 Generating ${cardsToGenerate.length} items (${startIndex + 1} to ${endIndex})`)
      
      // Pass the workflow configuration if available
      if (selectedWorkflowConfig) {
        console.log('🎬 Using custom workflow:', selectedWorkflowConfig.analysis.name)
        console.log('📋 Prompt mapping:', selectedWorkflowConfig.promptMapping)
        await startGeneration(cardsToGenerate, workloads, params, selectedWorkflowConfig)
      } else {
        console.log('📷 Using default text-to-image workflow')
        await startGeneration(cardsToGenerate, workloads, params)
      }
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Failed to start generation')
    }
  }

  const handleViewBatch = (batchId: string) => {
    // This would load the specific batch and show its images
    console.log('Viewing batch:', batchId)
    setShowBatchModal(false)
    // TODO: Implement batch loading logic
  }

  const canGenerate = (workflowLoaded || selectedWorkflowConfig) && validatedCards.length > 0 && workloads.length > 0 && !isGenerating
  const maxSelectableCards = validatedCards.length - startIndex

  // Get sample card for template modal
  const sampleCard = validatedCards.length > 0 ? validatedCards[0] : undefined
  
  // Check if user has custom templates using template store
  const hasCustomTemplates = (
    savedTemplates.positive !== "{name}, {description}, detailed digital art, fantasy style, high quality, use {rarity} as main styling color" ||
    savedTemplates.negative !== "blurry, low quality, distorted, deformed, text, watermark"
  )

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold mb-2 text-white">Media Generation</h2>
        <p className="text-gray-300">
          Generate images and videos for your data using ComfyUI workflows
        </p>
      </div>

      {/* Prompt Transparency Section - Enhanced */}
      <div className="bg-gray-800 rounded-lg p-6 border-2 border-[#FF7E06]/30">
        <div className="flex items-center gap-2 mb-4">
          <div className="flex items-center justify-center w-10 h-10 bg-[#FF7E06] text-white rounded-full">
            <Eye className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-white">🎨 Customize Your AI Prompts</h3>
            <p className="text-gray-300 text-sm">Take full control of how your images are generated</p>
          </div>
        </div>
        
        <div className="bg-gray-700 rounded-lg p-4 mb-4">
          <h4 className="font-semibold text-white mb-2">📋 Before You Generate:</h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-[#FF7E06]/10 p-3 rounded-lg border border-[#FF7E06]/20">
              <h5 className="font-medium text-[#FF7E06] mb-1">1. Review & Edit Templates</h5>
              <p className="text-xs text-gray-300">See CSV variables, configure conditional enhancements, and edit prompts all in one place</p>
            </div>
            <div className="bg-green-900/20 p-3 rounded-lg border border-green-500/30">
              <h5 className="font-medium text-green-400 mb-1">2. Preview Your Results</h5>
              <p className="text-xs text-green-300">Check how your templates and enhancements will generate prompts</p>
            </div>
            <div className="bg-purple-900/20 p-3 rounded-lg border border-purple-500/30">
              <h5 className="font-medium text-purple-400 mb-1">3. Generate Images</h5>
              <p className="text-xs text-purple-300">Start generation with your customized prompts and conditional enhancements</p>
            </div>
          </div>
        </div>
        
        <div className="flex gap-3 flex-wrap">
          <button
            onClick={() => setShowTemplateModal(true)}
            className="flex items-center gap-2 px-6 py-3 bg-[#FF7E06] text-white rounded-lg hover:bg-[#e06b00] transition-colors shadow-md"
          >
            <FileText className="h-4 w-4" />
            Step 1: Customize Templates & Enhancements
          </button>
          
          {validatedCards.length > 0 && (
            <button
              onClick={() => setShowPreviewModal(true)}
              className="flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors shadow-md"
            >
              <Sparkles className="h-4 w-4" />
              Step 2: Preview All Prompts
            </button>
          )}
          
          <button
            onClick={() => setShowBatchModal(true)}
            className="flex items-center gap-2 px-4 py-3 bg-gray-700 text-gray-300 rounded-lg hover:bg-gray-600 transition-colors border border-gray-600"
          >
            <History className="h-4 w-4" />
            View Generation History
          </button>
        </div>
        
        <div className="mt-4 p-3 bg-amber-900/20 border border-amber-500/30 rounded-lg">
          <div className="flex items-start gap-2">
            <div className="text-amber-400 text-lg">⚠️</div>
            <div>
              <p className="text-sm text-amber-300 font-medium">Pro Tip: Always customize your templates first!</p>
              <p className="text-xs text-amber-200 mt-1">
                The integrated template editor now includes conditional enhancements in one place. 
                Edit your templates, configure rarity/type-based enhancements, and preview everything before generating.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Workflow Management Section */}
      <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
        <div className="flex items-center gap-2 mb-4">
          <Zap className="h-5 w-5 text-[#FF7E06]" />
          <h3 className="text-lg font-semibold text-white">Workflow Selection</h3>
        </div>
        
        <div className="space-y-4">
          <div className="bg-[#FF7E06]/10 border border-[#FF7E06]/30 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <div className="flex items-center justify-center w-8 h-8 bg-[#FF7E06] text-white rounded-full">
                <Info className="h-4 w-4" />
              </div>
              <div className="flex-1">
                <h4 className="font-medium text-[#FF7E06] mb-1">Choose Your Workflow</h4>
                <p className="text-gray-300 text-sm mb-3">
                  Try out text-to-image and text-to-video workflows. More coming soon!
                </p>
                <button
                  onClick={() => setShowWorkflowModal(true)}
                  className="px-4 py-2 bg-[#FF7E06] text-white rounded-lg hover:bg-[#e06b00] transition-colors flex items-center gap-2"
                >
                  <Zap className="h-4 w-4" />
                  Check out workflows! - Video or Image Generations are available!
                </button>
              </div>
            </div>
          </div>
          
          {/* Workflow Status */}
          <div className="flex items-center gap-2">
            {selectedWorkflowConfig ? (
              <>
                <CheckCircle className="h-4 w-4 text-green-500" />
                <span className="text-sm text-green-400">
                  Custom workflow ready: {selectedWorkflowConfig.analysis?.name} 
                  ({Object.values(selectedWorkflowConfig.promptMapping || {}).filter((v) => v === 'csv').length} CSV prompts configured)
                </span>
              </>
            ) : workflowLoaded ? (
              <>
                <CheckCircle className="h-4 w-4 text-green-500" />
                <span className="text-sm text-green-400">
                  Default workflow ready: {workflow?.nodes?.length || 0} nodes loaded
                </span>
              </>
            ) : workflowError ? (
              <>
                <AlertCircle className="h-4 w-4 text-red-500" />
                <span className="text-sm text-red-400">
                  Error: {workflowError}
                </span>
              </>
            ) : (
              <>
                <Loader2 className="h-4 w-4 animate-spin text-[#FF7E06]" />
                <span className="text-sm text-[#FF7E06]">
                  No workflow selected - click above to choose one
                </span>
              </>
            )}
          </div>
          
          <div className="text-xs text-gray-400">
            💡 <strong>Pro Tip:</strong> You can upload custom ComfyUI workflows or configure parameters for each workflow type
          </div>
        </div>
      </div>

      {/* CSV Data Source Section */}
      <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-white">CSV Data Source</h3>
          <button
            onClick={() => setShowCSVSwitcher(true)}
            className="flex items-center gap-2 px-4 py-2 bg-[#FF7E06] text-white rounded-lg hover:bg-[#e06b00] transition-colors"
          >
            <Upload className="h-4 w-4" />
            Switch CSV File
          </button>
        </div>
        
        <div className="bg-gray-700 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <FileText className="w-5 h-5 text-gray-300" />
            <div>
              <p className="font-medium text-white">
                Current File: {fileName || 'No file loaded'}
              </p>
              <p className="text-sm text-gray-300">
                {validatedCards.length} validated items available for generation
              </p>
            </div>
          </div>
          
          {validatedCards.length === 0 && (
            <div className="mt-3 p-3 bg-yellow-900/20 border border-yellow-500/30 rounded-lg">
              <div className="flex items-start gap-2">
                <AlertCircle className="h-4 w-4 text-yellow-400 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-yellow-300">No items available</p>
                  <p className="text-xs text-yellow-200 mt-1">
                    Please upload a CSV file or select an example to get started.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Card Selection Section */}
      <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
        <h3 className="text-lg font-semibold mb-4 text-white">Data Selection</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2 text-white">Start from item #</label>
            <input
              type="number"
              value={startIndex + 1}
              onChange={(e) => setStartIndex(Math.max(0, parseInt(e.target.value) - 1 || 0))}
              min="1"
              max={validatedCards.length}
              className="w-full px-3 py-2 border border-gray-600 bg-gray-700 text-white rounded-md text-sm"
              disabled={isGenerating}
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-2 text-white">Number of items</label>
            <input
              type="number"
              value={selectedCardCount}
              onChange={(e) => setSelectedCardCount(Math.max(1, Math.min(maxSelectableCards, parseInt(e.target.value) || 1)))}
              min="1"
              max={maxSelectableCards}
              className="w-full px-3 py-2 border border-gray-600 bg-gray-700 text-white rounded-md text-sm"
              disabled={isGenerating}
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-2 text-white">Range</label>
            <div className="px-3 py-2 border border-gray-600 bg-gray-700 rounded-md text-sm">
              <span className="text-white">{startIndex + 1} to {Math.min(startIndex + selectedCardCount, validatedCards.length)}</span>
              <span className="text-gray-400"> (of {validatedCards.length})</span>
            </div>
          </div>
        </div>
        
        <div className="mt-4 flex gap-2 flex-wrap">
          <button
            onClick={() => { setStartIndex(0); setSelectedCardCount(5); }}
            disabled={isGenerating}
            className="px-3 py-1 text-xs bg-[#FF7E06]/10 text-[#FF7E06] rounded hover:bg-[#FF7E06]/20 disabled:opacity-50 transition-colors"
          >
            First 5
          </button>
          <button
            onClick={() => { setStartIndex(0); setSelectedCardCount(10); }}
            disabled={isGenerating}
            className="px-3 py-1 text-xs bg-[#FF7E06]/10 text-[#FF7E06] rounded hover:bg-[#FF7E06]/20 disabled:opacity-50 transition-colors"
          >
            First 10
          </button>
          <button
            onClick={() => { setStartIndex(0); setSelectedCardCount(20); }}
            disabled={isGenerating}
            className="px-3 py-1 text-xs bg-[#FF7E06]/10 text-[#FF7E06] rounded hover:bg-[#FF7E06]/20 disabled:opacity-50 transition-colors"
          >
            First 20
          </button>
          <button
            onClick={() => { setStartIndex(0); setSelectedCardCount(validatedCards.length); }}
            disabled={isGenerating}
            className="px-3 py-1 text-xs bg-gray-600 text-gray-200 rounded hover:bg-gray-500 disabled:opacity-50 transition-colors font-medium"
          >
            All {validatedCards.length} items
          </button>
        </div>
      </div>

      {/* Status Overview */}
      <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
        <h3 className="text-lg font-semibold mb-4 text-white">Status Overview</h3>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
          <div>
            <div className="text-2xl font-bold text-[#FF7E06]">{validatedCards.length}</div>
            <div className="text-sm text-gray-400">Total Items</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-gray-300">{selectedCardCount}</div>
            <div className="text-sm text-gray-400">Selected</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-green-400">{workloads.length}</div>
            <div className="text-sm text-gray-400">GPUs Available</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-[#FF7E06]">{results.length}</div>
            <div className="text-sm text-gray-400">Completed</div>
          </div>
        </div>
        
        {progress.total > 0 && (
          <div className="mt-4">
            <div className="flex justify-between text-sm mb-2">
              <span className="text-white">Progress</span>
              <span className="text-white">{progress.completed + progress.failed}/{progress.total}</span>
            </div>
            <div className="w-full bg-gray-700 rounded-full h-2">
              <div
                className="bg-[#FF7E06] h-2 rounded-full transition-all duration-300"
                style={{ width: `${((progress.completed + progress.failed) / progress.total) * 100}%` }}
              />
            </div>
            <div className="grid grid-cols-3 gap-2 text-xs mt-2">
              <span className="text-green-400">✅ {progress.completed} completed</span>
              <span className="text-blue-400">⏳ {progress.inProgress} processing</span>
              <span className="text-red-400">❌ {progress.failed} failed</span>
            </div>
          </div>
        )}
      </div>

      {/* Generation Controls */}
      <div className="flex gap-4">
        {!isGenerating ? (
          <div className="flex items-center gap-4">
            <button
              onClick={handleStartGeneration}
              disabled={!canGenerate}
              className="flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Play className="h-5 w-5" />
              Generate {selectedCardCount} Items
            </button>
            
            {/* Template Status Indicator */}
            <div className={`flex items-center gap-2 px-3 py-2 rounded-lg border ${
              hasCustomTemplates 
                ? 'bg-green-900/20 border-green-600 text-green-300' 
                : 'bg-amber-900/20 border-amber-600 text-amber-300'
            }`}>
              <div className={`w-2 h-2 rounded-full ${
                hasCustomTemplates ? 'bg-green-500' : 'bg-amber-500'
              }`} />
              <span className="text-sm font-medium">
                {hasCustomTemplates ? 'Custom Templates Ready' : 'Using Default Templates'}
              </span>
              {!hasCustomTemplates && (
                <button
                  onClick={() => setShowTemplateModal(true)}
                  className="text-xs underline hover:no-underline"
                >
                  Customize
                </button>
              )}
            </div>
          </div>
        ) : null}
        
        {errors.length > 0 && (
          <button
            onClick={retryFailedJobs}
            disabled={isGenerating}
            className="flex items-center gap-2 px-6 py-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50"
          >
            <RefreshCw className="h-5 w-5" />
            Retry Failed ({errors.length})
          </button>
        )}
        
        {results.length > 0 && (
          <button
            onClick={() => setShowBatchModal(true)}
            className="px-6 py-2 bg-[#FF7E06] text-white rounded-lg hover:bg-[#e06b00]"
          >
            View Generation History →
          </button>
        )}
      </div>

      {/* Job List */}
      {jobs.length > 0 && (
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-white">Generation Jobs</h3>
            <div className="text-sm text-gray-400 flex items-center gap-2">
              <Info className="h-4 w-4" />
              <span>Click job cards for details • Click images/eye icon to enlarge</span>
            </div>
          </div>
          
          <div className="max-h-96 overflow-y-auto space-y-3">
            {jobs.map((job) => (
              <div
                key={job.id}
                className={`p-4 rounded-lg border-l-4 cursor-pointer hover:shadow-md transition-all ${
                  job.status === 'completed' 
                    ? 'border-green-500 bg-green-900/20 hover:bg-green-900/30' 
                    : job.status === 'failed'
                    ? 'border-red-500 bg-red-900/20 hover:bg-red-900/30'
                    : job.status === 'processing'
                    ? 'border-[#FF7E06] bg-orange-900/20 hover:bg-orange-900/30'
                    : 'border-gray-500 bg-gray-700 hover:bg-gray-600'
                }`}
                onClick={() => setSelectedJob(job)}
              >
                <div className="flex items-start gap-4">
                  {/* Image Preview */}
                  <div className="flex-shrink-0">
                    {job.status === 'completed' && job.imageUrl ? (
                      <div className="relative group">
                        {(() => {
                          // Find the result to determine media type
                          const result = results.find((r) => r.jobId === job.id)
                          const mediaType = result?.type || 'image'
                          
                          return (
                            <MediaPreview
                              url={job.imageUrl!}
                              type={mediaType}
                              alt={`Generated ${job.card.name}`}
                              title={`Click to enlarge ${mediaType}`}
                              className="w-20 h-20 object-cover rounded-lg border-2 border-green-600 cursor-pointer hover:border-green-400 transition-colors"
                              onClick={() => {
                                if (job.imageUrl) {
                                  setEnlargedImage({ url: job.imageUrl, name: job.card.name, type: mediaType })
                                }
                              }}
                            />
                          )
                        })()}
                        <div 
                          title="Click to enlarge"
                          className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 rounded-lg transition-all flex items-center justify-center cursor-pointer"
                          onClick={(e) => {
                            e.stopPropagation()
                            e.preventDefault()
                            if (job.imageUrl) {
                              const result = results.find((r) => r.jobId === job.id)
                              const mediaType = result?.type || 'image'
                              setEnlargedImage({ url: job.imageUrl, name: job.card.name, type: mediaType })
                            }
                          }}
                        >
                          <Eye className="h-5 w-5 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                      </div>
                    ) : job.status === 'processing' ? (
                      <div className="w-20 h-20 bg-orange-900/20 rounded-lg border-2 border-orange-600 flex items-center justify-center">
                        <Loader2 className="h-6 w-6 text-[#FF7E06] animate-spin" />
                      </div>
                    ) : job.status === 'failed' ? (
                      <div className="w-20 h-20 bg-red-900/20 rounded-lg border-2 border-red-600 flex items-center justify-center">
                        <AlertCircle className="h-6 w-6 text-red-400" />
                      </div>
                    ) : (
                      <div className="w-20 h-20 bg-gray-700 rounded-lg border-2 border-gray-600 flex items-center justify-center">
                        <FileText className="h-6 w-6 text-gray-400" />
                      </div>
                    )}
                  </div>

                  {/* Job Details */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium text-base truncate text-white">{job.card.name}</h4>
                      <div className="flex items-center gap-2">
                        <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                          job.status === 'completed' 
                            ? 'bg-green-900/20 text-green-400 border border-green-600' 
                            : job.status === 'failed'
                            ? 'bg-red-900/20 text-red-400 border border-red-600'
                            : job.status === 'processing'
                            ? 'bg-orange-900/20 text-orange-400 border border-orange-600'
                            : 'bg-gray-700 text-gray-300 border border-gray-600'
                        }`}>
                          {job.status}
                        </span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            setSelectedJob(job)
                          }}
                          className="text-blue-400 hover:text-blue-300 text-xs px-2 py-1 bg-blue-900/20 rounded hover:bg-blue-900/30 transition-colors flex items-center gap-1 border border-blue-600"
                        >
                          <Info className="h-3 w-3" />
                          Details
                        </button>
                        {job.status === 'completed' && job.imageUrl && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              if (job.imageUrl) {
                                const a = document.createElement('a')
                                a.href = job.imageUrl
                                a.download = `${job.card.name.replace(/[^a-zA-Z0-9]/g, '_')}.png`
                                a.click()
                              }
                            }}
                            className="text-green-400 hover:text-green-300 text-xs px-2 py-1 bg-green-900/20 rounded hover:bg-green-900/30 transition-colors border border-green-600"
                          >
                            Download
                          </button>
                        )}
                      </div>
                    </div>
                    
                    <div className="text-sm text-gray-300 mb-2">
                      <span className="inline-block bg-gray-700 px-2 py-1 rounded mr-2 text-xs text-gray-200">
                        {job.card.card_type}
                      </span>
                      <span className={`inline-block px-2 py-1 rounded text-xs ${
                        job.card.rarity === 'Common' ? 'bg-gray-700 text-gray-300' :
                        job.card.rarity === 'Uncommon' ? 'bg-green-900/20 text-green-400 border border-green-600' :
                        job.card.rarity === 'Rare' ? 'bg-blue-900/20 text-blue-400 border border-blue-600' :
                        job.card.rarity === 'Epic' ? 'bg-purple-900/20 text-purple-400 border border-purple-600' :
                        job.card.rarity === 'Legendary' ? 'bg-yellow-900/20 text-yellow-400 border border-yellow-600' :
                        'bg-gray-700 text-gray-300'
                      }`}>
                        {job.card.rarity}
                      </span>
                    </div>

                    {/* Quick Preview of Description */}
                    <div className="text-xs text-gray-400 mb-2">
                      {job.card.description.length > 80 
                        ? job.card.description.slice(0, 80) + '...' 
                        : job.card.description
                      }
                    </div>

                    {job.statusMessage && (
                      <div className="text-xs text-orange-400 mb-1 font-medium">
                        {job.statusMessage}
                      </div>
                    )}
                    
                    {job.error && (
                      <div className="text-xs text-red-400 mb-1 bg-red-900/20 px-2 py-1 rounded border border-red-600">
                        <strong>Error:</strong> {job.error.length > 60 ? job.error.slice(0, 60) + '...' : job.error}
                      </div>
                    )}

                    {/* Generation Info */}
                    <div className="flex items-center justify-between mt-2">
                      <div className="text-xs text-gray-400">
                        {job.promptId && (
                          <span className="bg-gray-700 px-2 py-1 rounded font-mono mr-2 text-gray-300">
                            ID: {job.promptId.slice(0, 8)}...
                          </span>
                        )}
                        <span className="text-gray-500">
                          Created: {new Date(job.createdAt).toLocaleTimeString()}
                        </span>
                      </div>
                      {job.status === 'completed' && (
                        <span className="text-xs text-green-400 font-medium">
                          ✅ Click to view prompts
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Stop Generation Control - Shown when generation is active and jobs are visible */}
      {isGenerating && jobs.length > 0 && (
        <div className="flex justify-center">
          <button
            onClick={stopGeneration}
            className="flex items-center gap-2 px-8 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 shadow-lg border-2 border-red-500 hover:border-red-400 transition-all"
          >
            <Square className="h-5 w-5" />
            Stop All Generation
          </button>
        </div>
      )}

      {/* Navigation */}
      <div className="flex justify-between">
        <button
          onClick={previousStep}
          className="px-6 py-2 border border-gray-600 text-gray-300 rounded-lg hover:bg-gray-700"
        >
          ← Back to Workloads
        </button>
        
        {results.length > 0 && (
          <button
            onClick={() => setShowBatchModal(true)}
            className="px-6 py-2 bg-[#FF7E06] text-white rounded-lg hover:bg-[#e06b00]"
          >
            View Generation History →
          </button>
        )}
      </div>

      {/* Modals */}
      <PromptTemplateModal
        isOpen={showTemplateModal}
        onClose={() => setShowTemplateModal(false)}
        sampleCard={sampleCard}
        params={params}
      />
      
      <PromptPreviewModal
        isOpen={showPreviewModal}
        onClose={() => setShowPreviewModal(false)}
        cards={validatedCards.slice(startIndex, startIndex + selectedCardCount)}
        params={params}
      />
      
      <BatchManagementModal
        isOpen={showBatchModal}
        onClose={() => setShowBatchModal(false)}
        onViewBatch={handleViewBatch}
      />

      <WorkflowManagerModal
        isOpen={showWorkflowModal}
        onClose={() => setShowWorkflowModal(false)}
        onWorkflowReady={handleWorkflowReady}
      />

      {/* CSV Switcher Modal */}
      {showCSVSwitcher && (
        <CSVSwitcher onClose={() => setShowCSVSwitcher(false)} />
      )}

      {/* Job Details Modal */}
      {selectedJob && (
        <JobDetailsModal
          isOpen={!!selectedJob}
          onClose={() => setSelectedJob(null)}
          job={selectedJob}
          result={results.find((r) => r.jobId === selectedJob.id)}
          params={params}
        />
      )}

      {/* Image Enlargement Modal */}
      {enlargedImage && (
        <MediaModal
          isOpen={!!enlargedImage}
          onClose={() => setEnlargedImage(null)}
          mediaUrl={enlargedImage.url}
          mediaType={enlargedImage.type}
          cardName={enlargedImage.name}
        />
      )}
    </div>
  )
} 